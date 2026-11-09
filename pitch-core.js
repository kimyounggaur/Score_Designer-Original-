// 음높이 철자·옥타브·조표 계산 순수 로직. MIDI 번호로 되돌리지 않아 이명동음 철자를 보존합니다.
(function(global){
  'use strict';
  const STEPS=['C','D','E','F','G','A','B'];
  const STEP_TO_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const SEMI_TO_STEP=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]];
  const SHARP_ORDER=['F','C','G','D','A','E','B'];
  const FLAT_ORDER=['B','E','A','D','G','C','F'];
  const ACCIDENTAL_NAMES={'-2':'flat-flat','-1.5':'three-quarters-flat','-1':'flat','-0.5':'quarter-flat','0':'natural','0.5':'quarter-sharp','1':'sharp','1.5':'three-quarters-sharp','2':'double-sharp'};
  // MusicXML <note> 자식 순서. 새 요소는 이 순서를 지켜 삽입합니다.
  const NOTE_CHILD_ORDER=['grace','cue','chord','pitch','unpitched','rest','duration','tie','instrument','footnote','level','voice','type','dot','accidental','time-modification','stem','notehead','notehead-text','staff','beam','notations','lyric','play','listen'];
  const mod=(n,d)=>((n%d)+d)%d;
  const kids=(el,name)=>Array.from(el?.children||[]).filter(child=>!name||child.localName===name);
  const kid=(el,name)=>kids(el,name)[0]||null;
  const kidText=(el,name,fallback='')=>{const child=kid(el,name);return child?child.textContent.trim():fallback;};

  function readPitch(noteEl){
    const pitch=kid(noteEl,'pitch');if(!pitch)return null;
    const step=kidText(pitch,'step');if(!(step in STEP_TO_SEMI))return null;
    return {step,alter:Number(kidText(pitch,'alter','0'))||0,octave:Number(kidText(pitch,'octave','4'))};
  }
  function pitchToMidi({step,alter=0,octave}){
    if(!(step in STEP_TO_SEMI))throw new Error('유효한 음이름이 아닙니다.');
    return (Number(octave)+1)*12+STEP_TO_SEMI[step]+(Number(alter)||0);
  }
  // 문자를 diatonicSteps만큼, 실제 높이를 semitones만큼 옮깁니다. TransposeCore.transposePitch와 같은 규칙입니다.
  function addInterval(pitch,diatonicSteps,semitones){
    const step=pitch?.step,alter=Number(pitch?.alter)||0,octave=Number(pitch?.octave);
    if(!(step in STEP_TO_SEMI)||!Number.isFinite(octave)||!Number.isFinite(diatonicSteps)||!Number.isFinite(semitones))throw new Error('유효한 음표와 음정을 지정하세요.');
    const midi=pitchToMidi({step,alter,octave})+semitones;
    const letter=(octave+1)*7+STEPS.indexOf(step)+diatonicSteps;
    const nextStep=STEPS[mod(letter,7)],nextOctave=Math.floor(letter/7)-1;
    const nextAlter=midi-((nextOctave+1)*12+STEP_TO_SEMI[nextStep]);
    if(Math.abs(nextAlter)<=2)return {step:nextStep,alter:nextAlter,octave:nextOctave};
    // 겹올림·겹내림을 넘으면 이명동음으로 단순화합니다.
    const rounded=Math.round(midi),[simpleStep,simpleAlter]=SEMI_TO_STEP[mod(rounded,12)];
    return {step:simpleStep,alter:simpleAlter,octave:Math.floor(rounded/12)-1};
  }
  function shiftOctave(pitch,octaves){return {...pitch,octave:Number(pitch.octave)+(Math.trunc(Number(octaves))||0)};}
  // 옥타브만 바꿉니다. step·alter·accidental은 건드리지 않습니다.
  function shiftNoteOctave(noteEl,octaves){
    const amount=Math.trunc(Number(octaves))||0;if(!amount)return false;
    const octave=kid(kid(noteEl,'pitch'),'octave');if(!octave)return false;
    octave.textContent=String((Number(octave.textContent.trim())||0)+amount);
    return true;
  }
  // 두 pitch class 사이의 이동량. nearest는 -5~+6, up은 0~11, down은 -11~0입니다.
  function nearestShift(fromPc,toPc,direction='nearest'){
    const diff=mod(Number(toPc)-Number(fromPc),12);
    if(direction==='up')return diff;
    if(direction==='down')return diff===0?0:diff-12;
    return diff>6?diff-12:diff;
  }
  // 조표가 그 음이름에 붙이는 변화표 (예: fifths 6이면 E=+1, B=0).
  function keySignatureAlter(fifths,step){
    const count=Math.trunc(Number(fifths))||0;
    if(count>0){const index=SHARP_ORDER.indexOf(step);return index<0||index>=count?0:1+Math.floor((count-1-index)/7);}
    if(count<0){const index=FLAT_ORDER.indexOf(step);return index<0||index>=-count?0:-(1+Math.floor((-count-1-index)/7));}
    return 0;
  }
  function accidentalName(alter){return ACCIDENTAL_NAMES[String(Number(alter)||0)]||'natural';}
  function insertNoteChild(noteEl,child){
    const rank=NOTE_CHILD_ORDER.indexOf(child.localName);
    const before=kids(noteEl).find(node=>NOTE_CHILD_ORDER.indexOf(node.localName)>rank);
    noteEl.insertBefore(child,before||null);
    return child;
  }
  // 같은 마디·같은 보표에서 앞선 음표의 변화표까지 고려한, 이 음표 직전의 유효 alter.
  // 문서 순서를 시간 순서로 간주합니다(다성부 backup 이후의 시간 역전은 근사).
  function alterInEffect(noteEl,fifths){
    const pitch=readPitch(noteEl);if(!pitch)return 0;
    const staff=kidText(noteEl,'staff','1');
    let state=keySignatureAlter(fifths,pitch.step);
    for(const sibling of kids(noteEl.parentElement)){
      if(sibling===noteEl)break;
      if(sibling.localName!=='note')continue;
      const other=readPitch(sibling);
      if(other&&other.step===pitch.step&&other.octave===pitch.octave&&kidText(sibling,'staff','1')===staff)state=other.alter;
    }
    return state;
  }
  // 필요한 경우에만 <accidental>을 붙이고, 불필요한 일반 임시표는 제거합니다(cautionary·editorial 표기는 유지).
  function syncAccidental(noteEl,fifths){
    const pitch=readPitch(noteEl);if(!pitch)return false;
    let accidental=kid(noteEl,'accidental');
    if(pitch.alter!==alterInEffect(noteEl,fifths)){
      if(!accidental)accidental=insertNoteChild(noteEl,noteEl.ownerDocument.createElement('accidental'));
      accidental.textContent=accidentalName(pitch.alter);
      return true;
    }
    if(accidental&&!accidental.hasAttribute('cautionary')&&!accidental.hasAttribute('editorial')&&!accidental.hasAttribute('parentheses'))accidental.remove();
    return false;
  }
  // 조성 기반 3도: 음이름을 두 칸 옮기고 변화표는 조표를 따릅니다.
  function diatonicThird(pitch,fifths,direction='above'){
    const sign=direction==='below'?-1:1;
    const letter=(Number(pitch.octave)+1)*7+STEPS.indexOf(pitch.step)+2*sign;
    const step=STEPS[mod(letter,7)];
    return {step,alter:keySignatureAlter(fifths,step),octave:Math.floor(letter/7)-1};
  }
  // 항상 장3도. 철자는 음이름 두 칸 규칙을 따릅니다 (F#→A#, Bb→D).
  function chromaticThird(pitch,direction='above'){const sign=direction==='below'?-1:1;return addInterval(pitch,2*sign,4*sign);}

  const MAJOR=[[0,0],[2,4],[4,7]],MINOR=[[0,0],[2,3],[4,7]],DIMINISHED=[[0,0],[2,3],[4,6]],AUGMENTED=[[0,0],[2,4],[4,8]];
  const DOMINANT=[...MAJOR,[6,10]],MAJOR_SEVENTH=[...MAJOR,[6,11]],MINOR_SEVENTH=[...MINOR,[6,10]];
  const NINTH=[8,14],ELEVENTH=[10,17],THIRTEENTH=[12,21];
  // MusicXML kind → [음이름 간격, 반음] 목록. 인덱스 n이 n번째 자리바꿈의 베이스입니다.
  const CHORD_TONES={
    major:MAJOR,minor:MINOR,diminished:DIMINISHED,augmented:AUGMENTED,
    dominant:DOMINANT,'major-seventh':MAJOR_SEVENTH,'minor-seventh':MINOR_SEVENTH,
    'diminished-seventh':[...DIMINISHED,[6,9]],'half-diminished':[...DIMINISHED,[6,10]],'augmented-seventh':[...AUGMENTED,[6,10]],
    'major-minor':[...MINOR,[6,11]],'minor-major':[...MINOR,[6,11]],
    'major-sixth':[...MAJOR,[5,9]],'minor-sixth':[...MINOR,[5,9]],
    'suspended-fourth':[[0,0],[3,5],[4,7]],'suspended-second':[[0,0],[1,2],[4,7]],
    'dominant-ninth':[...DOMINANT,NINTH],'major-ninth':[...MAJOR_SEVENTH,NINTH],'minor-ninth':[...MINOR_SEVENTH,NINTH],
    'dominant-11th':[...DOMINANT,NINTH,ELEVENTH],'major-11th':[...MAJOR_SEVENTH,NINTH,ELEVENTH],'minor-11th':[...MINOR_SEVENTH,NINTH,ELEVENTH],
    'dominant-13th':[...DOMINANT,NINTH,ELEVENTH,THIRTEENTH],'major-13th':[...MAJOR_SEVENTH,NINTH,ELEVENTH,THIRTEENTH],'minor-13th':[...MINOR_SEVENTH,NINTH,ELEVENTH,THIRTEENTH],
    power:[[0,0],[4,7]],Neapolitan:MAJOR,
  };
  // 자리바꿈 베이스 음. 지원하지 않는 kind이거나 구성음이 모자라면 null.
  function bassForInversion(root,kind,inversion){
    const tones=CHORD_TONES[kind],index=Math.trunc(Number(inversion));
    if(!tones||!(root?.step in STEP_TO_SEMI)||!Number.isInteger(index)||index<1||index>=tones.length)return null;
    const [steps,semitones]=tones[index];
    const bass=addInterval({step:root.step,alter:Number(root.alter)||0,octave:4},steps,semitones);
    return {step:bass.step,alter:bass.alter};
  }

  global.PitchCore={STEPS,STEP_TO_SEMI,NOTE_CHILD_ORDER,CHORD_TONES,readPitch,pitchToMidi,addInterval,shiftOctave,shiftNoteOctave,nearestShift,keySignatureAlter,accidentalName,insertNoteChild,alterInEffect,syncAccidental,diatonicThird,chromaticThird,bassForInversion};
})(window);
