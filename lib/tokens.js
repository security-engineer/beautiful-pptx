'use strict';
/**
 * tokens.js — beautiful-pptx 디자인 토큰 (CONTRACT §2)
 *
 * - grid: LAYOUT_16x9 (10 x 5.625 in) 기준 좌표 상수 (design-spec §3)
 * - col(n): n등분 컬럼 폭/x 계산기 (라이브폭 9.0in, 거터 0.2in)
 * - getTheme(name, mode): theme 객체 반환 (light|dark). 필수 키 전부 고정.
 * - THEMES: 테마 이름 목록 (최소 6종)
 *
 * 색은 design-spec.md의 WCAG 직접계산 검증표 그대로.
 * 가드레일: 초록·주황은 light에서 텍스트로 쓰면 700번대로 강등
 *           (ok=15803D, warn=C2410C). dark는 의미색 400번대.
 * 색은 '#' 없는 6자리 HEX (pptxgenjs 규칙).
 */

// ── 그리드 상수 (design-spec §3 영역표) ────────────────────────────
const grid = {
  W: 10, H: 5.625,                 // LAYOUT_16x9 (인치)
  mL: 0.5, mR: 0.5, mT: 0.35, mB: 0.3,
  liveX: 0.5, liveW: 9.0,          // 콘텐츠 라이브 영역 x/폭
  liveY: 1.45, liveH: 3.5,         // 콘텐츠 라이브 영역 y/높이
  gut: 0.2,                        // 거터(컬럼 사이 간격)
  title:  { x: 0.5, y: 0.35, w: 9.0, h: 0.8 },
  footer: { x: 0.5, y: 5.25, w: 9.0, h: 0.3 }
};

/**
 * col(n) — 라이브폭을 n등분. 반환 { w, gut, x(i) }.
 * design-spec: 폭 = (liveW - (n-1)*gut)/n, x(i) = liveX + i*(w+gut)
 *  - 2단 → w 4.4, x 0.5 / 5.1
 *  - 3단 → w 2.8667, x 0.5 / 3.5667 / 6.6333
 *  - 4단 → w 2.1
 */
function col(n) {
  const cnt = Math.max(1, n | 0);
  const w = (grid.liveW - (cnt - 1) * grid.gut) / cnt;
  return {
    w,
    gut: grid.gut,
    x: (i) => grid.liveX + i * (w + grid.gut)
  };
}

// ── 폰트 페어링 (전부 안전폰트, design-spec §2) ────────────────────
const FONTS = {
  sans:    { fontHead: 'Calibri', fontBody: 'Calibri', fontKo: 'Malgun Gothic' },
  serifHead: { fontHead: 'Georgia', fontBody: 'Arial', fontKo: 'Malgun Gothic' },
  mono:    { fontHead: 'Consolas', fontBody: 'Consolas', fontKo: 'Malgun Gothic' }
};

// ── 타입 스케일 (design-spec §2, pt) ───────────────────────────────
const SCALE = { title: 40, section: 32, slideTitle: 26, body: 18, caption: 13 };

/**
 * 테마 정의. 각 테마는 light/dark 두 모드의 색 세트를 가진다.
 * 의미색(danger/ok/warn/info/concept)은 design-spec WCAG표 그대로:
 *   light: 위험 DC2626 / 완료 15803D(텍스트안전) / 주의 C2410C / 정보 2563EB / 개념 7C3AED
 *   dark : 위험 F87171 / 완료 4ADE80 / 주의 FBBF24 / 정보 60A5FA / 개념 A78BFA
 * accent/base/ink/sub만 테마별로 변주(중립 베이스 + 액센트 1색 원칙).
 */
const SEMANTIC = {
  light: { danger: 'DC2626', ok: '15803D', warn: 'C2410C', info: '2563EB', concept: '7C3AED' },
  dark:  { danger: 'F87171', ok: '4ADE80', warn: 'FBBF24', info: '60A5FA', concept: 'A78BFA' }
};

