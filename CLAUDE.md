# MXL Studio 프로젝트 계약

이 저장소는 악보 디자이너(MXL Studio) 단일 HTML 앱입니다. 작업자는 아래 원칙을 기본값으로 둡니다.

1. 아키텍처 보존
   - React 18 UMD + Babel Standalone 구조를 유지합니다.
   - Vite/Webpack 등 빌드 시스템으로 임의 마이그레이션하지 않습니다.
   - 새 순수 로직은 `*-core.js` 파일로 분리하고 `(function(global){ ... })(window);` 패턴을 따릅니다.
   - 화면 로직은 `mxl-studio.html`의 기존 React 패널 패턴과 props 흐름을 따릅니다.
   - Studio09 기준 설계 문서의 Phase 0~8을 순서대로 수행하고 단계별 검증을 checklist.md와 context-notes.md에 기록합니다.
   - 스타일은 `styles.css`에만 추가합니다.

2. 데이터 규칙
   - 파일 객체는 `{name, xmlDoc(Document), xmlString, sourceName}` 형태를 유지합니다.
   - xmlDoc을 바꾸면 xmlString도 함께 갱신합니다. `commitFile(file, doc, extra)` 헬퍼를 사용합니다.
   - 현재 악보 정보는 `files[activeFile]` 기준이며 마디 범위는 number 속성을 우선합니다.
   - 새 `alert()`·`prompt()`·`confirm()`은 사용하지 않고 notify와 모달을 사용합니다.
   - 악보 변경은 `xmlDoc` 복제 후 수정하고 `onFilesUpdate(newFiles, '한글 작업 라벨')`로 커밋합니다.
   - 외부 라이브러리는 버전 고정 CDN 또는 npm devDependency로만 추가하고, 실패 시 폴백 경로를 둡니다.

3. 테스트 우선
   - 새 코어 파일은 같은 변경 묶음에 `tests/unit/*.test.js`를 추가합니다.
   - 사용자 흐름은 Playwright 테스트를 추가합니다.
   - 기존 수동 `*-core.test.html`은 보존합니다.

4. 현재 사용자 승인 범위
   - 이번 작업은 사용자가 “묻지 말고 스스로 승인하며 진행”을 명시했으므로, 위험하지 않은 구현 판단은 작업자가 자체 승인합니다.
   - 파괴적 삭제, 비밀 키 처리, 외부 서비스 비용 발생처럼 되돌리기 어려운 작업만 별도 확인 대상입니다.
