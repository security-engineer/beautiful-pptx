# beautiful-pptx 내부 계약 (CONTRACT)

병렬로 만드는 모듈들이 **서로 맞물리도록** 인터페이스를 고정한다. 모든 에이전트는 이 계약을 단일 기준으로 구현한다. 값(색·좌표·폰트·차트옵션)의 디테일은 `_research/design-spec.md`, 프리셋은 `_research/presets.md`, 기능 근거는 `_research/survey.md`를 따른다.

## 0. 엔진·환경
- 엔진: **pptxgenjs** (CJS, `const pptxgen = require('pptxgenjs')`). 좌표계 `LAYOUT_16x9` = 10 × 5.625 인치. 색은 `#` 없는 6자리 HEX. 길이=인치, 폰트=pt.
- 전역 설치라 실행 시 `NODE_PATH=$(npm root -g)` 필요. 단 스킬 루트에 `package.json`(deps: pptxgenjs)을 둬서 `npm install` 후엔 로컬에서도 resolve되게 한다.
- 외부의존 격리: 코어(생성)는 pptxgenjs만으로 동작. `sharp`/`react-icons`(아이콘), `soffice`/`pdftoppm`(QA·PDF), Anthropic office 스크립트(템플릿·검증)는 **있으면 쓰고 없으면 graceful skip**.

## 1. 모듈 구조 & import 그래프
```
beautiful-pptx/
  deck.js          # CLI 진입 + 재export. require('./lib/build')
  package.json     # {name, deps:{pptxgenjs}, bin}            [A1]
  lib/
    tokens.js      # 테마·그리드 상수·getTheme               [A1]
    core.js        # 안전래퍼·유틸·lint  (require ./tokens)  [A1]
    components.js  # 의미 부품  (require ./core, ./tokens)    [A2]
    presets.js     # 장르 프리셋 데이터                       [A2]
    build.js       # 오케스트레이터 (require ./components,./presets,./core,./tokens) [A2]
  SKILL.md DESIGN.md PRESETS.md   [A3]
  scripts/         # 템플릿·QA·검증 래퍼 + smoke              [A4]
  examples/        # 예제 spec.json                           [A4]
```
import 방향은 한쪽으로만: tokens ← core ← components ← build ← deck. 역참조 금지(순환 금지).

## 2. tokens.js (A1)
```js
const grid = {
  W:10, H:5.625, mL:0.5, mR:0.5, mT:0.35, mB:0.3,
  liveX:0.5, liveW:9.0, liveY:1.45, liveH:3.5, gut:0.2,
  title:{x:0.5,y:0.35,w:9.0,h:0.8}, footer:{x:0.5,y:5.25,w:9.0,h:0.3}
};
function col(n){ const w=(grid.liveW-(n-1)*grid.gut)/n;
  return { w, gut:grid.gut, x:(i)=>grid.liveX+i*(w+grid.gut) }; }
// 테마: 라이트/다크 모드. 최소 6종(아래 키 필수). 값은 design-spec.md WCAG표 그대로.
function getTheme(name='slate', mode='light'){ /* returns theme object below */ }
module.exports = { grid, col, getTheme, THEMES /* 이름 목록 */ };
```
**theme 객체(필수 키 고정):**
```
{ name, mode,                         // 'light'|'dark'
  base, ink, sub, accent,             // 베이스/본문잉크/캡션회색/액센트
  danger, ok, warn, info, concept,    // 의미색 (mode에 맞게: light=600/700, dark=400)
  fontHead, fontBody, fontKo,         // 'Calibri','Calibri','Malgun Gothic' 등 안전폰트
  scale:{ title:40, section:32, slideTitle:26, body:18, caption:13 } }  // pt
```
가드레일(design-spec): 초록·주황은 light에서 텍스트로 쓰면 ink로 강등하거나 700번대. white-on-orange 카드는 글자 ink.

## 3. core.js (A1) — exports
- `color(s) -> string` : `#` 제거, 8자리(알파) 입력은 throw 또는 6자리로 절단+경고. 잘못된 입력 방어.
- `makeShadow(opts={}) -> object` : **매 호출 새 객체** 반환(재사용 mutate 금지). `{type:'outer',color,opacity,blur,offset,angle}`.
- `defineMasters(pptx, theme) -> void` : `pptx.defineSlideMaster`로 4종 등록 — name `'TITLE'`(다크)·`'BODY'`(라이트)·`'SECTION'`(다크)·`'CLOSING'`(다크). 푸터·페이지 placeholder 포함.
- `applyChrome(slide, theme, {title, source, page}) -> void` : 제목(slideTitle pt, ink) + 푸터(출처·페이지 caption). **제목 밑 액센트 라인 금지**(AI 티).
- `autoGrid(n) -> {w,gut,x(i)}` : `col(n)` 위임.
- `fitText(w, h, text, {min:18,max:40,fontFace}={}) -> number` : 박스(인치)·글자수로 pt 역산, min 미만이면 min 반환(분할 플래그는 lint가). 한글은 1.7배 폭 가정.
- `styledChart(slide, type, data, theme, opts={}) -> void` : Tufte 기본(범례off 단일시리즈·격자 valGridLine 옅게/catGridLine none·데이터라벨 outEnd·3D/pie 금지·강조1색). type ∈ {'bar','line','barH','stackedBar'}; pie/doughnut/3d 요청 시 bar로 대체+경고.
- `addBullets(slide, items, opts={}) -> void` : `bullet:true, breakLine:true, paraSpaceAfter, margin:0` 디폴트. 유니코드 '•' 직접 금지. 최대 5줄 권장.
- `addIcon(slide, name, {x,y,size,color}) -> Promise<void>` : sharp+react-icons 있으면 256px PNG base64 삽입, 없으면 no-op(graceful).
- `contrast(fg, bg) -> number` : WCAG 대비비(표준 공식).
- `lint(slideSpec, theme) -> [{rule,level,msg}]` : 규칙 ID 아래 §6.

