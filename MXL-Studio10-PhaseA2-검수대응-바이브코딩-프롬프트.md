# MXL Studio10 · Phase A2 검수 대응 바이브코딩 프롬프트

작성일 2026-11-09.
대상 스냅샷 `kimyounggaur/Score_Designer-Original-` main **b605c7e** (2026-11-09, Phase A 병합 직후. mxl-studio.html 4,658줄 / 코어 10개 / 패널 21개 / 픽스처 12개 / 단위 142개 / E2E 111개).
근거는 2026-11-09 외부 검수 보고서 「악보 디자이너 전체 기능 검수」(파일명 `…20261109_GPT6_Astra_.md`, 이하 "검수 보고서")의 핵심 오류 B01~B10, 정확성 문제 C01~C18, 버튼별 검수 R·T·P·E 항목 중 결함으로 기록된 것입니다.
목적은 **다른 파일을 덮어쓰거나 악보 데이터를 비우는 경로를 먼저 막고(데이터 보존), 그다음 분석·표기의 정확성 문제를 코어로 옮겨 고치는 것**입니다.

---

## 0. 이 문서를 읽기 전에

### 0.1 검수 보고서를 다루는 방식

검수 보고서는 배포본을 조작해 얻은 관찰 기록입니다. 이 문서를 쓰기 전에 보고서의 모든 B·C 항목을 **b605c7e 소스와 대조**했고, 결과를 1장 표의 "확인" 열에 적었습니다.

| 표기 | 뜻 |
|---|---|
| 소스 확인 | 보고서가 말한 증상을 일으키는 코드를 소스에서 찾았다. 줄 번호를 1장에 적었다 |
| 보고서 재현 | 소스로 원인을 좁히지 못했거나 실행이 필요한 항목. 보고서의 재현 순서를 그대로 테스트로 옮긴다 |
| 추가 발견 | 대조 중에 새로 찾은 문제. 보고서에는 없다 |

보고서가 "정상"으로 판정한 R·T·P·E 항목은 이 문서에서 다루지 않습니다. 보고서의 "검증되지 않은 범위"(모바일 실기기, 최종 PDF 출력, 청음)도 이 Phase 밖입니다(4.4절).

**Phase A 회귀 1건을 포함합니다.** B01(로마 숫자 삽입이 다른 파일을 덮어씀)은 Phase A의 A-8(적용 대상 토글)에서 `mergeTargets`에 넘기는 결과 배열의 인덱스 규칙을 로마 숫자 패널에만 어긋나게 적용해 생긴 회귀입니다. 1.1절에 원인을 적었고 A2-1에서 가장 먼저 고칩니다.

### 0.2 이 문서가 정한 기본값

아래는 사용자 확인 없이 작업자가 정한 설계 기본값입니다. 바꾸고 싶으면 이 표만 고치고 해당 세션 프롬프트를 그에 맞게 조정합니다. 나머지 프롬프트는 이 기본값을 전제로 씁니다.

| 번호 | 결정 | 내용과 이유 |
|---|---|---|
| D1 | 템포 'duration 비례 변환' 칩 **제거** | `Math.round(old/rat)`가 divisions 1 악보에서 duration 0을 만들어 재생 데이터를 비웁니다(B03). 음표 길이를 바꾸려면 divisions·backup·forward·`<type>`·박자표까지 함께 바꿔야 하는데 이 기능의 의도를 설명하는 문구·테스트·설명서가 없습니다. 재생 속도는 sound tempo·metronome으로 이미 바뀝니다. 기능을 빼고 context-notes에 이유를 남깁니다 |
| D2 | 파트 추출은 파일마다 **ID를 다시 검증**하고, 남길 파트가 없는 파일은 **건너뛰고 경고** | 전체 범위에서 다른 파트 ID를 가진 파일이 0파트가 되는 경로(B02)를 막습니다. 파일을 비우지 않고 원본 그대로 둡니다 |
| D3 | 숫자 악보가 만든 가사에 `name="mxl-studio-number"` 표식을 붙이고, 원본 가사 백업은 **파일 객체**(`lyricBackup`)에 둔다 | 다른 패널이 파일을 커밋해도 백업이 남습니다(B04). 재생성은 표식 가사만 지우고 다시 만들므로 두 줄로 쌓이지 않습니다(E37). 세션 저장에는 백업이 들어가지 않으므로 새로고침 뒤 복원은 되지 않음을 설명서에 적습니다 |
| D4 | 숫자 악보 옥타브 점은 **기준 옥타브 4에서 떨어진 만큼(최대 3개)** | C5·C6·C7을 구분합니다(C04). 기준 옥타브는 패널에서 2~6으로 고를 수 있고 기본 4입니다 |
| D5 | 숫자 악보 번호 체계에서 **'숫자 (도=1)' 칩을 제거**하고 '고정 도법 (C=1)'을 기본값으로 | 추가 발견 N1: 두 모드의 출력이 코드상 완전히 같습니다. 칼림바·텅드럼 번호 악보는 C=1 고정이므로 고정 도법을 기본으로 둡니다. '한국어 계이름'은 고정도로 유지합니다 |
| D6 | 히스토리 '모두 지우기'는 **현재 악보를 기준점 1개로 남긴다** | 지운 직후 첫 편집을 되돌릴 수 있어야 합니다(B07). 파일이 없을 때만 빈 기록이 됩니다 |
| D7 | Ossia는 **PNG·SVG에 포함**하고, MXL·XML 내보내기에는 **경고만** | 뷰어가 Ossia를 별도 OSMD로 그리는 구조라 이미지는 합성할 수 있습니다(C13). MusicXML에는 Ossia 표준 요소가 없어 별도 파트로 넣는 설계는 이 Phase 밖입니다 |
| D8 | 종지 분류에 **'불완전정격종지 (IAC)'**를 추가 | V→I 중 한쪽이라도 기본위치가 아니면 PAC 대신 IAC입니다(C10). 최상성부 판정은 하지 않으며 그 한계를 패널 설명에 적습니다 |
| D9 | 자동 코드 판정은 **서로 다른 음 3개 이상**일 때만 확정, 2개는 완전5도일 때만 파워코드('5'), 1개는 미확정('?') | 단음·2음을 코드로 확정하던 경로(C01·C02)를 막습니다. 미확정은 삽입하지 않고 로그에만 남깁니다 |
| D10 | 코드 분석(수직 음향)은 **마디 전체 음 모음이 아니라 박(onset) 단위**로 바꾸고, 마디 표기는 **number 속성** | C15·C18. 로마 숫자 코어의 `collectMeasureBeats`를 재사용합니다 |
| D11 | 음정 조옮김은 **온음계 간격을 함께 전달**하고, 완전음정(1·4·5·8도)의 품질 칩은 Perfect/Aug/Dim 계열로 표기 | 감5도가 F♯로 나오던 문제(C06)와 'Minor 5th' 같은 표기를 함께 고칩니다 |
| D12 | 영어 원문이 그대로 나오던 오류문은 **한글 문장으로 대응표 변환**하고 원문은 괄호에 남긴다 | R10·R52. 원문을 지우지 않아 디버깅이 가능합니다 |

### 0.3 기존 문서와의 관계

| 문서 | 상태 |
|---|---|
| `MXL-Studio09-개선보완-바이브코딩-프롬프트(Fable51).md` 2.1 공통 계약 | 그대로 유효 |
| `MXL-Studio10-PhaseA-변환정확도-바이브코딩-프롬프트.md` 1.3 추가 규칙 F·G·H | 그대로 유효. 이 문서의 1.4절 규칙 I·J·K를 그 뒤에 덧붙인다 |
| 심층 분석 문서의 Phase B(출력 파이프라인) | 이 Phase A2 **다음**으로 미룬다. A2는 데이터 보존이 먼저라는 검수 결과를 반영한 삽입 단계다 |
| 검수 보고서 | 근거 자료. 저장소에는 넣지 않는다(외부 문서). 이 문서가 필요한 내용을 옮겨 적었다 |

줄 번호는 b605c7e 기준입니다. 편집이 진행되면 어긋나므로 각 프롬프트는 반드시 함수명·문자열로 다시 grep 하도록 지시합니다.

### 0.4 사용 방법

1. 세션 시작 시 Studio09 문서의 **2.1 공통 계약**, Phase A 문서의 **1.3 추가 규칙**, 이 문서의 **1.4 추가 규칙** 순서로 붙여넣는다.
2. 3장의 프롬프트 A2-1 → A2-11을 **한 세션에 하나씩** 순서대로 실행한다. A2-1(이 문서 커밋 + 범위 병합 회귀 수정)이 끝나기 전에는 다음을 시작하지 않는다.
3. 완료 기준 체크박스가 모두 채워지기 전에는 다음 프롬프트로 넘어가지 않는다.
4. 각 세션 종료 시 `checklist.md`에 `- [x] A2-n · 제목 (완료 기준 N개)` 줄을, `context-notes.md`에 `## 2026-MM-DD · A2-n` 절을 추가한다.
5. 작업 브랜치는 `phase-a2/audit-fixes`. main에 직접 푸시하지 않는다(main 푸시는 Pages 배포를 실행한다). A2-11 끝에 PR을 열고 CI 통과를 확인한 뒤 병합 여부를 사용자에게 보고한다.

### 0.5 검증 명령

| 명령 | 용도 |
|---|---|
| `npm test` | 단위 테스트 (Vitest). 이 Phase에서 142 → 약 190개로 늘어난다 |
| `npm run e2e:smoke` | 시작·업로드·조옮김·공유 스모크 |
| `npx playwright test --grep @panels --project=chromium` | 21패널 매트릭스 |
| `npx playwright test tests/e2e/23-scope.spec.js tests/e2e/panels/10-parts.spec.js tests/e2e/panels/19-roman.spec.js --project=chromium` | A2-1이 건드리는 범위·파트·로마 숫자만 빠르게 |
| `npx playwright test tests/e2e/24-audit-regressions.spec.js --project=chromium` | 이 Phase에서 새로 만드는 회귀 스펙(검수 보고서 재현 순서 모음) |

외부 CDN이 막힌 환경이면 Phase A 때처럼 같은 버전·같은 바이트의 라이브러리를 로컬 미러로 제공하고 Chrome에 host-resolver-rules를 준다. 한글 파일명 다운로드 검사는 `LANG=C.UTF-8`이 필요하다.

---

## 1. 근거 요약

### 1.1 핵심 오류 B01~B10 소스 대조

