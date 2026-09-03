# MXL Studio09 개선·보완 바이브코딩 프롬프트

작성일 2026-09-03.
대상 스냅샷 `mxl-studio09` 폴더 (mxl-studio.html 4,521줄 / styles.css 2,304줄 / 코어 5개 / 패널 21개).
목적은 새 기능을 얹기 전에 **지금 있는 기능을 정확하고 견고하고 접근 가능하게** 만드는 것입니다.

---

## 0. 이 문서를 읽기 전에

### 0.1 기존 프롬프트 문서 두 개와의 관계

이 폴더에는 이미 프롬프트 문서가 두 개 있습니다.

| 문서 | 기준 코드베이스 | 이 폴더에 그대로 적용 가능한가 |
|---|---|---|
| `MXL Studio—기능 추가 바이브코딩 프롬프트집.md` | 초기 버전 (Undo·재생·로마숫자가 없던 시절) | 일부 구현 완료. PROMPT-01/02/03/10은 이미 반영됨 |
| `MXL-Studio-기능확장-자동테스트-바이브코딩-프롬프트.md` | **다른 스냅샷** (6,396줄, 패널 30개, 코어 14개) | **아니오.** 이 폴더에는 `fingering-core.js`, `annotations-core.js` 등 9개 코어와 패널 9개가 없음 |

즉 두 번째 문서의 Part 0 분석은 이 폴더의 실제 상태와 다릅니다. 이 문서는 **이 폴더의 실제 코드**를 기준으로 다시 분석했고, 모든 근거를 `파일:줄` 형식으로 적었습니다. 줄 번호는 2026-09-03 기준이며, 편집이 진행되면 어긋나므로 각 프롬프트는 반드시 함수명으로 다시 grep 하도록 지시합니다.

### 0.2 사용 방법

1. 매 세션 시작 시 **2장 공통 계약**을 통째로 붙여넣습니다. 이 폴더의 `CLAUDE.md`가 이미 일부를 담고 있으므로 Claude Code를 쓴다면 2.2절의 추가 규칙만 `CLAUDE.md`에 병합해도 됩니다.
2. 3장의 프롬프트를 **한 세션에 하나씩** 순서대로 실행합니다. 각 프롬프트는 "근거 → 목표 → 프롬프트 본문 → 완료 기준 → 검증 명령" 구조입니다.
3. 프롬프트 본문은 코드 블록 안의 텍스트를 그대로 복사해 붙여넣습니다.
4. 완료 기준의 체크박스가 모두 채워지기 전에는 다음 프롬프트로 넘어가지 않습니다.

### 0.3 검증 명령 (실측 기준)

| 명령 | 실측 결과 (2026-09-03, Windows 11, 한글·공백 경로) |
|---|---|
| `npm test` | **실패.** Vitest forks 워커가 60초 타임아웃 (`Timeout waiting for worker to respond`) |
| `npx vitest run --pool=threads` | **통과.** 5파일 14테스트, 43초 (jsdom 환경 초기화가 누적 190초로 느림) |
| `npm run e2e:smoke` | **통과.** 6테스트, 2.3분 (로컬 Chrome 채널 사용) |
| `git status` | **git 저장소가 아님.** CI 워크플로 3개는 이 폴더에서 동작하지 않음 |

Phase 0에서 `npm test`가 그대로 통과하도록 고칩니다. 그 전까지는 `--pool=threads`를 붙여 실행합니다.

---

## 1. 심층 분석 결과

### 1.1 아키텍처 스냅샷

| 항목 | 실제 상태 |
|---|---|
| 메인 파일 | `mxl-studio.html` 4,521줄, 약 227KB. `<script type="text/babel">` 하나에 React 앱 전체 |
| 프레임워크 | React 18.2 UMD + Babel Standalone 7.23.9. 매 로드마다 브라우저에서 JSX 컴파일. `ReactDOM.render` 레거시 API 사용 (`mxl-studio.html:4519`) |
| 렌더링 | OpenSheetMusicDisplay 1.8.9 (SVG). 메인 악보 1개 + Ossia 인라인 1개 + Export 미리보기 1개 인스턴스 |
| 재생 | Tone.js 14.8.49 `PolySynth` 근사 음색 3종 (piano/strings/flute). `extractMidiPlaybackData` (`mxl-studio.html:254`) |
| 압축 | JSZip 3.10.1. `.mxl` 해제에만 사용. **내보내기는 압축 안 함** (`exportMXL`이 `.xml`을 저장, `mxl-studio.html:4280`) |
| 스타일 | `styles.css` 단일 파일. Apple 스타일 토큰. 다크 모드·`focus-visible`·`@media print`·`prefers-reduced-motion` **모두 없음** |
| 코어 모듈 | 5개. `chord-tools-core.js`(39줄) `history-core.js`(43줄) `roman-analysis-core.js`(281줄) `session-store-core.js`(328줄) `share-session-core.js`(187줄) |
| 저장 | IndexedDB(`mxl-studio` DB) + localStorage 폴백. 자동저장 5초 디바운스. 슬롯 저장은 `window.prompt` 사용 (`mxl-studio.html:4051`) |
| 공유 | URL fragment `#v2.<gzip base64url>`. v1 하위호환. 경고 200KB, 상한 500KB |
| 테스트 | Vitest 5파일 14테스트, Playwright 스모크 1파일 6테스트, 픽스처 1개 (`tests/fixtures/f01-basic.musicxml`) |
| CI | `ci.yml` `nightly.yml` `post-deploy.yml`. post-deploy는 존재하지 않는 "Deploy static site to GitHub Pages" 워크플로를 트리거로 지정. nightly의 prod URL은 다른 저장소(`Score_Designer-Original-`) |
| 문서 | `manual/` 퀵스타트·사용자 설명서 HTML+PDF. **존재하지 않는 기능을 설명함** (1.5 DOC 항목 참고) |
| 저장소 위생 | 루트에 `tmp/`, `tmp-ossia-box.png`, `tmp-score-designer-original/`(Python 백엔드 포함), `.codex-push/`(중첩 `.git` 포함), 샘플 `.mxl` 1개. `.gitignore`가 이들을 제외하지 않음 |

### 1.2 기능 인벤토리 (패널 21개)

`activeFile` 열은 패널이 현재 선택된 파일을 존중하는지 여부입니다. 대부분 `files[0]`만 읽습니다 (`mxl-studio.html`에 `files[0]` 참조 23곳).

| id | 위치 | 라벨 | 컴포넌트 (줄) | activeFile | 코드심볼 처리 | 코어 분리 | E2E |
|---|---|---|---|---|---|---|---|
| upload | 좌 | 파일 업로드 | `UploadPanel` 516 | 해당 없음 | 해당 없음 | 없음 | 있음 |
| transpose | 좌 | 조옮김 | `TransposePanel` 583 | 전체 파일 일괄 | **안 함** | 없음 | 있음(반음) |
| keychange | 좌 | 마디별 조바꿈 | `KeyChangePanel` 976 | `files[0]` | **안 함** | 없음 | 없음 |
| capo | 좌 | 카포 | `CapoPanel` 1145 | `files[0]` | 함 | 없음 | 없음 |
| range | 좌 | 음역대 조정 | `RangePanel` 704 | 전체 일괄 | 해당 없음 | 없음 | 없음 |
| instrument | 좌 | 이조 악기 | `InstrumentPanel` 770 | 전체 일괄 | 미확인 | 없음 | 없음 |
| tempo | 좌 | 템포 조절 | `TempoPanel` 868 | `files[0]` | 해당 없음 | 없음 | 없음 |
| tempochange | 좌 | 마디별 템포 | `TempoChangePanel` 1385 | `files[0]` | 해당 없음 | 없음 | 없음 |
| ossia | 좌 | Ossia 마디 | `OssiaPanel` 1578 | `files[0]` (마디 수) | 제거함 | 없음 | 있음 |
| clef | 좌 | 음자리표 변환 | `ClefPanel` 3118 | `files[0]` | 해당 없음 | 없음 | 없음 |
| parts | 우 | 파트 추출 | `PartsPanel` 1798 | `files[0]` | 해당 없음 | 없음 | 없음 |
| notation | 우 | 악보 표기 변환 | `NotationPanel` 1856 | `files[0]` | 옵션 | 없음 | 없음 |
| export | 우 | 이미지/PDF | `ExportPanel` 1973 | 자체 selIdx | 해당 없음 | 없음 | 없음 |
| color | 우 | 색깔 악보 | `ColorPanel` 2225 | 전체 일괄 | 해당 없음 | 없음 | 없음 |
| harmony | 우 | 화성 쌓기 | `HarmonyPanel` 2275 | 전체 일괄 | 해당 없음 | 없음 | 없음 |
| chordtools | 우 | 코드 도구 | `ChordToolsPanel` 2381 | 전체 일괄 | 함 | 일부 (N.C.) | 없음 |
| numbering | 우 | 숫자 악보 | `NumberingPanel` 2551 | 전체 일괄 | 해당 없음 | 없음 | 없음 |
| lyricstyle | 우 | 가사 스타일 | `LyricStylePanel` 2668 | 전체 일괄 | 해당 없음 | 없음 | 없음 |
| chords | 우 | 코드 분석 | `ChordsPanel` 2817 | 전체 일괄 | 읽기 | 없음 | 없음 |
| roman | 우 | 로마 숫자 분석 | `RomanAnalysisPanel` 2885 | **존중함** (유일) | 해당 없음 | 있음 | 없음 |
| stats | 우 | 통계 분석 | `StatsPanel` 2994 | 전체 일괄 | 해당 없음 | 없음 | 없음 |

패널 외 시스템 기능은 다음과 같습니다.

- 히스토리 undo/redo 50개, `xmlDoc.cloneNode(true)` 딥클론 스냅샷, Ctrl+Z / Ctrl+Y (`mxl-studio.html:4196`)
- 자동저장·복원 배너, 세션 슬롯 저장 (저장만 가능, 목록·불러오기·삭제 UI 없음)
- 공유 모달 (URL·용량·경고). QR 코드는 이 스냅샷에 없음 (업데이트 문서는 있다고 설명)
- 헤더 내보내기 4종 (공유·세션·MXL·PNG·PDF)
- 하단 MIDI 플레이어 (재생·일시정지·정지·탐색·템포·악기·볼륨·A-B 루프·파트 선택)
- 마디 번호 오버레이 (OSMD 커서 동기화는 없음)

### 1.3 데이터 흐름

```
업로드(addFiles)
  └─ {name, xmlDoc, xmlString}  ← xmlString은 이때 한 번만 채워짐
        │
        ▼
패널 run() ──▶ cloneDoc(xmlDoc) 수정 ──▶ onFilesUpdate(updatedFiles, '라벨')
        │            ({...file, xmlDoc:doc}  ← xmlString 갱신 안 함, roman 패널만 예외)
        ▼
App.updateFiles ──▶ setFiles + pushHistory(HistoryCore.pushHistoryEntry: 전체 파일 딥클론)
        │
        ├─▶ 5초 뒤 autosave: serializeSessionFiles → xmlDoc 직렬화 (정확)
        ├─▶ ScoreView useEffect: OSMD 전체 재로드·재렌더 (디바운스 없음)
        └─▶ 공유 버튼: ShareSessionCore.getFileXml → file.xml || file.xmlString || serialize(xmlDoc)
                                                          └── 여기서 편집 전 원본이 선택됨 (BUG-01)
```

### 1.4 테스트·CI 현황

| 영역 | 있음 | 없음 |
|---|---|---|
| 유닛 | HistoryCore, ChordToolsCore, RomanAnalysis, SessionStoreCore, ShareSessionCore | 조옮김·재생·표기변환·숫자악보 등 HTML 안에 박힌 순수 로직 전부 |
| E2E | 빈 앱 로드, 업로드, Ossia, 반음 조옮김, 자동저장 복원, 공유 링크 | 나머지 패널 18개, 히스토리 undo/redo, 세션 슬롯, 재생, 내보내기 |
| 픽스처 | 단일 파트 4마디 C장조 | 다중 파트, 못갖춘마디, 단조, 이조악기, 코드심볼, 한글 가사, 붙임줄, 잇단음표, 반복, `.mxl` 압축 |
| 시각 회귀 | 없음 | OSMD 렌더 결과 스냅샷 |
| 접근성 자동 검사 | 없음 | axe 기반 검사 |
| CI | 워크플로 파일 3개 | git 저장소 자체가 없어 전부 미동작 |

### 1.5 발견된 결함·갭 목록

심각도는 상(데이터 손상 또는 기능 오동작이 조용히 발생) / 중(사용자가 알아차리지만 우회 가능) / 하(품질·유지보수)입니다.

**BUG. 정확성 결함**

| ID | 내용 | 근거 | 심각도 | Phase |
|---|---|---|---|---|
| BUG-01 | 공유 링크가 편집 전 원본을 내보냄. `getFileXml`이 `xmlString`을 우선하는데 패널들이 `xmlString`을 갱신하지 않음 | `share-session-core.js:80-87`, `mxl-studio.html:2929`(roman만 갱신), `4235`(업로드 시 설정) | 상 | 1 |
| BUG-02 | 조옮김·마디별 조바꿈이 `<harmony>` 코드 심볼을 옮기지 않아 음표와 코드가 불일치 | `TransposePanel.transposeDoc` `mxl-studio.html:636-651`(root-step 참조 0회), `KeyChangePanel` 976-1142(0회). 카포만 처리 | 상 | 1 |
| BUG-03 | 조옮김이 MIDI 번호 경유로 철자를 결정해 이명동음이 뭉개짐. 조표 `<mode>`(단조) 무시, `<transpose>`(이조악기) 무시, 겹올림·겹내림 소실 | `midiToNote` `mxl-studio.html:162`, `SEMI_TO_STEP` 42, `transposeDoc` 636 | 중 | 5 |
| BUG-04 | 여러 파일 업로드 시 활성 파일을 바꿀 UI가 없음. 악보 뷰는 항상 `files[0]` | `setActiveFile` 호출처 5곳 모두 내부 로직 (`mxl-studio.html:3993,4042,4129,4250,4254`) | 상 | 3 |
| BUG-05 | 패널 대부분이 `files[0]`으로 마디 수·조성·템포를 계산. 활성 파일과 불일치 | `files[0]` 참조 23곳. 예 `mxl-studio.html:879,982,1151,1391,1588,1804,3125,4097` | 중 | 1 |
| BUG-06 | 파일 제거 시 `activeFile` 보정이 틀림. 앞쪽 파일을 지우면 활성 파일이 조용히 다음 파일로 바뀜 | `removeFile` `mxl-studio.html:4246-4251` | 중 | 1 |
| BUG-07 | Ossia 결과(`ossiaMxml`, `ossiaMeta`)가 자동저장·세션·공유에서 누락됨. 복원하면 Ossia가 사라짐 | `serializeSessionFiles` `mxl-studio.html:166-172`, `hydrateSessionFiles` 173-184 | 중 | 1 |
| BUG-08 | "MXL 내보내기" 버튼이 비압축 `.xml`을 저장. 파일명은 `.xml`이지만 라벨은 MXL | `exportMXL` `mxl-studio.html:4280-4286` | 중 | 1 |
| BUG-09 | 재생 데이터가 붙임줄(tie)을 무시해 같은 음이 재타건되고, 셈여림은 velocity 80 고정, 반복·도돌이 무시, 마디별 템포(`<sound tempo>` 중간 변경) 무시 | `extractMidiPlaybackData` `mxl-studio.html:254-326` | 중 | 5 |
| BUG-10 | 현재 마디 표시가 `measureTimeline` 대신 평균 마디 길이로 계산되어 박자 변경 곡에서 어긋남 | `MidiPlayer` `mxl-studio.html:3641-3645` | 하 | 5 |
| BUG-11 | 로마 숫자 분석이 장조만 가정. `<mode>minor` 무시, 전위·부속화음 없음, "V가 나오면 반종지" 식의 단순 판정 | `roman-analysis-core.js:50-60` `getKeyInfo`, `detectCadence` 169-175 | 하 | 5 |
| BUG-12 | Ossia 마디 범위가 `number` 속성이 아닌 인덱스 기준. 못갖춘마디(number="0")가 있으면 한 마디씩 밀림 | `OssiaPanel` `mxl-studio.html:1642-1648` | 하 | 5 |
| BUG-13 | 히스토리 메타를 localStorage에 쓰기만 하고 읽는 곳이 없음 (write-only) | `mxl-studio.html:4106-4111`, `clearHistory` 4015 | 하 | 1 |

**ROB. 견고성 결함**