// 각 테마: light/dark의 base·ink·sub·accent. (의미색은 SEMANTIC 공통)
// 값은 design-spec 슬레이트 검증표 기준 + 동일 채도대의 검증된 톤.
const THEME_DEFS = {
  // 기본 — 슬레이트 중립 + 파랑 액센트 (design-spec 기준 테마)
  slate: {
    fonts: FONTS.sans,
    light: { base: 'FFFFFF', ink: '1E293B', sub: '64748B', accent: '2563EB' },
    dark:  { base: '0F172A', ink: 'CBD5E1', sub: '94A3B8', accent: '60A5FA' }
  },
  // 네이비 — 격식/금융. 진한 남색 본문 + 인디고 액센트
  navy: {
    fonts: FONTS.serifHead,
    light: { base: 'FFFFFF', ink: '1E2A4A', sub: '5B6B8C', accent: '3730A3' },
    dark:  { base: '0B1220', ink: 'C7D2FE', sub: '93A4C8', accent: '818CF8' }
  },
  // 포레스트 — 중립 회녹 베이스 + 짙은 청록 액센트(텍스트 안전 700번대)
  forest: {
    fonts: FONTS.sans,
    light: { base: 'FFFFFF', ink: '14322B', sub: '5C7367', accent: '0F766E' },
    dark:  { base: '07201B', ink: 'CCE3D9', sub: '8FB3A6', accent: '2DD4BF' }
  },
  // 플럼 — 자두/보라. 차분한 격조. 보라 액센트(텍스트 안전 7C3AED)
  plum: {
    fonts: FONTS.serifHead,
    light: { base: 'FFFFFF', ink: '2E1A33', sub: '6B5570', accent: '7C3AED' },
    dark:  { base: '1A0F1E', ink: 'E9D5FF', sub: 'B49BC4', accent: 'A78BFA' }
  },
  // 모노 — 무채색. 액센트도 검정/흰. 가장 절제된 보고서용
  mono: {
    fonts: FONTS.mono,
    light: { base: 'FFFFFF', ink: '111827', sub: '6B7280', accent: '111827' },
    dark:  { base: '0A0A0A', ink: 'E5E7EB', sub: '9CA3AF', accent: 'F3F4F6' }
  },
  // 웜 — 따뜻한 회갈 베이스 + 짙은 주황 액센트(텍스트 안전 700번대 C2410C)
  warm: {
    fonts: FONTS.sans,
    light: { base: 'FFFFFF', ink: '292524', sub: '78716C', accent: 'C2410C' },
    dark:  { base: '1C1917', ink: 'E7E5E4', sub: 'A8A29E', accent: 'FB923C' }
  }
};

const THEMES = Object.keys(THEME_DEFS);

/**
 * getTheme(name, mode) — theme 객체 반환.
 * 알 수 없는 name은 'slate', 알 수 없는 mode는 'light'로 폴백.
 * 필수 키(CONTRACT §2): name, mode, base, ink, sub, accent,
 *   danger, ok, warn, info, concept, fontHead, fontBody, fontKo, scale
 */
function getTheme(name = 'slate', mode = 'light') {
  const tName = THEME_DEFS[name] ? name : 'slate';
  const tMode = (mode === 'dark') ? 'dark' : 'light';
  const def = THEME_DEFS[tName];
  const c = def[tMode];
  const sem = SEMANTIC[tMode];
  return {
    name: tName,
    mode: tMode,
    base: c.base,
    ink: c.ink,
    sub: c.sub,
    accent: c.accent,
    danger: sem.danger,
    ok: sem.ok,
    warn: sem.warn,
    info: sem.info,
    concept: sem.concept,
    fontHead: def.fonts.fontHead,
    fontBody: def.fonts.fontBody,
    fontKo: def.fonts.fontKo,
    scale: Object.assign({}, SCALE)
  };
}

module.exports = { grid, col, getTheme, THEMES };