| ID | 증상(검수 보고서) | 소스에서 찾은 원인 | 위치(b605c7e) | 확인 | 세션 |
|---|---|---|---|---|---|
| B01 | f01·f02 열고 f02 선택, 현재 파일, 로마 숫자 삽입 → f02가 f01 내용으로 바뀌고 f01 탭 2개 | `insertIntoScore`가 `updatedFiles=files.map((f,i)=>i===fileIndex?commitFile(f,doc):f)`(파일 전체 길이 배열)를 `mergeTargets(files,targets,results)`에 넘긴다. `mergeTargets`는 `results[i]`를 `targets[i]`의 결과로 보므로 현재 파일 범위(targets 1개)에서 `results[0]`=f01이 f02 자리에 들어간다. 전체 범위나 첫 파일 선택일 때는 우연히 맞는다 | mxl-studio.html 2861~2862, 223~227 | 소스 확인 (Phase A 회귀) | A2-1 |
| B02 | P1 파일과 P99 파일을 열고 P1만 유지, 전체 실행 → P99 파일이 0파트, 로그는 성공 | `keep`을 활성 파일의 파트 ID로만 만들고 모든 대상 파일에서 `keep`에 없는 `score-part`·`part`를 지운다. 파일별 검증과 빈 결과 방어가 없다 | 1757~1777 | 소스 확인 | A2-1 |
| B03 | divisions 1 악보, 100→300 BPM, duration 비례 변환 → duration 전부 0, 재생 불가 | `d.textContent=String(Math.round(old/rat))`. `old=1`, `rat=3`이면 0. backup·forward·type·divisions는 손대지 않는다 | 963 | 소스 확인 | A2-2 (D1) |
| B04 | 가사 → 숫자 생성 → 색깔 악보 → 기존 가사 복원 → 숫자가 남음 | `baselineRef`가 "마지막 출력과 다른 files"가 들어올 때마다 갱신된다. 색깔 악보 커밋으로 새 파일 객체가 오면 숫자 가사가 든 문서가 기준선이 된다 | 2489~2492, 2503~2518 | 소스 확인 | A2-3 (D3) |
| B05 | f01 미리보기 → f02 선택 → SVG 저장 → 파일명은 f02, 내용은 f01 | `previewReady`가 `selIdx`·`xmlDoc` 변경에 반응하지 않는다. 저장은 `previewRef`의 SVG를, 파일명은 `files[selIdx]`를 쓴다 | 1942~1971, 1974~2013, 2082~2091 | 소스 확인 | A2-4 |
| B06 | `export-roundtrip.xml`·`.mxl` 2개 → 전체 PNG ZIP에 1개만 | `bn=name.replace(/\.(mxl\|xml\|musicxml)$/i,'')`로 ZIP 엔트리 이름을 만들어 같은 이름이 덮어쓴다. 12개 조 ZIP의 `stem`도 같다 | 2069~2070, 618·625 | 소스 확인 | A2-4 |
| B07 | 히스토리 모두 지우기 → 첫 편집 → 실행 취소 불가 | `clearHistory`가 `{history:[],index:-1}`로 만든다. 다음 편집이 index 0이 되어 `undo`(index>0 조건)가 막히고 편집 전 상태는 어디에도 없다 | 4126~4131, 4111 | 소스 확인 | A2-5 (D6) |
| B08 | 마디별 템포 BPM -60 입력 → 음수 저장 | `parseInt(e.target.value)\|\|120`만 있고 범위 검사가 없다. `run`도 `ch.bpm`을 그대로 쓴다. `getTempoTerm(-60)`은 'Larghissimo' | 1495~1496, 1403~1467 | 소스 확인 | A2-2 |
| B09 | 2파트 4마디 f02 → 기본 분석 8마디, 작곡 스타일 4마디 | 기본 분석은 `doc.querySelectorAll('measure').length`(모든 파트 합), 작곡 스타일은 `part:first-of-type > measure`. 음표 수도 전체 파트(32) 대 첫 파트(16)로 기준이 다르다 | 2944, 2962 | 소스 확인 | A2-9 |
| B10 | A-B 켜고 재생 → 재생 중 A-B 끔 → 곡 끝에서 재생 버튼이 계속 활성 | 종료 `scheduleOnce`는 `schedulePlayback` 시점에 `!loopEnabled`일 때만 등록된다. 재생 중 루프를 끄는 effect는 `Transport.loop=false`만 바꾸고 종료 이벤트를 만들지 않는다 | 3647~3654, 3744~3751 | 소스 확인 | A2-5 |

### 1.2 정확성 문제 C01~C18과 버튼별 결함

| ID | 증상 | 소스에서 찾은 원인 | 위치 | 확인 | 세션 |
|---|---|---|---|---|---|
| C01 | 로마 숫자: C 단음·유니슨이 C°7 | `identifyChord`에서 정확 일치가 없으면 점수 폴백. 음 1개면 모든 패턴이 1점 동점이라 패턴 크기(4음)가 큰 7화음이 뽑힌다 | roman-analysis-core.js 69~104 | 소스 확인 | A2-7 (D9) |
| C02 | 자동 코드: C♯ 단음→C, C+D→C | `detectChord`가 1음이면 `SEMI_TO_STEP[u[0]].step`(alter 버림), 2음 이상이면 점수 0이어도 첫 root를 확정한다 | mxl-studio.html 357~376 | 소스 확인 | A2-7 (D9) |
| C03 | 이동도 숫자 악보가 중간 조바꿈을 무시 | `getKeyRoot(doc)`가 첫 `key fifths`만 읽는다 | 355, 2520 | 소스 확인 | A2-3 |
| C04 | C5·C6·C7이 모두 ˙1 | `noteToNumStr`가 `oct>=5`면 점 1개, `oct<=3`이면 점 1개 | 379~398 | 소스 확인 | A2-3 (D4) |
| C05 | 보표별 조표 악보 +2 → 조표 [2,0] | `transposeDocument`는 `measure.querySelector('attributes > key')` 하나만, `transposePartRange`는 `firstKeyOf`(1번 보표)만 갱신 | transpose-core.js 163, 97~100 | 소스 확인 | A2-9 |
| C06 | C에서 감5도 ↑ → F♯4 (기대 G♭4) | 음정 모드가 `computeIntervalSemis` 반음 수만 `transposeDoc`에 넘긴다. 온음계 간격이 없어 조표 기반 철자로만 정해진다 | 639~647, 582~589 | 소스 확인 | A2-9 (D11) |
| C07 | 점4분=60·sound 90 악보를 120으로 → per-minute도 120 | `optMetro`가 `per-minute=bpm`을 그대로 쓴다. 마디별 템포의 기존 direction 갱신도 같다. beat-unit·beat-unit-dot 환산이 없다 | 962, 1424~1428 | 소스 확인 | A2-2 |
| C08 | A단조 fixture를 C로 분류 | `topKeys`가 `KEY_NAMES[KEY_FIFTHS.indexOf(fifths)]`만 쓴다. mode를 읽지 않는다 | 2983 | 소스 확인 | A2-9 |
| C09 | 피아노 CEG + B♭클라리넷 기보 DF♯A → D7 | `getPitchMidi`가 기보음만 읽는다. `<transpose>` 미적용 | roman-analysis-core.js 42~50 | 소스 확인 | A2-8 |
| C10 | V6→I6을 PAC | `detectCadence`가 degree 5→1만 본다 | 167~174 | 소스 확인 | A2-8 (D8) |
| C11 | 구세션 저장 실패 뒤에도 구저장 키 삭제 | `migrateFromLocalStorage`가 `saveSession` 결과와 무관하게 `removeItem` 2회 후 `migratedAt`을 기록 | session-store-core.js 282~287 | 소스 확인 | A2-6 |
| C12 | 저장소 모두 불가인데 save ok:true | `writeJson`은 storage 없으면 `false`를 반환하지만 `localSaveSession`이 반환값을 보지 않고 `{ok:true}` | 52~57, 67~80, 193~203 | 소스 확인 | A2-6 |
| C13 | Ossia가 MXL/XML·PNG/SVG에 없음 | Ossia는 `file.ossiaMxml`(별도 문서)이고 `buildMxlBlobFromDoc`·ExportPanel은 `xmlDoc`만 쓴다. 뷰어는 별도 OSMD(zoom 0.65)로 그린다 | 241~249, 3447~3463 | 소스 확인 | A2-4 (D7) |
| C14 | 온음표·2분음표에 `filled="yes"` | ColorPanel이 모든 음표에 `nh.setAttribute('filled','yes')` | 2175 | 소스 확인 | A2-4 |
| C15 | 수직 음향 분석이 마디 전체 음을 합침 | ChordsPanel.run이 마디의 모든 `note`를 한 배열로 모은다 | 2751~2769 | 소스 확인 | A2-7 (D10) |
| C16 | D.C./D.S./Fine/Coda 미지원 경고가 보이지 않음 | `extractPlaybackData`가 `warnings`를 반환하지만 `MidiPlayer`가 읽지 않는다. `words`로만 적힌 D.C.는 감지도 안 된다 | playback-core.js 147~149, mxl-studio.html 3577 | 소스 확인 | A2-5 |
| C17 | 음자리표 5개·템포 프리셋이 div/span | TempoPanel 프리셋 `div onClick`, 눈금 `span onClick`, ClefPanel `clef-btn` `div onClick`. (마디별 템포 프리셋은 이미 `button`) | 1000~1005, 988, 3153~3160 | 소스 확인 | A2-10 |
| C18 | 못갖춘마디 번호 index+1, 단조인데 '장조' 로그, 분석 결과가 파일 전환 후 남음 | ChordsPanel `마디 ${m+1}`; RomanAnalysisPanel 로그 `${result.keyName}장조`; `analysis` state가 `file` 변경에 초기화되지 않음 | 2763·2793, 2839, 2818 | 소스 확인 | A2-7·A2-8 |
| E17 | 화성 쌓기를 반복 실행하면 같은 3도가 중복 추가 | 원음(비-chord 음표)마다 3도를 추가하며 이미 같은 음의 chord 음표가 있는지 보지 않는다 | 2250~2262 | 소스 확인 | A2-10 |
| E37 | 기존 가사 유지 + 재생성 → 가사 두 줄 중복 | 생성 가사에 표식이 없어 지울 대상을 모른다 | 2524~2531 | 소스 확인 | A2-3 (D3) |
| E51·E54 | 가사 스타일 적용 옵션이 모두 꺼져도 실행·기록 생성, 크기 범위 미검증 | 실행 전 "바꿀 것이 있는지" 검사가 없고 `size`를 그대로 쓴다 | 2597~2633 | 소스 확인 | A2-10 |
| R10·R52 | 업로드·세션 JSON 오류문 일부가 영문 | OSMD·JSZip·JSON.parse 예외의 `e.message`를 그대로 출력 | 다수 `'❌ '+e.message` | 소스 확인 | A2-10 (D12) |

### 1.3 추가 발견 (검수 보고서에 없음)

| 번호 | 내용 | 위치 | 세션 |
|---|---|---|---|
| N1 | 숫자 악보의 '숫자 (도=1)'와 '고정 도법 (C=1)'이 같은 코드 경로다. `noteToNumStr`는 `movable`·`korean`만 분기하고 나머지는 전부 `STEP_TO_NUM[step]` | 379~398, 2551~2552 | A2-3 (D5) |
| N2 | `mergeTargets`가 대상 수와 결과 수가 달라도 조용히 진행한다. B01 같은 오류가 "성공"으로 보인다 | 223~227 | A2-1 |
| N3 | 12개 조 ZIP도 B06과 같은 stem 충돌이 있다(`${stem}/${stem}_${조}.mxl`) | 618~625 | A2-4 |
| N4 | 음정 품질 칩이 4·5·8도에서도 'Major (M)'·'Minor (m)'로 표시된다. `computeIntervalSemis`는 완전음정의 minor를 −1(감음정)로 계산한다 | 572~589 | A2-9 (D11) |
| N5 | 마디별 템포가 기존 `sound[tempo]`를 갱신할 때도 `per-minute=bpm`을 그대로 써서 C07과 같은 불일치가 생긴다 | 1424~1428 | A2-2 |
| N6 | 통계의 최저음·최고음을 `midiToNote`로 다시 철자해 표시한다(F♯장조의 E♯이 F로 보임). 표시 전용이지만 실제 철자를 보여주는 편이 맞다 | 2947, 2986 | A2-9 |

### 1.4 공통 계약 추가 규칙 (세션 시작 시 Phase A 1.3 뒤에 붙여넣기)

````text
[Phase A2 추가 규칙 — Studio09 공통 계약, Phase A 추가 규칙 뒤에 적용]

I. 범위·병합 규칙
  1. 패널이 여러 파일을 바꿀 때 결과 배열은 반드시 `targetFiles(...)`의 순서·길이와 같게 만든다. 바꾸지 않은 대상 파일도 원래 객체를 같은 자리에 넣는다. `files.map(...)` 전체 배열을 `mergeTargets`에 넘기지 않는다.
  2. `mergeTargets`는 길이가 다르면 예외를 던진다(A2-1). 패널은 이 예외를 잡아 로그에 보여주고 커밋하지 않는다.
  3. 대상 파일에서 할 일이 없으면(해당 파트 없음, 원본 정보 없음) 그 파일을 **그대로** 결과에 넣고 `⚠` 로그를 남긴다. 파일을 비우거나 목록에서 빼지 않는다.

