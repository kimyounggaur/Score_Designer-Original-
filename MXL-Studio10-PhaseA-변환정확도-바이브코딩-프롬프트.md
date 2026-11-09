# MXL Studio10 · Phase A 변환 정확도 바이브코딩 프롬프트

작성일 2026-11-09. (A-1 실행 중 테스트 기대값 2건 정정: keySignatureAlter의 B, keyInterval 인자)
대상 스냅샷 `kimyounggaur/Score_Designer-Original-` main **429945a** (2026-09-03, mxl-studio.html 4,675줄 / styles.css 2,412줄 / 코어 8개 / 패널 21개).
목적은 **결과 악보가 틀리게 나오는 변환 버그를 한 번에 제거**하는 것입니다. 근거는 2026-11-09 심층 분석 문서("악보 디자이너(MXL Studio09) 심층 분석 — 수정·보완 과제")의 P0-1~P0-5, P0-7~P0-9, P1-11, P1-12, P2-4 항목이며, 모두 헤드리스 Chrome으로 재현한 실측값을 적었습니다.

---

## 0. 이 문서를 읽기 전에

### 0.1 확정된 결정 사항 (2026-11-09, 김영걸)

| 결정 | 내용 | 이 문서에 반영된 방식 |
|---|---|---|
| all12 모드 | **존치** | A-9에서 로그만 12개 찍던 모드를 "소스 파일마다 .mxl 12개를 ZIP으로 실제 산출"하도록 고친다. 열린 악보는 바꾸지 않는다 |
| 변환 기본 범위 | **열린 파일 전체** 유지 | A-8에서 기본값 '전체'인 적용 대상 토글(전체 / 현재 파일만)을 추가하고, 로그·히스토리 라벨에 대상 파일을 명시한다. 기존 E2E(전체 적용 전제)는 그대로 통과해야 한다 |

### 0.2 기존 프롬프트 문서와의 관계

| 문서 | 상태 |
|---|---|
| `MXL-Studio09-개선보완-바이브코딩-프롬프트(Fable51).md` | Phase 0~8 완료. **2장 공통 계약은 그대로 유효**하며 이 문서의 1.3절 추가 규칙을 덧붙여 쓴다 |
| `MXL Studio—기능 추가 바이브코딩 프롬프트집.md` | 이전 설계 기록. 참고만 |
| `MXL-Studio-기능확장-자동테스트-바이브코딩-프롬프트.md` | 다른 스냅샷용. 실행 금지 |

이 문서의 줄 번호는 429945a 기준입니다. 편집이 진행되면 어긋나므로 각 프롬프트는 반드시 함수명·문자열로 다시 grep 하도록 지시합니다.

### 0.3 사용 방법

1. 세션 시작 시 Studio09 문서의 **2.1 공통 계약**을 붙여넣고, 이어서 이 문서의 **1.3 추가 규칙**을 붙여넣는다.
2. 3장의 프롬프트 A-1 → A-10을 **한 세션에 하나씩** 순서대로 실행한다. A-1(코어 신설)이 끝나기 전에는 A-2 이후를 시작하지 않는다.
3. 완료 기준 체크박스가 모두 채워지기 전에는 다음 프롬프트로 넘어가지 않는다.
4. 각 세션 종료 시 `checklist.md`에 `- [x] A-n · 제목 (완료 기준 N개)` 줄을, `context-notes.md`에 `## 2026-MM-DD · A-n` 절을 추가한다.

### 0.4 검증 명령

| 명령 | 용도 |
|---|---|
| `npm test` | 단위 테스트 (Vitest, threads 풀) |
| `npm run e2e:smoke` | 시작·업로드·조옮김·공유 스모크 |
| `npx playwright test --grep @panels` | 21패널 매트릭스. 이 Phase에서 가장 많이 바뀌는 영역 |
| `npx playwright test tests/e2e/panels/0{2,3,4,9}-*.spec.js tests/e2e/panels/1{4,5}-*.spec.js tests/e2e/panels/08-*.spec.js` | 이 Phase가 건드리는 패널만 빠르게 |

---

## 1. 근거 요약

### 1.1 실측 재현 결과 (2026-11-09, 헤드리스 Chrome, 픽스처 f01~f09 + 합성 MusicXML)

| ID | 재현 | 기대 | 위치 |
|---|---|---|---|
| P0-1 | f09를 보면서 반음 +1 조옮김 6회 → 뒤에 열린 f06의 xmlString 3,875→3,806B로 함께 변경 | 대상이 어디까지인지 화면과 로그에 보여야 함 | 모든 패널 `for(const file of files)` |
| P0-2 | f02에 카포 1마디 2프렛 + 3마디 4프렛 → 3마디 이후 음표 −6반음(기대 −4), 조표는 −4로 기록되어 음표·조표 불일치. 슬래시 코드 베이스 미이조 | 구간별 원본 대비 −fret, 조표 일치, bass 포함 | `CapoPanel` 1196~1248 |
| P0-3 | f07(F♯장조) 칼림바 음역대 적용 → 범위 안 음까지 G♯→A♭, D♯→E♭, E♯→F, B♯→C | 옥타브만 바뀌고 철자 유지 | `RangePanel` 699~705, `ClefPanel` 3137~3143 |
| P0-4 | f07 F♯→E장조 조바꿈 → +10반음 상승, A♭·E♭·B♭ 표기. 조옮김 '특정 조'도 항상 상행 | 최단 거리(−2) 기본, 방향 선택, E장조 철자(G♯·D♯) | `KeyChangePanel` 1013~1051, `TransposePanel` 600 |
| P0-5 | f01 all12 → files 1개, fifths 0, 로그는 "→ B♭ … → B … 적용 완료" | 12개 결과물 산출 | `TransposePanel` 575~583 |
| P0-7 | 코드 자리바꿈 E → E/A♭, B7 → B7/E♭ | E/G♯, B7/D♯ | `ChordToolsPanel` 2362, 2448~2449 |
| P0-8 | f07 화성 쌓기(3도 위) → A♯→B♭, D♯→E♭, E♯→F, G♯→A♭ 표기; 추가 8음 모두 voice·staff·time-modification 없음 | 조성 철자, 원음 속성 복사 | `HarmonyPanel` 2291~2303 |
| P0-9 | 3마디에서 3♯·F음자리표로 바뀌는 합성 악보의 4마디 Ossia → fifths 0, clef G | 시작 마디의 유효 attributes | `OssiaPanel` 1612~1672 |
| P1-11 | 조바꿈은 `measure[number]`, 카포·마디별 템포는 `measures[n-1]` 인덱스 → 못갖춘마디 악보에서 '1마디'가 서로 다른 마디 | number 속성으로 통일 | `CapoPanel` 1199, `TempoChangePanel` 1431 |
| P1-12 | f02 베이스 음자리표 변환 → P1·P2 모두 F4, 2단 보표는 첫 clef만 | 파트·보표 선택 | `ClefPanel` 3147~3159 |
| P2-4 | STEP_TO_SEMI/STEP_SEMI/PITCH, SEMI_TO_STEP/PC_STEP_ALTER, KEY_FIFTHS×3, DIATONIC_SCALES×2 중복, MIDI 기반 `transposeNote`(263) 잔존 | 코어 단일화 | mxl-studio.html 70~82, 263, 2361~2362 |

