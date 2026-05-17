(function(global){
  'use strict';

  const RECORDER_FINGERING = {
    C5:[1,1,1,1,1,1,1,1],
    D5:[1,1,1,1,1,1,1,0],
    E5:[1,1,1,1,1,1,0,0],
    F5:[1,1,1,1,1,0,1,0],
    G5:[1,1,1,1,0,0,0,0],
    A5:[1,1,1,0,0,0,0,0],
    B5:[1,1,0,0,0,0,0,0],
    C6:[1,0,1,1,0,0,0,0],
    D6:[0,0,1,1,0,0,0,0],
    E6:[1,1,1,1,1,1,0,1],
    F6:[1,1,1,1,1,0,0,1],
    G6:[1,1,1,0,1,1,0,0],
    A6:[1,1,0,0,1,1,0,0],
    B6:[1,0,1,0,1,0,0,0],
    C7:[0.5,0,1,0,0,0,0,0],
    D7:[0.5,0,1,1,0,0,0,0],
  };

  const ALTO_RECORDER_FINGERING = {
    F4:[1,1,1,1,1,1,1,1],
    G4:[1,1,1,1,1,1,1,0],
    A4:[1,1,1,1,1,1,0,0],
    Bb4:[1,1,1,1,1,0,1,0],
    C5:[1,1,1,1,0,0,0,0],
    D5:[1,1,1,0,0,0,0,0],
    E5:[1,1,0,0,0,0,0,0],
    F5:[1,0,1,1,0,0,0,0],
    G5:[0,0,1,1,0,0,0,0],
    A5:[1,1,1,1,1,1,0,1],
    Bb5:[1,1,1,1,1,0,0,1],
    C6:[1,1,1,0,1,1,0,0],
    D6:[1,1,0,0,1,1,0,0],
    E6:[1,0,1,0,1,0,0,0],
    F6:[0.5,0,1,0,0,0,0,0],
    G6:[0.5,0,1,1,0,0,0,0],
  };

  const KALIMBA_FINGERING = {
    C4:16,D4:14,E4:12,F4:10,G4:8,A4:6,B4:4,
    C5:1,D5:2,E5:3,F5:5,G5:7,A5:9,B5:11,
    C6:13,D6:15,E6:17,
  };

  const OCARINA_FINGERING = {
    C5:[1,1,1,1,1,1,1,1],
    D5:[1,1,1,1,1,1,1,0],
    E5:[1,1,1,1,1,1,0,0],
    F5:[1,1,1,1,1,0,0,0],
    G5:[1,1,1,1,0,0,0,0],
    A5:[1,1,1,0,0,0,0,0],
    B5:[1,1,0,0,0,0,0,0],
    C6:[1,0,0,0,0,0,0,0],
    D6:[0,0,0,0,0,0,0,0],
  };

  const INSTRUMENTS = {
    recorder:{label:'소프라노 리코더',type:'holes',data:RECORDER_FINGERING},
    altoRecorder:{label:'알토 리코더',type:'holes',data:ALTO_RECORDER_FINGERING},
    kalimba:{label:'칼림바 17키',type:'kalimba',data:KALIMBA_FINGERING},
    ocarina:{label:'오카리나',type:'holes',data:OCARINA_FINGERING},
  };

  function accidentalName(alter){
    if(alter===1)return '#';
    if(alter===-1)return 'b';
    return '';
  }

  function getNoteName(note){
    if(!note||note.querySelector('rest'))return null;
    const pitch=note.querySelector('pitch');
    if(!pitch)return null;
    const step=pitch.querySelector('step')?.textContent;
    const octave=pitch.querySelector('octave')?.textContent;
    if(!step||!octave)return null;
    const alter=parseInt(pitch.querySelector('alter')?.textContent||'0',10);
    return `${step}${accidentalName(alter)}${octave}`;
  }

  function patternToText(pattern){
    return Array.from(pattern||[]).map(v=>v===1?'●':v===0.5?'◐':'○').join('');
  }

  function getFingering(instrument,noteName){
    const cfg=INSTRUMENTS[instrument]||INSTRUMENTS.recorder;
    const raw=cfg.data[noteName];
    if(raw===undefined)return null;
    if(cfg.type==='kalimba')return {instrument,type:cfg.type,noteName,value:raw,display:String(raw)};
    return {instrument,type:cfg.type,noteName,value:raw,pattern:patternToText(raw),display:patternToText(raw)};
  }

  function getParts(xmlDoc){
    const partList=xmlDoc.querySelector('part-list');
    const names=new Map();
    if(partList){
      partList.querySelectorAll('score-part').forEach(sp=>{
        names.set(sp.getAttribute('id'),sp.querySelector('part-name')?.textContent||sp.getAttribute('id'));
      });
    }
    return Array.from(xmlDoc.querySelectorAll('part')).map((part,index)=>({
      id:part.getAttribute('id')||`P${index+1}`,
      name:names.get(part.getAttribute('id'))||part.getAttribute('id')||`Part ${index+1}`,
    }));
  }

  function getTargetParts(xmlDoc,partId){
    if(!partId||partId==='all')return Array.from(xmlDoc.querySelectorAll('part'));
    return Array.from(xmlDoc.querySelectorAll('part')).filter(part=>part.getAttribute('id')===partId);
  }

  function collectNoteFingerings(xmlDoc,instrument,partId){
    const rows=[];
    getTargetParts(xmlDoc,partId).forEach(part=>{
      const partName=part.getAttribute('id')||'';
      part.querySelectorAll('measure').forEach(measure=>{
        const measureNo=measure.getAttribute('number')||'';
        measure.querySelectorAll('note').forEach(note=>{
          const noteName=getNoteName(note);
          if(!noteName)return;
          const fingering=getFingering(instrument,noteName);
          rows.push({partId:partName,measure:measureNo,noteName,found:!!fingering,...(fingering||{display:'-'})});
        });
      });
    });
    return rows;
  }

  function ensureTechnicalFingering(doc,note,text){
    note.querySelectorAll('notations technical fingering').forEach(el=>{
      if(el.getAttribute('font-family')==='MXL-Fingering')el.remove();
    });
    let notations=note.querySelector('notations');
    if(!notations){notations=doc.createElement('notations');note.appendChild(notations);}
    let technical=notations.querySelector('technical');
    if(!technical){technical=doc.createElement('technical');notations.appendChild(technical);}
    const fingering=doc.createElement('fingering');
    fingering.setAttribute('placement','above');
    fingering.setAttribute('font-family','MXL-Fingering');
    fingering.textContent=text;
    technical.appendChild(fingering);
  }

  function ensureLyricFingering(doc,note,text){
    note.querySelectorAll('lyric').forEach(lyric=>{
      if(lyric.getAttribute('number')==='9')lyric.remove();
    });
    const lyric=doc.createElement('lyric');
    lyric.setAttribute('number','9');
    const syllabic=doc.createElement('syllabic');
    syllabic.textContent='single';
    const textEl=doc.createElement('text');
    textEl.textContent=text;
    lyric.appendChild(syllabic);
    lyric.appendChild(textEl);
    note.appendChild(lyric);
  }

  function insertFingerings(xmlDoc,instrument,partId){
    const cfg=INSTRUMENTS[instrument]||INSTRUMENTS.recorder;
    let count=0;
    let missing=0;
    getTargetParts(xmlDoc,partId).forEach(part=>{
      part.querySelectorAll('note').forEach(note=>{
        const noteName=getNoteName(note);
        if(!noteName)return;
        const fingering=getFingering(instrument,noteName);
        if(!fingering){missing++;return;}
        if(cfg.type==='kalimba')ensureLyricFingering(xmlDoc,note,fingering.display);
        else ensureTechnicalFingering(xmlDoc,note,fingering.display);
        count++;
      });
    });
    return {count,missing};
  }

  global.FingeringCore = {
    RECORDER_FINGERING,
    ALTO_RECORDER_FINGERING,
    KALIMBA_FINGERING,
    OCARINA_FINGERING,
    INSTRUMENTS,
    getNoteName,
    patternToText,
    getFingering,
    getParts,
    collectNoteFingerings,
    insertFingerings,
  };
})(window);
