> **Studio09 구현 상태 (2026-09-03)**
> 아래 원문은 초기 설계 기록입니다. 현재 구현은 Studio09 개선보완 문서와 README를 우선합니다.

| 프롬프트 | 상태 | 현재 구현 |
|---|---|---|
| PROMPT-01 MIDI 오디오 재생 | 완료 | PlaybackCore + Tone.js 지연 로드, 반복·템포·붙임줄·커서 |
| PROMPT-02 로마 숫자 화성 분석 패널 | 완료 | RomanAnalysis, 단조·전위·부속화음 |
| PROMPT-03 전체 Undo/Redo 히스토리 | 완료 | HistoryCore, 문자열 스냅샷과 최대 50개 기록 |
| PROMPT-10 URL 기반 악보 공유 + 세션 자동 저장 | 완료 | ShareSessionCore·SessionStoreCore, 압축 URL·세션 모달·자동저장 |

# MXL Studio — 기능 추가 바이브코딩 프롬프트집

> **공통 컨텍스트 (모든 프롬프트 앞에 붙여 쓸 것)**
>
> 이 프로젝트는 `mxl-studio.html` 하나의 파일로 구성된 React 18.2 (CDN UMD) 앱이다.  
> Babel standalone으로 클라이언트 측 트랜스파일, OpenSheetMusicDisplay 1.8.9 (OSMD), JSZip 3.10.1 사용.  
> 스타일은 `styles.css`에만 작성하고 컴포넌트에 인라인 스타일 없음.  
> 동적 값은 CSS Custom Properties(`--변수`)로만 전달.  
> 기존 패턴: Panel 컴포넌트 → `onFilesUpdate(updatedFiles)` 콜백으로 파일 상태 갱신.  
> `showProgress(msg)` / `hideProgress()` / `addLog(msg,type)` 함수 사용.  
> MusicXML은 xmlDoc (DOM) 형태로 각 파일 객체에 저장됨.

---

## PROMPT-01 · MIDI 오디오 재생 엔진

```
현재 transport bar에 재생 버튼이 있지만 실제 소리가 나지 않는다.
Tone.js CDN을 추가하고 완전한 소프트웨어 신디사이저 재생을 구현하라.

[추가할 CDN — <head> 안에 삽입]
<script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.js"></script>

[구현할 React 컴포넌트: MidiPlayer]
현재 선택된 파일의 xmlDoc에서 다음 순서로 재생 데이터를 추출한다:
  1. 모든 <note> 요소를 파트·마디·박자 순서대로 순회한다.
  2. <step>, <octave>, <alter>로 MIDI 노트 번호 계산 (C4=60 기준).
     MIDI = (octave + 1) * 12 + STEP_TO_SEMI[step] + (alter || 0)
  3. <duration>과 <divisions>로 박자 길이(초) 계산:
     durationSec = (duration / divisions) * (60 / currentBpm) * beatUnit / 4
     여기서 beatUnit은 <beat-type> 값이다.
  4. <rest> 자식이 있는 note는 건너뛴다.
  5. <chord> 자식이 있는 note는 이전 note와 동일한 startTime을 가진다.
  6. 결과: [{midiNote, startSec, durationSec, velocity:80}] 배열 생성.

[Tone.js 재생 로직]
  - Tone.PolySynth(Tone.Synth)를 사용한다 (최대 16 음 동시 발음).
  - synth 옵션: oscillator.type='triangle', envelope.attack=0.01, decay=0.1,
    sustain=0.7, release=0.3 (피아노 느낌 근사).
  - Tone.Transport.bpm.value = currentBpm
  - 각 이벤트를 Tone.Transport.schedule(time => synth.triggerAttackRelease(...), startSec)로 예약.
  - 재생: Tone.Transport.start()
  - 정지: Tone.Transport.stop() → Tone.Transport.cancel()
  - 일시정지: Tone.Transport.pause()
  - 현재 재생 위치(초)를 Tone.Transport.seconds로 읽어 progress bar에 표시.

[UI — 기존 transport bar 확장]
  재생 ▶ / 일시정지 ⏸ / 정지 ⏹ 버튼 (기존 버튼에 onClick 연결).
  진행 슬라이더: 드래그하면 Tone.Transport.seconds = newSec 으로 이동.
  악기 선택 드롭다운:
    - Piano (PolySynth/Synth triangle)
    - Strings (PolySynth/Synth sawtooth + lowpass filter cutoff 800Hz)
    - Flute (PolySynth/Synth sine + vibrato 5Hz depth 0.3)
  볼륨 슬라이더 (Tone.Master.volume.value = dB).
  현재 마디 번호 표시 (재생 시간 / 평균 마디 길이로 계산).

[파트 선택]
  파일에 여러 파트가 있을 경우 체크박스로 각 파트 on/off.
  꺼진 파트의 note는 schedule에서 제외.

[반복 구간 (A-B Loop)]
  슬라이더 두 개(loopStart, loopEnd 단위: 마디)로 범위 지정.
  Tone.Transport.loopStart = startSec
  Tone.Transport.loopEnd = endSec
  Tone.Transport.loop = true/false 토글 버튼.

[스타일 — styles.css에만 추가]
  .midi-player { ... } 클래스로 transport bar 디자인 통일.
  재생 중 현재 마디 번호가 악보 위에 파란 하이라이트 오버레이로 표시.
```

---

## PROMPT-02 · 로마 숫자 화성 분석 패널

