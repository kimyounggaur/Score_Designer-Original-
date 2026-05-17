(function(global){
  const STEP_TO_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const SEMI_NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const WEIGHTS={range:0.2,leap:0.2,rhythm:0.2,key:0.15,harmony:0.1,tempo:0.1,poly:0.05};

  function noteToMidi(note){
    const s=note.querySelector('step')?.textContent||'C';
    const o=parseInt(note.querySelector('octave')?.textContent||'4',10);
    const a=parseFloat(note.querySelector('alter')?.textContent||'0')||0;
    return (o+1)*12+STEP_TO_SEMI[s]+a;
  }

  function midiName(midi){
    if(!Number.isFinite(midi))return '-';
    return `${SEMI_NAMES[((Math.round(midi)%12)+12)%12]}${Math.floor(Math.round(midi)/12)-1}`;
  }

  function levelFor(total){
    if(total<20)return {level:'입문',color:'#22c55e',desc:'처음 배우는 학습자용'};
    if(total<40)return {level:'초급',color:'#84cc16',desc:'기초 과정 완료 후'};
    if(total<60)return {level:'중급',color:'#eab308',desc:'1~2년 이상 학습자'};
    if(total<80)return {level:'고급',color:'#f97316',desc:'3년 이상 숙련자'};
    return {level:'전문가',color:'#ef4444',desc:'음악 전공 수준'};
  }

  function scoreDifficulty(xmlDoc){
    const notes=Array.from(xmlDoc.querySelectorAll('note')).filter(n=>!n.querySelector('rest')&&n.querySelector('pitch'));
    const measures=Array.from(xmlDoc.querySelectorAll('measure'));
    const midiNotes=notes.map(noteToMidi);
    const minMidi=midiNotes.length?Math.min(...midiNotes):60;
    const maxMidi=midiNotes.length?Math.max(...midiNotes):60;
    const range=maxMidi-minMidi;
    const rangeScore=Math.min(100,range*2.5);

    let leapCount=0;
    for(let i=1;i<midiNotes.length;i++)if(Math.abs(midiNotes[i]-midiNotes[i-1])>4)leapCount++;
    const leapRatio=notes.length?leapCount/notes.length:0;
    const leapScore=Math.min(100,leapRatio*200);

    const durations=notes.map(n=>{
      const dur=parseFloat(n.querySelector('duration')?.textContent||'1')||1;
      const div=parseFloat(n.closest('measure')?.querySelector('divisions')?.textContent||'1')||1;
      return dur/div;
    });
    const uniqueRatios=new Set(durations.map(d=>Math.round(d*16)/16)).size;
    const hasTriplets=Array.from(xmlDoc.querySelectorAll('actual-notes')).some(n=>n.textContent==='3');
    const rhythmScore=Math.min(100,uniqueRatios*12+(hasTriplets?20:0));

    const fifths=Math.abs(parseInt(xmlDoc.querySelector('key fifths')?.textContent||'0',10));
    const keyScore=fifths*10;

    const chords=Array.from(xmlDoc.querySelectorAll('harmony'));
    const chordKinds=new Set(chords.map(c=>c.querySelector('kind')?.textContent||'unknown'));
    const harmonyScore=Math.min(100,chordKinds.size*8);

    const bpm=parseFloat(xmlDoc.querySelector('per-minute')?.textContent||xmlDoc.querySelector('sound[tempo]')?.getAttribute('tempo')||'100');
    const tempoScore=Math.min(100,Math.max(0,(bpm-60)/1.5));

    const partCount=xmlDoc.querySelectorAll('part').length||1;
    const polyScore=Math.min(100,(partCount-1)*25);

    const total=rangeScore*WEIGHTS.range+leapScore*WEIGHTS.leap+rhythmScore*WEIGHTS.rhythm+keyScore*WEIGHTS.key+harmonyScore*WEIGHTS.harmony+tempoScore*WEIGHTS.tempo+polyScore*WEIGHTS.poly;
    const rounded=Math.round(total);
    const level=levelFor(rounded);
    return {
      total:rounded,
      ...level,
      breakdown:{rangeScore:Math.round(rangeScore),leapScore:Math.round(leapScore),rhythmScore:Math.round(rhythmScore),keyScore:Math.round(keyScore),harmonyScore:Math.round(harmonyScore),tempoScore:Math.round(tempoScore),polyScore:Math.round(polyScore)},
      details:{
        range,rangeLabel:`${midiName(minMidi)}~${midiName(maxMidi)}, ${(range/12).toFixed(2)}옥타브`,
        leapCount,leapPct:Math.round(leapRatio*100),
        uniqueRatios,hasTriplets,
        fifths,bpm,partCount,measureCount:measures.length,chordKinds:chordKinds.size,
      },
    };
  }

  function recommendation(result){
    const t=result.total;
    if(t<20)return '이 곡은 처음 시작하는 학습자에게 적합합니다.';
    if(t<40)return '이 곡은 피아노 바이엘 후반~체르니 초반 수준입니다.';
    if(t<60)return '이 곡은 1~2년 이상 학습한 중급 학습자에게 적합합니다.';
    if(t<80)return '이 곡은 3년 이상 숙련자에게 적합합니다.';
    return '이 곡은 음악 전공 수준의 고난도 레퍼토리입니다.';
  }

  function compareFiles(files){
    return (files||[]).filter(f=>f?.xmlDoc).map(f=>({name:f.name,...scoreDifficulty(f.xmlDoc)})).sort((a,b)=>a.total-b.total);
  }

  global.DifficultyCore={scoreDifficulty,compareFiles,recommendation,levelFor};
})(window);