| ID | 내용 | 근거 | 심각도 | Phase |
|---|---|---|---|---|
| ROB-01 | Error Boundary가 없음. 어떤 패널이든 렌더 중 throw 하면 앱 전체가 빈 화면이 됨 | `App` 전체, `ReactDOM.render` `mxl-studio.html:4519` | 상 | 2 |
| ROB-02 | CDN 6개 중 하나라도 실패하면 빈 검은 화면. 로딩 스플래시도 폴백 안내도 없음. SRI 없음 | `mxl-studio.html:12-17` | 상 | 2 |
| ROB-03 | OSMD 렌더 실패 시 React가 관리하는 노드에 `innerHTML`을 직접 씀. 다음 렌더에서 충돌 가능 | `ScoreView` `mxl-studio.html:3415`, `3408` | 중 | 2 |
| ROB-04 | 업로드 크기 제한·중복 이름 처리·개수 제한 없음. 대용량 파일이 메인 스레드를 멈춤 | `addFiles` `mxl-studio.html:4207-4243` | 중 | 2 |
| ROB-05 | 59개 `alert()`가 흐름을 막고 E2E에서 dialog 핸들러를 요구함. `window.prompt` 1개 | `grep -c "alert("` 59, `mxl-studio.html:4051` | 중 | 3 |
| ROB-06 | PDF가 팝업 + `document.write` + `window.print()`. 팝업 차단 시 실패. 파일명이 이스케이프 없이 `<title>`에 삽입 | `exportPDF` `mxl-studio.html:4322-4337`, `ExportPanel` 2061-2090 | 중 | 3 |
| ROB-07 | 죽은 코드. `CursorTransportBar` 140줄이 사용되지 않음. `osmdRef`·`onOsmdReady` 배관이 write-only | `mxl-studio.html:3450-3590`, `3970-3971` | 하 | 2 |
| ROB-08 | 프로덕션에 `console.log` 잔존 | `mxl-studio.html:1711` | 하 | 2 |
| ROB-09 | `ReactDOM.render`는 React 18에서 deprecated. 자동 배칭 미적용 | `mxl-studio.html:4519` | 하 | 2 |

**UX. 사용성 갭**

| ID | 내용 | 근거 | Phase |
|---|---|---|---|
| UX-01 | 오른쪽 패널을 닫을 수 없음. `setShowRight(false)` 호출처 없음. `.app-root--right-closed` CSS가 죽어 있음 | `mxl-studio.html:3959,4339,4450`, `styles.css:93` | 3 |
| UX-02 | 세션 슬롯 목록·불러오기·삭제·이름 변경 UI 없음. 코어의 `listSessions`/`deleteSession`이 호출되지 않음 | `session-store-core.js:212,218`, HTML에 참조 0회 | 3 |
| UX-03 | 세션 JSON 내보내기·가져오기 없음 (매뉴얼은 있다고 설명) | `manual/MXL-Studio-User-Manual-ko.html` "JSON 내보내기/가져오기" | 3 |
| UX-04 | 악보 줌·페이지 맞춤 컨트롤 없음 | `zoom` 참조는 Ossia 1곳뿐 (`mxl-studio.html:3405`) | 3 |
| UX-05 | 재생 중 악보 위에 커서가 없음. 마디 번호 오버레이만 있음 | `ScoreView` 3436-3439 | 5 |
| UX-06 | 700px 이하에서 패널·액티비티 바가 전부 숨겨져 모바일에서는 악보 보기와 재생만 가능 | `styles.css:2265-2273` | 4 |
| UX-07 | 첫 로드 시 Babel 컴파일 동안 검은 빈 화면. 진행 표시 없음 | `body{background:var(--bg-dark)}` `styles.css:65`, `#root` 비어 있음 | 2 |
| UX-08 | 헤더 토글은 왼쪽만. 패널 폭 조절 불가 | `mxl-studio.html:4385-4386` | 3 |

**A11Y. 접근성 결함**

| ID | 내용 | 근거 | Phase |
|---|---|---|---|
| A11Y-01 | `Chip`·`Toggle`이 `<div onClick>`. 키보드 접근 불가, role·aria-pressed 없음. 조성 그리드도 div | `mxl-studio.html:479-485`, `key-grid__btn` 668 | 4 |
| A11Y-02 | `aria-*` 속성 전체 2개, `role` 2개 (공유 모달만) | `grep -c "aria-"` 2 | 4 |
| A11Y-03 | `:focus-visible` 스타일 0개 | `styles.css` | 4 |
| A11Y-04 | 공유 모달에 포커스 트랩·Esc 닫기 없음. 메뉴바 드롭다운 키보드 탐색 없음 | `MenuBar` `mxl-studio.html:3266-3364`, 모달 4411 | 4 |
| A11Y-05 | `prefers-reduced-motion` 미대응. 패널 진입 애니메이션 강제 | `styles.css:1184-1195` | 4 |
| A11Y-06 | 이모지 아이콘 버튼에 `title`만 있고 접근 가능한 이름은 이모지 자체 | 액티비티 바 4430-4462 | 4 |

**PERF. 성능 부담**

| ID | 내용 | 근거 | Phase |
|---|---|---|---|
| PERF-01 | 히스토리 50개 × 전체 파일 `cloneNode(true)`. 대형 다중 파일에서 메모리 급증 | `history-core.js:6-16` | 6 |
| PERF-02 | 패널 21개가 항상 마운트됨 (`display:none`). 각 패널의 `useMemo`/`useEffect`가 files 변경마다 실행 | `styles.css:1183-1190`, `mxl-studio.html:4463-4497` | 6 |
| PERF-03 | Notation·Numbering 패널이 files 변경마다 **모든 파일을 통째로 복제**해 baseline 보관 | `mxl-studio.html:1870-1873`, `2559-2562` | 6 |
| PERF-04 | files 참조가 바뀔 때마다 5초 뒤 전체 직렬화·저장. 내용이 같아도 저장 | `mxl-studio.html:4176-4193` | 6 |
| PERF-05 | OSMD 전체 재로드가 files 변경마다 즉시 실행. 연속 조작 시 렌더 중첩 (cancelled 플래그로 결과만 버림) | `ScoreView` 3374-3423 | 6 |
| PERF-06 | Tone.js(약 400KB)가 첫 로드에 동기 로드됨. 재생 전까지 불필요 | `mxl-studio.html:16` | 6 |

**TEST / OPS / DOC**

| ID | 내용 | 근거 | Phase |
|---|---|---|---|
| TEST-01 | `npm test`가 Windows 한글 경로에서 forks 풀 타임아웃. `--pool=threads`로 통과 | 실측 (0.3절) | 0 |
| TEST-02 | 픽스처 1개뿐. 조옮김·재생·표기 변환 로직이 HTML에 박혀 유닛 테스트 불가 | `tests/fixtures/`, 패널 내부 함수 | 0, 5, 7 |
| TEST-03 | E2E가 21패널 중 3개만 커버. undo/redo·세션·재생·내보내기 미검증 | `tests/e2e/00-smoke.spec.js` | 7 |
| TEST-04 | `e2e:smoke`와 `e2e:prod` 스크립트가 동일 명령. lint·format 스크립트 없음 | `package.json:8-12` | 0 |
| OPS-01 | git 저장소가 아님. CI 3종 미동작 | 실측 | 0 |
| OPS-02 | `post-deploy.yml`이 존재하지 않는 배포 워크플로를 참조. nightly prod URL이 다른 저장소 | `.github/workflows/post-deploy.yml:5`, `nightly.yml:54` | 7 |
| OPS-03 | 루트에 임시 산출물·다른 프로젝트 사본·중첩 git이 섞여 있음 | 1.1 표 마지막 행 | 0 |
| OPS-04 | CDN 스크립트에 SRI(integrity) 없음 | `mxl-studio.html:12-17` | 2 |
| DOC-01 | 매뉴얼·퀵스타트가 없는 기능을 설명함. "주석 메모 패널", "청음 훈련", "난이도", "운지", "JSON 가져오기", "QR 코드" | `manual/*.html` grep 결과, `MXL-Studio-업데이트-문서/*.md` 7절 | 8 |
| DOC-02 | 두 번째 프롬프트 문서가 다른 스냅샷 기준이라 후속 세션이 없는 파일을 참조할 위험 | 0.1절 | 8 |
| DOC-03 | `README-TESTING.md`의 실행 안내가 Windows 실패를 반영하지 않음 | 실측 | 0 |

### 1.6 우선순위 매트릭스

```
영향 큼 ─────────────────────────────────────────────────────▶
│  [즉시]                           [계획]
│  BUG-01 공유 원본 유출              BUG-03 이명동음 철자
│  BUG-02 코드심볼 미이조             BUG-09 재생 tie/velocity
│  BUG-04 활성 파일 전환 없음         UX-05 재생 커서
│  ROB-01 ErrorBoundary              PERF-01 히스토리 메모리
│  ROB-02 CDN 폴백/스플래시           UX-06 모바일 패널
│  TEST-01 npm test 실패             A11Y-01~06
│  OPS-01 git 없음
│
│  [빠른 승리]                        [나중]
│  BUG-05~08, BUG-13                 BUG-10~12
│  ROB-07~09                         PERF-05~06
│  UX-01 우측 토글                   OPS-04 SRI
│  UX-02 세션 목록
▼ 난이도 큼
```

---

## 2. 공통 계약 프롬프트

### 2.1 세션 시작 시 붙여넣기

````text
[MXL Studio09 작업 계약 — 이 세션 전체에 적용]

너는 "악보 디자이너(MXL Studio)" 폴더 mxl-studio09에서 작업한다. 이 폴더의 CLAUDE.md를 먼저 읽고, 아래 규칙을 추가로 지킨다.

A. 아키텍처 보존
  1. React 18 UMD + Babel Standalone 단일 HTML 구조를 유지한다. Vite/Webpack/TypeScript 마이그레이션을 제안하거나 수행하지 않는다.
  2. 순수 로직은 `*-core.js`로 분리하고 `(function(global){ ... global.XxxCore = {...}; })(window);` 패턴을 따른다. 코어 안에서 React·DOM 이벤트·window.alert를 참조하지 않는다. XML DOM(Document, Element)은 인자로 받아 다룰 수 있다.
  3. 화면 로직은 mxl-studio.html의 기존 패널 패턴 `function XxxPanel({files, activeFile, showProgress, hideProgress, onFilesUpdate})`을 따른다.
  4. 스타일은 styles.css에만 추가한다. 인라인 style은 CSS Custom Property 전달 목적으로만 허용한다.
  5. 새 `<script src>`는 cdnjs 또는 jsdelivr 버전 고정 URL로만 추가하고, 로드 실패 시 폴백(기능 비활성 + 한국어 안내)을 반드시 둔다.

B. 데이터 규칙
  1. 파일 객체는 `{name, xmlDoc, xmlString, sourceName, ossiaMxml?, ossiaMeta?}` 형태다.
  2. xmlDoc을 바꾸는 모든 코드는 반드시 `cloneDoc(xmlDoc)` 후 수정하고, 커밋 시 `xmlString`도 함께 갱신한다. Phase 1에서 도입하는 `commitFile(file, doc)` 헬퍼를 사용하며 `{...file, xmlDoc:doc}` 직접 작성을 금지한다.
  3. 커밋은 `onFilesUpdate(newFiles, '한글 작업 라벨')`로만 한다.
  4. 마디 수·조성·템포 등 "현재 악보" 정보는 `files[0]`이 아니라 `files[activeFile]`에서 읽는다. 전체 파일 일괄 처리는 허용하되 화면 표시 정보는 활성 파일 기준이다.
  5. 마디를 찾을 때는 인덱스가 아니라 `measure[number]` 속성을 우선하고, 못갖춘마디(number="0")를 고려한다.

C. UX·접근성 기본값
  1. `alert()`, `window.prompt()`, `window.confirm()`을 새로 추가하지 않는다. Phase 3에서 도입하는 `notify()`와 모달 컴포넌트를 사용한다. 기존 alert를 만나면 같은 세션 범위 안에서만 교체한다.
  2. 클릭 가능한 요소는 `<button type="button">`으로 만든다. 상태가 있는 토글은 `aria-pressed`, 스위치는 `role="switch" aria-checked`를 붙인다.
  3. 사용자 노출 문구는 한국어로 쓰고, 문장은 마침표로 끝낸다.

D. 진행 방식
  1. 한 세션에 프롬프트 하나만 수행한다. 코드를 쓰기 전에 (a) 수정·생성할 파일 목록 (b) 새 함수 시그니처 (c) 추가할 테스트 이름을 먼저 보여 주고 승인받는다. 단, 사용자가 "묻지 말고 진행"을 명시했다면 (a)(b)(c)를 보고만 하고 계속한다.
  2. 줄 번호는 참고용이다. 반드시 함수명·문자열로 grep 해서 현재 위치를 다시 확인한 뒤 편집한다.
  3. 기존 함수 시그니처를 바꾸지 않는다. 필요하면 새 함수를 추가하고 기존 함수는 위임한다.
  4. 요청 범위 밖의 코드를 "개선"하지 않는다. 눈에 띈 문제는 context-notes.md에 적는다.
  5. 파일·폴더 삭제, git history 조작, 외부 서비스 호출은 실행 전에 사용자에게 확인한다.

E. 검증
  1. 코드를 건드렸다면 종료 전에 `npm test`와 `npm run e2e:smoke`를 실행하고 결과를 그대로 보고한다. 실패하면 고친 뒤 재실행한다.
  2. 새 코어 파일에는 같은 세션에 `tests/unit/<이름>.test.js`를 추가한다.
  3. 새 사용자 흐름에는 같은 세션에 Playwright 케이스를 `tests/e2e/`에 추가한다.
  4. 종료 보고는 아래 양식을 따른다.

[종료 보고 양식]
- 변경 파일: (경로 목록)
- 새 함수/컴포넌트: (시그니처)
- 테스트: npm test (N passed / M failed), e2e:smoke (N passed / M failed)
- 완료 기준 체크: (프롬프트의 체크박스를 복사해 표시)
- 남은 문제·다음 세션 메모: (context-notes.md에도 기록)
````

### 2.2 `CLAUDE.md`에 병합할 추가 규칙 (선택)

기존 `CLAUDE.md` 2번 "데이터 규칙" 아래에 다음 세 줄을 추가하면 2.1의 B-2, B-4, C-1이 영구 적용됩니다.

```markdown
   - xmlDoc을 바꾸면 xmlString도 함께 갱신합니다. `commitFile(file, doc)` 헬퍼를 사용하고 `{...file, xmlDoc:doc}` 직접 작성은 금지합니다.
   - 화면에 표시하는 악보 정보(마디 수·조성·템포)는 `files[activeFile]` 기준으로 읽습니다.
   - `alert()`·`prompt()`·`confirm()`을 새로 추가하지 않고 `notify()`와 모달 컴포넌트를 사용합니다.
```

---

## 3. 단계별 프롬프트

각 프롬프트의 예상 세션 수는 Claude Code 기준 1세션 = 집중 작업 약 1~2시간입니다.

---

## Phase 0. 작업 환경 정비 (3세션)

### P0-1 · git 초기화와 저장소 위생

**근거** OPS-01, OPS-03. 이 폴더는 git 저장소가 아니고, 루트에 `tmp/`, `tmp-ossia-box.png`, `tmp-score-designer-original/`, `.codex-push/`(내부에 `.git` 있음)가 섞여 있습니다.

**목표** 되돌릴 수 있는 작업 기반을 만들고, 이후 모든 세션이 시맨틱 커밋을 남기게 합니다.

````text
[P0-1] git 초기화와 저장소 위생

1. 먼저 다음을 조사하고 결과를 표로 보고하라. 아직 아무것도 지우지 마라.
   - 루트의 `tmp/`, `tmp-ossia-box.png`, `tmp-score-designer-original/`, `.codex-push/` 각각의 크기, 파일 수, 마지막 수정일.
   - `tmp-score-designer-original/mxl-studio.html`과 현재 `mxl-studio.html`의 차이 요약 (diff 통계만).
   - `.codex-push/ScoreDesigner-clean/.git`이 가리키는 원격 주소 (`config` 파일).
2. 보고 후 사용자에게 다음을 물어라. "이 4개 항목을 (a) 삭제 (b) `_archive/`로 이동 (c) `.gitignore`로만 제외 중 어떻게 할까요?" 답을 받기 전에는 진행하지 마라.
3. 답에 따라 처리한 뒤 `.gitignore`에 다음을 추가하라.
   ```
   _archive/
   tmp/
   tmp-*
   *.log
   .codex-push/
   ```
