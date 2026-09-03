// 음표·코드심볼·조표를 함께 옮기는 조옮김 순수 로직
(function(global){
  'use strict';
  const STEPS=['C','D','E','F','G','A','B'];
  const STEP_TO_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const SEMI_TO_STEP=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]];
  const DEFAULT_FIFTHS=[0,-5,2,-3,4,-1,6,1,-4,3,-2,5];
  const mod=(n,d)=>((n%d)+d)%d;
  function intervalFromSemitones(semitones,preferFlat=false){
    const sign=semitones<0?-1:1,absolute=Math.abs(semitones);
    const steps=preferFlat?[0,1,1,2,2,3,4,4,5,5,6,6]:[0,0,1,2,2,3,3,4,5,5,6,6];
    return {diatonic:sign*(Math.floor(absolute/12)*7+steps[absolute%12]),chromatic:semitones};
  }
  function transposePitch({step,alter=0,octave=4},{diatonic,chromatic}){
    if(!(step in STEP_TO_SEMI)||!Number.isFinite(diatonic)||!Number.isFinite(chromatic))throw new Error('유효한 음표와 음정을 지정하세요.');
    const midi=(octave+1)*12+STEP_TO_SEMI[step]+alter+chromatic;
    const letter=(octave+1)*7+STEPS.indexOf(step)+diatonic;
    const nextStep=STEPS[mod(letter,7)],nextOctave=Math.floor(letter/7)-1;
    const nextAlter=midi-((nextOctave+1)*12+STEP_TO_SEMI[nextStep]);
    if(Math.abs(nextAlter)<=2)return {step:nextStep,alter:nextAlter,octave:nextOctave};
    const [simpleStep,simpleAlter]=SEMI_TO_STEP[mod(midi,12)];
    return {step:simpleStep,alter:simpleAlter,octave:Math.floor(midi/12)-1};
  }
  function keyFifthsAfter(fifths,semitones,preferFlat){
    const target=mod(Number(fifths)*7+semitones,12);
    const candidates=Array.from({length:15},(_,i)=>i-7).filter(value=>mod(value*7,12)===target);
    if(preferFlat===true&&candidates.some(n=>n<0))return candidates.filter(n=>n<0).sort((a,b)=>Math.abs(a)-Math.abs(b))[0];
    if(preferFlat===false&&candidates.some(n=>n>=0))return candidates.filter(n=>n>=0).sort((a,b)=>a-b)[0];
    return DEFAULT_FIFTHS[target];
  }
  function preferFlatForKey(fifths){return fifths<0;}
  function keyTonic(fifths,mode='major'){
    const step=STEPS[mod(fifths*4+(mode==='minor'?5:0),7)];
    const pc=mod(fifths*7+(mode==='minor'?9:0),12);
    let alter=mod(pc-STEP_TO_SEMI[step]+6,12)-6;
    return {step,alter,pc};
  }
  function keyInterval(fifths,targetFifths,semitones,mode){
    const from=keyTonic(fifths,mode),to=keyTonic(targetFifths,mode);
    let chromatic=to.pc-from.pc;
    // Match the tonic's spelling to the requested directed chromatic distance.
    const octaves=Math.round((semitones-chromatic)/12);
    return {diatonic:STEPS.indexOf(to.step)-STEPS.indexOf(from.step)+octaves*7,chromatic:semitones};
  }
  function setAlter(parent,tag,alter,before){
    let element=parent.querySelector(`:scope > ${tag}`);
    if(!alter){element?.remove();return;}
    if(!element){element=parent.ownerDocument.createElement(tag);parent.insertBefore(element,before||null);}
    element.textContent=String(alter);
  }
  function transposeHarmony(harmonyEl,semitones,options={}){
    let changed=false;
    for(const name of ['root','bass']){
      const parent=harmonyEl.querySelector(name),step=parent?.querySelector(`${name}-step`);
      if(!step||!(step.textContent in STEP_TO_SEMI))continue;
      const alter=Number(parent.querySelector(`${name}-alter`)?.textContent||0);
      const result=options.interval?transposePitch({step:step.textContent,alter,octave:4},options.interval):(()=>{
        const [nextStep,nextAlter]=SEMI_TO_STEP[mod(STEP_TO_SEMI[step.textContent]+alter+semitones,12)];return {step:nextStep,alter:nextAlter};
      })();
      step.textContent=result.step;setAlter(parent,`${name}-alter`,result.alter);changed=true;
    }
    return changed;
  }
  function transposeMeasureHarmonies(measureEl,semitones,options={}){
    return Array.from(measureEl.querySelectorAll('harmony')).reduce((count,h)=>count+Number(transposeHarmony(h,semitones,options)),0);
  }
  function transposeDocHarmonies(xmlDoc,semitones,options={}){return transposeMeasureHarmonies(xmlDoc,semitones,options);}
  function transposeNoteElement(note,interval){
    const pitch=note.querySelector('pitch');if(!pitch)return false;
    const result=transposePitch({step:pitch.querySelector('step').textContent,alter:Number(pitch.querySelector('alter')?.textContent||0),octave:Number(pitch.querySelector('octave')?.textContent||4)},interval);
    pitch.querySelector('step').textContent=result.step;pitch.querySelector('octave').textContent=String(result.octave);
    setAlter(pitch,'alter',result.alter,pitch.querySelector('octave'));
    const accidental=note.querySelector('accidental');
    // Let the target key determine implicit accidentals; preserve explicit/cautionary signs.
    if(accidental)accidental.textContent=({'-2':'flat-flat','-1':'flat','0':'natural','1':'sharp','2':'double-sharp'})[result.alter]||'natural';
    return true;
  }
  function transposeMeasureRange(xmlDoc,fromNumber,toNumber,semitones,options={}){
    const result={notes:0,harmonies:0,measures:0};
    for(const measure of xmlDoc.querySelectorAll('part > measure')){
      const number=Number(measure.getAttribute('number'));
      if(!Number.isFinite(number)||number<Number(fromNumber)||number>Number(toNumber))continue;
      result.measures++;
      for(const note of measure.querySelectorAll('note')){
        if(!note.querySelector('pitch'))continue;
        if(options.transposeNote){options.transposeNote(note,semitones);result.notes++;}
        else if(transposeNoteElement(note,options.interval||intervalFromSemitones(semitones,options.preferFlat)))result.notes++;
      }
      result.harmonies+=transposeMeasureHarmonies(measure,semitones,options);
      if(options.transposeKey)for(const key of measure.querySelectorAll('key'))options.transposeKey(key,semitones);
    }
    return result;
  }
  function transposeDocument(xmlDoc,semitones,options={}){
    if(!Number.isInteger(semitones))throw new Error('반음 수는 정수여야 합니다.');
    const result={notes:0,harmonies:0,keys:0,parts:0};
    const originalFirstFifths=Number(xmlDoc.querySelector('key fifths')?.textContent||0);
    for(const part of xmlDoc.querySelectorAll('score-partwise > part')){
      result.parts++;
      let fifths=Number(part.querySelector('key fifths')?.textContent||0),mode=part.querySelector('key mode')?.textContent||'major';
      for(const measure of part.querySelectorAll(':scope > measure')){
        const key=measure.querySelector('attributes > key');
        if(key){fifths=Number(key.querySelector('fifths')?.textContent||0);mode=key.querySelector('mode')?.textContent||mode;}
        const target=Number.isFinite(options.targetFifths)&&fifths===originalFirstFifths?options.targetFifths:keyFifthsAfter(fifths,semitones,options.preferFlat);
        const interval=keyInterval(fifths,target,semitones,mode);
        for(const note of measure.querySelectorAll('note'))if(transposeNoteElement(note,interval))result.notes++;
        result.harmonies+=transposeMeasureHarmonies(measure,semitones,{interval});
        if(key?.querySelector('fifths')){key.querySelector('fifths').textContent=String(target);result.keys++;}
        // Sounding pitch = written pitch + instrument transpose. Shifting written notes
        // by the same interval while preserving <transpose> preserves this relation.
        // respectInstrumentTranspose defaults true; metadata is always preserved.
      }
    }
    return result;
  }
  global.TransposeCore={transposeHarmony,transposeMeasureHarmonies,transposeDocHarmonies,transposeMeasureRange,intervalFromSemitones,transposePitch,keyFifthsAfter,preferFlatForKey,transposeDocument};
})(window);
