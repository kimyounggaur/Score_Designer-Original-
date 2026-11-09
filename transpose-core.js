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
  const ATTRIBUTE_ORDER=['footnote','level','divisions','key','time','staves','part-symbol','instruments','clef','staff-details','transpose','for-part','directive','measure-style'];
  const measureNumberOf=measure=>{const raw=measure.getAttribute('number');return raw==null||raw.trim()===''?NaN:Number(raw);};
  const childElements=(element,name)=>Array.from(element?.children||[]).filter(child=>child.localName===name);
  function firstKeyOf(measure){
    const keys=Array.from(measure.querySelectorAll(':scope > attributes > key'));
    return keys.find(key=>!key.hasAttribute('number')||key.getAttribute('number')==='1')||keys[0]||null;
  }
  function insertLeadingKey(measure,fifths,mode){
    const doc=measure.ownerDocument;
    let attributes=null;
    for(const child of Array.from(measure.children)){
      if(child.localName==='attributes'){attributes=child;break;}
      if(['note','backup','forward'].includes(child.localName))break;
    }
    if(!attributes){attributes=doc.createElement('attributes');measure.insertBefore(attributes,Array.from(measure.children).find(child=>child.localName!=='print')||null);}
    const key=doc.createElement('key'),fifthsEl=doc.createElement('fifths'),modeEl=doc.createElement('mode');
    fifthsEl.textContent=String(fifths);modeEl.textContent=mode||'major';key.append(fifthsEl,modeEl);
    const rank=ATTRIBUTE_ORDER.indexOf('key');
    attributes.insertBefore(key,Array.from(attributes.children).find(child=>ATTRIBUTE_ORDER.indexOf(child.localName)>rank)||null);
    return key;
  }
  // 한 파트의 [from,to] 번호 마디를 semitones만큼 옮깁니다. 음표 철자는 그 시점 조표 기준 음정(keyInterval)으로 정합니다.
  // options.startFifths/startMode: 구간 시작 시점의 원래 조. 앞 구간이 이미 바뀐 문서에서도 원본 기준을 쓰기 위해 받습니다.
  // options.targetFifths: 시작 조의 목표 조표(없으면 keyFifthsAfter). 구간 안의 기존 조바꿈은 같은 반음 수만큼 옮겨 상대 관계를 유지합니다.
  // options.ensureKey(기본 true): 시작 마디에 key가 없고 그 앞에 표기된 조표가 목표와 다르면 key를 삽입합니다.
  function transposePartRange(partEl,fromNumber,toNumber,semitones,options={}){
    if(!Number.isInteger(semitones))throw new Error('반음 수는 정수여야 합니다.');
    const from=Number(fromNumber),to=Number(toNumber);
    const result={notes:0,harmonies:0,keys:0,measures:0,insertedKey:false,startFifths:null,targetFifths:null};
    let shownFifths=0,shownMode='major',interval=null,mode='major',started=false;
    for(const measure of childElements(partEl,'measure')){
      const number=measureNumberOf(measure);
      if(Number.isFinite(number)&&number>to)break;
      const key=firstKeyOf(measure),keyFifths=key?.querySelector('fifths');
      const inRange=Number.isFinite(number)&&number>=from;
      if(!inRange){
        if(keyFifths){shownFifths=Number(keyFifths.textContent)||0;shownMode=key.querySelector('mode')?.textContent||shownMode;}
        continue;
      }
      result.measures++;
      if(!started){
        const startFifths=Number.isFinite(options.startFifths)?Number(options.startFifths):keyFifths?Number(keyFifths.textContent)||0:shownFifths;
        mode=options.startMode||key?.querySelector('mode')?.textContent||shownMode;
        const target=Number.isFinite(options.targetFifths)?Number(options.targetFifths):keyFifthsAfter(startFifths,semitones,options.preferFlat);
        interval=keyInterval(startFifths,target,semitones,mode);
        result.startFifths=startFifths;result.targetFifths=target;
        if(keyFifths){keyFifths.textContent=String(target);result.keys++;}
        else if(options.ensureKey!==false&&shownFifths!==target){insertLeadingKey(measure,target,mode);result.keys++;result.insertedKey=true;}
        started=true;
      }else if(keyFifths){
        const fifths=Number(keyFifths.textContent)||0;mode=key.querySelector('mode')?.textContent||mode;
        const target=keyFifthsAfter(fifths,semitones,options.preferFlat);
        interval=keyInterval(fifths,target,semitones,mode);
        keyFifths.textContent=String(target);result.keys++;
      }
      if(!interval.diatonic&&!interval.chromatic)continue;
      for(const note of measure.querySelectorAll('note'))if(transposeNoteElement(note,interval))result.notes++;
      result.harmonies+=transposeMeasureHarmonies(measure,semitones,{interval});
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
  global.TransposeCore={transposeHarmony,transposeMeasureHarmonies,transposeDocHarmonies,transposeMeasureRange,intervalFromSemitones,transposePitch,keyFifthsAfter,preferFlatForKey,keyTonic,keyInterval,transposePartRange,transposeDocument};
})(window);