J. 입력·출력 검증 규칙
  1. 숫자 입력(BPM, 마디, 반음, 크기)은 `Number.isFinite`와 허용 범위를 실행 시점에 다시 검사한다. 범위 밖이면 커밋하지 않고 어떤 입력이 왜 안 되는지 로그에 적는다.
  2. 악보 데이터를 줄이는 변환(duration·파트·가사 제거)은 결과가 비는지 확인한다. 음표 duration 0, 파트 0개, 가사 0개가 "성공"으로 기록되면 안 된다.
  3. 내보내기 산출물 이름은 `uniqueFileName`(또는 같은 규칙의 stem 전용 헬퍼)로 겹치지 않게 만든다. 산출물 수는 로그의 수와 같아야 한다.
  4. 미리보기는 그것이 그린 파일·문서와 짝을 이룬다. 선택 파일이나 문서가 바뀌면 미리보기를 무효화한다.

K. 분석 규칙
  1. 화음은 서로 다른 음 3개 이상에서만 확정한다(2음은 완전5도 파워코드만, 1음은 미확정). 미확정 '?'는 삽입·진행 요약·종지 판정에서 제외한다.
  2. 마디 표기는 항상 `measure[number]` 속성값이다(못갖춘마디 0). `index+1`을 쓰지 않는다.
  3. 조표는 분석하는 마디 시점의 유효 조표를 쓴다. 첫 조표만 쓰는 코드를 새로 만들지 않는다.
  4. 분석 결과 state는 대상 파일이 바뀌면 초기화한다.
````

---

## 2. 코어 변경 설계

### 2.1 `chord-tools-core.js` 추가 (A2-7)

| 함수 | 시그니처 | 규칙 |
|---|---|---|
| `detectChordFromPitchClasses` | `(pitchClasses:number[], {fifths=0, bass=null}={}) → {root:{step,alter}, quality, symbol} 또는 null` | 중복 제거 후 개수 n. n=0 → null. n=1 → null. n=2 → 간격이 7이면 `{quality:'5', symbol:root+'5'}`(root는 아래 음), 아니면 null. n≥3 → 각 root 후보에 대해 간격 집합을 만들고 아래 패턴을 순서대로 검사: `M [0,4,7]`, `m [0,3,7]`, `dim [0,3,6]`, `aug [0,4,8]`, `sus4 [0,5,7]`, `sus2 [0,2,7]`, 7화음은 `7 [0,4,7,10]`, `maj7 [0,4,7,11]`, `m7 [0,3,7,10]`, `m7♭5 [0,3,6,10]`, `dim7 [0,3,6,9]`, `mMaj7 [0,3,7,11]`. **패턴의 모든 음이 집합에 있어야** 후보가 된다(부분 일치 폴백 없음). 여러 후보면 (1) 패턴 음 수가 많은 것, (2) `bass`(호출자가 주는 가장 낮은 음의 pc)가 root인 것, (3) 입력 배열 첫 원소가 root인 것, (4) root pc가 작은 것 순. 후보가 없으면 null |
| `spellPitchClass` | `(pc, fifths) → {step,alter}` | ♯ 이름표 `C C# D D# E F F# G G# A A# B`와 ♭ 이름표 `C Db D Eb E F Gb G Ab A Bb B` 두 후보 중 `alter===PitchCore.keySignatureAlter(fifths, step)`인 것을 고른다(조표 안의 음). 둘 다 아니면 `fifths<0`이면 ♭, 아니면 ♯. `PitchCore`가 없으면 fifths 부호만 쓴다 |
| `chordSymbolText` | `({root,quality}) → string` | `root.step + ('#'/'♭'/'') + quality`. 기존 `parseChordSymbol`이 읽을 수 있는 형식(기존 `detectChord` 출력과 같은 접미사 `'' m dim aug sus4 sus2 7 maj7 m7 m7♭5 dim7 mMaj7 5`) |

HTML의 `detectChord`(357~376)는 삭제하고 `ChordToolsCore.detectChordFromPitchClasses(ns,{fifths})`로 바꾼다. 호출처는 ChordsPanel(수직 음향), ChordToolsPanel(코드 분석 & 삽입), StatsPanel(진행 요약) 세 곳이다.

### 2.2 `roman-analysis-core.js` 변경 (A2-7·A2-8)

| 항목 | 변경 |
|---|---|
| `identifyChord(pitchClassSet)` | n<3이면 `{rootSemi:null, quality:'unknown', chordName: n===1 ? PC_NAMES[pc]+'(단음)' : PC_NAMES[a]+'·'+PC_NAMES[b], pitchClasses}`를 반환하고 폴백 점수를 쓰지 않는다. n≥3에서 정확 일치가 없으면 2.1과 같은 "모든 패턴 음 포함" 규칙으로만 후보를 찾고, 없으면 `quality:'unknown'`, `chordName:PC_NAMES[root]+'?'` |
| `romanForChord` | `chord.quality==='unknown'` 또는 `rootSemi===null`이면 `{roman:'?',degree:null}` (기존 분기 유지) |
| 마디별 조표 | `detectRomanNumeral`에서 첫 파트의 마디를 순서대로 돌며 `attributes > key`(number 없는 것 또는 `number="1"`)를 만나면 `fifths·mode`를 갱신하고, 그 마디의 행에 `keyName`·`tonicSemi`를 넣는다. 반환 객체의 `keyName`·`mode`는 첫 조표(헤더 표시용), 행마다 `keyName`이 따로 있다 |
| 실음 | `collectMeasureBeats`에서 파트마다 그 마디까지의 `<transpose>`(`chromatic` + 12×`octave-change`)를 누적해 `midi`에 더한다. `getPitchMidi(note, transposeSemis=0)` 시그니처로 확장 |
| 종지 | `CADENCE_TYPES`에 `'불완전정격종지 (IAC)'` 추가. `detectCadence`: prev.degree 5 → current.degree 1에서 `prev.inversion===0 && current.inversion===0`이면 PAC, 아니면 IAC. 나머지 규칙 유지. `quality==='unknown'`인 행은 prev·current 어느 쪽으로도 쓰지 않는다 |
| 새 export | `analyzeVerticalities(xmlDoc, {fifthsByMeasure}) → [{measure:number, beat, pitchClasses:number[], chord}]` — `collectMeasureBeats` 결과에 `ChordToolsCore.detectChordFromPitchClasses`를 적용한 목록. ChordsPanel과 ChordToolsPanel이 쓴다. `ChordToolsCore`가 없으면 `chord:null` |

### 2.3 `transpose-core.js` 변경 (A2-9)

| 항목 | 변경 |
|---|---|
| `tonicFifths({step,alter})` | `STEP_FIFTHS={C:0,D:2,E:4,F:-1,G:1,A:3,B:5}`로 `STEP_FIFTHS[step]+7*alter`. 결과가 −7~7 밖이면 `null` |
| `transposeDocument(xmlDoc, semitones, options)` | `options.interval={diatonic,chromatic}`이 있으면 모든 마디에 그 간격을 쓴다. 조표 목표는 `tonicFifths(transposePitch(keyTonic(fifths,mode), interval))`, null이면 `keyFifthsAfter(fifths,semitones,options.preferFlat)` 폴백. `attributes > key`를 **모두** 순회해 각 `fifths`를 갱신한다(number별 독립). 음표 철자는 그 음표의 `<staff>`에 해당하는 key(`number=staff`)가 있으면 그 조표로, 없으면 1번 조표로 `keyInterval`을 계산한다 |
| `transposePartRange` | `firstKeyOf` 대신 마디의 모든 `key`를 갱신한다. 1번(또는 number 없는) key가 `target`, 나머지는 자기 fifths 기준 `keyFifthsAfter` |
| export 추가 | `tonicFifths` |

### 2.4 `session-store-core.js` 변경 (A2-6)

| 항목 | 변경 |
|---|---|
| `writeJson` | 예외를 잡아 `{ok:false, reason:'no-storage' \| 'quota' \| 'storage-error', error}`를 반환하는 `tryWriteJson`을 추가하고, `localSaveSession`·`localPutMeta`·`localDeleteSession`이 그 결과를 검사한다. `QuotaExceededError`(name 또는 code 22)는 `'quota'` |
| `localSaveSession` | 세션 본문 쓰기와 index 쓰기 중 하나라도 실패하면 `{ok:false, reason, size}`. 본문은 썼는데 index가 실패하면 본문을 지운다 |
| `saveSession` | IndexedDB 성공이면 `{ok:true,backend:'idb'}`, 실패면 `localSaveSession` 결과를 **그대로** 반환(ok:false 포함) |
| `migrateFromLocalStorage` | 구세션·슬롯 각각의 `saveSession` 결과를 모은다. **모두 ok일 때만** 구저장 키를 지우고 `migratedAt`을 기록한다. 하나라도 실패하면 키를 남기고 `{ok:false, migrated:count, failed:[{id,reason}]}`를 반환하며 메타에 `migrationPending`(마지막 시도 시각·실패 수)을 기록해 다음 부팅에 다시 시도한다 |

### 2.5 `playback-core.js` 변경 (A2-5)

`extractPlaybackData`의 `warnings`를 확장한다. `sound[dacapo|dalsegno|fine|tocoda]` 외에 `direction-type > segno`, `direction-type > coda`, `direction-type > words` 텍스트가 `/\b(D\.?\s*C\.?|D\.?\s*S\.?|Fine|Coda|al\s+Fine|al\s+Coda)\b/i`에 맞으면 같은 경고를 넣는다. 경고 문구는 `'반복 기호 {표기}은(는) 재생에 반영되지 않습니다.'` 형식으로 발견한 표기(예: `D.C. al Fine`, `Fine`)를 포함한다. 중복은 제거한다.

### 2.6 `numbering-core.js` 신설 → `window.NumberingCore` (A2-3)

| 함수 | 시그니처 | 규칙 |
|---|---|---|
| `GENERATED_LYRIC_NAME` | `'mxl-studio-number'` | 생성 가사의 `name` 속성값 |
| `octaveDots` | `(octave, baseOctave=4) → {above:number, below:number}` | `d=octave-baseOctave`. d>0이면 above=min(d,3), d<0이면 below=min(−d,3) |
| `noteToNumStr` | `(step, alter, octave, {fifths=0, mode='fixed'\|'movable'\|'korean', showOct=true, showSharp=false, baseOctave=4}) → string` | fixed: `STEP_TO_NUM[step]`, 임시표는 alter 부호. movable: `fifths`의 으뜸음(`TransposeCore.keyTonic` 또는 자체 표) 기준 온음계 번호, 조표 밖 음은 ♯/♭ 접두. korean: fixed와 같은 번호를 `도레미파솔라시`로. 점은 `octaveDots`로 above는 `'˙'.repeat(n)` 접두, below는 접미. 기존 HTML `noteToNumStr`와 같은 입력에 대해 옥타브 4~5·3 범위에서는 결과가 같아야 한다(회귀 보호) |
| `fifthsForMeasure` | `(partEl, measureEl) → number` | 그 마디까지의 마지막 `key fifths`(number 없는 것 또는 1번). `MeasureCore.keyFifthsAt`이 있으면 위임 |
| `removeGeneratedLyrics` | `(doc) → number` | `lyric[name="mxl-studio-number"]` 제거, 제거 수 반환 |
| `backupLyrics` | `(doc) → {version:1, entries:[{part,measure,note,lyrics:string[]}]}` | 표식 없는 모든 `lyric`을 (파트 id, 마디 number, 마디 안 음표 순번) 키로 직렬화 |
| `restoreLyrics` | `(doc, backup) → {restored, missing}` | 키로 음표를 찾아 기존 표식 없는 lyric을 지우고 백업을 삽입. 음표를 못 찾으면 missing++ |
| `generateNumberLyrics` | `(doc, options) → {count}` | `removeGeneratedLyrics` 후 모든 pitched 음표(rest·grace·cue·chord 제외는 하지 않음: chord 음표도 번호를 받는다)에 표식 가사를 추가. `keepLyrics`가 아니면 표식 없는 lyric은 **지우지 않고** 호출자가 `backupLyrics` 후 제거한다(순서는 패널 책임) |