### 1.2 왜 한 번에 고치는가

P0-2·3·4·7·8·9는 모두 "음높이를 MIDI 번호로 바꿨다가 `SEMI_TO_STEP` 고정 철자로 되돌리는" `transposeNote`/`midiToNote` 패턴에서 나옵니다. Phase 5에서 만든 `transpose-core.js`는 이미 조성 기반 철자를 내므로, 패널들이 그 코어(와 이번에 신설하는 `pitch-core.js`)만 쓰도록 바꾸면 여섯 버그가 함께 사라지고 재발하지 않습니다.

### 1.3 공통 계약 추가 규칙 (세션 시작 시 2.1 뒤에 붙여넣기)

````text
[Phase A 추가 규칙 — Studio09 공통 계약 뒤에 적용]

F. 음높이 규칙
  1. 음표의 step·alter·octave를 쓰는 모든 코드는 `PitchCore` 또는 `TransposeCore` 함수만 사용한다. mxl-studio.html 안의 `transposeNote`, `midiToNote`→`setNotePitch` 조합, `SEMI_TO_STEP`/`PC_STEP_ALTER`로 음표를 다시 쓰는 코드를 새로 만들지 않는다. 해당 세션에서 교체 대상으로 지정된 기존 호출은 제거한다.
  2. 옥타브만 바뀌는 변환(음역대·음자리표)은 `<octave>`만 바꾼다. `<step>`·`<alter>`·`<accidental>`은 건드리지 않는다.
  3. 조옮김 방향은 사용자가 고르지 않았으면 최단 거리(−5~+6반음)다. 항상 상행하는 `(target-current+12)%12` 식을 새로 쓰지 않는다.
  4. 마디는 `measure[number]` 속성으로 찾는다. 인덱스 `measures[n-1]`로 마디를 가리키는 코드를 새로 쓰지 않는다(`MeasureCore.measuresByNumber` 사용).

G. 테스트 규칙
  1. 변환 결과를 검증하는 테스트는 MIDI 번호나 "완료" 문구가 아니라 **step·alter·octave 세 값**을 단언한다. 픽스처는 f07(F♯장조 E♯·B♯ 포함)·f04(A단조)·f03(못갖춘마디)을 우선 쓴다.
  2. 코어 함수를 추가하면 같은 세션에 `tests/unit/<이름>.test.js`를 추가하고, 패널 동작을 바꾸면 `tests/e2e/panels/<번호>-<id>.spec.js`의 expect를 철자 단언으로 바꾼다.
  3. 기존 테스트의 기대값이 "버그를 전제"하고 있었다면(예: 항상 상행) 기대값을 고치고 그 사실을 context-notes.md에 적는다.

H. 범위 규칙
  1. 변환 기본 범위는 '열린 파일 전체'다(사용자 확정). A-8 이후에는 `targetFiles(files, activeFile, scope)` 헬퍼로 대상을 정하고, 직접 `for(const file of files)`를 쓰지 않는다.
  2. all12 모드는 유지한다(사용자 확정). 열린 악보를 바꾸지 않고 ZIP으로 산출한다.
````

---

## 2. 새 코어 설계 (A-1에서 구현)

### 2.1 `pitch-core.js` → `window.PitchCore`

| 함수 | 시그니처 | 규칙 |
|---|---|---|
| `pitchToMidi` | `({step,alter=0,octave}) → number` | `(octave+1)*12 + STEP_TO_SEMI[step] + alter` |
| `addInterval` | `(pitch, diatonicSteps, semitones) → pitch` | 문자를 `diatonicSteps`만큼 옮기고(옥타브 넘김 처리) alter를 `semitones`에 맞게 계산. alter 절댓값이 2를 넘으면 `TransposeCore.transposePitch`와 같은 규칙으로 이명동음 단순화 |
| `shiftOctave` | `(pitch, octaves) → pitch` | step·alter 유지, octave만 가감 |
| `shiftNoteOctave` | `(noteEl, octaves) → boolean` | `<pitch>`가 있으면 `<octave>` 텍스트만 갱신. `<accidental>` 불변. 반환은 변경 여부 |
| `nearestShift` | `(fromPc, toPc, direction='nearest') → number` | `diff=((toPc-fromPc)%12+12)%12`. nearest: `diff>6 ? diff-12 : diff`(결과 −5~+6), up: `diff`(0~11), down: `diff===0 ? 0 : diff-12` |
| `keySignatureAlter` | `(fifths, step) → -1, 0 또는 1` | 조표에서 그 문자가 갖는 변화표. ♯ 순서 F C G D A E B, ♭ 순서 B E A D G C F |
| `accidentalName` | `(alter) → 'flat-flat' / 'flat' / 'natural' / 'sharp' / 'double-sharp'` | alter −2~+2를 MusicXML accidental 이름으로 |
| `syncAccidental` | `(noteEl, fifths) → void` | `alter !== keySignatureAlter(fifths, step)`이면 `<accidental>`을 `accidentalName(alter)`로 추가·갱신하고, 같으면 제거. 삽입 위치는 `<pitch>`…`<type>`·`<dot>`·`<time-modification>` 뒤, `<stem>`·`<notehead>`·`<staff>`·`<beam>`·`<notations>`·`<lyric>` 앞(MusicXML 순서) |
| `diatonicThird` | `(pitch, fifths, direction='above' 또는 'below') → pitch` | 문자 ±2, 새 문자의 alter는 `keySignatureAlter(fifths, 새 문자)`. 옥타브는 문자 넘김에 따라 조정 |
| `chromaticThird` | `(pitch, direction) → pitch` | `addInterval(pitch, ±2, ±4)` (항상 장3도) |
| `CHORD_TONES` | `kind → [[diatonicSteps, semitones], …]` | major `[[0,0],[2,4],[4,7]]`, minor `[[0,0],[2,3],[4,7]]`, augmented `[[0,0],[2,4],[4,8]]`, diminished `[[0,0],[2,3],[4,6]]`, dominant `+[6,10]`, major-seventh `+[6,11]`, minor-seventh minor`+[6,10]`, diminished-seventh dim`+[6,9]`, half-diminished dim`+[6,10]`, augmented-seventh aug`+[6,10]`, major-minor minor`+[6,11]`, major-sixth major`+[5,9]`, minor-sixth minor`+[5,9]`, suspended-fourth `[[0,0],[3,5],[4,7]]`, suspended-second `[[0,0],[1,2],[4,7]]`, dominant-ninth dominant`+[8,14]`, major-ninth M7`+[8,14]`, minor-ninth m7`+[8,14]`, dominant-11th dom9`+[10,17]`, major-11th`+[10,17]`, minor-11th`+[10,17]`, dominant-13th dom11`+[12,21]`, major-13th`+[12,21]`, minor-13th`+[12,21]`, power `[[0,0],[4,7]]`. 그 외 kind는 major로 폴백 |
| `bassForInversion` | `({step,alter}, kind, inversion) → {step,alter} 또는 null` | `CHORD_TONES[kind][inversion]`이 없으면 null. 있으면 `addInterval(root, steps, semis)`의 step·alter(옥타브 무시). 예: E major 1 → G♯, B dominant 1 → D♯, C major-seventh 3 → B |

