(function(global){
  'use strict';

  const STEP_TO_PC={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const KO_TO_PC={'도':0,'레':2,'미':4,'파':5,'솔':7,'라':9,'시':11};
  const RHYTHM_TO_RATIO={'1':4,'2':2,'4':1,'8':0.5,'16':0.25,'32':0.125,'𝅝':4,'𝅗𝅥':2,'♩':1,'♪':0.5,'♫':0.25};

  function parsePitchToken(token){
    const clean=String(token||'').trim();
    if(clean in KO_TO_PC)return KO_TO_PC[clean];
    const match=clean.match(/^([A-Ga-g])([#♯b♭]?)/);
    if(!match)return null;
    let pc=STEP_TO_PC[match[1].toUpperCase()];
    const acc=match[2];
    if(acc==='#'||acc==='♯')pc++;
    if(acc==='b'||acc==='♭')pc--;
    return ((pc%12)+12)%12;
  }

  function parsePitchPattern(input){
    return String(input||'').split(/\s+/).map(parsePitchToken).filter(v=>v!==null);
  }

  function parseRhythmPattern(input){
    return String(input||'').split(/\s+/).map(t=>RHYTHM_TO_RATIO[t.trim()]).filter(v=>v!==undefined);
  }

  function noteMidi(note){
    if(!note||note.querySelector('rest'))return null;
    const step=note.querySelector('step')?.textContent;
    if(STEP_TO_PC[step]===undefined)return null;
    const oct=parseInt(note.querySelector('octave')?.textContent||'4',10);
    const alter=parseInt(note.querySelector('alter')?.textContent||'0',10);
    return (oct+1)*12+STEP_TO_PC[step]+alter;
  }

  function getPartNames(xmlDoc){
    const names=new Map();
    xmlDoc.querySelectorAll('part-list score-part').forEach((sp,idx)=>{
      const id=sp.getAttribute('id')||`P${idx+1}`;
      names.set(id,sp.querySelector('part-name')?.textContent||id);
    });
    return names;
  }

  function extractNotes(xmlDoc){
    const names=getPartNames(xmlDoc);
    const rows=[];
    xmlDoc.querySelectorAll('part').forEach((part,partIdx)=>{
      const partId=part.getAttribute('id')||`P${partIdx+1}`;
      const partName=names.get(partId)||partId;
      let div=1;
      part.querySelectorAll('measure').forEach(measure=>{
        const next=parseFloat(measure.querySelector('attributes divisions, divisions')?.textContent||'');
        if(next>0)div=next;
        let beat=1;
        measure.querySelectorAll('note').forEach((note,noteIdx)=>{
          const isChord=!!note.querySelector('chord');
          const dur=parseFloat(note.querySelector('duration')?.textContent||'0')||0;
          const midi=noteMidi(note);
          if(midi!==null){
            rows.push({
              node:note,
              partIdx,partId,partName,
              measureNum:parseInt(measure.getAttribute('number')||'1',10),
              beatIdx:Number(beat.toFixed(3)),
              noteIdx,
              midi,
              pc:((midi%12)+12)%12,
              ratio:dur/div,
            });
          }
          if(!isChord)beat+=dur/div;
        });
      });
    });
    return rows;
  }

  function groupByPart(notes){
    const map=new Map();
    notes.forEach(n=>{
      if(!map.has(n.partIdx))map.set(n.partIdx,[]);
      map.get(n.partIdx).push(n);
    });
    return map;
  }

  function makeMatch(seq,start,len,kind,pattern){
    const notes=seq.slice(start,start+len);
    return {
      kind,
      pattern,
      partIdx:notes[0].partIdx,
      partName:notes[0].partName,
      measureNum:notes[0].measureNum,
      beatIdx:notes[0].beatIdx,
      noteIndices:notes.map(n=>n.noteIdx),
      notes,
    };
  }

  function searchPitchPattern(xmlDoc,pattern,options={}){
    const mode=options.mode||'pc';
    const hits=[];
    groupByPart(extractNotes(xmlDoc)).forEach(seq=>{
      for(let i=0;i<=seq.length-pattern.length;i++){
        const ok=pattern.every((p,j)=>mode==='absolute'?seq[i+j].midi===p:seq[i+j].pc===p);
        if(ok)hits.push(makeMatch(seq,i,pattern.length,'pitch',pattern.join('-')));
      }
    });
    return hits;
  }

  function closeRatio(a,b){
    return Math.abs(a-b)<=Math.max(0.001,b*0.05);
  }

  function searchRhythmPattern(xmlDoc,pattern){
    const hits=[];
    groupByPart(extractNotes(xmlDoc)).forEach(seq=>{
      for(let i=0;i<=seq.length-pattern.length;i++){
        const ok=pattern.every((p,j)=>closeRatio(seq[i+j].ratio,p));
        if(ok)hits.push(makeMatch(seq,i,pattern.length,'rhythm',pattern.join('-')));
      }
    });
    return hits;
  }

  function detectMotifs(xmlDoc){
    const motifs=new Map();
    groupByPart(extractNotes(xmlDoc)).forEach(seq=>{
      for(let len=2;len<=6;len++){
        for(let i=0;i<=seq.length-len;i++){
          const pcs=seq.slice(i,i+len).map(n=>n.pc);
          const exact=pcs.join('-');
          const intervals=pcs.slice(1).map((pc,j)=>((pc-pcs[j]+12)%12)).join('-');
          const key=exact;
          if(!motifs.has(key))motifs.set(key,{pattern:key,length:len,count:0,variant:'정확한 반복',locations:[]});
          const item=motifs.get(key);
          item.count++;
          item.locations.push(makeMatch(seq,i,len,'motif',key));
          const variantKey=`I:${intervals}`;
          if(intervals&&variantKey!==key){
            if(!motifs.has(variantKey))motifs.set(variantKey,{pattern:variantKey,length:len,count:0,variant:'조바꿈 변형',locations:[]});
            const variant=motifs.get(variantKey);
            variant.count++;
            variant.locations.push(makeMatch(seq,i,len,'motif',variantKey));
          }
        }
      }
    });
    return Array.from(motifs.values()).filter(m=>m.count>=2).sort((a,b)=>b.count-a.count||a.length-b.length);
  }

  function ensureNotehead(doc,note,color){
    let notehead=note.querySelector('notehead');
    if(!notehead){
      notehead=doc.createElement('notehead');
      notehead.textContent='normal';
      const before=note.querySelector('stem')||note.querySelector('beam')||note.querySelector('notations')||note.querySelector('lyric');
      if(before)note.insertBefore(notehead,before);else note.appendChild(notehead);
    }
    notehead.setAttribute('color',color);
    notehead.setAttribute('filled','yes');
  }

  function highlightMatches(xmlDoc,matches,color='#FF6B6B'){
    let count=0;
    (matches||[]).forEach(match=>{
      (match.notes||[]).forEach(n=>{
        ensureNotehead(xmlDoc,n.node,color);
        count++;
      });
    });
    return {count};
  }

  function distribution(matches){
    const byFile={},byPart={};
    (matches||[]).forEach(m=>{
      byFile[m.fileName||'현재 파일']=(byFile[m.fileName||'현재 파일']||0)+1;
      byPart[m.partName||`Part ${m.partIdx+1}`]=(byPart[m.partName||`Part ${m.partIdx+1}`]||0)+1;
    });
    return {byFile,byPart};
  }

  global.PatternSearchCore={
    parsePitchPattern,
    parseRhythmPattern,
    extractNotes,
    searchPitchPattern,
    searchRhythmPattern,
    detectMotifs,
    highlightMatches,
    distribution,
  };
})(window);