### 2.7 `mxl-studio.html` 헬퍼 변경

| 헬퍼 | 변경 |
|---|---|
| `mergeTargets` | `if(results.length!==targets.length) throw new Error('내부 오류: 적용 대상 '+targets.length+'개와 결과 '+results.length+'개가 다릅니다.')` |
| `uniqueStem(stem, used)` 신설 | `uniqueFileName`과 같은 규칙으로 확장자 없는 stem을 중복 회피(`name`, `name (2)`, …) |
| `quarterBpmFromMetronome(metronomeEl)` 신설 | `beat-unit`을 4분음표 기준 배수로(`whole 4, half 2, quarter 1, eighth 0.5, 16th 0.25`), `beat-unit-dot` 개수마다 ×1.5. `per-minute × 배수`를 반환. per-minute가 숫자가 아니면 null |
| `friendlyError(e)` 신설 | 영문 원문 → 한글 대응표(A2-10). 대응표에 없으면 원문 그대로 |
| 제거 | `detectChord`, `getKeyRoot`(NumberingCore·MeasureCore로 대체), `noteToNumStr`(NumberingCore로 이동) |

### 2.8 새 픽스처

| 파일 | 내용 | 쓰는 곳 |
|---|---|---|
| `f13-part-p99.musicxml` | 파트 1개 `id="P99"` Flute, 조표 0, 4/4, divisions 1, 2마디 4분음표 C4 D4 E4 F4 / G4 A4 B4 C5 | B02 |
| `f14-dotted-metronome.musicxml` | 파트 1개, 6/8, divisions 2, 1마디 첫 음표 앞 `<direction><direction-type><metronome><beat-unit>quarter</beat-unit><beat-unit-dot/><per-minute>60</per-minute></metronome></direction-type><sound tempo="90"/></direction>`, 2마디 8분음표 12개 | C07·N5 |
| `f15-two-staff-keys.musicxml` | 피아노 2보표(`<staves>2`), `<key number="1"><fifths>0</fifths></key><key number="2"><fifths>0</fifths></key>`, clef 1 G2·clef 2 F4, divisions 1, 1마디: 보표1 C4 E4 G4 C5, backup 4, 보표2 C3 온음표 | C05 |
| `f16-ensemble-transposing.musicxml` | 파트 2개. P1 Piano 조표 0: 1마디 C4·E4·G4 온음표 화음(`<chord/>`). P2 Clarinet in B♭ 조표 2, `<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>`: 1마디 D4·F♯4·A4 온음표 화음. 실음은 두 파트 모두 C장3화음 | C09 |
| `f17-dacapo.musicxml` | 파트 1개 4마디. 2마디 끝 `<direction><direction-type><words>Fine</words></direction-type><sound fine="yes"/></direction>`, 4마디 끝 `<direction><direction-type><words>D.C. al Fine</words></direction-type><sound dacapo="yes"/></direction>` | C16 |

기존 픽스처 활용: f01(divisions 1, B03·B06·B07·C06), f02(2파트, B01·B02·B09), f03(못갖춘마디, C18), f04(A단조, C08), f06(아·리·랑 가사, B04·E37·C14), f10(3마디 조바꿈 A장조, C03), f12(2보표 2성부, C15).

---

## 3. 단계별 프롬프트 (Phase A2, 11세션)

### A2-1 · 문서 커밋, 범위 병합 회귀(B01) 수정, 파트 추출 파일별 검증(B02)

**근거** B01, B02, N2. B01은 Phase A A-8의 회귀로, 현재 파일 범위에서 로마 숫자 삽입이 활성 파일을 첫 파일 내용으로 바꿉니다. B02는 활성 파일의 파트 ID로 다른 파일을 잘라 0파트 악보를 만듭니다. 둘 다 "다른 파일을 조용히 망가뜨리는" 경로라 가장 먼저 막습니다.

````text
[A2-1] 범위 병합 회귀와 파트 추출 파일별 검증

0. 브랜치 `phase-a2/audit-fixes`를 main(b605c7e)에서 만든다. 이 문서(`MXL-Studio10-PhaseA2-검수대응-바이브코딩-프롬프트.md`)를 저장소 루트에 추가한다.
1. `mergeTargets`(문자열 'function mergeTargets'로 grep)에 길이 검사를 넣어라:
   `if(results.length!==targets.length)throw new Error('내부 오류: 적용 대상 '+targets.length+'개와 결과 '+results.length+'개가 다릅니다.');`
   모든 호출처는 이미 try/catch 안에서 `'❌ '+e.message`를 로그로 남기므로 추가 처리 없이 커밋이 막힌다.
2. RomanAnalysisPanel.insertIntoScore(문자열 '로마 숫자를 악보에 삽입 중'으로 grep)를 다른 패널과 같은 구조로 바꿔라:
   - `const updatedFiles=[];const lines=[scopeLogLine(files,activeFile,scope)];`
   - `for(const {file} of targetFiles(files,activeFile,scope))`: 파일마다 `doc=cloneDoc(file.xmlDoc)`, `source=detectRomanNumeral(doc)`, `count=insertRomanNumerals(doc,source.rows)`,
     `updatedFiles.push(commitFile(file,doc))`, `lines.push({m:`✓ ${file.name}: ${count}개 마디에 로마 숫자 삽입`,t:'ok'})`.
   - `onFilesUpdate(mergeTargets(files,targetFiles(files,activeFile,scope),updatedFiles),scopeLabel('로마 숫자 삽입',files,scope))`.
   - `setAnalysis`는 활성 파일의 결과(`updatedFiles` 중 activeFile에 해당하는 doc)로만 갱신한다. `files.map((f,i)=>i===fileIndex? …)` 줄은 삭제한다.
3. PartsPanel.run(문자열 '파트 추출 중'으로 grep):
   - 파일마다 `const ids=Array.from(doc.querySelectorAll('part-list score-part')).map(sp=>sp.getAttribute('id'));const keepHere=keep.filter(id=>ids.includes(id));`
   - `keepHere.length===0`이면 `updatedFiles.push(file)`(원본 그대로)와 `lines.push({m:`⚠ ${file.name}: 유지할 파트(${keep.join(', ')})가 없어 건너뜁니다. 이 파일의 파트: ${ids.join(', ')}`,t:'warn'})` 후 continue.
   - 제거는 `keepHere` 기준으로 하고 로그는 `✓ ${file.name}: ${keepHere.length}파트 유지 (${removed}파트 제거)`로 실제 수를 적는다.
   - 패널 설명 아래에 파일이 2개 이상일 때만 보이는 안내 `<p className="card__text">`: "전체 적용 시 파트 ID가 현재 파일과 다른 악보는 건너뜁니다."
4. 픽스처 `tests/fixtures/f13-part-p99.musicxml`을 설계 2.8대로 만들고 `tests/e2e/01-fixtures.spec.js` 목록에 추가하라.
5. 새 스펙 `tests/e2e/24-audit-regressions.spec.js`를 만들고(태그 @panels) 두 테스트를 넣어라:
   - 'roman insert with active scope keeps the other file': f01·f02 업로드 → 파일탭으로 f02 선택 → 로마 숫자 패널 → 적용 대상 '현재 파일' → '악보에 삽입'.
     기대: `__mxlGetState().files.map(f=>f.name)`이 ['f01-basic.musicxml','f02-two-parts.musicxml'], files[1]의 `score-part` 2개·`note` 32개·`words[data-roman-analysis]` 1개 이상, files[0]의 xmlString이 삽입 전과 동일.
   - 'part extraction skips files without the kept part': f02·f13 업로드 → f02 선택 → 파트 패널에서 Violin 끔(P1만 유지) → 적용 대상 '전체' → 실행.
     기대: f02는 `score-part` 1개·`note` 16개, f13은 `score-part` 1개(P99)·`note` 8개로 불변, 로그에 '건너뜁니다' 포함, 두 파일 모두 OSMD 렌더 오류 없음(`.score-error` 없음).
6. 단위 테스트는 없다(HTML 헬퍼). `npm test`, `npx playwright test tests/e2e/24-audit-regressions.spec.js tests/e2e/23-scope.spec.js tests/e2e/panels/10-parts.spec.js tests/e2e/panels/19-roman.spec.js --project=chromium`, `npm run e2e:smoke`를 돌리고 종료 보고.
   context-notes에 "B01은 A-8 회귀"임을 명시한다. 커밋 "범위 병합 결과 검증과 로마 숫자 삽입·파트 추출 파일별 처리".
````

**완료 기준**
- [ ] 현재 파일 범위의 로마 숫자 삽입 후 두 파일의 이름·파트·음표 수가 기대와 같다 (E2E 단언)
- [ ] P99 파일이 파트 추출 전체 실행 후 원본 그대로이고 경고 로그가 있다 (E2E 단언)
- [ ] `mergeTargets`에 길이 검사가 있고, 기존 23-scope·21패널 스펙이 모두 통과한다

---

### A2-2 · 템포 패널 정합성: duration 비례 변환 제거, 점음표 메트로놈 환산, BPM 범위 검증

**근거** B03, C07, B08, N5. `TempoPanel.run`(941~972)의 `optStretch` 분기가 duration을 0으로 만들고, `optMetro`와 마디별 템포는 beat-unit을 무시한 채 `per-minute=bpm`을 씁니다. 마디별 템포 BPM은 범위 검사가 없습니다.

````text
[A2-2] 템포 패널 정합성

1. TempoPanel(문자열 '템포 변경 중'으로 grep):
   - `optStretch` state, 칩 'duration 비례 변환', `run`의 `if(optStretch&&rat!==1){…}` 분기, 관련 deps를 모두 제거한다(결정 D1). 옵션 카드 설명에 "재생 속도는 sound tempo와 metronome 표기로 바뀝니다. 음표 길이는 바꾸지 않습니다."를 넣는다.
   - 헬퍼 `quarterBpmFromMetronome(metronomeEl)`를 유틸 구역에 추가한다(설계 2.7).
   - 원본 템포 감지(useEffect): `sound[tempo]`가 있으면 그 값(4분음표 기준). 없고 `metronome`만 있으면 `quarterBpmFromMetronome`로 환산한 값을 `origBpm`으로 쓰고 감지 문구를 `✓ 감지됨: 점4분음표=60 (4분음표 기준 90 BPM)`처럼 표기 단위와 환산값을 함께 보여준다.
   - `optMetro` 적용: `per-minute`를 `bpm`으로 덮지 않고 **비율**로 바꾼다. `newPerMinute=Math.round(oldPerMinute*(bpm/origBpm))`. per-minute가 숫자가 아니면(예: 'ca. 60') 건드리지 않고 로그에 `⚠ metronome 표기 '{원문}'은 숫자가 아니어서 바꾸지 않았습니다`.
   - `optSound`: `sound[tempo]=bpm` 유지(4분음표 기준). 새 direction을 만들 때 beat-unit은 quarter.
2. TempoChangePanel(문자열 '마디별 템포 변경 중'으로 grep):
   - BPM 입력 `onChange`는 문자열을 그대로 state에 두고(`ch.bpmText`), 표시용 `getTempoTerm`은 숫자로 바뀔 때만 보여준다. 입력에 `min=20 max=400`과 `aria-invalid={!isValidBpm(ch)}`를 준다. `isValidBpm`: `Number.isFinite(n)&&n>=20&&n<=400`.
   - `run` 시작에서 모든 지점을 검사해 하나라도 무효면 `❌ 템포 변경 {i+1}의 BPM '{값}'은 20~400 사이 숫자여야 합니다` 로그를 남기고 커밋하지 않는다.
   - 기존 `sound[tempo]`가 있는 direction을 갱신할 때 `per-minute`는 `quarterBpmFromMetronome` 역산으로 쓴다: `newPerMinute=Math.round(ch.bpm/배수)` (배수는 그 metronome의 beat-unit·dot에서 계산). 새 direction은 quarter 기준.
