'use strict';
// beautiful-pptx 의미 부품 (CONTRACT §4)
//
// 부품 11종. 시그니처는 모두  (pptx, spec, theme) -> slide
// core 의 applyChrome/autoGrid/fitText/styledChart/addBullets/color 와
// tokens 의 grid/col 만 써서 좌표를 산출한다(직접 좌표 최소화).
// 각 부품은 _research/design-spec.md §4 아키타입 좌표를 따른다.
// spec.notes 가 있으면 slide.addNotes(spec.notes).

const core = require('./core');
const { grid, col } = require('./tokens');

// 한글 포함이면 한글 폰트로 스왑 (tokens.theme.fontKo). fitText가 한글 폭을 처리.
function faceFor(text, theme) {
  return /[ㄱ-힝]/.test(String(text == null ? '' : text))
    ? theme.fontKo
    : theme.fontHead;
}

// spec.notes 발표자노트 부착 (공통)
function withNotes(slide, spec) {
  if (spec && spec.notes) slide.addNotes(String(spec.notes));
  return slide;
}

// 콘텐츠가 비었을 때 안전한 자리표시
function txt(v, fallback) {
  return (v == null || v === '') ? (fallback || '') : String(v);
}

// ── A. 표지 (Title) — 다크 ────────────────────────────────────────────────
function addCover(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'TITLE' });
  slide.background = { color: core.color(theme.base === '#FFFFFF' || theme.mode === 'light' ? '0F172A' : theme.base) };
  // design-spec §4-A
  slide.addText(txt(spec.title, '제목'), {
    x: 0.7, y: 2.2, w: 8.6, h: 1.2,
    fontFace: faceFor(spec.title, theme), fontSize: theme.scale.title, bold: true,
    color: core.color('FFFFFF'), align: 'left', valign: 'middle'
  });
  if (spec.subtitle) slide.addText(txt(spec.subtitle), {
    x: 0.7, y: 3.5, w: 8.6, h: 0.6,
    fontFace: faceFor(spec.subtitle, theme), fontSize: theme.scale.body,
    color: core.color('CBD5E1'), align: 'left', valign: 'top'
  });
  if (spec.meta) slide.addText(txt(spec.meta), {
    x: 0.7, y: 5.0, w: 8.6, h: 0.3,
    fontFace: faceFor(spec.meta, theme), fontSize: theme.scale.caption,
    color: core.color('64748B'), align: 'left', valign: 'top'
  });
  return withNotes(slide, spec);
}

// ── B. 섹션 구분 (Section) — 다크, 큰 번호 ─────────────────────────────────
function addSection(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'SECTION' });
  slide.background = { color: core.color('0F172A') };
  // design-spec §4-B
  const n = spec.n == null ? '' : String(spec.n).padStart(2, '0');
  if (n) slide.addText(n, {
    x: 0.7, y: 1.6, w: 2, h: 1.5,
    fontFace: theme.fontHead, fontSize: 54, bold: true,
    color: core.color(theme.mode === 'dark' ? theme.accent : '60A5FA'),
    align: 'left', valign: 'middle'
  });
  slide.addText(txt(spec.title, '섹션'), {
    x: 0.7, y: 3.1, w: 8.6, h: 0.8,
    fontFace: faceFor(spec.title, theme), fontSize: theme.scale.section, bold: true,
    color: core.color('FFFFFF'), align: 'left', valign: 'middle'
  });
  return withNotes(slide, spec);
}

