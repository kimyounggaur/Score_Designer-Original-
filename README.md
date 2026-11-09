# 악보 디자이너 MXL Studio09

MusicXML/MXL 악보의 조옮김·분석·재생·세션 저장을 지원하는 React 18 UMD 단일 HTML 앱입니다. 21개 패널과 11개 순수 코어를 사용합니다. 현대 Chrome/Edge 등 ES2020 지원 브라우저가 기준이며, Babel은 JSX 변환만 수행합니다.

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
| `transpose-core.js` | 단조·조성·이명동음·음표 및 코드 조옮김, 파트·마디 구간 조옮김, 온음계 음정 이동, 보표별 조표 |
| `pitch-core.js` | 음이름 철자를 지키는 음정 계산·옥타브 이동, 조표·임시표 판단, 3도·자리바꿈 베이스 |
| `measure-core.js` | 마디 번호(못갖춘마디 0) 조회, 유효 attributes 누적, 변경 지점 구간 분할 |
| `playback-core.js` | 반복·템포·붙임줄·셈여림 이벤트, 마디 타임라인, 재생이 따르지 않는 이동 기호 경고 |
| `chord-symbol-core.js` | MusicXML 코드 종류 33종, slash·degree 파싱과 적용 |
| `chord-tools-core.js` | N.C. 판정과 보존, 음높이류 코드 판정(3음 이상·완전5도)과 조표 철자 |
| `numbering-core.js` | 숫자 악보(고정·이동 도법·한국어 계이름) 생성 가사 표식, 원본 가사 백업·복원, 옥타브 점 |
| `roman-analysis-core.js` | 장단조·전위·부속화음·종지(IAC 포함) 분석, 마디별 조표·이조 악기 실음, 박 단위 수직 분석 |
| `history-core.js` | XML 문자열 기록, 복원·분기·50개 제한 |
| `share-session-core.js` | 현재 XML·Ossia 직렬화와 압축 공유 링크 |
| `session-store-core.js` | IndexedDB·localStorage 세션 저장과 목록, 쓰기 실패 이유 전달, 구세션 이전 보호 |
| `tests/fixtures`, `tests/unit`, `tests/e2e` | 픽스처 17개, 단위·브라우저 회귀(검수 회귀 24-audit-regressions 포함) |
| `manual`, `MXL-Studio-사용자설명서`, `MXL-Studio-퀵스타트-사용자설명서` | 설명서 HTML 정본과 PDF·SVG 배포본 |
| `MXL-Studio-업데이트-문서` | 최근 변경 안내와 2026년 9월 릴리스 노트 |
| `scripts` | HTML → PDF → SVG 재생성 도구 |
| `.github/workflows` | CI·Nightly·Pages 배포·배포 후 검증 |
| `checklist.md`, `context-notes.md`, `docs` | 단계별 작업·검증·문서 점검 기록 |

## 검증 현황

| 날짜 | 환경 | 단위 | 전체 브라우저 | 시간 |
|---|---|---|---|---|
| 2026-11-10 (Phase A2) | Linux 헤드리스 Chrome | **185개 통과** | **150개 통과 / 4개 제외** | 8.6분 |
| 2026-11-09 (Phase A) | Linux 헤드리스 Chrome | **142개 통과** | **107개 통과 / 4개 제외** | 6.1분 |
| 2026-09-03 | Windows Chrome | **84개 통과** | **80개 통과 / 4개 제외** | 5.5분 |

제외 항목은 매번 모바일의 데스크톱 너비 검사 1개와 Linux 기준 시각 이미지 3개입니다. axe 다섯 장면(반복 기호 경고 장면 추가) serious/critical 0. 2026-11-09·10 실행은 외부 CDN이 막힌 작업 환경이라 같은 버전·같은 바이트의 라이브러리를 로컬 미러로 제공했습니다.

테스트 태그: `@smoke @fixtures @panels @ux @a11y @robustness @perf @visual`. 자세한 방법과 제외 조건은 [테스트 가이드](README-TESTING.md), 실측은 [검증 보고서](docs/verification-report.md)에 있습니다.

## 사용자 문서

- [사용자 설명서](manual/MXL-Studio-User-Manual-ko.html): 21개 도구, 저장·공유·재생·모바일 상세 안내.
- [퀵스타트](manual/MXL-Studio-Quick-Start-ko.html): 업로드부터 저장까지 빠른 흐름.
- [9월 업데이트](MXL-Studio-업데이트-문서/MXL-Studio-2026-09-업데이트-안내.md): 이번 개선 내용.

HTML이 정본이며 설명서·퀵스타트의 PDF와 SVG는 2026-11-10 버전으로 재생성했습니다(Linux에서 생성해 Malgun Gothic 대신 Noto Sans CJK로 표시됩니다. Windows에서 다시 생성하면 원래 글꼴로 돌아갑니다). `python -m pip install -r scripts/requirements-docs.txt` 후 `npm run docs:build`로 갱신합니다. 다른 Python을 쓰려면 `DOCS_PYTHON` 환경 변수에 실행 경로를 지정합니다.

## 설계 문서 관계

1. `MXL-Studio09-개선보완-바이브코딩-프롬프트(Fable51).md`: 이 저장소의 기준. Phase 0-8 로컬 구현과 문서 정리를 수행했습니다.
2. `MXL Studio—기능 추가 바이브코딩 프롬프트집.md`: 이전 기능별 설계 기록. 완료 프롬프트를 상단 표에 표시했습니다.
3. `MXL-Studio-기능확장-자동테스트-바이브코딩-프롬프트.md`: 다른 스냅샷용 확장 설계. 존재하지 않는 모듈을 전제로 실행하면 안 됩니다.
4. `MXL-Studio10-PhaseA-변환정확도-바이브코딩-프롬프트.md`: Studio10 Phase A(A-1~A-10) 변환 정확도 작업의 기준. 진행 기록은 `checklist.md`, 결정과 남은 문제는 `context-notes.md`의 Phase A 절에 있습니다.
5. `MXL-Studio10-PhaseA2-검수대응-바이브코딩-프롬프트.md`: 2026-11-09 외부 검수 보고서(B01~B10·C01~C18) 대응 Phase A2(A2-1~A2-11)의 기준. 작업자 기본값 D1~D12와 검수 ID별 결과는 `context-notes.md`의 `Phase A2 요약`에 있습니다.

선택 Phase 9의 주석·청음·난이도·운지·QR·AI·클라우드는 이번 구현 범위에 포함하지 않았습니다. D.C./D.S./Fine/코다 재생 이동도 제외되어 있으며, 악보에 이런 기호가 있으면 재생 막대에 '재생 미반영'으로 알립니다.

## 배포와 남은 외부 작업

main에 푸시하면 Pages 배포 워크플로가 공개 앱·코어·매뉴얼만 업로드합니다. 배포 주소는 [MXL Studio09](https://kimyounggaur.github.io/Score_Designer-Original-/mxl-studio.html)이며, 배포 후와 야간 프로덕션 검증은 이 확인된 주소의 디렉터리를 사용합니다.

Linux 시각 기준 3장은 Nightly의 `update_snapshots=true`로 생성한 아티팩트를 검토해 저장소에 반영해야 합니다.
