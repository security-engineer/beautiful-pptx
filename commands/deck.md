---
description: 발표 .pptx를 인테이크(깊이·목적·분량) → 개요 합의 → 빌드 → 렌더 검수로 만든다 (beautiful-pptx)
argument-hint: "[주제 또는 소스 파일] (비우면 무엇을 만들지 물어봄)"
---

beautiful-pptx 스킬로 발표 덱을 만든다. **절대 한 방에 찍지 말 것.** 아래 순서를 지킨다(스킬 SKILL.md §2와 동일).

입력 주제/자료: "$ARGUMENTS"

## 1. 인테이크 — 먼저 묻는다 (AskUserQuestion, 가이드라인 함께)
사용자가 안 준 것만 묻되, 각 선택지에 권고를 붙인다:
- **깊이**: 요약(8~12장) / 표준(15~20장) / **정밀·교육(25~40장 — 논문·기술 주제 권장)**. 정밀이면 동기·배경·방법·결과·분석·한계를 각각 여러 장으로 펼친다.
- **목적·청중 → 프리셋**: research-talk(학회) / defense(심사) / exec(임원) / pitch(투자) / lecture(강의·교육).
- **발표 시간(분)**(분당 ≈ 1장), **강조점**, **테마**(navy/slate/forest/plum/mono/warm), **소스 자료**(논문 PDF·데이터).

## 2. 개요 제시 → 승인 (빌드 전 게이트)
합의한 깊이·프리셋으로 **슬라이드별 제목 + 유형** 표를 보여준다(아직 빌드 X). 정밀이면 한 섹션을 한 장에 욱여넣지 말고 여러 장으로. "제목 스택 테스트"(제목만 읽어도 논리 성립)로 점검. **사용자가 승인할 때까지 빌드하지 않는다.**

## 3. 빌드
deckSpec JSON을 만들고 스킬 디렉토리에서 `node deck.js build spec.json out.pptx`(전역이면 `NODE_PATH=$(npm root -g)`). 반환 lint 경고 확인.

## 4. 렌더 검수 (필수 — 눈으로 본다)
`soffice --headless --convert-to pdf` → `pdftoppm -png`로 슬라이드 이미지를 만들어 **직접 보고** 버그헌트 12항목(겹침·오버플로·대비·정렬·폰트·플레이스홀더…)을 잡는다. 렌더를 안 보고 "잘 됐다"고 하지 않는다. 고치고 반복.

## 5. 전달
헤드리스 서버다 — .pptx 절대경로 + scp/다운로드 방법을 안내한다.

세부 규율은 `~/.claude/skills/beautiful-pptx/`의 SKILL.md / DESIGN.md / PRESETS.md를 Read해서 따른다.