4. `git init` 후 첫 커밋을 만들어라. 커밋 메시지는 "초기 커밋: mxl-studio09 스냅샷 (2026-09-03)". `Aoi_Sangosho(푸른 산호조).mxl`은 P0-4에서 픽스처로 옮길 예정이므로 이번 커밋에 포함하되 위치는 그대로 둔다.
5. `README.md`가 없으므로 아래 내용만 담은 짧은 README를 만들어라 (한국어, 10줄 이내).
   - 앱 실행 방법 (`npx http-server . -p 8080` 후 `mxl-studio.html` 열기)
   - 테스트 명령 (`npm test`, `npm run e2e:smoke`)
   - 프롬프트 문서 3개의 이름과 "이 폴더에는 `MXL-Studio09-개선보완-바이브코딩-프롬프트.md`가 기준"이라는 한 줄
6. 두 번째 커밋 "README 추가"로 마무리하라.
````

**완료 기준**
- [ ] `git log --oneline`에 커밋 2개 이상
- [ ] `git status`가 clean
- [ ] 임시 산출물 처리 방식을 사용자가 결정했고 그 결정이 `context-notes.md`(P0-3에서 생성. 이 세션에서는 커밋 메시지 본문)에 기록됨

**검증** `git status`, `git log --oneline`

---

### P0-2 · 테스트 러너 수정과 npm 스크립트 정리

**근거** TEST-01, TEST-04, DOC-03. `npm test`가 Windows 한글·공백 경로에서 forks 워커 타임아웃으로 실패하고, `--pool=threads`로는 통과합니다. `e2e:smoke`와 `e2e:prod`가 같은 명령입니다.

````text
[P0-2] 테스트 러너 수정과 npm 스크립트 정리

1. `vitest.config.js`를 다음처럼 바꿔라.
   - `test.pool: 'threads'` 추가.
   - `test.testTimeout: 20000`, `test.hookTimeout: 20000` 추가 (jsdom 환경 초기화가 느린 것을 실측했다).
   - `test.environment`는 'jsdom' 유지.
2. `npm test`를 실행해 5파일 14테스트가 통과하는지 확인하라. 여전히 워커 오류가 나면 `pool: 'vmThreads'`를 시도하고, 그래도 실패하면 오류 전문을 보고하고 멈춰라.
3. `package.json` scripts를 다음으로 정리하라. 기존 키는 유지하고 값만 고친다.
   ```json
   "test": "vitest run",
   "test:watch": "vitest",
   "e2e": "playwright test",
   "e2e:smoke": "playwright test --grep @smoke",
   "e2e:prod": "playwright test --grep @smoke --project=chromium",
   "e2e:report": "playwright show-report",
   "serve": "http-server . -p 8080 -c-1",
   "check": "npm test && npm run e2e:smoke"
   ```
   `e2e:prod`는 `PROD_BASE_URL` 환경변수와 함께 쓰는 것이 전제이므로 README-TESTING.md의 설명을 유지하라.
4. `README-TESTING.md`의 "로컬 실행" 절에 다음을 추가하라.
   - "Windows 한글·공백 경로에서 forks 풀이 타임아웃되므로 `vitest.config.js`에서 threads 풀을 사용한다."
   - 실측 소요 시간 (유닛 약 45초, 스모크 약 2.5분).
5. 커밋 "테스트 러너 threads 풀로 전환 및 npm 스크립트 정리".
````

**완료 기준**
- [ ] `npm test` 통과 (14 passed)
- [ ] `npm run e2e:smoke` 통과 (6 passed)
- [ ] `npm run check` 한 번에 둘 다 실행됨

**검증** `npm run check`

---

### P0-3 · 체크리스트·컨텍스트 노트 생성

**근거** 상위 `CLAUDE.md` 7번 규칙 (Plan + checklist.md + context-notes.md). 현재 이 폴더에는 둘 다 없습니다.

````text
[P0-3] 체크리스트와 컨텍스트 노트 생성

1. 루트에 `checklist.md`를 만들어라. 내용은 `MXL-Studio09-개선보완-바이브코딩-프롬프트.md` 3장의 프롬프트 ID(P0-1 … P9-3)를 Phase별 체크박스로 나열한 것이다. 각 항목 옆에 그 프롬프트의 "완료 기준" 개수를 괄호로 적어라. 이미 끝난 P0-1, P0-2는 체크하라.
2. 루트에 `context-notes.md`를 만들어라. 첫 항목으로 다음을 기록하라.
   - 2026-09-03 분석 요약 (1.5절의 ID 목록만 한 줄씩).
   - P0-1에서 사용자가 내린 임시 산출물 처리 결정.
   - P0-2에서 threads 풀로 바꾼 이유.
   - "줄 번호는 2026-09-03 스냅샷 기준이며 grep으로 재확인할 것"이라는 경고.
3. 두 파일 첫 줄에 한국어 한 줄 주석(마크다운이므로 `<!-- 역할 -->`)을 넣어라.
4. 커밋 "checklist·context-notes 추가".
````

**완료 기준**
- [ ] `checklist.md`에 프롬프트 ID 전부 나열
- [ ] `context-notes.md`에 날짜 있는 항목 4개 이상

---

### P0-4 · 픽스처 세트 구축

**근거** TEST-02. 픽스처가 `f01-basic.musicxml` 하나뿐이라 조옮김 철자, 다중 파트, 못갖춘마디, 코드 심볼, 가사, 붙임줄, `.mxl` 압축 경로를 검증할 수 없습니다. 루트의 `Aoi_Sangosho(푸른 산호조).mxl`은 실제 악보라 좋은 회귀 자료입니다.

````text
[P0-4] 픽스처 세트 구축

`tests/fixtures/`에 다음 MusicXML 3.1 파일을 만들어라. 각 파일은 손으로 읽을 수 있을 만큼 작게(8마디 이내) 유지하고, 파일 첫 줄 뒤 XML 주석으로 "무엇을 검증하는 픽스처인지" 한국어로 적어라.

| 파일 | 내용 | 검증 대상 |
|---|---|---|
| f02-two-parts.musicxml | 2파트(Piano, Violin), 4마디, 두 파트 divisions가 다름(4와 2) | 파트 추출, 재생 파트 선택, 다중 파트 분석 |
| f03-pickup.musicxml | 못갖춘마디 `number="0"` 1박 + 4마디, `implicit="yes"` | 마디 번호 vs 인덱스 (BUG-12), 마디별 조바꿈 범위 |
| f04-minor-harmony.musicxml | A단조 (`fifths=0`, `mode=minor`), 마디마다 `<harmony>` 코드 심볼 (Am, Dm, E7, Am), 4마디 | 조옮김 코드심볼 (BUG-02), 단조 (BUG-03), 로마숫자 단조 (BUG-11) |
| f05-transposing.musicxml | B♭ 클라리넷 파트 `<transpose><diatonic>-1</diatonic><chromatic>-2</chromatic></transpose>`, D장조 2마디 | 이조악기 조옮김 (BUG-03), 재생 실음 |
| f06-lyrics-ties.musicxml | 한글 가사 3음절(`syllabic` begin/middle/end), 붙임줄 `<tie>`+`<tied>` 1쌍, 잇단음표 1개, 셈여림 `<dynamics><p/>` `<f/>` | 가사 스타일, 숫자 악보, 재생 tie/velocity (BUG-09) |
| f07-enharmonic.musicxml | F♯장조(`fifths=6`) 음계 8음, E♯·B♯ 포함 | 이명동음 철자 (BUG-03) |
| f08-repeats-tempo.musicxml | 도돌이표 `<repeat direction="forward/backward">`, 2번째 마디에 `<sound tempo="60">` 변경, 4마디 | 재생 반복·마디 템포 (BUG-09), 마디별 템포 패널 |
| f09-real.mxl | 루트의 `Aoi_Sangosho(푸른 산호조).mxl`을 `git mv`로 이동해 이름 변경 | `.mxl` 해제 경로, 실제 악보 회귀, 시각 회귀 기준 |

작성 후 다음을 하라.
1. 각 픽스처가 OSMD에서 렌더되는지 Playwright로 확인하는 테스트 `tests/e2e/01-fixtures.spec.js`를 추가하라. 픽스처마다 업로드 → `.score-main-render svg` 존재 → 콘솔 에러 0 을 확인하는 케이스 하나씩, 태그는 `@fixtures`.
2. `tests/e2e/helpers.js`에 `uploadFixture(page, name)`이 `.mxl`도 처리하는지 확인하고, 필요하면 `setInputFiles`가 바이너리를 그대로 올리도록 유지하라 (별도 변경 없이 동작해야 정상이다).
3. `README-TESTING.md`에 픽스처 표를 옮겨 적어라.
4. 커밋 "테스트 픽스처 8종 추가".
````

**완료 기준**
- [ ] `tests/fixtures/` 파일 9개
- [ ] `npx playwright test --grep @fixtures` 통과
- [ ] 루트에 `.mxl` 샘플이 남아 있지 않음

---

## Phase 1. 치명 버그 수정 (4세션)

### P1-1 · xmlString 동기화와 공유 링크 원본 유출 수정

**근거** BUG-01. `share-session-core.js:80-87`의 `getFileXml`이 `file.xml → file.xmlString → serialize(xmlDoc)` 순으로 고르는데, 패널들은 `{...file, xmlDoc:doc}`만 커밋해 `xmlString`이 업로드 시점 원본으로 남습니다. 조옮김 후 공유하면 받는 사람은 원본을 봅니다. `RomanAnalysisPanel`(`mxl-studio.html:2928-2929`)만 갱신합니다.

**목표** 근본 원인(두 필드의 불일치)을 없애고, 회귀 테스트로 고정합니다.

````text
[P1-1] xmlString 동기화와 공유 링크 원본 유출 수정

먼저 재현 테스트를 작성하라.
1. `tests/e2e/02-share-after-edit.spec.js`에 `@smoke` 태그로 케이스 하나를 추가하라.
   - f01-basic 업로드 → 조옮김 패널에서 반음 +2 실행 → 헤더 "공유" 클릭 → URL 획득 → 새 페이지에서 열기 → 첫 음이 D4 인지 확인 (현재는 C4가 나와 실패해야 한다).
   - 실행해 실패를 확인하고, 실패 로그를 보고하라.

그다음 수정하라.
2. `mxl-studio.html` UTILITY 영역(`function cloneDoc` 근처)에 헬퍼를 추가하라.
   ```js
   function commitFile(file, doc, extra){
     const xmlString = new XMLSerializer().serializeToString(doc);
     return {...file, ...(extra||{}), xmlDoc:doc, xmlString};
   }
   ```
3. `grep -n "xmlDoc:doc" mxl-studio.html`과 `grep -n "xmlDoc:previewDoc\|xmlDoc:newDoc\|xmlDoc:d}" mxl-studio.html`로 패널의 커밋 지점을 전부 찾고, 모두 `commitFile(file, doc)`으로 바꿔라. Ossia처럼 `ossiaMxml` 같은 추가 필드가 있으면 세 번째 인자로 넘겨라. 예상 지점은 Transpose, Range, Instrument, Tempo, KeyChange, Capo, TempoChange, Ossia, Parts, Notation, Color, Harmony, ChordTools, Numbering, LyricStyle, Clef, Roman 이다. 바꾼 지점 수를 보고하라.
4. `share-session-core.js`의 `getFileXml`을 방어적으로 바꿔라. `xmlDoc`이 있으면 항상 `xmlDoc`을 직렬화하고, `xmlDoc`이 없을 때만 `xml`/`xmlString`을 쓴다. 기존 유닛 테스트(`share-session-core.test.js`)는 `xmlDoc` 없는 객체를 넘기므로 그대로 통과해야 한다.
5. `tests/unit/share-session-core.test.js`에 케이스를 추가하라. "xmlDoc과 오래된 xmlString이 함께 있으면 xmlDoc을 우선한다."
6. 1의 E2E를 다시 실행해 통과를 확인하라.
7. `npm run check` 실행 후 커밋 "공유 링크가 편집 전 원본을 내보내던 문제 수정 (commitFile 도입)".
````

**완료 기준**
- [ ] 재현 테스트가 수정 전 실패, 수정 후 통과
- [ ] `grep -c "xmlDoc:doc" mxl-studio.html` 결과 0
- [ ] 유닛 테스트 15개 이상 통과

---

### P1-2 · 조옮김·마디별 조바꿈에서 코드 심볼 함께 이조

**근거** BUG-02. `TransposePanel.transposeDoc`(`mxl-studio.html:636-651`)과 `KeyChangePanel`(976-1142)은 `<note>`만 옮깁니다. `CapoPanel`은 `root-step`을 처리하므로 참고 구현이 있습니다.

**목표** 코드 심볼 이조 로직을 코어로 분리하고 두 패널이 공유하게 합니다. 이 세션에서는 철자 개선(BUG-03)은 다루지 않고, 기존 `midiToNote` 철자 규칙을 그대로 쓰되 코드 루트도 같은 규칙으로 옮깁니다.

````text
[P1-2] 조옮김·마디별 조바꿈에서 코드 심볼 함께 이조

1. 새 파일 `transpose-core.js`를 만들어라. 첫 줄은 `// 음표·코드심볼·조표를 함께 옮기는 조옮김 순수 로직` 주석. UMD 패턴으로 `window.TransposeCore`를 노출하고 다음 함수를 둔다.
   - `transposeHarmony(harmonyEl, semitones)`: `root/root-step`, `root/root-alter`, `bass/bass-step`, `bass/bass-alter`를 semitones만큼 옮긴다. 철자는 mxl-studio.html의 `SEMI_TO_STEP`과 같은 표를 코어 안에 복사해 쓴다 (코어는 HTML 전역에 의존하면 안 된다). `root-alter`가 0이면 요소를 제거하고, 0이 아니면 없을 때 생성한다. `kind`는 건드리지 않는다.
   - `transposeMeasureHarmonies(measureEl, semitones)`: 마디 안 모든 `<harmony>`에 위를 적용하고 처리 수를 반환한다.
   - `transposeDocHarmonies(xmlDoc, semitones)`: 문서 전체.
   - `transposeMeasureRange(xmlDoc, fromNumber, toNumber, semitones, options)`: `measure[number]` 속성 기준 범위 안의 음표·코드심볼·(옵션) 조표를 옮긴다. 음표 이동은 콜백 `options.transposeNote(noteEl, semitones)`로 받아 HTML의 기존 `transposeNote/setNotePitch`를 주입할 수 있게 한다. 반환은 `{notes, harmonies, measures}` 카운트.
2. `tests/unit/transpose-core.test.js`를 작성하라. 최소 케이스는 다음이다.
   - Am → +2 → Bm (root-step B, alter 없음).
   - E7 → +1 → F7.
   - B♭ (root-alter -1) → +2 → C (root-alter 요소 제거됨).
   - bass가 있는 C/E → +2 → D/F♯.
   - `f04-minor-harmony.musicxml`을 문자열로 읽어 4마디 코드가 전부 옮겨지는지 (Node의 fs 사용. vitest 환경이 jsdom이므로 DOMParser 사용 가능).
   - `transposeMeasureRange`가 `number="0"` 못갖춘마디를 포함한 문서에서 number 기준으로 동작하는지 (f03 사용).
3. `mxl-studio.html` `<head>`에 `<script src="transpose-core.js?v=1"></script>`를 `history-core.js` 다음에 추가하라.
4. `TransposePanel.transposeDoc` 안에서 음표 처리 뒤에 `window.TransposeCore?.transposeDocHarmonies(doc, semitones)`를 호출하라. 코어가 없으면(로드 실패) 로그에 "코드 심볼은 옮기지 못했습니다." 경고를 남기고 계속 진행한다.
5. `KeyChangePanel`의 run에서 마디별 음표 이동 직후 같은 마디의 코드 심볼도 옮기도록 `transposeMeasureHarmonies`를 호출하라.
6. `InstrumentPanel`과 `RangePanel`도 `grep -n "transposeNote" mxl-studio.html`로 확인해서 음표를 옮기는 지점이 있으면 같은 처리를 추가하라. 있었는지 여부를 보고하라.
7. E2E `tests/e2e/03-transpose-harmony.spec.js`를 추가하라. f04 업로드 → 반음 +2 → `window.__mxlGetState().files[0].xmlDoc`에서 첫 harmony의 root-step이 B인지 확인. 태그 `@panels`.
8. `npm run check` 후 커밋 "조옮김·마디별 조바꿈에서 코드 심볼 함께 이조 (transpose-core 도입)".
````

