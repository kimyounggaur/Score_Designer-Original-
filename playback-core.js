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
  // 연주 순서 길이 상한. 반복 전개의 걸음 수와, 점프를 더한 전체 순서 길이에 모두 적용한다.
  const ORDER_LIMIT=20000;
  const unique=list=>Array.from(new Set(list));
  // repeat·ending 표기를 마디 인덱스 기준 구조({ranges,endings})로 정리한다.
  function repeatStructure(measures){
    const stack=[],ranges=[],endings=[];let currentEnding=null;
    measures.forEach((measure,index)=>{
      if(measure.querySelector('repeat[direction="forward"]'))stack.push(index);
      const start=measure.querySelector('ending[type="start"]');if(start)currentEnding=endingPasses(start.getAttribute('number'));
      endings[index]=currentEnding;
      if(measure.querySelector('ending[type="stop"],ending[type="discontinue"]'))currentEnding=null;
      const backward=measure.querySelector('repeat[direction="backward"]');
      if(backward)ranges.push({start:stack.pop()??0,end:index,times:Math.max(1,Math.min(16,Number(backward.getAttribute('times'))||2))});
    });
    return {ranges,endings};
  }
  // 반복·볼타만 따라 [from..to] 마디의 연주 순서(마디 인덱스)를 만든다.
  // lastPassOnly는 점프 뒤에 쓴다: 되돌아가지 않고 각 반복 구간을 마지막 통과로 한 번만 지나므로 마지막 괄호만 연주된다.
  function expandRepeatsOnly(measures,{from=0,to=measures.length-1,lastPassOnly=false,structure}={}){
    const {ranges,endings}=structure||repeatStructure(measures);
    const passes=new Map(),order=[];let index=from,steps=0;
    let lastPass=ranges.filter(r=>r.end<from).sort((a,b)=>b.end-a.end)[0]?.times||1;
    while(index<=to&&steps++<ORDER_LIMIT){
      const range=ranges.filter(r=>r.start<=index&&index<=r.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
      const pass=range?(lastPassOnly?range.times:(passes.get(range.end)||1)):lastPass;
      if(!endings[index]?.size||endings[index].has(pass))order.push(index);
      const end=ranges.find(r=>r.end===index);
      if(end&&lastPassOnly)lastPass=end.times;
      else if(end){
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
  // 표식이 있는 마디 후보({index,value}) 중 id가 맞는 하나를 고른다. 맞는 id가 없으면 후보가 하나뿐일 때만 그것으로 본다.
  function pick(items,id){
    const exact=typeof id==='string'?items.filter(item=>item.value===id):[];
    if(exact.length)return exact.length===1?exact[0]:null;
    return items.length===1?items[0]:null;
  }
  // 이동 기호로 점프 계획을 세운다(한 번만 점프). 점프 표식(D.C./D.S.)이 하나도 없으면 null,
  // 표식이 둘 이상이거나 필요한 표식이 없거나 위치가 맞지 않으면 {unsupported:[점프 라벨…]}(점프하지 않는다).
  function planJump(marks){
    const jumps=[];
    marks.forEach((entry,index)=>{if(entry.dacapo)jumps.push({index,kind:'dacapo'});if(entry.dalsegno)jumps.push({index,kind:'dalsegno'});});
    if(!jumps.length)return null;
    const labelsAt=(index,kind)=>marks[index].labels[kind]||[];
    const written=unique(jumps.flatMap(jump=>labelsAt(jump.index,jump.kind)));
    const names=written.length?written:unique(jumps.map(jump=>jump.kind==='dacapo'?'D.C.':'D.S.'));
    const fail=()=>({unsupported:names});
    if(jumps.length>1)return fail();
    const {index:from,kind}=jumps[0],here=marks[from];
    const where=key=>marks.map((entry,index)=>({index,value:entry[key]})).filter(item=>item.value);
    const applied=[...labelsAt(from,kind),...labelsAt(from,'alfine'),...labelsAt(from,'alcoda')];
    let target=0;
    if(kind==='dalsegno'){
      const segno=pick(where('segno'),here.dalsegno);
      if(!segno||segno.index>from)return fail();
      target=segno.index;applied.push(...labelsAt(target,'segno'));
    }
    // 끝맺는 방식: 글자에 al Fine/al Coda가 있으면 그것, 없으면 Fine이 있을 때 al Fine, To Coda·Coda가 모두 있을 때 al Coda, 아니면 끝까지.
    const fines=where('fine');
    const mode=here.alFine&&here.alCoda?null:here.alFine?'fine':here.alCoda?'coda':fines.length?'fine':where('tocoda').length&&where('coda').length?'coda':'plain';
    if(!mode)return fail();
    const plan={from,target,mode,applied,names};
    if(mode==='fine'){
      const fine=pick(fines);
      if(!fine||fine.index<target)return fail();
      plan.fine=fine.index;applied.push(...labelsAt(fine.index,'fine'));
    }else if(mode==='coda'){
      const toCoda=pick(where('tocoda')),coda=toCoda&&pick(where('coda'),toCoda.value);
      if(!toCoda||!coda||toCoda.index<target||coda.index<=toCoda.index)return fail();
      plan.toCoda=toCoda.index;plan.coda=coda.index;applied.push(...labelsAt(toCoda.index,'tocoda'),...labelsAt(coda.index,'coda'));
    }
    return plan;
  }
  // 연주 순서와 이동 기호 적용 결과를 함께 돌려준다: {order, applied:[따른 표식 라벨…], unsupported:[따르지 못한 점프 라벨…]}.
  // 반복 전개로 순서를 만들다가 D.C./D.S. 마디의 마지막 통과가 끝나면 한 번만 점프한다. 점프 뒤에는 반복을 돌지 않는다.
  function expandMeasureOrderDetailed(measures,expandRepeats=true,{jumps=true,marks}={}){
    if(!expandRepeats)return {order:measures.map((_,index)=>index),applied:[],unsupported:[]};
    const structure=repeatStructure(measures),order=expandRepeatsOnly(measures,{structure});
    const plan=jumps?planJump(marks||collectNavigation(measures)):null;
    if(!plan)return {order,applied:[],unsupported:[]};
    if(plan.unsupported)return {order,applied:[],unsupported:plan.unsupported};
    const last=order.lastIndexOf(plan.from);
    if(last<0)return {order,applied:[],unsupported:plan.names};
    const walk=(from,to)=>expandRepeatsOnly(measures,{from,to,lastPassOnly:true,structure}),end=measures.length-1;
    const again=plan.mode==='fine'?walk(plan.target,plan.fine):plan.mode==='coda'?[...walk(plan.target,plan.toCoda),...walk(plan.coda,end)]:walk(plan.target,end);
    return {order:order.slice(0,last+1).concat(again).slice(0,ORDER_LIMIT),applied:unique(plan.applied),unsupported:[]};
  }
  function expandMeasureOrder(measures,expandRepeats=true,options){return expandMeasureOrderDetailed(measures,expandRepeats,options).order;}
  // metronome 표기를 4분음표 기준 BPM으로 바꾼다. sound tempo는 항상 4분음표 기준이므로
  // 점4분음표=60은 4분음표 기준 90 BPM이다(점 하나 ×1.5, 점 둘 ×1.75).
  // 재생·템포 패널·마디별 템포가 같은 환산을 쓰도록 공개한다. 박 단위를 모르면 null을 돌려준다.
  const BEAT_UNIT_QUARTERS={breve:8,whole:4,half:2,quarter:1,eighth:.5,'16th':.25,'32nd':.125,'64th':.0625};
  function metronomeBeat(metronome){
    const items=children(metronome),index=items.findIndex(el=>el.localName==='beat-unit');
    if(index<0)return null;
    const unit=items[index].textContent.trim(),base=BEAT_UNIT_QUARTERS[unit];
    if(!base)return null;
    let dots=0;for(let i=index+1;i<items.length&&items[i].localName==='beat-unit-dot';i++)dots++;
    return {unit,dots,factor:base*(2-1/Math.pow(2,dots))};
  }
  function metronomePerMinute(metronome){
    const value=text(metronome,'per-minute').trim();
    return /^\d+(\.\d+)?$/.test(value)?Number(value):null;
  }
  function quarterBpmFromMetronome(metronome){
    const beat=metronomeBeat(metronome),perMinute=metronomePerMinute(metronome);
    return beat&&perMinute!=null?perMinute*beat.factor:null;
  }
  function tempoInDirection(direction){
    const sound=direction.querySelector('sound[tempo]');const bpm=Number(sound?.getAttribute('tempo'));
    if(bpm>0)return bpm;
    const metro=direction.querySelector('metronome');if(!metro)return null;
    const value=quarterBpmFromMetronome(metro);
    return value>0?value:null;
  }
  // limit이 있으면 앞쪽 마디만 읽는다(처음 템포만 필요할 때 악보 전체를 풀지 않으려는 용도).
  function parsePart(part,partIndex,id,limit=Infinity){
    let divisions=1,nominal=4,velocity=80;
    const transposeByStaff=new Map([['all',0]]);
    return children(part,'measure').slice(0,limit).map((measure,sourceIndex)=>{
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
  // 악보가 시작할 때의 4분음표 기준 BPM: 파트 순서대로 첫 마디 맨 앞(0박)의 템포를 찾고, 없으면 120.
  function initialTempoOf(parsed){
    for(const part of parsed){const first=part[0]?.tempos.find(tempo=>tempo.quarter===0);if(first)return first.bpm;}
    return 120;
  }
  // 재생 슬라이더의 처음 값. extractPlaybackData가 쓰는 시작 템포와 같은 값이다(첫 마디만 읽는다).
  function initialTempo(xmlDoc){
    const elements=children(xmlDoc?.documentElement,'part');
    return initialTempoOf(elements.map((part,index)=>parsePart(part,index,part.getAttribute('id')||`part-${index+1}`,1)));
  }
  function extractPlaybackData(xmlDoc,{bpm,expandRepeats=true}={}){
    const elements=children(xmlDoc?.documentElement,'part');
    const labels=new Map(Array.from(xmlDoc?.querySelectorAll('part-list > score-part')||[],part=>[part.getAttribute('id'),text(part,'part-name','Part')]));
    const parts=elements.map((part,index)=>({id:part.getAttribute('id')||`part-${index+1}`,index,label:labels.get(part.getAttribute('id'))||`Part ${index+1}`}));
    const parsed=elements.map((part,index)=>parsePart(part,index,parts[index].id));
    const sourceMeasures=children(elements[0],'measure'),source=[];
    const measureLists=elements.map(part=>children(part,'measure'));
    const startTempo=initialTempoOf(parsed);
    // bpm is an initial-tempo override. Later score tempos preserve their ratio
    // to the score's first tempo; duration/divisions is always quarter-note units.
    const ratio=Number(bpm)>0?Number(bpm)/startTempo:1;
    let currentTempo=startTempo;
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
    // 이동 기호는 모든 파트의 같은 위치 마디에서 모은다(파트마다 같은 기호가 있어도 한 번으로 센다).
    const marks=collectNavigation(sourceMeasures.map((_,index)=>measureLists.map(list=>list[index]).filter(Boolean)));
    const {order,applied}=expandMeasureOrderDetailed(sourceMeasures,expandRepeats,{marks}),measureTimeline=[],rawEvents=[];
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
    // 따른 이동 기호(applied)는 안내에서 뺀다. 따르지 못한 것만 navigationMarks·warnings에 남는다.
    const appliedKeys=new Set(applied.map(label=>label.toLowerCase()));
    const navigationMarks=navigationLabels(xmlDoc).filter(label=>!appliedKeys.has(label.toLowerCase()));
    // 높이 없는 타악기(unpitched) 음표는 소리를 내지 않는다. 그런 음표가 든 파트를 알린다.
    const unpitchedParts=parts.filter((part,index)=>elements[index].querySelector('note > unpitched')).map(part=>part.label);
    const warnings=[...navigationMarks.map(label=>`반복 기호 ${label}은(는) 재생에 반영되지 않습니다.`),...unpitchedParts.map(label=>`타악기 파트 ${label}은(는) 재생되지 않습니다.`)];
    return {events,parts,measureTimeline,totalMeasures:measureTimeline.length,totalDuration,warnings,navigationMarks,unpitchedParts,mutedParts:unpitchedParts.slice()};
  }
  // 이동 기호(D.C., D.S., Fine, Coda, Segno) 읽기.
  // NAVIGATION_WORDS는 악보에 적힌 글자 중 이동 기호처럼 보이는 문구를 가려 안내 라벨로 쓰고,
  // WORD_KINDS는 문장 전체가 맞는 것만 점프 종류로 인정한다("fine tuning" 같은 일반 문구로는 점프하지 않는다).
  const NAVIGATION_WORDS=/\b(D\.?\s*C\.?|D\.?\s*S\.?|Fine|Coda|al\s+Fine|al\s+Coda)\b/i;
  const SOUND_JUMPS=[['dacapo','D.C.'],['dalsegno','D.S.'],['fine','Fine'],['tocoda','To Coda']];
  const WORD_KINDS=[
    ['dacapo',/^(?:d\.?\s*c\.?|da\s+capo)(?:\s*al\s+(fine|coda))?\.?$/i],
    ['dalsegno',/^(?:d\.?\s*s\.?|dal\s+segno)(?:\s*al\s+(fine|coda))?\.?$/i],
    ['fine',/^fine\.?$/i],
    ['tocoda',/^to\s+coda\.?$/i],
    ['coda',/^coda\.?$/i],
    ['segno',/^segno\.?$/i],
    ['alfine',/^al\s+fine\.?$/i],
    ['alcoda',/^al\s+coda\.?$/i],
  ];
  const NAVIGATION_ELEMENTS=['direction','sound','barline'];
  const labelText=raw=>{const label=String(raw||'').replace(/\s+/g,' ').trim();return label.length>40?label.slice(0,39)+'…':label;};
  function classifyWords(text){
    for(const [kind,pattern] of WORD_KINDS){const match=pattern.exec(text);if(match)return {kind,al:match[1]?match[1].toLowerCase():null};}
    return null;
  }
  // direction·sound·barline 하나가 가리키는 이동 기호: [{kind,id,al,label,shift}].
  // kind는 dacapo|dalsegno|fine|tocoda|segno|coda|alfine|alcoda, 종류를 가리지 못한 이동 문구는 kind=null(라벨만 남긴다).
  // 같은 direction에 글자 표기와 sound 속성이 함께 있으면 글자 표기 하나만 라벨로 쓴다.
  // shift: 오른쪽(기본) 막대선에 붙은 segno·coda는 다음 마디 첫머리의 기호이므로 1.
  function readMarks(element){
    const found=new Map(),loose=[];
    const note=(kind,{id=null,al=null,label=null}={})=>{const prev=found.get(kind)||{};found.set(kind,{id:prev.id||id,al:prev.al||al,label:prev.label||label});};
    const fromSound=sound=>{
      if(!sound)return;
      for(const [attribute,label] of SOUND_JUMPS){
        if(!sound.hasAttribute(attribute))continue;
        const value=sound.getAttribute(attribute),yesNo=attribute==='dacapo'||attribute==='fine';
        if(yesNo?value==='yes':value)note(attribute,{id:yesNo?null:value,label});else loose.push(label);
      }
      for(const attribute of ['segno','coda']){const id=sound.getAttribute(attribute);if(id)note(attribute,{id});}
    };
    if(element.localName==='barline'){
      const location=element.getAttribute('location'),shift=location==='left'||location==='middle'?0:1;
      if(child(element,'segno'))note('segno',{label:'Segno'});
      if(child(element,'coda'))note('coda',{label:'Coda'});
      return Array.from(found,([kind,info])=>({kind,id:null,al:null,label:info.label,shift}));
    }
    let words='',named=false;
    if(element.localName==='direction'){
      const types=children(element,'direction-type');
      words=types.flatMap(type=>children(type,'words')).map(node=>node.textContent).join(' ').replace(/\s+/g,' ').trim();
      const kind=words?classifyWords(words):null;
      if(kind)note(kind.kind,{al:kind.al});
      named=!!kind||NAVIGATION_WORDS.test(words);
      fromSound(child(element,'sound'));
      // 점프 표식과 한 direction에 든 기호 그림은 그 표식의 일부이지 segno·coda 위치가 아니다.
      if(!found.has('dalsegno')&&types.some(type=>child(type,'segno')))note('segno',{label:'Segno'});
      if(!found.has('tocoda')&&types.some(type=>child(type,'coda')))note('coda',{label:'Coda'});
    }else fromSound(element);
    const records=Array.from(found,([kind,info])=>({kind,id:info.id,al:info.al,label:named?words:info.label}));
    if(named){if(!records.length)records.push({kind:null,label:words});}
    else for(const label of loose)records.push({kind:null,label});
    return records;
  }
  const measureMarks=measure=>children(measure).filter(element=>NAVIGATION_ELEMENTS.includes(element.localName)).flatMap(element=>readMarks(element));
  // 재생이 따르지 않는 이동 기호를 악보에 적힌 표기 그대로 문서 순서로 모은다(중복 제거).
  function navigationLabels(xmlDoc){
    const labels=[],seen=new Set();
    for(const part of children(xmlDoc?.documentElement,'part'))for(const measure of children(part,'measure'))for(const record of measureMarks(measure)){
      const label=labelText(record.label);if(!label)continue;
      const key=label.toLowerCase();if(seen.has(key))continue;
      seen.add(key);labels.push(label);
    }
    return labels;
  }
  // 마디 인덱스별 이동 기호 표: {dacapo,dalsegno,segno,fine,tocoda,coda,alFine,alCoda,labels}.
  // dalsegno·segno·tocoda·coda는 없으면 false, 있으면 id 문자열(없으면 true). measures의 각 항목은 마디 하나이거나
  // 같은 위치 마디를 파트별로 묶은 배열이다(파트마다 같은 기호가 있어도 한 번으로 센다). labels는 종류별 안내 라벨.
  const blankMarks=()=>({dacapo:false,dalsegno:false,segno:false,fine:false,tocoda:false,coda:false,alFine:false,alCoda:false,labels:{}});
  function collectNavigation(measures){
    const marks=measures.map(()=>blankMarks());
    measures.forEach((item,index)=>{
      for(const measure of [].concat(item||[]))for(const record of measureMarks(measure)){
        const entry=marks[index+(record.shift||0)],{kind}=record;
        if(!entry||!kind)continue;
        if(kind==='alfine')entry.alFine=true;
        else if(kind==='alcoda')entry.alCoda=true;
        else if(kind==='dacapo'||kind==='fine')entry[kind]=true;
        else entry[kind]=record.id||(typeof entry[kind]==='string'?entry[kind]:true);
        if(record.al==='fine')entry.alFine=true;
        if(record.al==='coda')entry.alCoda=true;
        const label=labelText(record.label);
        if(label&&!(entry.labels[kind]||(entry.labels[kind]=[])).includes(label))entry.labels[kind].push(label);
      }
    });
    return marks;
  }
  function measureAtTime(timeline,sec){
    if(!timeline?.length)return null;
    let low=0,high=timeline.length-1,answer=0;
    while(low<=high){const middle=(low+high)>>1;if(timeline[middle].startSec<=sec){answer=middle;low=middle+1;}else high=middle-1;}
    return timeline[answer];
  }
  global.PlaybackCore={extractPlaybackData,initialTempo,metronomeBeat,metronomePerMinute,quarterBpmFromMetronome,measureAtTime,midiToToneNote,expandMeasureOrder,expandMeasureOrderDetailed,collectNavigation};
})(window);
