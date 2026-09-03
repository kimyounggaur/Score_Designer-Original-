# MXL Studio 테스트 가이드

이 프로젝트는 빌드 없이 `mxl-studio.html`을 직접 실행하는 구조를 유지하면서, 자동 회귀 테스트만 npm 기반으로 붙였습니다.

## 로컬 실행

1. 의존성 설치

```bash
npm ci
```

2. 코어 유닛 테스트

```bash
npm test
```

3. 브라우저 스모크

```bash
npm run e2e:smoke
```

로컬에서는 설치된 Chrome을 사용합니다. CI에서는 Playwright Chromium을 설치해 실행합니다.

4. 전체 E2E

```bash
npm run e2e
```

현재 E2E는 Phase 8.3 스모크 범위입니다. 이후 30개 패널 전수, 시각 회귀, 백엔드 테스트를 같은 `tests/e2e` 아래에 단계적으로 추가합니다.

5. 프로덕션 스모크

```bash
PROD_BASE_URL=https://kimyounggaur.github.io/Score_Designer-Original- npm run e2e:prod
```

Windows PowerShell에서는 다음처럼 실행합니다.

```powershell
$env:PROD_BASE_URL='https://kimyounggaur.github.io/Score_Designer-Original-'; npm.cmd run e2e:prod
```

## 현재 자동 검증 범위

- `HistoryCore`: 딥클론 스냅샷, undo 분기 절단, 최대 50개 제한, 메타 직렬화
- `ChordToolsCore`: N.C. 판정과 보존
- `RomanAnalysis`: 로마 숫자 분석, 종지 검출, 악보 삽입
- `SessionStoreCore`: IndexedDB 저장/로드, 4MB 초과 거부, localStorage 이관, 슬롯 정렬
- `ShareSessionCore`: gzip base64url 공유 v2, v1 하위호환
- Playwright 스모크: 빈 앱 로드, MusicXML 업로드, 조옮김(+2 반음), 자동저장 복원, 압축 공유 링크 로드

## CI 스케줄

| 워크플로 | 트리거 | 내용 |
|---|---|---|
| CI | main push, pull_request | `npm test` 후 `npm run e2e:smoke` |
| Nightly Full Test | 매일 21:00 UTC(한국 06:00), 수동 실행 | 유닛 + 전체 E2E + 프로덕션 스모크, 실패 시 이슈 생성 |
| Post-deploy Smoke | GitHub Pages 배포 성공 직후 | 실제 Pages URL에서 스모크 |

## 실패 처리

- 유닛 실패: 해당 `*-core.js`와 대응 테스트를 함께 확인합니다.
- E2E 실패: `playwright-report` 또는 `test-results`의 스크린샷과 trace를 확인합니다.
- Nightly 실패: `nightly-failure` 라벨 이슈가 자동 생성되며, 같은 날짜의 실패는 기존 이슈에 코멘트로 누적됩니다.

## 스냅샷 정책

시각 회귀 스냅샷은 아직 다음 단계(Phase 8.5)에서 추가합니다. 추가 후에는 Linux CI에서 생성한 스냅샷을 정본으로 삼고, 로컬 Windows/macOS에서 임의 갱신하지 않습니다.