3. 픽스처 `tests/fixtures/f14-dotted-metronome.musicxml`(설계 2.8) 추가, 01-fixtures 목록 갱신.
4. 테스트:
   - `tests/e2e/panels/06-tempo.spec.js`: (a) f01에서 '템포 조절' 패널에 'duration 비례 변환' 버튼이 없고, 100→300 실행 후 `note duration` 텍스트가 모두 '1'이며 `sound[tempo]`가 '300'. (b) f14에서 원본 감지 문구에 '90'이 포함되고, 120으로 실행하면 `sound[tempo]`='120', `per-minute`='80'.
   - `tests/e2e/panels/07-tempochange.spec.js`: BPM에 '-60' 입력 후 실행 → 로그에 '20~400' 포함, `__mxlGetState().history.length` 불변, 입력 `aria-invalid="true"`.
   - 단위: `quarterBpmFromMetronome`는 HTML 함수라 단위 테스트가 없다. 대신 E2E (b)가 환산을 검증한다.
5. 설명서(manual/·MXL-Studio-사용자설명서/ 두 사본)와 퀵스타트의 템포 설명에서 duration 비례 변환 문구를 지우고 점음표 환산 한 줄을 넣는다. PDF·SVG 재생성은 A2-11.
6. `npm test`, 06·07 스펙, 스모크 실행 후 종료 보고. 커밋 "템포 패널 정합성: duration 변환 제거, 점음표 메트로놈 환산, BPM 검증".
````

**완료 기준**
- [ ] 100→300 실행 후 f01의 duration이 전부 1이고 재생 가능 (E2E 단언)
- [ ] f14 120 BPM 적용 후 `sound tempo 120 / per-minute 80` (E2E 단언)
- [ ] 음수 BPM이 커밋되지 않고 입력이 `aria-invalid` (E2E 단언)

---

### A2-3 · 숫자 악보: 생성 가사 표식·원본 백업·복원, 마디별 조표, 옥타브 점, 중복 모드 정리

**근거** B04, E37, C03, C04, N1. `NumberingPanel`(2479~2547)의 기준선이 다른 패널 커밋으로 덮이고, 이동도는 첫 조표만 쓰며, 옥타브 점은 1개뿐이고, '숫자 (도=1)'과 '고정 도법'이 같습니다.

````text
[A2-3] 숫자 악보 코어 분리와 복원 정합성

1. `numbering-core.js`를 설계 2.6대로 만들어라(`(function(global){ 'use strict'; … global.NumberingCore={…}; })(window);`).
   `<head>`에 `<script src="numbering-core.js?v=1"></script>`를 measure-core.js 다음에 넣고 `missingLibraries`에 'NumberingCore'를 추가한다.
   HTML의 `noteToNumStr`·`getKeyRoot`는 삭제하고 호출처를 코어로 바꾼다(미리보기 `preview` useMemo 포함).
2. NumberingPanel(문자열 '숫자 악보 생성 중'으로 grep):
   - 번호 체계 칩을 '고정 도법 (C=1)'(기본, mode 'fixed'), '이동 도법'('movable'), '한국어 계이름'('korean'), '기존 가사 복원'('original') 4개로 줄인다(결정 D5). '숫자 (도=1)' 칩과 'solfege' 모드를 제거한다.
   - 옵션 카드에 '기준 옥타브' `<select>`(2~6, 기본 4, aria-label "기준 옥타브")를 추가한다. 점 표시가 꺼져 있으면 비활성.
   - 생성(`mode!=='original'`): 파일마다 `doc=cloneDoc(file.xmlDoc)`; `NumberingCore.removeGeneratedLyrics(doc)`;
     `keepLyrics`가 아니면 `backup=file.lyricBackup||NumberingCore.backupLyrics(doc)`를 만든 뒤 표식 없는 lyric을 제거하고, 맞으면 backup은 기존 `file.lyricBackup`을 유지한다;
     마디마다 `fifths=NumberingCore.fifthsForMeasure(part,measure)`로 `generateNumberLyrics`를 호출한다(movable·showSharp에 필요);
     `commitFile(file,doc,{lyricBackup:backup})`. `baselineRef`·`lastOutRef`·관련 useEffect는 삭제한다.
   - 복원(`mode==='original'`): `file.lyricBackup`이 없으면 `updatedFiles.push(file)`과 `⚠ {name}: 이 세션에서 숫자 악보를 만든 기록이 없어 복원할 원본 가사가 없습니다` 로그. 있으면 `removeGeneratedLyrics` 후 `restoreLyrics(doc,backup)`; 로그 `✓ {name}: 원본 가사 {restored}개 복원{missing?`, ${missing}개는 음표를 찾지 못함`:''}`; `commitFile(file,doc,{lyricBackup:undefined})`.
   - 패널 설명에 "원본 가사 백업은 이 브라우저 탭 안에서만 유지됩니다(세션 저장·새로고침 뒤에는 복원할 수 없습니다)."를 넣는다.
3. 단위 테스트 `tests/unit/numbering-core.test.js`(jsdom, 픽스처 f06·f10):
   - octaveDots: (4)→{0,0}, (5)→{1,0}, (7)→{3,0}, (2)→{0,2}, (0)→{0,3}; baseOctave 3일 때 (5)→{2,0}.
   - noteToNumStr fixed: C4→'1', F#4(alter 1, showSharp)→'#4', C5→'˙1', C6→'˙˙1', C3→'1˙', C2→'1˙˙'. korean: C4→'도', C5→'˙도'.
   - noteToNumStr movable: fifths 3(A장조) E4→'5', F#4→'6', C4→'♭3'(showSharp) / '3'(showSharp 끔); fifths −1(F장조) Bb4→'4'.
   - fifthsForMeasure(f10 첫 파트): 2마디→0, 3마디→3, 4마디→3.
   - f06에 generateNumberLyrics 2회 → `lyric[name="mxl-studio-number"]` 수가 음표 수와 같고(중복 없음), backupLyrics→removeGenerated→restoreLyrics 왕복 후 `lyric text` 텍스트 배열이 원본 ['아','리','랑']과 같다.