**완료 기준**
- [ ] `transpose-core.js` + 유닛 테스트 6케이스 이상
- [ ] f04 업로드 후 조옮김 시 코드 심볼이 함께 이동 (E2E)
- [ ] 기존 `@smoke` 반음 조옮김 테스트 여전히 통과

---

### P1-3 · activeFile 일원화와 파일 제거 인덱스 수정

**근거** BUG-05, BUG-06, BUG-13. `files[0]` 참조 23곳. `removeFile`(`mxl-studio.html:4246-4251`)이 활성 파일 앞의 파일을 지울 때 인덱스를 보정하지 않습니다. 히스토리 메타 localStorage 쓰기는 읽는 곳이 없습니다.

**목표** 활성 파일 전환 UI(P3-2)를 만들기 전에, 모든 패널이 활성 파일을 기준으로 정보를 표시하도록 배관을 정리합니다.

````text
[P1-3] activeFile 일원화와 파일 제거 인덱스 수정

1. `mxl-studio.html`에서 `grep -n "files\[0\]" mxl-studio.html`로 23곳을 전부 나열하고, 각각을 다음 세 부류로 분류해 표로 보고하라.
   (a) 화면 표시 정보 (마디 수, 조성, 템포, 파트 목록, 음자리표) → `files[activeFile]`로 바꿀 것
   (b) 이미 `files[activeFile]||files[0]` 폴백 형태 → 그대로 둘 것
   (c) 전체 파일 일괄 처리 루프의 일부 → 그대로 둘 것
2. (a)로 분류한 지점을 모두 바꿔라. 패널이 `activeFile`을 props로 받지 않으면 `panelProps`에 이미 포함되어 있으므로 구조분해에 `activeFile=0`을 추가하라. 헬퍼를 하나 두어 반복을 줄여라.
   ```js
   function activeDoc(files, activeFile){ return (files[activeFile]||files[0])?.xmlDoc||null; }
   ```
3. App의 템포 감지 `useEffect`(`s=doc.querySelector('sound[tempo]')` 부근)가 `files[0]`을 읽는다. `files[activeFile]` 기준으로 바꾸고 의존성에 `activeFile`을 추가하라.
4. `removeFile`을 다음 규칙으로 고쳐라.
   - 지운 인덱스 i < activeFile 이면 activeFile - 1.
   - i === activeFile 이면 `Math.min(i, newLength-1)`.
   - i > activeFile 이면 그대로.
   - newLength가 0이면 0.
5. 히스토리 메타(`mxlStudioHistoryMeta`) 쓰기 `useEffect`와 `clearHistory` 안의 `localStorage.removeItem`을 제거하라. 읽는 코드가 없음을 grep으로 먼저 확인하고 보고하라.
6. `tests/e2e/04-active-file.spec.js`를 추가하라 (`@panels`).
   - f01, f02 순서로 업로드 → `__mxlGetState().activeFile`이 0 → 첫 파일 제거 → activeFile이 0이고 `files[0].name`이 f02.
   - f01, f02 업로드 → 상태에서 activeFile을 바꿀 방법이 아직 없으므로 `page.evaluate`로 `window.__mxlSetActiveFile?.(1)`을 호출할 수 있게 App에 테스트 훅 `window.__mxlSetActiveFile = setActiveFile`을 `__mxlGetState` 옆에 추가하라 → 파트 추출 패널의 파트 목록이 f02의 2개 파트를 보여 주는지 확인.
7. `npm run check` 후 커밋 "패널 정보를 활성 파일 기준으로 통일하고 파일 제거 인덱스 수정".
````

**완료 기준**
- [ ] `grep -c "files\[0\]\.xmlDoc" mxl-studio.html` 결과가 폴백 형태 외 0
- [ ] `removeFile` 4가지 경우 E2E 통과
- [ ] `mxlStudioHistoryMeta` 참조 0

---

### P1-4 · Ossia 영속화와 진짜 MXL 내보내기

**근거** BUG-07, BUG-08, ROB-08. `serializeSessionFiles`/`hydrateSessionFiles`(`mxl-studio.html:166-184`)가 `ossiaMxml`을 버립니다. `exportMXL`은 `.xml`을 저장합니다. JSZip이 이미 로드되어 있어 압축은 쉽습니다. Ossia 패널의 `console.log`도 정리합니다.

````text
[P1-4] Ossia 영속화와 진짜 MXL 내보내기

A. Ossia 영속화
1. `serializeSessionFiles`가 `ossiaMxml`(문자열)과 `ossiaMeta`(객체)를 그대로 포함하도록 고쳐라.
2. `hydrateSessionFiles`가 두 필드를 복원하도록 고쳐라. `ossiaMxml`이 있으면 `DOMParser`로 파싱해 `parsererror`가 없을 때만 유지한다.
3. `share-session-core.js`의 `createPayload`/`parsePayloadText`에도 `ossiaMxml`, `ossiaMeta`를 선택 필드로 추가하라. v2 링크 파싱 시 없으면 undefined 로 둔다. 유닛 테스트에 "ossia 필드가 왕복된다" 케이스를 추가하라.
4. App의 공유 링크 로드 `useEffect`에서 복원 객체에 두 필드를 넘겨라.
5. `OssiaPanel`의 `console.log('[Ossia] Generated XML length'...)` 한 줄을 제거하라. `console.error` 두 곳은 사용자 로그(`setLog`)로 이미 전달되므로 함께 제거하라.
6. `tests/e2e/00-smoke.spec.js`의 "restores autosaved session" 케이스를 복제해 "Ossia 추가 후 새로고침·복원 시 `.ossia-inline svg`가 다시 그려진다" 케이스를 `tests/e2e/05-ossia-persist.spec.js`에 추가하라 (`@panels`).

B. 진짜 MXL 내보내기
7. UTILITY 영역에 `async function buildMxlBlob(file)`을 추가하라.
   - JSZip 인스턴스 생성 → `META-INF/container.xml` (rootfile full-path는 `score.xml`) → `score.xml`에 `XMLSerializer` 결과 → `generateAsync({type:'blob', compression:'DEFLATE'})`.
   - JSZip이 없으면 `null`을 반환한다.
8. `exportMXL`을 고쳐라. `buildMxlBlob`이 blob을 주면 `<이름>.mxl`로 저장하고, null이면 기존처럼 `.xml`로 저장하며 로그에 "JSZip을 불러오지 못해 비압축 XML로 저장했습니다."를 남긴다.
9. 헤더 버튼 옆에 작은 드롭다운 대신, 메뉴바 "파일" 그룹에 "MusicXML(.xml) 내보내기" 항목을 하나 더 추가해 비압축 저장도 가능하게 하라. 기존 항목 이름은 "MXL(.mxl) 내보내기"로 바꿔라.
10. E2E `tests/e2e/06-export-mxl.spec.js` (`@panels`): 업로드 → 헤더 MXL 클릭 → `page.waitForEvent('download')` → 파일명이 `.mxl`로 끝나고 → 다운로드 경로를 JSZip으로 열어(테스트 코드에서 `node_modules/jszip` 대신 `page.evaluate`로 브라우저 JSZip 사용) `META-INF/container.xml`이 있는지 확인.
11. `npm run check` 후 커밋 두 개. "Ossia 결과를 세션·공유에 영속화", "MXL 내보내기를 실제 압축 .mxl로 변경".
````

**완료 기준**
- [ ] Ossia 복원 E2E 통과
- [ ] `.mxl` 다운로드가 다시 업로드되어 렌더됨 (수동 1회 + E2E)
- [ ] `grep -c "console\." mxl-studio.html` 결과 0

---

## Phase 2. 견고성 (3세션)

### P2-1 · Error Boundary, 로딩 스플래시, CDN 실패 폴백

**근거** ROB-01, ROB-02, ROB-09, UX-07, OPS-04. 렌더 오류 하나가 앱 전체를 지우고, CDN 하나가 막히면 검은 화면만 남습니다.

````text
[P2-1] Error Boundary, 로딩 스플래시, CDN 실패 폴백

A. 로딩 스플래시 (Babel 컴파일 전에 보이는 순수 HTML)
1. `<div id="root">` 안에 정적 마크업을 넣어라.
   ```html
   <div id="boot" class="boot">
     <div class="boot__logo">♫</div>
     <div class="boot__title">악보 디자이너</div>
     <div class="boot__status" id="boot-status">불러오는 중입니다.</div>
     <noscript>이 앱은 JavaScript가 필요합니다.</noscript>
   </div>
   ```
   React가 마운트되면 자연히 교체된다. `styles.css`에 `.boot` 계열 스타일을 추가하라 (중앙 정렬, `--bg-dark` 배경, 밝은 글자).
2. `</head>` 직전에 작은 인라인 `<script>`(babel 아님)를 추가해 `window.addEventListener('error', ...)`로 스크립트 로드 실패를 잡고, `#boot-status`에 "필수 라이브러리(React/OSMD 등)를 불러오지 못했습니다. 네트워크를 확인하고 새로고침하세요."를 표시하게 하라. 또 15초가 지나도 `#boot`가 남아 있으면 같은 문구를 표시하라.
3. babel 스크립트 맨 앞에 가드를 추가하라. `React`, `ReactDOM`, `opensheetmusicdisplay`, `JSZip` 중 하나라도 없으면 `#boot-status`에 어떤 것이 없는지 표시하고 `throw`로 중단한다. `Tone`은 선택 의존성이므로 없으면 경고만 하고 재생 버튼을 비활성화한다 (P6-4에서 지연 로드로 바꿀 예정).

B. Error Boundary
4. 클래스 컴포넌트 `class PanelErrorBoundary extends React.Component`를 만들어라. `getDerivedStateFromError`, `componentDidCatch`(context-notes용 콘솔 출력은 허용하되 `console.error` 대신 `window.__mxlLastError`에 저장), 폴백 UI는 "이 패널에서 오류가 났습니다. [다시 시도] 버튼" (버튼은 state 초기화). props로 `label`을 받아 어느 패널인지 표시한다.
5. `ALL_PANELS`의 각 항목을 `<PanelErrorBoundary label={PANEL_LABELS[id]}>`로 감싸라. `ScoreView`, `TransportBar`, `MenuBar`도 각각 감싸라. App 최상위도 한 번 더 감싼다 (폴백은 "앱을 다시 시작하려면 새로고침하세요. 자동저장된 세션은 유지됩니다.").
6. `ReactDOM.render(<App/>, ...)`를 `ReactDOM.createRoot(document.getElementById('root')).render(<App/>)`로 바꿔라. 바꾼 뒤 `npm run e2e:smoke`가 통과하는지 반드시 확인하라. 자동 배칭으로 `setFiles`+`pushHistory` 순서가 문제되면 원인을 보고하고 되돌린다.

C. SRI
7. `<script src="https://cdnjs...">` 5개와 jsdelivr 1개에 `integrity`와 `crossorigin="anonymous"`를 추가하라. 해시는 `curl -s <url> | openssl dgst -sha384 -binary | openssl base64 -A`로 직접 계산해 넣고, 계산에 쓴 명령과 결과를 보고하라. 하나라도 계산할 수 없으면 그 태그는 건드리지 말고 이유를 보고하라.
8. SRI를 넣은 뒤 브라우저에서 콘솔 에러 없이 로드되는지 확인하라. `@smoke` "empty app loads without console errors"가 이를 검증한다.

D. 테스트
9. `tests/e2e/07-boot-fallback.spec.js` (`@robustness`):
   - `page.route('**/opensheetmusicdisplay*', route => route.abort())` 후 접속 → `#boot-status` 텍스트에 "불러오지 못했습니다"가 포함.
   - 정상 접속 → `#boot`가 사라짐.
   - `page.evaluate`로 `window.__mxlThrowInPanel = 'transpose'` 같은 테스트 훅을 두어 특정 패널이 throw 하게 만들고 → 그 패널 자리에 "다시 시도" 버튼이 보이고 나머지 앱은 살아 있음. 훅은 `PanelErrorBoundary` 안이 아니라 각 패널 최상단에서 `if(window.__mxlThrowInPanel===id) throw new Error('test')`로 두되, 21개 패널 전부가 아니라 `TransposePanel` 하나에만 넣는다.
10. `npm run check` 후 커밋 "로딩 스플래시·CDN 폴백·Error Boundary 추가, createRoot 전환, SRI 적용".
````

**완료 기준**
- [ ] OSMD 차단 시 한국어 안내가 보임 (E2E)
- [ ] 패널 throw 시 해당 패널만 폴백 (E2E)
- [ ] 스모크 6개 통과 (createRoot 전환 후)
- [ ] SRI 적용 태그 수 보고

---

### P2-2 · ScoreView 렌더 오류 상태화와 죽은 코드 제거

**근거** ROB-03, ROB-07. `ScoreView`가 오류 시 React 관리 노드에 `innerHTML`을 씁니다. `CursorTransportBar`(140줄)는 미사용이고 `osmdRef` 배관은 write-only입니다. 단, `osmdRef`는 P5-3 재생 커서에서 다시 쓰므로 **배관은 남기고** 컴포넌트만 지웁니다.

````text
[P2-2] ScoreView 렌더 오류 상태화와 죽은 코드 제거

1. `ScoreView`에 `const [renderError, setRenderError] = useState(null)`을 추가하고, OSMD `load/render` 실패 시 `containerRef.current.innerHTML = ...` 대신 `setRenderError(e.message)`를 호출하라. JSX에서 `renderError`가 있으면 `.score-error` 블록(한국어 메시지 + "다시 렌더" 버튼)을 `.score-container` 위에 표시한다. 새 렌더 시작 시 `setRenderError(null)`.
2. Ossia 렌더 실패도 같은 방식으로 `ossiaError` 상태로 바꿔라. 인라인 style 문자열을 제거하고 `styles.css`에 `.ossia-inline__error`를 추가하라.
3. `CursorTransportBar` 함수 전체를 삭제하라. 삭제 전 `grep -n "CursorTransportBar" mxl-studio.html`로 참조가 정의 1곳뿐임을 보고하라.
4. `osmdRef`, `handleOsmdReady`, `onOsmdReady`는 그대로 두고 `// P5-3 재생 커서에서 사용 예정` 주석을 붙여라.
5. `MenuBar`의 SVG 아이콘 3개(capo/panflute/transpose)가 좌·우 액티비티 바에 완전히 중복 인라인되어 있다. `function ActivityIcon({icon})` 컴포넌트로 추출해 두 곳에서 쓰게 하라. 마크업은 바꾸지 않는다.
6. `npm run check` 후 커밋 "ScoreView 오류를 상태로 관리하고 미사용 CursorTransportBar 제거".
````

**완료 기준**
- [ ] `grep -c "innerHTML" mxl-studio.html`이 OSMD 컨테이너 초기화용 2곳(`scoreRenderRef.current.innerHTML=''`, `ossiaRef.current.innerHTML=''`)과 Export 미리보기·배치 컨테이너 외 0
- [ ] 파일 줄 수가 최소 150줄 감소
- [ ] 스모크 통과

---

### P2-3 · 업로드 견고화

**근거** ROB-04. 크기 제한·중복 이름·개수 제한이 없고, 파싱이 메인 스레드에서 동기 실행됩니다.

````text
[P2-3] 업로드 견고화

1. `addFiles`에 다음 규칙을 추가하라. 상수는 UTILITY 영역에 둔다.
   - `MAX_FILE_BYTES = 20 * 1024 * 1024`. 초과 파일은 건너뛰고 로그에 "20MB를 넘는 파일은 열 수 없습니다."
   - `MAX_FILES = 30`. 합계 초과 시 초과분 건너뛰고 안내.
   - 같은 이름이 이미 있으면 `이름 (2).musicxml` 형식으로 변경하고 `sourceName`에 원래 이름을 보존.
   - 파일마다 `showProgress(\`파일 읽는 중... (${i+1}/${n})\`)` 갱신.
   - 파싱 사이에 `await new Promise(r=>setTimeout(r,0))`을 넣어 UI가 멈추지 않게 한다.
2. 오류 메시지를 `alert` 대신 `UploadPanel`에 전달할 `uploadLog` 상태로 모아라. `UploadPanel`은 `LogPanel`로 표시한다. (P3-1의 notify가 아직 없으므로 이 세션에서는 LogPanel만 쓴다.) 기존 `alert(\`${file.name}: ${e.message}\`)`를 제거하라.
3. `.mxl` 안에 rootfile이 여러 개면 첫 번째를 쓰되 로그에 "rootfile N개 중 첫 번째를 열었습니다."를 남겨라.
4. `tests/e2e/08-upload-robust.spec.js` (`@robustness`):
   - 같은 픽스처를 두 번 올리면 두 번째 이름이 `f01-basic (2).musicxml`.
   - `.txt` 파일을 올리면 파일 목록은 그대로이고 업로드 패널 로그에 "지원하지 않는 파일 형식" 표시.
   - `page.setInputFiles`로 21MB 더미(`buffer`)를 올리면 건너뛰고 안내 문구 표시.