```
NAV 배열의 '분석' 섹션에 {id:'roman', icon:'Ⅰ', label:'로마 숫자 분석'} 항목을 추가하고
RomanAnalysisPanel 컴포넌트를 구현하라.

[핵심 로직: detectRomanNumeral(xmlDoc)]

Step 1 — 조성 파악
  파일의 첫 <key> 요소에서 <fifths> 값을 읽는다.
  KEY_FIFTHS 배열에서 fifths 값의 index를 찾아 tonicSemi(0~11)를 구한다.
  예: fifths=1 → G장조 → tonicSemi=7

Step 2 — 마디별 수직 음정 수집
  각 <measure>에서 <rest> 없는 모든 <note>의 MIDI 피치를 모은다.
  <chord> note는 같은 beat에 묶는다.
  beat별로 동시 울리는 pitch class 집합(Set)을 만든다 (pitchClass = midi % 12).

Step 3 — 코드 식별
  pitchClass Set에서 루트를 찾는다 (3음·5음·7음 스택 가능한 조합 탐색):
    가능한 루트 후보 0~11 각각에 대해 interval set을 계산:
      intervals = pitchClasses.map(p => (p - root + 12) % 12).sort()
    Major triad: [0,4,7] → 'M'
    Minor triad: [0,3,7] → 'm'
    Diminished:  [0,3,6] → 'dim'
    Augmented:   [0,4,8] → 'aug'
    Dom7:        [0,4,7,10] → '7'
    Maj7:        [0,4,7,11] → 'M7'
    Min7:        [0,3,7,10] → 'm7'
    Half-dim:    [0,3,6,10] → 'ø7'
    일치하는 것이 없으면 pitchClasses가 가장 많이 포함된 루트를 선택.

Step 4 — 기능 라벨 부여
  tonicSemi 기준 diatonicDegree = (rootSemi - tonicSemi + 12) % 12
  DIATONIC_SCALES[tonicSemi] 배열에서 diatonicDegree의 index(0~6)를 찾아 degree(1~7)를 구한다.
  로마 숫자 매핑:
    1→Ⅰ, 2→Ⅱ, 3→Ⅲ, 4→Ⅳ, 5→Ⅴ, 6→Ⅵ, 7→Ⅶ
  대문자(M/M7): 장화음, 소문자(m/m7/ø7): 단화음, 감화음은 °, 증화음은 +
  예시 출력: Ⅱm7, Ⅴ7, Ⅰ, Ⅳ, Ⅶ°

Step 5 — 종지 감지
  연속된 두 마디의 로마 숫자 쌍을 검사:
    Ⅴ(7) → Ⅰ : '완전종지 (PAC)'
    Ⅳ → Ⅰ   : '변격종지 (PC)'
    ? → Ⅴ    : '반종지 (HC)'
    Ⅴ → Ⅵ   : '위종지 (DC)'
  감지된 종지는 별도 목록으로 표시.

[UI 구성]
  상단: 조성 표시 버튼 ("G장조 분석 시작")
  결과 테이블:
    마디번호 | 박자 | 코드명 | 로마숫자 | 종지여부
  코드 진행 요약: 가장 많이 나온 2-chord 진행 Top 5
  종지 요약 카드: 완전종지 N회, 반종지 N회 등
  '악보에 삽입' 버튼: 분석된 로마 숫자를 <direction><direction-type><words>로
    각 마디 첫 박자 위에 텍스트로 삽입한 뒤 onFilesUpdate 호출.
```

---

## PROMPT-03 · 전체 Undo/Redo 히스토리

```
현재 파트 추출(parts)에만 undo가 있다. 모든 변환 작업에 대한 전역 히스토리를 구현하라.

[상태 구조 — App 컴포넌트 최상위에 추가]
const [history, setHistory] = useState([]);  // {files, label, timestamp}[]
const [historyIndex, setHistoryIndex] = useState(-1);

[헬퍼 함수]
function pushHistory(files, label) {
  // historyIndex 이후 항목 제거 후 새 스냅샷 추가
  const snapshot = files.map(f => ({
    ...f,
    xmlDoc: f.xmlDoc.cloneNode(true)  // 깊은 복사
  }));
  setHistory(prev => {
    const truncated = prev.slice(0, historyIndex + 1);
    return [...truncated, {files: snapshot, label, timestamp: Date.now()}];
  });
  setHistoryIndex(prev => prev + 1);
}

function undo() {
  if (historyIndex <= 0) return;
  const newIdx = historyIndex - 1;
  setHistoryIndex(newIdx);
  const restored = history[newIdx].files.map(f => ({
    ...f, xmlDoc: f.xmlDoc.cloneNode(true)
  }));
  setFiles(restored);
  addLog(`↩ 실행 취소: ${history[newIdx + 1].label}`, 'info');
}

function redo() {
  if (historyIndex >= history.length - 1) return;
  const newIdx = historyIndex + 1;
  setHistoryIndex(newIdx);
  const restored = history[newIdx].files.map(f => ({
    ...f, xmlDoc: f.xmlDoc.cloneNode(true)
  }));
  setFiles(restored);
  addLog(`↪ 다시 실행: ${history[newIdx].label}`, 'info');
}

[기존 onFilesUpdate 콜백 교체]
모든 Panel의 onFilesUpdate(updatedFiles, label='변환') 호출을 intercept하여
pushHistory(updatedFiles, label)을 같이 호출한다.
각 Panel에서 onFilesUpdate 호출 시 두 번째 인수로 작업명을 넘긴다:
  예: onFilesUpdate(result, '조옮김 +2반음')
      onFilesUpdate(result, '카포 3프렛 적용')
      onFilesUpdate(result, '색상 악보 생성')

[키보드 단축키]
useEffect(() => {
  const handler = e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key==='z' && e.shiftKey))) { e.preventDefault(); redo(); }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [historyIndex, history]);

[히스토리 패널 UI — 사이드바 하단 고정]
스택 목록 (최대 50개):
  각 항목: 번호, 라벨, 시간(HH:MM:SS), 현재 위치 표시(● 마커)
  클릭하면 해당 히스토리로 직접 점프.
헤더 오른쪽: ↩ Undo / ↪ Redo 버튼 (비활성 시 흐리게).
'모두 지우기' 버튼: history 초기화.
localStorage에 자동 저장 (stringify는 xmlDoc 제외, label/timestamp만).
```

---

## PROMPT-04 · 악기별 운지법 표시 패널

