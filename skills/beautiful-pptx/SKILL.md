---
name: beautiful-pptx
description: .pptx/슬라이드/덱/발표자료를 만들거나 편집·읽을 때 발동. "deck", "slides", "presentation", ".pptx", "발표자료", "PPT 만들어줘", "슬라이드로 정리", "피치덱", "디펜스 슬라이드" 등이 언급되면 사용. 신규 생성(스펙·마크다운→pptxgenjs 빌드), 회사 템플릿 편집(Anthropic office 스크립트), 기존 .pptx 읽기(markitdown) 세 갈래를 모두 처리한다.
---

# beautiful-pptx

발표 덱을 코드로 생성·편집·검수하는 스킬. 엔진은 **pptxgenjs**. 디자인은 WCAG·Tufte·assertion-evidence 같은 정량 규칙을 코드 린트로 박제해서, "AI 티 나는 못생긴 슬라이드"를 생성 단계에서 막는다.

상세 규율은 곁의 두 문서로 분리:
- **DESIGN.md** — 색·타이포·그리드·아키타입·차트·린트 규칙 전부.
- **PRESETS.md** — 장르 프리셋 4종(연구·디펜스·임원·피치)의 슬라이드 시퀀스와 톤.

---

## 1. 3-갈래 라우팅 (먼저 어느 길인지 정한다)

| 길 | 언제 | 무엇으로 |
|---|---|---|
| **(A) 신규 생성** | "처음부터 만들어줘", 내용·주제만 있을 때 | 개요 → deckSpec JSON 또는 마크다운 → `deck.js build` (pptxgenjs) |
| **(B) 템플릿 편집** | 회사·기존 .pptx 양식을 채우거나 고칠 때 | Anthropic `office/` 스크립트(unpack→편집→clean→pack). 있으면 호출, 없으면 (A)로 폴백 |
| **(C) 읽기** | 기존 .pptx 내용을 텍스트로 뽑을 때 | `markitdown deck.pptx` (있으면). 없으면 unpack 후 XML 텍스트 추출 |

대부분 요청은 **(A)**. 사용자가 "이 템플릿에 맞춰" / 특정 .pptx를 주면 (B). "이 발표 내용 요약해줘"면 (C).

---

## 2. 워크플로 — 개요 먼저, 한 방에 만들지 마라

**개요 → 확인 → 빌드 → 시각 QA → 수정** 루프. 첫 렌더는 거의 항상 어딘가 틀린다는 걸 전제로 한다.

1. **개요 제시.** 슬라이드별로 **제목 한 줄 + 유형(cover/keymsg/kpi/chart/...)** 만 표로 보여준다. 아직 빌드하지 않는다. 프리셋을 골랐으면 그 시퀀스를 골격으로 깐다(PRESETS.md).
2. **사용자 확인.** 개요에서 슬라이드 수·순서·메시지를 합의. "제목 스택 테스트" — 슬라이드 제목만 위에서 아래로 읽어도 논리가 성립하는지 같이 본다.
3. **빌드.** deckSpec JSON을 만들고 `deck.js build`. 빌드 반환에 린트 경고 배열이 같이 온다.
4. **시각 QA.** soffice/pdftoppm 있으면 .pptx→PDF→슬라이드 JPG로 렌더해서 **버그헌트 12항목**(아래 §7)으로 눈으로 검수. 없으면 린트 경고만으로 검수.
5. **수정 반복.** 겹침·오버플로·대비·정렬·플레이스홀더 잔존을 고치고 다시 QA. 깨끗할 때까지.

개요 단계를 건너뛰지 마라. 사용자가 "그냥 빨리 만들어"라고 해도 슬라이드 제목 목록은 한 번 보여주고 간다.

---

## 3. 사용법 (실행)

엔진이 전역 설치라 `NODE_PATH`를 잡아준다. 또는 스킬 폴더에서 `npm install` 한 번 하면 로컬 resolve.