5. `npm run check` 후 커밋 "업로드 크기·개수·중복 이름 처리 추가".
````

**완료 기준**
- [ ] 세 가지 E2E 통과
- [ ] `addFiles` 안 `alert` 0개

---

## Phase 3. UX 핵심 (5세션)

### P3-1 · 알림 시스템 도입과 alert 59개 교체

**근거** ROB-05. `alert()` 59개, `window.prompt` 1개. 대부분 "먼저 파일을 업로드 해주세요."처럼 정보성입니다.

````text
[P3-1] 알림 시스템 도입과 alert 교체

1. App에 토스트 상태와 컨텍스트를 추가하라.
   - `const NotifyContext = React.createContext(()=>{})`.
   - App 안에 `const [toasts, setToasts] = useState([])`, `notify(message, type='info', {duration=3500}={})` 함수. type은 info/ok/warn/err. 최대 4개, 같은 메시지 연속 시 중복 억제.
   - `<NotifyContext.Provider value={notify}>`로 트리를 감싸고, `<div className="toast-stack" role="status" aria-live="polite">`에 렌더. err 타입은 `aria-live="assertive"`.
   - 각 토스트에 닫기 버튼과 자동 소멸.
2. `function useNotify(){ return React.useContext(NotifyContext) }` 훅을 두어라.
3. `styles.css`에 `.toast-stack`, `.toast`, `.toast--ok|warn|err` 스타일을 추가하라. 우측 하단, 트랜스포트 바 위(`bottom: calc(var(--transport-h) + 12px)`).
4. `grep -n "alert(" mxl-studio.html`으로 59곳을 나열하고 세 부류로 분류해 표로 보고하라.
   (a) "먼저 파일을 업로드" 류 사전 조건 → `notify(msg,'warn')`
   (b) 작업 실패 → `notify(msg,'err')` + 해당 패널 `setLog`도 유지
   (c) 팝업 차단 등 조치 필요 → `notify(msg,'err',{duration:8000})`
5. 전부 교체하라. 패널 컴포넌트 최상단에 `const notify = useNotify();`를 추가한다. 교체 후 `grep -c "alert(" mxl-studio.html`이 0이어야 한다.
6. `saveSessionSlot`의 `window.prompt`는 P3-4 세션 모달에서 대체하므로 이 세션에서는 그대로 둔다. 다만 `grep`에 잡히도록 `// TODO(P3-4)` 주석을 붙여라.
7. 이미 있는 E2E 중 `alert`를 전제한 것이 없는지 확인하라 (`page.on('dialog')` 검색). 있으면 토스트 확인으로 바꿔라.
8. `tests/e2e/09-notify.spec.js` (`@ux`): 파일 없이 조옮김 "변환 실행" 클릭 → `.toast--warn`에 "먼저 파일을 업로드" 포함 → 4초 뒤 사라짐.
9. `npm run check` 후 커밋 "alert를 토스트 알림 시스템으로 교체".
````

**완료 기준**
- [ ] `grep -c "alert(" mxl-studio.html` 결과 0
- [ ] 토스트가 `aria-live`로 읽힘
- [ ] 스모크 + notify E2E 통과

---

### P3-2 · 파일 탭과 활성 파일 전환

**근거** BUG-04. 여러 파일을 올려도 악보 뷰는 항상 첫 파일입니다. P1-3에서 배관을 정리했으므로 UI만 붙입니다.

````text
[P3-2] 파일 탭과 활성 파일 전환

1. `ScoreView` 위(`.main-score` 상단)에 파일 탭 바를 추가하라. 컴포넌트 `function FileTabs({files, activeFile, onSelect, onClose})`.
   - 각 탭은 `<button type="button" role="tab" aria-selected>` 로, 파일명(확장자 제거)과 닫기 ×(`aria-label="파일 닫기: 이름"`).
   - 파일이 1개 이하이면 탭 바를 숨긴다.
   - 키보드: 좌우 화살표로 이동, Delete로 닫기.
   - 탭이 많으면 가로 스크롤 (`overflow-x:auto`), 활성 탭이 보이도록 `scrollIntoView({inline:'nearest'})`.
2. `UploadPanel` 파일 목록 항목도 클릭하면 활성 파일이 되게 `onSelect` prop을 추가하고, 활성 항목에 `file-entry--active` 클래스와 `aria-current="true"`.
3. App에서 `activeFile`을 세션에 이미 저장하고 있으니(`buildSession`) 복원 시 그대로 쓰이는지 확인만 하라.
4. `styles.css`에 `.file-tabs`, `.file-tab`, `.file-tab--active`, `.file-entry--active`를 추가하라. `.main-score`는 flex column으로 바꾸되 기존 중앙 정렬 빈 상태(`.score-empty`)가 깨지지 않게 한다.
5. 헤더 배지 "파일 N개"를 "파일 N개 · 현재: 이름"으로 확장하라.
6. P1-3에서 넣은 `window.__mxlSetActiveFile` 테스트 훅은 유지한다.
7. `tests/e2e/10-file-tabs.spec.js` (`@ux`): f01, f02 업로드 → 탭 2개 → 두 번째 탭 클릭 → `__mxlGetState().activeFile===1` → 악보 SVG에 "Violin" 텍스트가 있음 → 두 번째 탭 닫기 → 탭 바 숨김, activeFile 0.
8. `npm run check` 후 커밋 "파일 탭으로 활성 파일 전환 지원".
````

**완료 기준**
- [ ] 파일 2개 이상일 때 탭이 보이고 클릭·키보드로 전환
- [ ] 전환 시 조옮김 패널 마디 수·조성 표시가 활성 파일 기준으로 바뀜 (수동 확인 후 context-notes 기록)

---

### P3-3 · 우측 패널 토글과 레이아웃 정리

**근거** UX-01, UX-08. `setShowRight(false)`가 없고 `.app-root--right-closed`가 죽어 있습니다.

````text
[P3-3] 우측 패널 토글과 레이아웃 정리

1. 헤더에 우측 토글 버튼을 추가하라. 기존 `header__toggle`(☰)과 같은 스타일, 아이콘은 ☰를 좌우 반전하지 말고 텍스트 "우측"으로 두되 `aria-label="도구 패널 토글"`, `aria-pressed={showRight}`. 기존 좌측 버튼에도 `aria-label="인스펙터 패널 토글"`, `aria-pressed` 추가.
2. 액티비티 바에서 **현재 활성 패널 아이콘을 다시 클릭하면** 해당 사이드가 닫히게 하라 (VS Code 동작). 좌·우 모두.
3. 단축키 `Ctrl+B`(좌), `Ctrl+Shift+B`(우)를 App의 키다운 핸들러에 추가하라. 입력 요소에 포커스가 있으면 무시.
4. 패널 폭 드래그 조절을 추가하라. `.inspector`와 `.analysis`의 안쪽 가장자리에 6px `resize-handle` 요소를 두고 pointer 이벤트로 `--inspector-w`/`--analysis-w`를 `document.documentElement.style.setProperty`로 갱신 (최소 220, 최대 520). 값은 localStorage `mxlStudio.layout`에 저장하고 시작 시 복원. 값이 없거나 파싱 실패 시 기본값.
5. 좌·우가 모두 닫힌 상태(`.app-root--left-closed.app-root--right-closed`)의 CSS가 이미 있으니 그대로 활용하라.
6. `tests/e2e/11-layout.spec.js` (`@ux`): 우측 토글 클릭 → `.app-root`에 `app-root--right-closed` 클래스 → 다시 클릭 → 사라짐. Ctrl+B → left-closed.
7. `npm run check` 후 커밋 "우측 패널 토글·단축키·패널 폭 조절 추가".
````

**완료 기준**
- [ ] 양쪽 패널 모두 열고 닫을 수 있음
- [ ] 새로고침 후 패널 폭 유지

---

### P3-4 · 세션 관리 모달 (목록·불러오기·삭제·JSON 내보내기·가져오기)

**근거** UX-02, UX-03, ROB-05(prompt). 코어에 `listSessions`, `loadSession`, `deleteSession`이 이미 있고 HTML에서 호출되지 않습니다. 매뉴얼은 JSON 내보내기·가져오기를 이미 설명하고 있습니다.

````text
[P3-4] 세션 관리 모달

1. `function SessionModal({open, onClose, files, activeFile, onRestore, notify})`를 만들어라. 공유 모달과 같은 backdrop/dialog 마크업(`role="dialog" aria-modal aria-labelledby`)을 쓴다.
   섹션 구성은 다음과 같다.
   - "현재 세션 저장": 이름 입력(`<input>` 기본값 "악보 세션 YYYY-MM-DD HH:mm") + 저장 버튼. `window.prompt` 제거.
   - "저장된 세션": `SessionStoreCore.listSessions()` 결과 표. 열은 이름, 파일 수, 저장 시각(`toLocaleString('ko-KR')`), 크기(직렬화 길이 추정), 버튼 [불러오기] [JSON] [삭제]. `autosave` 항목은 이름을 "자동 저장"으로 표시하고 삭제 버튼을 숨긴다.
   - "JSON 가져오기": 파일 입력(`accept=".json"`). 파싱 후 `files` 배열과 `version` 필드를 검증하고 `hydrateSessionFiles`로 복원. 실패 시 notify err.
   - 하단에 저장소 사용량(`sessionStatus`) 표시.
2. 불러오기 동작: `onRestore(session)` → App에서 `hydrateSessionFiles` → `setFiles` → `pushHistory(restored, '세션 불러오기: 이름')`. 현재 작업이 있으면 모달 안에 "현재 작업을 덮어씁니다. 계속할까요?" 인라인 확인 단계(두 번째 클릭)로 처리하고 `window.confirm`은 쓰지 않는다.
3. 삭제 동작도 같은 두 단계 확인. 삭제 후 목록 갱신.
4. JSON 내보내기: `buildSession(id, {name})` 결과를 `JSON.stringify(...,null,2)` → `downloadBlob` → 파일명 `mxl-session-<이름>-<YYYYMMDD-HHmm>.json`.
5. 헤더 "세션" 버튼이 모달을 열게 바꿔라. 메뉴바 "파일" 그룹에 "세션 관리…" 항목 추가.
6. 모달 공통 동작을 헬퍼 훅으로 빼라. `function useModalA11y(open, onClose, dialogRef)`: 열릴 때 첫 포커스 가능 요소로 포커스, Tab 순환(포커스 트랩), Esc로 닫기, 닫힐 때 이전 포커스 복귀. 공유 모달에도 적용하라 (A11Y-04 선행 처리).
7. 유닛 테스트: `session-store-core.test.js`에 "listSessions가 autosave를 맨 앞에 두고 나머지를 savedAt 내림차순으로 정렬" 케이스가 이미 있는지 확인하고 없으면 추가.
8. `tests/e2e/12-session-modal.spec.js` (`@ux`):
   - 업로드 → 세션 버튼 → 이름 입력 "테스트 세션" → 저장 → 목록에 1행.
   - 조옮김 +2 실행 → 목록에서 "테스트 세션" 불러오기 → 확인 단계 클릭 → 첫 음 C4 (원본 복원).
   - JSON 버튼 → download 이벤트 → 파일명 `.json`.
   - 삭제 → 확인 → 목록 0행.
   - Esc로 모달 닫힘, 포커스가 "세션" 버튼으로 복귀.
9. `npm run check` 후 커밋 "세션 관리 모달 추가 (목록·불러오기·삭제·JSON)".
````

**완료 기준**
- [ ] `grep -c "window.prompt" mxl-studio.html` 결과 0
- [ ] `listSessions`, `deleteSession`이 HTML에서 호출됨
- [ ] E2E 5단계 통과

---

### P3-5 · 악보 줌과 인쇄 CSS 기반 PDF

**근거** UX-04, ROB-06. 줌 컨트롤이 없고, PDF는 팝업 + `document.write`에 의존합니다.

````text
[P3-5] 악보 줌과 인쇄 CSS 기반 PDF

A. 줌
1. `ScoreView`에 줌 상태를 추가하라. `const [zoom, setZoom] = useState(1)`. OSMD 인스턴스 생성 후 `osmd.zoom = zoom` 설정, zoom 변경 시 `osmd.render()`만 다시 호출 (load 반복 금지).
2. `.main-score` 우측 하단에 플로팅 컨트롤 `.score-zoom`: [－] [100%] [＋] [맞춤]. 단계는 0.5~2.0, 0.1 간격. "맞춤"은 컨테이너 폭 기준으로 `osmd.zoom`을 계산 (첫 시스템 폭이 컨테이너 폭의 95%가 되도록). 각 버튼은 `<button type="button" aria-label>`.
3. 단축키 Ctrl+= / Ctrl+- / Ctrl+0. 브라우저 기본 줌을 막기 위해 `preventDefault`.
4. 줌 값은 세션에 저장하지 않는다 (뷰 상태). localStorage `mxlStudio.zoom`에만 기억.

B. 인쇄 CSS PDF
5. `styles.css`에 `@media print` 블록을 추가하라. `.header .activity-bar .right-activity-bar .inspector .analysis .transport .toast-stack .score-zoom .file-tabs`를 `display:none`, `.app-root`를 `display:block; height:auto; overflow:visible`, `.main-score`와 `.score-container`를 `overflow:visible; padding:0; background:#fff`, `svg{max-width:100%; height:auto}`, `@page{margin:10mm}`.
6. `exportPDF`(App)와 `ExportPanel.exportPDF`를 `window.print()` 한 줄로 바꿔라. 팝업·`document.write` 제거. 인쇄 전 `document.title`을 파일명으로 잠시 바꾸고 `afterprint`에서 복원 (브라우저가 PDF 파일명 기본값으로 쓴다). 파일명은 `replace(/[<>:"/\\|?*]/g,'_')`로 정리.
7. 인쇄 시 줌을 1.0으로 임시 재렌더하고 `afterprint`에서 원래 줌으로 복원하라 (`beforeprint` 이벤트).
8. Export 패널의 안내 문구를 "인쇄 대화상자에서 'PDF로 저장'을 선택하세요."로 유지하되 "팝업 허용" 언급을 제거.
9. `tests/e2e/13-zoom-print.spec.js` (`@ux`): ＋ 두 번 → `%` 표시 120% → Ctrl+0 → 100%. `page.emulateMedia({media:'print'})` 후 `.header`가 `display:none`, `.score-main-render svg`가 visible.
10. `npm run check` 후 커밋 두 개. "악보 줌 컨트롤 추가", "PDF 내보내기를 인쇄 CSS 방식으로 전환".
````

**완료 기준**
- [ ] 줌 버튼·단축키 동작
- [ ] `grep -c "document.write" mxl-studio.html` 결과 0
- [ ] 인쇄 미리보기에 악보만 보임 (수동 1회 + emulateMedia E2E)

---

## Phase 4. 접근성·반응형 (3세션)

### P4-1 · 상호작용 요소를 버튼으로 전환

**근거** A11Y-01, A11Y-02, A11Y-06. `Chip`·`Toggle`·조성 그리드가 `<div onClick>`입니다.

````text
[P4-1] 상호작용 요소를 버튼으로 전환

1. `Chip`을 `<button type="button" className="chip..." aria-pressed={!!on}>`로 바꿔라. `Toggle`은 `<button type="button" role="switch" aria-checked={!!on} className="toggle...">`로 바꾸고, 시각 라벨이 없으므로 `label` prop을 받아 `aria-label`로 붙여라. 호출처 전부에 `label`을 넘겨라 (`grep -n "<Toggle" mxl-studio.html`).
2. `key-grid__btn` div를 `<button type="button" aria-pressed>`로 바꿔라. `TransposePanel`, `KeyChangePanel` 등 조성 그리드를 쓰는 곳 전부 (`grep -n "key-grid__btn"`).
3. `styles.css`에서 `.chip`, `.toggle`, `.key-grid__btn`이 버튼 기본 스타일(테두리·배경·폰트)을 초기화하도록 `appearance:none; border:0; font:inherit; color:inherit; background:none` 계열을 추가하고 기존 시각을 유지하라. 스크린샷으로 전후 비교해 보고하라.
4. 액티비티 바 아이콘 버튼에 `aria-label={PANEL_LABELS[id]}`와 `aria-pressed={active}`를 추가하라. 이모지 span에 `aria-hidden="true"`.
5. `.file-entry__remove` ×, 공유 모달 ×, 히스토리 ↩↪ 버튼에 `aria-label` 추가.
6. 기존 E2E 중 `getByText('반음 단위 이동').click()`처럼 div를 전제한 셀렉터가 버튼 전환 후에도 동작하는지 실행해 확인하라.
7. `tests/e2e/14-a11y-controls.spec.js` (`@a11y`): 조옮김 패널에서 Tab 키만으로 "반음 단위 이동" 칩에 도달해 Space로 선택되고 `aria-pressed="true"`가 되는지. 파트 추출 패널의 스위치가 Space로 토글되고 `aria-checked`가 바뀌는지.
8. `npm run check` 후 커밋 "Chip·Toggle·조성 그리드를 접근 가능한 버튼으로 전환".
````