// ── C. 핵심 메시지 (Assertion-Evidence) — 표준형 ───────────────────────────
// 제목 = 완결 문장 주장, 본문 = 시각 증거(image/chart/evidence 중 하나).
function addKeyMsg(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.assertion || spec.title, source: spec.source });
  const live = { x: grid.liveX, y: grid.liveY, w: grid.liveW, h: grid.liveH };

  if (spec.chart && spec.chart.data) {
    core.styledChart(slide, spec.chart.type || 'bar', spec.chart.data, theme,
      { x: live.x, y: live.y, w: live.w, h: live.h, accentIndex: spec.chart.accentIndex });
  } else if (spec.image) {
    slide.addImage({ path: spec.image, x: live.x, y: live.y, w: live.w, h: live.h, sizing: { type: 'contain', w: live.w, h: live.h } });
  } else if (Array.isArray(spec.evidence)) {
    core.addBullets(slide, spec.evidence.map(txt), {
      x: live.x, y: live.y, w: live.w, h: live.h,
      fontFace: faceFor(spec.evidence.join(''), theme),
      fontSize: theme.scale.body, color: core.color(theme.ink)
    });
  } else if (spec.evidence) {
    const fs = core.fitText(live.w, live.h, txt(spec.evidence), { min: theme.scale.body, max: theme.scale.section, fontFace: theme.fontBody });
    slide.addText(txt(spec.evidence), {
      x: live.x, y: live.y, w: live.w, h: live.h,
      fontFace: faceFor(spec.evidence, theme), fontSize: fs,
      color: core.color(theme.ink), align: 'left', valign: 'top'
    });
  }
  return withNotes(slide, spec);
}

// ── D. 핵심 수치 (KPI) — 2~4 카드 ──────────────────────────────────────────
function addKpi(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.title, source: spec.source });
  const items = (Array.isArray(spec.items) ? spec.items : []).slice(0, 4);
  const n = Math.max(1, items.length);
  const c = core.autoGrid(n);
  const cardY = 1.7, cardH = 2.3;

  items.forEach((it, i) => {
    const x = c.x(i);
    const semColor = core.color(it.color ? theme[it.color] || it.color : theme.accent);
    // 카드 배경
    slide.addShape('rect', { x, y: cardY, w: c.w, h: cardH, fill: { color: core.color('F8FAFC') }, line: { color: core.color('E2E8F0'), width: 0.75 } });
    // 상단 액센트 띠
    slide.addShape('rect', { x, y: cardY, w: c.w, h: 0.06, fill: { color: semColor }, line: { type: 'none' } });
    // 큰 숫자
    slide.addText(txt(it.value, '—'), {
      x, y: cardY + 0.25, w: c.w, h: 1.0,
      fontFace: theme.fontHead, fontSize: theme.scale.title, bold: true,
      color: semColor, align: 'center', valign: 'middle'
    });
    // 라벨
    slide.addText(txt(it.label), {
      x: x + 0.1, y: cardY + 1.25, w: c.w - 0.2, h: 0.4,
      fontFace: faceFor(it.label, theme), fontSize: theme.scale.caption + 3,
      color: core.color(theme.sub), align: 'center', valign: 'top'
    });
    // 해석(interp)
    if (it.interp) slide.addText(txt(it.interp), {
      x: x + 0.1, y: cardY + 1.65, w: c.w - 0.2, h: 0.55,
      fontFace: faceFor(it.interp, theme), fontSize: theme.scale.caption,
      color: core.color(theme.sub), align: 'center', valign: 'top'
    });
  });
  return withNotes(slide, spec);
}

// ── E. 차트 (chart + so-what 박스) ─────────────────────────────────────────
function addChart(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.title, source: spec.source });
  // design-spec §4-E : 차트 좌 2/3, so-what 우측
  core.styledChart(slide, spec.chartType || 'bar', spec.data || [], theme,
    { x: 0.5, y: 1.5, w: 6.2, h: 3.5, accentIndex: spec.accentIndex });
  if (spec.takeaway) {
    const fs = core.fitText(2.6, 3.5, txt(spec.takeaway), { min: theme.scale.body, max: theme.scale.slideTitle, fontFace: theme.fontBody });
    slide.addText(txt(spec.takeaway), {
      x: 6.9, y: 1.5, w: 2.6, h: 3.5,
      fontFace: faceFor(spec.takeaway, theme), fontSize: fs, bold: true,
      color: core.color(theme.ink), align: 'left', valign: 'middle'
    });
  }
  return withNotes(slide, spec);
}

