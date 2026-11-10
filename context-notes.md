<!-- 설계 근거, 자율 판단, 검증 결과와 후속 작업 기록 -->
# Studio09 개발 기록

## 2026-09-03 · P0-4 픽스처
- f01~f09 총 9파일 OSMD 렌더 E2E 9개 통과(32.9초), console error 0. 실제 샘플은 경계 확인 후 git mv로 f09-real.mxl로 이동했습니다.
- 문서 불일치: f01은 실제로 2마디/8음표입니다. 원본 픽스처는 유지하고 3마디 이상의 범위 검증은 f03 또는 f02를 사용합니다.
- f07의 B♯는 F♯장조의 온음계 음이 아니라 변화음이므로 그 사실을 픽스처 주석에 표시했습니다.

## 2026-09-03 · 범위와 실행 원칙
- 사용자 요청에 따라 질문 없이 Phase 0~8을 순서대로 구현하고 검증합니다. Phase 9는 선택 확장 지침이며 현재 개선 시리즈의 필수 완료 범위 밖입니다.
- 문서의 승인·한 세션 제한은 사용자의 연속 자율 개발 요청에 맞게 단계별 기록으로 대체합니다.
- 줄 번호는 2026-09-03 스냅샷 기준이며 반드시 함수명으로 rg 재확인합니다.
- React 18 UMD + Babel Standalone 단일 HTML 구조를 유지합니다. 신규 순수 로직은 코어에 분리합니다.

## 2026-09-03 · P0-1 임시 산출물 보존
- 자율 결정: tmp/, tmp-ossia-box.png, tmp-score-designer-original/, .codex-push/를 삭제·이동하지 않고 .gitignore로만 제외합니다.
- 조사: tmp 0파일, tmp-ossia-box.png 1파일 193410B, tmp-score-designer-original 5파일 317539B, .codex-push 44092파일 914397547B.
- 최종 수정: 각각 2026-07-07 14:18, 2026-07-07 14:31, 2026-07-03 14:53, 2026-07-06 19:11 (KST).
- 이전 HTML 대비 현재 HTML: 604줄 추가, 812줄 삭제.
- 중첩 사본 원격: https://github.com/kimyounggaur/ScoreDesigner.git. 현재 프로젝트의 배포 원격으로 추정하지 않습니다.
- Git 사용자 설정이 없으므로 각 커밋은 명시적인 Codex <codex@localhost> 작업자 신원으로 기록합니다. 전역 사용자 설정은 바꾸지 않습니다.

## 2026-09-03 · P0-2 테스트 러너
- Windows 한글·공백 경로의 forks 워커 타임아웃을 피하려고 threads 풀과 20초 timeout을 사용합니다.
- 첫 유닛 검증: 5파일 14테스트 통과, Vitest 1.36초 (이 환경 Node 24.18.0).
- 기존 문서의 약 45초/2.5분은 이전 측정치입니다. 현재 환경 실측을 별도로 기록합니다.
- 초기 스모크에서 외부 폰트 load 이벤트 대기로 1개가 45초 타임아웃. 준비 조건을 domcontentloaded+앱 표시로 수정 후 npm run check: 유닛 14개(1.19초), 스모크 6개(32.5초) 모두 통과했습니다.

## 2026-09-03 · 분석 ID 목록
- BUG-01, BUG-02, BUG-03, BUG-04, BUG-05, BUG-06, BUG-07, BUG-08, BUG-09, BUG-10, BUG-11, BUG-12, BUG-13
- ROB-01, ROB-02, ROB-03, ROB-04, ROB-05, ROB-06, ROB-07, ROB-08, ROB-09
- UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08
- A11Y-01, A11Y-02, A11Y-03, A11Y-04, A11Y-05, A11Y-06
- PERF-01, PERF-02, PERF-03, PERF-04, PERF-05, PERF-06
- TEST-01, TEST-02, TEST-03, TEST-04
- OPS-01, OPS-02, OPS-03, OPS-04
- DOC-01, DOC-02, DOC-03

## 2026-09-03 · P1-1
재현 E2E 수정 전 D4 기대/C4 수신으로 실패, 수정 후 통과. 25개 패널 커밋 지점과 App.updateFiles 방어 경계 통일. npm run check: 유닛 15개, 스모크 7개(38.5초) 통과.

## 2026-09-03 · P1-2
transpose-core 6개 유닛 추가. Am→Bm, E7→F7, Bb→C, C/E→D/F#, 픽스처 전체·못갖춘마디 범위 통과. InstrumentPanel 음표 이동에 코드 이조 연결. RangePanel은 옥타브만 이동하므로 코드 pitch class 변경 없음. check 유닛 21개/스모크 7개, 코드심볼 E2E 1개 통과. 별도 재실행 원인: CDN Babel의 net::ERR_QUIC_PROTOCOL_ERROR를 trace로 확인해 테스트 Chrome에 --disable-quic 적용.

## 2026-09-03 · P1-3
files[0] 화면 정보 참조를 activeDoc로 통일하고 폴백 참조는 유지했습니다. 모든 files 기반 패널에 activeFile 의존성을 연결했습니다. 파일 제거 4가지 경우와 f02 파트 목록 전환 E2E 5개 통과. mxlStudioHistoryMeta는 읽기 없음 확인 후 쓰기/삭제 모두 제거. npm run check: 유닛 21개, 스모크 7개(37.1초) 통과.

## 2026-09-03 · P1-4
Ossia XML/메타 자동저장·공유 왕복 및 잘못된 Ossia XML 폐기 구현. buildMxlBlob이 container.xml+score.xml을 DEFLATE로 압축, 비압축 메뉴도 제공. check 22 unit/7 smoke 통과, Ossia 새로고침 복원 및 MXL ZIP 구조·재업로드 렌더 E2E 2개 통과(17.9초). console 참조 0.

## 2026-09-03 · SRI 계산 근거
Python urllib.request로 버전 고정 URL의 원문 바이트를 읽고 hashlib.sha384 → base64로 계산했습니다. 명령: `python tmp/compute-sri.py`.
- https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js: `sha384-tMH8h3BGESGckSAVGZ82T9n90ztNXxvdwvdM6UoR56cYcf+0iGXBliJ29D+wZ/x8`
- https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js: `sha384-bm7MnzvK++ykSwVJ2tynSE5TRdN+xL418osEVF2DE/L/gfWHj91J2Sphe582B1Bh`
- https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js: `sha384-ku9eM40vVDsFUiERorrdlHlF0LIhdfn716M7TntM72Uo98T7LWiogD3hNenPx8Q0`
- https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js: `sha384-+mbV2IY1Zk/X1p/nWllGySJSUN8uMs+gUAN10Or95UBH0fpj6GfKgPmgC5EXieXG`
- https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js: `sha384-c6Uo4N9c3SOEigMVzP6IshUG1wQ5uMp3xeoQFiHWAQ86joWdgyajkvopySyKy/Z6`
- https://cdn.jsdelivr.net/npm/opensheetmusicdisplay@1.8.9/build/opensheetmusicdisplay.min.js: `sha384-fg0GMOE+ryaeFG8a+kaykJwFk/KI5rLyPkxfxxHjlfBbC8HkEuNcl44thRQD6MzE`

## 2026-09-03 · P2-1
React createRoot 전환 후 스모크 7개 통과(48.3초), 유닛 22개 통과. OSMD 차단 시 한국어 스플래시, 정상 부팅, 패널 예외 격리·재시도 E2E 3개 통과(11.1초). 외부 스크립트 6개 SHA384 SRI 계산·적용. Tone 누락 시 재생 버튼 비활성 안내. SRI 계산 URL/결과는 위 기록.

## 2026-09-03 · P2-2
ScoreView 메인/Ossia 오류를 상태로 처리하고 다시 렌더 버튼 제공. 미사용 CursorTransportBar 참조는 정의 한 곳뿐이라 141줄 제거. 중복 SVG를 ActivityIcon으로 공유. npm run check: 유닛 22개, 스모크 7개(37초) 통과. 설계의 150줄 감소 수치는 실제 제거대상 141줄과 오류 UI 추가분 때문에 적용 불가하므로, 기능 없는 줄수 맞추기는 하지 않음.

## 2026-09-03 · P2-3
20MB/30개 제한, 중복 이름 sourceName 보존, 업로드 진행·에러 로그, 여러 rootfile 안내, 해제 후 크기 제한과 XML 루트 검증 추가. check 유닛22/스모크7(38.3초) 통과. 업로드 3개 E2E는 셀렉터를 좌측 패널로 한정한 뒤 모두 통과(15초).

P3-1 알림 분류: 사전조건 warn 48개, 실패 err 7개, 조치 필요 8초 err 1개. 제거된 미사용 재생 코드와 업로드 로그 전환 때문에 초기 59개보다 적습니다.

## 2026-09-03 · P3-1
alert 56개를 경고48/오류7/조치필요1로 분류하여 notify로 전환. useNotify/NotifyContext, 중복 억제·최대4개·자동/수동 닫기·polite/assertive 구현. 유닛22/스모크7(38.7초) 및 토스트 E2E 1개(10.7초) 통과. alert 참조 0. window.prompt는 P3-4 대체 예정.

## 2026-09-03 · P3-2
FileTabs 역할·로빙 포커스·좌우/Home/End/Delete, 업로드 목록 선택과 활성 스타일, 현재 파일 배지 구현. 파일 두 개 클릭/키보드 전환→Violin 렌더→닫기 보정 E2E 통과. check 유닛22/스모크7(39.9초) 통과. 앞선 activeFile E2E에서 f02의 두 파트 표시도 검증.

## 2026-09-03 · P3-3
좌우 토글·같은 액티비티 재클릭 닫기, Ctrl+B/Ctrl+Shift+B, 220~520px 포인터/키보드 너비 조절 및 localStorage 복원 구현. check 유닛22/스모크7(42.5초), 너비 저장·새로고침 및 토글 E2E 통과(10.2초).

## 2026-09-03 · P3-4
SessionModal 목록·저장·불러오기·삭제·이름변경·JSON 내보내기/가져오기, 덮어쓰기/삭제 인라인 확인, 공유/세션 포커스 트랩·Esc·이전 포커스 복귀 구현. 로컬 복구 사본 삭제 누락도 수정. 기존 정렬 테스트 확인. check 유닛23/스모크7(39.5초), 세션 E2E3개 통과(18.1초), prompt0.

## 2026-09-03 · P3-5
50~200% 줌·±/초기화/맞춤·Ctrl+±/0·로컬 보기 설정과 print before/after 줌 복원 구현. 두 PDF 경로를 printScore로 통일, 문서 제목 정리 및 복원, 인쇄 CSS에서 악보만 출력. ExportPanel 파일 선택과 현재 악보 연결. check23unit/7smoke(39.5초), 줌·인쇄 E2E 통과(6.6초). 1280x800 스크린샷 육안 확인, header overflow0/pageerror0. document.write0.

## 2026-09-03 · P4-1
Chip/Toggle/조성·카포 프렛/템포 프리셋/업로드를 네이티브 버튼으로 전환. Toggle7곳 label, 액티비티aria-pressed·이모지aria-hidden·히스토리 이름 추가. check23unit/7smoke(38.2초), Tab/Space만으로 조옮김 칩 및 파트 전환 E2E 통과. tmp/before-controls.png, after-controls.png 1280x800 비교: 기존 배치 유지, pageerror/헤더 overflow0.

## 2026-09-03 · P4-2
포커스 링·메뉴 role과 ↑↓/좌우/Enter/Esc·reduced-motion 구현. muted33참조의 색은 문서 제안 #8e8e93 대신 흰색 대비4.5:1을 충족하는 #63636a 사용(문서 제안은3.26:1로 작은 글씨AA미달). check23unit/7smoke(41.2초), 메뉴·모션 E2E 통과(7초). tmp/after-focus.png 캡처.

## 2026-09-03 · P4-3
390px 모바일 도구 목록/동일 패널 인스턴스 바텀 시트, 목록 복귀·포커스 트랩·내보내기 접기 구현. 누락된 NAV의 음자리표/가사스타일 등록. check23unit/7smoke(43.2초), 모바일 업로드→반음+2→D4 검증 E2E 통과(7.9초).

