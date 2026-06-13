'use strict';
// beautiful-pptx 오케스트레이터 (CONTRACT §5)
//
// deckSpec(공개 입력 JSON) → .pptx 파일 + lint 경고.
//   { theme, mode, preset, layout, slides:[{type, ...}, ...] }
// import 방향: tokens ← core ← components ← build (역참조 금지)

const pptxgen = require('pptxgenjs');
const tokens = require('./tokens');
const core = require('./core');
const C = require('./components');
const PRESETS = require('./presets');

// 슬라이드 토큰 → 부품 함수
const DISPATCH = {
  cover:    C.addCover,
  section:  C.addSection,
  keymsg:   C.addKeyMsg,
  kpi:      C.addKpi,
  chart:    C.addChart,
  compare:  C.addCompare,
  timeline: C.addTimeline,
  process:  C.addProcess,
  quote:    C.addQuote,
  closing:  C.addClosing,
  backup:   C.addBackup
};

// ── parseDeck(md) → deckSpec ───────────────────────────────────────────────
// 마크다운 → 스펙. H1=section, H2=슬라이드, frontmatter=theme/preset/layout.
// 최소 구현(계약 §5 "최소구현 OK").
function parseDeck(md) {
  const src = String(md == null ? '' : md);
  const deck = { slides: [] };

  // --- frontmatter (--- ... ---) ---
  const fm = src.match(/^---\n([\s\S]*?)\n---\n?/);
  let body = src;
  if (fm) {
    body = src.slice(fm[0].length);
    fm[1].split('\n').forEach(line => {
      const m = line.match(/^\s*([\w-]+)\s*:\s*(.+?)\s*$/);
      if (m) deck[m[1]] = m[2].replace(/^["']|["']$/g, '');
    });
  }

  const lines = body.split('\n');
  let cur = null;
  const flush = () => { if (cur) { deck.slides.push(cur); cur = null; } };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    let m;
    if ((m = line.match(/^#\s+(.*)$/))) {            // H1 → 섹션
      flush();
      deck.slides.push({ type: 'section', title: m[1].trim() });
    } else if ((m = line.match(/^##\s+(.*)$/))) {    // H2 → 슬라이드 시작
      flush();
      cur = { title: m[1].trim(), _body: [] };
    } else if (cur) {
      const b = line.replace(/^[-*]\s+/, '').trim();
      if (b) cur._body.push(b);
    }
  }
  flush();

  // _body 모은 슬라이드는 chooseLayout 으로 타입 결정 후 evidence 로 채움
  deck.slides = deck.slides.map(s => {
    if (s.type) return s;
    const evidence = s._body || [];
    delete s._body;
    const t = chooseLayout({ title: s.title, evidence });
    if (t === 'keymsg') return { type: 'keymsg', assertion: s.title, evidence };
    if (t === 'quote')  return { type: 'quote', quote: s.title, who: evidence[0] };
    return Object.assign({ type: t, title: s.title, evidence }, t === 'keymsg' ? {} : {});
  });
  return deck;
}

// ── chooseLayout(slideSpec) → type ─────────────────────────────────────────
// type 비었을 때 휴리스틱.
function chooseLayout(spec) {
  spec = spec || {};
  if (spec.type) return spec.type;
  const title = String(spec.title || spec.assertion || '');
  const body = Array.isArray(spec.evidence) ? spec.evidence.join(' ')
    : String(spec.evidence || spec.body || '');
  const all = title + ' ' + body;

  if (/[""].+["“”]|^\s*["“]/.test(title)) return 'quote';          // 인용부호
  if (/\bvs\.?\b|대\s|versus|[A-Za-z가-힣]+\s+vs\b/i.test(all)) return 'compare'; // A vs B
  if (/(19|20)\d{2}.*(19|20)\d{2}/.test(all)) return 'timeline';    // 연도 나열
  // 숫자 1~2개 → kpi
  const nums = all.match(/\d[\d,.%]*/g) || [];
  if (nums.length >= 1 && nums.length <= 2 && body.length < 60) return 'kpi';
  return 'keymsg';
}

// ── applyPreset(name, deckSpec) → deckSpec ─────────────────────────────────
// 프리셋 sequence·tone 을 비어있는 부분에 채움.
function applyPreset(name, deckSpec) {
  const preset = PRESETS[name];
  deckSpec = deckSpec || {};
  if (!preset) return deckSpec;

  // tone/메타 비어있으면 프리셋 값으로 채움
  if (deckSpec.titleStyle == null) deckSpec.titleStyle = preset.titleStyle;
  if (deckSpec.density == null) deckSpec.density = preset.density;
  deckSpec.preset = name;

  // slides 없으면 sequence 로 골격 생성
  if (!Array.isArray(deckSpec.slides) || deckSpec.slides.length === 0) {
    deckSpec.slides = preset.sequence.map(tok => ({ type: tok }));
  } else {
    // 슬라이드별 type 빈 곳은 sequence 순서대로 보충, 그래도 없으면 chooseLayout
    deckSpec.slides = deckSpec.slides.map((s, i) => {
      if (!s.type) s.type = preset.sequence[i] || chooseLayout(s);
      return s;
    });
  }
  return deckSpec;
}

// ── restyle(deckSpec, themeName) → deckSpec ────────────────────────────────
// theme 만 교체.
function restyle(deckSpec, themeName) {
  deckSpec = deckSpec || {};
  return Object.assign({}, deckSpec, { theme: themeName });
}

// ── build(deckSpec, {out}) → Promise<{path, lint}> ─────────────────────────
async function build(deckSpec, opts) {
  opts = opts || {};
  const out = opts.out || 'deck.pptx';
  deckSpec = deckSpec || {};

  // 프리셋 보충
  if (deckSpec.preset && PRESETS[deckSpec.preset]) {
    deckSpec = applyPreset(deckSpec.preset, deckSpec);
  }

  const pptx = new pptxgen();
  pptx.defineLayout({ name: 'BP16x9', width: tokens.grid.W, height: tokens.grid.H });
  pptx.layout = 'BP16x9';

  const theme = tokens.getTheme(deckSpec.theme || 'slate', deckSpec.mode || 'light');
  core.defineMasters(pptx, theme);

  const lint = [];
  const slides = Array.isArray(deckSpec.slides) ? deckSpec.slides : [];
  let page = 0;
  for (const spec of slides) {
    const type = spec.type || chooseLayout(spec);
    const fn = DISPATCH[type];
    if (!fn) { lint.push({ rule: 'L_UNKNOWN', level: 'warn', msg: `unknown slide type: ${type}`, page }); continue; }
    page += 1;
    fn(pptx, spec, theme);
    // 슬라이드별 lint 수집 (core.lint 는 slideSpec+theme 기준)
    try {
      const warns = core.lint(Object.assign({ type }, spec), theme) || [];
      warns.forEach(w => lint.push(Object.assign({ page }, w)));
    } catch (e) {
      lint.push({ rule: 'L_INTERNAL', level: 'warn', msg: String(e && e.message || e), page });
    }
  }

  await pptx.writeFile({ fileName: out });
  return { path: out, lint };
}

module.exports = { DISPATCH, parseDeck, chooseLayout, applyPreset, restyle, build, PRESETS };
