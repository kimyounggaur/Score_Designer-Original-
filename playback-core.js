// MusicXML을 재생 이벤트 목록으로 펼치는 순수 로직
(function(global){
  'use strict';
  const PITCH={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const DYNAMICS={ppp:20,pp:33,p:49,mp:64,mf:80,f:96,ff:112,fff:126};
  const children=(element,name)=>Array.from(element?.children||[]).filter(child=>!name||child.localName===name);
  const child=(element,name)=>children(element,name)[0];
  const text=(element,name,fallback='')=>child(element,name)?.textContent??fallback;
  const clampVelocity=value=>Math.max(1,Math.min(127,Math.round(value)));
  const numericMeasure=(measure,index)=>{const raw=measure.getAttribute('number');return raw!==null&&Number.isFinite(Number(raw))?Number(raw):raw||index+1;};
  function midiToToneNote(midi){const note=Math.round(midi);return ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][((note%12)+12)%12]+(Math.floor(note/12)-1);}
  function endingPasses(value){
    const result=new Set();
    for(const token of String(value||'').split(',')){
      const match=token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!match)continue;
      for(let n=Number(match[1]);n<=Math.min(32,Number(match[2]||match[1]));n++)result.add(n);
    }
    return result;
  }
  function expandMeasureOrder(measures,expandRepeats=true){
    if(!expandRepeats)return measures.map((_,index)=>index);
    const stack=[],ranges=[],endings=[];let currentEnding=null;
    measures.forEach((measure,index)=>{
      if(measure.querySelector('repeat[direction="forward"]'))stack.push(index);
      const start=measure.querySelector('ending[type="start"]');if(start)currentEnding=endingPasses(start.getAttribute('number'));
      endings[index]=currentEnding;
      if(measure.querySelector('ending[type="stop"],ending[type="discontinue"]'))currentEnding=null;
      const backward=measure.querySelector('repeat[direction="backward"]');
      if(backward)ranges.push({start:stack.pop()??0,end:index,times:Math.max(1,Math.min(16,Number(backward.getAttribute('times'))||2))});
    });
    const passes=new Map(),order=[];let index=0,lastPass=1,steps=0;
    while(index<measures.length&&steps++<20000){
      const range=ranges.filter(r=>r.start<=index&&index<=r.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
      const pass=range?(passes.get(range.end)||1):lastPass;
      if(!endings[index]?.size||endings[index].has(pass))order.push(index);
      const end=ranges.find(r=>r.end===index);
      if(end){
        const iteration=passes.get(end.end)||1;
        if(iteration<end.times){
          passes.set(end.end,iteration+1);
          for(const nested of ranges)if(nested!==end&&nested.start>=end.start&&nested.end<end.end)passes.delete(nested.end);
          index=end.start;continue;
        }
        lastPass=iteration;
      }
      index++;
    }
    return order;
  }
  function tempoInDirection(direction){
    const sound=direction.querySelector('sound[tempo]');const bpm=Number(sound?.getAttribute('tempo'));
    if(bpm>0)return bpm;
    const metro=direction.querySelector('metronome');if(!metro)return null;
    const quarters={whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125}[text(metro,'beat-unit')]||1;
    const dots=children(metro,'beat-unit-dot').length;
    const value=Number(text(metro,'per-minute'))*quarters*(2-Math.pow(.5,dots));
    return value>0?value:null;
  }
  function parsePart(part,partIndex,id){
    let divisions=1,nominal=4,velocity=80;
    const transposeByStaff=new Map([['all',0]]);
    return children(part,'measure').map((measure,sourceIndex)=>{
      let cursor=0,lastStart=0,end=0;const notes=[],tempos=[];
      for(const node of children(measure)){
        if(node.localName==='attributes'){
          const div=Number(text(node,'divisions'));if(div>0)divisions=div;
          const time=child(node,'time');if(time){const beats=text(time,'beats','4').split('+').reduce((n,v)=>n+Number(v),0);const beatType=Number(text(time,'beat-type','4'));if(beats>0&&beatType>0)nominal=beats*4/beatType;}
          for(const trans of children(node,'transpose'))transposeByStaff.set(trans.getAttribute('number')||'all',Number(text(trans,'chromatic','0'))+12*Number(text(trans,'octave-change','0')));
        }else if(node.localName==='direction'||node.localName==='sound'){
          const bpm=node.localName==='sound'?Number(node.getAttribute('tempo')):tempoInDirection(node);
          const offset=child(node,'offset');const time=cursor+(offset?.getAttribute('sound')==='no'?0:Number(offset?.textContent||0)/divisions);
          if(bpm>0)tempos.push({quarter:Math.max(0,time),bpm});
          const dynamics=node.querySelector('dynamics');const marking=children(dynamics)[0]?.localName;
          if(marking in DYNAMICS)velocity=DYNAMICS[marking];
          const sound=node.localName==='sound'?node:node.querySelector('sound[dynamics]');
          if(sound?.hasAttribute('dynamics'))velocity=clampVelocity(Number(sound.getAttribute('dynamics'))*.9);
        }else if(node.localName==='backup'||node.localName==='forward'){
          const duration=Number(text(node,'duration','0'))/divisions;
          cursor=node.localName==='backup'?Math.max(0,cursor-duration):cursor+duration;end=Math.max(end,cursor);
        }else if(node.localName==='note'){
          const chord=!!child(node,'chord'),duration=Number(text(node,'duration','0'))/divisions,start=chord?lastStart:cursor;
          const pitch=child(node,'pitch'),staff=text(node,'staff','1'),voice=text(node,'voice','1');
          if(pitch&&!child(node,'rest')&&!child(node,'grace')&&duration>0){
            const step=text(pitch,'step'),octave=Number(text(pitch,'octave','4')),alter=Number(text(pitch,'alter','0'));
            if(step in PITCH){
              const midiNote=(octave+1)*12+PITCH[step]+alter+(transposeByStaff.get(staff)??transposeByStaff.get('all')??0);
              const ties=children(node,'tie');const types=(ties.length?ties:Array.from(node.querySelectorAll('notations tied'))).map(tie=>tie.getAttribute('type'));
              notes.push({midiNote,quarter:start,duration,velocity,staff,voice,partId:id,partIndex,sourceIndex,tieStart:types.includes('start')||types.includes('continue'),tieStop:types.includes('stop')||types.includes('continue')});
            }
          }
          end=Math.max(end,start+duration);if(!chord){lastStart=start;cursor+=duration;}
        }
      }
      return {notes,tempos,duration:measure.getAttribute('implicit')==='yes'?end:Math.max(end,nominal),measure:numericMeasure(measure,sourceIndex)};
    });
  }
  function extractPlaybackData(xmlDoc,{bpm,expandRepeats=true}={}){
    const elements=children(xmlDoc?.documentElement,'part');
    const labels=new Map(Array.from(xmlDoc?.querySelectorAll('part-list > score-part')||[],part=>[part.getAttribute('id'),text(part,'part-name','Part')]));
    const parts=elements.map((part,index)=>({id:part.getAttribute('id')||`part-${index+1}`,index,label:labels.get(part.getAttribute('id'))||`Part ${index+1}`}));
    const parsed=elements.map((part,index)=>parsePart(part,index,parts[index].id));
    const sourceMeasures=children(elements[0],'measure'),source=[];
    let initialTempo=120;
    for(const part of parsed){const first=part[0]?.tempos.find(tempo=>tempo.quarter===0);if(first){initialTempo=first.bpm;break;}}
    // bpm is an initial-tempo override. Later score tempos preserve their ratio
    // to the score's first tempo; duration/divisions is always quarter-note units.
    const ratio=Number(bpm)>0?Number(bpm)/initialTempo:1;
    let currentTempo=initialTempo;
    for(let index=0;index<sourceMeasures.length;index++){
      const rows=parsed.map(part=>part[index]).filter(Boolean);
      const length=Math.max(0,...rows.map(row=>row.duration));
      const changes=rows.flatMap((row,partIndex)=>row.tempos.map(tempo=>({...tempo,partIndex}))).sort((a,b)=>a.quarter-b.quarter||a.partIndex-b.partIndex);
      const byPosition=new Map();for(const change of changes)if(!byPosition.has(change.quarter))byPosition.set(change.quarter,change.bpm);
      const tempos=[{quarter:0,bpm:currentTempo}];
      for(const [quarter,value] of byPosition){if(quarter===0)tempos[0].bpm=value;else if(quarter<=length)tempos.push({quarter,bpm:value});}
      currentTempo=tempos[tempos.length-1].bpm;
      source.push({rows,length,tempos});
    }
    const order=expandMeasureOrder(sourceMeasures,expandRepeats),measureTimeline=[],rawEvents=[];
    let totalDuration=0;
    order.forEach((sourceIndex,index)=>{
      const measure=source[sourceIndex];if(!measure)return;
      const secondsAt=quarter=>{
        let seconds=0;
        for(let i=0;i<measure.tempos.length;i++){
          const segment=measure.tempos[i],end=measure.tempos[i+1]?.quarter??quarter;
          if(quarter<=segment.quarter)break;
          seconds+=(Math.min(quarter,end)-segment.quarter)*60/(segment.bpm*ratio);
        }
        return seconds;
      };
      const startSec=totalDuration,endSec=startSec+secondsAt(measure.length),number=numericMeasure(sourceMeasures[sourceIndex],sourceIndex);
      measureTimeline.push({measure:number,index,sourceIndex,startSec,endSec,bpm:measure.tempos[0].bpm*ratio});
      for(const row of measure.rows)for(const note of row.notes)rawEvents.push({...note,measure:number,index,startSec:startSec+secondsAt(note.quarter),durationSec:secondsAt(note.quarter+note.duration)-secondsAt(note.quarter)});
      totalDuration=endSec;
    });
    rawEvents.sort((a,b)=>a.startSec-b.startSec||a.partIndex-b.partIndex||a.midiNote-b.midiNote);
    const events=[],ties=new Map();
    for(const note of rawEvents){
      const key=`${note.partId}/${note.staff}/${note.voice}/${note.midiNote}`,previous=ties.get(key);
      const joins=note.tieStop&&previous&&Math.abs(previous.startSec+previous.durationSec-note.startSec)<1e-6;
      let current=note;
      if(joins){previous.durationSec=note.startSec+note.durationSec-previous.startSec;current=previous;}
      else events.push(note);
      if(note.tieStart)ties.set(key,current);else ties.delete(key);
    }
    // TODO: D.C., D.S., Fine and Coda navigation require a separate jump graph.
    const warnings=xmlDoc?.querySelector('sound[dacapo],sound[dalsegno],sound[fine],sound[tocoda]')?['D.C./D.S./Fine/코다 이동은 재생에 반영되지 않습니다.']:[];
    return {events,parts,measureTimeline,totalMeasures:measureTimeline.length,totalDuration,warnings};
  }
  function measureAtTime(timeline,sec){
    if(!timeline?.length)return null;
    let low=0,high=timeline.length-1,answer=0;
    while(low<=high){const middle=(low+high)>>1;if(timeline[middle].startSec<=sec){answer=middle;low=middle+1;}else high=middle-1;}
    return timeline[answer];
  }
  global.PlaybackCore={extractPlaybackData,measureAtTime,midiToToneNote,expandMeasureOrder};
})(window);
