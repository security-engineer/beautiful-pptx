# PRESETS — beautiful-pptx 장르 프리셋 가이드

프리셋은 **섹션 시퀀스(슬라이드별) + 논리 방향 + 제목 스타일 + 톤·밀도·분량**의 묶음이다. deckSpec에 `preset` 이름만 주면 빈 슬롯에 이 골격이 깔린다.

가장 중요한 갈림 하나: **두 장르는 정보를 쌓는 순서가 정반대다.** 연구는 "왜 → 어떻게 → 무엇을 발견" 순으로 근거를 누적해 **마지막에 결론**을 놓고(귀납), 비즈니스는 **결론(답)을 먼저** 놓고 근거로 내려간다(연역). 프리셋도 이 축으로 갈린다.

---

## 연구(귀납·assertion) vs 비즈(연역·action title) — 한눈 표

| 축 | 연구/학술 | 비즈니스 |
|---|---|---|
| **논리 방향** | 귀납 — 근거 누적 후 결론(결론 마지막) | 연역 — **답 먼저**, 근거 나중 |
| **슬라이드 제목** | assertion(문장 주장) | action title(메시지·so-what, 동사 포함) |
| **밀도** | 높음 — 정보·근거·재현성 | 낮음 — 한 슬라이드 한 메시지 |
| **시각** | 데이터 그림 중심, 정밀 | 임팩트·정량화된 숫자, 단순 |
| **목표** | 신뢰·타당성 입증 | 결정·행동 유도 |
| **백업** | 필수(Q&A·심사 대비) | 부록(민감도·상세) |

**제목 차이 예시.** 연구 assertion: "X는 Y 조건에서 Z만큼 개선된다"(데이터가 증명할 완결 주장). 비즈 action title: "Q3에 비용 12% 줄이려면 A를 중단해야 한다"(so-what + 동사 + 의사결정).

---

## 프리셋 요약표

| 프리셋 | 기본 섹션 순서 | 논리 | 제목 스타일 | 밀도 | 톤 | 분량 |
|---|---|---|---|---|---|---|
| `research-talk` | 동기→질문→기여→방법→결과→한계→결론(+백업) | 귀납(결론 끝) | assertion | 중상 | 객관·근거 | 12~15장 / 12~13분 |
| `defense` | 문제→선행연구→질문→한계(스코프)→기여×N→결론→향후(+백업多) | 귀납·Swath&Dive | assertion | 상 | 정밀·방어적 | 25~35장 / 15~30분+Q&A |
| `exec` | ExecSummary(BLUF)→SCR→근거×N→권고→다음단계(+백업) | 연역(답 먼저) | action title | 하 | 단정·임팩트 | 8~15장 |
| `pitch` | 목적→문제→해결→Why Now→시장→제품→BM→트랙션→경쟁→팀→재무→Ask | 연역·내러티브 | 메시지·임팩트 | 하 | 설득·에너지 | 10~12장 |

파라미터 블록(생성 로직 분기용):

```
research-talk: { logic: inductive, titleStyle: assertion, density: high, backup: true,  maxSlides: 15 }
defense:       { logic: inductive, titleStyle: assertion, density: high, backup: many,  maxSlides: 35, emphasize: ["validation","contributions","limitations-first"] }
exec:          { logic: deductive, titleStyle: action,    density: low,  backup: true,  maxSlides: 15, rule: ["narrative-spine","vertical-proof"] }
pitch:         { logic: deductive, titleStyle: message,   density: low,  backup: false, maxSlides: 12, emphasize: ["problem-first","clear-ask"] }
```

---

## `research-talk` — 학회 구두발표 (12~15장 / 12~13분)

**언제.** 학회·컨퍼런스 12~15분 구두발표. 청중 다수가 인접 분야 → 맥락에 충분히 투자.

**시퀀스(슬라이드별):**
1. `cover` 표지(제목·저자·소속)
2. `keymsg` 동기/문제 — "왜 신경 써야 하나" (~20% 시간, 맥락에 투자)
3. `keymsg` 연구 질문/가설 (한 문장)
4. `bullets`(또는 keymsg) 기여 요약 3개 이내 — 초반에 미리 약속
5~6. `chart`/`section` 방법 (~25%, 그림 중심·수식 최소)
7~9. `chart` 결과 (그림 1장 = 주장 1개, ~35%, **assertion-evidence 강제**)
10. `bullets` 한계 — 짧게·정직하게
11. `closing` 결론 + 기여 재진술 (take-home message 1개)
12+. `backup` 추가 그림·증명·데이터셋·하이퍼파라미터

**톤·밀도.** 객관·근거 중심. 결과 슬라이드는 헤드라인=완결 문장 강제. 목표 12~13분(14분 넘기지 말 것), 나머지는 Q&A. 15장 넘으면 리허설 필수.

