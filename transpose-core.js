// 음표·코드심볼·조표를 함께 옮기는 조옮김 순수 로직
(function(global){
  'use strict';
  const STEP_TO_SEMI={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const SEMI_TO_STEP=[['C',0],['C',1],['D',0],['E',-1],['E',0],['F',0],['F',1],['G',0],['A',-1],['A',0],['B',-1],['B',0]];
  const mod=(n,d)=>((n%d)+d)%d;
  function transposeHarmony(harmonyEl,semitones){
    let changed=false;
    for(const name of ['root','bass']){
      const parent=harmonyEl.querySelector(name);
      const step=parent?.querySelector(`${name}-step`);
      if(!step||!(step.textContent in STEP_TO_SEMI))continue;
      let alter=parent.querySelector(`${name}-alter`);
      const pitch=STEP_TO_SEMI[step.textContent]+Number(alter?.textContent||0);
      const [newStep,newAlter]=SEMI_TO_STEP[mod(pitch+semitones,12)];
      step.textContent=newStep;
      if(newAlter){
        if(!alter){alter=parent.ownerDocument.createElement(`${name}-alter`);parent.appendChild(alter);}
        alter.textContent=String(newAlter);
      }else alter?.remove();
      changed=true;
    }
    return changed;
  }
  function transposeMeasureHarmonies(measureEl,semitones){
    return Array.from(measureEl.querySelectorAll('harmony')).reduce((count,h)=>count+Number(transposeHarmony(h,semitones)),0);
  }
  function transposeDocHarmonies(xmlDoc,semitones){return transposeMeasureHarmonies(xmlDoc,semitones);}
  function transposeMeasureRange(xmlDoc,fromNumber,toNumber,semitones,options={}){
    const result={notes:0,harmonies:0,measures:0};
    for(const measure of xmlDoc.querySelectorAll('part > measure')){
      const number=Number(measure.getAttribute('number'));
      if(!Number.isFinite(number)||number<Number(fromNumber)||number>Number(toNumber))continue;
      result.measures++;
      for(const note of measure.querySelectorAll('note')){
        if(!note.querySelector('pitch'))continue;
        if(options.transposeNote){options.transposeNote(note,semitones);result.notes++;}
      }
      result.harmonies+=transposeMeasureHarmonies(measure,semitones);
      if(options.transposeKey)for(const key of measure.querySelectorAll('key'))options.transposeKey(key,semitones);
    }
    return result;
  }
  global.TransposeCore={transposeHarmony,transposeMeasureHarmonies,transposeDocHarmonies,transposeMeasureRange};
})(window);