4. E2E `tests/e2e/panels/16-numbering.spec.js`:
   - f06 → 고정 도법 생성 → 색깔 악보 패널 실행 → 숫자 악보 패널 '기존 가사 복원' 실행 → `lyric text` 텍스트가 ['아','리','랑'], 숫자 가사 0개, 로그에 '3개 복원'.
   - f06 → '기존 가사 유지' 켬 → 생성 2회 → `lyric` 총수가 원본 3 + 음표 수(7)로 1회 생성과 같다.
   - f10 → 이동 도법 생성 → `measure[number="3"] lyric text`가 '5'(E3, A장조), `measure[number="4"]`가 '6'(F#3). 점 표시 켠 상태에서 3옥타브 음은 '5˙'·'6˙'이므로 비교 전에 '˙'를 제거하거나 기대값에 포함한다.
   - 패널에 '숫자 (도=1)' 버튼이 없다. tests/e2e/20-lazy-panels.spec.js의 '기존 가사 복원' 클릭은 그대로 통과해야 한다.
5. 설명서·퀵스타트의 숫자 악보 항목(번호 체계 4개, 기준 옥타브, 복원 범위)을 고친다.
6. `npm test`, 16·20 스펙, 스모크 실행 후 종료 보고. 커밋 "숫자 악보 코어 분리, 생성 가사 표식과 원본 백업 복원, 마디별 조표·옥타브 점".
````

**완료 기준**
- [ ] 숫자 생성 → 색깔 악보 → 복원 후 원본 가사가 돌아온다 (E2E 단언)
- [ ] 반복 생성해도 가사가 쌓이지 않는다 (단위·E2E 단언)
- [ ] 이동도가 마디별 조표를 따르고 옥타브 점이 옥타브 수만큼 찍힌다 (단위 단언)

---

### A2-4 · 내보내기: 미리보기 무효화, ZIP 이름 충돌, Ossia 포함, 색깔 악보 filled

**근거** B05, B06, N3, C13, C14. `ExportPanel`(1919~2155)은 미리보기와 저장 대상의 짝을 확인하지 않고, PNG ZIP·12조 ZIP은 같은 stem을 덮어쓰며, Ossia는 어느 내보내기에도 없고, ColorPanel은 모든 음표에 `filled="yes"`를 씁니다.

````text
[A2-4] 내보내기 정합성

1. ExportPanel(문자열 'PNG 생성 중'으로 grep):
   - `previewSourceRef=useRef(null)`를 두고 `loadPreview` 성공 시 `{index:selIdx, xmlDoc:file.xmlDoc, ossiaMxml:file.ossiaMxml}`를 기록한다.
   - `useEffect`로 `selIdx`·`files` 변경 시 `const current=files[selIdx]; if(previewReady&&(!current||previewSourceRef.current?.index!==selIdx||previewSourceRef.current?.xmlDoc!==current.xmlDoc||previewSourceRef.current?.ossiaMxml!==current.ossiaMxml)){setPreviewReady(false);previewRef.current.innerHTML='';setLog([{m:'ℹ 선택 파일이나 악보가 바뀌어 미리보기를 지웠습니다. 다시 실행하세요.',t:'info'}]);}`
   - `exportPNG`·`exportSVG`·`exportPDF`는 시작에서 같은 조건을 다시 검사해 어긋나면 `notify('미리보기와 선택 파일이 다릅니다. 미리보기를 다시 실행하세요.','warn')` 후 중단한다.
2. Ossia 포함(결정 D7):
   - 헬퍼 `renderScoreToSvgs(file, container, {zoom=1, ossiaZoom=0.65})`를 만들어 `xmlDoc` OSMD 렌더와, `file.ossiaMxml`이 있으면 두 번째 컨테이너에 `drawTitle:false, drawCredits:false` 옵션으로 Ossia 렌더를 수행해 `{main:svgEl, ossia:svgEl|null}`을 반환한다. `loadPreview`와 `exportAllPNG`가 이것을 쓴다. 미리보기 영역은 뷰어와 같은 순서(Ossia 위, 본보 아래)로 보인다.
   - PNG 변환은 두 SVG를 위아래로 쌓는다: 캔버스 높이 = `(ossiaH+gap+mainH)*scale`, gap 12px. SVG 저장은 두 SVG를 하나의 `<svg>`로 감싸(`<g transform="translate(0,ossiaH+gap)">`) 저장한다. Ossia가 없으면 기존과 동일한 출력이어야 한다(기존 12-export 스펙 통과).
   - App의 `exportMXL`·`exportXML`(문자열 'const exportMXL='·'const exportXML='로 grep, 헤더 MXL 버튼과 파일 메뉴 'MXL(.mxl) 내보내기'·'MusicXML(.xml) 내보내기'가 호출): `file.ossiaMxml`이 있으면 `notify('Ossia '+label+'은(는) MusicXML에 포함되지 않습니다. 세션·공유·PNG/SVG에는 포함됩니다.','warn')`를 다운로드 직전에 1회 띄운다.
3. 이름 충돌(B06·N3): 유틸에 `uniqueStem(stem,used)`(설계 2.7)를 추가하고
   - `exportAllPNG`: `const used=new Set(); … const bn=uniqueStem(safeFileStem(base), used); zip.file(`${bn}.png`,blob)`.
   - TransposePanel all12: `const usedStems=new Set();` 대상 파일마다 `const stem=uniqueStem(safeFileStem(base(file)),usedStems)`.
   - 로그의 파일명도 실제 엔트리 이름을 쓴다.
4. ColorPanel(문자열 '색깔 악보 생성 중'으로 grep): `nh.setAttribute('filled','yes')`를 제거하고 기존 `filled` 속성이 있으면 그대로 둔다. 색만 바꾼다(C14).
5. 테스트:
   - `tests/e2e/panels/12-export.spec.js`: (a) f01·f02 업로드 → f01 미리보기 → 파일 선택 f02 → 내보내기 카드가 사라지고 안내 로그 → 미리보기 재실행 → SVG 저장 → `suggestedFilename()==='f02-two-parts.svg'`이고 파일 내용에 'Violin' 포함.
     (b) f01 업로드 후 `setInputFiles`로 같은 픽스처를 `{name:'f01-basic.xml', mimeType:'application/xml', buffer}`로 추가 → 미리보기 → 전체 PNG ZIP → 엔트리 이름이 ['f01-basic (2).png','f01-basic.png'](정렬 후) 2개.
     (c) f01 → Ossia 패널에서 1~2마디 Ossia 추가 → 이미지 패널 미리보기 → PNG 저장 → 다운로드 PNG의 높이가 Ossia 없이 저장했을 때보다 크다(두 번 저장해 비교) 그리고 상단 MXL 저장 시 '포함되지 않습니다' 알림이 보인다.
   - `tests/e2e/panels/01-transpose.spec.js` all12: 같은 stem 두 파일(위 (b) 방식)로 실행 → 엔트리 24개, 폴더 'f01-basic/'와 'f01-basic (2)/' 둘 다 존재.
   - `tests/e2e/panels/13-color.spec.js`: f06 색깔 악보 후 `note notehead[filled]` 0개, `notehead[color]`는 음표 수와 같다.
6. 설명서의 이미지/PDF 항목에 "Ossia는 PNG·SVG에 포함되고 MXL·XML에는 포함되지 않습니다", "같은 이름의 파일은 (2) 접미로 구분됩니다"를 넣는다.
7. `npm test`, 12·13·01 스펙, 스모크 실행 후 종료 보고. 커밋 "내보내기 미리보기 무효화, ZIP 이름 충돌 방지, Ossia 이미지 포함, filled 속성 제거".
````

**완료 기준**
- [ ] 파일 전환 후 저장이 막히고 재실행 뒤 올바른 파일이 저장된다 (E2E 단언)
- [ ] 같은 stem 2파일의 PNG ZIP·12조 ZIP 엔트리 수가 로그와 같다 (E2E 단언)
- [ ] Ossia가 PNG에 합성되고 MXL 저장 시 경고가 뜬다; 색깔 악보에 `filled` 속성이 없다 (E2E 단언)

---

### A2-5 · 히스토리 기준점, A-B 해제 종료, 반복 기호 경고 표시

**근거** B07, B10, C16. `clearHistory`(4126)가 현재 악보를 버리고, 재생 중 A-B를 끄면 종료 이벤트가 없으며, `extractPlaybackData`의 `warnings`를 아무도 보여주지 않습니다.

````text
[A2-5] 히스토리·재생 정합성

1. App.clearHistory(문자열 '히스토리를 모두 지웠습니다'로 grep): 파일이 있으면
   `const next=GlobalHistoryCore.pushHistoryEntry([],-1,files,'기준점 (지우기 전 상태)');historyStateRef.current=next;setHistory(next.history);setHistoryIndex(next.index);`
   (`GlobalHistoryCore`는 mxl-studio.html 518의 `window.HistoryCore` 별칭)
   파일이 없으면 기존처럼 빈 기록. 알림 문구는 "이전 기록을 지우고 현재 악보를 기준점으로 남겼습니다."(결정 D6). HistoryPanel의 '모두 지우기' 버튼은 기록이 기준점 1개뿐이면 비활성.
2. MidiPlayer(문자열 'function MidiPlayer'로 grep):
   - `endEventIdRef=useRef(null)`. 종료 예약 함수 `scheduleEnd()`를 만들어 `Tone.Transport.scheduleOnce(…, Math.max(0.1,totalDuration))`의 반환 id를 저장하고, 기존 `schedulePlayback`의 `!loopEnabled` 분기가 이것을 쓰게 한다. `clearEnd()`는 `Tone.Transport.clear(id)`.
   - 루프 effect(`Tone.Transport.loop=loopEnabled` 3줄이 있는 useEffect): 재생 중 `loopEnabled`가 false가 되면 `clearEnd(); if(Tone.Transport.seconds>=totalDuration-0.05){handleStop();} else scheduleEnd();`, true가 되면 `clearEnd()`.
   - 위치 폴링 effect: `!loopEnabled && sec>=totalDuration`이면 `handleStop()`에 준하는 종료(커서 리셋, isPlaying false, position=totalDuration)를 한 번 수행한다(안전망).
   - `playbackData.warnings`가 있으면 플레이어 상단에 `<div className="player__warning" role="status">` 로 각 문구를 표시한다. 스타일은 styles.css에 `.player__warning` 추가(경고색, 작은 글씨).
3. playback-core.js `extractPlaybackData`의 warnings를 설계 2.5대로 확장한다. 단위 테스트 `tests/unit/playback-core.test.js`에 f17 케이스: warnings 길이 1 이상, 문구에 'D.C.'와 'Fine' 포함(중복 없음); f08(반복 괄호만)은 warnings 0.
4. 픽스처 `f17-dacapo.musicxml`(설계 2.8) 추가, 01-fixtures 갱신.
5. E2E:
   - 24-audit-regressions: 'history clear keeps a baseline': f01 → 조옮김 반음 +2 → 히스토리 '모두 지우기' → 반음 +2 → 실행 취소 버튼 활성 → 클릭 → `getPitches(page,{measure:1})[0]==='D/4'`.
   - `tests/e2e/18-cursor.spec.js`에 'turning the A-B loop off mid-playback still stops at the end': f01, A-B 켬, 재생, 300ms 뒤 A-B 끔, `totalDuration+1.5초` 대기 → 재생 버튼이 재생 상태가 아니고 커서가 리셋(기존 스펙의 판정 방식 재사용).
   - 24-audit-regressions: f17 업로드 → `.player__warning`에 'D.C.' 포함.
6. `npm test`, 18·24 스펙, 스모크 후 종료 보고. 커밋 "히스토리 기준점 유지, A-B 해제 시 종료 예약, 반복 기호 미지원 경고 표시".
````

**완료 기준**
- [ ] 지우기 뒤 첫 편집을 되돌리면 지우기 전 악보가 복원된다 (E2E 단언)
- [ ] 재생 중 A-B를 꺼도 곡 끝에서 자동 종료된다 (E2E 단언)
- [ ] D.C./Fine 악보에서 플레이어에 경고가 보인다 (단위·E2E 단언)

---

### A2-6 · 세션 저장소: 쓰기 결과 검사와 안전한 구세션 이전

**근거** C11, C12. `writeJson`의 실패가 무시되어 `ok:true`가 나오고, 이전 실패 뒤에도 구저장 키를 지웁니다. 사용자 데이터가 조용히 사라지는 경로입니다.

````text
[A2-6] 세션 저장소 정합성

1. session-store-core.js를 설계 2.4대로 바꿔라. 공개 시그니처는 유지하되 반환 객체에 `reason`이 추가된다.
   - `tryWriteJson(key,value)`: storage 없음 → `{ok:false,reason:'no-storage'}`; `setItem` 예외 중 `error.name==='QuotaExceededError'||error.code===22||error.code===1014` → `'quota'`; 그 외 → `'storage-error'`.
   - `localSaveSession`: 본문 → index 순서로 쓰고 실패 시 롤백·실패 반환.
   - `saveSession`: idb 성공 시 `{ok:true,backend:'idb',size}`. idb 실패(`idbStore`가 null) 시 `localSaveSession` 결과를 그대로 반환. 두 백엔드 모두 실패면 `ok:false`.
   - `migrateFromLocalStorage`: 모두 성공해야 삭제·`migratedAt`. 실패가 있으면 키 유지, `migrationPending` 메타 기록, `{ok:false,migrated,failed}`. 다음 호출에서 `migratedAt`이 없으면 다시 시도한다.
2. App의 세션 저장 호출부(문자열 'saveSession('으로 grep, 자동 저장 포함)에서 `result.ok===false`면 `notify`로 이유를 보여준다: no-storage → '브라우저 저장소를 사용할 수 없어 세션을 저장하지 못했습니다. JSON 내보내기를 이용하세요.', quota → '저장 공간이 부족합니다. 오래된 세션을 삭제하거나 JSON으로 내보내세요.', too-large → 기존 문구 유지. 자동 저장 실패는 세션 모달의 자동저장 행에 '마지막 저장 실패: {이유}'로도 표시한다. 같은 이유의 알림은 세션당 1회만 띄운다.
3. 단위 테스트 `tests/unit/session-store-core.test.js`에 추가(기존 테스트의 가짜 storage 방식 재사용):
   - localStorage·IndexedDB 모두 없는 전역에서 `saveSession` → `ok:false, reason:'no-storage'`; `loadSession` → null.
   - `setItem`이 QuotaExceededError를 던지는 storage에서 `saveSession` → `reason:'quota'`, index에 id가 남지 않는다.
   - 구세션 키에 4MB 초과 세션 1개 + 정상 슬롯 1개를 두고 `migrateFromLocalStorage` → `ok:false, migrated:1, failed.length 1`, 구세션 키 2개 모두 남아 있고 `migratedAt` 없음; 초과 세션을 제거한 뒤 다시 호출하면 `ok:true`, 키 삭제, `migratedAt` 기록.
4. `npm test`, `npx playwright test tests/e2e/12-session-modal.spec.js tests/e2e/22-autosave-lazy-audio.spec.js --project=chromium`, 스모크 후 종료 보고. 커밋 "세션 저장 실패 전파와 구세션 이전 보호".
````

**완료 기준**
- [ ] 저장소 불가·용량 초과가 `ok:false`와 이유로 전파되고 UI에 보인다 (단위 단언 + 수동 확인 1회)
- [ ] 이전 실패 시 구저장 키가 남고, 성공 시에만 지운다 (단위 단언)
- [ ] 기존 세션 모달 E2E 통과

---

### A2-7 · 화음 판정 코어 통합: 최소 음 수, 조표 철자, 박 단위 수직 분석, 마디 번호

**근거** C01, C02, C15, C18(마디 번호), D9·D10. HTML `detectChord`와 코어 `identifyChord`가 각각 불충분한 음집합을 확정하고, 수직 음향 분석은 마디 전체를 합치며 `index+1`로 마디를 적습니다.

````text
[A2-7] 화음 판정 코어 통합

1. chord-tools-core.js에 설계 2.1의 `detectChordFromPitchClasses`, `spellPitchClass`, `chordSymbolText`를 추가하라. 기존 export는 유지한다.
2. roman-analysis-core.js의 `identifyChord`를 설계 2.2 첫 두 행대로 바꾸고 `analyzeVerticalities(xmlDoc,{fifthsByMeasure})`를 export 하라. `collectMeasureBeats`는 그대로 재사용한다.
3. mxl-studio.html:
   - `detectChord` 함수를 삭제한다.
   - ChordsPanel.run(문자열 '코드 분석 중'으로 grep): `RomanAnalysis.analyzeVerticalities(file.xmlDoc)` 결과를 마디 number별로 묶어 `  마디 {number}: {박1} {코드} · {박2} {코드}` 형식으로 출력한다(박은 `beat` 문자열, 코드는 `chordSymbolText` 또는 '?'). 코드 철자는 그 마디의 `fifths`(MeasureCore.keyFifthsAt) 기준.
   - ChordToolsPanel '코드 분석 & 삽입'(문자열 '코드 분석 & 삽입 중'으로 grep): 같은 분석을 쓰되 마디당 **첫 박의 확정 코드**만 삽입한다(기존 "마디당 1개" 동작 유지). 미확정이면 건너뛰고 로그에 `⚠ 마디 {number}: 음이 {n}개라 코드를 확정하지 않았습니다`. 마디 찾기는 `MeasureCore.measuresByNumber`.
   - StatsPanel 진행 요약(`detectChord(ns)` 호출부)은 `ChordToolsCore.detectChordFromPitchClasses(ns,{fifths})`로 바꾸고 null은 건너뛴다. `analyzeVerticalities`는 `collectMeasureBeats`의 `bass`를 `{bass}`로 넘긴다.
   - RomanAnalysisPanel 설명 문구에서 "첫 조표를 기준으로"를 지우고 "음이 3개 이상 겹치는 박만 화음으로 확정합니다"를 넣는다(조표 처리는 A2-8).
4. 단위 테스트:
   - `tests/unit/chord-tools-core.test.js`: ([1])→null, ([0,2])→null, ([0,7])→{quality:'5',symbol:'C5'}, ([0,4,7])→'C', ([1,5,8],{fifths:6})→'C#', ([1,5,8],{fifths:-5})→'D♭', ([8,0,3],{fifths:-4})→'A♭', ([8,0,3],{fifths:5})→'G#', ([0,3,7,10])→'Cm7', ([0,4,7,10],{})→'C7', ([0,3,6,9])→'Cdim7', ([2,5,9,0])→'Dm7'(베이스 D가 root), ([0,1,2])→null.
   - `tests/unit/roman-analysis-core.test.js`: identifyChord(new Set([0]))→quality 'unknown', chordName 'C(단음)'; (new Set([0,7]))→'unknown'; (new Set([0,4,7]))→'C'; f12 analyzeVerticalities 1마디 → 박 3개(onset 기준), f03(못갖춘마디) 첫 행 `measure===0`.
5. E2E `tests/e2e/panels/18-chords.spec.js`: f03 수직 음향 분석 → 로그에 '마디 0:' 포함; f02 → 단음만 있는 박은 '?'로 표시되고 삽입 실행 시 `harmony` 수가 확정 박 수와 같다. 기존 15-chordtools 스펙 통과.
6. `npm test`, 15·18·20 스펙, 스모크 후 종료 보고. 커밋 "화음 판정을 코어로 통합: 최소 음 수, 조표 철자, 박 단위 분석, 마디 번호".
````

**완료 기준**
- [ ] 단음·2음이 코드로 확정되지 않는다 (단위 단언 13케이스)
- [ ] 수직 음향 분석이 박 단위이고 못갖춘마디가 0으로 표기된다 (단위·E2E 단언)
- [ ] HTML에 `detectChord` 정의가 없다 (`grep -n "function detectChord" mxl-studio.html` 0건)

---

### A2-8 · 로마 숫자: 마디별 조표, 이조 악기 실음, IAC 종지, 단조 로그, 결과 초기화

**근거** C09, C10, C18(단조 로그·결과 잔류), E66. 로마 숫자 분석은 첫 조표·기보음만 쓰고 V6→I6을 PAC로 적습니다.

````text
[A2-8] 로마 숫자 분석 정확성

1. roman-analysis-core.js를 설계 2.2의 '마디별 조표'·'실음'·'종지' 행대로 바꿔라.
   - `getPitchMidi(note, transposeSemis=0)`; `collectMeasureBeats`는 파트별 누적 `<transpose>`를 계산해 넘긴다. `octave-change`도 반영한다.
   - `detectRomanNumeral` 행에 `keyName`·`tonicSemi`·`fifths`를 넣는다. 조표가 바뀐 마디부터 로마 숫자는 새 으뜸음 기준이다.
   - `CADENCE_TYPES`에 '불완전정격종지 (IAC)' 추가, `detectCadence`에 inversion 조건.
2. RomanAnalysisPanel:
   - `cadenceTypes` 배열에 IAC 추가(표시 순서: PAC, IAC, HC, PC, DC).
   - 로그 `${result.keyName}장조`를 `${result.mode==='minor'?result.keyName.toLowerCase()+'단조':result.keyName+'장조'}`로 바꾸고, 조바꿈이 있으면 `(마디 {n}부터 {keyName})`를 덧붙인다.
   - 결과 표의 각 행에 조성 열(그 행의 `keyName`)을 추가한다. 헤더 조성과 같으면 비워 둔다.
   - `useEffect(()=>{setAnalysis(null);setLog([]);},[file])`로 파일 전환 시 초기화한다(규칙 K-4).
   - 설명 문구에 "이조 악기는 `<transpose>`를 적용한 실음으로 분석합니다. 최상성부 종지 판정은 하지 않습니다."를 넣는다.
3. 픽스처 `f16-ensemble-transposing.musicxml`(설계 2.8) 추가, 01-fixtures 갱신.
4. 단위 테스트 `tests/unit/roman-analysis-core.test.js`:
   - f16 detectRomanNumeral → rows[0].chordName 'C', roman 'Ⅰ'.
   - f10 → 3마디 행의 `keyName` 'A', 4마디도 'A'; 1~2마디 'C'.
   - detectCadence({degree:5,inversion:1,quality:'M'},{degree:1,inversion:1,quality:'M'}) → IAC; inversion 0·0 → PAC; prev quality 'unknown' → null.
   - 합성: 파트에 `<transpose><chromatic>-2</chromatic><octave-change>-1</octave-change></transpose>`를 두고 기보 D5 → 실음 midi가 C4(60).
5. E2E `tests/e2e/panels/19-roman.spec.js`: f04 분석 → 버튼 문구 'a단조 분석 시작', 로그에 '단조' 포함·'장조' 없음; f16 분석 → 표에 'C' 코드와 'Ⅰ'; f01 분석 후 파일탭으로 다른 파일 전환 → 결과 표 사라짐.
6. `npm test`, 19 스펙, 스모크 후 종료 보고. 커밋 "로마 숫자 분석: 마디별 조표, 이조 악기 실음, IAC 종지, 단조 표기".
````

**완료 기준**
- [ ] f16이 C장3화음으로 분석된다 (단위·E2E 단언)
- [ ] 조바꿈 뒤 행의 조성이 새 조표다 (단위 단언)
- [ ] 단조 로그·IAC·파일 전환 초기화 (E2E 단언)

---

### A2-9 · 통계·조옮김 코어: 마디 수 기준, 단조 분류, 복수 보표 조표, 음정 철자

**근거** B09, C08, N6, C05, C06, N4.

````text
[A2-9] 통계와 조옮김 정확성

1. StatsPanel(문자열 '통계 분석 중'으로 grep):
   - 기본 분석 `tm`은 첫 파트의 마디 수(`MeasureCore.firstPart(doc)` 기준 `measure` 수)로 바꾸고, 카드에 '마디 N · 파트 P개'로 표시한다. 음표·쉼표는 전체 파트 합계 그대로이고 라벨을 '음표 (전체 파트)'로 바꾼다.
   - 작곡 스타일 분석 카드 제목에 '(첫 파트 선율 기준)'을 붙인다. 마디 수는 기본 분석과 같은 값이어야 한다.
   - 최저음·최고음: `midiToNote` 대신 실제 음표의 `{step,alter,octave}`를 기억해 `fmtNote`로 표시한다(N6).
   - `topKeys`: `key mode`를 함께 읽어 minor면 `MINOR_KEY_NAMES[keyIndexOfFifths(fifths)]`, 아니면 `KEY_NAMES[...]`(C08). 두 표 모두 KEY_FIFTHS 인덱스를 공유한다.
2. transpose-core.js를 설계 2.3대로 바꿔라(`tonicFifths`, `options.interval`, 모든 `key` 갱신, 보표별 철자).
3. TransposePanel 음정 모드(문자열 '지원하지 않는 조합'으로 grep):
   - `const diatonic=(ivNum-1)*ivDir; const chromatic=computeIntervalSemis(ivNum,ivQual)*ivDir;` 를 `transposeDoc(file.xmlDoc, chromatic, null, {interval:{diatonic,chromatic}})`로 넘긴다. `transposeDoc`에 네 번째 인자 `extra`를 추가해 `transposeDocument(doc,semitones,{preferFlat,targetFifths,...extra})`로 전달한다.
   - 품질 칩: `ivNum`이 1·4·5·8이면 `[{id:'major',label:'Perfect (P)'},{id:'augmented',…},{id:'diminished',…},{id:'double-augmented',…},{id:'double-diminished',…}]`, 아니면 기존 6개. id는 바꾸지 않는다(N4). 완전음정에서 'minor'가 선택돼 있으면 'major'(=완전)로 되돌린다.
   - 로그는 `✓ {name} → ↑ 감5도 (+6반음, 온음계 +4)` 형식으로 온음계 간격도 적는다. 라벨 한글: Perfect 완전, Major 장, Minor 단, Augmented 증, Diminished 감, Double Aug. 겹증, Double Dim. 겹감 + 도수.
4. 픽스처 `f15-two-staff-keys.musicxml`(설계 2.8) 추가, 01-fixtures 갱신.
5. 단위 테스트 `tests/unit/transpose-core.test.js`:
   - tonicFifths: C→0, G→1, F→−1, F#→6, Gb→−6, Cb→−7, C#→7, G#(alter 1 of G)→8이면 null.
   - f15 transposeDocument(+2) → `key[number="1"] fifths`='2', `key[number="2"] fifths`='2', 보표2 C3→D3.
   - f01 transposeDocument(6,{interval:{diatonic:4,chromatic:6}}) → 첫 음 C4→Gb4, key fifths '-6'; (6,{interval:{diatonic:3,chromatic:6}}) → F#4, fifths '6'.
   - transposePartRange(f15 첫 파트, 1,1,+2) → 두 key 모두 '2'.
6. E2E: `tests/e2e/panels/01-transpose.spec.js`에 'diminished fifth keeps the diatonic spelling': f01 → '음정 이동 (Interval)' → 5th → 'Diminished (d)' → '↑ 위로' → 실행 → `getPitches(page,{measure:1})[0]==='Gb/4'`; 5th 선택 시 'Perfect (P)' 칩이 있고 'Major (M)'이 없다.
   `tests/e2e/panels/20-stats.spec.js`: f02 기본 분석 '마디 4'·'파트 2개'; f04 작곡 스타일 분석의 조성 상위에 'Am'.
7. `npm test`, 01·20 스펙, 스모크 후 종료 보고. 커밋 "통계 마디·조성 기준 정리, 복수 보표 조표 갱신, 온음계 음정 조옮김".
````

**완료 기준**
- [ ] f02 기본 분석과 작곡 스타일 분석의 마디 수가 모두 4 (E2E 단언)
- [ ] f15 +2 후 두 보표 조표가 모두 2 (단위 단언)
- [ ] 감5도 ↑가 G♭4, 조표 −6 (단위·E2E 단언)

---

### A2-10 · 접근성·오류문·작은 정합성 묶음

**근거** C17, R10·R52, E17, E51·E54, E30, R56. 각각은 작지만 사용자가 매일 만나는 표면입니다.

````text
[A2-10] 접근성·오류문·작은 정합성

1. 키보드(C17):
   - TempoPanel 프리셋 `div.tempo-preset` → `<button type="button" className="tempo-preset …" aria-pressed={활성}>`; 눈금 `span.tempo-marks__tick` → `<button type="button" className="tempo-marks__tick" aria-label={`${v} BPM`}>`.
   - ClefPanel `div.clef-btn` → `<button type="button" className="clef-btn …" aria-pressed={선택}>`. 내부 div 구조는 유지. styles.css에서 `.tempo-preset`, `.tempo-marks__tick`, `.clef-btn`에 `appearance:none; border:0; background:none; font:inherit; text-align:inherit;` 초기화와 `:focus-visible` 외곽선을 추가한다.
   - `tests/e2e/14-a11y-controls.spec.js`: Tab 이동으로 'F 음자리표' 버튼에 초점을 두고 Enter → `aria-pressed="true"`; 'Allegro' 프리셋 버튼에 Space → BPM 표시가 138. axe 검사(`tests/e2e/a11y/axe.spec.js`)가 serious/critical 0 유지.
2. 오류문(D12): 유틸 `friendlyError(e)` 추가. 대응표(정규식 → 한글):
   - /Unexpected token|JSON\.parse|Unexpected end of JSON/ → 'JSON 형식이 올바르지 않습니다'
   - /Corrupted zip|End of data reached|not a valid zip|Can't find end of central directory/i → 'MXL(ZIP) 파일이 손상되었거나 압축 파일이 아닙니다'
   - /given music sheet was incomplete|could not be loaded/i → '악보 데이터가 비어 있거나 불완전해 그릴 수 없습니다'
   - /No parts found|part-list/i → '악보에 파트 정보가 없습니다'
   - /Failed to fetch|NetworkError|Load failed/i → '네트워크에서 파일을 가져오지 못했습니다'
   출력은 `'{한글} ({원문 앞 80자})'`. 업로드 오류 로그, 세션 JSON 가져오기, 공유 링크 불러오기, 뷰어 `renderError`, 각 패널의 `'❌ '+e.message`를 `friendlyError(e)`로 바꾼다(전부 grep으로 치환).
   - E2E `tests/e2e/panels/21-upload.spec.js`: 깨진 ZIP(바이트 'PK\x03\x04junk')과 깨진 JSON 세션 가져오기 → 로그·알림에 한글 문구 포함.
3. 화성 쌓기 중복 방지(E17): HarmonyPanel 루프에서 3도 음을 만들기 전에 `anchor` 뒤에 이어지는 `chord` 음표 중 같은 step·alter·octave가 있으면 건너뛰고 `skipped`를 센다. 로그 `✓ {name}: {added}개 추가, {skipped}개는 이미 있어 건너뜀`. E2E 14-harmony: 같은 설정으로 2회 실행 → 음표 수가 1회와 같다.
4. 가사 스타일(E51·E54): 적용 옵션이 모두 꺼져 있으면 실행 버튼 비활성 + 설명 '적용할 항목을 하나 이상 켜세요'. `size`는 실행 시 4~72로 검사해 범위 밖이면 커밋하지 않고 로그. 입력 `onChange`는 문자열 유지 + `aria-invalid`.
5. 자리바꿈 '원위치'(E30): 버튼 설명에 "불러온 악보의 원래 슬래시 베이스도 함께 제거됩니다"를 적는다(동작 변경 없음).
6. 표기 변환 '보표 숨기기'(R56): 라벨을 '{파트} 파트 제거(출력에서 삭제)'로 바꾼다. 동작은 그대로. 현재 테스트는 이 라벨을 참조하지 않는다(`grep -rn "보표 숨기기" tests/`로 확인).
7. `npm test`, 14-a11y·11·14-harmony·17·21 스펙, a11y axe 스펙, 스모크 후 종료 보고. 커밋 "키보드 접근 버튼화, 오류문 한글화, 화성 중복 방지, 가사 스타일 검증".
````

**완료 기준**
- [ ] 음자리표·템포 프리셋·눈금이 `button`이고 키보드로 동작한다 (E2E 단언)
- [ ] 깨진 ZIP·JSON 오류가 한글로 보인다 (E2E 단언)
- [ ] 화성 쌓기 2회 실행 후 음표 수 불변, 가사 스타일 무옵션 실행 불가 (E2E 단언)

---

### A2-11 · 회귀 매트릭스·문서 동기화·PR

**근거** Phase A의 A-10과 같은 마무리. 보고서의 "수정 순서 제안 4항(회귀 검증 사례)"을 자동 테스트로 확정합니다.

````text
[A2-11] 회귀 확인과 문서 동기화

1. `grep -n "detectChord\|getKeyRoot\|noteToNumStr\|optStretch\|baselineRef\|files.map((f,i)=>i===fileIndex" mxl-studio.html` 결과를 보고하라. NumberingCore·ChordToolsCore 호출을 제외하고 0건이어야 한다.
2. `tests/e2e/24-audit-regressions.spec.js`에 보고서 4항의 여섯 사례가 모두 있는지 확인하고 빠진 것을 채워라:
   (1) 2파일·다른 파트 ID 추출, (2) divisions 1·100→300 템포, (3) 가사→숫자→색깔→복원, (4) 미리보기 후 파일 변경, (5) 동명 다른 확장자 ZIP, (6) 반복 중 A-B 해제. 이미 다른 스펙에 있는 것은 그 스펙 이름을 주석으로 적고 중복 작성하지 않는다.
3. 전체 검증: `npm test`, `npx playwright test --project=chromium`, `npx playwright test --project=mobile --grep @ux`를 실행하고 통과·제외 수를 기록한다. 제외는 Phase A와 같은 4개(시각 3·모바일 너비 1)여야 한다.
4. 문서:
   - README 검증 현황 표에 2026-MM-DD Phase A2 행 추가, 코어 목록에 numbering-core.js(11개), 픽스처 17개, 설계 문서 5번으로 이 문서 추가.
   - README-TESTING 픽스처 표에 f13~f17, 태그 표에 24-audit-regressions, 결과 문단.
   - docs/verification-report.md에 'Phase A2 재검증' 절(환경, 단위·E2E 수, 바뀐 동작 요약).
   - 설명서·퀵스타트: A2-2·A2-3·A2-4에서 고친 문구를 다시 확인하고 갱신일을 바꾼 뒤 `npm run docs:build`로 PDF·SVG 재생성(Linux이면 글꼴 대체를 context-notes에 적는다).
   - context-notes.md `## Phase A2 요약`: 검수 ID ↔ 수정 세션 ↔ 테스트 대응표, 바뀐 기본값(D1~D12), 바뀐 기대값, 남은 문제(4.4절 내용 중 실제로 남은 것).
   - checklist.md: `- [x] A2-11 · …`와 4.3절 종료 체크리스트.
5. 브랜치를 푸시하고 PR을 연다. 제목 "Phase A2 검수 대응: 데이터 보존·분석 정확성 수정". 본문에 1.1·1.2 표의 ID별 결과와 D1~D12를 적는다. CI 통과를 확인하고 병합하지 않은 채 사용자에게 보고한다. 커밋 "Phase A2 회귀 확인과 문서 동기화".
````

**완료 기준**
- [ ] 단위·E2E 전체 통과(제외 4개), 회귀 스펙에 보고서 4항 여섯 사례 포함
- [ ] README·README-TESTING·검증 보고서·설명서·checklist·context-notes 동기화, PDF·SVG 재생성
- [ ] PR 열림, CI 통과, 병합 전 보고

---

## 4. 실행 로드맵과 함정

### 4.1 순서와 의존성

```
A2-1 (문서 커밋·B01·B02)  ──┐
A2-2 (템포)                 │  독립. 1 다음 아무 순서나 가능
A2-3 (숫자 악보 코어)       │
A2-4 (내보내기)             │
A2-5 (히스토리·재생)        │
A2-6 (세션 저장소)        ──┘
A2-7 (화음 판정 코어)  → A2-8 (로마 숫자: A2-7의 identifyChord·analyzeVerticalities 전제)
A2-9 (통계·조옮김: A2-7의 ChordToolsCore 전제)
A2-10 (접근성·오류문: 다른 세션이 바꾼 라벨을 마지막에 정리)
A2-11 (회귀·문서·PR)
```

A2-1은 반드시 첫 번째입니다(데이터 덮어쓰기 경로). A2-2~A2-6은 서로 독립이라 순서를 바꿔도 되지만 커밋은 하나씩 합니다. A2-7은 A2-8·A2-9보다 앞서야 합니다.

### 4.2 알려진 함정

| 함정 | 대처 |
|---|---|
| `mergeTargets` 길이 검사 때문에 기존 패널이 예외를 던진다 | 모든 패널은 이미 `targetFiles` 순서로 push 하므로 던지지 않아야 한다. 던지면 그 패널에 B01과 같은 버그가 있는 것이니 고친다. 검사를 완화하지 않는다 |
| `lyricBackup`이 세션·공유·히스토리에 섞여 들어간다 | `buildSession`·공유 직렬화·`HistoryCore.pushHistoryEntry`는 `name·sourceName·xml·ossia*`만 담는다. 새 필드를 넣지 않는다. 히스토리 복원 뒤 백업이 없어지는 것은 D3의 한계로 설명서에 적는다 |
| Ossia PNG 합성에서 두 OSMD 컨테이너가 같은 id를 쓴다 | 컨테이너 id에 `Date.now()`와 용도 접미(`-main`/`-ossia`)를 붙인다. 렌더 후 반드시 `document.body.removeChild` |
| `transposeDocument`의 `options.interval`이 `targetFifths`와 충돌 | `interval`이 있으면 `targetFifths`는 무시하고 `tonicFifths`로 계산한다. 둘 다 주지 않도록 TransposePanel이 보장한다 |
| 완전음정에서 `ivQual==='minor'` 상태가 남아 `computeIntervalSemis`가 −1을 준다 | 도수 칩을 1·4·5·8로 바꿀 때 품질을 'major'(완전)로 되돌린다 |
| `identifyChord` 변경으로 기존 19-roman 스펙의 기대값이 바뀐다 | 유니슨 박이 '?'가 되는 것은 의도된 변경이다. 기대값을 고치고 context-notes에 적는다 |
| `friendlyError` 치환이 테스트 문구를 바꾼다 | 기존 스펙이 영문 원문을 기대하면 한글 문구로 기대값을 바꾼다. 원문은 괄호에 남으므로 `toContainText('원문 일부')`도 계속 통과한다 |
| 숫자 악보 칩 제거로 저장된 설정(`mode==='solfege'`)이 남는다 | 패널 state 초기값은 'fixed'. localStorage에 저장하지 않으므로 이전 상태는 없다 |
| 마디별 템포의 `bpmText` 전환으로 프리셋 버튼이 숫자를 넣는다 | 프리셋은 `bpmText=String(p.bpm)`으로 넣는다. 실행 시 `Number(ch.bpmText)`로 변환 |
| A-B 해제 종료 예약이 일시정지 상태에서 실행된다 | `scheduleEnd`는 `isPlayingRef.current`일 때만, `handlePause`·`handleStop`은 `clearEnd()`를 호출한다 |

### 4.3 Phase A2 종료 체크리스트

- [ ] 1.1·1.2 표의 모든 ID에 대응하는 테스트(단위 또는 E2E)가 있고 통과한다. 대응표는 context-notes `## Phase A2 요약`에 있다
- [ ] 다른 파일을 덮어쓰거나 파트·duration·가사를 비우는 경로가 없다: B01·B02·B03·B04 회귀 스펙 통과
- [ ] `mergeTargets` 길이 검사, 입력 범위 검사(BPM·크기), 산출물 이름 고유화가 들어 있다
- [ ] HTML에 `detectChord`·`getKeyRoot`·`noteToNumStr`·`optStretch`·`baselineRef` 정의가 없다
- [ ] 기본값 D1~D12가 코드·설명서·context-notes에서 서로 같다
- [ ] README·README-TESTING·검증 보고서·설명서(PDF·SVG)·checklist·context-notes 동기화, PR 열림

### 4.4 Phase A2 이후로 미루는 것

| 항목 | 이유 | 다음 단계 |
|---|---|---|
| 최종 PDF 인쇄 출력 검증, pageFormat·drawCredits, 한글 폰트 | 심층 분석 문서 Phase B(출력 파이프라인) 범위 | Phase B |
| Ossia를 MusicXML에 포함(별도 파트 또는 cue 표기) | 표준 요소가 없어 설계 결정 필요 | Phase B 또는 별도 |
| D.C./D.S./Fine/Coda 재생 | 점프 그래프 구현. A2-5는 경고만 | 재생 개선 단계 |
| 모바일 실기기·Safari·Firefox, 드래그앤드롭, 저장공간 가득 참 UI | 검수 보고서 미검증 범위 | 별도 QA |
| 화성단음계 3도, 다성부 임시표 문맥, 마디 중간 조바꿈 | Phase A 남은 문제 | 변환 정확도 후속 |
| 한국어 계이름의 이동도 옵션 | D5에서 고정도로 유지 | 숫자 악보 후속 |
| 로마 숫자 최상성부 종지 판정, 마디당 1개 삽입 제한 | D8의 한계 | 분석 후속 |
| 자리바꿈 '원위치'가 불러온 슬래시 베이스를 구분 | 생성 베이스 표식이 없음. A2-10은 설명만 | 코드 도구 후속 |