```
NAV에 {id:'fingering', icon:'🖐', label:'운지법 표시'} 추가.
FingeringPanel 컴포넌트를 구현하라.

[지원 악기별 운지 데이터 상수 정의]

const RECORDER_FINGERING = {
  // 소프라노 리코더 (C5~D7)
  // 각 키: 'C5', 'D5' 등 / 값: [thumb, L1, L2, L3, R1, R2, R3, R4] (1=막음, 0=열음, 0.5=반막음)
  'C5':[1,1,1,1,1,1,1,1],  // 전부 막음
  'D5':[1,1,1,1,1,1,1,0],
  'E5':[1,1,1,1,1,1,0,0],
  'F5':[1,1,1,1,1,0,1,0],
  'G5':[1,1,1,1,0,0,0,0],
  'A5':[1,1,1,0,0,0,0,0],
  'B5':[1,1,0,0,0,0,0,0],
  'C6':[1,0,1,1,0,0,0,0],
  'D6':[0,0,1,1,0,0,0,0],  // 오버블로우
  'E6':[1,1,1,1,1,1,0,1],
  'F6':[1,1,1,1,1,0,0,1],
  'G6':[1,1,1,0,1,1,0,0],  // 고음
  // ... (실제 리코더 운지표 전체 정의)
};

const KALIMBA_FINGERING = {
  // 17키 칼림바 (C4~E6) — 키 번호 1~17 (중앙부터 좌우 교대)
  // 값: 키 번호 (1=가장 긴 중앙 tine C5)
  'C4':16,'D4':14,'E4':12,'F4':10,'G4':8,'A4':6,'B4':4,
  'C5':1,'D5':2,'E5':3,'F5':5,'G5':7,'A5':9,'B5':11,
  'C6':13,'D6':15,'E6':17
};

[SVG 운지 다이어그램 렌더링]

리코더 다이어그램:
  세로로 8개 원 (구멍) 나열.
  막힌 구멍: 검은 원 fill='#222'
  반막: 반원 (clip-path 이용)
  열린 구멍: 흰 원 stroke='#222'
  크기: width=40, height=160, 구멍 r=8, 간격=18

칼림바 다이어그램:
  17개 세로 직사각형 tine (중앙이 가장 길고 바깥으로 갈수록 짧아짐)
  현재 음의 tine를 highlight color로 채움.

[악보에 운지법 텍스트 삽입 기능]
버튼 '악보에 운지 번호 삽입':
  각 <note>의 <step><octave>에 해당하는 운지 정보를 읽는다.
  리코더: 구멍 패턴을 압축 문자열로 변환 (예: "●●●●●●○○")
  칼림바: 키 번호를 가사처럼 삽입
  MusicXML <technical><fingering> 또는 <lyric><text>로 삽입.

[UI]
  악기 선택: 소프라노 리코더 / 알토 리코더 / 칼림바 17키 / 오카리나
  파트 선택 드롭다운
  '미리보기' 섹션: 현재 파일의 음표 목록과 각 음표 옆에 소형 SVG 운지 다이어그램
  스크롤 가능한 음표-운지 매핑 테이블
  '삽입' 버튼 → onFilesUpdate(result, '운지법 삽입')
```

---

## PROMPT-05 · 성부 진행 분석 (Voice Leading Checker)

```
NAV 분석 섹션에 {id:'voiceleading', icon:'🔍', label:'성부 진행 분석'} 추가.
VoiceLeadingPanel 컴포넌트를 구현하라.

[분석할 규칙 — 각각 독립 함수로 구현]

1. checkParallelFifths(notes1, notes2)
   연속된 두 박자에서 두 성부 간 음정이 연속으로 완전5도(7반음)인 경우 감지.
   각 박자: [{midi, partIdx, beat}]
   모든 성부 쌍 조합을 검사.
   결과: {type:'평행5도', measure, beat, parts:[부명1, 부명2], interval:7}

2. checkParallelOctaves(notes1, notes2)
   위와 동일하지만 간격이 12(옥타브)인 경우.

3. checkHiddenFifths(notes1, notes2)
   바깥 성부(소프라노-베이스) 한정:
   두 성부가 같은 방향으로 움직여 완전5도·옥타브에 도달하고,
   소프라노 성부가 도약(3반음 이상)으로 진행하는 경우.

4. checkVoiceCrossing(notes1, notes2)
   상위 성부의 음이 하위 성부의 음보다 낮아지는 경우.
   예: 알토 < 테너

5. checkLargeLeap(note1, note2, partName)
   같은 성부 내 연속 음 간 도약이 옥타브 초과(13반음 이상)인 경우.
   성악 적합성 기준.

6. checkConsecutiveLeaps(noteSeq)
   같은 방향으로 3회 이상 도약(3반음 이상)이 연속되는 경우.

[분석 실행 흐름]
  xmlDoc에서 파트별 note 배열을 마디·박자 순으로 추출.
  마디 단위로 슬라이딩 윈도우(현재 마디, 다음 마디)로 위 6가지 검사 적용.
  결과: violations[] 배열 (각 항목에 type, severity, measure, beat, description 포함).

[결과 UI]
  severity별 색상:
    'error'   → 빨강 (평행5도, 평행옥타브, 성부교차)
    'warning' → 주황 (숨은5도, 큰 도약)
    'info'    → 파랑 (연속 도약)
  위반 목록 테이블: 마디 | 박자 | 규칙 | 설명 | 심각도
  클릭 시 해당 마디로 악보 스크롤 이동.
  요약 카드: 총 위반 N건 (오류 N, 경고 N)
  '수정 제안' 버튼: 각 위반에 대해 권장 수정 방법을 텍스트로 표시.
    예: "마디 12, 3박: 소프라노 E5→D5로 수정하면 평행5도 해소"
  점수: 100 - (error*10 + warning*3 + info*1) 형태의 성부 진행 점수.
```

---

## PROMPT-06 · SVG / LilyPond / ABC 다중 형식 내보내기