**완료 기준**
- [ ] `grep -c "<div className={\`chip" mxl-studio.html` 결과 0
- [ ] 키보드만으로 조옮김 실행 가능

---

### P4-2 · 포커스 표시, 메뉴 키보드 탐색, 모션 감소

**근거** A11Y-03, A11Y-04, A11Y-05.

````text
[P4-2] 포커스 표시, 메뉴 키보드 탐색, 모션 감소

1. `styles.css` RESET 다음에 전역 포커스 링을 추가하라.
   ```css
   :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
   :focus:not(:focus-visible) { outline: none; }
   ```
   기존에 `outline:none`을 준 규칙이 있으면 `grep -n "outline" styles.css`로 찾아 `:focus-visible` 예외를 두어라.
2. `MenuBar`에 키보드 지원을 추가하라.
   - 메뉴 버튼: `aria-haspopup="menu" aria-expanded`.
   - 드롭다운: `role="menu"`, 항목 `role="menuitem"`, 구분선 `role="separator"`.
   - 열린 상태에서 ↑↓로 항목 이동, Enter/Space 실행, Esc 닫고 메뉴 버튼으로 포커스 복귀, ←→로 인접 메뉴로 이동.
   - 마우스 외부 클릭 닫기는 유지.
3. `@media (prefers-reduced-motion: reduce)` 블록을 추가해 `.panel` 진입 애니메이션, 토스트 트랜지션, `--transition-*`를 0으로 만든다.
4. 색 대비를 점검하라. `--text-muted: #aeaeb2`를 흰 배경 위 12px 텍스트에 쓰는 곳은 WCAG AA 미달이다. `--text-muted`를 `#8e8e93`로 조정하고 어디에 쓰이는지 `grep -c "text-muted" styles.css`로 보고하라. 시각 변화는 스크린샷으로 첨부.
5. `tests/e2e/15-a11y-menu.spec.js` (`@a11y`): "변환" 메뉴에 포커스 → Enter → 첫 항목 포커스 → ↓ 두 번 → Enter → 카포 패널이 열림 → Esc.
6. `npm run check` 후 커밋 "포커스 링·메뉴 키보드 탐색·모션 감소 대응".
````

**완료 기준**
- [ ] 메뉴를 키보드만으로 조작 (E2E)
- [ ] reduced-motion에서 애니메이션 없음 (수동 확인 기록)

---

### P4-3 · 모바일 드로어

**근거** UX-06. 700px 이하에서 패널이 전부 사라져 변환 도구를 쓸 수 없습니다.

````text
[P4-3] 모바일 드로어

1. `styles.css` 700px 이하 미디어 쿼리를 다음처럼 바꿔라.
   - 액티비티 바 두 개는 숨기되, 헤더에 "도구" 버튼 하나를 두어 바텀 시트를 연다.
   - `.inspector`와 `.analysis`는 `position:fixed; bottom:var(--transport-h); left:0; right:0; max-height:60vh; transform:translateY(100%)`로 두고, `.app-root--drawer-open` 상태에서 `translateY(0)`. 배경 오버레이 `.drawer-backdrop`.
2. App에 `drawer` 상태 `{open:false, side:'left'}`를 추가하라. 700px 이하 여부는 `window.matchMedia('(max-width:700px)')`로 판단해 `isMobile` 상태로 둔다 (resize 리스너).
3. 모바일에서 "도구" 버튼 → 바텀 시트 첫 화면은 패널 목록(`NAV` 상수를 그대로 렌더, 섹션별 그룹). 항목 선택 → 해당 패널 내용 표시 + 상단에 "← 목록" 버튼.
4. 드로어는 `role="dialog" aria-modal`, P3-4의 `useModalA11y` 재사용. 스와이프 다운 닫기는 넣지 않는다 (범위 밖).
5. 헤더 내보내기 버튼 5개는 700px 이하에서 "⋯" 메뉴 하나로 접어라.
6. `tests/e2e/16-mobile-drawer.spec.js` (`@ux`): `page.setViewportSize({width:390,height:844})` → 업로드 (드로어 → 파일 업로드) → 드로어 → 조옮김 → 반음 +2 → 첫 음 D4. 데스크톱 뷰포트에서는 드로어 요소가 `display:none`.
7. `npm run check` 후 커밋 "모바일 바텀 시트 드로어로 패널 접근 지원".
````

**완료 기준**
- [ ] 390px 폭에서 업로드·조옮김 완주 (E2E)
- [ ] 데스크톱 레이아웃 변화 없음 (스모크 통과)

---

## Phase 5. 음악 도메인 정확도 (5세션)

### P5-1 · 이명동음 철자·단조·이조악기를 존중하는 조옮김

**근거** BUG-03. `transposeNote`가 MIDI 번호 → `SEMI_TO_STEP` 고정 철자로 돌아와 F♯장조의 E♯이 F로 바뀌고, `<mode>minor`와 `<transpose>`를 무시합니다. P1-2에서 만든 `transpose-core.js`를 확장합니다.

````text
[P5-1] 이명동음 철자·단조·이조악기를 존중하는 조옮김

1. `transpose-core.js`에 온음계 기반 이동을 추가하라.
   - `intervalFromSemitones(semitones, preferFlat)`: 반음 수를 `{diatonic, chromatic}` 쌍으로 변환. 예 +2 → {1,2}(장2도), +1 → {0,1}(단2도) 또는 preferFlat이면 {1,1}(단2도로 표기), +6 → {3,6}(증4도) 또는 {4,6}(감5도).
   - `transposePitch({step, alter, octave}, {diatonic, chromatic})`: step 인덱스를 diatonic만큼 옮기고, 결과 반음 수가 chromatic과 맞도록 alter를 계산한다. alter 범위 -2~+2 허용. 초과하면 이명동음으로 단순화.
   - `keyFifthsAfter(fifths, semitones)`: 5도권 이동. 결과가 -7~+7을 벗어나면 이명동음 조로 접는다 (예 +7 → -5).
   - `preferFlatForKey(fifths)`: 목표 조가 플랫 조면 true.
2. `transposeDocument(xmlDoc, semitones, options)`를 추가하라.
   - `options.respectInstrumentTranspose` (기본 true): 파트의 `<transpose>`를 읽어 실음 기준으로 처리하되 표기음을 옮긴다. 즉 각 파트의 음표는 그대로 semitones만큼 옮기고 `<transpose>` 요소는 유지한다. (실음=표기음+transpose 이므로 둘 다 같은 양을 옮기면 관계가 유지된다.) 이 규칙을 코드 주석으로 적어라.
   - `<key>`의 `fifths`를 `keyFifthsAfter`로 갱신하고 `<mode>`는 그대로 둔다.
   - `<harmony>`도 같은 온음계 규칙으로 옮긴다 (P1-2의 반음 규칙을 대체).
   - `<accidental>` 요소를 새 alter에 맞게 sharp/flat/double-sharp/flat-flat/natural로 갱신하거나 제거한다.
   - 반환 `{notes, harmonies, keys, parts}`.
3. 유닛 테스트 `transpose-core.test.js`에 추가하라.
   - C장조 → +6 (F♯장조로 표기 선택 시) 음계가 F♯ G♯ A♯ B C♯ D♯ E♯ 으로 철자됨 (f07 사용).
   - C장조 → +6 (G♭장조 선택 시) G♭ A♭ B♭ C♭ D♭ E♭ F.
   - A단조(f04) → +3 → C단조. `fifths` -3, `mode` minor 유지, 코드 Cm Fm G7 Cm.
   - f05(B♭ 클라리넷) → +2 → 표기 E장조, `<transpose>` 유지.
   - E♯ → +1 → F♯ (겹올림 회피 확인).
4. `TransposePanel`에 옵션 "철자 선택: 자동 / ♯ 우선 / ♭ 우선" 칩을 추가하고 `transposeDoc`을 `TransposeCore.transposeDocument` 호출로 위임하라. 기존 4가지 모드(특정 조·12조·반음·음정)는 그대로 유지한다.
   - "특정 조" 모드는 목표 조의 5도권 부호로 자동 결정.
   - "12개 장조 모두"는 KEY_NAMES 표기에 맞춰 D♭ E♭ A♭ B♭은 ♭, F♯/G♭은 ♯.
5. `KEY_NAMES` 표시에 단조 지원을 추가하라. 활성 파일의 `<mode>`가 minor면 조옮김 패널 정보와 목표 조 그리드 라벨을 "Am, B♭m…" 관계조 이름으로 표시한다 (KEY_FIFTHS 기준으로 단조 이름 배열 `MINOR_KEY_NAMES` 추가).
6. 기존 `@smoke` 반음 조옮김 테스트(C4 +2 → D4)는 그대로 통과해야 한다.
7. `npm run check` 후 커밋 "온음계 기반 조옮김으로 전환 (이명동음·단조·이조악기 존중)".
````

**완료 기준**
- [ ] 유닛 테스트 5케이스 추가 통과
- [ ] f07 업로드 후 +1 조옮김 시 렌더된 악보에 겹올림 없음 (수동 확인 기록)
- [ ] 스모크 통과

---

### P5-2 · 재생 데이터 코어 분리와 tie·velocity·반복·마디 템포 반영

**근거** BUG-09, BUG-10. `extractMidiPlaybackData`가 HTML에 박혀 있고 tie·dynamics·repeat·중간 템포를 무시합니다.

````text
[P5-2] 재생 데이터 코어 분리

1. 새 파일 `playback-core.js` (`// MusicXML을 재생 이벤트 목록으로 펼치는 순수 로직`). `window.PlaybackCore`로 다음을 노출한다.
   - `extractPlaybackData(xmlDoc, {bpm, expandRepeats=true})`: 기존 `extractMidiPlaybackData`를 옮겨 오되 다음을 추가한다.
     a. tie: `<tie type="start">` 음은 다음 같은 음의 `<tie type="stop">`까지 duration을 합쳐 하나의 이벤트로 만든다. 중간 `continue`도 처리.
     b. velocity: 마지막으로 만난 `<dynamics>` 자식 이름을 표로 매핑 (ppp 20, pp 33, p 49, mp 64, mf 80, f 96, ff 112, fff 126). `<sound dynamics="N">`이 있으면 N% × 90.
     c. 반복: `<repeat direction>`과 `<ending number>`를 펼쳐 마디 순서 배열을 만든 뒤 그 순서대로 시간을 누적한다. `<sound dacapo/dalsegno/fine/tocoda>`는 이번 범위에서 제외하고 TODO 주석.
     d. 마디 템포: 마디 안 `<sound tempo>`를 만나면 그 시점부터 초당 길이 계산에 새 bpm을 쓴다. `bpm` 옵션은 "곡 전체 배율"이 아니라 "첫 템포 덮어쓰기"로 취급하고, 후속 템포는 첫 템포 대비 비율을 유지한다. 이 규칙을 주석으로 적어라.
     e. `measureTimeline`에 펼친 순서의 각 항목 `{measure(원래 번호), index(펼친 순서), startSec, endSec, bpm}`.
   - `measureAtTime(measureTimeline, sec)`: 이진 탐색으로 현재 마디 항목 반환 (BUG-10 해결).
   - `midiToToneNote(midi)`도 함께 옮긴다.
2. `tests/unit/playback-core.test.js`:
   - f06: tie 쌍이 이벤트 1개로 합쳐지고 duration이 합산.
   - f06: `<p>` 뒤 음은 velocity 49, `<f>` 뒤는 96.
   - f08: 반복 펼침 후 totalMeasures가 원래 4가 아닌 펼친 수(예 6)이고 두 번째 마디부터 bpm 60 반영.
   - f03: 못갖춘마디가 timeline 첫 항목 measure 0.
   - `measureAtTime`이 경계값에서 올바른 항목을 반환.
3. `mxl-studio.html`에서 `extractMidiPlaybackData`, `midiToToneNote`, `durationToSeconds`를 `PlaybackCore` 위임으로 바꾸고 본문을 제거하라. `MidiPlayer`의 `currentMeasure` 계산을 `measureAtTime`으로 교체. 코어가 없으면 재생 버튼 비활성 + notify.
4. `MidiPlayer`에 "반복 기호 펼치기" 토글을 추가하라 (기본 켬).
5. 기존 재생 관련 E2E가 없으므로 `tests/e2e/17-playback.spec.js` (`@panels`)를 추가하라. f08 업로드 → 재생 → 0.5초 대기 → `__mxlGetState().bpm`이 파일 템포(100 등)와 일치 → 정지. 실제 오디오는 검증하지 않고 `Tone.Transport.state`가 `started`였다가 `stopped`가 되는지만 확인.
6. `npm run check` 후 커밋 "재생 데이터를 playback-core로 분리하고 tie·셈여림·반복·마디 템포 반영".
````

**완료 기준**
- [ ] 유닛 5케이스 통과
- [ ] `grep -c "function extractMidiPlaybackData" mxl-studio.html` 결과 0
- [ ] f08 재생 시 마디 표시가 반복을 따라감 (수동 기록)

---

### P5-3 · OSMD 커서 재생 동기화

**근거** UX-05, ROB-07. `osmdRef`가 App에 있으나 미사용입니다. OSMD 1.8.9는 `osmd.cursor`(`show/hide/next/reset`, `cursor.iterator.currentMeasureIndex`)를 제공합니다.

````text
[P5-3] OSMD 커서 재생 동기화

1. App의 `osmdRef`를 `TransportBar`→`MidiPlayer`에 prop으로 내려라 (`osmdRef`).
2. `MidiPlayer`에서 재생 시작 시 `osmd.cursor.show()`, 정지 시 `hide()`+`reset()`. 100ms 폴링 `useEffect`(이미 `positionSec` 갱신용이 있음) 안에서 `PlaybackCore.measureAtTime`로 얻은 `index`가 바뀌면 커서를 그 마디 첫 음으로 이동시킨다.
   - 이동 방법: `cursor.reset()` 후 `cursor.iterator.currentMeasureIndex < target` 동안 `cursor.next()` 반복. 뒤로 갈 때(루프)는 reset 후 전진. 한 번에 최대 500회로 제한.
   - 반복 펼침으로 같은 마디가 두 번 나오면 원래 `measure` 번호 기준으로 이동.
3. 커서가 화면 밖이면 `cursor.cursorElement.scrollIntoView({block:'center', behavior:'smooth'})`. reduced-motion이면 `behavior:'auto'`.
4. 파일이 바뀌거나 OSMD가 재렌더되면(`onOsmdReady(null)` → 새 인스턴스) 커서 상태를 초기화한다.
5. 기존 마디 번호 오버레이는 유지한다.
6. `styles.css`에 OSMD 커서 색을 덮어쓰는 규칙을 추가하라 (`.score-main-render img[id^="cursorImg"]` 또는 OSMD가 생성하는 커서 요소 선택자를 실제 DOM에서 확인해 사용).
7. `tests/e2e/18-cursor.spec.js` (`@panels`): f01 재생 → 300ms 뒤 커서 요소가 visible → 정지 → hidden.
8. `npm run check` 후 커밋 "재생 중 OSMD 커서 동기화".
````

**완료 기준**
- [ ] 재생 시 커서가 마디를 따라 이동 (수동 기록 + E2E)
- [ ] A-B 루프 시 커서가 되돌아감

---

### P5-4 · 로마 숫자 분석 단조·전위 지원

**근거** BUG-11. `roman-analysis-core.js`가 장조만 가정하고, 전위와 부속화음이 없습니다.

````text
[P5-4] 로마 숫자 분석 단조·전위 지원