### 2.2 `measure-core.js` → `window.MeasureCore`

| 함수 | 시그니처 | 규칙 |
|---|---|---|
| `measuresByNumber` | `(partEl) → {map: Map<number, Element>, duplicates: Element[]}` | `number` 속성이 숫자인 마디만 map에 넣는다. 중복 번호는 첫 것을 유지하고 나머지는 `duplicates`에 담는다 |
| `measureNumbers` | `(xmlDoc) → number[]` | 첫 `<part>` 기준 오름차순 |
| `keyFifthsAt` | `(partEl, measureNumber) → number` | 그 마디까지(포함) 마지막 `<attributes>/<key>/<fifths>`. 없으면 0 |
| `modeAt` | `(partEl, measureNumber) → 'major' 또는 'minor'` | 같은 방식으로 `<mode>`. 없으면 major |
| `effectiveAttributes` | `(partEl, measureNumber) → Element` | 1마디부터 그 마디까지의 `<attributes>`를 순서대로 겹쳐 최신 `divisions`·`key`·`time`·`clef`(모든 `number`)·`staves`·`staff-details`·`transpose`를 담은 **새** `<attributes>`(ownerDocument 기준 createElement) |
| `segments` | `(points, lastNumber) → [{from,to,value}]` | `points=[{measure,value}]`를 마디 오름차순 정렬, 같은 마디는 마지막 값, 각 구간은 다음 지점 전까지, 마지막은 `lastNumber`까지 |

### 2.3 `transpose-core.js` 변경 (A-1)

- 내부 함수 `keyInterval(fifths, targetFifths, semitones, mode)`과 `keyTonic(fifths, mode)`을 `global.TransposeCore`에 **추가로 export** 한다. 기존 export와 시그니처는 바꾸지 않는다.
- `transposeMeasureRange`는 그대로 쓴다(`options.interval`, `options.transposeKey`, `options.preferFlat` 지원 확인).

---

## 3. 단계별 프롬프트 (Phase A, 10세션)

### A-1 · pitch-core.js·measure-core.js 신설과 transpose-core export 보강

**근거** P2-4. 음높이 상수·유틸이 HTML과 코어 세 곳에 중복되고, 버그 P0-2·3·4·7·8·9가 모두 HTML의 MIDI 기반 `transposeNote`(mxl-studio.html:263)에서 비롯됩니다. 이 세션은 코어와 테스트만 만들고 패널은 건드리지 않습니다.

````text
[A-1] pitch-core.js · measure-core.js 신설, transpose-core export 보강

1. `pitch-core.js`를 만들어라. `(function(global){ 'use strict'; ... global.PitchCore={...}; })(window);` 패턴.
   구현 함수와 규칙은 설계 문서 2.1 표를 그대로 따른다:
   pitchToMidi, addInterval, shiftOctave, shiftNoteOctave, nearestShift, keySignatureAlter, accidentalName,
   syncAccidental, diatonicThird, chromaticThird, CHORD_TONES, bassForInversion.
   - addInterval의 이명동음 단순화는 transpose-core.js의 transposePitch와 같은 결과를 내야 한다. 중복 구현이 싫으면
     `global.TransposeCore?.transposePitch`가 있을 때 위임하고 없을 때 자체 계산하라. 단, pitch-core.js 자체는 transpose-core.js 없이도 로드되어야 한다.
   - syncAccidental의 삽입 순서는 MusicXML note 자식 순서(pitch/duration/tie/voice/type/dot/accidental/time-modification/stem/notehead/staff/beam/notations/lyric)를 지킨다.
     기존 `insertNoteheadInOrder`(mxl-studio.html:253)처럼 앵커 태그 목록으로 구현하라.
2. `measure-core.js`를 만들어라. 설계 문서 2.2 표의 measuresByNumber, measureNumbers, keyFifthsAt, modeAt, effectiveAttributes, segments.
   - effectiveAttributes는 `<clef number="2">`처럼 번호가 다른 clef를 각각 최신값으로 유지한다. number 없는 clef는 "1"로 취급한다.
3. `transpose-core.js`의 export 객체에 `keyInterval`, `keyTonic`을 추가하라. 다른 코드는 바꾸지 않는다.
4. mxl-studio.html `<head>`에 `<script src="pitch-core.js?v=1"></script>`와 `<script src="measure-core.js?v=1"></script>`를
   `transpose-core.js` 다음 줄에 추가하고, `missingLibraries` 검사 배열(mxl-studio.html:60)에 'PitchCore','MeasureCore'를 추가하라.
5. 단위 테스트 `tests/unit/pitch-core.test.js`:
   - addInterval: E#4 +(2,4) → G##4 (alter 2는 허용), B3 +(1,1) → C4, C4 +(6,10) → Bb4, E4 +(2,4) → G#4, B4 +(2,4) → D#5,
     Cbb4 +(0,-1) → |alter| 3이므로 단순화되어 A3 (transposePitch와 동일 결과).
   - shiftNoteOctave: `<pitch><step>E</step><alter>1</alter><octave>5</octave></pitch>` −1 → step E, alter 1, octave 4, accidental 불변.
   - nearestShift: (6→4,nearest)=−2, (0→11,nearest)=−1, (0→6,nearest)=+6, (0→11,up)=11, (0→1,down)=−11, (4→4,*)=0.
   - keySignatureAlter: fifths 6에서 F·C·G·D·A·E=1, B=0(F♯장조의 B는 제자리음); fifths −3에서 B=−1, E=−1, A=−1, D=0.
   - diatonicThird: fifths 6, F#4 above → A#4; fifths 6, E#5 above → G#5; fifths 5, D#5 above → F#5; fifths −3, G4 above → Bb4; fifths 0, C4 below → A3.
   - bassForInversion: (E,0,'major',1) → G#; (B,0,'dominant',1) → D#; (C,0,'major-seventh',3) → B; (A,-1,'minor',1) → Cb; (C,0,'major',3) → null.
6. 단위 테스트 `tests/unit/measure-core.test.js` (픽스처 f03-pickup, f02-two-parts, 합성 XML 사용):
   - measuresByNumber(f03 첫 파트)에 0이 포함되고 size가 5다.
   - keyFifthsAt: 1마디 fifths 0, 3마디에 `<key><fifths>3</fifths></key>`가 있는 합성 악보에서 (2)=0, (3)=3, (4)=3.
   - effectiveAttributes(합성 악보, 4) 에 fifths 3, clef sign F, divisions는 1마디 값이 들어 있다.
   - segments([{measure:3,value:'b'},{measure:1,value:'a'},{measure:3,value:'c'}], 8) → [{from:1,to:2,value:'a'},{from:3,to:8,value:'c'}].
