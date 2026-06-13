#!/usr/bin/env node
'use strict';
// beautiful-pptx CLI 진입 + 재export (CONTRACT §7)
//
//   node deck.js build <spec.json> [out.pptx]   스펙 빌드 + 린트 출력
//   node deck.js smoke                          examples/ 예제(없으면 내장 폴백) 빌드
//
// 라이브러리로 require 하면 build 모듈을 그대로 노출.

const fs = require('fs');
const path = require('path');
const builder = require('./lib/build');

// 재export — require('./deck') === require('./lib/build')
module.exports = builder;

// 내장 최소 스펙(examples 없을 때 폴백). 프리셋 4종 각각 한 장 이상.
function fallbackSpecs() {
  return [
    {
      name: 'research-talk', spec: {
        theme: 'slate', mode: 'light', preset: 'research-talk',
        slides: [
          { type: 'cover', title: '제목: 연구 발표 스모크', subtitle: '부제', meta: '발표자 · 2026' },
          { type: 'keymsg', assertion: '제안 방법은 기준선 대비 정확도를 12%p 높인다', evidence: ['핵심 근거 한 줄', '두 번째 근거'] },
          { type: 'kpi', title: '핵심 수치', source: '내부 실험', items: [
            { value: '+12%p', label: '정확도', interp: '기준선 대비', color: 'ok' },
            { value: '0.61', label: 'AUROC', interp: '동전보다 나음', color: 'info' }
          ] },
          { type: 'chart', title: '결과 비교', chartType: 'bar', source: '실험 로그',
            data: [{ name: 'acc', labels: ['base', 'ours'], values: [70, 82] }], accentIndex: 1, takeaway: 'ours 가 우세' },
          { type: 'closing', title: '감사합니다 / Q&A', contact: 'you@example.com' }
        ]
      }
    },
    { name: 'defense', spec: { theme: 'slate', mode: 'light', preset: 'defense', slides: [] } },
    { name: 'exec', spec: { theme: 'slate', mode: 'light', preset: 'exec', slides: [] } },
    { name: 'pitch', spec: { theme: 'slate', mode: 'light', preset: 'pitch', slides: [] } }
  ];
}

function printLint(label, lint) {
  if (!lint || lint.length === 0) { console.log(`  [${label}] lint: 0 warnings`); return; }
  console.log(`  [${label}] lint: ${lint.length} warning(s)`);
  lint.forEach(w => console.log(`    - ${w.level} ${w.rule}${w.page != null ? ' @p' + w.page : ''}: ${w.msg || ''}`));
}

async function runBuild(specPath, out) {
  const abs = path.resolve(specPath);
  const deckSpec = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const outPath = out || path.join(path.dirname(abs), (deckSpec.name || 'deck') + '.pptx');
  const res = await builder.build(deckSpec, { out: outPath });
  console.log('built:', res.path);
  printLint('build', res.lint);
  return res;
}

async function runSmoke() {
  const exDir = path.join(__dirname, 'examples');
  let specs = [];
  // examples/*.json 우선
  try {
    if (fs.existsSync(exDir)) {
      const files = fs.readdirSync(exDir).filter(f => f.endsWith('.json'));
      specs = files.map(f => ({
        name: path.basename(f, '.json'),
        spec: JSON.parse(fs.readFileSync(path.join(exDir, f), 'utf8'))
      }));
    }
  } catch (e) { /* fall through to fallback */ }

  if (specs.length === 0) {
    console.log('examples/ 비어있음 → 내장 폴백 스펙으로 스모크');
    specs = fallbackSpecs();
  }

  let ok = 0;
  for (const s of specs) {
    const out = path.join(__dirname, `smoke-${s.name}.pptx`);
    try {
      const res = await builder.build(s.spec, { out });
      console.log('built:', res.path);
      printLint(s.name, res.lint);
      ok += 1;
    } catch (e) {
      console.error(`  [${s.name}] FAILED:`, e && e.message || e);
    }
  }
  console.log(`smoke: ${ok}/${specs.length} decks built`);
  if (ok === 0) process.exitCode = 1;
}

async function main() {
  const [, , cmd, a1, a2] = process.argv;
  if (cmd === 'build') {
    if (!a1) { console.error('usage: node deck.js build <spec.json> [out.pptx]'); process.exitCode = 1; return; }
    await runBuild(a1, a2);
  } else if (cmd === 'smoke') {
    await runSmoke();
  } else {
    console.error('usage: node deck.js <build|smoke> ...');
    process.exitCode = 1;
  }
}

// CLI 로 직접 실행될 때만 main()
if (require.main === module) {
  main().catch(err => { console.error(err); process.exitCode = 1; });
}
