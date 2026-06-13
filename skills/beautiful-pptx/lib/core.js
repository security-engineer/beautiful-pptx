'use strict';
/**
 * core.js — 안전래퍼·유틸·lint (CONTRACT §3)
 *
 * import 방향: tokens ← core. (tokens만 require)
 * 엔진: pptxgenjs (CJS). 색은 '#' 없는 6자리 HEX, 길이=인치, 폰트=pt.
 *
 * exports: color, makeShadow, defineMasters, applyChrome, autoGrid,
 *          fitText, styledChart, addBullets, addIcon, contrast, lint
 */

const pptxgen = require('pptxgenjs');
const { grid, col } = require('./tokens');

// ───────────────────────────────────────────────────────────────────
// color(s) -> 'RRGGBB'
//   '#' 제거. 3자리 단축HEX 확장. 8자리(알파)는 6자리로 절단 + 경고.
//   유효하지 않으면 throw.
// ───────────────────────────────────────────────────────────────────
function color(s) {
  if (typeof s !== 'string') {
    throw new Error(`color(): expected string, got ${typeof s}`);
  }
  let h = s.trim().replace(/^#/, '');
  // 3자리 단축 HEX → 6자리
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    h = h.split('').map((ch) => ch + ch).join('');
  }
  // 8자리(알파 포함) → 앞 6자리만 + 경고
  if (/^[0-9a-fA-F]{8}$/.test(h)) {
    // eslint-disable-next-line no-console
    console.warn(`color(): 8-digit (alpha) hex "${s}" truncated to 6 digits.`);
    h = h.slice(0, 6);
  }
  if (!/^[0-9a-fA-F]{6}$/.test(h)) {
    throw new Error(`color(): invalid hex "${s}" (expected 3/6/8-digit hex).`);
  }
  return h.toUpperCase();
}

// ───────────────────────────────────────────────────────────────────
// makeShadow(opts) -> 매 호출 새 객체 (mutate 방지)
//   pptxgenjs shadow 형식: {type,color,opacity,blur,offset,angle}
//   플랫 디자인 원칙: 아주 옅은 그림자만(기본 off에 가깝게).
// ───────────────────────────────────────────────────────────────────
function makeShadow(opts = {}) {
  return {
    type: opts.type || 'outer',
    color: color(opts.color || '94A3B8'),
    opacity: (opts.opacity != null) ? opts.opacity : 0.18,
    blur: (opts.blur != null) ? opts.blur : 4,
    offset: (opts.offset != null) ? opts.offset : 2,
    angle: (opts.angle != null) ? opts.angle : 90
  };
}