7. 기존 `tests/unit/transpose-core.test.js`에 `keyInterval(0,1,7,'major')`(C→G장조, +7)가 `{diatonic:4,chromatic:7}`를 반환하는 케이스를 추가하라.
8. `npm test`와 `npm run e2e:smoke`를 실행하고 종료 보고 양식으로 보고하라. 커밋 메시지 "pitch-core·measure-core 신설과 transpose-core export 보강".
````

**완료 기준**
- [ ] `tests/unit/pitch-core.test.js` 6그룹, `tests/unit/measure-core.test.js` 4그룹 통과
- [ ] `window.PitchCore`, `window.MeasureCore`가 부팅 시 존재하고 `missingLibraries` 검사에 포함
- [ ] 기존 단위 84개·스모크 7개 통과 (패널 변경 없음)

---

### A-2 · 음역대·음자리표 옥타브 이동을 철자 보존으로, 음자리표 파트·보표 선택

**근거** P0-3, P1-12. `RangePanel.run`(mxl-studio.html:699~705)이 범위 안 음까지 `midiToNote`로 다시 써서 f07의 G♯→A♭, E♯→F가 됩니다. `ClefPanel`(3137~3143)도 같은 패턴이며, 변환이 모든 파트·첫 clef에만 적용됩니다(f02에서 P1·P2 모두 F4).

````text
[A-2] 음역대·음자리표 옥타브 이동 철자 보존, 음자리표 파트·보표 선택

1. RangePanel.run (함수명 RangePanel, 문자열 '음역대 자동 조정'으로 grep):
   - `transposeNote`/`midiToNote`/`setNotePitch` 호출을 제거하고, 음표마다
     `midi=PitchCore.pitchToMidi(p)`로 범위를 판정한 뒤 필요한 옥타브 수 `k`를 계산해 `PitchCore.shiftNoteOctave(note, k)`만 호출하라.
     k는 `midi<lm`이면 올림, `midi>hm`이면 내림. 범위가 한 옥타브보다 좁아 어느 옥타브도 맞지 않으면 그 음표는 건너뛰고 skipped를 센다.
   - 로그는 `✓ {name}: {moved}개 음표 이동, {skipped}개 범위 밖 유지` 형식으로 바꾼다(기존 adj는 옥타브 단위 횟수여서 틀렸다).
   - 범위 안에 이미 있는 음표는 DOM을 전혀 건드리지 않는다.
2. ClefPanel.run (문자열 '음자리표 변환 중'으로 grep):
   - 패널에 "대상 파트" `<select>`(기본 '모든 파트', 옵션은 getPartInfo로 파트 목록)와, 선택 파트의 `<staves>`가 2 이상일 때만 보이는 "보표" 칩(전체 / 1 / 2 …)을 추가하라. 스타일은 기존 `.form-select`, `.chip` 재사용.
   - 자동 옥타브 이동은 대상 파트·보표의 음표만 평균을 내고, `PitchCore.shiftNoteOctave`로만 옮긴다. `<accidental>` 수정 코드를 제거한다.
   - clef 갱신은 대상 파트의 `<attributes>`에서 `clef[number="N"]`(보표 선택 시) 또는 number 없는/1번 clef만 바꾼다. 선택하지 않은 파트·보표의 clef와 음표는 그대로 둔다.
   - 신규 생성 clef는 attributes 안에서 `<staff-details>`·`<transpose>` 앞에 넣는다.
3. 기존 테스트 tests/e2e/panels/04-range.spec.js의 expect를 바꿔라:
   - f07 업로드 → 칼림바 적용 → `getDocQuery`로 step/alter를 읽어 ['F#','G#','A#','B','C#','D#','E#','B#'] 철자가 유지되고 octave만 바뀌는지 단언.
   - 이를 위해 helpers.js에 `getPitches(page, measureNumber?)` 헬퍼를 추가하라: activeFile xmlDoc의 `part measure[number] note pitch`(measureNumber 생략 시 전체)를
     `step + 기호 + '/' + octave` 문자열 배열로 반환. 기호는 alter 1→'#', 2→'##', -1→'b', -2→'bb', 0→''. 예: 'F#/4', 'Bb/3', 'E/5'. 이후 모든 프롬프트의 pitches 기대값은 이 형식이다.
4. tests/e2e/panels/09-clef.spec.js에 f02 케이스를 추가하라: 파트 P1만 F 음자리표로 바꾸면 P1 clef는 F4, P2 clef는 G2 그대로이고 P2 음표의 octave가 바뀌지 않는다.
5. `npm test`, `npx playwright test tests/e2e/panels/04-range.spec.js tests/e2e/panels/09-clef.spec.js`, `npm run e2e:smoke` 실행 후 종료 보고. 커밋 "음역대·음자리표 옥타브 이동 철자 보존, 음자리표 파트·보표 선택".
````

**완료 기준**
- [ ] f07 음역대 적용 후 `note pitch`의 step·alter가 원본과 전부 동일 (E2E 단언)
- [ ] f02 P1만 변환 시 P2 clef·octave 불변 (E2E 단언)
- [ ] mxl-studio.html에서 RangePanel·ClefPanel 본문에 `transposeNote` 호출 0 (`grep -n transposeNote mxl-studio.html`로 확인해 보고)

---

### A-3 · 마디별 조바꿈과 조옮김 '특정 조'의 방향·철자·단조·마디 번호

**근거** P0-4, P1-11. `KeyChangePanel.run`(1013~1051)은 `(target-current+12)%12`로 항상 위로 옮기고 MIDI 철자를 씁니다(f07 F♯→E장조가 +10반음, A♭·E♭·B♭ 표기). `TransposePanel`의 특정 조 모드(600)도 항상 상행입니다. 단조 악보도 "Major"로만 표시됩니다.

````text
[A-3] 마디별 조바꿈·조옮김 특정 조: 최단 방향·방향 선택·단조·코어 경로

