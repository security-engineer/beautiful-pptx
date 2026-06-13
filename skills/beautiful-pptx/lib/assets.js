'use strict';
/**
 * assets.js — sharp로 슬라이드용 배경/아이콘 PNG를 생성한다.
 *   SVG를 sharp(rsvg 내장)로 래스터화. sharp 없으면 graceful(빈 경로 반환).
 *   pptxgenjs는 PNG 경로만 받으면 background/addImage로 합성한다.
 *
 * 동기 컴포넌트가 쓰도록, build() 시작에 ensureAssets(theme,dir)를 await 해서
 * theme._assets 에 경로를 채워둔다. 컴포넌트는 그 경로만 참조(동기 유지).
 */
const path = require('path');
const fs = require('fs');

let sharp = null;
try { sharp = require('sharp'); } catch (e) { sharp = null; }

function _hex(h) { return String(h).replace(/^#/, ''); }
function darken(hex, f) {                 // f: 0(검정)~1(원본)
  const h = _hex(hex);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * f);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * f);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * f);
  return [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
}

// 다크 배경 SVG (그라데이션 + 은은한 기하 도형 + 글로우). 모티프 일관성 위해 전 다크슬라이드 공유.
function darkBgSvg(theme) {
  const a = _hex(theme.accent);
  const concept = _hex(theme.concept || theme.accent);
  const deep = darken(theme.accent, 0.40);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#${deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="82%" cy="84%" r="55%">
      <stop offset="0%" stop-color="#${a}" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#${a}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <circle cx="1060" cy="650" r="450" fill="url(#glow)"/>
  <circle cx="1150" cy="105" r="240" fill="#${concept}" fill-opacity="0.13"/>
  <circle cx="175" cy="560" r="150" fill="none" stroke="#${a}" stroke-opacity="0.20" stroke-width="3"/>
  <rect x="-70" y="-90" width="320" height="320" rx="44" fill="#${a}" fill-opacity="0.08" transform="rotate(16 90 90)"/>
</svg>`;
}

// 라이트 본문용: 좌측에 아주 옅은 액센트 띠 + 우상단 옅은 도형(절제). 거의 흰색 유지.
function lightBgSvg(theme) {
  const a = _hex(theme.accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="#FFFFFF"/>
  <circle cx="1230" cy="40" r="190" fill="#${a}" fill-opacity="0.05"/>
  <circle cx="60" cy="700" r="150" fill="#${a}" fill-opacity="0.04"/>
</svg>`;
}

async function _svgToPng(svg, outPath) {
  if (!sharp) return null;
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  return outPath;
}

/**
 * ensureAssets(theme, dir) — 테마 배경 PNG를 생성해 theme._assets 에 경로를 채운다.
 * sharp 없으면 theme._assets = {} (컴포넌트가 단색 폴백).
 */
async function ensureAssets(theme, dir) {
  theme._assets = theme._assets || {};
  if (!sharp) return theme;
  try {
    fs.mkdirSync(dir, { recursive: true });
    const key = (theme.name || 'theme') + '-' + _hex(theme.accent);
    const dark = path.join(dir, `bg-dark-${key}.png`);
    const light = path.join(dir, `bg-light-${key}.png`);
    if (!fs.existsSync(dark)) await _svgToPng(darkBgSvg(theme), dark);
    if (!fs.existsSync(light)) await _svgToPng(lightBgSvg(theme), light);
    theme._assets.dark = dark;
    theme._assets.light = light;
  } catch (e) {
    theme._assets = {};   // 실패 시 폴백
  }
  return theme;
}

/**
 * makeIcon(svgInner, color, size, outPath) — viewBox 0 0 24 24 stroke 아이콘을 PNG로.
 * svgInner = <path .../> 들. 색은 stroke. 투명 배경.
 */
async function makeIcon(svgInner, color, size, outPath) {
  if (!sharp) return null;
  const c = _hex(color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${svgInner}</svg>`;
  try { await _svgToPng(svg, outPath); return outPath; } catch (e) { return null; }
}

module.exports = { ensureAssets, makeIcon, darken, hasSharp: !!sharp };