```bash
# 전역 설치 resolve
NODE_PATH=$(npm root -g) node deck.js build spec.json out.pptx

# 또는 스킬 폴더에서 로컬 설치 후
cd ~/.claude/skills/beautiful-pptx && npm install
node deck.js build spec.json out.pptx

# 엔진 점검(예제 스펙으로 빌드)
node deck.js smoke
```

`build`는 `{path, lint}`를 반환. `lint`는 `[{rule, level, msg}]` 배열 — `level:'fail'`이 하나라도 있으면 고치고 다시 빌드한다.

### deckSpec JSON 형태

공개 입력은 이 JSON 하나(CONTRACT §5):

```json
{
  "theme": "slate", "mode": "light",
  "preset": "research-talk", "layout": "16x9",
  "slides": [
    { "type": "cover", "title": "...", "subtitle": "...", "meta": "발표자·날짜", "notes": "..." },
    { "type": "keymsg", "title": "X는 Y 조건에서 Z만큼 개선된다", "chart": {...}, "source": "..." },
    { "type": "kpi", "title": "...", "items": [{ "value": "37%", "label": "...", "interp": "...", "color": "ok" }] },
    { "type": "chart", "title": "...", "chartType": "bar", "data": [...], "takeaway": "so-what 한 줄", "source": "..." },
    { "type": "closing", "title": "감사합니다 / Q&A", "contact": "..." }
  ]
}
```

마크다운 입력도 받는다: `parseDeck(md)` 가 H1=섹션, H2=슬라이드, 표=chart/kpi 후보, frontmatter=theme/preset/layout으로 변환. 유형이 비면 `chooseLayout`이 휴리스틱으로 채운다(숫자 1~2개→kpi, A vs B→compare, 연도 나열→timeline, 인용부호→quote, 그 외→keymsg).

### 슬라이드 유형 (DISPATCH 토큰)

`cover` 표지 · `section` 섹션 구분 · `keymsg` 핵심 메시지(assertion-evidence) · `kpi` 수치 카드 · `chart` 차트+so-what · `compare` 2단 비교 · `timeline` 타임라인 · `process` 프로세스 박스 · `quote` 인용 · `closing` 마무리 · `backup` 백업.

각 유형의 좌표·구조는 DESIGN.md 아키타입 9종 참고.

---

## 4. 디자인 규율 (요약 — 상세는 DESIGN.md)

지킬 것만 추리면:

- **색 60/30/10.** 중립 베이스 60%, 보조(짙은 회색/네이비) 30%, 액센트 1색 10%. 액센트를 10% 안에 가둬야 프로처럼 보인다.
- **초록·주황은 텍스트 색 금지.** 흰 배경에서 WCAG AA(4.5:1)를 못 넘는다(3.2~3.6:1). 채움·아이콘·큰 굵은 글자만. 텍스트로 꼭 쓰면 700번대로 어둡게.
- **다크 배경엔 의미색 400번대**로 자동 스왑(라이트=600/700, 다크=400). 표지·섹션·마무리는 다크, 본문은 라이트(샌드위치).
- **본문 18pt 바닥**, 제목 24~28pt, 폰트 2종 이내, 안전폰트만(Calibri/Arial/Georgia, 한글 Malgun Gothic).
- **그리드·세이프존.** 좌우 0.5인치, 상하 0.3인치 여백. 좌표는 직접 박지 말고 `grid`/`col()`에서 산출.
- **제목 밑 액센트 라인 금지**(AI 티). **차트는 막대·라인만**, 파이·3D·격자·범례 제거가 기본.
- **1슬라이드 1메시지.** 시각 요소 6개 넘으면 분할.

---

## 5. 프리셋 (요약 — 상세는 PRESETS.md)

| 프리셋 | 언제 | 논리 | 제목 스타일 | 분량 |
|---|---|---|---|---|
| `research-talk` | 학회 구두발표(12~15분) | 귀납(결론 끝) | assertion(문장) | 12~15장 |
| `defense` | 박사·석사 디펜스/심사 | 귀납·Swath&Dive | assertion | 25~35장 |
| `exec` | 임원 보고 | 연역(답 먼저) | action title(동사) | 8~15장 |
| `pitch` | 투자 피치덱 | 연역·내러티브 | 메시지·임팩트 | 10~12장 |