1. KeyChangePanel (문자열 '마디별 조바꿈 처리 중'으로 grep):
   - 패널에 "방향" 칩 3개(가까운 쪽 / 위로 / 아래로, 기본 가까운 쪽)를 추가하고 상태 `direction`('nearest'|'up'|'down')으로 둔다.
   - 활성 파일의 `<mode>`가 minor면 목표 조 select 라벨을 `MINOR_KEY_NAMES[j]+' minor'`로, 아니면 `KEY_NAMES[j]+' Major'`로 표시한다. 악보 정보 카드의 "원본 조"도 같은 규칙.
   - run을 다음 알고리즘으로 다시 써라(음표를 직접 옮기는 forEach와 accidental 처리 코드는 삭제):
     a. 원본 doc(복제 전)에서 `MeasureCore.measureNumbers(doc)`로 마지막 마디 번호 last를 얻고,
        `MeasureCore.segments(changes.map(c=>({measure:c.measure, value:c.key})), last)`로 구간을 만든다.
     b. 각 구간 {from,to,keyIdx}에 대해, 파트별로 `origFifths=MeasureCore.keyFifthsAt(originalPart, from)`, `mode=MeasureCore.modeAt(originalPart, from)`,
        `targetFifths=KEY_FIFTHS[keyIdx]`, `semis=PitchCore.nearestShift(tonicPc(origFifths,mode), tonicPc(targetFifths,mode), direction)`
        (tonicPc는 `TransposeCore.keyTonic(fifths,mode).pc`), `interval=TransposeCore.keyInterval(origFifths,targetFifths,semis,mode)`를 구한다.
        semis가 0이면 그 구간은 건너뛴다.
     c. 복제 doc에 `TransposeCore.transposeMeasureRange(doc, from, to, semis, {interval, transposeKey:(key)=>{key.querySelector('fifths').textContent=String(targetFifths)}})`를 호출한다.
        주의: transposeMeasureRange는 모든 파트의 해당 번호 마디를 처리하므로 파트 루프 안에서 호출하지 말고, 파트별 origFifths가 다르면(이조 악기) 파트마다 `part > measure` 범위를 직접 돌며 transposeNoteElement 대신
        `TransposeCore.transposePitch`+`PitchCore.syncAccidental(note, targetFifths)`를 쓰는 분기를 둔다. 파트별 조표가 같은 보통의 악보는 c의 한 번 호출로 끝낸다.
     d. 구간 시작 마디(from)에 `<key>`가 없으면 `<attributes>`(없으면 생성해 첫 자식으로)에 `<key><fifths>targetFifths</fifths><mode>mode</mode></key>`를 `<divisions>` 뒤·`<time>` 앞에 삽입한다.
     e. 로그: `마디 {from}~{to}: {원본 조 이름} → {목표 조 이름} ({semis>0?'+':''}{semis}반음)`.
   - `changes`의 measure 입력은 `MeasureCore.measureNumbers`의 min/max로 clamp 한다.
2. TransposePanel 특정 조 모드(문자열 "const s=(selKey-cs+12)%12"로 grep):
   - 같은 "방향" 칩(가까운 쪽/위로/아래로)을 추가하고 `s=PitchCore.nearestShift(cs, selKey, direction)`로 바꾼다. 로그의 반음 수에 부호를 붙인다.
   - all12·반음·음정 모드는 이 세션에서 건드리지 않는다.
3. 테스트:
   - tests/e2e/panels/02-keychange.spec.js: f07 업로드 → 1마디부터 E장조(가까운 쪽) → 첫 마디 pitches가 ['E/4','F#/4','G#/4','A/4','B/4','C#/5','D#/5','A#/5']이고 `key fifths`가 4, accidental에 'flat' 없음.
     같은 악보에서 '위로' 선택 시 첫 음이 'E/5'인 케이스 추가.
   - f04(A단조) 업로드 → 목표 'Dm' → fifths −1, mode minor 유지, 코드 Dm Gm A7 Dm (transposeMeasureHarmonies 결과).
   - tests/e2e/panels/01-transpose.spec.js: f01(C장조) → 특정 조 B(가까운 쪽) → 첫 음 'B/3'(−1반음), '위로' → 'B/4'.
   - 단위: `tests/unit/transpose-core.test.js`에 keyInterval 조합(6→4, −2, major)로 E#→D#이 나오는 케이스.
4. 검증 명령 실행 후 종료 보고. 기대값을 바꾼 기존 테스트가 있으면 context-notes.md에 "항상 상행 전제 기대값 수정"으로 기록. 커밋 "마디별 조바꿈·특정 조 조옮김: 최단 방향·단조·조성 철자".
````

**완료 기준**
- [ ] f07 → E장조 결과 첫 음 E/4(하행 2반음), ♭ 임시표 0, fifths 4 (E2E)
- [ ] f04 → Dm 결과 fifths −1, mode minor, 코드 4개 이조 (E2E)
- [ ] KeyChangePanel 본문에 `transposeNote` 호출 0, `measures[` 인덱스 접근 0

---

### A-4 · 카포 구간별 절대 프렛, 베이스 포함 코드 이조, 마디 번호 기준 통일

**근거** P0-2, P1-11. `CapoPanel.run`(1196~1248)은 지점마다 `−fret`을 해당 마디부터 끝까지 다시 적용해 두 번째 구간이 −6(기대 −4)이 되고, 조표는 `fifthsUpBySemi`로 −4가 되어 음표와 어긋납니다. 코드는 root만 옮기고 `<bass>`는 그대로입니다. 마디는 인덱스로 찾습니다. `TempoChangePanel`(1431)도 인덱스입니다.

````text
[A-4] 카포 구간별 절대 프렛, bass 포함 코드 이조, 마디 번호 기준

1. CapoPanel.run (문자열 '카포 적용 중'으로 grep)을 다음으로 다시 써라:
   a. `last=MeasureCore.measureNumbers(doc).at(-1)`, `segs=MeasureCore.segments(capos.map(c=>({measure:c.measure,value:c.fret})), last)`.
   b. 각 구간 {from,to,fret}: 원본 파트의 `origFifths=MeasureCore.keyFifthsAt(originalFirstPart, from)`, `mode=modeAt(...)`,
      `semis=-fret`, `targetFifths=TransposeCore.keyFifthsAfter(origFifths, semis, true /*preferFlat*/)`,
      `interval=TransposeCore.keyInterval(origFifths, targetFifths, semis, mode)`.
      `TransposeCore.transposeMeasureRange(doc, from, to, semis, {interval, transposeKey:key=>fifths를 targetFifths로})`를 호출한다.
      이 함수가 `<harmony>`의 root와 bass를 함께 옮기므로 기존 harmony forEach(root만 처리)는 삭제한다.
   c. 구간 시작 마디에 `<key>`가 없으면 A-3 d와 같은 규칙으로 삽입한다.
   d. "Capo N Fret" `<direction>`은 구간 시작 마디(number 기준)의 첫 `<note>` 앞에 첫 파트에만 넣는다. 같은 마디에 이미 `words`가 'Capo '로 시작하는 direction이 있으면 교체한다(재실행 중복 방지).
   e. 결과 조 표시(`{origKeyName} → … 표기`)는 `KEY_NAMES[KEY_FIFTHS.indexOf(targetFifths)]`로 계산해 조표와 같은 값을 보여 준다.
