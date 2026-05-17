(function(global){
  'use strict';

  const STEP_TO_SEMI = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};

  function pitchToMidi(note){
    if(!note||note.querySelector('rest'))return null;
    const pitch=note.querySelector('pitch');
    if(!pitch)return null;
    const step=pitch.querySelector('step')?.textContent;
    const octave=parseInt(pitch.querySelector('octave')?.textContent||'0',10);
    const alter=parseInt(pitch.querySelector('alter')?.textContent||'0',10);
    if(STEP_TO_SEMI[step]===undefined)return null;
    return (octave+1)*12+STEP_TO_SEMI[step]+alter;
  }

  function intervalClass(a,b){
    return Math.abs(a-b)%12;
  }

  function simpleInterval(a,b){
    const diff=Math.abs(a-b);
    if(diff%12===0&&diff>0)return 12;
    return diff%12;
  }

  function pairNotes(notes){
    const sorted=Array.from(notes||[]).sort((a,b)=>a.partIdx-b.partIdx);
    const pairs=[];
    for(let i=0;i<sorted.length;i++){
      for(let j=i+1;j<sorted.length;j++)pairs.push([sorted[i],sorted[j]]);
    }
    return pairs;
  }

  function findByPart(notes,partIdx){
    return (notes||[]).find(n=>n.partIdx===partIdx);
  }

  function baseViolation(type,severity,note,parts,description,extra){
    return {
      type,
      severity,
      measure:note?.measure||1,
      beat:note?.beat||1,
      parts,
      description,
      suggestion:makeSuggestion(type,note,parts),
      ...(extra||{}),
    };
  }

  function makeSuggestion(type,note,parts){
    const where=`마디 ${note?.measure||1}, ${note?.beat||1}박`;
    if(type==='평행5도')return `${where}: 두 성부 중 한 성부를 순차진행으로 바꾸거나 반대방향 진행을 사용하면 평행5도를 피할 수 있습니다.`;
    if(type==='평행옥타브')return `${where}: 한 성부를 2도 이동하거나 내성부를 유지해 옥타브 중복 진행을 줄이세요.`;
    if(type==='숨은5도')return `${where}: 소프라노 도약을 순차진행으로 줄이면 숨은5도 위험이 낮아집니다.`;
    if(type==='성부교차')return `${where}: ${parts?.join(' / ')||'성부'}의 상대 음역을 되돌려 상위 성부가 위에 놓이게 하세요.`;
    if(type==='큰 도약')return `${where}: 도약을 옥타브 이내로 줄이거나 중간 경과음을 추가하세요.`;
    if(type==='연속 도약')return `${where}: 같은 방향 도약 사이에 반대방향 순차진행을 넣어 균형을 만드세요.`;
    return `${where}: 해당 진행을 인접음 중심으로 조정해 보세요.`;
  }

  function checkParallelFifths(notes1,notes2){
    const out=[];
    pairNotes(notes1).forEach(([a1,b1])=>{
      const a2=findByPart(notes2,a1.partIdx);
      const b2=findByPart(notes2,b1.partIdx);
      if(!a2||!b2)return;
      if(intervalClass(a1.midi,b1.midi)===7&&intervalClass(a2.midi,b2.midi)===7){
        out.push(baseViolation('평행5도','error',a2,[a2.partName,b2.partName],`${a2.partName}와 ${b2.partName} 사이에 연속 완전5도가 나타납니다.`,{interval:7}));
      }
    });
    return out;
  }

  function checkParallelOctaves(notes1,notes2){
    const out=[];
    pairNotes(notes1).forEach(([a1,b1])=>{
      const a2=findByPart(notes2,a1.partIdx);
      const b2=findByPart(notes2,b1.partIdx);
      if(!a2||!b2)return;
      if(simpleInterval(a1.midi,b1.midi)===12&&simpleInterval(a2.midi,b2.midi)===12){
        out.push(baseViolation('평행옥타브','error',a2,[a2.partName,b2.partName],`${a2.partName}와 ${b2.partName} 사이에 연속 옥타브가 나타납니다.`,{interval:12}));
      }
    });
    return out;
  }

  function checkHiddenFifths(notes1,notes2){
    const out=[];
    const parts=Array.from(new Set([...(notes1||[]),...(notes2||[])].map(n=>n.partIdx))).sort((a,b)=>a-b);
    if(parts.length<2)return out;
    const top=parts[0],bottom=parts[parts.length-1];
    const s1=findByPart(notes1,top),b1=findByPart(notes1,bottom),s2=findByPart(notes2,top),b2=findByPart(notes2,bottom);
    if(!s1||!b1||!s2||!b2)return out;
    const sMove=s2.midi-s1.midi,bMove=b2.midi-b1.midi;
    if(!sMove||!bMove||Math.sign(sMove)!==Math.sign(bMove))return out;
    const target=simpleInterval(s2.midi,b2.midi);
    if((target===7||target===12)&&Math.abs(sMove)>=3){
      out.push(baseViolation('숨은5도','warning',s2,[s2.partName,b2.partName],`${s2.partName}와 ${b2.partName}가 같은 방향으로 움직여 완전${target===12?'8':'5'}도에 도달합니다.`,{interval:target}));
    }
    return out;
  }

  function checkVoiceCrossing(notes1,notes2){
    const out=[];
    pairNotes(notes2).forEach(([upper,lower])=>{
      if(upper.midi<lower.midi){
        out.push(baseViolation('성부교차','error',upper,[upper.partName,lower.partName],`${upper.partName} 음이 ${lower.partName}보다 낮아졌습니다.`));
      }
    });
    return out;
  }

  function checkLargeLeap(note1,note2,partName){
    if(!note1||!note2)return [];
    const leap=Math.abs(note2.midi-note1.midi);
    if(leap>=13){
      return [baseViolation('큰 도약','warning',note2,[partName],`${partName}에서 ${leap}반음 도약이 나타납니다.`,{leap})];
    }
    return [];
  }

  function checkConsecutiveLeaps(noteSeq){
    const out=[];
    let run=0,lastDir=0;
    for(let i=1;i<noteSeq.length;i++){
      const diff=noteSeq[i].midi-noteSeq[i-1].midi;
      const dir=Math.sign(diff);
      if(Math.abs(diff)>=3&&dir!==0&&dir===lastDir)run++;
      else run=Math.abs(diff)>=3?1:0;
      lastDir=Math.abs(diff)>=3?dir:0;
      if(run>=3){
        const n=noteSeq[i];
        out.push(baseViolation('연속 도약','info',n,[n.partName],`${n.partName}에서 같은 방향 도약이 3회 이상 이어집니다.`));
        run=0;
      }
    }
    return out;
  }

  function getPartNames(xmlDoc){
    const names=new Map();
    xmlDoc.querySelectorAll('part-list score-part').forEach((sp,idx)=>{
      const id=sp.getAttribute('id')||`P${idx+1}`;
      names.set(id,sp.querySelector('part-name')?.textContent||id);
    });
    return names;
  }

  function extractPartNotes(xmlDoc){
    const names=getPartNames(xmlDoc);
    return Array.from(xmlDoc.querySelectorAll('part')).map((part,partIdx)=>{
      const partId=part.getAttribute('id')||`P${partIdx+1}`;
      const partName=names.get(partId)||partId;
      let divisions=1;
      const notes=[];
      part.querySelectorAll('measure').forEach(measure=>{
        const divEl=measure.querySelector('attributes divisions');
        if(divEl)divisions=parseFloat(divEl.textContent)||divisions;
        let beat=1;
        measure.querySelectorAll('note').forEach(note=>{
          const isChord=!!note.querySelector('chord');
          const dur=parseFloat(note.querySelector('duration')?.textContent||'0')||0;
          const midi=pitchToMidi(note);
          if(midi!==null){
            notes.push({midi,partIdx,partId,partName,measure:parseInt(measure.getAttribute('number')||'1',10),beat:Number(beat.toFixed(3))});
          }
          if(!isChord)beat+=dur/divisions;
        });
      });
      return {partIdx,partId,partName,notes};
    });
  }

  function makeVerticals(parts){
    const map=new Map();
    parts.forEach(part=>{
      part.notes.forEach(note=>{
        const key=`${note.measure}:${note.beat}`;
        if(!map.has(key))map.set(key,[]);
        map.get(key).push(note);
      });
    });
    return Array.from(map.entries()).map(([key,notes])=>{
      const [measure,beat]=key.split(':').map(Number);
      return {measure,beat,notes:notes.sort((a,b)=>a.partIdx-b.partIdx)};
    }).sort((a,b)=>a.measure-b.measure||a.beat-b.beat);
  }

  function uniqueViolations(violations){
    const seen=new Set();
    return violations.filter(v=>{
      const key=[v.type,v.measure,v.beat,(v.parts||[]).join('|'),v.description].join('::');
      if(seen.has(key))return false;
      seen.add(key);
      return true;
    });
  }

  function analyzeVoiceLeading(xmlDoc){
    const parts=extractPartNotes(xmlDoc);
    const verticals=makeVerticals(parts);
    let violations=[];
    for(let i=0;i<verticals.length;i++){
      const current=verticals[i];
      violations=violations.concat(checkVoiceCrossing([],current.notes));
      if(i<verticals.length-1){
        const next=verticals[i+1];
        violations=violations.concat(
          checkParallelFifths(current.notes,next.notes),
          checkParallelOctaves(current.notes,next.notes),
          checkHiddenFifths(current.notes,next.notes)
        );
      }
    }
    parts.forEach(part=>{
      for(let i=1;i<part.notes.length;i++)violations=violations.concat(checkLargeLeap(part.notes[i-1],part.notes[i],part.partName));
      violations=violations.concat(checkConsecutiveLeaps(part.notes));
    });
    violations=uniqueViolations(violations).sort((a,b)=>a.measure-b.measure||a.beat-b.beat||a.type.localeCompare(b.type));
    const counts=violations.reduce((acc,v)=>{acc[v.severity]=(acc[v.severity]||0)+1;return acc;},{error:0,warning:0,info:0});
    const score=Math.max(0,100-(counts.error*10+counts.warning*3+counts.info));
    return {parts,verticals,violations,counts,score};
  }

  global.VoiceLeadingCore = {
    checkParallelFifths,
    checkParallelOctaves,
    checkHiddenFifths,
    checkVoiceCrossing,
    checkLargeLeap,
    checkConsecutiveLeaps,
    extractPartNotes,
    analyzeVoiceLeading,
  };
})(window);