```
기존 내보내기 패널(ExportPanel)에 다음 세 가지 형식을 추가하라.

━━━━━━━━━━━━━━━━━━━
A. SVG 내보내기
━━━━━━━━━━━━━━━━━━━
현재 OSMD는 SVG로 렌더링한다. SVG를 그대로 추출한다.

function exportSVG(osmdContainerRef, filename) {
  const svgEl = osmdContainerRef.current.querySelector('svg');
  // 폰트/스타일 인라인화: <defs>에 @font-face 삽입
  const styleSheet = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter');</style>`;
  const cloned = svgEl.cloneNode(true);
  cloned.insertBefore(
    document.createRange().createContextualFragment(styleSheet),
    cloned.firstChild
  );
  const blob = new Blob([new XMLSerializer().serializeToString(cloned)],
    {type:'image/svg+xml;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '.svg';
  a.click();
}

여러 파일: 각 파일마다 renderToContainer() 후 SVG 추출, JSZip으로 묶어 zip 다운로드.

━━━━━━━━━━━━━━━━━━━
B. ABC Notation 내보내기
━━━━━━━━━━━━━━━━━━━
단성부(첫 번째 파트만) MusicXML → ABC 텍스트 변환.

function toABC(xmlDoc) {
  const title = xmlDoc.querySelector('movement-title,work-title')?.textContent || 'Untitled';
  const composer = xmlDoc.querySelector('creator[type=composer]')?.textContent || '';
  const fifths = parseInt(xmlDoc.querySelector('key fifths')?.textContent || '0');
  const keyName = KEY_NAMES[KEY_FIFTHS.indexOf(fifths)] || 'C';
  const beats = xmlDoc.querySelector('beats')?.textContent || '4';
  const beatType = xmlDoc.querySelector('beat-type')?.textContent || '4';

  let abc = `X:1\nT:${title}\nC:${composer}\nM:${beats}/${beatType}\nL:1/8\nK:${keyName}\n`;

  // note 변환:
  // <step><octave><alter>  →  ABC 음이름
  // ABC 음이름 규칙:
  //   C4=C, D4=D ... B4=B (대문자 = 옥타브 4)
  //   C5=c, D5=d (소문자 = 옥타브 5)
  //   C3=C, (쉼표 접미 = 옥타브 3 이하)
  //   # → ^, ♭ → _
  // <duration>/<divisions> → ABC 길이 숫자
  //   4분음표(divisions*1) = L(1/8)의 2배 → '2'
  //   8분음표 = '1', 2분음표 = '4', 온음표 = '8'
  // <rest> → 'z' + 길이
  // 마디 구분: '|', 줄바꿈: 4마디마다

  const measures = xmlDoc.querySelectorAll('measure');
  let barCount = 0;
  measures.forEach(m => {
    const notes = m.querySelectorAll('note');
    notes.forEach(n => {
      if (n.querySelector('chord')) return; // 화음은 스킵 (단성 전용)
      const isRest = !!n.querySelector('rest');
      const step = n.querySelector('step')?.textContent;
      const oct = parseInt(n.querySelector('octave')?.textContent || '4');
      const alter = parseFloat(n.querySelector('alter')?.textContent || '0');
      const dur = parseFloat(n.querySelector('duration')?.textContent || '1');
      const div = parseFloat(m.querySelector('divisions')?.textContent || '1');
      const lenRatio = (dur / div) / (1/8 * parseInt(beatType));
      const abcLen = lenRatio === 1 ? '' : Math.round(lenRatio).toString();
      let abcStep = step || 'z';
      if (!isRest) {
        if (alter === 1)  abcStep = '^' + abcStep;
        if (alter === -1) abcStep = '_' + abcStep;
        if (oct >= 5) abcStep = abcStep.toLowerCase();
        if (oct <= 3) abcStep = abcStep + ','.repeat(4 - oct);
      } else {
        abcStep = 'z';
      }
      abc += abcStep + abcLen + ' ';
    });
    abc += '| ';
    barCount++;
    if (barCount % 4 === 0) abc += '\n';
  });
  return abc;
}

결과를 textarea에 표시 + .txt 파일로 다운로드.

━━━━━━━━━━━━━━━━━━━
C. LilyPond 내보내기
━━━━━━━━━━━━━━━━━━━
MusicXML → LilyPond (.ly) 텍스트 변환.

function toLilypond(xmlDoc) {
  const title = xmlDoc.querySelector('movement-title,work-title')?.textContent || 'Untitled';
  const composer = xmlDoc.querySelector('creator[type=composer]')?.textContent || '';

  // LilyPond 헤더
  let ly = `\\version "2.24.0"\n\\header {\n  title = "${title}"\n  composer = "${composer}"\n}\n\n`;

  // 음이름 변환: C=c, D=d, ... B=b (LilyPond는 소문자)
  // 옥타브: C4='c', C5='c\'', C3='c,'
  // 변화음: # → is, ♭ → es (독일식: cis, dis, es, fis, gis, as, b, bes)
  // 길이: 4=4, 8=8, 2=2, 1=1 (숫자 그대로)
  // 쉼표: r4, r8 등

  const parts = xmlDoc.querySelectorAll('part');
  parts.forEach((part, pi) => {
    const pid = part.getAttribute('id');
    const partName = xmlDoc.querySelector(`score-part[id="${pid}"] part-name`)?.textContent || `Part${pi+1}`;
    ly += `${partName.replace(/\s+/g,'_')} = \\relative c' {\n`;

    let prevOct = 4; // relative 시작 기준 옥타브
    part.querySelectorAll('measure').forEach(m => {
      // 박자표, 조표, 템포 처리
      const beats = m.querySelector('beats')?.textContent;
      const beatType = m.querySelector('beat-type')?.textContent;
      if (beats && beatType) ly += `  \\time ${beats}/${beatType}\n`;

      m.querySelectorAll('note').forEach(n => {
        if (n.querySelector('chord')) return;
        const isRest = !!n.querySelector('rest');
        const step = (n.querySelector('step')?.textContent || 'c').toLowerCase();
        const oct = parseInt(n.querySelector('octave')?.textContent || '4');
        const alter = parseFloat(n.querySelector('alter')?.textContent || '0');
        const dur = parseFloat(n.querySelector('duration')?.textContent || '1');
        const div = parseFloat(m.querySelector('divisions')?.textContent || '1');
        const beats4 = 4; // 4분음표 기준
        const lilyDur = Math.round(div * beats4 / dur);

        let lilyStep = step;
        if (alter === 1)  lilyStep += 'is';
        if (alter === -1) lilyStep += (step==='e'||step==='a') ? 's' : 'es';
        // relative 옥타브: 이전 음과의 간격으로 ' 또는 , 추가
        const octDiff = oct - prevOct;
        if (octDiff > 0) lilyStep += "'".repeat(octDiff);
        if (octDiff < 0) lilyStep += ",".repeat(-octDiff);
        prevOct = oct;

        ly += isRest ? `r${lilyDur} ` : `${lilyStep}${lilyDur} `;
      });
      ly += '|\n';
    });
    ly += '}\n\n';
  });
  return ly;
}

결과를 textarea에 표시 + .ly 파일 다운로드.
```

---

## PROMPT-07 · 청음 훈련 모드 (Ear Training)

```
NAV에 {id:'eartraining', icon:'👂', label:'청음 훈련'} 추가.
EarTrainingPanel 컴포넌트를 구현하라. Tone.js 필수.

[3가지 훈련 모드]

━━━━━━━━━━━━━━━━━━━
모드 1: 음정 맞히기 (Interval Quiz)
━━━━━━━━━━━━━━━━━━━
상태: { mode:'interval', score:0, total:0, streak:0, currentQ:null }

문제 생성: generateIntervalQ()
  baseNote: MIDI 60~72 사이 랜덤
  intervalSemi: [1,2,3,4,5,6,7,8,9,10,11,12] 중 랜덤
  targetNote: baseNote + intervalSemi
  intervalName: ['단2도','장2도','단3도','장3도','완전4도','증4도/감5도',
                  '완전5도','단6도','장6도','단7도','장7도','완전8도'][intervalSemi-1]
  direction: 랜덤 '상행'/'하행' (하행이면 targetNote = baseNote - intervalSemi)
  return {baseNote, targetNote, intervalSemi, intervalName, direction}

재생: Tone.PolySynth로 baseNote → 0.8초 후 targetNote 순차 재생.
      (화성적 재생 모드: 동시에 재생 토글 가능)

정답 UI: 12개 버튼 (단2도~완전8도)
정답 클릭 → 맞으면 초록 애니메이션, 틀리면 빨강 + 정답 강조
다음 문제 자동 생성.
점수판: 정답/전체, 연속정답(streak), 취약 음정 Top 3 표시.

━━━━━━━━━━━━━━━━━━━
모드 2: 코드 유형 맞히기 (Chord Quiz)
━━━━━━━━━━━━━━━━━━━
문제 생성: generateChordQ()
  root: 랜덤 MIDI 48~60
  chordTypes = [
    {name:'장3화음',  intervals:[0,4,7]},
    {name:'단3화음',  intervals:[0,3,7]},
    {name:'감3화음',  intervals:[0,3,6]},
    {name:'증3화음',  intervals:[0,4,8]},
    {name:'속7화음',  intervals:[0,4,7,10]},
    {name:'장7화음',  intervals:[0,4,7,11]},
    {name:'단7화음',  intervals:[0,3,7,10]},
    {name:'반감7화음',intervals:[0,3,6,10]},
  ]
  선택된 type의 intervals를 root에 더해 MIDI 배열 생성.

재생: Tone.PolySynth로 모든 음 동시 발음 (0.8초 지속).
정답 버튼: chordTypes.length개 버튼.
아르페지오 재생 옵션: 동시/순차 토글.

━━━━━━━━━━━━━━━━━━━
모드 3: 악보 받아쓰기 (Dictation)
━━━━━━━━━━━━━━━━━━━
현재 업로드된 파일에서 무작위 4마디 구간을 선택.
해당 구간의 note를 재생 (음표 표시 없이 소리만).
사용자가 음표 이름 버튼을 클릭하여 순서대로 입력.
입력 완료 후 '채점' 클릭 → 정답과 비교.
정답률: 음높이 일치 %, 리듬 일치 %.
오답 부분 강조 표시.

[공통 UI]
  모드 선택 탭 (음정/코드/받아쓰기)
  난이도: 쉬움(장·단조 음정만) / 보통(모든 음정) / 어려움(모든 코드+받아쓰기)
  세션 통계: 정답률 그래프 (최근 20문항)
  취약 패턴 분석: 자주 틀리는 음정/코드 Top 3
```

---

## PROMPT-08 · 음형 패턴 검색 & 하이라이트

```
NAV 분석 섹션에 {id:'patternsearch', icon:'🔎', label:'음형 패턴 검색'} 추가.
PatternSearchPanel 컴포넌트를 구현하라.

[검색 모드 3가지]

━━━━━━━━━━━━━━━━━━━
A. 음고 패턴 검색
━━━━━━━━━━━━━━━━━━━
입력: 음표 이름 시퀀스 (예: "C D E F G" 또는 "도 레 미 파 솔")
파싱: 입력 문자열을 공백으로 분리 → pitchClass[] 배열로 변환
  한국어: 도=0, 레=2, 미=4, 파=5, 솔=7, 라=9, 시=11
  영어: C=0, D=2, ... B=11
  이조 옵션: "절대 음고"(정확히 해당 음) / "음계 내 상대 음고"(피치 클래스만 일치)

검색 알고리즘:
  xmlDoc의 모든 파트·마디·음표 시퀀스를 순회.
  sliding window로 패턴 길이만큼 비교.
  일치하면 {partIdx, measureNum, beatIdx, noteIndices[]} 기록.

━━━━━━━━━━━━━━━━━━━
B. 리듬 패턴 검색
━━━━━━━━━━━━━━━━━━━
입력: 리듬 패턴 (예: "4 8 8 4" → 4분, 8분, 8분, 4분)
또는 기호 입력: ♩ ♪ ♪ ♩ (버튼 클릭으로 입력)
검색: duration 비율만 비교 (음고 무관).
  ratio = duration / divisions
  패턴의 ratio 배열과 악보의 note ratio 배열 비교.
  허용 오차: ±5% (점음표 등 처리용)

━━━━━━━━━━━━━━━━━━━
C. 모티프 반복 자동 감지
━━━━━━━━━━━━━━━━━━━
자동으로 2~6음 길이의 모든 음형을 추출하여 반복 횟수 집계.
3회 이상 등장하는 음형을 "모티프 후보"로 표시.
각 모티프: 출현 위치 목록, 정확한 반복 vs 변형(조바꿈/리듬 변형) 구분.
결과를 출현 빈도 내림차순으로 정렬.

[결과 UI]
검색 결과: 파일명 | 파트 | 마디 | 박자 위치
각 결과 항목 클릭 → 해당 마디로 악보 스크롤.
'하이라이트' 버튼:
  검색된 위치의 note에 MusicXML <notehead color="#FF6B6B">를 삽입하여
  OSMD가 색상으로 렌더링하도록 함.
  onFilesUpdate(result, '패턴 하이라이트')
통계: 총 N개 위치 발견, 파일별/파트별 분포 차트.
```

---

## PROMPT-09 · 페이지 레이아웃 & 악보 조판 편집

```
NAV 변환 도구 섹션에 {id:'layout', icon:'📄', label:'레이아웃 편집'} 추가.
LayoutPanel 컴포넌트를 구현하라.

[편집 가능한 레이아웃 속성]

1. 페이지 크기 선택
  const PAGE_SIZES = {
    A4:     {width:210, height:297},
    Letter: {width:215.9, height:279.4},
    A3:     {width:297, height:420},
    A5:     {width:148, height:210},
  };
  MusicXML <page-layout><page-height>,<page-width> 값을 mm→tenths로 변환하여 삽입.
  변환: tenths = mm * 40 (기본 scaling: 40 tenths = 1mm)

2. 여백 설정 (mm 단위 입력 필드)
  left-margin, right-margin, top-margin, bottom-margin
  MusicXML: <page-margins type="both"><left-margin>...</left-margin>... 구조

3. 보표 간격
  <staff-distance> 값 조절 (기본: 80 tenths)
  <system-distance> 값 조절 (기본: 100 tenths)

4. 음표 크기 (Scaling)
  <scaling><millimeters>, <tenths> 조절
  기본: millimeters=7, tenths=40
  슬라이더로 50%~200% 조절.

5. 시스템 브레이크 편집
  '시스템 브레이크 추가' 기능:
    마디 번호를 입력받아 해당 <measure> 내 마지막 음표 뒤에
    <print new-system="yes"/> 삽입.
  '페이지 브레이크 추가': <print new-page="yes"/> 삽입.
  '모든 브레이크 제거': print 요소 전체 삭제.

6. 마디 번호 스타일
  <measure-numbering> 요소 값 설정:
    'none' → 번호 숨김
    'measure' → 매 마디
    'system' → 시스템 첫 마디만
  시작 번호: <measure number="N"> 첫 번째 마디 번호 속성 변경.

7. 제목·작곡가 메타데이터 편집
  <movement-title>, <work-title>, <creator type="composer">,
  <creator type="lyricist">, <rights> 텍스트 편집 폼.
  편집 즉시 미리보기에 반영.

[UI]
  섹션별 아코디언 (페이지 / 여백 / 간격 / 브레이크 / 메타)
  '적용' 버튼: 현재 파일에만 / 모든 파일에 일괄 적용 선택
  '기본값 초기화' 버튼
  변경 후 onFilesUpdate(result, '레이아웃 편집')
```

---

## PROMPT-10 · URL 기반 악보 공유 + 세션 자동 저장

```
헤더 우측에 '공유' 버튼과 '세션 저장/불러오기' 메뉴를 추가하라.

━━━━━━━━━━━━━━━━━━━
A. URL 공유
━━━━━━━━━━━━━━━━━━━
function generateShareURL(files) {
  // 선택된 단일 파일의 xmlDoc을 직렬화
  const xmlStr = new XMLSerializer().serializeToString(files[selectedIdx].xmlDoc);
  // gzip 없이 단순 base64 (소형 파일 전용, ~500KB 제한)
  const b64 = btoa(unescape(encodeURIComponent(xmlStr)));
  // URL의 hash에 저장 (서버 전송 없음)
  const url = window.location.href.split('?')[0] + '?share=' + encodeURIComponent(b64);
  return url;
}

// 앱 로드 시 URL 파라미터 확인
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const shareData = params.get('share');
  if (shareData) {
    try {
      const xmlStr = decodeURIComponent(escape(atob(decodeURIComponent(shareData))));
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlStr, 'text/xml');
      const title = xmlDoc.querySelector('movement-title,work-title')?.textContent || 'shared.xml';
      setFiles([{name: title, xmlDoc, size: xmlStr.length}]);
      addLog('🔗 공유 악보를 불러왔습니다.', 'success');
    } catch(e) {
      addLog('공유 링크 파싱 실패', 'error');
    }
  }
}, []);