2. TempoChangePanel.run (문자열 '마디별 템포 변경 중'으로 grep): `measures[ch.measure-1]`를 `MeasureCore.measuresByNumber(firstPart).map.get(ch.measure)`로 바꾼다. 못갖춘마디 0번도 지정 가능해야 한다(입력 min을 measureNumbers의 최솟값으로).
3. 테스트 tests/e2e/panels/03-capo.spec.js:
   - f02 업로드 → 지점 2개(1마디 2프렛, 3마디 4프렛) → 1~2마디 pitches는 원본 −2반음(B♭장조 철자), 3마디 pitches는 ['Ab/3','Bb/3','C/4','Eb/4','Ab/4','Bb/4','C/5','Eb/5'](원본 C4 D4 E4 G4 C5 D5 E5 G5의 −4반음, A♭장조 철자), 1마디 fifths −2, 3마디 fifths −4, `words`가 'Capo 2 Fret','Capo 4 Fret' 각 1개.
   - f04(A단조, 코드 Am Dm E7 Am) → 1마디 3프렛 → 코드 F#m Bm C#7 F#m 가 아니라 **preferFlat 규칙**에 따라 fifths −?를 확인해 기대값을 명시하라(A단조 −3반음 = F♯단조, 3♯. keyFifthsAfter(0,-3,true)는 ♭ 후보가 없으면 DEFAULT 3을 돌려준다). 코드 심볼은 F#m, Bm, C#7, F#m.
   - 합성 악보(C장조, 코드 C/E) 1마디 2프렛 → harmony가 B♭/D (root-step B alter −1, bass-step D).
   - tests/e2e/panels/07-tempochange.spec.js: f03(못갖춘마디) 업로드 → 1마디에 BPM 90 → `measure[number="1"] direction sound[tempo="90"]` 존재, `measure[number="0"]`에는 없음.
4. 검증 후 종료 보고. 커밋 "카포 구간별 절대 프렛·bass 포함 이조·마디 번호 기준 통일".
````

**완료 기준**
- [ ] f02 2지점 카포에서 3마디 이후 −4반음, 조표 −4, 음표·조표 일치 (E2E)
- [ ] C/E 2프렛 → B♭/D (E2E)
- [ ] CapoPanel·TempoChangePanel 본문에 `measures[` 인덱스 접근 0, `fifthsUpBySemi` 삭제

---

### A-5 · 화성 쌓기 철자와 음표 속성 복사

**근거** P0-8. `HarmonyPanel.addCN`(2291~2301)은 `midiToNote`로 철자를 만들어 F♯장조에서 A♯→B♭, E♯→F가 되고, 새 음표에 duration·type만 복사해 voice·staff·time-modification·dot·stem이 빠집니다(셋잇단·피아노 2단 보표 깨짐).

````text
[A-5] 화성 쌓기: 조성 철자, 원음 속성 복사, 임시표 동기화

1. HarmonyPanel.run (문자열 '화성 쌓기 중'으로 grep):
   - 파트·마디 루프를 돌 때 `fifths=MeasureCore.keyFifthsAt(part, measureNumber)`를 구해, 다이어토닉 모드는 `PitchCore.diatonicThird(p, fifths, 'above'|'below')`, 크로매틱 모드는 `PitchCore.chromaticThird(p, dir)`로 새 음높이를 만든다. `getDiaThirdAbove/Below`, `midiToNote` 호출을 제거한다.
   - 새 `<note>`는 원음의 `duration`, `voice`, `type`, `dot`(모두), `time-modification`, `stem`, `staff`를 **그 순서대로** 복제해 넣고 맨 앞에 `<chord/>`를 둔다. `notations`(tie·slur)·`beam`·`lyric`은 복사하지 않는다.
   - 새 음표에 `PitchCore.syncAccidental(newNote, fifths)`를 호출해 조표와 다른 alter에만 `<accidental>`을 붙인다.
   - 원음이 `<grace>`, `<rest>`, `<chord>`, `<unpitched>`면 건너뛴다(기존 rest/chord 조건 유지 + grace·unpitched 추가).
   - 미리보기 카드(C Major 예시)는 PitchCore로 같은 계산을 하도록 바꾼다.
