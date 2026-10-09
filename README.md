# 악보 디자이너 MXL Studio09

MusicXML/MXL 악보(와 MuseScore `.mscz`·`.mscx` 파일)의 조옮김·분석·재생·세션 저장을 지원하는 React 18 UMD 단일 HTML 앱입니다. 21개 패널과 9개 순수 코어를 사용합니다. 현대 Chrome/Edge 등 ES2020 지원 브라우저가 기준이며, Babel은 JSX 변환만 수행합니다.

## 시작

```powershell
npm ci
npm run serve
```

[로컬 앱 열기](http://localhost:8080/mxl-studio.html). `npm run check`는 단위 테스트와 기본 브라우저 검증, `npm run e2e`는 전체 검증입니다. 로컬에서는 설치된 Chrome, CI에서는 Playwright Chromium을 사용합니다.

## 폴더와 코어

| 위치 | 역할 |
|---|---|
| `mxl-studio.html`, `styles.css` | React 패널·상태·화면과 스타일 |
| `transpose-core.js` | 단조·조성·이명동음·음표 및 코드 조옮김 |
| `playback-core.js` | 반복·템포·붙임줄·셈여림 이벤트, 마디 타임라인 |
| `chord-symbol-core.js` | MusicXML 코드 종류 33종, slash·degree 파싱과 적용 |
| `chord-tools-core.js` | N.C. 판정과 보존 |
| `roman-analysis-core.js` | 장단조·전위·부속화음·종지 분석 |
| `history-core.js` | XML 문자열 기록, 복원·분기·50개 제한 |
| `share-session-core.js` | 현재 XML·Ossia 직렬화와 압축 공유 링크 |
| `session-store-core.js` | IndexedDB·localStorage 세션 저장과 목록 |
| `mscz-core.js` | MuseScore(.mscz/.mscx) → MusicXML 브라우저 변환 (형식 1.x~5.00) |
| `tests/fixtures`, `tests/unit`, `tests/e2e` | 픽스처 10개(MuseScore 포함), 단위·브라우저 회귀 |
| `manual`, `MXL-Studio-사용자설명서`, `MXL-Studio-퀵스타트-사용자설명서` | 설명서 HTML 정본과 PDF·SVG 배포본 |
| `MXL-Studio-업데이트-문서` | 최근 변경 안내와 2026년 9월 릴리스 노트 |
| `scripts` | HTML → PDF → SVG 재생성 도구, MuseScore 픽스처(.mscz) 생성 |
| `.github/workflows` | CI·Nightly·Pages 배포·배포 후 검증 |
| `checklist.md`, `context-notes.md`, `docs` | 단계별 작업·검증·문서 점검 기록 |

## 검증 현황

2026-09-03 Windows Chrome: 단위 **84개 통과**, 전체 브라우저 **80개 통과 / 4개 제외**, **5.5분**. 제외 항목은 모바일의 데스크톱 너비 검사 1개와 Linux 기준 시각 이미지 3개입니다. axe 네 장면 serious/critical 0.

2026-10-09 MuseScore 변환 추가: 단위 **118개 통과**, `@musescore` 브라우저 7개 통과. MuseScore가 내보낸 MusicXML 46쌍과 음표·길이·붙임줄 334/334마디 일치, 실제 MuseScore 파일 11개 열기 확인(상세는 `context-notes.md`).

테스트 태그: `@smoke @fixtures @panels @ux @a11y @robustness @perf @visual @musescore`. 자세한 방법과 제외 조건은 [테스트 가이드](README-TESTING.md), 실측은 [검증 보고서](docs/verification-report.md)에 있습니다.

## MuseScore 파일 열기

업로드 패널에 `.mscz`(압축) 또는 `.mscx`(XML) 파일을 올리면 브라우저에서 MusicXML로 변환해 `<파일명>.musicxml`로 엽니다. 서버나 MuseScore 설치가 필요 없고, 원본 파일명은 `sourceName`에 남습니다. MuseScore 1.x·2.x·3.x·4.x와 현재 개발판(5.00) 형식을 읽습니다.

- 옮기는 것: 음높이(이조 악기는 기보음·기보 조표와 `<transpose>`), 리듬·점음표·잇단음표, 쉼표, 붙임줄·슬러, 여러 보이스·오선, 못갖춘마디, 반복·볼타·마디선, 조표·박자·음자리표, 템포·셈여림·헤어핀·옥타브 기호, 코드 심볼, 가사, 장식음·아티큘레이션·트레몰로, 마디 반복 기호.
- 근사하거나 옮기지 않는 것: 타브 악보(일반 오선으로), 타악기(음 위치만 근사), 사용자 정의 조표(조표 없음), 페달·글리산도·텍스트 선 같은 선 요소, 보표 배치·꾸밈 설정, 파트 악보(Excerpts). 이런 경우 업로드 로그에 안내가 표시됩니다.
- 변환기가 로드되지 않으면 MuseScore 파일만 거부되고 안내가 나옵니다. MuseScore에서 *파일 → 내보내기 → MusicXML*로 저장한 파일은 그대로 열립니다.

## 사용자 문서

- [사용자 설명서](manual/MXL-Studio-User-Manual-ko.html): 21개 도구, 저장·공유·재생·모바일 상세 안내.
- [퀵스타트](manual/MXL-Studio-Quick-Start-ko.html): 업로드부터 저장까지 빠른 흐름.
- [9월 업데이트](MXL-Studio-업데이트-문서/MXL-Studio-2026-09-업데이트-안내.md): 이번 개선 내용.

HTML이 정본이며 PDF와 SVG도 2026-09-03 버전으로 재생성했습니다. `python -m pip install -r scripts/requirements-docs.txt` 후 `npm run docs:build`로 갱신합니다. 다른 Python을 쓰려면 `DOCS_PYTHON` 환경 변수에 실행 경로를 지정합니다.

## 설계 문서 관계

1. `MXL-Studio09-개선보완-바이브코딩-프롬프트(Fable51).md`: 이 저장소의 기준. Phase 0-8 로컬 구현과 문서 정리를 수행했습니다.
2. `MXL Studio—기능 추가 바이브코딩 프롬프트집.md`: 이전 기능별 설계 기록. 완료 프롬프트를 상단 표에 표시했습니다.
3. `MXL-Studio-기능확장-자동테스트-바이브코딩-프롬프트.md`: 다른 스냅샷용 확장 설계. 존재하지 않는 모듈을 전제로 실행하면 안 됩니다.

선택 Phase 9의 주석·청음·난이도·운지·QR·AI·클라우드는 이번 구현 범위에 포함하지 않았습니다. D.C./D.S./Fine/코다 재생 이동도 제외되어 있습니다.

## 배포와 남은 외부 작업

main에 푸시하면 Pages 배포 워크플로가 공개 앱·코어·매뉴얼만 업로드합니다. 배포 주소는 [MXL Studio09](https://kimyounggaur.github.io/Score_Designer-Original-/mxl-studio.html)이며, 배포 후와 야간 프로덕션 검증은 이 확인된 주소의 디렉터리를 사용합니다.

Linux 시각 기준 3장은 Nightly의 `update_snapshots=true`로 생성한 아티팩트를 검토해 저장소에 반영해야 합니다.