공유 버튼 UI:
  클릭 → 모달 팝업 열기.
  URL 텍스트필드 + '복사' 버튼.
  파일 크기 경고: 200KB 초과 시 "파일이 커서 URL이 길어질 수 있습니다" 표시.
  'QR코드 생성': qrcode.js CDN 추가 후 캔버스에 렌더링.

━━━━━━━━━━━━━━━━━━━
B. 세션 자동 저장 (localStorage)
━━━━━━━━━━━━━━━━━━━
저장 키: 'mxlstudio_session_v1'

저장 데이터 구조:
{
  savedAt: ISO timestamp,
  files: [{
    name: string,
    size: number,
    xmlStr: string  // XMLSerializer().serializeToString(xmlDoc)
  }],
  activePanel: string,
  selectedFileIdx: number
}

자동 저장:
  files 상태 변경 후 5초 debounce로 localStorage에 저장.
  저장 시 헤더에 '저장됨 HH:MM' 표시 (2초 후 사라짐).

불러오기:
  앱 로드 시 localStorage에 데이터 있으면:
  "이전 세션 복원 (2025-01-15 14:32, 파일 3개)" 배너 표시.
  '복원하기' / '무시하기' 버튼.

세션 관리 메뉴 (헤더 → '세션' 드롭다운):
  '현재 세션 저장' → 파일명 입력 후 localStorage key에 슬롯으로 저장 (최대 5개)
  '세션 불러오기' → 저장된 세션 목록 표시
  '세션 내보내기' → 전체 세션을 .json 파일로 다운로드
  '세션 가져오기' → .json 파일 업로드로 복원