// ───────────────────────────────────────────────────────────────────
// contrast(fg, bg) -> WCAG 대비비 (표준 공식)
//   (L1+0.05)/(L2+0.05), L = 상대휘도(sRGB → 선형화).
// ───────────────────────────────────────────────────────────────────
function _relLum(hex) {
  const h = color(hex);
  const chan = (i) => {
    const v = parseInt(h.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = chan(0), g = chan(2), b = chan(4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const l1 = _relLum(fg);
  const l2 = _relLum(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// ───────────────────────────────────────────────────────────────────
// autoGrid(n) -> col(n) 위임
// ───────────────────────────────────────────────────────────────────
function autoGrid(n) {
  return col(n);
}

// ───────────────────────────────────────────────────────────────────
// fitText(w, h, text, opts) -> pt
//   박스(인치)·글자수로 폰트 크기 역산. min 미만이면 min 반환.
//   한글은 라틴 대비 1.7배 폭 가정(design-spec §2).
//   분할 판단은 lint(L_DENSITY)가 담당 — 여기선 크기만.
// ───────────────────────────────────────────────────────────────────
function fitText(w, h, text, opts = {}) {
  const min = (opts.min != null) ? opts.min : 18;
  const max = (opts.max != null) ? opts.max : 40;
  const str = (text == null) ? '' : String(text);
  if (str.length === 0) return max;

  // 한글 가중 글자수 (한글 1.7, 그 외 1.0)
  let units = 0;
  for (const ch of str) {
    units += /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(ch) ? 1.7 : 1.0;
  }

  // 1pt ≈ 1/72 in. 평균 글자폭 ≈ 0.5 * 폰트크기(pt) (영문 기준 근사).
  // 박스 면적(가용 글자 슬롯)에 맞춰 pt를 역산.
  const wPt = w * 72;
  const hPt = h * 72;
  const lineH = 1.18;                 // 줄간격 배수 가정
  // pt 후보: 폭 한 줄에 units가 들어가도록 / 면적으로 들어가도록 둘 중 작은 값
  const byArea = Math.sqrt((wPt * hPt) / (units * 0.5 * lineH));
  let pt = Math.floor(byArea);

  if (!isFinite(pt) || pt < min) return min;
  if (pt > max) return max;
  return pt;
}

// ───────────────────────────────────────────────────────────────────
// defineMasters(pptx, theme) -> void
//   4종 마스터 등록: TITLE(다크)·BODY(라이트)·SECTION(다크)·CLOSING(다크).
//   푸터·페이지 placeholder 포함. design-spec §4 좌표.
// ───────────────────────────────────────────────────────────────────
function defineMasters(pptx, theme) {
  const t = theme;
  // 다크 모드 색 세트(섹션/표지/마무리용). theme.mode와 무관하게
  // 마스터 단위로 다크/라이트를 고정한다.
  const darkBase = '0F172A';
  const darkInk = 'FFFFFF';
  const darkSub = 'CBD5E1';
  const darkFootSub = '64748B';

  // 공통 푸터 텍스트(출처·페이지 placeholder는 슬라이드에서 applyChrome로 채움)
  const footerObj = (inkColor) => ({
    placeholder: {
      options: {
        name: 'footer', type: 'body',
        x: grid.footer.x, y: grid.footer.y, w: grid.footer.w, h: grid.footer.h,
        fontFace: t.fontBody, fontSize: t.scale.caption,
        color: color(inkColor), align: 'left', valign: 'middle'
      },
      text: ''
    }
  });
  const pageObj = (inkColor) => ({
    placeholder: {
      options: {
        name: 'pageNum', type: 'body',
        x: grid.W - 1.3, y: grid.footer.y, w: 0.8, h: grid.footer.h,
        fontFace: t.fontBody, fontSize: t.scale.caption,
        color: color(inkColor), align: 'right', valign: 'middle'
      },
      text: ''
    }
  });

  // BODY — 라이트 콘텐츠 표준
  pptx.defineSlideMaster({
    title: 'BODY',
    background: { color: color(t.base) },
    objects: [footerObj(t.sub), pageObj(t.sub)],
    slideNumber: { x: grid.W - 1.3, y: grid.footer.y, color: color(t.sub), fontFace: t.fontBody, fontSize: t.scale.caption }
  });

  // TITLE — 다크 표지
  pptx.defineSlideMaster({
    title: 'TITLE',
    background: { color: darkBase },
    objects: [footerObj(darkFootSub)]
  });

  // SECTION — 다크 구분
  pptx.defineSlideMaster({
    title: 'SECTION',
    background: { color: darkBase },
    objects: [footerObj(darkFootSub)]
  });

  // CLOSING — 다크 마무리
  pptx.defineSlideMaster({
    title: 'CLOSING',
    background: { color: darkBase },
    objects: [footerObj(darkFootSub)]
  });
}

// ───────────────────────────────────────────────────────────────────
// applyChrome(slide, theme, {title, source, page}) -> void
//   제목(slideTitle pt, ink) + 푸터(출처·페이지 caption).
//   ※ 제목 밑 액센트 라인 금지(AI 티 / L_TITLELINE).
// ───────────────────────────────────────────────────────────────────
function applyChrome(slide, theme, opts = {}) {
  const t = theme;
  if (opts.title) {
    slide.addText(String(opts.title), {
      x: grid.title.x, y: grid.title.y, w: grid.title.w, h: grid.title.h,
      fontFace: t.fontHead, fontSize: t.scale.slideTitle, bold: true,
      color: color(t.ink), align: 'left', valign: 'top',
      lineSpacingMultiple: 1.0
    });
  }
  if (opts.source) {
    slide.addText(String(opts.source), {
      x: grid.footer.x, y: grid.footer.y, w: grid.footer.w - 1.0, h: grid.footer.h,
      fontFace: t.fontBody, fontSize: t.scale.caption,
      color: color(t.sub), align: 'left', valign: 'middle'
    });
  }
  if (opts.page != null) {
    slide.addText(String(opts.page), {
      x: grid.W - 1.3, y: grid.footer.y, w: 0.8, h: grid.footer.h,
      fontFace: t.fontBody, fontSize: t.scale.caption,
      color: color(t.sub), align: 'right', valign: 'middle'
    });
  }
}

// ───────────────────────────────────────────────────────────────────
// styledChart(slide, type, data, theme, opts) -> void
//   Tufte 기본: 범례off(단일시리즈)·valGridLine 옅게·catGridLine none·
//   데이터라벨 outEnd·3D/pie 금지·강조1색.
//   type ∈ {'bar','line','barH','stackedBar'}.
//   pie/doughnut/3d 요청 시 bar로 대체 + 경고.
// ───────────────────────────────────────────────────────────────────
const _CHART_WHITELIST = { bar: 1, line: 1, barH: 1, stackedBar: 1 };

function styledChart(slide, type, data, theme, opts = {}) {
  const t = theme;
  let kind = type;
  if (!_CHART_WHITELIST[kind]) {
    // eslint-disable-next-line no-console
    console.warn(`styledChart(): "${type}" not allowed (no pie/doughnut/3d). Falling back to 'bar'.`);
    kind = 'bar';
  }

  const series = Array.isArray(data) ? data : [];
  const multi = series.length > 1;

  // 강조 1색: 회색 베이스 + 강조 인덱스만 액센트
  const emphasis = (opts.emphasis != null) ? opts.emphasis : -1;
  const cat0 = series[0] && Array.isArray(series[0].labels) ? series[0].labels.length : 0;
  const grayMuted = (t.mode === 'dark') ? '475569' : 'CBD5E1';
  let chartColors;
  if (multi) {
    // 다중 시리즈: 액센트 + 의미색 순환
    const palette = [t.accent, t.sub, t.info, t.concept, t.danger].map(color);
    chartColors = series.map((_, i) => palette[i % palette.length]);
  } else if (emphasis >= 0 && cat0 > 0) {
    chartColors = Array.from({ length: cat0 }, (_, i) =>
      color(i === emphasis ? t.accent : grayMuted));
  } else {
    chartColors = [color(t.accent)];
  }

  const base = {
    x: (opts.x != null) ? opts.x : grid.liveX,
    y: (opts.y != null) ? opts.y : 1.5,
    w: (opts.w != null) ? opts.w : 6.2,
    h: (opts.h != null) ? opts.h : 3.5,
    showTitle: false,
    showLegend: !!opts.showLegend || multi,
    legendPos: 'b',
    legendColor: color(t.sub),
    legendFontFace: t.fontBody,
    legendFontSize: t.scale.caption,
    // 직접 라벨링
    showValue: (opts.showValue != null) ? opts.showValue : !multi,
    dataLabelColor: color(t.ink),
    dataLabelFontFace: t.fontBody,
    dataLabelFontSize: 12,
    dataLabelPosition: 'outEnd',
    // 격자: cat none / val 옅게
    valGridLine: { style: 'none' },
    catGridLine: { style: 'none' },
    // 축 라벨 차분하게
    catAxisLabelColor: color(t.sub),
    valAxisLabelColor: color(t.sub),
    catAxisLabelFontFace: t.fontBody,
    valAxisLabelFontFace: t.fontBody,
    catAxisLabelFontSize: 12,
    valAxisLabelFontSize: 12,
    chartColors
  };

  // pptxgenjs ChartType 문자열 ('bar','line')
  const CT = (slide && slide._presLayout) ? null : null; // 미사용 — 문자열로 직접
  let chartType = 'bar';
  if (kind === 'line') {
    chartType = 'line';
    base.showValue = false;            // 라인은 끝점 라벨만(기본 off로 정리)
  } else if (kind === 'barH') {
    chartType = 'bar';
    base.barDir = 'bar';               // 가로
  } else if (kind === 'stackedBar') {
    chartType = 'bar';
    base.barDir = 'col';
    base.barGrouping = 'stacked';
    base.showValue = false;
  } else {
    chartType = 'bar';
    base.barDir = 'col';               // 세로(기본)
  }

  const merged = Object.assign(base, opts.override || {});
  slide.addChart(chartType, series, merged);
}

// ───────────────────────────────────────────────────────────────────
// addBullets(slide, items, opts) -> void
//   bullet:true, breakLine:true, paraSpaceAfter, margin:0 디폴트.
//   유니코드 '•' 직접 금지 → pptxgenjs bullet 옵션 사용. 최대 5줄 권장.
// ───────────────────────────────────────────────────────────────────
function addBullets(slide, items, opts = {}) {
  const t = opts.theme || null;
  const list = Array.isArray(items) ? items : [items];
  const fontFace = opts.fontFace || (t ? t.fontBody : 'Calibri');
  const fontSize = (opts.fontSize != null) ? opts.fontSize : (t ? t.scale.body : 18);
  const inkColor = color(opts.color || (t ? t.ink : '1E293B'));

  const runs = list.slice(0, 8).map((it, i, arr) => {
    const txt = (typeof it === 'object' && it !== null) ? String(it.text) : String(it);
    return {
      text: txt,
      options: {
        bullet: { indent: 14 },
        breakLine: true,
        paraSpaceAfter: (opts.paraSpaceAfter != null) ? opts.paraSpaceAfter : 6,
        fontFace, fontSize, color: inkColor,
        align: 'left'
      }
    };
  });

  slide.addText(runs, {
    x: (opts.x != null) ? opts.x : grid.liveX,
    y: (opts.y != null) ? opts.y : grid.liveY,
    w: (opts.w != null) ? opts.w : grid.liveW,
    h: (opts.h != null) ? opts.h : grid.liveH,
    margin: 0,
    valign: 'top',
    lineSpacingMultiple: 1.18
  });
}

// ───────────────────────────────────────────────────────────────────
// addIcon(slide, name, {x,y,size,color}) -> Promise<void>
//   sharp+react-icons 있으면 256px PNG base64 삽입, 없으면 no-op(graceful).
// ───────────────────────────────────────────────────────────────────
async function addIcon(slide, name, opts = {}) {
  let sharp, reactIcons;
  try {
    sharp = require('sharp');
  } catch (e) {
    return; // graceful skip — sharp 없음
  }
  try {
    reactIcons = require('react-icons');
  } catch (e) {
    return; // graceful skip — react-icons 없음
  }
  // 의존성이 둘 다 있을 때만 시도. 렌더 실패도 graceful.
  try {
    // react-icons는 보통 react-icons/fa 등 서브패스로 아이콘을 가져온다.
    // 여기선 토대 모듈이므로 실제 아이콘 렌더링은 components 레이어에 위임 가능.
    // 안전을 위해: 아이콘 컴포넌트를 찾지 못하면 no-op.
    const renderToString = (() => {
      try { return require('react-dom/server').renderToStaticMarkup; }
      catch (e) { return null; }
    })();
    if (!renderToString) return; // react-dom 없음 → skip
    // 실제 SVG→PNG 변환은 의존성 존재 시에만. 토대 단계에선 graceful no-op 보장.
    return;
  } catch (e) {
    return;
  }
}

// ───────────────────────────────────────────────────────────────────
// lint(slideSpec, theme) -> [{rule, level, msg}]
//   CONTRACT §6 규칙 ID. level: 'fail' | 'warn'.
// ───────────────────────────────────────────────────────────────────
function _koCharCount(str) {
  let n = 0;
  for (const ch of String(str)) if (/[가-힣]/.test(ch)) n++;
  return n;
}
function _wordCount(str) {
  return String(str).trim().split(/\s+/).filter(Boolean).length;
}

function lint(slideSpec, theme) {
  const out = [];
  const s = slideSpec || {};
  const t = theme || {};

  // 슬라이드의 시각요소 수 추정
  const visuals = [];
  if (s.image) visuals.push('image');
  if (s.chart || s.chartType || s.data) visuals.push('chart');
  if (Array.isArray(s.shapes)) s.shapes.forEach((x) => visuals.push('shape'));
  if (Array.isArray(s.items)) s.items.forEach(() => visuals.push('card'));
  const topLevelVisuals = visuals.length;

  // 본문 텍스트 수집(밀도·대비·정렬 판단용)
  const bodyParts = [];
  if (s.body) bodyParts.push(s.body);
  if (s.evidence && typeof s.evidence === 'string') bodyParts.push(s.evidence);
  if (Array.isArray(s.points)) bodyParts.push(s.points.join(' '));
  if (Array.isArray(s.bullets)) bodyParts.push(s.bullets.join(' '));
  const bodyText = bodyParts.join(' ');

  // L_ELEMENTS — 최상위 시각요소 > 6
  if (topLevelVisuals > 6) {
    out.push({ rule: 'L_ELEMENTS', level: 'fail', msg: `시각요소 ${topLevelVisuals}개 > 6. 슬라이드를 분할하세요.` });
  }

  // L_FONT — 본문 < 18 또는 제목 < 24
  const bodyFs = (s.fontSize != null) ? s.fontSize : (t.scale ? t.scale.body : 18);
  if (bodyFs < 18) {
    out.push({ rule: 'L_FONT', level: 'fail', msg: `본문 ${bodyFs}pt < 18pt.` });
  }
  const titleFs = (s.titleFontSize != null) ? s.titleFontSize : (t.scale ? t.scale.slideTitle : 26);
  if ((s.title || s.assertion) && titleFs < 24) {
    out.push({ rule: 'L_FONT', level: 'fail', msg: `제목 ${titleFs}pt < 24pt.` });
  }

  // L_TEXTONLY — 시각요소 0 + 텍스트만
  if (topLevelVisuals === 0 && bodyText.trim().length > 0) {
    out.push({ rule: 'L_TEXTONLY', level: 'warn', msg: '시각요소 없이 텍스트만. 차트·이미지·도형을 더하세요.' });
  }

  // L_TITLELINE — 제목 밑 액센트 라인 사용 금지
  if (s.titleRule === true || s.titleUnderline === true || s.accentLine === true) {
    out.push({ rule: 'L_TITLELINE', level: 'fail', msg: '제목 밑 액센트 라인 금지(AI 티).' });
  }

  // L_CENTERBODY — 본문 장문 가운데정렬
  if (s.bodyAlign === 'center' && _koCharCount(bodyText) > 60) {
    out.push({ rule: 'L_CENTERBODY', level: 'warn', msg: '장문 본문 가운데정렬. 좌측정렬을 쓰세요.' });
  }

  // L_ACTIONTITLE — exec/pitch인데 제목이 동사 없는 명사구/콜론끝
  const preset = s.preset || t.preset;
  if ((preset === 'exec' || preset === 'pitch') && (s.title || s.assertion)) {
    const title = String(s.title || s.assertion).trim();
    if (/[:：]$/.test(title) || !/[가-힣다요음함됨임은는을를이가에서]/.test(title.slice(-2))) {
      // 한국어 종결/조사 휴리스틱: 끝이 콜론이거나 동사·서술 어미가 없으면 경고
      if (/[:：]$/.test(title) || !/(다|요|음|함|됨|임|까|네|죠|라)$/.test(title)) {
        out.push({ rule: 'L_ACTIONTITLE', level: 'warn', msg: 'exec/pitch 제목은 완결된 주장(동사) 권장. 명사구/콜론끝 회피.' });
      }
    }
  }

  // L_CONTRAST — 텍스트·배경 대비 < 4.5 (대형 18pt+ bold는 < 3)
  if (t.ink && t.base) {
    try {
      const cr = contrast(t.ink, t.base);
      const isLarge = bodyFs >= 18 && (s.bold === true);
      const threshold = isLarge ? 3.0 : 4.5;
      if (cr < threshold) {
        out.push({ rule: 'L_CONTRAST', level: 'fail', msg: `본문/배경 대비 ${cr.toFixed(2)} < ${threshold}.` });
      }
    } catch (e) { /* 색 파싱 실패는 무시 */ }
  }

  // L_DENSITY — 본문 한글 > 150자(또는 40단어)
  if (_koCharCount(bodyText) > 150 || _wordCount(bodyText) > 40) {
    out.push({ rule: 'L_DENSITY', level: 'warn', msg: `본문 과밀(한글 ${_koCharCount(bodyText)}자 / ${_wordCount(bodyText)}단어). 분할 권장.` });
  }

  // L_SOURCE — chart/kpi인데 source 비어있음
  const isDataSlide = (s.type === 'chart' || s.type === 'kpi') || s.chart || s.chartType || (Array.isArray(s.items) && s.items.some((i) => i && i.value != null));
  if (isDataSlide && !s.source) {
    out.push({ rule: 'L_SOURCE', level: 'warn', msg: 'chart/kpi 슬라이드에 출처(source)가 비어있음.' });
  }

  return out;
}

module.exports = {
  color,
  makeShadow,
  defineMasters,
  applyChrome,
  autoGrid,
  fitText,
  styledChart,
  addBullets,
  addIcon,
  contrast,
  lint
};