2. 기존 유틸 `getDiaThirdAbove`, `getDiaThirdBelow`(mxl-studio.html:327~328)는 다른 호출처가 없으면 삭제한다(grep으로 확인하고 보고).
3. 테스트 tests/e2e/panels/14-harmony.spec.js:
   - f07(F♯장조) 3도 위 → 추가된 chord 음표의 철자가 [A#4, B4, C#5, D#5, E#5, F#5, G#5, D#6] 이고(마지막 B#5 위는 D#6), 모든 추가 음표에 `voice`가 원음과 같다(f07에 voice가 없으면 합성 악보로 보강: voice 1, staff 1, time-modification 3:2 셋잇단 한 마디 포함).
   - f06(셋잇단 포함) 3도 아래 → 추가 음표에 `time-modification`이 있고 OSMD 렌더 후 `.score-error`가 없다.
   - f04(A단조, fifths 0) 3도 위: A→C, D→F, E→G#? 가 아니라 fifths 0 기준 G(자연단음계)임을 명시하고 단언. (화성단음계 옵션은 범위 밖, context-notes에 기록)
4. 단위 테스트 `tests/unit/pitch-core.test.js`에 diatonicThird f07 케이스가 이미 있으면 재사용. 검증 후 종료 보고. 커밋 "화성 쌓기 조성 철자·음표 속성 복사".
````

**완료 기준**
- [ ] f07 3도 위 철자 8개 단언 통과 (E2E)
- [ ] 추가 음표의 voice·staff·time-modification 복사 확인 (E2E)
- [ ] HarmonyPanel 본문에 `midiToNote` 호출 0

---

### A-6 · 코드 자리바꿈 베이스 음 철자

**근거** P0-7. `ChordToolsPanel.runInversion`(2432~2467)이 `PC_STEP_ALTER`(♭ 전용, 2362)로 베이스를 써서 E→E/A♭, B7→B7/E♭이 됩니다.

````text
[A-6] 코드 자리바꿈 베이스 철자

1. ChordToolsPanel.runInversion (문자열 'inversion 적용 중'으로 grep):
   - `KIND_INTERVALS`·`STEP_SEMI`·`PC_STEP_ALTER` 사용을 `PitchCore.bassForInversion({step:rs, alter:ra}, kind, inv)`로 바꾼다. null이면 skip++.
   - `<bass-step>`·`<bass-alter>`는 결과의 step/alter로 쓰고 alter 0이면 bass-alter를 만들지 않는다. `<inversion>`·`<bass>` 삽입 순서(kind → inversion → bass)는 유지한다.
   - mxl-studio.html의 `KIND_INTERVALS`, `STEP_SEMI`, `PC_STEP_ALTER` 상수는 다른 호출처가 없으면 삭제한다(grep으로 확인).
2. 테스트 tests/e2e/panels/15-chordtools.spec.js에 합성 악보(E major, B dominant, A♭ minor 코드 3개) 케이스 추가:
   1st inversion → 'E/G#', 'B7/D#', 'A♭m/C♭'(ChordSymbolCore.toString 기준 문자열로 단언. ♭ 표기는 toString 규칙을 따른다).
   3rd inversion → E major는 생략(skip 1), B7는 'B7/A'.
3. 검증 후 종료 보고. 커밋 "코드 자리바꿈 베이스 음 조성 철자".
````

**완료 기준**
- [ ] E → E/G♯, B7 → B7/D♯ (E2E)
- [ ] `PC_STEP_ALTER` 삭제

---

### A-7 · Ossia 유효 attributes 누적

**근거** P0-9. `OssiaPanel.run`(1612~1672)이 1마디의 `<attributes>`만 저장해 두었다가 범위 첫 마디에 넣습니다. 3마디에서 3♯·F음자리표로 바뀐 악보의 4마디 Ossia가 fifths 0·clef G로 그려집니다.

````text
[A-7] Ossia: 시작 마디까지의 유효 attributes 사용

1. OssiaPanel.run (문자열 'Ossia 오버레이 생성 중'으로 grep):
   - `origFirstMeasure`/`origAttrsClone` 대신 범위 밖 마디를 지우기 **전에** `effective=MeasureCore.effectiveAttributes(firstPart, startMeasure)`를 구한다(ossiaDoc 기준 복제 파트에서 호출해도 되지만 마디 삭제 전에 호출해야 한다).
   - 첫 남은 마디에 `<attributes>`가 없으면 effective를 첫 자식으로 넣고, 있으면 effective의 자식 중 첫 남은 마디 attributes에 없는 태그(divisions·key·time·clef(number별)·staves·staff-details·transpose)만 보충한다. 기존 '기본 attributes 생성' 분기는 effective가 비었을 때만 쓴다.
   - Ossia 변형(조옮김·옥타브)은 `transposeNote` 대신: 옥타브는 `PitchCore.shiftNoteOctave`, 반음은 `TransposeCore.transposeMeasureRange(ossiaDoc, startMeasure, endMeasure, transposeSemi, {preferFlat:TransposeCore.keyFifthsAfter(fifths,transposeSemi)<0, transposeKey:...})`로 처리하고 key도 함께 갱신한다. 기존 accidental 직접 수정 코드는 삭제한다.
2. 테스트:
   - 단위 `tests/unit/measure-core.test.js`에 이미 effectiveAttributes 케이스가 있으므로, E2E tests/e2e/panels/08-ossia.spec.js에 합성 악보(3마디 fifths 3·clef F) 업로드 → 4~4마디 Ossia → `__mxlGetState().files[0].ossiaMxml`을 파싱해 첫 measure attributes의 fifths 3, clef sign F, divisions 1마디 값인지 단언.
   - f07 1~2마디 Ossia +1반음 → Ossia의 첫 음이 'G/4'(F♯+1=G, 조표 7♯→G장조 1♯ 표기)이고 ossia key fifths 1.
3. 검증 후 종료 보고. 커밋 "Ossia 유효 attributes 누적·코어 조옮김".
````

**완료 기준**
- [ ] 조표·음자리표 변경 뒤 구간 Ossia의 attributes 일치 (E2E)
- [ ] OssiaPanel 본문에 `transposeNote` 호출 0

---

### A-8 · 적용 대상 토글(기본 전체)과 대상 파일 표기

**근거** P0-1, 사용자 결정(기본 전체 유지). 모든 변환이 열린 파일 전체에 적용되는 것은 유지하되, 사용자가 '현재 파일만'을 고를 수 있어야 하고 무엇이 바뀌었는지 보여야 합니다.

````text
[A-8] 적용 대상 토글(기본 '열린 파일 전체')과 대상 표기

1. App에 상태 `scope`('all'|'active', 기본 'all')를 추가하고 localStorage `mxlStudio.scope`에 보존하라.
   인스펙터·도구 패널 헤더(`inspector__header`)에 토글 그룹 "적용 대상: 전체 N개 / 현재 파일"을 `<button type="button" aria-pressed>` 2개로 추가한다. 스타일은 styles.css에 `.scope-toggle` 블록으로 추가.
   `panelProps`에 `scope`를 포함한다.
2. 유틸 `targetFiles(files, activeFile, scope)`를 mxl-studio.html 유틸 영역(`activeDoc` 아래)에 추가하라: scope==='active'면 `[files[activeFile]||files[0]]`, 아니면 files 전체. 반환 배열 요소에는 원래 인덱스가 필요하므로 `[{file,index}]` 형태로 돌려준다.
3. 변환·분석 패널 19개(upload·export 제외. roman은 이미 현재 파일만 처리하므로 scope와 무관하게 유지)의 run에서 `for(const file of files)`를 `for(const {file,index} of targetFiles(files,activeFile,scope))`로 바꾸고,
   결과는 `files.map((f,i)=>updatedMap.get(i)||f)`로 합쳐 `onFilesUpdate`에 넘긴다. 대상이 아닌 파일 객체는 동일 참조를 유지해야 한다(NotationPanel·NumberingPanel의 baseline 비교 로직이 참조 동일성을 쓴다).
4. 로그 첫 줄에 `대상: 현재 파일(f09-real.mxl)` 또는 `대상: 열린 파일 3개`를 넣고, 히스토리 라벨은 `'조옮김 · 현재 파일'` / `'조옮김 · 전체 3개'`처럼 접미사를 붙인다(pushHistory 호출부가 아니라 각 패널의 onFilesUpdate 라벨에서).
5. 테스트:
   - 새 E2E tests/e2e/23-scope.spec.js: f01·f02 업로드 → 기본 scope 'all' 확인(aria-pressed) → 반음 +2 → 두 파일 모두 첫 음 변경.
     '현재 파일' 선택 → f02 활성 → 반음 +2 → f02만 변경, f01 xmlString 불변, 히스토리 마지막 라벨에 '현재 파일' 포함. 새로고침 후 토글 상태 복원.
   - 기존 @panels 테스트는 전체 적용 전제이므로 그대로 통과해야 한다.
6. 검증 후 종료 보고. 커밋 "변환 적용 대상 토글(기본 전체)과 대상 파일 표기".
````

**완료 기준**
- [ ] 기본값 '전체'에서 기존 @panels 매트릭스 전부 통과
- [ ] '현재 파일' 선택 시 비활성 파일 참조 동일성 유지 (E2E: xmlString 불변)
- [ ] 패널 본문에 직접 `for(const file of files)` 0 (grep 보고)

---

### A-9 · all12 모드를 .mxl 12개 ZIP 산출로

**근거** P0-5, 사용자 결정(존치). `TransposePanel`(575~583)은 12번 변환 후 `previewDoc` 하나만 커밋해 로그와 결과가 다릅니다.

````text
[A-9] 조옮김 '12개 장조 모두' → 소스 파일마다 .mxl 12개 ZIP

1. 유틸 `buildMxlBlob(file)`(mxl-studio.html:215)을 `buildMxlBlobFromDoc(doc)`로 일반화하고 기존 `buildMxlBlob`은 이를 호출하게 두어라(시그니처 유지).
2. TransposePanel의 all12 분기:
   - 대상 파일(A-8의 targetFiles)마다 12개 조로 `transposeDoc(file.xmlDoc, PitchCore.nearestShift(source, i, 'nearest'), i)`를 만들고
     ZIP 경로 `{base}/{base}_{keyName}.mxl`에 넣는다. keyName은 활성 파일이 단조면 MINOR_KEY_NAMES, 아니면 KEY_NAMES에서 가져오되 파일명 안전 처리('/'→'-', '♭'→'b', '♯'→'#').
   - 원래 조와 같은 i는 건너뛰지 않고 포함한다(12개 고정).
   - 열린 악보는 **변경하지 않는다**(onFilesUpdate 호출 없음, 히스토리 없음). 대신 로그에 12줄 + `✅ {n}개 파일 × 12조 ZIP 다운로드`를 남기고 `downloadBlob(zip,'transposed_12keys.zip')`.
   - 패널 설명 문구를 "12개 조로 변환한 .mxl을 ZIP으로 내려받습니다. 열린 악보는 바뀌지 않습니다."로 바꾼다.
3. 테스트 tests/e2e/panels/01-transpose.spec.js에 all12 케이스 추가: f01 업로드 → all12 실행 → `page.waitForEvent('download')`로 받은 ZIP을 JSZip(테스트 측 devDependency 추가 또는 node:zlib로 central directory 파싱)으로 열어 엔트리 12개, 이름에 'f01-basic_Db.mxl' 포함, 각 엔트리가 `META-INF/container.xml`과 `score.xml`을 가진 유효 ZIP임을 확인. 실행 후 `__mxlGetState().files[0].xmlString`이 실행 전과 같고 history 길이가 늘지 않았음을 단언.
4. 매뉴얼 `manual/MXL-Studio-User-Manual-ko.html`의 조옮김 절에 한 줄 추가("12개 장조 모두: ZIP 다운로드, 열린 악보 불변"). PDF·SVG 재생성은 A-10에서 일괄.
5. 검증 후 종료 보고. 커밋 "all12 조옮김을 12개 .mxl ZIP 산출로 변경".
````

**완료 기준**
- [ ] ZIP 엔트리 12개, 유효 MXL (E2E)
- [ ] 실행 전후 열린 파일·히스토리 불변 (E2E)

---

### A-10 · 회귀 매트릭스·문서 동기화

**근거** Phase A 전체. 이 세션은 코드 수정 없이 검증과 기록만 합니다.

````text
[A-10] Phase A 회귀 확인과 문서 동기화

1. `grep -n "transposeNote\|midiToNote\|PC_STEP_ALTER\|fifthsUpBySemi\|measures\[" mxl-studio.html` 결과를 보고하라.
   남아 있어도 되는 것은 `midiToNote`를 **표시 목적**으로만 쓰는 StatsPanel(최저음·최고음 표기)과 InstrumentPanel 미리보기뿐이다. 그 외가 남았으면 해당 세션으로 돌아가 제거한다.
2. `npm test`, `npx playwright test` 전체(모바일 프로젝트 포함)를 실행하고 통과/실패/skip 수를 README 검증 현황 표에 날짜와 함께 추가하라.
3. tests/fixtures에 이번 Phase에서 만든 합성 악보를 `f10-keychange-clef.musicxml`(3마디 조표·음자리표 변경), `f11-chords-inversion.musicxml`(E, B7, A♭m 코드)로 저장하고 README-TESTING.md 픽스처 표에 추가하라. 다른 합성 XML을 테스트 안에 문자열로 둔 경우도 픽스처 파일로 옮긴다.
4. context-notes.md에 `## Phase A 요약` 절을 추가하라: 제거된 함수, 바뀐 기대값, 남은 문제(예: 화성단음계 3도, 같은 마디 앞선 임시표 고려 미구현, 파트별 조표가 다른 악보의 조바꿈은 분기 경로).
5. checklist.md에 A-1~A-10 체크 상태를 기록하고, `npm run docs:build`로 매뉴얼 PDF·SVG를 재생성하라(Python 환경이 없으면 그 사실만 기록).
6. 커밋 "Phase A 변환 정확도 회귀 확인과 문서 동기화".
````

**완료 기준**
- [ ] grep 결과에 표시 목적 외 `transposeNote`·`midiToNote` 0
- [ ] 전체 E2E 통과 수가 Studio09 기준(80 통과/4 skip) 이상
- [ ] 픽스처 f10·f11과 문서 갱신 커밋

---

## 4. 실행 로드맵과 함정

### 4.1 순서와 의존성

```
A-1 코어 ──┬─ A-2 음역대·음자리표 ──┐
           ├─ A-3 조바꿈·특정 조 ──┤
           ├─ A-4 카포·마디 번호 ──┼─ A-8 적용 대상 ── A-9 all12 ZIP ── A-10 회귀·문서
           ├─ A-5 화성 쌓기 ───────┤
           ├─ A-6 자리바꿈 ────────┤
           └─ A-7 Ossia ──────────┘
```

A-2~A-7은 서로 독립이라 순서를 바꿔도 되지만, A-8은 모든 패널의 run 루프를 건드리므로 A-7까지 끝난 뒤에 한다(충돌 방지).

### 4.2 알려진 함정

| 함정 | 대응 |
|---|---|
| `transposeMeasureRange`는 모든 파트의 같은 번호 마디를 한 번에 처리하고, `<key>`는 `options.transposeKey` 콜백으로만 바꾼다 | 구간 시작 마디에 key가 없으면 패널이 직접 삽입(A-3 d). 파트별 조표가 다른 악보는 분기 경로(A-3 c) |
| `KEY_FIFTHS` 인덱스 = 장조 으뜸음 pitch class. 단조 이름 배열 `MINOR_KEY_NAMES`도 같은 인덱스(관계장조) | 단조 목표는 인덱스만 같고 으뜸음 pc는 `TransposeCore.keyTonic(fifths,'minor').pc`로 구한다 |
| `keyFifthsAfter(fifths, semis, preferFlat)`는 ♭ 후보가 없으면 DEFAULT 표를 돌려준다 | 카포 A단조 −3 = F♯단조(3♯) 같은 경우 기대값을 미리 계산해 테스트에 명시 |
| NotationPanel·NumberingPanel은 `files` 참조 동일성으로 baseline을 판단한다 | A-8에서 대상이 아닌 파일 객체는 같은 참조를 유지 |
| 기존 E2E 일부는 "항상 상행" 결과를 기대값으로 쓴다 | 기대값을 고치고 context-notes.md에 기록(G-3) |
| Playwright 다운로드 검증은 `acceptDownloads`가 켜져 있어야 한다 | playwright.config.js `use.acceptDownloads:true` 확인 |
| OSMD는 `<accidental>`이 없어도 alter로 임시표를 그린다 | 그래도 MuseScore 호환을 위해 `syncAccidental`로 조표 기준 임시표를 넣는다. 같은 마디 앞선 임시표(취소 자연기호)는 이번 범위 밖 |

### 4.3 Phase A 종료 체크리스트

- [ ] 1.1 표의 P0-1, P0-2, P0-3, P0-4, P0-5, P0-7, P0-8, P0-9, P1-11, P1-12, P2-4 각각에 대응하는 E2E 또는 단위 테스트가 있고 통과한다
- [ ] mxl-studio.html에 음표를 쓰는 MIDI 기반 코드가 없다
- [ ] 변환 기본 범위 '전체' 유지, '현재 파일' 옵션 동작, all12 ZIP 산출
- [ ] README·README-TESTING·checklist·context-notes·매뉴얼 동기화

다음 Phase B(출력 파이프라인: 오프스크린 고정 폭 렌더, pageFormat PDF, drawCredits, 원본 줄바꿈, 한글 폰트)는 별도 문서로 이어집니다.