---

## `defense` — 박사·석사 디펜스/심사 (25~35장 / 15~30분+Q&A)

**언제.** 학위 심사. 발표 15~30분 + 질의 60분+. 박사 25~35장, 석사 15~20장.

**시퀀스:**
1. `cover` 표지
2. `keymsg` 문제·동기
3. `section`+`bullets` 선행연구
4. `keymsg` 연구 질문
5. `bullets` **한계/스코프(먼저!)** — 스코프를 미리 못박아 "왜 X는 안 했나" 공격을 선제 차단
6. `section` 기여1 → `chart` 방법 → `chart` 결과 → `keymsg` 검증
7. `section` 기여2 (동일 3종 반복)
8. `section` 기여3 (동일)
9. `closing` 종합 결론·기여 재진술
10. `bullets` 향후 연구
11+. `backup` 증명·데이터셋·하이퍼파라미터·추가실험 — **다수**

**Swath & Dive 패턴(디펜스 추천).** Swath(시간 ~50%): 선행연구·질문·기여·방법을 균등 비중으로 넓게 훑기, 배경 과체류 금지. Dive(~30%): 연구 하나 골라 데이터·분석까지 끝까지 증명. 한계 & 향후연구(코다): 심사 질문 상당수가 여기로 온다 — 결정적으로 중요.

**톤·밀도.** 정밀·방어적. validation 슬라이드 별도 강조. 기여당 8~15분 배분 → 3~5개 기여가 맞음. 질문 들어오면 짧게 답하고 "그건 X 슬라이드에서"로 넘기기.

---

## `exec` — 임원 보고 (8~15장)

**언제.** 경영진·임원 의사결정 보고. 임원은 ExecSummary 한 장만 봐도 결정 가능해야 한다.

**시퀀스:**
1. `cover` 표지
2. `keymsg` **Executive Summary / BLUF** (답·권고 한 장)
3. `compare`(또는 keymsg) SCR — 상황(이견 없는 사실)·복잡성(무엇이 바뀌어 문제)·해결(권고)
4~N. `chart`/`kpi` 근거 (각 슬라이드 **action title** = 메시지 제목, so-what 15단어 이내)
N+1. `keymsg` 권고 + 필요 자원
N+2. `bullets` 다음 단계·책임자·기한
(+`backup` 상세 데이터·민감도)

**컨설팅 2대 규칙.** 수평 논리(narrative spine): 제목만 1→끝까지 읽어도 하나의 설득 에세이. 수직 논리: 제목 읽고 아래 차트를 보면 차트가 제목을 직접 증명.

**톤·밀도.** 단정·임팩트. 밀도 낮게(한 슬라이드 한 메시지). 제목은 동사 있는 action title — 명사구·콜론끝이면 린트 `L_ACTIONTITLE` 경고.

---

## `pitch` — 투자 피치덱 (10~12장, Sequoia 고전형)

**언제.** VC 투자 유치. VC는 덱 하나에 평균 2분 18초만 본다 → 3분 안에 이해되게.

**시퀀스:**
1. `cover` = 목적(한 문장 회사 정의)
2. `keymsg` **Problem** — 투자자가 고통을 느끼게(데이터·일화)
3. `keymsg` Solution (가치 제안·유스케이스)
4. `keymsg` Why Now (타이밍 근거)
5. `chart` Market Size (TAM/SAM/SOM)
6. `section`/이미지 Product (데모·스크린샷)
7. `compare` Business Model
8. `kpi`/`chart` Traction (초기면 파일럿·인용·목업이라도)
9. `compare` Competition (경쟁 우위)
10. `bullets` Team
11. `chart` Financials
12. `closing` **The Ask** (요청 금액·용도 명확)

**톤·밀도.** 설득·에너지. 30pt+ 폰트, 한 메시지 원칙. 내러티브가 핵심 — 무엇을 말하느냐보다 투자자를 어떤 여정에 태우느냐. Ask 누락·모호는 금물.

---

## 장르별 do / don't

**연구 do** — 맥락에 충분히 투자 / 그림=주장 1개 / 시간 엄수(12~13분) / 백업 준비.
**연구 don't** — 슬라이드 낭독(듣기+읽기 동시 불가) / 작은 폰트·과밀 / 디테일에 빠져 맥락 생략 / 슬라이드를 발표 노트로 사용.

**비즈 do** — 첫 장에 결론 / 제목만 읽어도 스토리(수평) / 차트가 제목 증명(수직) / Ask 명확 / 숫자 정량화.
**비즈 don't** — 답 미루기 / 슬라이드 과다·과밀 / Ask 누락·모호 / 한 장에 다 담기.

**흔한 실패 요약.** 연구 = "디테일 과잉·맥락 부족, 텍스트 낭독." 비즈 = "결론 지연·덱 비대·Ask 모호."