1. `roman-analysis-core.js`를 확장하라. 기존 함수 시그니처는 유지하고 반환 객체에 필드를 더한다.
   - `getKeyInfo`: `mode`('major'|'minor') 추가. `<mode>`가 없으면 major. 단조면 `tonicSemi`는 관계단조 으뜸음 (fifths 0 → A).
   - 단조 음계는 화성단조(7음 반음 올림)와 자연단조 둘 다 허용하도록 `DIATONIC_SCALES_MINOR` 추가. 로마 숫자 표기는 소문자 조합 (i, ii°, III, iv, v/V, VI, vii°).
   - 전위: `collectMeasureBeats`에서 최저음 pitch class를 함께 기록하고, `identifyChord` 결과의 근음과 비교해 `inversion`(0/1/2/3)과 표기 접미(6, 6/4, 7, 6/5, 4/3, 4/2)를 추가.
   - 부속화음: 현재 조 밖의 장3화음/속7화음이 다음 코드의 5도 위이면 `V/x`로 표기 (`secondaryOf` 필드). 다음 코드가 없으면 `?` 유지.
   - 종지 판정을 개선: HC는 "프레이즈 끝(마디 끝 또는 쉼표 앞)에서 V"로 제한. 프레이즈 끝 판정은 마디 마지막 이벤트 뒤에 쉼표가 있거나 다음 마디가 새 프레이즈일 때로 단순화하고 규칙을 주석으로 적어라.
2. 유닛 테스트 추가.
   - f04 (A단조): rows가 i, iv, V7, i. mode minor.
   - C장조에서 C/E (베이스 E) → I6.
   - C장조에서 D7 → G → V7/V 표기.
   - 기존 G장조 테스트 그대로 통과.
3. `RomanAnalysisPanel` 표에 "전위" 열을 추가하고 버튼 라벨을 "G장조 분석 시작"에서 mode에 따라 "e단조 분석 시작"으로.
4. `insertRomanNumerals`가 새 표기(소문자, 6/4 등)를 그대로 삽입하는지 확인.
5. `npm run check` 후 커밋 "로마 숫자 분석에 단조·전위·부속화음 지원".
````

**완료 기준**
- [ ] 유닛 4케이스 추가 통과
- [ ] f04 분석 결과가 i-iv-V7-i

---

### P5-5 · 코드 심볼 파서·문자열화 확장과 Ossia 마디 번호 기준

**근거** `parseChordSymbol`/`harmonyToString`(`mxl-studio.html:356-383`)이 11종 kind만 알고, 그 외 kind는 원문 그대로 출력합니다. BUG-12 Ossia 인덱스 문제도 함께 처리합니다.

````text
[P5-5] 코드 심볼 파서 확장과 Ossia 마디 번호 기준

1. 새 파일 `chord-symbol-core.js` (`// 코드 심볼 문자열과 MusicXML harmony를 상호 변환하는 순수 로직`). `window.ChordSymbolCore`.
   - `KIND_TABLE`: MusicXML 3.1 kind 33종 전부와 표기 접미 매핑 (major '', minor 'm', augmented 'aug', diminished 'dim', dominant '7', major-seventh 'maj7', minor-seventh 'm7', diminished-seventh 'dim7', augmented-seventh 'aug7', half-diminished 'm7♭5', major-minor 'mMaj7', major-sixth '6', minor-sixth 'm6', dominant-ninth '9', major-ninth 'maj9', minor-ninth 'm9', dominant-11th '11', major-11th 'maj11', minor-11th 'm11', dominant-13th '13', major-13th 'maj13', minor-13th 'm13', suspended-second 'sus2', suspended-fourth 'sus4', Neapolitan, Italian, French, German, pedal, power '5', Tristan, other, none 'N.C.').
   - `parse(text)`: 루트, 알터, kind, bass(슬래시 코드), `<degree>` 목록(add9, ♭5 등 간단한 것만). 기존 `parseChordSymbol`의 정규식을 흡수하되 순서를 긴 접미부터 검사하도록 재정렬.
   - `toString(harmonyEl)`: `kind[text]` 속성이 있으면 우선 사용, `bass`가 있으면 `/E` 형식, `<degree>`는 괄호 없이 접미 추가.
   - `apply(harmonyEl, parsed)`: 요소 갱신 (ChordToolsPanel의 치환 로직 흡수).
2. 유닛 테스트 `chord-symbol-core.test.js`: 33종 kind 왕복, "C/E", "Cmaj7", "F#m7b5", "Bbadd9", "N.C.".
3. `mxl-studio.html`의 `parseChordSymbol`, `harmonyToString`을 코어 위임으로 바꾸고 본문 제거. `ChordToolsCore.isNoChordHarmony`와 중복되지 않게 `none` 처리는 `ChordToolsCore`에 위임.
4. Ossia: `OssiaPanel`의 범위 필터를 `measure.getAttribute('number')` 정수 비교로 바꿔라. 입력 최솟값은 문서 첫 마디 number(못갖춘마디면 0). 마디 재번호 매기기도 원래 number를 유지한다.
5. `tests/e2e/19-ossia-pickup.spec.js` (`@panels`): f03 업로드 → Ossia 1~2 → 생성된 `ossiaMxml`에 `number="1"`과 `number="2"`가 있고 `number="0"`은 없음.
6. `npm run check` 후 커밋 두 개. "코드 심볼 파서를 chord-symbol-core로 분리·확장", "Ossia 범위를 마디 번호 기준으로 변경".
````

**완료 기준**
- [ ] kind 33종 왕복 테스트 통과
- [ ] `grep -c "function parseChordSymbol" mxl-studio.html` 결과 0

---

## Phase 6. 성능 (3세션)

### P6-1 · 히스토리 스냅샷 경량화

**근거** PERF-01. 히스토리가 항목마다 전체 파일 `cloneNode(true)`를 보관합니다.

````text
[P6-1] 히스토리 스냅샷 경량화

1. `history-core.js`에 직렬화 스냅샷 모드를 추가하라. 기존 API는 유지한다.
   - `pushHistoryEntry(history, index, files, label, timestamp, {mode='string'})`. `string` 모드에서는 각 파일을 `{name, sourceName, xml: serialize(xmlDoc), ossiaMxml, ossiaMeta}`로 저장하고 `xmlDoc`은 보관하지 않는다. 직전 항목과 `xml`이 같은 파일은 같은 문자열 참조를 공유한다 (구조 공유).
   - `restoreHistoryFiles(entry)`: `xml`이 있으면 `DOMParser`로 파싱해 `{..., xmlDoc, xmlString}` 반환.
   - `estimateHistoryBytes(history)`: 고유 문자열 길이 합.
   - 파싱·직렬화 함수는 `global.DOMParser`/`global.XMLSerializer`를 쓰되 없으면(테스트 환경) 인자로 주입 가능하게 `options.serialize`/`options.parse`.
2. 유닛 테스트: string 모드 push/restore 왕복, 변경 없는 파일의 문자열 참조 공유, 50개 제한 유지, 기존 clone 모드 테스트 그대로.
3. `mxl-studio.html`의 `GlobalHistoryCore` 폴백 객체를 제거하고 `window.HistoryCore`만 쓰도록 바꿔라 (없으면 P2-1 가드가 막는다). `pushHistory`가 string 모드를 쓰게 한다.
4. `HistoryPanel` 메타에 "메모리 약 N MB" 표시 (`estimateHistoryBytes`).
5. f09(실제 악보) 업로드 후 조옮김 12회 반복 시 `performance.memory`(Chrome) 또는 `estimateHistoryBytes` 값을 전후로 측정해 context-notes에 기록하라.
6. `npm run check` 후 커밋 "히스토리 스냅샷을 직렬화 문자열로 전환".
````

**완료 기준**
- [ ] undo/redo 스모크 통과 (`기록: 조옮김` 표시 유지)
- [ ] 측정값 기록

---

### P6-2 · 패널 지연 마운트와 baseline 재복제 제거

**근거** PERF-02, PERF-03.

````text
[P6-2] 패널 지연 마운트와 baseline 재복제 제거

1. `ALL_PANELS`를 "컴포넌트 참조 맵"으로 바꾸고, 인스펙터·도구 영역은 **활성 패널 하나만** 렌더하라. 단, 패널 내부 상태(입력값·로그)가 전환 시 사라지므로 다음 규칙을 둔다.
   - 한 번 열린 패널은 `mountedPanels` Set에 기록하고 계속 마운트한다 (열린 적 있는 것만 유지). 처음부터 21개를 마운트하지 않는 것이 목표다.
   - 기존 `.panel--visible` 토글 CSS는 그대로 쓴다.
2. `NotationPanel`, `NumberingPanel`의 baseline을 "패널이 처음 실행될 때" 한 번만 복제하고, 외부 변경을 감지하면 복제가 아니라 **참조만** 보관하도록 바꿔라. 히스토리가 P6-1로 문자열 스냅샷이므로 원본이 변형될 위험이 없다. 즉 `baselineRef.current = files` (참조)로 충분하다. "원본 복원" 모드가 여전히 동작하는지 E2E로 확인한다.
3. `ExportPanel` 미리보기 OSMD 인스턴스는 패널을 벗어나면 `previewRef.current.innerHTML=''`로 비워 메모리를 반환하라 (`useEffect` cleanup).
4. `tests/e2e/20-lazy-panels.spec.js` (`@perf`): 첫 로드 후 `document.querySelectorAll('.panel').length`가 3 이하 → 조옮김 클릭 → 4 이하 → 숫자 악보 실행 → "기존 가사 복원" 실행 → 첫 음 가사가 원본으로 돌아옴 (f06 사용).
5. `npm run check` 후 커밋 "패널 지연 마운트 및 baseline 복제 제거".
````

**완료 기준**
- [ ] 초기 마운트 패널 수 3 이하
- [ ] 스모크 통과

---

### P6-3 · 자동저장 변경 감지, 렌더 디바운스, Tone.js 지연 로드

**근거** PERF-04, PERF-05, PERF-06.

````text
[P6-3] 자동저장 변경 감지, 렌더 디바운스, Tone.js 지연 로드

1. 자동저장: `buildSession` 결과를 문자열화한 뒤 간단한 해시(FNV-1a 32bit, UTILITY에 구현)를 `lastSavedHashRef`와 비교해 같으면 저장을 건너뛰어라. 건너뛴 경우 `sessionStatus.savedAt`을 갱신하지 않는다.
2. ScoreView 렌더: `files`/`activeFile` 변경 시 150ms 디바운스 후 로드하라. 연속 변경 중에는 이전 비동기 로드가 `cancelled`로 버려지는 것을 유지한다. 줌 변경은 `render()`만 호출(P3-5).
3. Tone.js 지연 로드: `<head>`의 Tone 스크립트 태그를 제거하고, `MidiPlayer`의 재생 버튼 첫 클릭 시 `loadScript('https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js', integrity)`로 동적 삽입하라. 로드 중 버튼 라벨 "불러오는 중…", 실패 시 notify err + 버튼 비활성. `loadScript`는 UTILITY에 Promise 기반으로 구현하고 SRI 해시를 P2-1에서 계산한 값으로 넣는다.
4. `playwright.config.js`의 `launchOptions.args`(자동재생 정책)는 유지한다.
5. `tests/e2e/17-playback.spec.js`를 갱신해 재생 버튼 첫 클릭 후 `window.Tone`이 정의되는지 확인하도록 한다.
6. 첫 로드 시간을 측정하라. `page.goto` 후 `.app-root` 표시까지 시간을 3회 평균으로 전후 비교해 context-notes에 기록.
7. `npm run check` 후 커밋 세 개. "자동저장 변경 감지", "악보 렌더 디바운스", "Tone.js 지연 로드".
````

**완료 기준**
- [ ] 같은 상태에서 자동저장이 반복되지 않음 (IndexedDB `savedAt` 관찰)
- [ ] 첫 로드 시간 감소 수치 기록
- [ ] 재생 E2E 통과

---

## Phase 7. 테스트 확장 (4세션)

### P7-1 · 21패널 E2E 매트릭스

**근거** TEST-03. 패널 3개만 E2E가 있습니다.

````text
[P7-1] 21패널 E2E 매트릭스

1. `tests/e2e/panels/` 폴더를 만들고 패널당 파일 하나 `NN-<id>.spec.js`를 작성하라. 태그는 `@panels`. 공통 흐름은 helpers에 `runPanel(page, {side, id, before, action, expect})`로 추상화한다.
2. 각 패널의 최소 케이스는 다음 표를 따른다. 상태 확인은 `window.__mxlGetState()`의 xmlDoc을 `getDocQuery`로 조회한다.

| 패널 | 픽스처 | 조작 | 기대 |
|---|---|---|---|
| transpose | f04 | 특정 조 → D | key fifths 2, 첫 harmony root B |
| keychange | f01 | 마디 3부터 G | 마디 3 attributes key fifths 1, 마디 3 첫 음 G4 |
| capo | f04 | 마디 1 카포 2 | harmony 표기가 카포 기준으로 바뀜 |
| range | f01 | 칼림바 범위 | 모든 음이 C4~E6 |
| instrument | f01 | B♭ 클라리넷 | 첫 음 D4, `<transpose>` 삽입 |
| tempo | f01 | 120 → 90 | sound tempo 90, per-minute 90 |
| tempochange | f01 | 마디 2부터 60 | 마디 2에 sound tempo 60 |
| ossia | f01 | 1~2 | (기존 스모크 유지) |
| clef | f01 | 베이스 | clef sign F, 음이 옥타브 이동 |
| parts | f02 | Violin만 | part 1개, part-list 1개 |
| notation | f04 | 코드 숨기기 | harmony 0개 |
| export | f01 | 미리보기 → PNG | download 이벤트 `.png` |
| color | f01 | 실행 | 첫 note color 속성 존재 |
| harmony | f01 | 위로 3도 | 첫 마디 note 수 2배 |
| chordtools | f04 | Am→Cm 규칙 | 첫 harmony root C, kind minor |
| numbering | f01 | 계이름 | 첫 note lyric text "도" |
| lyricstyle | f06 | 크기 14 굵게 | lyric text font-size 14 |
| chords | f04 | 코드 기호 파악 | 로그에 "Am" |
| roman | f04 | 분석 | 표 첫 행 로마숫자 i |
| stats | f01 | 기본 통계 | 음표 수 8 |
| upload | f09 | .mxl | 렌더됨 (기존 fixtures 스펙 유지) |

3. 히스토리 E2E `tests/e2e/21-history.spec.js`: 조옮김 → Ctrl+Z → C4 → Ctrl+Y → D4 → 히스토리 항목 클릭 점프 → "모두 지우기".
4. 각 스펙은 30초 안에 끝나야 한다. 느리면 원인을 보고하라.
5. `playwright.config.js`에 `projects`를 `chromium`과 `mobile`(`devices['Pixel 5']`, `grep: /@ux/`)로 나눠라.
6. `npm run e2e` 전체 통과를 확인하고 커밋 "21패널 E2E 매트릭스와 히스토리 E2E 추가".
````

**완료 기준**
- [ ] `npx playwright test --grep @panels` 21개 이상 통과
- [ ] 전체 E2E 10분 이내

---

### P7-2 · 시각 회귀와 접근성 자동 검사

**근거** TEST 갭, `README-TESTING.md`가 예고한 Phase 8.5.

````text
[P7-2] 시각 회귀와 접근성 자동 검사

1. `tests/e2e/visual/score.spec.js` (`@visual`): f01, f04, f09를 각각 렌더한 뒤 `.score-main-render`를 `toHaveScreenshot({maxDiffPixelRatio:0.01, animations:'disabled'})`. 폰트 로딩을 기다리기 위해 `document.fonts.ready`를 await.
2. 스냅샷은 Linux CI가 정본이다. `playwright.config.js`에 `snapshotPathTemplate: '{testDir}/__snapshots__/{projectName}/{testFilePath}/{arg}{ext}'`를 두고, `README-TESTING.md`의 "스냅샷 정책"대로 로컬 Windows에서는 `--update-snapshots`를 쓰지 않는다고 적어라. 첫 스냅샷은 CI에서 `workflow_dispatch` `update_snapshots=true`로 생성하도록 nightly를 수정한다 (P7-3에서 CI 정합성과 함께).
3. `@axe-core/playwright`를 devDependency로 추가하라 (버전 고정). `tests/e2e/a11y/axe.spec.js` (`@a11y`): 빈 앱, 파일 로드 후, 공유 모달 열림, 세션 모달 열림 4장면에서 `new AxeBuilder({page}).analyze()` → `violations` 중 impact가 serious/critical인 것이 0. 처음 실행에서 나온 위반 목록을 전부 보고하고, 이 세션 안에서 고칠 수 있는 것(라벨 누락·대비)은 고친다.
4. 커밋 "시각 회귀 스냅샷과 axe 접근성 검사 추가".
````

**완료 기준**
- [ ] axe serious/critical 0
- [ ] 시각 스냅샷 3장 (CI 생성)

---

### P7-3 · CI 정합성