핵심 갈림: **연구/학술은 근거를 쌓아 마지막에 결론(귀납·assertion)**, **비즈니스는 답을 먼저 놓고 근거로 내려간다(연역·action title)**. 프리셋이 슬라이드 시퀀스를 골격으로 깔아준다.

---

## 6. 린트·QA 게이트

빌드 직후 `lint`가 자동으로 슬라이드를 스캔한다. 규칙 ID(level):

- `L_ELEMENTS`(fail) 시각요소 >6 · `L_FONT`(fail) 본문 <18pt / 제목 <24pt
- `L_TITLELINE`(fail) 제목 밑 액센트 라인 · `L_CONTRAST`(fail) 대비 <4.5:1(대형 bold는 <3)
- `L_TEXTONLY`(warn) 시각요소 0 텍스트만 · `L_CENTERBODY`(warn) 본문 장문 가운데정렬
- `L_ACTIONTITLE`(warn) exec/pitch인데 제목이 동사 없는 명사구 · `L_DENSITY`(warn) 본문 한글 >150자
- `L_SOURCE`(warn) chart/kpi인데 source 비어있음

`fail`은 반드시 고친다. `warn`은 사용자에게 알리고 판단을 맡긴다.

**산출 게이트(있으면):** pack 검증으로 OOXML 스키마 "새 에러 0"일 때만 방출. 깨진 XML 차단.

---

## 7. 시각 QA — 버그헌트 12항목

렌더한 슬라이드 JPG를 신선한 눈으로 볼 때 체크:

1. 텍스트 박스 오버플로(글자가 박스 밖으로) 2. 요소 겹침 3. 정렬 어긋남(그리드 미스냅) 4. 대비 부족(흐린 글자) 5. 폰트 깨짐/폴백 6. 플레이스홀더 잔존(lorem/xxxx/TODO) 7. 빈 슬라이드·잘린 차트 8. 액센트색 과다(무지개) 9. 제목 밑 라인·그림자·베벨 10. 파이/3D 차트 11. 본문 과밀(150자 초과) 12. 페이지번호·출처 누락.

`markitdown`이나 unpack 텍스트에서 `lorem|xxxx|TODO|placeholder` grep으로 6번을 자동 탐지.

---

## 8. AI 티 슬라이드 안티패턴 (생성기에서 차단·경고)

이런 슬라이드가 나오면 "AI가 만든 티"가 난다. 린트가 잡지만 사람이 한 번 더 본다:

1. 텍스트로 꽉 찬 슬라이드(150자/40단어 초과) 2. 그라데이션·그림자·베벨 남발 3. 3D·파이 차트 4. 5색 이상 무지개 팔레트 5. 가운데정렬 장문 본문 6. 폰트 3종 이상 7. 빨강·초록만으로 상태 구분(색맹 무시) 8. 클립아트·저화질 이미지·이모지 장식 9. 제목 밑 장식 라인 10. 모든 슬라이드 똑같은 불릿 레이아웃 11. 완결 문장을 슬라이드 본문에 다 적기(노트로 빼야 함) 12. 출처 없는 차트·수치.

---

## 9. chat-understanding 연동 (선택)

`~/.claude/skills/chat-understanding/`가 깔려 있으면, 슬라이드 **텍스트·스피커노트**에 그 스킬의 문체·레벨·AI티 점검을 적용한다. 슬라이드 제목과 노트가 "살펴보겠습니다", "다양한/전반적으로" 같은 AI투를 안 쓰도록, 결론 먼저·숫자 해석 병기 원칙을 따르도록 다듬는다. 없으면 그냥 건너뛴다.

---

## 10. 산출물 받기

이 환경은 **헤드리스 서버**다. 빌드한 .pptx는 화면에 안 뜬다. 사용자에게 **경로를 알려주고 scp/다운로드로 받으라**고 안내한다:

```bash
# 예: 로컬로 내려받기
scp user@server:~/.claude/skills/beautiful-pptx/out.pptx ./
```

QA용 PDF/JPG를 만들었으면 그 경로도 같이 알려준다.
