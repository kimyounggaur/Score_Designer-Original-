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