## 2026-09-03 · P5-1
조성·단조·이명동음 선택을 반영하는 diatonic 조옮김 코어, 이조 악기 메타데이터와 옥타브 처리. 단위 29개 및 smoke 7개 통과. f07 E# 및 겹임시표·하향 옥타브 검증.

## 2026-09-03 · P5-2
PlaybackCore 분리. tie/velocity/반복·ending/템포/못갖춘마디 및 합주 divisions 검증 포함 단위 37개, smoke 7개, 재생 E2E 1개 통과. f08 실제 Transport 6.5초→원본 1마디, 9초→2마디 오버레이 확인.

## 2026-09-03 · P5-3
OSMD 1.8.9 Cursor.ts의 실제 getter CurrentMeasureIndex/EndReached를 사용. 원본 마디 인덱스로 이동하며 500회 상한·reduced-motion 대응. 반복 점프와 실제 A-B loop 커서 복귀 E2E 2개 및 smoke 7개 통과. API: https://raw.githubusercontent.com/opensheetmusicdisplay/opensheetmusicdisplay/1.8.9/src/OpenSheetMusicDisplay/Cursor.ts

## 2026-09-03 · P5-4
단조·전위·부속화음과 프레이즈 경계 종지 분석 구현. f04 i,iv,V7,i 및 C/E=I6, D7→G=V7/V, 기존 G장조 회귀 포함 단위 41개와 smoke 7개 통과. 기존 장조 기본위치 유니코드 표기는 호환 유지, 전위·단조는 표준 ASCII 로마 숫자.

## 2026-09-03 · P5-5
코드 33종 왕복·슬래시·degree·N.C. 포함 단위 81개 및 smoke 7개 통과. Ossia 1~2가 실제 번호 1,2를 유지하며 0 제외 E2E 통과. 최초 E2E 실패는 버튼 이름 오기였으며 실제 이름으로 수정 후 통과.

## 2026-09-03 · P6-1
히스토리를 DOM 없는 직렬화 스냅샷으로 전환하고 동일 문자열 공유·50개 제한·주입식 parse/serialize 지원. 단위 84개 및 smoke 7개 통과. f09 업로드 뒤 코어로 12회 조옮김(13기록) 3회 측정: 고유 UTF-16 추정 16,648,068 bytes(15.88 MiB). clone CPU 243/229/332ms, string 411/634/403ms. JS heap은 native DOM을 포함하지 않으며 GC 변동이 커 총메모리 절감률로 해석하지 않음. 동일 문자열 집계는 엔진 내부 할당 보장이 아닌 추정값.

## 2026-09-03 · P6-2
초기 패널 21→2, 방문한 패널만 보존. baseline DOM 복제 제거 및 commitFile 이후 객체 동일성 감지 보완. 원래 가사 복원 선택 버튼 누락도 복구. 초기 개수/한국어 도 삽입/패널 왕복/아 복원 E2E와 smoke 포함 8개 통과. 미리보기 이탈 시 OSMD DOM 및 비동기 결과 정리.

## 2026-09-03 · P6-3
FNV-1a 콘텐츠 해시로 동일 상태 재저장 방지(savedAt 제외), 렌더 150ms debounce, SRI Tone.js 첫 클릭 로딩 구현. 자동저장/오디오실패/커서/스모크 검증 통과(지연 로드를 기다리지 않던 A-B 테스트를 보완 후 2개 통과). 단위 84개. 기존 기본 Babel env+react를 현대 브라우저용 react JSX 변환만 수행하도록 지정, 구조 보존. 초기 .app-root 3회 평균 4,176ms→2,175ms(약 48% 감소), 원시 4326/4418/3785→1920/1873/2731ms. 네트워크·동시 테스트 영향이 있어 벤치마크 보장치는 아님.

## 2026-09-03 · P7-1
21개 패널 파일별 실제 XML·다운로드 검증과 기록 undo/redo/jump/clear 추가. Pixel 5 @ux 프로젝트 포함 전체 84개 중 80 통과, 4 skip, 5.5분. skip은 모바일에서 불필요한 데스크톱 폭 1개와 Linux 정본 이미지 3개. 매트릭스가 음자리표 return 호출 오타와 display:none 미리보기의 폭 0 PNG 버그를 찾아 수정. f01은 2마디이므로 조바꿈 3마디는 f02 사용; A단조→fifths2 목표는 Bm으로 조성 유지.

### P7-2 · 로컬 검증 완료 / CI 기준 이미지 대기
axe 4장면 serious/critical 0, 최초 대비 위반과 수정은 docs/a11y-report.md. 시각 회귀 테스트와 Linux 생성 워크플로 준비. Windows에서 정본을 만들지 않았으며 3장은 사용자 GitHub 푸시 뒤 CI 생성·검토 대상. 체크박스는 외부 조건 미충족으로 미완료 유지.

## 2026-09-03 · P7-3
4개 YAML 구문 및 workflow_run 이름 일치 검증. Node24, 패널·axe 필수 CI, 공개 파일 allowlist Pages 배포, Nightly Linux 이미지 생성 artifact 추가. 저장소/Pages 주소는 미제공이므로 잘못된 고정 URL을 vars.PROD_BASE_URL로 대체하며 미설정 시 prod 작업만 skip. 사용자 지시에 따라 로컬 구현 자체승인; git push와 실제 GitHub 실행은 하지 않음.

## 2026-09-03 · P8-1
실제 21개 패널과 Phase 1~6 기능을 기준으로 사용자 설명서·퀵스타트·업데이트 안내를 다시 작성했습니다. 미구현 주석·청음·난이도·운지·QR 등은 예정 기능 절에만 격리했습니다. 새 화면 11장(데스크톱 10, 모바일 1)을 촬영했고 PDF 10/4/3쪽과 SVG를 재생성하여 전 페이지를 렌더 검토했습니다.

## 2026-09-03 · P8-2
두 이전 프롬프트 문서에 스냅샷 경고와 완료 상태표를 추가했습니다. README·테스트 가이드·검증 보고서에 8개 코어, 21개 패널, 태그, 실측, 문서 관계, 배포 주소와 Linux 기준 이미지 대기를 기록했습니다. 사용자 확인 저장소는 kimyounggaur/Score_Designer-Original-, Pages는 https://kimyounggaur.github.io/Score_Designer-Original-/mxl-studio.html 입니다.

## 2026-11-09 · Phase A 시작 (Studio10)
- 근거: 2026-11-09 심층 분석의 P0-1~P0-5, P0-7~P0-9, P1-11, P1-12, P2-4. 사용자 확정 사항은 all12 모드 존치와 변환 기본 범위 '열린 파일 전체' 유지입니다.
- 작업 환경: Linux 샌드박스, Node 22, Chrome for Testing 153. CDN(cdnjs·jsdelivr) 차단 환경이라 npm에서 받은 동일 바이트 파일(SRI 6개 일치 확인)을 로컬 HTTPS 미러로 제공하고 `--host-resolver-rules`로 연결해 E2E를 실행했습니다. 저장소 설정은 바꾸지 않았습니다.
- 기준선: 단위 84개 통과, E2E 80 통과 / 4 skip. 처음에는 12-session-modal의 JSON 다운로드 파일명이 `download`로 나와 2개가 실패했는데, 원인은 샌드박스에 UTF-8 로캘이 없어 Chrome이 한글 파일명을 버리는 것이었습니다(`LANG=C.UTF-8`에서 정상). 앱 결함이 아닙니다.

## 2026-11-09 · A-1
- `pitch-core.js`(PitchCore): readPitch, pitchToMidi, addInterval, shiftOctave, shiftNoteOctave, nearestShift, keySignatureAlter, accidentalName, insertNoteChild, alterInEffect, syncAccidental, diatonicThird, chromaticThird, CHORD_TONES, bassForInversion.
- `measure-core.js`(MeasureCore): measureNumber, firstPart, measuresByNumber({map,duplicates}), measureNumbers, keyFifthsAt, modeAt, effectiveAttributes, insertAttributesChild, leadingAttributes, segments.
- transpose-core에 keyTonic·keyInterval export 추가(기존 시그니처 불변). HTML에 두 코어를 로드하고 부팅 검사(missingLibraries)에 포함했습니다. Pages 배포는 `/*-core.js` 패턴이라 별도 수정이 필요 없습니다.
- 프롬프트 문서의 기대값 2건을 정정했습니다. F♯장조(fifths 6)에서 B는 제자리음이므로 keySignatureAlter(6,'B')=0이고, `keyInterval(0,7,7)`은 목표 조와 반음 수가 모순이어서 `keyInterval(0,1,7)`(C→G)로 바꿨습니다.
- syncAccidental은 같은 마디·같은 보표의 앞선 음표 변화표까지 고려합니다. 다성부에서 backup 이후 시간 역전은 문서 순서로 근사합니다. cautionary·editorial·parentheses 임시표는 지우지 않습니다.
- 픽스처 f10-keychange-clef.musicxml(3마디 3♯·F음자리표)을 A-10 예정보다 먼저 추가하고 @fixtures 렌더 목록에 넣었습니다.
- 검증: 단위 137개 통과(10파일), @smoke·@fixtures·@robustness 23개 통과.

## 2026-11-09 · A-2
- RangePanel: `PitchCore.shiftNoteOctave`로 `<octave>`만 바꿉니다. 로그는 "N개 음표 이동, M개 범위 밖 유지"(기존 수치는 옥타브 이동 횟수였음). 최저음>최고음이면 경고 후 중단.
- ClefPanel: 대상 파트(select)·보표(staves≥2일 때 칩) 선택 추가. 평균 높이는 대상 파트·보표 음표만으로 계산하고 옥타브만 이동합니다. 기존 `<clef>`만 바꾸며, 이전처럼 모든 `<attributes>`에 clef를 새로 만들지 않습니다(조표만 바뀌는 attributes에 불필요한 음자리표 변경이 생기던 문제). 대상 보표에 clef가 없으면 첫 마디 attributes에 스키마 순서로 만듭니다. 바꾼 clef의 `clef-octave-change`는 제거합니다.
- 픽스처 f12-piano-voices.musicxml(2단 보표, voice 1·5, 셋잇단, 명시 sharp) 추가. E2E 헬퍼 `getPitches(page,{measure,part})` 추가('F#/4' 형식).
- 검증: 04-range 2개(f07 소프라노 리코더: 4음 +1옥타브, 철자·임시표 불변), 09-clef 3개(f01 기존, f02 P1만, f12 2번 보표만), @fixtures 11개, 단위 137개, 스모크 7개 통과.

## 2026-11-09 · A-3
- transpose-core에 `transposePartRange(partEl, from, to, semitones, {startFifths, startMode, targetFifths, preferFlat, ensureKey})` 추가. 한 파트의 번호 구간을 조표 기준 음정(keyInterval)으로 옮기고, 구간 안의 기존 조바꿈은 같은 반음 수로 옮겨 상대 관계를 유지합니다. 시작 마디에 key가 없고 그 앞에 표기된 조표가 목표와 다르면 key(fifths·mode)를 스키마 순서로 삽입합니다. 이동량 0인 구간도 앞 구간이 바꾼 조표를 원래대로 되돌리기 위해 key를 넣습니다. 단위 테스트 5개.
- KeyChangePanel: 방향 칩(가까운 쪽/위로/아래로, 기본 가까운 쪽), 단조 악보면 "Dm minor" 등 단조 이름 표시, 마디 입력은 실제 마디 번호 범위로 제한, 미리보기 구간을 MeasureCore.segments로 계산. 이동량은 첫 파트(기준)의 원래 조→목표 조로 정하고 모든 파트에 같은 반음 수를 적용합니다. 조표가 다른 파트(이조 악기)는 keyFifthsAfter로 자기 목표 조표를 계산합니다.
- TransposePanel '특정 조로 변환'에 같은 방향 칩 추가(`PitchCore.nearestShift`). 나머지 모드는 그대로입니다.
- 기대값 수정: panels/02-keychange의 기존 테스트는 C→G에서 G4를 기대했는데 이는 항상 상행하던 버그를 전제로 했습니다. 가까운 쪽(-5반음) 결과 G3로 바꿨습니다.
- 검증: 02-keychange 4개(f02 기존, f07→E 가까운 쪽 철자·♭ 없음, f07 위로 E5, f04→Dm 단조·코드 Dm Gm A7 Dm), 01-transpose 4개(f04→Bm 기존, f01→B 가까운 쪽 B3/위로 B4/아래로 B3), 03-transpose-harmony, 14-a11y-controls, 단위 142개, 스모크 7개 통과.

