# MXL Studio09 테스트 가이드

## 실행

```powershell
npm ci
npm test
npm run e2e:smoke
npm run e2e
```

`npm run check`는 단위 + smoke, `npm run e2e:report`는 HTML 보고서를 엽니다. Windows는 설치된 Chrome, CI는 `npx playwright install --with-deps chromium`으로 준비합니다. 테스트 서버는 8080 포트에서 자동 실행됩니다. 기존 서버가 있다면 동일한 작업 폴더인지 확인하세요.

Vitest는 Windows 한글·공백 경로의 forks 문제를 피하려고 threads 풀을 사용합니다. Playwright는 외부 CDN의 QUIC 오류를 피하도록 `--disable-quic`를 사용하고 DOMContentLoaded 뒤 실제 앱·악보 상태를 기다립니다. 실제 소리의 청감은 자동 검증하지 않습니다.

## 검증 범위

| 태그 | 파일/영역 | 검사 |
|---|---|---|
| @smoke | 00, 02 | 시작·업로드·Ossia·조옮김·자동복원·편집 후 공유 |
| @fixtures | 01 | f01-f09 렌더링 |
| @panels | 03-06, 17-19, 21, panels/01-21 | 활성 파일·MXL 왕복·Ossia·재생·커서·각 패널 결과·기록 |
| @ux | 09-13, 16 | 알림·탭·레이아웃·세션·줌·인쇄·모바일 드로어 |
| @a11y | 14-15, a11y/axe | 키보드 버튼·메뉴, axe 네 장면 |
| @robustness | 07-08 | CDN·패널 오류, 파일 형식·중복·크기 제한 |
| @perf | 20, 22 | 초기 패널 수·가사 복원·자동저장 중복·지연 오디오 |
| @visual | visual/score | f01, f04, f09 악보 스크린샷 |

`tests/unit`의 8개 코어 테스트 파일은 transpose, playback, chord-symbol, chord-tools, roman-analysis, history, share-session, session-store를 검증합니다. 기존 `history-core.test.html`, `chord-tools-core.test.html`, `roman-analysis.test.html`도 보존합니다.

| 픽스처 | 내용 |
|---|---|
| f01-basic.musicxml | C장조 2마디·8음표. 설계 문서의 4마디 표기와 다름 |
| f02-two-parts.musicxml | Piano/Violin 4마디, divisions 4/2 |
| f03-pickup.musicxml | 0번 못갖춘마디 + 1-4마디 |
| f04-minor-harmony.musicxml | A단조 Am-Dm-E7-Am, 동시 화음 |
| f05-transposing.musicxml | B♭ 클라리넷 D장조, transpose -2 |
| f06-lyrics-ties.musicxml | 한글 가사·붙임줄·셋잇단음·p/f |
| f07-enharmonic.musicxml | F♯장조 E♯와 변화음 B♯ |
| f08-repeats-tempo.musicxml | 반복 확장 6마디, 100→60 BPM |
| f09-real.mxl | 기존 실제 악보의 압축 MXL |

2026-09-03 결과: 단위 84개 통과. 전체 E2E는 84개 중 80개 통과, 4개 제외, 5.5분. `chromium` 전체와 `mobile` Pixel 5의 @ux를 실행했습니다. 모바일에서는 데스크톱 패널 너비 검사를 제외합니다.

## 스냅샷 정책

Linux CI가 정본입니다. Windows/macOS에서 `--update-snapshots`를 사용하지 않습니다. 첫 기준 이미지는 GitHub `Nightly Full Test`를 수동 실행하며 `update_snapshots=true`로 생성합니다. `linux-visual-baselines` 아티팩트를 검토하고 `tests/e2e/__snapshots__`에 반영합니다.

Windows 시각 검사 3개는 명시적으로 제외됩니다. Linux도 기준 이미지가 없으면 최초 생성 안내와 함께 제외하고, 생성 요청 시에는 실제 이미지 3장을 만들어 아티팩트가 비어 있으면 실패합니다. 기준 이미지가 들어간 뒤에는 변경 비율 1% 초과를 실패로 처리합니다. 아직 외부 CI에서 최초 이미지를 생성하지 않았습니다.

## CI와 배포

| 워크플로 | 역할 |
|---|---|
| CI | main/PR: 단위·smoke·panels·axe 필수 |
| Deploy static site to GitHub Pages | main/수동: 공개 파일만 Pages 업로드 |
| Post-deploy Smoke | 배포 성공 뒤 확인된 Pages 주소 검사 |
| Nightly Full Test | 매일 한국 06:00·수동: 전체 검증, Linux 이미지 생성 선택 |

확인된 Pages 주소는 `https://kimyounggaur.github.io/Score_Designer-Original-/mxl-studio.html`입니다. 워크플로와 로컬 검증에서는 테스트가 `mxl-studio.html`을 덧붙일 수 있도록 디렉터리 주소 `https://kimyounggaur.github.io/Score_Designer-Original-/`를 `PROD_BASE_URL`로 사용합니다.

실패하면 `playwright-report`와 `test-results`의 화면·trace·axe JSON을 확인하세요. 워크플로는 실행 결과 아티팩트를 남기며 외부 이슈나 메시지를 자동 발송하지 않습니다.
