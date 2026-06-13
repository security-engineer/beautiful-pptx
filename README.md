<div align="center">

# beautiful-pptx

**이쁘고 구성 탄탄한 .pptx를 코드로 찍어내는 Claude Code 스킬 — 연구·비즈니스 발표 특화**

[![version](https://img.shields.io/badge/version-0.1.0-3b82f6)](#)
[![license](https://img.shields.io/badge/license-MIT-22c55e)](#-라이선스)
[![engine](https://img.shields.io/badge/engine-pptxgenjs-8b5cf6)](#)
[![presets](https://img.shields.io/badge/presets-research·business-f59e0b)](#-장르-프리셋-4종)

</div>

---

PowerPoint 안의 Claude는 당신 파일을 못 봅니다. 그래서 **자료를 다 보는 Claude Code(여기)에서 진짜 .pptx를 만들고**, PowerPoint에선 다듬기만 하자는 게 이 스킬입니다. 시중 pptx 도구·AI 발표 제품·발표 디자인 연구를 전수조사해 좋은 기능만 하이브리드했습니다.

## ✨ 한눈에

| | 기능 | 무엇을 |
|:--:|---|---|
| 📐 | **의미 부품 11종** | `cover·section·keymsg·kpi·chart·compare·timeline·process·quote·closing·backup` — 좌표 계산 없이 함수 호출만 |
| 🎨 | **디자인 토큰 테마 6종** | slate·navy·forest·plum·mono·warm (라이트/다크). 60/30/10·WCAG 대비 검증·안전폰트 |
| 🎯 | **장르 프리셋 4종** | `research-talk · defense · exec · pitch` — 슬라이드 시퀀스·톤·밀도까지 |
| 🔍 | **정량 린터 9규칙** | 6요소 초과·18pt 미만·대비 4.5:1·텍스트only·제목밑 라인 등 "AI 티" 자동 경고 |
| 🛠 | **템플릿·QA(선택)** | 회사 .pptx 편집·시각 검수·스키마 검증은 Anthropic office 스크립트 호출(있으면) |

## 📦 설치

```bash
cp -r beautiful-pptx ~/.claude/skills/
cd ~/.claude/skills/beautiful-pptx && npm install   # pptxgenjs 등 로컬 설치
# Claude Code에서 "발표자료 .pptx 만들어줘" 하면 발동
```
전역 pptxgenjs를 쓰면 `npm install` 없이 `NODE_PATH=$(npm root -g)`로도 됩니다.

## 🚀 사용

**자연어로** — "이 내용으로 디펜스 발표 .pptx 만들어줘. 개요부터 보여주고." → 스킬이 개요 제안 → 확인 → 빌드 → QA.

**직접 빌드** — deckSpec(JSON)으로:
```bash
node deck.js build spec.json out.pptx
node deck.js smoke          # 프리셋 4종 예제 빌드(엔진 점검)
```
```jsonc
// spec.json
{ "theme":"slate", "mode":"light", "preset":"defense", "layout":"16x9",
  "slides":[
    { "type":"cover", "title":"…", "subtitle":"…", "meta":"…", "notes":"…" },
    { "type":"keymsg", "assertion":"한 문장 주장", "chart":{…}, "source":"…", "notes":"…" },
    { "type":"kpi", "title":"…", "items":[{"value":"0.93","label":"AUROC","interp":"거의 완벽"}] }
  ] }
```

## 🎬 장르 프리셋 4종

| preset | 논리 | 제목 | 시퀀스 요지 | 분량 |
|---|---|---|---|---|
| `research-talk` | 귀납(결론 끝) | assertion | 동기→질문→기여→방법→결과→한계→결론 | 12~15장 |
| `defense` | Swath&Dive | assertion | 문제→선행→**한계먼저**→기여×N(방법·결과·**validation**)→결론(+백업多) | 25~35장 |
| `exec` | 연역(답 먼저) | action title | BLUF→SCR→근거→권고→다음단계 | 8~15장 |
| `pitch` | 내러티브 | 메시지 | 문제→해결→시장→트랙션→경쟁→팀→**Ask** | 10~12장 |

## 🗂️ 구조
```
SKILL.md / DESIGN.md / PRESETS.md   # 진입·디자인규율·프리셋 가이드
deck.js                             # CLI 진입
lib/  tokens.js core.js components.js presets.js build.js
scripts/  office-detect·preview·validate (Anthropic 스크립트 호출, graceful)
examples/  research-talk·defense·exec·pitch·example (deckSpec JSON)
```

## ⚠️ 알려진 한계
- 산출 .pptx는 **PowerPoint·Google Slides·Keynote·LibreOffice에서 모두 정상**으로 열립니다(pptxgenjs는 프로덕션급). 단 엄격한 ISO-29500 스키마 검증기는 element 순서 2건(`notesMasterIdLst`·chart `axId`)을 경고합니다 — 실제 앱은 무시하는 항목이며, "검증기 100% 통과"는 후처리(unpack→순서수정→pack) 단계의 향후 과제입니다.
- 슬라이드 미리보기·PDF 변환은 `soffice`/`poppler`가 있을 때만(없으면 .pptx 생성은 정상).

## 📄 라이선스
MIT (Anthropic office 스크립트는 복사하지 않고 설치돼 있을 때 호출만 — 그 스크립트는 각자 라이선스를 따름)