**근거** OPS-02. post-deploy가 없는 워크플로를 참조하고, nightly prod URL이 다른 저장소입니다.

````text
[P7-3] CI 정합성

1. 사용자에게 다음을 물어라. "이 폴더를 어느 GitHub 저장소로 푸시할 예정인가요? GitHub Pages 주소는 무엇인가요?" 답을 받기 전에는 URL을 바꾸지 마라.
2. `.github/workflows/deploy.yml`을 추가하라. `actions/upload-pages-artifact` + `actions/deploy-pages`, 트리거 main push. 업로드 대상은 루트 전체이되 `tests/`, `node_modules/`, `*.md` 문서 폴더, `_archive/`는 제외 (`rsync`로 `_site/` 구성).
3. `post-deploy.yml`의 `workflows:` 이름을 새 deploy.yml의 `name`과 일치시켜라.
4. `nightly.yml`과 `post-deploy.yml`의 `PROD_BASE_URL`을 사용자 답변으로 바꿔라. `update_snapshots` 입력이 true면 `npx playwright test --grep @visual --update-snapshots` 후 스냅샷을 artifact로 올리도록 단계 추가.
5. `ci.yml`에 `npm run e2e:smoke` 뒤 `npx playwright test --grep "@panels|@a11y"` 단계를 추가하되 `continue-on-error: false`.
6. 로컬에서 `act`가 없으면 워크플로 YAML을 `npx yaml-lint`류로 검증만 하고, 실제 실행 결과는 푸시 후 사용자가 확인하도록 안내하라. 푸시는 사용자가 한다.
7. 커밋 "GitHub Pages 배포 워크플로 추가 및 CI URL 정합성 수정".
````

**완료 기준**
- [ ] 4개 워크플로 YAML 문법 검증 통과
- [ ] 사용자 확인한 URL만 사용

---

## Phase 8. 문서 동기화 (2세션)

### P8-1 · 매뉴얼·퀵스타트·업데이트 문서의 존재하지 않는 기능 정리

**근거** DOC-01. 매뉴얼이 "주석 메모 패널", "청음 훈련", "난이도", "운지", "JSON 가져오기", "QR 코드"를 설명합니다. 이 중 JSON 가져오기는 P3-4에서 구현됩니다.

````text
[P8-1] 매뉴얼·퀵스타트·업데이트 문서 동기화

1. `manual/MXL-Studio-User-Manual-ko.html`, `manual/MXL-Studio-Quick-Start-ko.html`, `MXL-Studio-업데이트-문서/MXL-Studio-최근업데이트-안내.md`에서 다음 단어를 grep 해 문맥을 표로 보고하라. "주석", "청음", "난이도", "운지", "QR", "JSON 가져오기", "세션 목록".
2. 사용자에게 물어라. "존재하지 않는 기능 설명을 (a) 삭제 (b) '예정 기능' 절로 이동 중 어떻게 할까요?" 기본 권장은 (b).
3. 답에 따라 문서를 수정하고, Phase 1~6에서 새로 생긴 기능(파일 탭, 우측 토글, 세션 모달, 줌, 인쇄 PDF, 토스트, 모바일 드로어, 재생 커서, 코드 심볼 이조)을 해당 절에 추가하라. 스크린샷은 `manual/assets/`에 Playwright로 새로 찍어 교체한다 (`page.screenshot`, 1280×800, 데스크톱 라이트).
4. `MXL-Studio-사용자설명서/`, `MXL-Studio-퀵스타트-사용자설명서/` 폴더의 PDF·SVG는 HTML에서 재생성해야 한다. 재생성 도구가 없으면 "HTML이 정본, PDF는 재생성 필요"를 README에 적고 사용자에게 알려라.
5. `MXL-Studio-업데이트-문서/`에 새 파일 `MXL-Studio-2026-09-업데이트-안내.md`를 만들어 이번 개선 시리즈를 사용자 관점으로 정리하라 (기존 문서 형식 따르기).
6. 커밋 "문서를 실제 기능과 동기화".
````

**완료 기준**
- [ ] 매뉴얼에 없는 기능 언급 0 또는 "예정 기능" 절로 격리
- [ ] 스크린샷 10장 갱신

---

### P8-2 · 프롬프트 문서 스냅샷 표기와 README 정리

**근거** DOC-02, DOC-03.

````text
[P8-2] 프롬프트 문서 스냅샷 표기와 README 정리

1. `MXL-Studio-기능확장-자동테스트-바이브코딩-프롬프트.md` 맨 위에 경고 블록을 추가하라. "이 문서는 다른 스냅샷(패널 30개·코어 14개) 기준입니다. mxl-studio09에는 다음 파일이 없습니다: (목록). 이 폴더에서는 `MXL-Studio09-개선보완-바이브코딩-프롬프트.md`를 먼저 완료한 뒤, 이 문서의 Phase 2~7을 Phase 9 지침에 따라 재조정해 사용하세요."
2. `MXL Studio—기능 추가 바이브코딩 프롬프트집.md` 맨 위에 "PROMPT-01/02/03/10은 구현 완료"를 표로 표시하라.
3. `README.md`를 갱신하라. 폴더 구조, 코어 목록(이제 8개), 테스트 태그 목록(@smoke @fixtures @panels @ux @a11y @robustness @perf @visual), 문서 3종 관계.
4. `README-TESTING.md`의 "현재 자동 검증 범위" 절을 실제 파일 목록으로 갱신하라.
5. `checklist.md`를 최신화하고 `context-notes.md`에 Phase 8 완료 기록.
6. 커밋 "프롬프트 문서 스냅샷 경고 및 README 갱신".
````

---

## Phase 9. (선택) 매뉴얼이 약속한 기능 구현

이 Phase는 기존 두 프롬프트 문서의 기능 확장을 **이 스냅샷에 맞게 재조정**하는 지침입니다. Phase 1~8이 끝난 뒤에만 시작합니다.

### P9-1 · 재조정 규칙

````text
[P9-1] 기존 확장 프롬프트 재조정 규칙

기존 문서의 기능 프롬프트(주석 메모 레이어, 난이도 평가, 청음 훈련, 운지법, 성부 진행, 패턴 검색, 형식 분석, 가사 편집, ABC/LilyPond 내보내기, 사운드폰트, WAV/MIDI 내보내기, Web MIDI, AI 어시스턴트, PWA)를 하나 고를 때마다 다음을 먼저 수행한다.

1. 그 프롬프트가 참조하는 파일·함수가 이 폴더에 있는지 `ls`와 grep으로 확인하고 없는 것을 표로 보고한다.
2. 없는 코어는 "새로 만든다"로, 없는 패널 props는 이 문서 2.1 A-3의 시그니처로 바꾼다.
3. 새 패널은 `NAV`, `LEFT_ACTIVITY_ITEMS` 또는 `RIGHT_ACTIVITY_ITEMS`, `PANEL_LABELS`, `ALL_PANELS`(지연 마운트 맵), `MenuBar.groups` 다섯 곳에 등록한다. 등록 누락을 막기 위해 `tests/unit/panel-registry.test.js`를 만들어 HTML을 정규식으로 읽어 다섯 곳의 id 집합이 같은지 검사한다 (P9-1 첫 세션에 이 테스트부터 만든다).
4. 새 기능마다 P7-1 매트릭스에 행을 추가하고 E2E 1개, 유닛 테스트 1파일을 같은 커밋에 넣는다.
5. `alert`·`prompt`·`files[0]`·`{...file, xmlDoc:doc}`·`<div onClick>`이 새 코드에 없는지 종료 전 grep으로 확인한다.
````

### P9-2 · 우선 구현 순서 (매뉴얼이 이미 설명하는 것부터)

| 순서 | 기능 | 기존 문서 | 이 스냅샷에서의 추가 조건 |
|---|---|---|---|
| 1 | 주석 메모 레이어 | 프롬프트집 PROMPT-11 | 주석을 `ossiaMeta`처럼 파일 객체 확장 필드로 두고 P1-4의 세션·공유 직렬화에 포함. OSMD SVG 위 오버레이는 `.score-container` 안에 절대 위치 |
| 2 | 난이도 평가 | 프롬프트집 PROMPT-14 | `StatsPanel`의 계산을 `stats-core.js`로 먼저 분리한 뒤 재사용 |
| 3 | 청음 훈련 | 프롬프트집 PROMPT-07 | P6-3의 Tone.js 지연 로드 헬퍼 재사용 |
| 4 | 공유 QR 코드 | 기능확장 1.2 | `qrcode` CDN 동적 로드, 링크가 `warn` 이상이면 QR 생략 |
| 5 | 운지법 표시 | 프롬프트집 PROMPT-04 | `INSTRUMENT_RANGES` 상수와 연결 |

### P9-3 · 그 이후

기능확장 문서의 Phase 2(사운드폰트·오디오 내보내기), 3(Web MIDI), 4(AI), 5(피치 검출), 6(PWA), 7(Supabase)은 P9-1 규칙을 적용해 순서대로 진행합니다. AI·Supabase는 비용과 키 관리가 따르므로 시작 전에 사용자 확인이 필요합니다.

---

## 4. 실행 로드맵과 체크리스트

### 4.1 권장 순서와 의존성

| 순서 | 프롬프트 | 세션 | 선행 조건 | 산출물 |
|---|---|---|---|---|
| 1 | P0-1 git·위생 | 1 | 없음 | 저장소, README |
| 2 | P0-2 테스트 러너 | 0.5 | P0-1 | `npm test` 통과 |
| 3 | P0-3 체크리스트·노트 | 0.5 | P0-2 | checklist.md, context-notes.md |
| 4 | P0-4 픽스처 | 1 | P0-2 | 픽스처 9개 |
| 5 | P1-1 xmlString 동기화 | 1 | P0-4 | commitFile, 공유 버그 수정 |
| 6 | P1-2 코드심볼 이조 | 1 | P1-1 | transpose-core.js |
| 7 | P1-3 activeFile 일원화 | 1 | P1-1 | 파일 제거 수정 |
| 8 | P1-4 Ossia 영속·MXL | 1 | P1-1 | 진짜 .mxl |
| 9 | P2-1 ErrorBoundary·스플래시 | 1 | P1-x | createRoot, SRI |
| 10 | P2-2 ScoreView·죽은 코드 | 0.5 | P2-1 | 150줄 감소 |
| 11 | P2-3 업로드 견고화 | 0.5 | P2-1 | 제한·중복 처리 |
| 12 | P3-1 토스트 | 1 | P2-1 | alert 0 |
| 13 | P3-2 파일 탭 | 1 | P1-3, P3-1 | 활성 파일 전환 |
| 14 | P3-3 우측 토글·폭 | 1 | P3-1 | 레이아웃 |
| 15 | P3-4 세션 모달 | 1 | P3-1 | 목록·JSON, useModalA11y |
| 16 | P3-5 줌·인쇄 PDF | 1 | P3-1 | document.write 0 |
| 17 | P4-1 버튼 전환 | 1 | P3-x | aria-pressed |
| 18 | P4-2 포커스·메뉴·모션 | 1 | P4-1 | 키보드 메뉴 |
| 19 | P4-3 모바일 드로어 | 1 | P3-4, P4-2 | 390px 완주 |
| 20 | P5-1 온음계 조옮김 | 1 | P1-2 | 이명동음 |
| 21 | P5-2 playback-core | 1 | P0-4 | tie·반복·템포 |
| 22 | P5-3 OSMD 커서 | 1 | P5-2 | 재생 커서 |
| 23 | P5-4 로마숫자 단조 | 1 | P0-4 | i-iv-V7-i |
| 24 | P5-5 코드심볼 코어·Ossia 번호 | 1 | P1-2 | chord-symbol-core.js |
| 25 | P6-1 히스토리 경량화 | 1 | P1-4 | 문자열 스냅샷 |
| 26 | P6-2 지연 마운트 | 1 | P6-1 | 초기 패널 3 이하 |
| 27 | P6-3 자동저장·렌더·Tone | 1 | P3-5 | 로드 시간 기록 |
| 28 | P7-1 21패널 E2E | 2 | P5-x | @panels 21+ |
| 29 | P7-2 시각·axe | 1 | P7-1 | @visual @a11y |
| 30 | P7-3 CI 정합성 | 1 | P7-2 | deploy.yml |
| 31 | P8-1 문서 동기화 | 1 | P7-x | 매뉴얼 갱신 |
| 32 | P8-2 README·경고 | 0.5 | P8-1 | 스냅샷 경고 |
| | **합계** | **약 31세션** | | |

급하다면 1→5→6→7→9→12→13→15 (약 8세션)만으로도 "조용한 데이터 오류"와 "앱 전체 다운"은 사라집니다.

### 4.2 알려진 함정

1. **줄 번호 신뢰 금지.** P1-1에서 `commitFile`을 도입하는 순간 이후 줄 번호가 전부 밀립니다. 프롬프트마다 grep을 먼저 하도록 되어 있습니다.
2. **`createRoot` 전환 후 자동 배칭.** `setFiles` 직후 `pushHistory`가 같은 틱에 묶입니다. `pushHistory`는 `history` state를 클로저로 읽으므로 두 번 연속 호출 시 두 번째가 첫 번째를 덮을 수 있습니다. P2-1에서 스모크가 실패하면 `pushHistory`를 함수형 업데이트(`setHistory(prev=>...)`)로 바꾸는 것이 해법입니다.
3. **Babel Standalone은 class 필드 문법을 지원하지만** `static getDerivedStateFromError`는 정적 메서드로 쓰는 편이 안전합니다.
4. **OSMD 커서 API는 1.8.x에서 `cursor.cursorElement`가 `img`입니다.** 1.9 이상으로 올리면 DOM이 바뀔 수 있으므로 P5-3 완료 전에는 버전을 올리지 않습니다. 버전 업그레이드는 P7-2 시각 회귀가 있는 상태에서만 합니다.
5. **SRI 해시는 CDN 파일이 바뀌면 깨집니다.** cdnjs·jsdelivr는 버전 고정 URL이 불변이므로 안전하지만, 해시를 손으로 옮겨 적다 오타가 나면 앱이 통째로 죽습니다. P2-1은 계산 명령과 결과를 보고하게 되어 있습니다.
6. **Playwright download 테스트**는 `acceptDownloads`가 기본 true이지만 `page.waitForEvent('download')`를 클릭 **전에** 걸어야 합니다.
7. **jsdom에는 `CompressionStream`이 없을 수 있습니다.** 기존 share 테스트가 통과하는 것으로 보아 Node 18+ 전역이 노출되고 있지만, Node 버전을 바꾸면 깨질 수 있습니다. CI는 Node 20 고정입니다.
8. **`window.__mxlGetState`·`__mxlSetActiveFile`·`__mxlThrowInPanel`은 테스트 훅입니다.** 프로덕션에서 제거하지 않되, 문서에 "테스트 전용"임을 적어 둡니다.
9. **모바일 드로어와 데스크톱 패널은 같은 컴포넌트 인스턴스여야** 패널 내부 상태가 유지됩니다. P4-3에서 조건부로 두 벌 렌더하지 않도록 주의합니다.
10. **`--pool=threads`에서 `vi.resetModules()`와 `window` 전역 재할당**(session-store 테스트)이 forks와 다르게 동작할 수 있습니다. P0-2에서 통과를 확인했지만, 새 코어 테스트가 전역을 건드리면 `beforeEach`에서 `delete window.XxxCore`를 반드시 합니다.

### 4.3 최종 체크리스트

- [ ] 2.1 공통 계약을 매 세션 붙여넣었다 (또는 CLAUDE.md에 병합했다)
- [ ] `git log`가 프롬프트 단위 시맨틱 커밋으로 이루어져 있다
- [ ] `grep -c "alert(" mxl-studio.html` = 0
- [ ] `grep -c "xmlDoc:doc" mxl-studio.html` = 0
- [ ] `grep -c "files\[0\]\.xmlDoc" mxl-studio.html` = 0 (폴백 형태 제외)
- [ ] `grep -c "document.write" mxl-studio.html` = 0
- [ ] `grep -c "console\." mxl-studio.html` = 0
- [ ] `grep -c "window.prompt" mxl-studio.html` = 0
- [ ] 코어 8개 (`chord-tools`, `history`, `roman-analysis`, `session-store`, `share-session`, `transpose`, `playback`, `chord-symbol`) 모두 유닛 테스트 보유
- [ ] `npm run e2e` 전체 통과, `@panels` 21개 이상
- [ ] axe serious/critical 0
- [ ] 매뉴얼에 없는 기능 언급 0
- [ ] `checklist.md` 전 항목 체크, `context-notes.md`에 각 Phase 결정 기록