## 2026-11-09 · A-4
- CapoPanel: 지점을 MeasureCore.segments로 구간화하고 구간마다 원본 대비 -프렛을 `transposePartRange`로 적용합니다(이전에는 앞 구간 이동량이 누적되어 2지점 카포의 둘째 구간이 -6반음, 조표는 -4로 어긋남). 코드 root·bass와 조표를 함께 옮기며 `fifthsUpBySemi` 표와 root 전용 코드 처리 코드를 삭제했습니다.
- 결과 조표는 `keyFifthsAfter(원래 조, -프렛)`의 기본 표(DEFAULT_FIFTHS)를 씁니다. 프롬프트의 preferFlat=true는 F♯/G♭·B/C♭ 같은 모호한 경우에 C♭장조를 고르는 문제가 있어 따르지 않았습니다. C장조 기준 결과는 동일합니다(2프렛 B♭, 4프렛 A♭).
- "Capo N Fret" 표기는 구간 시작 마디(번호 기준)에 하나만 두고, 다시 실행하면 기존 표기를 교체합니다. 결과 조 표시는 실제 조표 계산과 같은 함수로 보여 주고 단조 악보는 단조 이름을 씁니다.
- TempoChangePanel: `measures[n-1]` 인덱스 대신 `measuresByNumber`로 마디를 찾습니다(못갖춘마디 0 지정 가능). 파트가 없는 파일이 결과 배열에서 빠지던 문제(`continue`)도 함께 고쳤습니다. 없는 마디 번호는 경고 줄을 남깁니다. 미리보기 구간 계산을 MeasureCore.segments로 통일.
- 픽스처 f11-chords-inversion.musicxml(E, B7, A♭m, C/E) 추가.
- 검증: 03-capo 4개(f04 기존, f02 2지점: 1~2마디 -2·3~4마디 -4·조표 일치, f11: D A7 G♭m B♭/D, 재실행 시 표기 교체), 07-tempochange 2개(f03 1마디 지정 시 0마디 불변), 단위 142개, 스모크 7개 통과.

## 2026-11-09 · A-5
- HarmonyPanel: 마디를 따라 현재 조표(attributes key)를 추적하고 `PitchCore.diatonicThird`(조성 기반: 음이름 두 칸 + 조표 변화표) 또는 `chromaticThird`(항상 장3도, 음이름 두 칸 철자)로 3도 음을 만듭니다. f07(F♯장조)에서 A♯·E♯·D♯가 그대로 철자됩니다.
- 새 화음 음표 `buildChordNote`: chord, pitch, duration, tie, voice, type, dot, time-modification, stem, staff를 원음에서 복제하고, 붙임줄(notations > tied)만 따로 옮깁니다. 셋잇단 괄호·슬러·아티큘레이션·가사·beam은 원음에만 둡니다. 임시표는 `PitchCore.syncAccidental`로 같은 마디·보표 문맥에서 필요할 때만 붙입니다. grace·cue·unpitched·rest·기존 chord 음은 건너뜁니다.
- 다이어토닉 모드에서 조표에 없는 음(예: C장조의 F♯)도 음이름 3도와 조표 변화표로 정합니다(F♯→A). 이전 코드는 이런 음에 장3도(F♯→A♯)를 썼습니다. 단조는 자연단음계 기준이며 화성단음계 옵션은 범위 밖입니다.
- `getDiaThirdAbove/Below` 삭제(다른 호출처 없음). `getKeyRoot`·`DIATONIC_SCALES`는 숫자 악보 패널이 쓰므로 유지.
- 검증: 14-harmony 5개(f01 기존, f07 철자 8개·임시표 없음, f12 voice·staff·셋잇단 복사와 렌더 오류 없음, f04 자연단음계 G, f06 붙임줄 유지와 재생 이벤트 결합), 단위 142개, 스모크 7개 통과.