## 4. components.js (A2) — 부품. 시그니처 **모두 `(pptx, spec, theme) -> slide`**
core의 `applyChrome/autoGrid/fitText/styledChart/addBullets/color`와 tokens의 `grid/col`만 써서 좌표 산출(직접 좌표 최소화). 각 함수는 `spec.notes` 있으면 `slide.addNotes(spec.notes)`.
- `addCover(pptx, {title, subtitle, meta}, theme)` — TITLE 마스터(다크).
- `addSection(pptx, {n, title}, theme)` — SECTION 마스터, 큰 번호.
- `addKeyMsg(pptx, {assertion, evidence, image, chart, source}, theme)` — **assertion-evidence**: 제목=완결문장 주장, 본문=시각증거(image/chart/evidence 중 하나).
- `addKpi(pptx, {title, items:[{value,label,interp,color}]}, theme)` — 카드 2~4개, 숫자+라벨+해석. 의미색 채움.
- `addChart(pptx, {title, chartType, data, takeaway, source}, theme)` — styledChart + 우측 "so-what" 박스.
- `addCompare(pptx, {title, left:{head,points}, right:{head,points}}, theme)` — 2단.
- `addTimeline(pptx, {title, steps:[{when,what}]}, theme)` — 가로 타임라인.
- `addProcess(pptx, {title, steps:[{label}]}, theme)` — 박스+화살표 3~5스텝.
- `addQuote(pptx, {quote, who}, theme)` — 큰 인용.
- `addClosing(pptx, {title, contact}, theme)` — CLOSING 마스터.
- `addBackup(pptx, {title, body}, theme)` — 백업(밀도 허용).
`module.exports = { addCover, addSection, addKeyMsg, addKpi, addChart, addCompare, addTimeline, addProcess, addQuote, addClosing, addBackup }`

## 5. presets.js + build.js (A2)
**presets.js** — `_research/presets.md`의 D-3 표 그대로:
```
module.exports = { 'research-talk':{logic,titleStyle,density,backup,maxSlides,emphasize:[],sequence:[...]},
  'defense':{...}, 'exec':{...}, 'pitch':{...} }
```
`sequence`는 슬라이드 토큰 배열(예: `['cover','keymsg','keymsg','kpi','chart','closing']`).

**build.js exports:**
- `DISPATCH` : `{ cover:addCover, section:addSection, keymsg:addKeyMsg, kpi:addKpi, chart:addChart, compare:addCompare, timeline:addTimeline, process:addProcess, quote:addQuote, closing:addClosing, backup:addBackup }`.
- `parseDeck(md) -> deckSpec` : 마크다운→스펙(H1=section, H2=슬라이드, 표=chart/kpi 후보, frontmatter=theme/preset/layout). 최소구현 OK.
- `chooseLayout(slideSpec) -> type` : type 비었을 때 휴리스틱(숫자1~2개→kpi, A vs B→compare, 연도나열→timeline, 인용부호→quote, 그 외→keymsg).
- `applyPreset(name, deckSpec) -> deckSpec` : 프리셋 sequence·tone을 비어있는 부분에 채움.
- `build(deckSpec, {out='deck.pptx'}={}) -> Promise<{path, lint}>` : `getTheme`→`defineMasters`→슬라이드별 `DISPATCH[type](pptx,spec,theme)`→각 슬라이드 `lint`수집→`pptx.writeFile`. 반환에 경로+린트경고 배열.
- `restyle(deckSpec, themeName) -> deckSpec` : theme만 교체.

**deckSpec(공개 입력 JSON) 형태:**
```
{ theme:'slate', mode:'light', preset:'research-talk', layout:'16x9',
  slides:[ {type:'cover', title, subtitle, meta, notes, source}, {type:'kpi', title, items:[...] }, ... ] }
```

## 6. lint 규칙 ID (core.lint) — level: 'fail' | 'warn'
- `L_ELEMENTS` fail: 슬라이드 최상위 시각요소 > 6.
- `L_FONT` fail: 본문 < 18pt(또는 제목 < 24pt).
- `L_TEXTONLY` warn: 시각요소(이미지/차트/도형) 0 + 텍스트만.
- `L_TITLELINE` fail: 제목 밑 액센트 라인 사용(금지).
- `L_CENTERBODY` warn: 본문 장문 가운데정렬.
- `L_ACTIONTITLE` warn: preset이 exec/pitch인데 제목이 동사 없는 명사구/콜론끝.
- `L_CONTRAST` fail: 텍스트·배경 대비 < 4.5(대형 18pt+ bold는 < 3).
- `L_DENSITY` warn: 본문 한글 > 150자(또는 40단어).
- `L_SOURCE` warn: chart/kpi인데 source 비어있음.

## 7. deck.js (A2) — CLI
- `node deck.js build <spec.json> [out.pptx]` → build() 호출, 린트 경고 출력.
- `node deck.js smoke` → examples/의 예제 스펙으로 빌드(엔진 점검).
- 재export: `module.exports = require('./lib/build')`.

## 8. 통합 스모크(내가 검증) 기준
`node deck.js smoke` 가 유효한 .pptx(zip에 ppt/slides/slide1.xml 존재)를 내고, 프리셋 4종 각각 한 장 이상 생성되며, lint가 배열을 반환하면 통과.