```

---

## PROMPT-11 · 악보 주석 / 교사 메모 레이어

```
NAV에 {id:'annotations', icon:'📝', label:'주석 메모'} 추가.
AnnotationsPanel 컴포넌트와 OSMD 위에 오버레이되는 AnnotationOverlay 컴포넌트를 구현하라.

[데이터 구조]
const [annotations, setAnnotations] = useState([]);
// annotation: { id, measureNum, text, color, type, createdAt }
// type: 'note'(일반메모) | 'practice'(연습지시) | 'theory'(이론설명) | 'warning'(주의)

[AnnotationOverlay 컴포넌트]
OSMD 컨테이너 위에 position:absolute로 오버레이.
각 annotation:
  해당 마디 번호에 해당하는 OSMD SVG measure 요소의 getBoundingClientRect()로 위치 파악.
  그 위치에 메모 아이콘(📝) 버튼 배치.
  호버 시 툴팁으로 메모 내용 표시.
  클릭 시 편집 모달 열기.

마디 번호 → SVG 위치 매핑:
  OSMD는 각 measure SVG 요소에 data-measure-number 또는 id 속성이 있음.
  querySelectorAll('[data-measure]') 또는 osmd.graphic.measureList로 접근.
  OSMD API: osmd.graphic.measureList[measureIdx][0].stave.staveLines 등으로 y좌표 추출.
  폴백: SVG 내 <text> 요소의 measure number 텍스트로 위치 추정.

[주석 편집 모달]
  마디 번호 (자동 입력, 수정 가능)
  메모 유형 선택 (일반/연습/이론/주의)
  텍스트 입력 (textarea, 최대 200자)
  색상 선택 (노랑/파랑/초록/빨강)
  '저장' / '삭제' 버튼

[MusicXML 삽입 옵션]
'악보에 영구 삽입' 버튼:
  <direction placement="above">
    <direction-type>
      <words font-size="8" color="#FF6B6B">[주석 내용]</words>
    </direction-type>
  </direction>
  을 해당 마디 첫 note 앞에 삽입.
  onFilesUpdate(result, '주석 삽입')

[학생용 / 교사용 인쇄 모드]
  '교사용 인쇄': 주석 포함 (현재 상태 그대로 PDF)
  '학생용 인쇄': type='note'인 주석만 포함, 'theory'·'warning' 제외
  인쇄 시 annotation overlay를 SVG에 병합하여 출력.

