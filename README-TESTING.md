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
| @fixtures | 01 | f01-f17 렌더링 |
| @panels | 03-06, 17-19, 21, 23, 24, panels/01-21 | 활성 파일·MXL 왕복·Ossia·재생·커서·각 패널 결과·기록·적용 대상(전체/현재 파일)·12개 조 ZIP·검수 보고서 회귀(24-audit-regressions) |
| @ux | 09-13, 16 | 알림·탭·레이아웃·세션·줌·인쇄·모바일 드로어 |
| @a11y | 14-15, a11y/axe | 키보드 버튼·메뉴·음자리표·템포 프리셋, axe 다섯 장면 |
| @robustness | 07-08 | CDN·패널 오류, 파일 형식·중복·크기 제한 |
| @perf | 20, 22 | 초기 패널 수·가사 복원·자동저장 중복·지연 오디오 |
| @visual | visual/score | f01, f04, f09 악보 스크린샷 |

`tests/unit`의 11개 코어 테스트 파일은 transpose, pitch, measure, numbering, playback, chord-symbol, chord-tools, roman-analysis, history, share-session, session-store를 검증합니다. 기존 `history-core.test.html`, `chord-tools-core.test.html`, `roman-analysis.test.html`도 보존합니다.

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
| f10-keychange-clef.musicxml | Cello 4마디. 3마디에서 조표 0→3♯, 음자리표 G→F 변경 (Ossia·조옮김 구간) |
| f11-chords-inversion.musicxml | C장조 4마디 코드 E, B7, A♭m(임시표 ♭), C/E (자리바꿈·코드 조옮김) |
| f12-piano-voices.musicxml | 피아노 2보표·2성부, divisions 6, 셋잇단음·beam (화성 쌓기 속성 복사) |
| f13-part-p99.musicxml | 파트 ID P99 Flute 2마디 (전체 범위 파트 추출 B02) |
| f14-dotted-metronome.musicxml | 6/8, 점4분음표=60·sound 90 (메트로놈 박 단위 환산 C07·N5) |
| f15-two-staff-keys.musicxml | 피아노 2보표, key number 1·2 따로 표기 (보표별 조표 조옮김 C05) |
| f16-ensemble-transposing.musicxml | 피아노 C·E·G + B♭ 클라리넷 기보 D·F♯·A (실음 로마 숫자 C09) |
| f17-dacapo.musicxml | 4마디, Fine·D.C. al Fine (반복 기호 미지원 경고 C16) |

2026-09-03 결과: 단위 84개 통과. 전체 E2E는 84개 중 80개 통과, 4개 제외, 5.5분. `chromium` 전체와 `mobile` Pixel 5의 @ux를 실행했습니다. 모바일에서는 데스크톱 패널 너비 검사를 제외합니다.

2026-11-10 결과(Phase A2, Linux 헤드리스 Chrome): 단위 11개 파일 185개 통과. 전체 E2E는 154개 중 150개 통과(chromium 141, mobile 9), 4개 제외(시각 3·모바일 데스크톱 너비 1), 8.6분. 외부 검수 보고서의 재현 순서는 `24-audit-regressions.spec.js`(B01·B02·B07·C16)와 각 패널 스펙에 있으며, 파일 머리 주석에 보고서 4항 여섯 사례의 위치를 적었습니다. 같은 로컬 미러 방식으로 실행했습니다.

2026-11-09 결과(Phase A, Linux 헤드리스 Chrome): 단위 142개 통과. 전체 E2E는 111개 중 107개 통과(chromium 100, mobile 7), 4개 제외(Linux 기준 이미지가 없는 시각 검사 3개, 모바일 데스크톱 너비 검사 1개), 6.1분. 작업 환경에서 외부 CDN 접속이 막혀 같은 버전·같은 바이트의 라이브러리 파일을 로컬 미러로 제공해 실행했습니다.

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
