(function(global){
  'use strict';

  const STEP_TO_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const SEMI_TO_NOTE=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const INTERVAL_NAMES=['단2도','장2도','단3도','장3도','완전4도','증4도/감5도','완전5도','단6도','장6도','단7도','장7도','완전8도'];
  const EASY_INTERVALS=[3,4,7,12];
  const CHORD_TYPES=[
    {name:'장3화음',intervals:[0,4,7]},
    {name:'단3화음',intervals:[0,3,7]},
    {name:'감3화음',intervals:[0,3,6]},
    {name:'증3화음',intervals:[0,4,8]},
    {name:'속7화음',intervals:[0,4,7,10]},
    {name:'장7화음',intervals:[0,4,7,11]},
    {name:'단7화음',intervals:[0,3,7,10]},
    {name:'반감7화음',intervals:[0,3,6,10]},
  ];

  function pick(list,rng=Math.random){
    return list[Math.min(list.length-1,Math.floor(rng()*list.length))];
  }

  function midiToName(midi){
    const pc=((midi%12)+12)%12;
    const oct=Math.floor(midi/12)-1;
    return `${SEMI_TO_NOTE[pc]}${oct}`;
  }

  function nameToMidi(name){
    const match=String(name||'').match(/^([A-G])([#b]?)(-?\d+)$/);
    if(!match)return null;
    const [,step,acc,oct]=match;
    const alter=acc==='#'?1:acc==='b'?-1:0;
    return (parseInt(oct,10)+1)*12+STEP_TO_SEMI[step]+alter;
  }

  function generateIntervalQ(rng=Math.random,difficulty='normal'){
    const allowed=difficulty==='easy'?EASY_INTERVALS:[1,2,3,4,5,6,7,8,9,10,11,12];
    const baseNote=60+Math.floor(rng()*13);
    const intervalSemi=pick(allowed,rng);
    const direction=rng()<0.5?'상행':'하행';
    const targetNote=direction==='상행'?baseNote+intervalSemi:baseNote-intervalSemi;
    return {mode:'interval',baseNote,targetNote,intervalSemi,intervalName:INTERVAL_NAMES[intervalSemi-1],direction};
  }

  function generateChordQ(rng=Math.random,difficulty='normal'){
    const root=48+Math.floor(rng()*13);
    const pool=difficulty==='easy'?CHORD_TYPES.slice(0,2):CHORD_TYPES;
    const type=pick(pool,rng);
    return {mode:'chord',root,type,notes:type.intervals.map(i=>root+i)};
  }

  function gradeAnswer(state,chosen,answer){
    const correct=chosen===answer;
    const history=[...(state.history||[]),{answer,chosen,correct}].slice(-20);
    const mistakes={...(state.mistakes||{})};
    if(!correct)mistakes[answer]=(mistakes[answer]||0)+1;
    return {
      ...state,
      score:(state.score||0)+(correct?1:0),
      total:(state.total||0)+1,
      streak:correct?(state.streak||0)+1:0,
      lastResult:correct?'correct':'wrong',
      history,
      mistakes,
    };
  }

  function topWeak(mistakes,limit=3){
    return Object.entries(mistakes||{}).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([label,count])=>({label,count}));
  }

  function getNoteMidi(note){
    if(!note||note.querySelector('rest'))return null;
    const step=note.querySelector('step')?.textContent;
    const octave=parseInt(note.querySelector('octave')?.textContent||'4',10);
    const alter=parseInt(note.querySelector('alter')?.textContent||'0',10);
    if(STEP_TO_SEMI[step]===undefined)return null;
    return (octave+1)*12+STEP_TO_SEMI[step]+alter;
  }

  function extractDictationNotes(xmlDoc,startMeasure=1,measureCount=4){
    const part=xmlDoc.querySelector('part');
    if(!part)return [];
    const measures=Array.from(part.querySelectorAll('measure')).slice(Math.max(0,startMeasure-1),Math.max(0,startMeasure-1)+measureCount);
    let div=1;
    const notes=[];
    measures.forEach(measure=>{
      const nextDiv=parseFloat(measure.querySelector('attributes divisions, divisions')?.textContent||'');
      if(nextDiv>0)div=nextDiv;
      measure.querySelectorAll('note').forEach(note=>{
        if(note.querySelector('chord'))return;
        const midi=getNoteMidi(note);
        if(midi===null)return;
        const duration=parseFloat(note.querySelector('duration')?.textContent||'1')||1;
        notes.push({
          midi,
          name:midiToName(midi),
          duration,
          beats:duration/div,
          measure:parseInt(measure.getAttribute('number')||'1',10),
        });
      });
    });
    return notes;
  }

  function generateDictationQ(xmlDoc,rng=Math.random){
    const measures=Array.from(xmlDoc.querySelectorAll('part:first-of-type > measure, part > measure'));
    const maxStart=Math.max(1,measures.length-3);
    const startMeasure=1+Math.floor(rng()*maxStart);
    const notes=extractDictationNotes(xmlDoc,startMeasure,4);
    return {mode:'dictation',startMeasure,measureCount:4,notes,answerNames:notes.map(n=>n.name),answerRhythms:notes.map(n=>n.beats)};
  }

  function gradeDictation(question,inputNames){
    const answers=question.answerNames||[];
    const max=Math.max(answers.length,inputNames.length,1);
    let pitchMatches=0;
    const details=[];
    for(let i=0;i<max;i++){
      const expected=answers[i]||'';
      const actual=inputNames[i]||'';
      const correct=expected===actual;
      if(correct)pitchMatches++;
      details.push({index:i,expected,actual,correct});
    }
    return {
      pitchPercent:Math.round((pitchMatches/max)*100),
      rhythmPercent:100,
      details,
    };
  }

  global.EarTrainingCore={
    INTERVAL_NAMES,
    CHORD_TYPES,
    midiToName,
    nameToMidi,
    generateIntervalQ,
    generateChordQ,
    gradeAnswer,
    topWeak,
    extractDictationNotes,
    generateDictationQ,
    gradeDictation,
  };
})(window);