[주석 내보내기/가져오기]
  JSON 파일로 주석 목록 저장/불러오기.
  파일명에 연동: 같은 파일 이름의 주석 자동 매칭.
```

---

## PROMPT-12 · 음악 형식 분석 (Form Analysis)

```
NAV 분석 섹션에 {id:'formanalysis', icon:'📊', label:'형식 분석'} 추가.
FormAnalysisPanel 컴포넌트를 구현하라.

[분석 알고리즘]

Step 1 — 구절(Phrase) 경계 감지
  cadencePoints = 종지 감지 결과 (PROMPT-02의 detectRomanNumeral 재활용)
  완전종지·반종지 위치를 구절 경계로 사용.
  보완: 마디 내 쉼표 비율이 50% 이상이면 경계 후보.
  결과: phrases[] = [{startMeasure, endMeasure, length}]

Step 2 — 구절 유사도 계산
  두 구절 간 유사도 = 음고 패턴 유사도 * 0.6 + 리듬 패턴 유사도 * 0.4
  
  음고 패턴 유사도:
    각 구절을 pitch class sequence로 변환.
    Levenshtein distance 기반: similarity = 1 - (editDist / maxLen)
    조바꿈 허용: 모든 가능한 transposition(0~11)에서 최대 유사도 선택.
  
  리듬 패턴 유사도:
    duration ratio sequence 비교 (같은 Levenshtein 방식).

Step 3 — 클러스터링 → 형식 라벨 부여
  유사도 0.75 이상인 구절들을 같은 그룹으로 분류.
  그룹 순서대로 A, B, C... 라벨 부여.
  변형구절(0.5~0.75): A' B' 등.
  
  형식 패턴 감지:
    A A (이부 반복)
    A B (이부)
    A A B A (32마디 형식)
    A B A (삼부)
    A B A' (변형 삼부)
    A A' B A (달 세뇨 등)

Step 4 — 절(Section) 구조 감지
  큰 구조: 여러 구절의 묶음 → 주제/발전/재현부 등
  기준: 구절 수, 조성 변화, 악기 변화 (다성부 파일)