// ── F. 비교 2단 (compare) ──────────────────────────────────────────────────
function addCompare(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.title, source: spec.source });
  const c = core.autoGrid(2);
  const top = 1.5, headH = 0.55, bodyH = 3.5 - headH - 0.1;
  const panels = [
    { side: spec.left || {}, headFill: core.color('64748B') },   // 좌 중립
    { side: spec.right || {}, headFill: core.color(theme.accent) } // 우 액센트
  ];
  panels.forEach((p, i) => {
    const x = c.x(i);
    // 머리띠
    slide.addShape('rect', { x, y: top, w: c.w, h: headH, fill: { color: p.headFill }, line: { type: 'none' } });
    slide.addText(txt(p.side.head, i === 0 ? 'A' : 'B'), {
      x: x + 0.1, y: top, w: c.w - 0.2, h: headH,
      fontFace: faceFor(p.side.head, theme), fontSize: theme.scale.body, bold: true,
      color: core.color('FFFFFF'), align: 'left', valign: 'middle'
    });
    // 본문 불릿
    const pts = Array.isArray(p.side.points) ? p.side.points.map(txt) : [];
    if (pts.length) core.addBullets(slide, pts, {
      x, y: top + headH + 0.1, w: c.w, h: bodyH,
      fontFace: faceFor(pts.join(''), theme),
      fontSize: theme.scale.body, color: core.color(theme.ink)
    });
  });
  return withNotes(slide, spec);
}

// ── G. 타임라인 (가로) ─────────────────────────────────────────────────────
function addTimeline(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.title, source: spec.source });
  const steps = (Array.isArray(spec.steps) ? spec.steps : []).slice(0, 6);
  const n = Math.max(1, steps.length);
  const c = core.autoGrid(n);
  const lineY = 2.6;
  // 기준선
  slide.addShape('line', { x: grid.liveX, y: lineY, w: grid.liveW, h: 0, line: { color: core.color('CBD5E1'), width: 1.5 } });
  steps.forEach((s, i) => {
    const x = c.x(i), cx = x + c.w / 2;
    // 노드
    slide.addShape('ellipse', { x: cx - 0.08, y: lineY - 0.08, w: 0.16, h: 0.16, fill: { color: core.color(theme.accent) }, line: { type: 'none' } });
    // when (위)
    slide.addText(txt(s.when), {
      x, y: lineY - 0.85, w: c.w, h: 0.6,
      fontFace: faceFor(s.when, theme), fontSize: theme.scale.body, bold: true,
      color: core.color(theme.accent), align: 'center', valign: 'bottom'
    });
    // what (아래)
    slide.addText(txt(s.what), {
      x, y: lineY + 0.2, w: c.w, h: 1.4,
      fontFace: faceFor(s.what, theme), fontSize: theme.scale.caption + 2,
      color: core.color(theme.ink), align: 'center', valign: 'top'
    });
  });
  return withNotes(slide, spec);
}

// ── H. 프로세스 (박스 + 화살표, 3~5스텝) ───────────────────────────────────
function addProcess(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.title, source: spec.source });
  const steps = (Array.isArray(spec.steps) ? spec.steps : []).slice(0, 5);
  const n = Math.max(1, steps.length);
  const c = core.autoGrid(n);
  const boxY = 2.0, boxH = 1.2;
  steps.forEach((s, i) => {
    const x = c.x(i);
    slide.addShape('roundRect', {
      x, y: boxY, w: c.w, h: boxH, rectRadius: 0.06,
      fill: { color: core.color('F8FAFC') }, line: { color: core.color(theme.accent), width: 1 }
    });
    slide.addText(txt(s.label, String(i + 1)), {
      x: x + 0.05, y: boxY, w: c.w - 0.1, h: boxH,
      fontFace: faceFor(s.label, theme), fontSize: theme.scale.body, bold: true,
      color: core.color(theme.ink), align: 'center', valign: 'middle'
    });
    // 화살표(마지막 박스 제외) — 박스 사이 거터 중앙
    if (i < n - 1) slide.addShape('chevron', {
      x: x + c.w + grid.gut * 0.15, y: boxY + boxH / 2 - 0.12, w: grid.gut * 0.7, h: 0.24,
      fill: { color: core.color(theme.accent) }, line: { type: 'none' }
    });
  });
  return withNotes(slide, spec);
}

