(function(global){
  'use strict';

  const KEY_FIFTHS = [0,-5,2,-3,4,-1,6,1,-4,3,-2,5];
  const KEY_NAMES = ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const STYLE_SHEET = `<style>@import url('https://fonts.googleapis.com/css2?family=Inter');</style>`;

  function text(xmlDoc,selector,fallback=''){
    return xmlDoc.querySelector(selector)?.textContent || fallback;
  }

  function safeName(name){
    return (name||'score').replace(/\.(mxl|xml|musicxml)$/i,'').replace(/[\\/:*?"<>|]+/g,'_') || 'score';
  }

  function getDivisions(measure,current=1){
    const next=parseFloat(measure.querySelector('attributes divisions, divisions')?.textContent||'');
    return next>0?next:current;
  }

  function durationToABC(dur,div){
    const units=Math.max(1,Math.round((dur/div)*2));
    return units===1?'':String(units);
  }

  function durationToLily(dur,div){
    return String(Math.max(1,Math.round((div*4)/dur)));
  }

  function toABCNote(note,div){
    const dur=parseFloat(note.querySelector('duration')?.textContent||'1')||1;
    const len=durationToABC(dur,div);
    if(note.querySelector('rest'))return `z${len}`;
    const step=note.querySelector('step')?.textContent || 'C';
    const oct=parseInt(note.querySelector('octave')?.textContent||'4',10);
    const alter=parseFloat(note.querySelector('alter')?.textContent||'0')||0;
    let abcStep=step;
    if(alter===1)abcStep='^'+abcStep;
    if(alter===-1)abcStep='_'+abcStep;
    if(oct>=5)abcStep=abcStep.toLowerCase();
    if(oct<=3)abcStep=abcStep+','.repeat(4-oct);
    return `${abcStep}${len}`;
  }

  function toABC(xmlDoc){
    const title=text(xmlDoc,'movement-title, work-title','Untitled');
    const composer=text(xmlDoc,'creator[type="composer"]','');
    const fifths=parseInt(text(xmlDoc,'key fifths','0'),10);
    const keyIdx=KEY_FIFTHS.indexOf(fifths);
    const keyName=KEY_NAMES[keyIdx>=0?keyIdx:0] || 'C';
    const beats=text(xmlDoc,'beats','4');
    const beatType=text(xmlDoc,'beat-type','4');
    let abc=`X:1\nT:${title}\nC:${composer}\nM:${beats}/${beatType}\nL:1/8\nK:${keyName}\n`;
    const firstPart=xmlDoc.querySelector('part');
    let div=1;
    let barCount=0;
    firstPart?.querySelectorAll('measure').forEach(measure=>{
      div=getDivisions(measure,div);
      measure.querySelectorAll('note').forEach(note=>{
        if(note.querySelector('chord'))return;
        abc+=toABCNote(note,div)+' ';
      });
      abc+='| ';
      barCount++;
      if(barCount%4===0)abc+='\n';
    });
    return abc.trimEnd();
  }

  function lilyPitch(step,alter){
    let base=(step||'c').toLowerCase();
    if(alter===1)base+='is';
    if(alter===-1)base+=(base==='e'||base==='a')?'s':'es';
    return base;
  }

  function escapeLilyString(value){
    return String(value||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
  }

  function toLilypond(xmlDoc){
    const title=text(xmlDoc,'movement-title, work-title','Untitled');
    const composer=text(xmlDoc,'creator[type="composer"]','');
    let ly=`\\\\version "2.24.0"\n\\\\header {\n  title = "${escapeLilyString(title)}"\n  composer = "${escapeLilyString(composer)}"\n}\n\n`;
    const partNames=new Map();
    xmlDoc.querySelectorAll('score-part').forEach((sp,idx)=>{
      const id=sp.getAttribute('id')||`P${idx+1}`;
      partNames.set(id,sp.querySelector('part-name')?.textContent||`Part${idx+1}`);
    });
    xmlDoc.querySelectorAll('part').forEach((part,pi)=>{
      const pid=part.getAttribute('id')||`P${pi+1}`;
      const partName=partNames.get(pid)||`Part${pi+1}`;
      ly+=`${partName.replace(/\s+/g,'_')} = \\\\relative c' {\n`;
      let prevOct=4;
      let div=1;
      part.querySelectorAll('measure').forEach(measure=>{
        div=getDivisions(measure,div);
        const beats=measure.querySelector('beats')?.textContent;
        const beatType=measure.querySelector('beat-type')?.textContent;
        if(beats&&beatType)ly+=`  \\\\time ${beats}/${beatType}\n`;
        measure.querySelectorAll('note').forEach(note=>{
          if(note.querySelector('chord'))return;
          const dur=parseFloat(note.querySelector('duration')?.textContent||'1')||1;
          const lilyDur=durationToLily(dur,div);
          if(note.querySelector('rest')){ly+=`r${lilyDur} `;return;}
          const step=(note.querySelector('step')?.textContent||'c').toLowerCase();
          const oct=parseInt(note.querySelector('octave')?.textContent||'4',10);
          const alter=parseFloat(note.querySelector('alter')?.textContent||'0')||0;
          let lilyStep=lilyPitch(step,alter);
          const octDiff=oct-prevOct;
          if(octDiff>0)lilyStep+="'".repeat(octDiff);
          if(octDiff<0)lilyStep+=",".repeat(-octDiff);
          prevOct=oct;
          ly+=`${lilyStep}${lilyDur} `;
        });
        ly+='|\n';
      });
      ly+='}\n\n';
    });
    return ly;
  }

  function serializeSVG(svgEl){
    if(!svgEl)throw new Error('SVG를 찾을 수 없습니다.');
    const cloned=svgEl.cloneNode(true);
    const fragment=document.createRange().createContextualFragment(STYLE_SHEET);
    cloned.insertBefore(fragment,cloned.firstChild);
    return new XMLSerializer().serializeToString(cloned);
  }

  global.ExportFormatsCore = {
    KEY_FIFTHS,
    KEY_NAMES,
    STYLE_SHEET,
    safeName,
    toABC,
    toLilypond,
    serializeSVG,
  };
})(window);