[UI]
  형식 다이어그램:
    수평 타임라인 (마디 번호 축)
    각 구절: 색상 블록 (A=파랑, B=초록, C=주황, ...)
    블록 위에 라벨 (A, B, A', ...)
    블록 클릭 → 해당 마디로 악보 스크롤
  
  형식 요약 카드:
    "ABA' 삼부 형식 (Ternary Form)"
    "총 N개 구절, 평균 M마디"
    "주요 조성: C장조 → G장조 → C장조"
  
  구절별 상세 테이블:
    구절명 | 마디 범위 | 길이(마디) | 유사 구절 | 특징
  
  '악보에 삽입' 버튼:
    각 구절 시작 마디에 <rehearsal>A</rehearsal> 삽입.
    onFilesUpdate(result, '형식 라벨 삽입')
```

---

## PROMPT-13 · 가사 다국어 번역 레이어

```
NAV 표기 편집 섹션에 {id:'lyrics', icon:'💬', label:'가사 편집'} 추가.
LyricsPanel 컴포넌트를 구현하라.

[기존 가사 추출]
function extractLyrics(xmlDoc) {
  const result = [];
  xmlDoc.querySelectorAll('measure').forEach((m, mi) => {
    m.querySelectorAll('note').forEach((n, ni) => {
      const lyric = n.querySelector('lyric');
      if (!lyric) return;
      const syllabic = lyric.querySelector('syllabic')?.textContent || 'single';
      const text = lyric.querySelector('text')?.textContent || '';
      const number = lyric.getAttribute('number') || '1';
      result.push({measureIdx:mi, noteIdx:ni, syllabic, text, verse:number});
    });
  });
  return result;
}

가사를 verse별로 그룹화하여 표시.
각 verse: 음절 단위 텍스트 리스트 (마디·박자 위치 포함).
전체 가사를 연속 텍스트로 재조합하여 textarea에 표시.

[외부 가사 가져오기 & 음절 배정]
텍스트 파일 업로드 (.txt) 또는 textarea에 직접 입력.
'한국어 음절 분리' 버튼:
  한국어 단어를 음절 단위로 분리하는 간단한 규칙:
  각 한글 문자 = 1음절 (유니코드 AC00~D7A3 범위)
  영어: 모음(a,e,i,o,u) 기준 CVC 패턴으로 분리
    간단 버전: 공백 기준 단어 분리, 단어 내 모음 수 = 음절 수
    "hap-py" = 2음절 → 2음에 배정
'음절 배정' 버튼:
  MusicXML의 note 수에 맞게 음절을 순서대로 배정.
  남은 음절 없으면 경고.
  음절-음표 매핑 테이블로 미리보기.
'적용' 버튼:
  기존 <lyric> 제거 후 새 <lyric> 삽입.
  syllabic 자동 설정: 단어 첫 음절='begin', 중간='middle', 끝='end', 단독='single'.

[번역 레이어 (2단 가사)]
API 없이 로컬 사전 방식:
  사용자가 번역 텍스트를 직접 입력하거나 텍스트 파일 업로드.
  원본 가사(verse 1)는 그대로 두고, 번역(verse 2)을 추가.
'번역 삽입' 버튼:
  같은 note에 <lyric number="2"><text>번역음절</text></lyric> 추가.
  OSMD가 2단 가사를 렌더링.

[가사 스타일 편집]
현재 구현된 가사 스타일(LyricStylePanel)과 통합:
  verse 1과 verse 2에 독립적인 폰트/크기/색상 설정.
  번역 가사는 기본값 이탤릭, 회색(#888) 처리.

[가사 내보내기]
  .txt 파일: verse별로 전체 가사 텍스트 저장.
  .srt 파일: 마디 번호 기반 타임코드 생성 (BPM으로 초 계산)하여 자막 파일 생성.
```

---

## PROMPT-14 · 난이도 평가 & 학습자 레벨 진단

```
NAV 분석 섹션에 {id:'difficulty', icon:'⭐', label:'난이도 평가'} 추가.
DifficultyPanel 컴포넌트를 구현하라.

[채점 항목 — 각각 0~100점 산출]

function scoreDifficulty(xmlDoc) {
  const notes = [...xmlDoc.querySelectorAll('note:not(:has(rest))')];
  const measures = [...xmlDoc.querySelectorAll('measure')];

  // 1. 음역 폭 (Range Score)
  const midiNotes = notes.map(n => {
    const s=n.querySelector('step')?.textContent||'C';
    const o=parseInt(n.querySelector('octave')?.textContent||'4');
    const a=parseFloat(n.querySelector('alter')?.textContent||'0');
    return (o+1)*12 + STEP_TO_SEMI[s] + a;
  });
  const range = Math.max(...midiNotes) - Math.min(...midiNotes);
  const rangeScore = Math.min(100, range * 2.5); // 옥타브 = 30점, 2옥타브 = 60점

  // 2. 도약 빈도 (Leap Score)
  let leapCount = 0;
  for (let i=1;i<midiNotes.length;i++) {
    if (Math.abs(midiNotes[i]-midiNotes[i-1]) > 4) leapCount++;
  }
  const leapScore = Math.min(100, (leapCount / notes.length) * 200);

  // 3. 리듬 복잡도 (Rhythm Score)
  const durations = notes.map(n => {
    const dur = parseFloat(n.querySelector('duration')?.textContent||'1');
    const div = parseFloat(n.closest('measure')?.querySelector('divisions')?.textContent||'1');
    return dur/div;
  });
  const uniqueRatios = new Set(durations.map(d => Math.round(d*16)/16)).size;
  const hasTriplets = [...xmlDoc.querySelectorAll('actual-notes')].some(n=>n.textContent==='3');
  const rhythmScore = Math.min(100, uniqueRatios * 12 + (hasTriplets ? 20 : 0));

  // 4. 조성 난이도 (Key Score)
  const fifths = Math.abs(parseInt(xmlDoc.querySelector('key fifths')?.textContent||'0'));
  const keyScore = fifths * 10; // 0=C장조(0점), 6=F#/Gb(60점), 7=Cb/C#(70점)

  // 5. 화성 복잡도 (Harmony Score)
  const chords = xmlDoc.querySelectorAll('harmony');
  const chordKinds = new Set([...chords].map(c=>c.querySelector('kind')?.textContent));
  const harmonyScore = Math.min(100, chordKinds.size * 8);

  // 6. 빠르기 (Tempo Score)
  const bpm = parseFloat(xmlDoc.querySelector('per-minute')?.textContent || '100');
  const tempoScore = Math.min(100, Math.max(0, (bpm - 60) / 1.5));

  // 7. 파트 수 (Polyphony Score)
  const partCount = xmlDoc.querySelectorAll('part').length;
  const polyScore = Math.min(100, (partCount - 1) * 25);

  // 종합 점수
  const weights = {range:0.2, leap:0.2, rhythm:0.2, key:0.15, harmony:0.1, tempo:0.1, poly:0.05};
  const total = (
    rangeScore*weights.range + leapScore*weights.leap +
    rhythmScore*weights.rhythm + keyScore*weights.key +
    harmonyScore*weights.harmony + tempoScore*weights.tempo +
    polyScore*weights.poly
  );

  // 레벨 분류
  let level, color, desc;
  if (total < 20)      { level='입문'; color='#22c55e'; desc='처음 배우는 학습자용'; }
  else if (total < 40) { level='초급'; color='#84cc16'; desc='기초 과정 완료 후'; }
  else if (total < 60) { level='중급'; color='#eab308'; desc='1~2년 이상 학습자'; }
  else if (total < 80) { level='고급'; color='#f97316'; desc='3년 이상 숙련자'; }
  else                 { level='전문가'; color='#ef4444'; desc='음악 전공 수준'; }

  return {total, level, color, desc,
    breakdown:{rangeScore,leapScore,rhythmScore,keyScore,harmonyScore,tempoScore,polyScore}};
}

[UI]
  종합 점수 대형 표시 (레이더 차트 SVG 직접 구현):
    7각형 레이더: 음역/도약/리듬/조성/화성/빠르기/다성부
    채워진 영역 색상 = 레벨 색상
    각 꼭짓점에 항목명과 점수 표시.
  
  레벨 배지: "⭐ 중급 (62점)" — 큰 뱃지 스타일.
  
  항목별 프로그레스 바:
    음역 폭: ████░░ 48점 (음역: C4~E6, 1.75옥타브)
    도약 빈도: ██░░░░ 32점 (전체 음의 22%가 도약)
    리듬 복잡도: ████░░ 56점 (7종 리듬 + 셋잇단음표)
    ...
  
  '추천 대상' 카드: "이 곡은 피아노 바이엘 후반~체르니 초반 수준입니다."
  
  여러 파일 비교 모드:
    업로드된 모든 파일의 점수를 테이블로 나열.
    난이도 오름차순/내림차순 정렬.
    '학습 순서 제안' 버튼: 점수 낮은 것부터 연습 순서 추천.
```

---

## 구현 순서 권장 로드맵

```
Phase 1 (즉시 효과, 높은 활용도)
  PROMPT-03 → 전체 Undo/Redo  ← 가장 먼저. 이후 작업의 안전망.
  PROMPT-09 → 레이아웃 편집   ← 기존 XML 파싱 인프라 100% 재활용.
  PROMPT-10 → URL 공유+세션   ← localStorage만으로 구현, 외부 의존 없음.

Phase 2 (교육적 핵심 기능)
  PROMPT-01 → MIDI 재생       ← Tone.js CDN 추가만으로 구현 가능.
  PROMPT-04 → 운지법 표시     ← 교육 대상(리코더/칼림바)과 직접 연관.
  PROMPT-14 → 난이도 평가     ← 기존 통계 함수 재활용.

Phase 3 (분석 심화)
  PROMPT-02 → 로마 숫자 분석  ← DIATONIC_SCALES 상수 재활용.
  PROMPT-08 → 음형 패턴 검색  ← 기존 XML 순회 패턴 확장.
  PROMPT-12 → 형식 분석       ← PROMPT-02 종지 감지 결과에 의존.

Phase 4 (고급 기능)
  PROMPT-05 → 성부 진행 분석
  PROMPT-06 → SVG/LY/ABC 내보내기
  PROMPT-07 → 청음 훈련       ← PROMPT-01 Tone.js 재활용.
  PROMPT-11 → 주석 레이어
  PROMPT-13 → 가사 편집
```

---

각 프롬프트는 복사 후 "위 컨텍스트를 바탕으로, `mxl-studio.html` 파일에 다음 기능을 추가하라:" 앞에 붙여서 바로 사용할 수 있습니다. PROMPT-03(Undo)을 가장 먼저 구현하면 이후 모든 실험적 작업의 안전망이 생깁니다.