// ── I. 인용 (Quote) — 큰 인용 ──────────────────────────────────────────────
function addQuote(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  slide.background = { color: core.color('F8FAFC') };
  // design-spec §4-G
  slide.addText('“', {
    x: 0.6, y: 1.0, w: 1.5, h: 1.2,
    fontFace: theme.fontHead, fontSize: 60, bold: true,
    color: core.color('CBD5E1'), align: 'left', valign: 'top'
  });
  const fs = core.fitText(7.6, 2.5, txt(spec.quote), { min: theme.scale.body, max: 28, fontFace: theme.fontBody });
  slide.addText(txt(spec.quote, '인용'), {
    x: 1.2, y: 1.6, w: 7.6, h: 2.5,
    fontFace: faceFor(spec.quote, theme), fontSize: fs,
    color: core.color(theme.ink), align: 'left', valign: 'middle'
  });
  if (spec.who) slide.addText('— ' + txt(spec.who), {
    x: 1.2, y: 4.3, w: 7.6, h: 0.4,
    fontFace: faceFor(spec.who, theme), fontSize: theme.scale.caption + 3,
    color: core.color(theme.sub), align: 'left', valign: 'top'
  });
  return withNotes(slide, spec);
}

// ── J. 마무리 (Closing) — 다크, 표지와 대칭 ────────────────────────────────
function addClosing(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'CLOSING' });
  slide.background = { color: core.color('0F172A') };
  slide.addText(txt(spec.title, '감사합니다 / Q&A'), {
    x: 0.7, y: 2.3, w: 8.6, h: 1.0,
    fontFace: faceFor(spec.title, theme), fontSize: theme.scale.title, bold: true,
    color: core.color('FFFFFF'), align: 'left', valign: 'middle'
  });
  if (spec.contact) slide.addText(txt(spec.contact), {
    x: 0.7, y: 3.6, w: 8.6, h: 0.5,
    fontFace: faceFor(spec.contact, theme), fontSize: theme.scale.body,
    color: core.color('CBD5E1'), align: 'left', valign: 'top'
  });
  return withNotes(slide, spec);
}

// ── K. 백업 (Backup) — 밀도 허용 ───────────────────────────────────────────
function addBackup(pptx, spec, theme) {
  spec = spec || {};
  const slide = pptx.addSlide({ masterName: 'BODY' });
  core.applyChrome(slide, theme, { title: spec.title || 'Backup', source: spec.source });
  const live = { x: grid.liveX, y: grid.liveY, w: grid.liveW, h: grid.liveH };
  if (Array.isArray(spec.body)) {
    core.addBullets(slide, spec.body.map(txt), {
      x: live.x, y: live.y, w: live.w, h: live.h,
      fontFace: faceFor(spec.body.join(''), theme),
      fontSize: theme.scale.body, color: core.color(theme.ink)
    });
  } else if (spec.body) {
    slide.addText(txt(spec.body), {
      x: live.x, y: live.y, w: live.w, h: live.h,
      fontFace: faceFor(spec.body, theme), fontSize: theme.scale.body,
      color: core.color(theme.ink), align: 'left', valign: 'top'
    });
  }
  return withNotes(slide, spec);
}

module.exports = {
  addCover, addSection, addKeyMsg, addKpi, addChart, addCompare,
  addTimeline, addProcess, addQuote, addClosing, addBackup
};
