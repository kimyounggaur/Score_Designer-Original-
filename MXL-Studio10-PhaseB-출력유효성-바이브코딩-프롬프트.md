# MXL Studio10 · Phase B 출력·유효성·성능 바이브코딩 프롬프트

작성일 2026-11-10.
대상 스냅샷 `kimyounggaur/Score_Designer-Original-` main **24f5328** (2026-11-10, Phase A2 병합 직후. 배포본 https://kimyounggaur.github.io/Score_Designer-Original-/mxl-studio.html 과 같은 커밋. mxl-studio.html 4,833줄 / 코어 11개 / 패널 21개 / 픽스처 17개 / 단위 185개).
목적은 **① 내보낸 MusicXML이 표준 스키마를 통과하게 하고(악보 클라우드 재저장·다른 프로그램 호환), ② PNG·PDF 출력이 창 크기와 무관하게 같은 결과를 내게 하고, ③ 긴 악보에서 화면이 멈추는 시간을 줄이는 것**입니다.

---

## 0. 이 문서를 읽기 전에

### 0.1 분석 방법과 증거 등급

이 문서의 결함은 24f5328을 로컬에서 실제로 구동해 얻었습니다(Linux, Chrome for Testing, CDN은 같은 버전·같은 바이트의 로컬 미러).

| 방법 | 내용 |
|---|---|
| 스키마 스윕 | 기존 E2E 136개(21패널 + 번호 스펙)를 그대로 돌리면서 매 테스트 종료 시 열린 파일 전부를 MusicXML 4.0 XSD(`xmllint --schema`)로 검증. 검증한 문서 128건 이상 |
| 출력 탐침 | 64마디·12마디 생성 악보로 PNG 저장, 전체 PNG(ZIP), PDF(인쇄 경로)를 창 크기별로 실행해 산출물 크기·쪽수·이미지를 확인 |
| 성능 탐침 | 64마디 1파트, 400마디 2파트 악보로 OSMD `load`/`render` 호출 횟수·시간, 롱태스크, 힙을 측정 |
| 입력 탐침 | UTF-16, score-timewise, 타악기(unpitched)·TAB(fret)·극단 옥타브·볼타가 섞인 악보를 올리고 코어를 직접 호출 |

| 표기 | 뜻 |
|---|---|
| **재현** | 위 탐침에서 실제로 관찰했다. 수치를 1장에 적었다 |
| **소스 확인** | 실행 없이 소스에서 원인 코드를 확인했다 |
| **미확인** | 의심되지만 이 환경에서 확인하지 못했다. 4.4절로 미룬다 |

확인 결과 **정상이었던 것**(고치지 않는다): 기존 픽스처 16개 XSD 통과, 조옮김·조바꿈·카포·음역·이조·템포·Ossia·음자리표·파트·표기·화성·코드 도구·가사 스타일·코드 분석 패널의 출력 XSD 통과, 볼타(1·2번 괄호) 재생 순서 `1,2,1,3,4`, UTF-16 파일 업로드, 136개 E2E 전부 통과.

### 0.2 이 문서가 정한 기본값

사용자 확인 없이 작업자가 정한 설계 기본값입니다. 바꾸려면 이 표와 해당 세션 프롬프트만 고칩니다.

| 번호 | 결정 | 내용과 이유 |
|---|---|---|
| E1 | 색상 값은 **대문자 16진수**(`#E74C3C`)로 쓴다 | MusicXML `color` 형식은 `#[\dA-F]{6}`입니다. 소문자는 스키마 위반(V1) |
| E2 | 로마 숫자 표식은 `data-roman-analysis` 대신 **`<words id="mxl-roman-…">`** | `words`에는 임의 속성을 둘 수 없습니다(V2). `id`(xs:ID)는 MusicXML 3.1부터 표준입니다. 문서 안에서 고유해야 하므로 `mxl-roman-<파트순번>-<일련번호>` |
| E3 | 예전 표식(`data-roman-analysis`)은 **업로드·세션 복원 시 새 표식으로 이전** | 이미 저장된 파일을 다시 열어도 '삽입 제거·재삽입'이 동작해야 합니다 |
| E4 | 음높이 결과가 **옥타브 0~9 밖**이면 그 파일의 변환을 **커밋하지 않고 경고** | 스키마 위반(V3). 한 옥타브 접기 같은 자동 보정은 선율을 바꾸므로 하지 않습니다 |
| E5 | 타악기 파트(첫 음자리표 `percussion` 또는 pitch 음표 0개)는 조옮김에서 **조표를 건드리지 않는다** | 탐침에서 드럼 파트 조표가 0→1로 바뀌었습니다(V4) |
| E6 | TAB(`<fret>`)이 있는 음표를 옮기면 **경고만** 하고 fret은 그대로 둔다 | 줄·프렛 재계산은 조율 정보가 필요해 이 Phase 밖입니다 |
| E7 | 이미지 내보내기(PNG·SVG·ZIP·헤더 PNG)는 모두 **화면 밖 고정 폭 1100px** 컨테이너에 렌더한다 | 미리보기 패널 폭(271px)이나 창 폭에 따라 결과가 달라지는 O1·O2를 없앱니다. 폭은 패널에서 800/1100/1400 중 선택(기본 1100) |
| E8 | PDF는 **OSMD 페이지 형식(`setPageFormat`)으로 쪽을 나눈 인쇄 전용 영역**을 만들어 `window.print()`로 인쇄 | 새 라이브러리 없이 쪽 경계 잘림(O3)을 없앱니다. 용지는 A4 세로(기본)·A4 가로·Letter 세로 |
| E9 | 뷰어 OSMD는 **`autoResize:false`** + 앱의 ResizeObserver(폭이 4px 이상 바뀔 때, 250ms 디바운스) | OSMD 자체 autoResize가 첫 렌더 직후 한 번 더 렌더합니다(P1) |
| E10 | 타악기(unpitched) 음표는 재생하지 않고 **'재생 미반영' 표시에 '타악기 N파트'**를 추가 | 무음 원인을 사용자에게 알립니다(R1). 타악기 음원 추가는 이 Phase 밖 |
| E11 | D.C./D.S./Fine/Coda는 **한 번의 점프만** 지원(D.C. al Fine, D.C. al Coda, D.S. al Fine, D.S. al Coda) | 중첩 점프 없이 일반 악보 대부분을 덮습니다. 지원 못 하는 조합은 기존 경고를 유지 |
| E12 | 악보 표기 변환의 '원본 복원' 기준은 **파일 객체의 `notationBackup`** | 패널의 `baselineRef`는 다른 패널이 커밋하면 어긋납니다(N8). A2의 `lyricBackup`과 같은 방식 |

### 0.3 기존 문서와의 관계

| 문서 | 상태 |
|---|---|
| `MXL-Studio09-개선보완-바이브코딩-프롬프트(Fable51).md` 2.1 공통 계약 | 그대로 유효 |
| `MXL-Studio10-PhaseA-…` 1.3 규칙 F·G·H, `MXL-Studio10-PhaseA2-…` 1.4 규칙 I·J·K | 그대로 유효. 이 문서 1.3절 규칙 L·M·N을 그 뒤에 덧붙인다 |
| Phase A2 문서 4.4 '이후로 미루는 것' | 출력 파이프라인, D.C. 재생, NotationPanel 기준선을 이 Phase가 처리. Ossia의 MusicXML 포함은 계속 미룬다 |

줄 번호는 24f5328 기준입니다. 편집이 진행되면 어긋나므로 각 프롬프트는 함수명·문자열로 다시 grep 하게 지시합니다.

### 0.4 사용 방법

1. 세션 시작 시 Studio09 2.1 공통 계약 → Phase A 1.3 → Phase A2 1.4 → 이 문서 1.3 순서로 붙여넣는다.
2. 3장의 B-1 → B-9를 **한 세션에 하나씩** 순서대로 실행한다.
3. 완료 기준 체크박스가 모두 채워지기 전에는 다음으로 넘어가지 않는다.
4. 세션 종료 시 `checklist.md`에 `- [x] B-n · 제목 (완료 기준 N개)`, `context-notes.md`에 `## 2026-MM-DD · B-n` 절을 추가한다.
5. 작업 브랜치는 `phase-b/output-validity`. main에 직접 푸시하지 않는다(main 푸시는 Pages 배포를 실행한다). B-9 끝에 PR을 열고 CI 통과를 확인한 뒤 **병합하지 않고** 사용자에게 보고한다.
6. CRLF 파일(`playback-core.js`, `roman-analysis-core.js`, `transpose-core.js`, `styles.css` 대부분)은 줄 끝을 유지한다. 커밋 전 `git diff --stat`으로 전체 줄이 바뀌지 않았는지 확인한다.

### 0.5 검증 명령

| 명령 | 용도 |
|---|---|
| `npm test` | 단위 테스트. 이 Phase에서 185 → 약 215개 |
| `npm run e2e:smoke` | 스모크 |
| `npx playwright test --grep @panels --project=chromium` | 패널 매트릭스 |
| `npx playwright test tests/e2e/25-schema.spec.js --project=chromium` | B-1에서 만드는 스키마 검증 스펙 |
| `npx playwright test tests/e2e/26-output.spec.js --project=chromium` | B-4·B-5에서 만드는 출력 스펙 |
| `npx playwright test --project=mobile --grep @ux` | 모바일 너비 |

---

## 1. 근거 요약

### 1.1 재현한 결함

| ID | 등급 | 증상 | 증거 | 원인 위치 | 세션 |
|---|---|---|---|---|---|
| V1 | 재현 | 색깔 악보·숫자 악보 출력이 MusicXML 스키마 위반 | `note`·`notehead`의 `color="#e74c3c"` 등이 패턴 `#[\dA-F]{6}` 불일치. 스펙 13-color, 16-numbering | `NOTE_COLORS`(83행, 소문자), `setAttribute('color',color)`(2268·2271·2272·2771행) | B-1 |
| V2 | 재현 | 로마 숫자 삽입 출력이 스키마 위반 | `words`의 `data-roman-analysis` 속성 불허. 스펙 24 B01 | `roman-analysis-core.js` 346·357행 | B-1 |
| V3 | 재현 | 조옮김 결과 옥타브가 범위를 넘어도 그대로 저장 | C9를 +7 → G9, B9 → F♯10. 이어서 +36 → 옥타브 13·12. 경고 없음 | `transposeNoteElement`, `PitchCore.shiftNoteOctave`, 음역·Ossia·화성 패널 | B-2 |
| V4 | 재현 | 타악기 파트의 조표가 조옮김에 함께 바뀜 | 드럼 파트 `fifths` 0 → 1 | `transposeDocument`·`transposePartRange`가 파트 종류를 보지 않음 | B-2 |
| V5 | 재현 | TAB 음표를 옮겨도 `<fret>`이 그대로 | G4(3번 줄 0프렛) +7 뒤 D5인데 `fret` 0. 경고 없음 | 같은 곳 | B-2 |
| O1 | 재현 | 'PNG 저장'이 좁은 세로띠로 나옴 | 12마디 악보: 미리보기 SVG 폭 239px(패널 271px) → **358×2611px**, 마디당 한 줄 | `renderScoreSvgs`가 `.export-preview`(패널 폭)에 렌더 | B-4 |
| O2 | 재현 | 같은 악보의 '전체 파일 PNG(ZIP)'는 전혀 다른 크기 | 같은 파일 **2160×817px**(body 직속 컨테이너 = 창 폭 1440). 헤더 PNG는 또 뷰어 폭·확대율 기준 | `exportAllPNG`의 `osmd-batch-*` 컨테이너, App `exportPNG` | B-4 |
| O3 | 재현 | PDF가 쪽 경계에서 오선을 자르고, 결과가 창 크기에 좌우됨 | 64마디: 1440px 창(패널 열림) 3쪽·경계에서 보표 절단 / 1000px 창 **10쪽**, SVG 폭 264px, 제목 잘림 / 패널 닫으면 1쪽. `beforeprint` 시점 컨테이너 폭이 화면 폭 그대로(704px) | `printScore`(508행 `window.print()`), `@media print`(styles.css 2413행), SVG 하나에 `break-inside:avoid` | B-5 |
| O4 | 소스 확인 | 버튼 이름은 'PDF 저장'인데 실제로는 브라우저 인쇄 대화상자 | `printScore`가 `window.print()`만 호출. 모바일 브라우저에서는 PDF 저장 경로가 기기마다 다름 | 같은 곳 | B-5 |
| P1 | 재현 | 악보를 열 때마다 OSMD가 **두 번** 렌더 | 64마디 406ms + 273ms / 400마디 2파트 **5.5초 + 5.3초**. 두 번째 호출 스택은 OSMD 내부. 빈 페이지에서도 `autoResize:true` 2회, `false` 1회 | ScoreView의 `autoResize:true`(3566행) | B-6 |
| P2 | 재현 | 긴 악보에서 확대·축소 한 번이 화면을 멈춤 | 400마디 2파트: 확대 1회 4.7초 롱태스크, SVG 노드 37,624개. 진행 표시 없음 | `redraw`가 동기 `render()` | B-6 |
| R1 | 재현 | 타악기(unpitched) 파트가 소리 없이 무시됨 | 드럼 16음 → 재생 이벤트 0개, 안내 없음 | `parsePart`의 `pitch&&…` 조건 | B-7 |
| R2 | 소스 확인 | D.C./D.S./Fine/Coda를 따르지 않음(A2에서 경고만) | `playback-core.js`의 TODO 주석 | `expandMeasureOrder` | B-7 |
| N8 | 소스 확인 | 악보 표기 변환 '원본 복원'이 다른 패널 작업 뒤 처음 상태로 못 돌아감 | `baselineRef`(1956~1982행)가 패널 state | NotationPanel | B-8 |
| U1 | 재현 | score-timewise 파일의 거절 문구가 원인을 말하지 않음 | "지원하는 MusicXML 악보가 아닙니다." | `addFiles`(4538행) | B-8 |

### 1.2 왜 이 순서인가

V1·V2는 이 앱의 핵심 흐름(편집 → MXL로 악보 클라우드 저장 → 다시 불러오기, 다른 프로그램에서 열기)을 직접 건드립니다. 엄격한 MusicXML 처리기는 스키마 위반 파일을 거절할 수 있으므로 가장 먼저 고치고, **이후 모든 세션이 스키마 검증 스펙을 통과**하게 합니다. 출력(O)은 사용자가 가장 자주 보는 결과물이라 그다음, 성능(P)과 재생(R)은 그 뒤입니다.

### 1.3 공통 계약 추가 규칙 (세션 시작 시 Phase A2 1.4 뒤에 붙여넣기)

````text
[Phase B 추가 규칙 — Studio09 공통 계약, Phase A·A2 추가 규칙 뒤에 적용]

L. 표준 준수 규칙
  1. 악보 XML에 넣는 요소·속성은 MusicXML 4.0 스키마에 있는 것만 쓴다. `data-*` 같은 임의 속성을 새로 만들지 않는다.
     앱 전용 표식이 필요하면 표준 속성(lyric의 name, direction·words의 id)에 `mxl-` 접두 값을 넣는다.
  2. color 속성은 `ExportCore.normalizeColor`를 거친 대문자 `#RRGGBB`만 쓴다.
  3. 음높이를 바꾸는 변환은 결과 옥타브가 0~9인지 파일 단위로 확인한다. 범위를 넘으면 그 파일을 원본 그대로 결과에 넣고 `⚠` 로그를 남긴다(규칙 I-3과 같은 방식).
  4. 새 패널·새 변환을 추가하면 `tests/e2e/25-schema.spec.js`의 표에 한 줄을 추가한다.

M. 출력 규칙
  1. 내보내기용 렌더는 항상 `renderForExport`(화면 밖 고정 폭 컨테이너)를 쓴다. 화면에 보이는 요소의 폭·확대율에 의존하지 않는다.
  2. 같은 파일·같은 설정이면 PNG 저장, ZIP, 헤더 PNG의 픽셀 크기가 같아야 한다.
  3. 화면 밖 컨테이너는 `try/finally`로 반드시 제거한다.
  4. 인쇄는 `.print-root` 인쇄 전용 영역만 보이게 한다. 뷰어 SVG를 직접 인쇄하지 않는다.

N. 성능 규칙
  1. OSMD `render()`는 한 번의 사용자 동작에 한 번만 호출되게 한다. 테스트 훅 `window.__mxlRenderCount`로 확인한다.
  2. 300ms 이상 걸릴 수 있는 렌더(음표 2,000개 이상)는 `showProgress` 뒤 한 프레임을 양보하고 실행한다.
````

---

## 2. 코어·헬퍼 설계

### 2.1 `export-core.js` 신설 → `window.ExportCore` (B-1·B-4·B-5)

패턴 `(function(global){ 'use strict'; … global.ExportCore={…}; })(window);`, 스크립트 태그 `export-core.js?v=1`을 `session-store-core.js` 뒤에 추가, `missingLibraries` 목록에 `ExportCore` 추가.

| 함수 | 동작 |
|---|---|
| `normalizeColor(value)` | `'#e74c3c'`→`'#E74C3C'`, `'#abc'`→`'#AABBCC'`, 8자리(알파) 허용, 형식이 아니면 `null` |
| `PAGE_FORMATS` | `{A4_P:{label:'A4 세로',osmd:'A4_P',css:'A4 portrait'},A4_L:{label:'A4 가로',osmd:'A4_L',css:'A4 landscape'},LETTER_P:{label:'Letter 세로',osmd:'Letter_P',css:'letter portrait'}}` |
| `EXPORT_WIDTHS` | `[800,1100,1400]`, `DEFAULT_EXPORT_WIDTH=1100` |
| `clampExportWidth(value)` | 목록에 없으면 1100 |
| `pngPixelSize({width,height},scale)` | `{width:Math.round(width*scale),height:Math.round(height*scale)}`. 어느 변이든 16,384를 넘거나 넓이가 2억 6,800만을 넘으면 `{…,tooLarge:true}` |
| `octaveOutOfRange(xmlDoc)` | `pitch > octave` 값이 정수 0~9 밖인 음표를 `[{measure,step,octave}]`로(최대 5개) 반환 |
| `isPercussionPart(partEl)` | 첫 `clef > sign`이 `percussion`이거나, `note`가 있는데 `pitch`가 하나도 없으면 true |

### 2.2 `roman-analysis-core.js` 변경 (B-1)

- 표식 상수 `ROMAN_ID_PREFIX='mxl-roman-'`. 삽입 시 `words.setAttribute('id', prefix+partIndex+'-'+n)`. 문서에 같은 id가 이미 있으면 n을 올린다.
- 제거 조건을 `isRomanWords(words)` 하나로 모은다: id가 접두로 시작하거나 예전 `data-roman-analysis==='true'`.
- `migrateRomanMarkers(xmlDoc)`: 예전 속성을 가진 `words`에 새 id를 주고 예전 속성을 지운다. 바꾼 수를 반환. export 목록에 추가.

### 2.3 `transpose-core.js` 변경 (B-2)

- `transposeDocument`·`transposePartRange`에 `options.skipKeyFor(partEl)` 콜백. true면 그 파트의 `key`를 고치지 않고 `insertLeadingKey`도 하지 않는다. 결과에 `skippedKeyParts` 수를 더한다.
- 결과에 `tabNotes`(옮긴 음표 중 `notations technical fret`이 있는 수)를 더한다.

### 2.4 `playback-core.js` 변경 (B-7)

- `extractPlaybackData` 결과에 `unpitchedParts`(unpitched 음표가 있는 파트 label 배열)를 더하고, 있으면 `warnings`에 `타악기 파트 ${label}은(는) 재생되지 않습니다.`, `navigationMarks`와 별도인 `mutedParts`로도 돌려준다.
- `expandMeasureOrder(measures,expandRepeats,{jumps=true})`: 2.5절의 점프 규칙.

### 2.5 D.C./D.S. 점프 규칙 (E11)

1. 마디마다 표식을 모은다: `sound[dacapo]`/words `D.C.` → dacapo, `sound[dalsegno]`/words `D.S.` → dalsegno, `sound[segno]`/`<segno>` → segno 위치, `sound[fine]`/words `Fine` → fine, `sound[tocoda]`/words `To Coda` → tocoda, `sound[coda]`/`<coda>`(tocoda가 아닌 것) → coda 위치. words에 `al Fine`·`al Coda`가 있으면 그 방식, 없으면 fine이 있으면 al Fine, tocoda·coda가 둘 다 있으면 al Coda.
2. 기존 반복 전개로 순서를 만들다가 dacapo/dalsegno 마디의 **마지막 통과**가 끝나면 한 번만 점프한다: D.C.는 0번 마디, D.S.는 segno 마디.
3. 점프 뒤에는 반복을 다시 돌지 않는다(각 반복 구간의 마지막 괄호만 연주).
4. al Fine: fine 마디를 연주하고 끝낸다. al Coda: tocoda 마디를 연주한 뒤 coda 마디로 건너뛰어 끝까지.
5. 필요한 표식이 없거나(예: D.S.인데 segno 없음) 점프 표식이 2개 이상이면 **점프하지 않고** 기존 경고를 유지한다. 점프를 적용했으면 그 표식은 `navigationMarks`·`warnings`에서 뺀다.

### 2.6 `mxl-studio.html` 헬퍼 (B-4·B-5·B-6)

| 헬퍼 | 동작 |
|---|---|
| `renderForExport(file,{width,pageFormat,isStale})` | `position:fixed;left:-20000px;top:0;width:${width}px;` 컨테이너를 body에 붙이고 기존 `renderScoreSvgs`를 호출. `pageFormat`이 있으면 `osmd.setPageFormat(PAGE_FORMATS[…].osmd)` 뒤 render. `{main,ossia,pages:[svg…],dispose()}` 반환. `dispose`는 컨테이너 제거 |
| `buildPrintRoot(file,pageFormat)` | `renderForExport`로 쪽 SVG들을 얻어 `<div class="print-root" data-page-format>` 안에 `<div class="print-page">`로 하나씩 옮긴다(Ossia는 첫 쪽 위). `<style id="mxl-print-page">@page{size:…;margin:0}</style>`를 head에 넣는다 |
| `printScore(file,pageFormat)` | `buildPrintRoot` → `window.print()` → `afterprint`(once)와 `finally`에서 `.print-root`·style 제거, `document.title` 복원 |
| ScoreView `renderCount` | `render()`를 부를 때마다 `window.__mxlRenderCount=(window.__mxlRenderCount||0)+1` |

### 2.7 새 픽스처

| 파일 | 내용 | 쓰는 곳 |
|---|---|---|
| `f18-long-64.musicxml` | 1파트 64마디 4/4, 4분음표, 홀수 마디 코드, 한글 제목·가사 | B-4·B-5·B-6 |
| `f19-drums-tab.musicxml` | P1 기타 4마디(4마디에 C9·C0, `<technical><string>3</string><fret>0</fret>` 음표 1개), P2 타악기(percussion 음자리표, unpitched 16음) | B-2·B-7 |
| `f20-dc-al-fine.musicxml` | 4마디. 2마디 끝 `Fine`(`sound fine="yes"`), 4마디 끝 `D.C. al Fine`(`sound dacapo="yes"`). 기대 순서 1,2,3,4,1,2 | B-7 |
| `f21-ds-al-coda.musicxml` | 6마디. 2마디 segno, 3마디 끝 To Coda, 4마디 끝 `D.S. al Coda`, 5마디 coda. 기대 순서 1,2,3,4,2,3,5,6 | B-7 |

모두 `tests/e2e/01-fixtures.spec.js` 목록에 추가하고, 추가 전 `xmllint --schema`로 유효한지 확인한다.

---

## 3. 단계별 프롬프트 (Phase B, 9세션)

### B-1 · 문서 커밋, 스키마 검증 스펙, 색상 대문자화, 로마 숫자 표식 교체

**근거** V1, V2. 스키마 위반 2종을 고치고, 이후 세션이 같은 문제를 다시 만들지 않게 검증 스펙을 먼저 세웁니다.

````text
[B-1] 스키마 검증 기반과 V1·V2 수정

0. 브랜치 `phase-b/output-validity`를 main(24f5328)에서 만든다. 이 문서를 저장소 루트에 추가한다.
1. 스키마 준비:
   - `tests/schema/`에 MusicXML 4.0 `musicxml.xsd`, `xml.xsd`, `xlink.xsd`를 넣는다(W3C Music Notation Community Group 배포본. 출처 URL과 라이선스 문구를 `tests/schema/README.md`에 적는다).
     `musicxml.xsd`의 두 `xs:import schemaLocation`을 같은 폴더 상대 경로로 바꾼 사본 `musicxml.local.xsd`를 둔다.
   - devDependency로 `xmllint-wasm`을 버전 고정해 추가한다(설치 시점의 안정 버전을 package.json에 정확한 버전으로 적는다).
     설치가 안 되는 환경을 위해 `tests/e2e/schema-validate.js` 헬퍼는 ① xmllint-wasm ② 시스템 `xmllint`(child_process) 순서로 시도하고, 둘 다 없으면 `test.skip`과 이유를 남긴다.
   - 헬퍼 `validateMusicXml(xmlString)` → `string[]`(오류 문장, 없으면 빈 배열). CI(`.github/workflows/ci.yml`)에는 `sudo apt-get install -y libxml2-utils` 단계를 추가해 폴백도 동작하게 한다.
2. `export-core.js`를 설계 2.1대로 만든다(이번 세션에서는 `normalizeColor`, `octaveOutOfRange`, `isPercussionPart`, 상수만. 나머지는 B-4에서).
   `tests/unit/export-core.test.js`: normalizeColor 6건(소문자, 3자리, 8자리, 이미 대문자, 형식 아님 2건), octaveOutOfRange 3건, isPercussionPart 3건.
3. V1: `NOTE_COLORS`(문자열 "const NOTE_COLORS"로 grep) 값을 대문자로 바꾸고, `setAttribute('color'`로 grep 한 모든 곳(음표·notehead·stem·가사 text)을 `ExportCore.normalizeColor(color)` 결과로 바꾼다. null이면 속성을 쓰지 않고 로그에 `⚠ 색상 형식 오류`를 남긴다.
   가사 스타일 패널의 색 입력(`<input type="color">`는 소문자를 준다)도 같은 경로를 탄다.
   CSS·화면 표시용 색은 건드리지 않는다. 악보 XML에 쓰는 값만 바꾼다.
4. V2: `roman-analysis-core.js`를 설계 2.2대로 바꾼다. HTML에서 `data-roman-analysis`를 grep 해 선택자(`words[data-roman-analysis]`)를 `words[id^="mxl-roman-"]`로 바꾼다.
   `addFiles`의 파싱 직후와 세션·공유·히스토리 복원 경로(`restoreHistoryFiles` 호출처, 세션 복원 함수)에서 `RomanAnalysis.migrateRomanMarkers(xmlDoc)`를 호출하고, 바꾼 수가 1 이상이면 xmlString을 다시 직렬화한다.
   스크립트 쿼리 `roman-analysis-core.js?v=3`.
   단위 테스트 추가 4건: 삽입 뒤 id 접두·고유성, 재삽입 시 이전 것 제거, 예전 속성 문서에서 제거 동작, migrate 뒤 예전 속성 0개.
5. 새 스펙 `tests/e2e/25-schema.spec.js`(태그 @panels). 표 기반으로 작성한다:
   `[{name:'color',fixture:'f01-basic.musicxml',run:async(page)=>…}, …]` 각 행은 픽스처 업로드 → 패널 실행 → `__mxlGetState().files`의 모든 xmlDoc을 직렬화해 `validateMusicXml`이 빈 배열인지 단언.
   행: 조옮김(+2), 마디별 조바꿈, 카포, 음역, 이조 악기, 템포, 마디별 템포, Ossia, 음자리표, 파트 추출, 표기 변환(각 모드), 색깔 악보(기둥 포함), 화성 쌓기, 코드 도구(삽입·자리바꿈), 숫자 악보(각 모드), 가사 스타일(색 지정), 코드 자동 삽입, 로마 숫자 삽입.
   패널 조작 코드는 기존 `tests/e2e/panels/*.spec.js`의 것을 재사용한다(공통 부분은 helpers.js로 옮겨도 된다).
   추가 1건: `data-roman-analysis="true"`가 든 예전 파일(테스트 안에서 문자열로 생성)을 업로드 → 스키마 통과, 로마 숫자 패널 '삽입 제거'가 그 표기를 지움.
6. 기존 스펙 중 소문자 색(`#e74c3c`)이나 `data-roman-analysis`를 기대하는 단언을 새 값으로 바꾼다(`grep -rn "e74c3c\|data-roman" tests`).
7. `npm test`, 25-schema, `--grep @panels`, `npm run e2e:smoke`. 커밋 "MusicXML 스키마 검증 스펙 추가, 색상 대문자화, 로마 숫자 표식을 표준 id로 교체".
````

**완료 기준**
- [ ] 25-schema의 모든 행이 통과한다(색깔·숫자·로마 숫자 포함)
- [ ] `grep -n "data-roman-analysis" mxl-studio.html`이 0건이고, 코어에는 이전(migrate)·제거 판정에만 남아 있다
- [ ] 예전 표식 파일을 올려도 삽입 제거가 동작한다 (E2E 단언)

---

### B-2 · 음높이 범위 가드, 타악기 파트 조표 보호, TAB 경고

**근거** V3, V4, V5. 옥타브 10 이상은 스키마 위반이고 재생·렌더도 깨집니다.

````text
[B-2] 옥타브 범위 가드와 타악기·TAB 처리

1. 픽스처 `f19-drums-tab.musicxml`을 설계 2.7대로 만들고 스키마 검증, 01-fixtures 목록 추가.
2. `transpose-core.js`를 설계 2.3대로 바꾼다(`skipKeyFor`, `skippedKeyParts`, `tabNotes`). 쿼리 `?v=4`.
   단위 테스트 4건: skipKeyFor가 true인 파트의 fifths 불변·다른 파트는 변경, transposePartRange에서 insertLeadingKey 안 함, tabNotes 수, 옵션 없을 때 기존 결과와 동일.
3. HTML에 헬퍼 `guardPitchRange(file,doc,lines)`를 `commitFile` 근처에 추가한다:
   `const bad=ExportCore.octaveOutOfRange(doc); if(!bad.length)return true;`
   `lines.push({m:`⚠ ${file.name}: 음이 표기 가능한 범위(옥타브 0~9)를 벗어나 적용하지 않았습니다. 예: 마디 ${bad[0].measure} ${bad[0].step}${bad[0].octave}`,t:'warn'}); return false;`
4. 음높이를 바꾸는 모든 패널에서 `commitFile(file,doc)` 직전에 `if(!guardPitchRange(file,doc,lines)){updatedFiles.push(file);continue;}`를 넣는다.
   대상(각각 패널 함수명으로 grep): TransposePanel(반음·조·음정·all12 ZIP 생성 경로 포함), KeyChangePanel, CapoPanel, RangePanel, InstrumentPanel, OssiaPanel(Ossia 문서에 대해), HarmonyPanel, ClefPanel(옥타브를 옮기는 모드만).
   all12 ZIP은 범위를 넘는 조를 ZIP에서 빼고 로그에 조 이름을 적는다. ZIP 안 파일 수와 로그 수가 같아야 한다(규칙 J-3).
5. 조옮김 계열 호출에 `skipKeyFor:ExportCore.isPercussionPart`를 넘긴다(`TransposeCore.transposeDocument(`, `transposePartRange(`로 grep). 건너뛴 파트가 있으면 `ℹ 타악기 파트 N개는 조표를 바꾸지 않았습니다.` 로그.
6. 결과의 `tabNotes>0`이면 `⚠ TAB 프렛 표기 N개는 바뀌지 않습니다. 줄·프렛을 직접 확인하세요.` 로그.
7. `tests/e2e/24-audit-regressions.spec.js` 아래가 아니라 새 묶음 `tests/e2e/27-phase-b-regressions.spec.js`(@panels)를 만들고:
   - 'transpose refuses out-of-range octaves': f19 업로드 → 조옮김 +7 실행 → 파일 xmlString 불변, 로그에 '범위' 포함, 히스토리 길이 불변.
   - 'percussion key stays': f19의 4마디 C9를 뺀 사본을 테스트 안에서 만들어 업로드(또는 −5 실행) → P2 fifths 0 유지, P1 fifths 변경, 로그에 '타악기 파트'·'TAB 프렛' 포함.
   - 25-schema 표에 f19 조옮김(−5) 행 추가.
8. `npm test`, 25-schema, 27, `--grep @panels`. 커밋 "음높이 범위 가드, 타악기 파트 조표 보호, TAB 경고".
````

**완료 기준**
- [ ] 범위를 넘는 변환이 커밋되지 않고 원본·히스토리가 그대로다 (E2E 단언)
- [ ] 타악기 파트 조표가 조옮김·카포·조바꿈 뒤에도 그대로다
- [ ] 8개 패널 모두에 가드가 있고(`grep -c "guardPitchRange(" mxl-studio.html` ≥ 9) 기존 패널 스펙이 통과한다

---

### B-3 · score-timewise 안내와 업로드 오류문 정리

**근거** U1. 작지만 사용자가 원인을 알 수 없는 거절입니다. B-4 전에 끼워 넣는 짧은 세션입니다.

````text
[B-3] 업로드 거절 사유 구체화

1. `addFiles`(문자열 '지원하는 MusicXML 악보가 아닙니다'로 grep)의 판정을 나눈다:
   - 루트가 `score-timewise` → '마디 우선(score-timewise) 형식은 지원하지 않습니다. 악보 프로그램에서 MusicXML(partwise)로 다시 내보내 주세요.'
   - 루트가 `opus` → '여러 악보 묶음(opus) 파일은 지원하지 않습니다. 악보를 하나씩 내보내 주세요.'
   - 루트가 `score-partwise`인데 `part`가 없음 → '악보에 파트가 없습니다.'
   - `part`는 있는데 `measure`가 0개 → '악보에 마디가 없습니다.'
   - 그 밖 → 기존 문구 뒤에 `(루트 요소: ${localName})`.
2. `tests/e2e/panels/21-upload.spec.js`에 timewise·opus·빈 파트 3건을 추가한다(테스트 안에서 문자열로 파일 생성, `setInputFiles({name,mimeType,buffer})`). 각각 파일 목록에 추가되지 않고 로그에 해당 문구.
3. 설명서 '파일 업로드' 절의 지원 형식 문장에 partwise만 지원함을 한 줄 추가한다(manual/과 두 사본 폴더를 같은 내용으로).
4. `npx playwright test tests/e2e/panels/21-upload.spec.js --project=chromium`, 스모크. 커밋 "업로드 거절 사유를 형식별로 안내".
````

**완료 기준**
- [ ] timewise·opus·빈 악보가 각기 다른 한글 사유로 거절된다 (E2E 단언)

---

### B-4 · 이미지 내보내기 통일: 화면 밖 고정 폭 렌더

**근거** O1, O2. 같은 악보가 버튼에 따라 358×2611과 2160×817로 나옵니다.

````text
[B-4] PNG·SVG·ZIP·헤더 PNG를 같은 렌더 경로로

1. 픽스처 `f18-long-64.musicxml`(설계 2.7) 추가·스키마 검증.
2. `export-core.js`에 `PAGE_FORMATS`, `EXPORT_WIDTHS`, `DEFAULT_EXPORT_WIDTH`, `clampExportWidth`, `pngPixelSize`를 추가(쿼리 `?v=2`)하고 단위 테스트 5건(clamp 2, pngPixelSize 정상·한 변 초과·넓이 초과).
3. HTML에 `renderForExport`를 설계 2.6대로 추가한다. `renderScoreSvgs`는 컨테이너만 인자로 받는 지금 구조를 유지하고, `pageFormat` 처리만 덧붙인다
   (`if(pageFormat)osmd.setPageFormat(ExportCore.PAGE_FORMATS[pageFormat].osmd);`를 `osmd.render()` 앞에. 쪽 SVG는 `mainBox.querySelectorAll('svg')`).
4. ExportPanel:
   - state `exportWidth`(기본 `ExportCore.DEFAULT_EXPORT_WIDTH`). '내보내기 설정' 카드에 `<select aria-label="악보 폭">` 800·1100·1400 추가, 설명 "폭이 넓을수록 한 줄에 마디가 많이 들어갑니다."
   - `loadPreview`: `renderForExport(file,{width:exportWidth,isStale})`로 렌더한 뒤, 얻은 SVG들을 `.export-preview` 안으로 **옮긴다**(appendChild). 화면 밖 컨테이너는 dispose.
     미리보기 상자 안에서는 CSS로 축소해 보여준다: `.export-preview svg{max-width:100%;height:auto;}`(styles.css). SVG의 width/height 속성은 그대로 둔다.
   - `stackSvgMarkup`이 `getBoundingClientRect()`(축소된 화면 크기)를 쓰는 부분을 **SVG의 width/height 속성값**(`parseFloat(svg.getAttribute('width'))`, 없으면 viewBox)으로 바꾼다. 이 한 줄이 O1의 핵심이다.
   - `previewSourceRef`에 `width:exportWidth`를 더하고 `previewMatches`가 폭도 비교하게 한다(폭을 바꾸면 미리보기 무효화, 규칙 J-4).
   - `exportAllPNG`: `document.createElement('div')` 컨테이너 대신 파일마다 `renderForExport(files[fi],{width:exportWidth})`, finally에서 dispose.
   - PNG 변환 전 `ExportCore.pngPixelSize`가 `tooLarge`면 변환하지 않고 `❌ 이미지가 너무 큽니다(W×H). 배율이나 폭을 낮추세요.` 로그.
5. App의 `exportPNG`(헤더·메뉴의 PNG. 문자열 "'.score-main-render svg'"로 grep): 뷰어 SVG를 쓰지 않고 `renderForExport(file,{width:ExportCore.DEFAULT_EXPORT_WIDTH})` → `stackSvgMarkup([ossia,main])` → `svgMarkupToPngBlob(…,{scale:2,bgWhite:true})` → dispose. 확대율·창 폭과 무관해진다.
6. 새 스펙 `tests/e2e/26-output.spec.js`(@panels):
   - 'single PNG and ZIP PNG have the same size': f18 업로드 → 이미지 패널 → 미리보기 → 'PNG 저장' 다운로드, '전체 파일 PNG (ZIP)' 다운로드 → PNG 헤더(IHDR 16~23바이트)에서 폭·높이를 읽어 두 파일이 같고 폭이 `1100*1.5`인지 단언. ZIP은 JSZip(node)으로 푼다.
   - 'export size ignores the window size': 뷰포트 1440×900과 1000×800에서 각각 'PNG 저장' → 두 PNG의 폭·높이가 같다.
   - 'header PNG ignores zoom': 확대 버튼 3회 뒤 헤더 PNG → 폭이 2200.
   - 'changing the width clears the preview': 미리보기 뒤 폭 1400 선택 → 내보내기 버튼 카드가 사라지고 안내 로그.
7. 기존 `tests/e2e/panels/12-export.spec.js`, `05-ossia-persist`, `13-zoom-print`의 픽셀·선택자 기대값을 새 구조에 맞게 고친다. 바꾼 기대값은 context-notes에 적는다.
8. `npm test`, 26-output, 12-export, `--grep @panels`, `--project=mobile --grep @ux`. 커밋 "이미지 내보내기를 화면 밖 고정 폭 렌더로 통일".
````

**완료 기준**
- [ ] 같은 파일의 PNG 저장·ZIP·헤더 PNG 폭이 설정 폭×배율과 같다 (E2E 단언)
- [ ] 창 크기·패널 폭·확대율을 바꿔도 PNG 크기가 같다 (E2E 단언)
- [ ] 내보내기 뒤 body에 화면 밖 컨테이너가 남지 않는다 (`document.querySelectorAll('[data-export-offscreen]').length===0` 단언)

---

### B-5 · PDF: 쪽 나눔 인쇄 영역

**근거** O3, O4. 지금은 긴 SVG 하나를 브라우저가 임의로 자릅니다.

````text
[B-5] 페이지 형식 렌더와 인쇄 전용 영역

1. HTML의 `printScore`(문자열 'function printScore'로 grep)를 설계 2.6의 `buildPrintRoot`+`printScore(file,pageFormat)`로 바꾼다.
   - `renderForExport(file,{width:794,pageFormat})`(A4 세로 96dpi 폭. 가로는 1123, Letter 세로는 816. `ExportCore.PAGE_FORMATS`에 `width` 필드를 추가해 거기서 읽는다).
   - 쪽 SVG마다 `<div class="print-page">`에 옮기고 SVG에 `width="100%"`, `height` 속성 제거, `preserveAspectRatio="xMidYMin meet"`.
   - Ossia가 있으면 첫 `.print-page` 맨 위에 넣는다(본보 첫 쪽 SVG 위). 넘치면 Ossia만 별도 첫 쪽으로 둔다.
   - 렌더가 끝난 뒤(await) `window.print()`를 부른다. 렌더 중에는 `showProgress('인쇄 준비 중...')`.
   - `printScore`가 async가 되므로 호출처 2곳(ExportPanel.exportPDF, App.exportPDF)은 `try{await …}catch(e){notify(friendlyError(e),'err')}`.
2. ScoreView의 `beforeprint`/`afterprint` 재렌더 핸들러와 `printingRef`(문자열 "'beforeprint'"로 grep)를 삭제한다. 뷰어는 더 이상 인쇄 대상이 아니다.
   사용자가 Ctrl+P를 직접 누른 경우를 위해 App에 `beforeprint` 리스너를 하나 둔다: `.print-root`가 없으면 `notify('인쇄는 내보내기의 PDF 버튼을 사용하세요.','info')`(alert 금지). 이때는 3번의 CSS 덕분에 빈 종이 대신 안내 문구 한 줄(`.print-hint`)이 인쇄된다.
3. styles.css `@media print` 블록을 다시 쓴다(파일 맨 아래가 아니라 기존 블록 자리에서 교체):
   - `body > #root{display:none!important}` / `.print-root{display:block!important}` / 화면에서는 `.print-root{display:none}`.
   - `.print-page{break-after:page;break-inside:avoid;width:100%;height:100vh;overflow:hidden;box-sizing:border-box;padding:0}` / 마지막 쪽은 `break-after:auto`.
   - `@page` 크기는 JS가 넣는 `<style id="mxl-print-page">`가 정한다. CSS 파일의 기존 `@page{margin:10mm}`는 지운다(여백은 OSMD 페이지 여백을 쓴다).
   - `.print-root`는 `#root` 바깥(body 직속)에 붙인다.
4. ExportPanel: '내보내기 설정'에 `<select aria-label="용지">`(A4 세로·A4 가로·Letter 세로, 기본 A4 세로). 버튼 라벨을 '📄 PDF 저장 (인쇄)' → '🖨️ 인쇄 / PDF로 저장'으로, 아래에 안내 한 줄 "인쇄 창에서 대상을 'PDF로 저장'으로 고르면 PDF 파일이 됩니다."
   헤더·메뉴의 'PDF' 버튼 title도 '인쇄 / PDF로 저장'으로 맞춘다. 버튼의 보이는 글자 'PDF'는 유지한다(기존 스펙 선택자).
5. 26-output에 추가:
   - 'print root paginates a long score': f18 업로드 → `page.evaluate`로 `window.print=()=>{window.__printed=document.querySelectorAll('.print-root .print-page').length}` 스텁 → PDF 버튼 → `__printed`가 3 이상, 인쇄 뒤 `.print-root` 0개.
   - 'pdf page count equals print pages and ignores window size': 스텁 대신 print를 `()=>{window.__hold=true}`로 두어 `.print-root`를 남기는 테스트 전용 훅(`window.__mxlKeepPrintRoot=true`이면 정리를 건너뜀)을 쓰고 `page.pdf({preferCSSPageSize:true})` → 쪽수(바이트에서 `/Type /Page` 개수, `/Pages` 제외)가 `.print-page` 수와 같고, 뷰포트 1440과 1000에서 같다. (headless Chromium 전용. 다른 프로젝트에서는 skip)
   - 'landscape changes the page box': 용지 A4 가로 → `#mxl-print-page` 텍스트에 'landscape'.
6. `tests/e2e/13-zoom-print.spec.js`의 인쇄 관련 기대(beforeprint 재렌더)를 새 동작으로 바꾼다.
7. 설명서·퀵스타트의 PDF 절을 새 흐름(용지 선택 → 인쇄 창 → PDF로 저장)으로 고친다.
8. `npm test`, 26-output, 13-zoom-print, 스모크, 모바일 @ux. 커밋 "PDF 출력을 쪽 나눔 인쇄 영역으로 변경".
````

**완료 기준**
- [ ] 64마디 악보가 3쪽 이상으로 나뉘고 어느 쪽에서도 보표가 잘리지 않는다 (쪽마다 `.print-page` 1개, E2E 단언 + PDF 이미지 육안 확인을 context-notes에 기록)
- [ ] PDF 쪽수가 창 크기·패널 열림 여부와 무관하다 (E2E 단언)
- [ ] 인쇄 뒤 `.print-root`와 `#mxl-print-page`가 남지 않는다

---

### B-6 · 뷰어 렌더 횟수와 긴 악보 응답성

**근거** P1, P2. 악보를 열 때마다 렌더가 두 번 돕니다(400마디 2파트에서 5.5초 + 5.3초).

````text
[B-6] 이중 렌더 제거와 진행 표시

1. ScoreView(문자열 'autoResize:true'로 grep)의 OSMD 옵션을 `autoResize:false`로 바꾼다.
2. 같은 컴포넌트에 폭 감시를 추가한다:
   - `lastWidthRef`에 렌더 직후의 `scoreRenderRef.current.clientWidth`를 기록.
   - `useEffect`에서 `new ResizeObserver(entries=>{…})`로 `scoreRenderRef.current`를 관찰. 새 폭과 `lastWidthRef`의 차가 4px 미만이면 무시, 아니면 250ms 디바운스 뒤 `redraw(zoomRef.current)`. 정리 함수에서 `disconnect()`와 타이머 해제.
   - `ResizeObserver`가 없는 브라우저 폴백: `window.addEventListener('resize', 같은 디바운스)`.
   - 재생 중(`isPlaying`)에는 재렌더를 미루고 정지 시 한 번 실행한다(커서가 사라지는 것을 막는다).
3. `render()`를 부르는 ScoreView의 모든 곳에 `window.__mxlRenderCount=(window.__mxlRenderCount||0)+1;`을 넣는다(테스트 훅. `__mxlGetState`를 등록하는 곳 근처 주석에 용도를 적는다).
4. 긴 악보 진행 표시: `redraw`와 첫 렌더에서 음표 수(`file.xmlDoc.getElementsByTagName('note').length`)가 2,000 이상이면
   `showProgress('악보를 그리는 중...')` → `await new Promise(r=>requestAnimationFrame(()=>setTimeout(r,0)))` → `render()` → `hideProgress()`.
   ScoreView는 지금 showProgress를 받지 않으므로 App에서 props로 넘긴다. `redraw`가 async가 되므로 호출처(확대 effect, fitZoom, ResizeObserver)에서 반환 Promise의 오류를 `setRenderError`로 처리한다.
   확대 버튼을 빠르게 여러 번 누르면 마지막 값만 렌더한다(세대 번호 ref로 이전 요청 취소).
5. 새 스펙을 27-phase-b-regressions에 추가:
   - 'one render per load': f18 업로드 → 1.5초 대기 → `__mxlRenderCount===1`.
   - 'one render per zoom step': 확대 1회 → 2.
   - 'resize triggers one debounced render': 뷰포트 폭을 1440→1200→1100으로 100ms 간격 변경 → 1초 뒤 증가분이 정확히 1.
   - 'panel toggle re-renders once': Ctrl+B로 왼쪽 패널 닫기 → 증가분 1, SVG 폭이 넓어짐.
6. `tests/e2e/11-layout.spec.js`, `18-cursor.spec.js`, `visual/score.spec.js`가 autoResize에 기대던 타이밍이 있으면 `expect.poll`로 바꾼다.
7. 수동 측정: `f18`과 400마디 2파트 생성 악보(테스트에 넣지 않는다)로 불러오기 시간을 재고 전후 수치를 context-notes에 적는다. 기준선은 이 문서 1.1의 P1 값.
8. `npm test`, 27, 11, 18, 스모크, 모바일 @ux. 커밋 "뷰어 이중 렌더 제거와 긴 악보 진행 표시".
````

**완료 기준**
- [ ] 불러오기 1회·확대 1회당 렌더가 1번이다 (E2E 단언)
- [ ] 창 크기 변경·패널 여닫기 뒤 악보 폭이 맞게 다시 그려진다 (E2E 단언)
- [ ] 재생 커서·마디 하이라이트 스펙(17·18)이 그대로 통과한다

---

### B-7 · 재생: 타악기 안내, D.C./D.S./Fine/Coda 점프

**근거** R1, R2. A2에서 경고만 붙였던 이동 기호를 한 번 점프 규칙(E11)으로 구현합니다.

````text
[B-7] 재생 순서 확장

1. 픽스처 `f20-dc-al-fine.musicxml`, `f21-ds-al-coda.musicxml`(설계 2.7) 추가·스키마 검증.
2. `playback-core.js`:
   - `collectNavigation(measures)` → 마디 인덱스별 `{dacapo,dalsegno,segno,fine,tocoda,coda,alFine,alCoda}`. 글자 표기(`NAVIGATION_WORDS`)와 `sound` 속성, `<segno>`·`<coda>` 요소를 함께 본다.
   - `expandMeasureOrder`에 설계 2.5의 규칙 1~5를 구현한다. 반복 전개 본체는 `expandRepeatsOnly(measures,{from,to,lastPassOnly})` 내부 함수로 빼서 점프 전(전체 반복)과 점프 후(마지막 괄호만)에 재사용한다.
   - 반환값은 지금처럼 인덱스 배열. 점프 적용 여부는 `expandMeasureOrder.lastJump` 같은 전역 상태가 아니라 두 번째 반환 형태 `expandMeasureOrderDetailed(…)→{order,applied:[label…],unsupported:[label…]}`를 새로 export 하고, 기존 함수는 `.order`만 돌려주게 한다.
   - `extractPlaybackData`: `applied`에 든 표식은 `navigationMarks`·`warnings`에서 뺀다. `unpitchedParts`·`mutedParts`를 설계 2.4대로 추가.
   - 무한 루프 방지: 전체 순서 길이 상한 20,000(기존 steps 상한과 같은 값)을 점프 뒤에도 적용.
   쿼리 `playback-core.js?v=3`. CRLF 유지.
3. 단위 테스트(`tests/unit/playback-core.test.js`) 추가 8건:
   f20 → [1,2,3,4,1,2] / f21 → [1,2,3,4,2,3,5,6] / D.C.만 있고 Fine 없음 → 처음부터 끝까지 한 번 더 / D.S.인데 segno 없음 → 점프 없음·unsupported에 표기 /
   점프 표식 2개 → 점프 없음 / 반복+D.C.: 점프 뒤 반복 안 함 / 기존 f17(D.C. 경고 픽스처)의 기대값 갱신 / unpitched 파트 → mutedParts 1개·events 0개.
4. MidiPlayer(문자열 '재생 미반영'으로 grep): 경고 줄이 `navigationMarks`와 `mutedParts`를 함께 보여주게 한다.
   `⚠ 재생 미반영: D.S. · 타악기 Drums` 형태. 둘 다 없으면 줄을 그리지 않는다. `visually-hidden` 전체 문장과 title도 같이 갱신.
5. E2E:
   - `17-playback.spec.js`에 'D.C. al Fine plays 6 measures': f20 → `PlaybackCore.extractPlaybackData(doc).measureTimeline.map(m=>m.measure)`가 [1,2,3,4,1,2], 경고 줄 없음.
   - f17은 `Fine` + `D.C. al Fine`(지원 조합)이다. `24-audit-regressions.spec.js`의 C16 테스트는 '경고 없음 + 마디 순서에 점프 반영'으로 기대값을 바꾸고, 경고 표시 자체의 회귀는 지원하지 않는 조합(테스트 안에서 segno 없는 D.S. 문서를 문자열로 생성)으로 옮긴다. 바꾼 기대값을 context-notes에 적는다.
   - 27에 'unpitched part is reported as muted': f19 → 경고 줄에 '타악기' 포함.
   - a11y `axe.spec.js`의 'navigation-warning' 장면이 여전히 경고를 띄우는 픽스처를 쓰는지 확인하고, 아니면 f19로 바꾼다.
6. 설명서 재생 절: 지원하는 이동 기호 4종과 한계(중첩 점프·타악기 무음)를 적는다.
7. `npm test`, 17, 18, 24, 27, a11y, 스모크. 커밋 "D.C.·D.S. 점프 재생과 타악기 무음 안내".
````

**완료 기준**
- [ ] f20·f21의 재생 마디 순서가 기대와 같다 (단위 + E2E)
- [ ] 지원하지 않는 조합은 점프하지 않고 경고가 남는다 (단위)
- [ ] 반복·볼타 기존 테스트가 그대로 통과한다

---

### B-8 · 악보 표기 변환 기준선(N8)

**근거** N8. A2에서 남은 문제로 기록한 항목입니다.

````text
[B-8] NotationPanel 원본 백업을 파일 객체로

1. NotationPanel(문자열 'baselineRef'로 grep)의 `baselineRef`를 없애고 A2-3의 숫자 악보와 같은 방식으로 바꾼다:
   - 변환 실행 시 파일에 `notationBackup`이 없으면 `commitFile(file,doc,{notationBackup:{xml:file.xmlString}})`으로 **변환 직전 XML**을 담는다. 이미 있으면 그대로 물려준다(`commitFile`이 extra를 병합하는지 확인하고, 아니면 `{...file.notationBackup&&{notationBackup:file.notationBackup}}`를 명시).
   - 다시 적용할 때는 `file.notationBackup?.xml`을 파싱한 문서에서 출발한다(모드를 바꿔 적용해도 겹치지 않게).
   - '원본 복원'은 백업 XML로 되돌리고 `notationBackup`을 지운다. 백업이 없는 파일은 `ℹ 복원할 원본이 없습니다.` 로그.
   - **다른 패널이 그 파일을 커밋하면 `notationBackup`을 지운다.** `commitFile`(209행)은 `{...file,...extra}`로 파일 필드를 그대로 물려주므로 지금은 백업이 계속 남는다. `commitFile` 안에 `if(!extra||!('notationBackup' in extra))delete committed.notationBackup;` 한 줄을 넣어, extra에 키가 **없으면** 필드를 빼게 한다(표기 변환 패널만 키를 넘긴다). `lyricBackup`의 기존 동작은 바꾸지 않는다.
   - 패널에 백업 상태 안내: 백업이 있으면 "표기 변환 전 원본을 보관 중입니다. 다른 도구로 악보를 바꾸면 보관본은 사라집니다."
2. `HistoryCore.pushHistoryEntry`의 스냅샷에 `notationBackup:file.notationBackup`을 참조로 추가한다(`lyricBackup` 옆). 세션 저장·공유 직렬화에는 넣지 않는다. 쿼리 `history-core.js?v=3`, 단위 테스트 1건(실행 취소 뒤 백업 유지).
3. `tests/e2e/panels/11-notation.spec.js`에 추가:
   - 'restore returns to the pre-conversion score': 변환 → 원본 복원 → xmlString이 업로드 직후와 같다.
   - 'switching modes does not stack': 모드 A 적용 → 모드 B 적용 → 결과가 원본에 B만 적용한 것과 같다.
   - 'another panel clears the backup': 변환 → 조옮김 +2 → 표기 패널 '원본 복원' → 로그 '복원할 원본이 없습니다', 악보는 조옮김 상태 유지.
   - 25-schema의 표기 변환 행이 계속 통과하는지 확인.
4. `grep -n "baselineRef" mxl-studio.html`이 0건인지 확인. `npm test`, 11-notation, 21-history, 25-schema. 커밋 "악보 표기 변환 원본 백업을 파일 객체로 이동".
````

**완료 기준**
- [ ] `baselineRef`가 HTML에 없다
- [ ] 변환 → 복원이 원본과 바이트 단위로 같다 (E2E 단언)
- [ ] 다른 패널 커밋 뒤에는 백업이 사라지고 안내가 나온다 (E2E 단언)

---

### B-9 · 회귀 매트릭스·문서 동기화·PR

````text
[B-9] 회귀 확인과 문서 동기화

1. 확인 grep을 실행하고 결과를 보고하라:
   `grep -n "data-roman-analysis\|baselineRef\|autoResize:true\|'beforeprint',before\|osmd-batch-" mxl-studio.html` → 0건.
   `grep -n "#[0-9a-f]\{6\}'" mxl-studio.html` 중 악보 XML에 쓰이는 값 0건(CSS·캔버스 배경용은 제외하고 무엇이 남았는지 적는다).
2. 전체 검증: `npm test`, `npx playwright test --project=chromium`, `npx playwright test --project=mobile --grep @ux`. 통과·제외 수를 기록한다. 제외는 Phase A2와 같은 4개(시각 3·모바일 너비 1)에 PDF 쪽수 테스트의 비-Chromium skip만 더해질 수 있다.
3. 1.1 표의 모든 ID(V1~V5, O1~O4, P1·P2, R1·R2, N8, U1)에 대응하는 테스트가 있는지 대응표를 만든다. 빠진 것은 채운다.
4. 문서:
   - README: 검증 현황 표에 Phase B 행, 코어 12개(export-core.js), 픽스처 21개, 설계 문서 목록에 이 문서.
   - README-TESTING: f18~f21, 스펙 25·26·27, `tests/schema/` 설명과 xmllint 폴백.
   - docs/verification-report.md: 'Phase B 재검증' 절(환경, 수치, PNG·PDF 전후 비교 수치, 렌더 횟수 전후).
   - 설명서·퀵스타트: 이미지 내보내기(폭 선택), 인쇄/PDF(용지 선택), 재생(이동 기호), 표기 변환(보관본) 절 갱신, 표지 날짜 변경, `npm run docs:build`.
   - context-notes.md `## Phase B 요약`: ID ↔ 세션 ↔ 테스트 대응표, 기본값 E1~E12, 바뀐 기대값, 남은 문제(4.4절 중 실제로 남은 것).
   - checklist.md: `- [x] B-9 · …`와 4.3절 종료 체크리스트.
   - CLAUDE.md '데이터 규칙'에 한 줄 추가: "악보 XML에는 MusicXML 4.0 스키마에 있는 요소·속성만 쓰고, 새 변환은 `tests/e2e/25-schema.spec.js`에 등록합니다."
5. 브랜치를 푸시하고 PR을 연다. 제목 "Phase B: MusicXML 유효성·출력 통일·렌더 성능". 본문에 1.1 표의 ID별 결과와 E1~E12, 전후 수치를 적는다. CI 통과를 확인하고 **병합하지 않은 채** 사용자에게 보고한다. 커밋 "Phase B 회귀 확인과 문서 동기화".
````

**완료 기준**
- [ ] 단위·E2E 전체 통과, 1.1의 모든 ID에 테스트 대응
- [ ] 문서 6종 동기화, PDF·SVG 설명서 재생성
- [ ] PR 열림, CI 통과, 병합 전 보고

---

## 4. 실행 로드맵과 함정

### 4.1 순서와 의존성

```
B-1 (문서·스키마 스펙·V1·V2)   ← 반드시 첫 번째. 이후 세션은 25-schema를 계속 통과해야 한다
B-2 (범위 가드·타악기·TAB)     ← B-1의 export-core 전제
B-3 (업로드 안내)              ← 독립
B-4 (이미지 통일) → B-5 (PDF: B-4의 renderForExport 전제)
B-6 (렌더 횟수)                ← B-5 뒤(beforeprint 핸들러를 B-5가 지운다)
B-7 (재생), B-8 (표기 기준선)  ← 독립. 순서 바꿔도 된다
B-9 (회귀·문서·PR)
```

### 4.2 알려진 함정

| 함정 | 대처 |
|---|---|
| `xs:ID`는 문서 전체에서 고유해야 한다 | 로마 숫자 id는 삽입 전에 기존 id 집합을 모아 겹치지 않는 번호를 쓴다. 파트 추출·Ossia처럼 문서를 복제해 일부만 남기는 변환은 문제없지만, 두 문서를 합치는 기능을 새로 만들면 다시 번호를 매긴다 |
| xs:ID는 숫자로 시작할 수 없다 | 접두 `mxl-roman-`으로 시작하므로 안전. 접두를 바꾸지 않는다 |
| `<input type="color">`는 항상 소문자를 준다 | state는 그대로 두고 XML에 쓰는 순간에만 `normalizeColor`. 화면 표시용 값까지 바꾸면 input의 value 비교가 어긋난다 |
| `stackSvgMarkup`이 화면 크기를 읽는다 | B-4의 핵심. 미리보기에서 CSS로 축소해도 내보내기 크기는 SVG 속성에서 읽어야 한다. 속성이 `100%` 같은 값이면 viewBox로 폴백 |
| 화면 밖 컨테이너를 `display:none`으로 숨기면 OSMD 폭이 0이 된다 | `position:fixed;left:-20000px`로 숨긴다. `visibility:hidden`도 글자 폭 측정은 되지만 일관성을 위해 쓰지 않는다 |
| `setPageFormat` 뒤 같은 OSMD 인스턴스를 끝없는 형식으로 다시 쓰면 설정이 남는다 | 내보내기마다 새 인스턴스(지금 `renderScoreSvgs` 구조 그대로). 뷰어 인스턴스에는 `setPageFormat`을 부르지 않는다 |
| `setPageFormat`에 모르는 이름을 주면 오류 없이 끝없는 형식(쪽 1개)으로 렌더된다 | 확인한 이름은 `A4_P`·`A4_L`·`Letter_P`. `PAGE_FORMATS`의 값만 쓰고, 렌더 뒤 쪽 SVG의 viewBox 높이가 용지 비율과 맞는지 26-output에서 단언한다 |
| 인쇄 영역을 `#root` 안에 두면 `#root{display:none}`에 같이 숨는다 | `.print-root`는 body 직속 |
| `window.print()`는 Chrome에서 동기 차단, Safari에서는 비동기 | 정리는 `afterprint`(once)와 60초 타임아웃 중 먼저 오는 쪽에서 한다. `finally`에서 바로 지우면 Safari에서 빈 종이가 나온다 |
| `autoResize:false` 뒤 모바일 서랍·패널 여닫기에서 폭이 안 맞는다 | ResizeObserver가 `scoreRenderRef` 자체를 본다. 서랍은 악보 폭을 바꾸지 않으므로 렌더가 일어나지 않는 것이 정상 |
| 재렌더가 재생 커서를 지운다 | B-6 2번: 재생 중에는 미루고 정지 시 실행. `onOsmdReady(null)`→`(osmd)` 순서를 유지 |
| D.C. 구현으로 f17·C16 기대가 바뀐다 | 의도된 변경. 24 스펙과 axe 장면을 B-7 5번대로 고치고 context-notes에 적는다 |
| `commitFile` extra 병합 방식에 따라 `lyricBackup`까지 지워질 수 있다 | B-8은 `notationBackup` 키만 "없으면 제거" 규칙을 적용한다. 16-numbering의 가사 복원 스펙으로 회귀 확인 |
| CI에 xmllint가 없다 | B-1에서 `libxml2-utils` 설치 단계를 넣는다. post-deploy 스모크는 @smoke만 돌리므로 영향 없다 |
| PNG가 캔버스 한계를 넘는다 | 폭 1400 × 배율 4 = 5,600px는 안전하지만 높이는 악보 길이에 비례한다. `pngPixelSize.tooLarge`로 미리 막는다 |

### 4.3 Phase B 종료 체크리스트

- [ ] 25-schema: 모든 패널 출력이 MusicXML 4.0 XSD를 통과한다
- [ ] 같은 파일의 PNG 3경로 크기가 같고 창 크기와 무관하다. PDF 쪽수도 창 크기와 무관하다
- [ ] 불러오기·확대 1회당 렌더 1번
- [ ] HTML에 `data-roman-analysis`·`baselineRef`·`autoResize:true`가 없다
- [ ] 기본값 E1~E12가 코드·설명서·context-notes에서 서로 같다
- [ ] 문서 동기화, PR 열림, CI 통과, 병합 전 보고

### 4.4 Phase B 이후로 미루는 것

| 항목 | 이유 | 등급 |
|---|---|---|
| Ossia를 MusicXML에 포함 | 표준 요소가 없어 별도 파트·cue 중 설계 결정 필요 | A2에서 이월 |
| 진짜 PDF 파일 생성(인쇄 창 없이 바로 저장), 한글 글꼴 임베드 | PDF 라이브러리 추가와 글꼴 용량 결정 필요. B-5는 인쇄 경로까지만 | 설계 필요 |
| TAB 줄·프렛 재계산, 타악기 음원 | 조율·드럼 맵 정보 필요 | V5·R1의 나머지 |
| 중첩 점프(D.S. 안의 D.C. 등), 반복 횟수 지정 볼타의 점프 후 처리 | E11의 한계 | R2의 나머지 |
| 400마디 이상 악보의 렌더 자체 시간(1회 약 5초) | OSMD 단일 SVG 구조의 한계. 쪽 단위 지연 렌더는 별도 설계 | P2의 나머지 |
| Babel Standalone 시작 시간(앱 표시까지 약 2.2~2.6초 중 1.8초 롱태스크) | 빌드 시스템 금지 계약(CLAUDE.md 1항)과 충돌. 사전 변환본을 저장소에 두는 방식은 사용자 결정 필요 | 재현, 결정 필요 |
| 모바일 실기기·Safari·Firefox에서의 인쇄·PNG | 이 환경에서 확인 불가 | 미확인 |
| 악보 클라우드 연동(저장·불러오기 버튼) | 배포본 소스에 네트워크 호출이 없다(`fetch` 0건). 프로젝트 설명의 클라우드 흐름은 아직 이 앱에 없음 | 소스 확인, 별도 기획 |