## 2026-11-09 · A-6
- ChordToolsPanel.runInversion: 베이스 음을 `PitchCore.bassForInversion(근음, kind, n)`으로 계산합니다. 근음 철자에서 구성음 음정(음이름 간격+반음)을 더하므로 E 1st → G♯, B7 1st → D♯, A♭m 1st → C♭이 됩니다(이전: ♭ 전용 표 때문에 A♭, E♭). 지원하지 않는 kind(none·other 등)나 구성음이 모자란 자리바꿈은 건너뜁니다.
- `KIND_INTERVALS`·`STEP_SEMI`·`PC_STEP_ALTER` 삭제(다른 호출처 없음). PitchCore.CHORD_TONES는 MusicXML 정식 이름 `major-minor`와 기존 표기 `minor-major`를 모두 받습니다.
- 검증: 15-chordtools 3개(f04 기존 일괄 변경, f11 1st: E/G# B7/D# A♭m/C♭ C/E와 root·kind·inversion·bass 순서, f11 3rd: B7/A만 적용·3개 생략), 단위 142개, 스모크 7개 통과.

## 2026-11-09 · A-7
- OssiaPanel: 범위 밖 마디를 지우기 전에 `MeasureCore.effectiveAttributes(첫 파트, 시작 마디)`로 그 시점의 divisions·key·time·staves·clef(보표별)·staff-details·transpose를 구하고, 첫 남은 마디의 attributes에 빠진 요소만 스키마 순서로 보충합니다(이전: 1마디 attributes만 복사해 3마디에서 바뀐 조표·음자리표가 무시됨).
- 조옮김은 `TransposeCore.transposePartRange`로 Ossia 조표까지 함께 옮기고, 옥타브 이동은 `PitchCore.shiftNoteOctave`로 철자를 유지합니다. 직접 임시표를 고치던 코드와 내부 헬퍼(directChild·cloneEl)를 삭제했습니다.
- mxl-studio.html의 MIDI 기반 `transposeNote`는 마지막 호출처가 사라져 정의를 삭제했습니다.
- 테스트 기대값 정정: f07 Ossia +1반음에서 B♯은 F♯장조의 ♯4이므로 G장조의 ♯4인 C♯이 맞습니다(처음 작성한 C는 오류).
- 검증: 08-ossia 3개(f01 기존, f10 4마디: divisions 1·3♯·F음자리표, f07 +1반음 -1옥타브: G장조 철자·조표 1), 05-ossia-persist, 19-ossia-pickup, 단위 142개, 스모크 7개 통과.

## 2026-11-09 · A-8
- 사용자 확정 사항대로 기본 범위는 '열린 파일 전체'를 유지하고 '현재 파일' 옵션을 더했습니다. App 상태 `scope`('all'|'active')를 localStorage `mxlStudio.scope`에 보존하고, 파일이 두 개 이상일 때 인스펙터·도구 패널 머리에 `ScopeToggle`(aria-pressed 버튼 2개)을 보여 줍니다.
- 유틸 `targetFiles`·`mergeTargets`·`scopeLabel`·`scopeLogLine` 추가. 변환·분석 패널 18개의 파일 루프를 `targetFiles(files,activeFile,scope)`로 바꾸고, 결과는 `mergeTargets`로 원래 자리에 넣습니다. 로그 첫 줄은 "대상: 열린 파일 N개" 또는 "대상: 현재 파일(이름)", 히스토리 라벨은 파일이 둘 이상일 때 "· 전체 N개"/"· 현재 파일"을 붙입니다. 로마 숫자 분석은 원래 현재 파일만 다루므로 그대로이고, 이미지/PDF의 '전체 파일 PNG'도 의미상 전체를 유지합니다. Ossia 제거도 범위를 따릅니다.
- 참조 동일성: `commitFile`이 만든 객체를 WeakSet에 기록하고 `App.updateFiles`는 이미 커밋된 파일을 다시 직렬화하지 않습니다. 대상이 아닌 파일은 같은 객체로 남고(E2E로 확인), 매 변환마다 모든 파일을 다시 직렬화하던 비용도 사라졌습니다.
- 정렬 보장을 위해 숫자 악보 '기존 가사 복원'에서 원본이 없을 때 결과 배열에 파일을 넣지 않고 넘어가던 경로를 고쳤습니다(이전에는 해당 파일이 목록에서 사라질 수 있었음).
- styles.css에 `.scope-toggle` 추가, 캐시 키를 `styles.css?v=phase-a-20261109`로 갱신.
- 검증: 새 E2E 23-scope 2개(기본 전체 적용·현재 파일만 적용 시 다른 파일 객체·xmlString 불변·라벨·로그·localStorage 복원, 파일 1개면 토글 숨김), 전체 E2E 106 통과 / 4 skip, 단위 142개 통과.

## 2026-11-09 · A-9
- TransposePanel '12개 장조 모두': 대상 파일(`targetFiles`)마다 12개 조를 `transposeDoc(file.xmlDoc, PitchCore.nearestShift(원래 조, i, 'nearest'), i)`로 만들고 `{파일명}/{파일명}_{조 이름}.mxl` 경로로 ZIP에 넣어 `transposed_12keys.zip`으로 내려받습니다. 원래 조와 같은 조도 포함해 파일당 12개로 고정합니다. 열린 악보는 바꾸지 않으므로 `onFilesUpdate`·히스토리를 호출하지 않습니다(이전: 12번 변환 후 마지막 결과 하나만 커밋해 로그와 결과가 달랐음).
- 유틸 `buildMxlBlobFromDoc(doc)` 추가, `buildMxlBlob(file)`은 이를 호출합니다(시그니처 유지). 파일명 안전 처리 `safeKeyName`('/'→'-', '♭'→'b', '♯'→'#')과 `safeFileStem` 추가. 예: `f01-basic/f01-basic_Db.mxl`, `f01-basic_F#-Gb.mxl`.
- 결정: 조 이름 표는 프롬프트의 '활성 파일이 단조면' 대신 **파일마다** 자기 첫 조표의 mode로 고릅니다. 범위가 '전체'일 때 장조·단조 파일이 섞여도 각 파일의 이름이 맞게 붙습니다.
- 패널 설명을 "12개 조로 변환한 .mxl을 ZIP으로 내려받습니다. 열린 악보는 바뀌지 않습니다."로 바꾸고, 결과 로그는 조마다 한 줄과 `✅ N개 파일 × 12조 = M개 .mxl` 요약을 남깁니다. JSZip이 없으면 오류 로그로 안내합니다.
- 같이 고친 기존 버그: 음정 이동에서 음정을 해석하지 못하면 결과 배열에 파일을 넣지 않아 목록에서 빠질 수 있던 경로를 원본 유지로 바꿨습니다.
- 매뉴얼(manual/·MXL-Studio-사용자설명서/ 두 사본)과 퀵스타트: 적용 대상 토글, 조옮김 방향·12개 장조 ZIP, 마디별 조바꿈 방향·단조 이름, 카포 구간별 원래 악보 기준, 음역대 옥타브 이동·철자 유지, 음자리표 파트·보표, 화성 쌓기 철자·속성 이어받기, 코드 자리바꿈 베이스 철자, Ossia attributes 이어받기 문구와 갱신일(2026-11-09). PDF·SVG 재생성은 A-10.
- 검증: 01-transpose 5개(새 all12: ZIP 엔트리 12개, 각 엔트리 `META-INF/container.xml`+`score.xml`·파싱 성공·rootfile, 조표 12종, Db는 fifths −5·첫 음 D♭, 실행 전후 xmlString·xmlDoc 직렬화·history 길이 불변), 14-a11y-controls, 06-export-mxl, 단위 142개 통과.

## 2026-11-09 · A-10
- 코드 수정 없이 검증·기록만 했습니다(테스트 1건을 픽스처로 옮긴 것 제외).
- `grep -n "transposeNote\|midiToNote\|PC_STEP_ALTER\|fifthsUpBySemi\|measures\[" mxl-studio.html` 결과: 195행 `midiToNote` 정의, 825행 InstrumentPanel 미리보기(표 표시), 2948·2988행 StatsPanel 최저음·최고음 표기. 모두 표시 목적이며 `transposeNote`·`PC_STEP_ALTER`·`fifthsUpBySemi`·`measures[` 인덱스 접근은 0건입니다.
- 테스트 안 합성 XML 정리: Phase A에서 만든 합성 악보는 모두 픽스처(f10·f11·f12)로 두었고, transpose-core 단위 테스트에 문자열로 있던 C/E 한 마디 악보는 f11의 4마디(C/E)를 쓰도록 바꿨습니다. measure-core 단위 테스트의 음표 없는 구조 조각(중복·비숫자 마디 번호, 보표별 clef 누적)은 악보가 아니라 파서 경계 사례라 테스트 안에 그대로 두었습니다.
- 전체 검증: 단위 142개 통과(10파일). E2E 111개 중 107개 통과(chromium 100, mobile 7), 4개 제외(시각 3·모바일 너비 1), 6.1분. Studio09 기준(80 통과/4 제외) 이상입니다. axe 네 장면 serious/critical 0.
- 문서: README 검증 현황 표·코어 10개·픽스처 12개·설계 문서 4번, README-TESTING 픽스처 표(f10·f11·f12)·태그 범위·결과, docs/verification-report.md에 Phase A 재검증 절 추가.
- `npm run docs:build`: PyMuPDF 1.28.2(`scripts/requirements-docs.txt`)를 설치해 실행했습니다. 설명서 10쪽·퀵스타트 4쪽 PDF·SVG를 재생성하고 전 페이지를 이미지로 확인했습니다. Linux에 Malgun Gothic이 없어 한글은 Noto Sans CJK로 들어갑니다(Windows에서 다시 생성하면 원래 글꼴). 내용이 그대로인 업데이트 안내 PDF·SVG는 글꼴만 바뀌는 변경이라 되돌렸습니다.

## Phase A 요약
기준 문서 `MXL-Studio10-PhaseA-변환정확도-바이브코딩-프롬프트.md`, 브랜치 `phase-a/transform-accuracy`, 커밋 A-1~A-10.

### 1.1 표 항목과 검증
| ID | 해결 | 검증 |
|---|---|---|
| P0-1 | 적용 대상 토글(기본 전체·현재 파일), 로그·히스토리 라벨에 대상 표기 | e2e 23-scope 2개 |
| P0-2 | 카포 구간마다 원본 대비 −프렛, 조표 일치, 코드 root·bass 이조 | panels/03-capo 3개 |
| P0-3 | 음역대·음자리표 옥타브 이동은 `<octave>`만 변경 | panels/04-range, panels/09-clef, 단위 shiftNoteOctave |
| P0-4 | 조바꿈·특정 조: 가까운 쪽 기본, 위로/아래로, 조표 기준 철자, 단조 | panels/02-keychange 3개, panels/01-transpose 3개, 단위 transposePartRange·nearestShift |
| P0-5 | all12 → 파일마다 .mxl 12개 ZIP, 열린 악보 불변 | panels/01-transpose all12 |
| P0-7 | 자리바꿈 베이스를 근음 철자에서 계산(E/G♯, B7/D♯, A♭m/C♭) | panels/15-chordtools 2개, 단위 bassForInversion |
| P0-8 | 화성 쌓기 조표 기준 철자, voice·staff·time-modification 등 복사 | panels/14-harmony 4개, 단위 diatonicThird·syncAccidental |
| P0-9 | Ossia 시작 마디의 유효 attributes 보충 | panels/08-ossia 2개, 단위 effectiveAttributes |
| P1-11 | 카포·마디별 템포를 마디 number 기준으로 통일(못갖춘마디 0) | panels/07-tempochange, panels/03-capo, 단위 measuresByNumber·segments |
| P1-12 | 음자리표 파트·보표 선택 | panels/09-clef 2개 |
| P2-4 | MIDI 기반 음표 계산 제거, 패널 안 중복 표 삭제 | A-10 grep, 단위 pitch-core·measure-core |

### 제거된 함수·표 (mxl-studio.html)
`transposeNote`(MIDI 기반 조옮김), `getDiaThirdAbove`·`getDiaThirdBelow`, `KIND_INTERVALS`, `STEP_SEMI`, `PC_STEP_ALTER`, 카포의 `fifthsUpBySemi`, OssiaPanel 내부 `directChild`·`cloneEl`. 대신 PitchCore·MeasureCore·TransposeCore.transposePartRange를 씁니다.

### 바뀐 기대값
- panels/02-keychange 기존 테스트: C→G 3마디 첫 음 G4 → **G3**(항상 상행하던 동작이 기대값이었음, 가까운 쪽 −5반음).
- 프롬프트 문서 정정: `keySignatureAlter(6,'B')` = **0**(F♯장조의 B는 제자리음), `keyInterval(0,7,7)` → `keyInterval(0,1,7)`(목표 조와 반음 수 일치).
- 카포 결과 조표: 프롬프트의 preferFlat=true 대신 `keyFifthsAfter` 기본 표(C♭장조 회피). C장조 기준 결과는 같음.
- 음역대 로그 수치: 옥타브 이동 횟수 → "N개 음표 이동, M개 범위 밖 유지".
- 화성 쌓기 다이어토닉 모드에서 조표 밖 음: F♯ → A(이전 A♯). 자리바꿈 베이스: E/A♭·B7/E♭ → E/G♯·B7/D♯.
- all12: 열린 악보 1개 커밋 → ZIP 다운로드, 열린 악보·히스토리 불변. 조 이름 표는 파일마다 자기 mode 기준.

### 남은 문제
- 화성 쌓기 단조는 자연단음계 기준입니다. 화성단음계(이끈음) 3도 옵션은 없습니다.
- 같은 마디 앞선 임시표는 같은 보표의 문서 순서로 판단합니다. 다성부에서 backup으로 시간이 되돌아가는 경우, 붙임줄로 넘어온 임시표, 마디를 넘는 확인 임시표는 반영하지 않습니다.
- 마디 중간 조바꿈은 마디 단위로 근사합니다(`keyFifthsAt`은 그 마디의 마지막 조표를 반환).
- 파트별 조표가 다른 합주보(이조 악기 포함)의 마디별 조바꿈은 첫 파트 기준 반음 수를 모든 파트에 적용하고 각 파트 조표는 `keyFifthsAfter`로 정하는 분기 경로입니다. 픽스처가 단일 파트(f05)뿐이라 합주보 E2E는 없습니다.
- HTML의 `STEP_TO_SEMI`·`SEMI_TO_STEP`·`KEY_FIFTHS`·`DIATONIC_SCALES`는 UI·표시용으로 1벌씩 남아 있습니다(코어 내부 표와 값이 같음). 이후 PitchCore 참조로 바꿀 수 있습니다.
- 설명서 화면 이미지는 Studio09 화면입니다(적용 대상 토글·방향 칩 없음). Linux 시각 기준 이미지 3장도 여전히 없습니다.
- main 병합 전 GitHub CI(Linux Playwright Chromium)에서 한 번 더 확인해야 합니다. main에 푸시하면 Pages 배포가 실행됩니다.

## 2026-11-09 · Phase A2 시작
- 근거: 2026-11-09 외부 검수 보고서「악보 디자이너 전체 기능 검수」(B01~B10, C01~C18). 프롬프트 문서 작성 전에 모든 B·C 항목을 b605c7e 소스와 대조해 원인 줄 번호를 확인했습니다(문서 1장).
- 작업자 결정 기본값 D1~D12는 프롬프트 문서 0.2절에 있습니다. 사용자가 "이 프롬프트대로 스스로 승인하며 개발"을 지시했습니다.

## 2026-11-09 · A2-1
- **B01은 Phase A A-8의 회귀입니다.** A-8에서 RomanAnalysisPanel.insertIntoScore만 `files.map((f,i)=>i===fileIndex?commitFile(f,doc):f)`(파일 전체 길이 배열)를 `mergeTargets`에 넘겼습니다. `mergeTargets`는 `results[i]`를 `targets[i]`의 결과로 보므로 현재 파일 범위(대상 1개)에서 두 번째 파일을 고르면 `results[0]`(첫 파일)이 그 자리에 들어가 첫 파일이 두 번 보이고 활성 파일 내용이 사라졌습니다. 다른 패널과 같은 `targetFiles` 순회 구조로 바꿨습니다.
- `mergeTargets`가 `results.length!==targets.length`면 예외를 던집니다(N2). 모든 패널은 try/catch에서 로그로 보여주므로 커밋되지 않습니다. 기존 21패널·23-scope 스펙이 모두 통과해 다른 패널에는 같은 버그가 없음을 확인했습니다.
- PartsPanel: 파일마다 `score-part` ID를 다시 읽어 `keepHere=keep∩ids`를 쓰고, 비면 원본 그대로 두고 경고합니다(B02, 결정 D2). 로그는 실제 유지·제거 수를 적습니다. 파일이 2개 이상이면 패널에 안내 문구가 보입니다.
- 추가 수정(N7, 보고서에 없음): 업로드·세션 복원·공유 불러오기·작업 기록 복원으로 만든 파일 객체가 `committedFiles`에 없어서, 다른 파일을 변환할 때 `updateFiles`가 이 파일들까지 다시 직렬화했습니다(내용은 같지만 xmlString 형식과 객체가 바뀜). B01 회귀 테스트의 "다른 파일 xmlString 불변" 단언에서 드러났습니다. `trustParsedFile(file)`로 네 생성 지점의 객체를 등록합니다. xmlString을 파싱해 만든 xmlDoc이라 둘이 일치하고, xmlDoc을 제자리에서 바꾸는 코드가 없음을 grep으로 확인했습니다(StatsPanel의 두 곳은 읽기 전용).
- 픽스처 f13-part-p99(Flute, 파트 ID P99, 8음표). 새 회귀 스펙 tests/e2e/24-audit-regressions.spec.js(@panels): B01·B02.
- 검증: 단위 142, 24·23·10-parts·19-roman·21-history·12-session-modal·02-share·08-upload·01-fixtures 27개, 스모크 7, @panels 60 모두 통과.

## 2026-11-09 · A2-2
- TempoPanel: 'duration 비례 변환' 칩·state·분기를 제거했습니다(결정 D1, B03). `Math.round(old/rat)`가 divisions 1 악보에서 duration 0을 만들었고, backup·forward·type·divisions·박자표는 그대로여서 어떤 경우에도 악보가 어긋났습니다. 옵션 카드에 "음표 길이는 바꾸지 않습니다" 설명을 넣었습니다.
- 유틸 `metronomeBeat`·`metronomePerMinute`·`quarterBpmFromMetronome`·`metronomeLabel`·`isValidBpm` 추가. 점은 하나 ×1.5, 둘 ×1.75(프롬프트의 "점마다 ×1.5"를 음악 규칙대로 바로잡음).
- **프롬프트와 다르게 정한 것**: 프롬프트는 템포 조절의 per-minute를 `원래 값×(목표/원본)` 비율로 바꾸라고 했지만, 이 패널은 모든 `sound[tempo]`를 목표 BPM 하나로 맞춥니다. 비율로 바꾸면 곡 중간 템포 표기가 sound와 어긋나므로 `per-minute=round(목표 BPM ÷ 박 단위 배수)`로 sound와 같은 빠르기를 쓰게 했습니다. f14 기대값(점4분음표=80)은 두 방식이 같습니다. per-minute가 숫자가 아니거나 박 단위를 모르면 바꾸지 않고 ⚠ 로그를 남깁니다(C07).
- 원본 템포 감지: sound가 있으면 그 값과 함께 "표기: 점4분음표=60"을 보여주고, sound 없이 metronome만 있으면 4분음표 기준으로 환산합니다.
- TempoChangePanel: BPM 입력을 문자열 그대로 두고 `aria-invalid`로 표시, 실행 시 20~400을 다시 검사해 하나라도 무효면 커밋하지 않습니다(B08). 기존 direction 갱신 때 per-minute도 박 단위로 환산합니다(N5). 미리보기 타임라인은 유효한 지점만 씁니다. 원본 템포도 metronome 환산을 씁니다.
- styles.css: `.measure-input`·`.form-input`의 `aria-invalid="true"` 테두리.
- 픽스처 f14-dotted-metronome(6/8, 점4분음표=60, sound 90). 06-tempo +2(300 BPM 후 duration 전부 1, 점4분음표 환산 80), 07-tempochange +2(−60 거부·기록 불변, f14 마디별 120 → per-minute 80).
- 설명서 두 사본: 템포 조절(환산·길이 불변), 마디별 템포(20~400). 퀵스타트에는 템포 문구가 없습니다.
- 검증: 단위 142, 06·07·01-fixtures 21개, 스모크 7, 17-playback·22-autosave 3개 통과.

## 2026-11-09 · A2-3
- 새 코어 `numbering-core.js`(`window.NumberingCore`): `octaveDots`, `noteToNumStr`, `fifthsForMeasure`, `removeGeneratedLyrics`, `removeUserLyrics`, `countGeneratedLyrics`, `backupLyrics`, `restoreLyrics`, `generateNumberLyrics`. 부팅 검사 `missingLibraries`에 추가. 단위 테스트 10개.
- HTML에서 `noteToNumStr`·`getKeyRoot`와 이것만 쓰던 `SOLFEGE_KR`·`STEP_TO_NUM`·`DIATONIC_SCALES`를 삭제했습니다.
- 생성 가사에 `name="mxl-studio-number"` 표식(결정 D3). 다시 만들면 표식 가사만 지우고 새로 만들어 쌓이지 않습니다(E37).
- 원본 가사 백업은 파일 객체 `lyricBackup`(문자열 직렬화, 불변)에 둡니다. `commitFile`이 파일 필드를 펼쳐 복사하므로 다른 패널이 커밋해도 남습니다(B04). 처음 생성할 때만 백업하고, 다시 만들 때는 기존 백업을 유지합니다. 백업 키는 (파트 id, 마디 위치, chord가 아닌 음표 순번, chord 안 순번)이라 화성 쌓기로 chord 음표가 추가돼도 흔들리지 않습니다.
- 복원: 백업이 있으면 생성 가사 제거 후 복원, 백업 없이 생성 가사만 있으면(기존 가사 유지 모드로 만든 경우) 생성 가사만 제거, 둘 다 없으면 파일을 그대로 두고 ⚠ 로그.
- **프롬프트와 다르게 정한 것 1**: 4.2절은 히스토리에 새 필드를 넣지 말라고 했지만, 숫자 생성 → 색깔 악보 → 실행 취소 순서에서 백업이 사라지면 B04와 같은 결과가 됩니다. history-core 스냅샷에 `lyricBackup`을 참조로 담고(`history-core.js?v=2`), 세션·공유 직렬화에는 넣지 않았습니다. 설명서·패널에 "열린 탭에서만 유지"로 안내합니다.
- **프롬프트와 다르게 정한 것 2**: 이동 도법은 반음(pitch class) 기반에서 음이름 문자·조표 기반으로 바꿨습니다. A장조의 C는 이전 '#2'(B♯ 해석)에서 '♭3'으로, F장조의 B♭은 '4'입니다. 프롬프트 단위 기대값이 이 방식을 전제로 합니다. 고정 도법·한국어 계이름은 옥타브 3~5 범위에서 이전과 같은 문자열을 냅니다.
- 이동 도법 조표는 파트·마디를 문서 순서로 따라가며 추적합니다(마디 중간 조바꿈 포함, C03). `fifthsForMeasure`는 마디 시작 시점 조표를 돌려줍니다(MeasureCore.keyFifthsAt은 마디의 마지막 조표라 위임하지 않음).
- 옥타브 점은 기준 옥타브(기본 4, 패널에서 2~6 선택)에서 떨어진 만큼 최대 3개(결정 D4, C04).
- '숫자 (도=1)' 칩과 'solfege' 모드 제거, 고정 도법 기본(결정 D5, N1). 미리보기에 C3·C6 추가.
- 추가 발견 N8(이번에 고치지 않음): NotationPanel(악보 표기 변환)도 `baselineRef`로 "처음 상태에서 다시 적용"을 합니다. 다른 패널이 커밋하면 기준선이 바뀌어 '원본 복원'이 처음 상태로 돌아가지 못합니다. 보고서에 없던 항목이라 남은 문제로 둡니다. 따라서 A2-11의 `baselineRef` grep 확인 범위는 NumberingPanel로 한정합니다.
- 테스트: 16-numbering +3(B04 색깔 악보 뒤 복원 '원본 가사 3개 복원', E37 2회 생성 후 총 10개, C03·C04 f10 이동 도법 '5˙'·'6˙'·기준 옥타브 3에서 '˙1'), history-core +1.
- 검증: 단위 153, 16·20·13·21 스펙 7개, 스모크 7, 07·12·02 스펙 7개 통과.

## 2026-11-09 · A2-4
- 유틸 `uniqueStem`, `stackSvgMarkup`(SVG를 위→아래로 쌓기, 하나면 예전과 같은 마크업), `svgMarkupToPngBlob`, `renderScoreSvgs`(본보+Ossia 렌더, 뷰어와 같은 0.65배) 추가.
- ExportPanel: 미리보기가 그린 {파일 위치, xmlDoc, ossiaMxml}을 기억하고, 선택 파일·악보·Ossia가 바뀌면 미리보기를 지우고 안내합니다. PNG·SVG 저장도 시작에서 다시 확인합니다(B05). PDF는 미리보기가 아니라 선택 파일을 인쇄하므로 검사하지 않습니다(내보내기 카드는 미리보기가 있을 때만 보임).
- Ossia: 이미지 패널 미리보기·PNG·SVG·전체 PNG ZIP과 상단 PNG 버튼에 본보 위로 합성합니다. MXL·XML 내보내기에는 넣지 않고 다운로드 직전에 알립니다(결정 D7, C13).
- ZIP 이름: 전체 PNG ZIP과 12개 조 ZIP 폴더가 같은 stem이면 `이름 (2)`로 구분합니다(B06, N3). 완료 로그의 수는 실제 엔트리 수입니다.
- ColorPanel: `filled="yes"` 쓰기를 제거하고 기존 filled는 건드리지 않습니다(C14).
- 렌더 폭 회귀를 막은 과정: 미리보기 안에 본보·Ossia 상자를 따로 두자 OSMD가 패딩 없는 안쪽 폭(239px)으로 배치해 예전(패딩 포함 271px 배치 후 CSS 축소)과 크기가 달라졌습니다. 안쪽 상자에 `margin-inline:-16px; padding-inline:16px`를 줘 offsetWidth를 같게 맞췄고, b605c7e와 비교해 SVG는 바이트 단위로 같고 PNG는 크기·배치가 같음(안티앨리어싱만 다름)을 확인했습니다. 또 `.export-preview__ossia:empty{display:none}` 규칙은 OSMD가 렌더를 시작할 때 상자가 비어 있어 폭 0으로 측정되게 만들어 제거했습니다.
- 확인한 기존 현상(이번에 고치지 않음): 패널 폭이 좁아 미리보기 첫 마디 음표가 뭉치는 것은 b605c7e에서도 같습니다. 심층 분석 문서 Phase B(오프스크린 고정 폭 렌더) 범위입니다.
- 테스트: 12-export +3(B05 파일 전환 후 미리보기 지움·f02 SVG에 Violin, B06 동명 다른 확장자 ZIP 2개, C13 Ossia 포함 PNG 높이 증가·MXL 알림), 13-color +1(filled 0개), 01-transpose +1(같은 stem 두 파일 12조 ZIP 24개·폴더 2개).
- 설명서: Ossia(이미지 포함·MusicXML 제외), 이미지/PDF(미리보기 무효화·(2) 접미), 색깔 악보(머리 채움 유지).
- 검증: 단위 153, 12·13·01·06·13-zoom·05·19-ossia·08·11 스펙 20개, 스모크 7 통과.

## 2026-11-09 · A2-5
- 히스토리 '모두 지우기': 파일이 있으면 지금 악보를 `기준점 (지우기 전 상태)` 한 칸으로 남깁니다(결정 D6, B07). 알림은 "이전 기록을 지우고 현재 악보를 기준점으로 남겼습니다." 버튼은 기록이 한 칸뿐이고 파일이 있으면 비활성입니다. 파일이 없을 때 남은 한 칸(예: '파일 모두 지우기')은 지울 수 있게 `canClear` 조건을 `history.length>1||(history.length===1&&!files.length)`로 정했습니다(프롬프트의 "기준점 1개뿐이면 비활성"을 넓힌 것).
- MidiPlayer: 곡 끝 정지 이벤트 id를 `endEventIdRef`에 두고 `scheduleEnd`/`clearEnd`/`finishPlayback`으로 나눴습니다. `schedulePlayback`(반복 꺼짐)·재생 중 A-B 끄기는 예약, A-B 켜기·일시정지·정지는 해제합니다. A-B를 끌 때 이미 곡 끝(−0.05초)을 지났으면 바로 정지합니다. 위치 폴링은 반복 꺼짐에서 곡 길이를 지나면 `finishPlayback`을 한 번 부르는 안전망입니다(`isPlayingRef`로 중복 방지). 예약 콜백은 자기 id일 때만 ref를 비웁니다.
- playback-core: `warnings`를 표기별 문장으로 바꿨습니다. direction의 words(같은 direction의 여러 words를 이어 붙여 검사)가 정규식에 맞으면 그 글자를, 아니면 segno/coda direction-type과 sound(dacapo·dalsegno·fine·tocoda) 속성을, direction 밖 sound와 barline의 segno/coda도 문서 순서로 모읍니다. 대소문자 무시 중복 제거, 40자 넘는 글자는 말줄임. 표기 목록은 `navigationMarks`로도 돌려줍니다(새 필드).
- 표시 위치 변경(프롬프트는 "플레이어 상단"): 진행 막대 위에 줄을 더하면 132px 고정 높이 재생 막대에서 '반복 기호 펼치기'가 4~6px 잘리고 안쪽에 스크롤이 생겨(1440·1100폭 측정) 시간 줄 가운데에 `⚠ 재생 미반영: Fine · D.C. al Fine`처럼 표기만 짧게 보이고, 전체 문장은 `title`과 화면 낭독기용 숨김 글(`.visually-hidden`, 새 유틸)로 둡니다. `role="status"`. 1440·1100·700폭에서 이전 빌드(e4512eb)와 재생 막대 배치가 같음을 측정했습니다. 글자색은 `--amber`(#ff9f0a, 흰 바탕 대비 약 2:1) 대신 새 변수 `--amber-text`(#8a5100)를 씁니다. axe에 f17 장면을 추가해 통과를 확인했습니다.
- 픽스처 f17-dacapo(4마디, 2마디 끝 Fine+sound fine, 4마디 끝 D.C. al Fine+sound dacapo) 추가, 01-fixtures 등록.
- 테스트: 단위 playback-core +2(f17 표기·중복 없음·f08 0개, segno/coda/direction 밖 sound/중복 표기), 21-history 기대값 변경(지우기 뒤 0개 → 기준점 1개·버튼 비활성·음 유지), 18-cursor +1(A-B 켜고 재생 → 300ms 뒤 끄기 → 곡 길이+1.5초 안에 정지·커서 숨김·위치=곡 길이, 수정 전 코드에서 실패 확인), 24 +2(B07 지우기 후 +2 → 실행 취소 → D/4, C16 경고 표기·숨김 문장·title, 경고 없는 파일로 바꾸면 사라짐), axe +1 장면.
- 설명서: 편집 공통 안내에 '모두 지우기' 기준점, 재생 안내에 '재생 미반영' 표시와 A-B 해제 정지를 적었습니다.
- 검증: 단위 155, 01·17·18·21·24·axe 스펙 29개, 스모크 7 통과.

## 2026-11-09 · A2-5 뒤 줄 끝 복원
- A2-2~A2-4에서 편집 스크립트(Python 텍스트 모드 읽기)가 CRLF 파일을 LF로 바꿔 styles.css 등 8개 파일의 diff가 파일 전체로 커졌습니다. 내용은 그대로 두고 main(b605c7e)의 줄별 줄 끝을 되살리는 커밋(dc3d63c)을 따로 두었습니다. 이후 편집은 `newline=''`로 줄 끝을 보존하고, 커밋 전에 HEAD와 CRLF 줄 수를 비교합니다.

## 2026-11-10 · A2-6
- session-store-core: `writeJson`을 `tryWriteJson`으로 바꿔 `{ok:false,reason:'no-storage'|'quota'|'storage-error',error}`를 돌려줍니다(QuotaExceededError·NS_ERROR_DOM_QUOTA_REACHED·code 22·1014는 quota). `localSaveSession`은 본문 → 목록 순서로 쓰고, 새 id의 목록 쓰기가 실패하면 방금 쓴 본문을 지웁니다(기존 id면 목록을 다시 쓰지 않음). `localPutMeta`는 실패 시 null, `localDeleteSession`은 목록 쓰기 결과를 돌려줍니다(저장소가 없으면 지울 것이 없으므로 true).
- `saveSession`: 로컬 사본 결과를 한 번만 만들고, IndexedDB가 성공하면 `{ok:true,backend:'idb',size}`, 아니면 로컬 결과를 그대로 돌려줍니다(예전처럼 로컬을 두 번 쓰지 않음). IndexedDB는 요청 성공 뒤 트랜잭션 complete까지 기다립니다(커밋 단계의 용량 초과를 성공으로 오인하지 않게).
- `migrateFromLocalStorage`: 구세션·슬롯 결과를 모아 모두 성공할 때만 구저장 키를 지우고 `migratedAt`을 씁니다. 실패가 있으면 키를 남기고 `migrationPending {lastAttemptAt, failed}`를 기록한 뒤 `{ok:false,migrated,failed:[{id,reason}]}`. 다음 실행에서 다시 시도하고, 성공하면 pending을 null로 바꿉니다. id 없는 슬롯의 마지막 대안 id를 `Date.now()` 대신 `slot-legacy-{순번}`으로 바꿔 재시도해도 중복이 생기지 않게 했습니다. 단위 테스트에서 메타를 확인하려고 `getMeta`를 공개했습니다.
- 앱: `sessionSaveMessage(result)`로 이유별 문장(no-storage·quota·too-large, 그 밖은 원문 포함)을 만들고 세션 저장·이름 변경 실패에 씁니다. 자동 저장 실패는 같은 이유마다 페이지당 한 번 경고 알림(8초)을 띄우고 `sessionStatus.autosaveError`에 두어 세션 창 '저장된 세션' 제목 아래에 '자동 저장 · 마지막 저장 실패: …'로 보입니다(프롬프트의 '자동저장 행'을 표 행이 아닌 상태 줄로 구현: 자동 저장이 한 번도 성공하지 못하면 표에 행이 없기 때문). 성공하면 지웁니다.
- 추가: 저장 실패 문구가 'JSON 내보내기를 이용하세요'인데 저장된 세션이 없으면 내보낼 방법이 없어, 세션 창 저장 줄에 현재 상태 'JSON 내보내기' 버튼을 넣었습니다(가져오기와 같은 version 1 형식).
- 구세션 이전 실패는 키를 남기므로 데이터 손실이 없고 다음 실행에 다시 시도합니다. 사용자 알림은 넣지 않았습니다(영구 실패 시 매번 알림이 뜨는 것을 피함).
- 테스트: 단위 session-store-core +7(no-storage, 가득 찬 저장소 quota·목록에 id 없음, 목록 쓰기만 실패 시 본문 롤백, 그 밖의 예외 storage-error, 로컬 사본만 가득 차도 idb 성공, 4MB 초과 구세션 + 정상 슬롯 이전 실패 → 키 유지·migratedAt 없음 → 제거 후 성공, id 없는 슬롯 재시도 같은 id). E2E 12-session-modal +2(가득 찬 저장소: 자동 저장 실패 알림 1회·세션 창 상태 줄·수동 저장 quota 문구·현재 상태 JSON 내보내기 내용, 저장소 없음: no-storage 문구·목록 0).
- 설명서: 자동저장 실패 안내·JSON 내보내기·구세션 이전 보호.
- 검증: 단위 162, 12-session-modal 10(chromium·mobile), 22·05·axe 8, 스모크 7 통과.

## 2026-11-10 · A2-7
- chord-tools-core: `detectChordFromPitchClasses(pcs,{fifths,bass})`, `spellPitchClass(pc,fifths)`, `chordSymbolText({root,quality})`, `CHORD_PATTERNS`를 추가했습니다. 1음·완전5도가 아닌 2음은 null, 완전5도 2음은 `5`(근음은 위로 완전5도가 되는 음), 3음 이상은 패턴의 모든 음이 들어 있는 후보만 고르고 (음 수 많은 것 → 베이스가 근음 → 입력 첫 음이 근음 → 근음 pc 작은 것 → 패턴 순서)로 고릅니다. 품질 이름은 설계표대로 `M`이고 기호 접미사는 기존 출력과 같습니다(M→''). 철자는 PitchCore.keySignatureAlter로 조표 안의 음을 고르고, 아니면 fifths<0이면 ♭입니다. ChordSymbolCore가 모든 기호를 다시 읽는 왕복 테스트를 넣었습니다.
- roman-analysis-core: `identifyChord(set,{bass})`는 3음 미만이면 `{rootSemi:null,quality:'unknown',chordName:'C(단음)'|'C·G'}`, 정확 일치가 없으면 모든 패턴 음 포함 후보만(없으면 `C?`, rootSemi null). 점수 폴백(`scorePattern`)은 지웠습니다. `romanForChord`는 unknown·rootSemi null이면 '?'(설계 2.2의 A2-8 항목이지만 rootSemi null 때문에 지금 넣음). `analyzeVerticalities(doc,{fifthsByMeasure})`는 `collectMeasureBeats`를 그대로 쓰고 행에 measure(number)·measureIndex·beat·start·fifths·bass·pitchClasses·chord를 담습니다. fifths는 옵션이 없으면 첫 파트 조표를 문서 순서로 따라가며, 단위 테스트로 `MeasureCore.keyFifthsAt`과 같음을 확인했습니다. 그래서 패널은 맵을 따로 만들지 않습니다.
- 앱: `detectChord` 삭제(SEMI_TO_STEP은 midiToNote 등에서 계속 사용). 수직 음향 분석은 `마디 {number}: {박}박 {코드|?} · …`와 파일별 `박 N개 중 M개 코드 확정` 요약(프롬프트 형식에 '박' 글자를 더함). 코드 분석 & 삽입은 마디마다 첫 박의 확정 코드만 넣고, 미확정은 `⚠ 마디 {number}: 음이 {n}개라|화음 패턴에 맞지 않아 코드를 확정하지 않았습니다`(파일당 10줄까지, 나머지는 개수). 마디 찾기는 프롬프트의 `measuresByNumber` 대신 분석 행의 `measureIndex`로 같은 문서의 마디를 찾습니다(같은 번호가 반복돼도 정확). 통계 진행 요약은 마디 조표로 판정하고 null은 건너뜁니다. 코드 기호 파악의 마디 표기도 number로 바꿨습니다. 로마 숫자·코드 분석·코드 도구 설명 문구를 갱신했습니다.
- 캐시: 내용이 바뀐 코어 스크립트 쿼리를 올렸습니다(chord-tools ?v=2, roman ?v=2, playback ?v=2(A2-5), session-store ?v=2(A2-6)). ChordToolsCore·RomanAnalysis를 필수 라이브러리 목록에 넣었습니다(NumberingCore와 같은 방식).
- 바뀐 기대값: 24 B01은 f02 대신 f04를 두 번째 파일로 씁니다. f02는 박마다 옥타브 유니슨이라 이제 로마 숫자가 '?'이고 삽입할 것이 없습니다(의도된 변경, 4.2 함정 표).
- 테스트: 단위 chord-tools +7(프롬프트 13케이스 포함, 동점 규칙, PitchCore 없을 때, ChordSymbolCore 왕복), roman +4(단음·2음·클러스터 unknown, 유니슨 박 '?', f12 박 3개·f03 첫 행 0·f04 Am Dm E7 Am, 마디별 조표 철자 G#/A♭와 keyFifthsAt 일치). E2E 18-chords +3(f03 마디 0, f02 '?'·삽입 0 = 확정 마디 수, f04 덮어쓰기 삽입 Am Dm E7 Am).
- 설명서: 코드 분석·코드 도구·로마 숫자 분석 행.
- 검증: 단위 173, 15·18·19·20·24·23·20-lazy·07·01 스펙, 스모크 7 통과. `grep -n "function detectChord" mxl-studio.html` 0건.

## 2026-11-10 · A2-8
- roman-analysis-core: `getPitchMidi(note,transposeSemis=0)`. `collectMeasureBeats`가 파트별 `<transpose>`(number 없음 또는 "1", chromatic + 12×octave-change)를 이전 마디부터 누적해 실음으로 읽고, 박 정보에 `bassMidi`를 더했습니다(단위 테스트용·재사용). `detectRomanNumeral`은 첫 파트 조표를 마디 순서로 따라가 행마다 keyName·tonicSemi·fifths·mode를 넣고, 부속화음 판정도 행의 조를 씁니다. 조가 바뀐 마디는 `keyChanges`로 돌려줍니다. mode 요소가 없는 조표는 이전 mode를 유지합니다(MeasureCore.modeAt과 같은 규칙). 헤더 조(keyName·mode)는 기존처럼 문서 첫 조표입니다.
- 종지: `CADENCE_TYPES`에 IAC 추가. V→I은 둘 다 기본위치일 때만 PAC, 아니면 IAC. 판정하지 못한 화음은 종지의 앞·뒤로 쓰지 않고, 앞 화음은 바로 앞의 판정된 화음입니다(V – 선율 한 음 – I도 PAC). `detectCadence`·`getPitchMidi`·`CADENCE_TYPES`를 공개했습니다.
- 패널: 종지 칸 5개(PAC·IAC·HC·PC·DC, 홀수 마지막 칸은 한 줄), 로그는 `a단조`/`C장조`와 `(마디 3부터 G장조)`, 표에 조성 열(첫 조와 다를 때만), 설명 문구에 실음·최상성부 안내. 결과 초기화는 `useEffect(…,[file])`에 이 패널이 삽입해 만든 파일 객체를 예외로 두었습니다(그대로 쓰면 '악보에 삽입' 직후 로그·표가 지워져 24 B01의 '적용 완료' 단언이 깨짐). 다른 도구의 변경·실행 취소·파일 전환은 모두 지웁니다.
- 픽스처 f16-ensemble-transposing 추가, 01-fixtures 등록.
- 발견(이번 범위 밖, A2-10에서 처리): XML 선언(`<?xml`)이 없는 짧은 MusicXML은 OSMD가 문자열을 URL로 보고 렌더에 실패합니다. 앱이 `XMLSerializer` 결과를 `osmd.load`에 넘기는데, Chrome은 원본에 선언이 있을 때만 선언을 붙입니다.
- 테스트: 단위 roman +6(f16 C·Ⅰ, chromatic·octave-change 실음 60, f10 마디별 조·keyChanges, 조바꿈 뒤 새 으뜸음 로마 숫자, PAC/IAC/unknown, 판정 못 한 박을 건너뛴 PAC). E2E 19-roman +3(f04 a단조·장조 없음·종지 5칸, f16 C·Ⅰ, 파일 탭 전환 시 결과 지움·삽입 결과 유지).
- 설명서: 로마 숫자 분석 행과 분석 안내 문장.
- 검증: 단위 179, 19·24·01·18·15·20 스펙, 스모크 7 통과.

## 2026-11-10 · A2-9
- transpose-core: `tonicFifths({step,alter})`(−7~7 밖 null)와 `keyFifthsForTonic(tonic,mode)`(단조는 −3)를 추가·공개했습니다. `transposeDocument`는 마디 자식을 문서 순서로 돌며 모든 `attributes > key`를 number별로 갱신하고(공통 key는 보표별 상태를 지움), 음표·코드는 자기 `<staff>`의 조(number=staff → 1번 → 공통)로 keyInterval을 정합니다. `options.interval={diatonic,chromatic}`이 있으면 모든 음표에 그 간격을 쓰고, 조표는 옮긴 으뜸음의 조표(범위 밖이면 keyFifthsAfter)입니다. 같은 마디 안에서 조표가 바뀌면 그 뒤 음표부터 새 조를 씁니다(예전에는 마디 첫 key 하나로 마디 전체).
- `transposePartRange`: 1번(또는 number 없는) key는 기존 규칙, 그 밖의 보표 key도 갱신합니다. 시작 조와 같은 fifths면 같은 목표(특정 조 선택 시 이명동음이 보표마다 갈리지 않게), 아니면 자기 fifths 기준 keyFifthsAfter이고, 그 보표 음표 철자도 그 조로 정합니다.
- 조옮김 패널: 음정 모드가 `transposeDoc(doc,chromatic,null,{interval:{diatonic:(ivNum−1)×방향,chromatic}})`로 넘깁니다(`transposeDoc` 네 번째 인자 extra). 1·4·5·8도는 Perfect(P)·A·d·AA·dd 칩(id 유지), 완전음정에서 minor가 남아 있으면 major로 되돌립니다(칩 클릭과 effect 둘 다). `computeIntervalSemis`는 완전음정 minor를 undefined로 둡니다. 로그·현재 설정은 `↑ 감5도 (+6반음, 온음계 +4)` 형식의 한글 이름입니다.
- 통계: 기본 분석 마디 = 첫 파트 마디 수(MeasureCore.firstPart), 파트 수를 `마디 N · 파트 P개` 안내 줄로, 음표·쉼표 라벨 '(전체 파트)'. 작곡 스타일 제목 '(첫 파트 선율 기준)', 음표 라벨 '(첫 파트)'. 최저·최고음은 실제 음표 철자(fmtNote가 겹올림·겹내림도 표시). 조성 상위는 첫 key의 fifths·mode로 묶어 `keyDisplayName`(기존 `keyIndexOfFifths` 재사용 — 같은 이름의 함수가 이미 있어 새로 만들지 않음)으로 Am 등 단조 이름을 씁니다.
- 바뀐 기대값: 20-stats 기존 테스트의 타일 라벨 '총 음표' → '음표 (전체 파트)'.
- 픽스처 f15-two-staff-keys 추가, 01-fixtures 등록. transpose-core 스크립트 ?v=3.
- 테스트: 단위 transpose +6(tonicFifths·단조, f15 두 조표·D3, 감5도 G♭·−6 / 증4도 F♯·6, 으뜸음 조표 범위 밖 폴백, 구간 조옮김 두 조표, 보표별 다른 조 철자). E2E 01-transpose +2(감5도 G♭/4·조표 −6·로그, 3도 단 → 4도 완전 복귀), 20-stats +2(f02 마디 4·파트 2개·두 분석 마디 4, f04 Am).
- 검증: 단위 185, 01·20·01-fixtures·02·03·05·08·03-transpose-harmony·23 스펙, 스모크 7 통과.

## 2026-11-10 · A2-10
- C17: 템포 프리셋(`aria-pressed`)·눈금(`aria-label="{v} BPM"`)·음자리표 카드(`aria-pressed`, 기호 `aria-hidden`)를 `button type="button"`으로 바꿨습니다. 안쪽 div 구조는 유지(마디별 템포 프리셋과 같은 방식). styles.css는 프롬프트의 `border:0; background:none`을 프리셋·음자리표에 그대로 쓰면 기존 테두리·배경이 사라져, appearance·font·color·text-align만 초기화하고 눈금에만 border·background·padding을 지웠습니다. 세 컨트롤에 `:focus-visible` 외곽선.
- 오류문(D12): `friendlyError(e)`와 대응표(JSON·ZIP·OSMD 불완전/잘못된 문서·파트·네트워크). 맞으면 `{한글} ({원문 앞 80자})`, 아니면 원문 그대로(앱이 만든 한글 오류). 패널의 `'❌ '+e.message` 24곳, 렌더·Ossia 오류, 업로드 로그, 세션 모달, 공유 링크 생성·읽기, 자동 저장 불러오기, MXL 내보내기, 재생 라이브러리 오류를 바꿨습니다. 디버그 기록(`__mxlLastError`)만 원문입니다. JSON 패턴은 최신 V8 문구("Expected property name … in JSON at position")도 맞도록 넓혔습니다.
- E17: 화성 쌓기는 원음 뒤에 이어지는 chord 음표(그리고 이번 실행에 넣은 음)와 step·alter·octave가 같으면 건너뛰고 `✓ {name}: {added}개 추가, {skipped}개는 이미 있어 건너뜀`을 적습니다. 바뀐 기대값: 14-harmony f04 1마디 `['A/3','C/4','C/4','E/4']` → `['A/3','C/4','E/4']`(A3 위 3도 C4가 이미 화음에 있음 — 예전 기대값이 중복 버그를 고정하고 있었음).
- E51·E54: 가사 스타일 크기 입력은 문자열 상태(`aria-invalid`, 라벨 '폰트 크기 (pt, 4~72)')이고, 실행 시 범위 밖이면 커밋하지 않고 로그를 남깁니다. 적용 항목이 모두 꺼지면 실행 버튼 비활성과 안내 문구.
- E30: 원위치 버튼에 '불러온 악보의 원래 슬래시 베이스도 함께 제거됩니다' 설명(aria-describedby). R56: 표기 변환 스위치 라벨 '{파트} 파트 제거(출력에서 삭제)', 카드 제목 '파트 제거', 상태 '제거/유지'(동작 그대로).
- 추가 발견(A2-8에서 기록): OSMD는 `<?xml`로 시작하지 않는 문자열을 URL로 보고 내려받으려 해, XML 선언 없는 MusicXML이 '악보를 렌더링하지 못했습니다'로 끝났습니다. `serializeScore`/`withXmlDeclaration`으로 본보·Ossia 렌더(뷰어·내보내기 미리보기)와 MXL score.xml·XML 내보내기에 선언을 보장합니다. 내보낸 파일을 OSMD 기반 다른 앱이 읽을 때도 같은 문제를 막습니다.
- 테스트: E2E 14-a11y-controls +1(Tab으로 F 음자리표 Enter, Allegro Space → 138, 60 BPM 눈금 Enter), 21-upload +2(깨진 MXL·JSON 한글 문구, 선언 없는 MusicXML 렌더와 MXL score.xml 선언), 14-harmony +1(위+아래 두 번 실행 음표 수 불변·건너뜀 로그)·기대값 1곳, 17-lyricstyle +1(200pt 거부·기록 불변·aria-invalid, 모든 항목 끔 → 비활성).
- 검증: 단위 185, 14-a11y·11·14-harmony·17·21·06·09·15·axe 28개, 12-session(모바일 포함)·09-notify·02-share·07·06-export·05-ossia 18개, 스모크 7 통과.

## 2026-11-10 · A2-11
- grep `detectChord|getKeyRoot|noteToNumStr|optStretch|baselineRef|files.map((f,i)=>i===fileIndex`: 남은 것은 NumberingCore.noteToNumStr·ChordToolsCore.detectChordFromPitchClasses 호출과 NotationPanel의 `baselineRef` 5줄뿐입니다(N8, A2-3에서 범위를 NumberingPanel로 한정).
- 24-audit-regressions 머리 주석에 보고서 4항 여섯 사례의 위치를 적었습니다((1)·B07·C16은 이 파일, (2) 06-tempo, (3) 16-numbering B04, (4)·(5) 12-export B05·B06, (6) 18-cursor). 중복 작성하지 않았습니다.
- 20-stats에 N6(f07 최고음 B♯5·음역 F♯4–B♯5) 테스트를 더했습니다.
- 전체 검증: 단위 185, chromium 141 통과·3 제외(시각), mobile @ux 9 통과·1 제외(데스크톱 너비). 합계 154개 중 150 통과, 4 제외, 8.6분.
- 문서: README(코어 11개, 픽스처 17개, 검증 행, 설계 문서 5번), README-TESTING(f13~f17, 24 스펙, axe 다섯 장면, 결과), docs/verification-report.md(Phase A2 재검증), 설명서·퀵스타트 표지 'Phase A2 · 2026년 11월 10일'과 꼬리말 날짜, 퀵스타트 Ossia·저장 실패 문장. `npm run docs:build`(DOCS_PYTHON=python3, PyMuPDF 1.28.2)로 설명서 10쪽·퀵스타트 4쪽 PDF·SVG 재생성, 전 페이지 이미지 확인. Linux라 Malgun Gothic 대신 Noto Sans CJK입니다. 업데이트 안내 PDF·SVG는 내용이 같아 원래 파일로 되돌렸습니다.

## Phase A2 요약

### 검수 ID ↔ 세션 ↔ 테스트

| ID | 세션 | 결과 | 테스트 |
|---|---|---|---|
| B01 | A2-1 | 현재 파일 범위 로마 숫자 삽입이 대상 파일만 바꿈, `mergeTargets` 길이 검사(N2) | e2e 24 B01 |
| B02 | A2-1 (D2) | 파일마다 파트 ID 재검증, 남길 파트가 없으면 건너뜀·경고 | e2e 24 B02 |
| B03 | A2-2 (D1) | duration 비례 변환 제거 | panels/06-tempo '300 BPM' |
| B04 | A2-3 (D3) | 생성 가사 표식 + 파일 객체 백업으로 다른 패널 뒤에도 복원 | panels/16-numbering B04 |
| B05 | A2-4 | 미리보기 출처가 바뀌면 지우고 저장 전 재확인 | panels/12-export B05 |
| B06 | A2-4 | ZIP stem 고유화 `(2)` | panels/12-export B06 |
| B07 | A2-5 (D6) | 지우기 뒤 기준점 1칸 | e2e 24 B07, 21-history |
| B08 | A2-2 | 마디별 템포 20~400 검증, 무효면 커밋 안 함 | panels/07-tempochange |
| B09 | A2-9 | 마디는 첫 파트 기준, 파트 수 표시 | panels/20-stats '첫 파트' |
| B10 | A2-5 | 재생 중 A-B 해제 시 곡 끝 정지 예약 + 폴링 안전망 | 18-cursor 'A-B loop off' |
| C01 | A2-7 (D9) | 3음 미만 unknown, 점수 폴백 제거 | unit roman |
| C02 | A2-7 (D9) | 코어 판정(1음 null, 2음은 완전5도만 5) | unit chord-tools 13케이스, panels/18-chords f02 |
| C03 | A2-3 | 이동 도법이 마디별 조표 | panels/16-numbering C03 |
| C04 | A2-3 (D4) | 기준 옥타브에서 떨어진 만큼 점(최대 3) | panels/16-numbering C04, unit numbering |
| C05 | A2-9 | 모든 key 갱신·보표별 철자 | unit transpose f15 |
| C06 | A2-9 (D11) | 온음계 간격 전달(C 감5도 ↑ G♭) | unit transpose, panels/01-transpose |
| C07 | A2-2 | 메트로놈 박 단위 환산 | panels/06-tempo f14, 07 f14 |
| C08 | A2-9 | 조성 상위에 단조 이름 | panels/20-stats Am |
| C09 | A2-8 | `<transpose>` 실음 | unit roman f16, panels/19-roman |
| C10 | A2-8 (D8) | 전위가 있으면 IAC | unit roman detectCadence |
| C11 | A2-6 | 모두 성공할 때만 구저장 키 삭제·migrationPending | unit session-store |
| C12 | A2-6 | no-storage·quota·storage-error 전달·UI 알림 | unit session-store, e2e 12-session-modal +2 |
| C13 | A2-4 (D7) | PNG·SVG에 Ossia, MXL·XML은 알림 | panels/12-export C13 |
| C14 | A2-4 | filled 속성 쓰지 않음 | panels/13-color |
| C15 | A2-7 (D10) | 박 단위 수직 분석 | unit roman analyzeVerticalities, panels/18-chords |
| C16 | A2-5 | 이동 기호 경고 표기 | unit playback, e2e 24 C16, axe 장면 |
| C17 | A2-10 | 음자리표·템포 프리셋·눈금 button | 14-a11y-controls |
| C18 | A2-7·A2-8 | 마디 number(0), 단조 로그, 파일 전환 시 결과 초기화 | panels/18-chords f03, panels/19-roman |
| E17 | A2-10 | 같은 3도 건너뜀 | panels/14-harmony 두 번 실행 |
| E30 | A2-10 | 원위치 설명 문구(동작 그대로) | (문구) |
| E37 | A2-3 | 생성 가사만 지우고 다시 생성 | panels/16-numbering E37 |
| E51·E54 | A2-10 | 적용 항목 없으면 비활성, 크기 4~72 | panels/17-lyricstyle |
| R10·R52 | A2-10 (D12) | `friendlyError` 한글 문장 + 원문 괄호 | panels/21-upload |
| R56 | A2-10 | '파트 제거(출력에서 삭제)' 라벨(동작 그대로) | (라벨) |
| N1 | A2-3 (D5) | '숫자 (도=1)' 칩 제거, 고정 도법 기본 | panels/16-numbering |
| N2 | A2-1 | `mergeTargets` 길이 불일치 예외 | e2e 24 B01(간접) |
| N3 | A2-4 | 12개 조 ZIP stem 고유화 | panels/01-transpose 같은 stem |
| N4 | A2-9 (D11) | 완전음정 칩 P·A·d·AA·dd | panels/01-transpose |
| N5 | A2-2 | 마디별 템포 기존 direction의 per-minute 환산 | panels/07-tempochange f14 |
| N6 | A2-9 | 최저·최고음 실제 철자 | panels/20-stats f07 |
| N7 | A2-1 | 업로드·복원 파일 객체를 commitFile 출처로 신뢰(재직렬화 방지) | e2e 24 B01 xmlString 불변 |
| N8 | — | NotationPanel baselineRef(남은 문제) | — |
| 추가 | A2-10 | XML 선언 없는 MusicXML 렌더·내보내기 선언 | panels/21-upload |

### 바뀐 기본값 D1~D12 (코드·설명서와 같음)

D1 템포 duration 비례 변환 제거 · D2 파트 추출 파일별 ID 검증·건너뜀 · D3 생성 가사 `name="mxl-studio-number"`와 파일 객체 `lyricBackup`(히스토리에도 참조로 보관, 세션·공유에는 넣지 않음) · D4 옥타브 점 기준 4·최대 3 · D5 고정 도법 기본 · D6 히스토리 기준점 · D7 Ossia는 PNG·SVG만 · D8 IAC · D9 코드 확정은 3음 이상(완전5도 2음은 5 코드, 로마 숫자는 3음 이상만) · D10 박 단위·마디 number · D11 온음계 음정·완전음정 칩 · D12 한글 오류문.

### 프롬프트와 다르게 정한 것 (각 세션 절에 이유)

A2-2 per-minute는 비율 대신 `목표 BPM ÷ 박 배수`, 겹점 ×1.75 · A2-3 lyricBackup을 히스토리에 포함, 이동 도법은 음이름 기반 · A2-4 PDF는 미리보기 검사 제외 · A2-5 경고는 재생 막대 시간 줄에 짧게(전체 문장은 title·숨김 글), 기준점 지우기 조건 확장 · A2-6 '자동저장 행'을 상태 줄로, 현재 상태 JSON 내보내기 추가 · A2-7 마디 찾기는 `measureIndex`, 로그에 '박' 표기 · A2-8 결과 초기화에서 이 패널의 삽입 결과는 유지 · A2-9 `keyIndexOfFifths`는 기존 함수 재사용 · A2-10 버튼 CSS는 기존 테두리·배경 유지.

### 바뀐 기대값

21-history 지우기 뒤 0개 → 기준점 1개 · 24 B01 두 번째 파일 f02 → f04(f02 유니슨 박은 화음이 아님) · 20-stats 타일 '총 음표' → '음표 (전체 파트)' · 14-harmony f04 1마디 중복 C4 제거. 기존 테스트가 없던 동작 변경: 이동 도법 A장조의 C가 '#2' → '♭3'(새 단위 테스트가 고정).

### 남은 문제

- 출력 파이프라인(최종 PDF 인쇄 검증, pageFormat·drawCredits, 한글 폰트, 좁은 미리보기의 첫 마디 뭉침) → 심층 분석 Phase B.
- Ossia를 MusicXML에 넣는 방식(별도 파트 또는 cue) 결정 → Phase B 또는 별도.
- D.C./D.S./Fine/Coda 재생 점프(지금은 경고만).
- NotationPanel `baselineRef`(N8): 다른 패널 커밋 뒤 '원본 복원'이 처음 상태로 돌아가지 못함.
- 모바일 실기기·Safari·Firefox, 드래그앤드롭, 실제 저장공간 가득 참 환경 확인(자동 테스트는 예외를 흉내 냄).
- Linux 시각 기준 이미지 3장은 Nightly `update_snapshots=true` 아티팩트 검토 후 반영.


## 2026-11-10 · Phase B 시작
- 근거: 배포본(GitHub Pages `mxl-studio.html`)을 main 24f5328과 대조해 같음을 확인한 뒤 직접 분석한 결과(결함 V1~V5, O1~O4, P1~P2, R1~R2, N8, U1). 분석 방법과 증거 등급, 기본값 E1~E12는 프롬프트 문서 0장에 있습니다.
- 사용자가 "개발 시작"을 지시했고, 위험하지 않은 구현 판단은 작업자가 자체 승인합니다(CLAUDE.md 4항). main에는 직접 올리지 않고 브랜치 `phase-b/output-validity`에서 단계마다 한 커밋씩 쌓습니다.

## 2026-11-10 · B-1
- **스키마 검증 기반**: `tests/schema/`에 MusicXML 4.0 XSD(`musicxml.xsd`)와 `xml.xsd`·`xlink.xsd`를 둡니다. 출처·바꾼 곳(import 두 줄)·직접 쓴 스텁의 한계는 `tests/schema/README.md`에 적었습니다. 작업 환경에서 W3C 저장소(403)와 musicxml.org에 접근하지 못해 PyPI `musicxml` 1.6.3 휠의 사본을 썼고, 공식 배포본과의 바이트 일치는 확인하지 못했습니다(확인 방법도 README에 있음).
- devDependency `xmllint-wasm` 5.3.0 고정. `npm install --save-dev`가 `package-lock.json`의 기존 항목(`libc` 등)을 지워서, HEAD의 lock에 필요한 세 패키지(`xmllint-wasm`, `@types/node`, `undici-types`)만 넣은 최소 변경으로 되돌렸습니다(`npm ci --dry-run` 통과).
- `tests/e2e/schema-validate.js`: `validateMusicXml(xml)` → 오류 문장 배열. xmllint-wasm → 시스템 xmllint → 없으면 `schemaSupport()`가 `{ok:false,reason}`을 주어 스펙이 `test.skip`. `MXL_SCHEMA_BACKEND=native`로 폴백 경로만 시험 가능. CI에 `libxml2-utils` 설치 단계 추가.
- **`export-core.js`(새 코어, `window.ExportCore`)**: 이번 세션 범위는 `normalizeColor`(#RGB·#RRGGBB·#RRGGBBAA → 대문자), `octaveOutOfRange`(pitch 옥타브가 0~9 정수가 아닌 음 최대 5개), `isPercussionPart`, 상수 `MIN_OCTAVE`·`MAX_OCTAVE`. 단위 테스트 14개. 부팅 검사 `missingLibraries`에 `ExportCore` 추가.
- **V1 색상**: `NOTE_COLORS`를 대문자로 바꾸고 `noteColorFor(step)`(= `ExportCore.normalizeColor`)를 거쳐 악보에 씁니다. 대상은 색깔 악보(note·notehead·stem)와 가사 계이름 색(lyric text)입니다. 형식이 틀리면 속성을 쓰지 않고 `⚠ … 색상 형식 오류` 로그를 남깁니다. 프롬프트가 있다고 본 가사 스타일 패널의 `<input type="color">`는 실제로는 없습니다(해당 없음).
- **V2 로마 숫자**: 표식을 `words@id="mxl-roman-<파트 번호(1부터)>-<번호>"`(xs:ID, 문서 안 유일)로 바꿨습니다. `roman-analysis-core.js`(`?v=3`)에 `ROMAN_ID_PREFIX`·`isRomanWords`·`migrateRomanMarkers`를 추가하고, `insertRomanNumerals`는 ① 모든 파트에서 이전 표식(구버전 속성 포함)을 지운 뒤 ② 이미 쓰인 id를 건너뛰며 새로 넣습니다. 이전에는 첫 파트만 지웠습니다. `migrateRomanMarkers`의 반환값은 "문서를 고친 words 수"라서 0보다 크면 xmlString을 다시 직렬화해야 합니다.
- **프롬프트와 다르게 정한 것**: ① 이전(migrate) 호출을 호출처마다 넣지 않고 `trustParsedFile`(업로드·세션 복원·공유·작업 기록 복원이 모두 지나는 단일 이음매)에 한 번만 넣었습니다. 바뀐 파일은 `commitFile`로 xmlString을 다시 만들고, 바뀔 것이 없으면 같은 객체를 돌려줍니다(문자열에 `data-roman-analysis`가 없으면 DOM을 훑지도 않음). ② 로마 숫자 패널에는 프롬프트가 말한 '삽입 제거' 버튼이 없고 '악보에 삽입'이 이전 표식을 교체하는 구조라서, 완료 기준을 "구 표식 파일 업로드 → 표준 id로 이전 → 다시 삽입하면 중복 없이 교체"로 검증했습니다(새 버튼은 만들지 않음). ③ `musicxml.local.xsd` 사본을 따로 두지 않고 `musicxml.xsd`의 import를 직접 로컬 경로로 바꿨습니다.
- **검증 스펙** `tests/e2e/25-schema.spec.js`(@panels, 31개): 패널 28행(조옮김 2·조바꿈·카포·음역·이조·템포 2·Ossia(별도 `ossiaMxml`도 검증)·음자리표·파트 추출·표기 변환 5·색깔 악보 2·화성 쌓기·코드 도구 3·숫자 악보 3·가사 스타일 2·로마 숫자), 전체 픽스처 가져오기 1, 구 표식 2(업로드→재삽입, 세션 JSON 복원). 각 행은 먼저 작업 기록이 늘었는지(패널이 실제로 실행됐는지) 확인한 뒤 열린 모든 파일을 스키마로 검증합니다.
- **스펙이 잡아내는지 확인**: V1(색 소문자)·V2(`data-roman-analysis` 재도입)를 일부러 되살려 돌리면 색깔 악보 2·가사 색·로마 삽입·구 표식 업로드의 5개가 실패하고(오류문에 `not accepted by the pattern`, `attribute is not allowed`), 원복하면 통과합니다.
- 기존 테스트 기대값 변경: `24-audit-regressions` 요약 함수의 `words[data-roman-analysis]` → `words[id^="mxl-roman-"]`, `roman-analysis-core` 단위 테스트의 표식 단언 → id 접두·고유성·구속성 없음.
- 검증: 단위 207(185+export-core 14+roman 8), 25-schema 31, `--grep @panels` 121, `--grep @smoke` 7 모두 통과. (샌드박스 주의: 하네스 `e2e.sh`는 CDN 미러가 꺼져 있으면 미러를 파이프에 물린 채 띄우므로, 출력은 `| tail` 대신 파일로 돌려야 합니다. 저장소 코드와는 무관.)
