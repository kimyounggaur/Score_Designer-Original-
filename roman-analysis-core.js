(function(global){
  'use strict';

  const STEP_TO_SEMI = {C:0,D:2,E:4,F:5,G:7,A:9,B:11};
  const KEY_FIFTHS = [0,-5,2,-3,4,-1,6,1,-4,3,-2,5];
  const KEY_NAMES = ['C','Db','D','Eb','E','F','F#/Gb','G','Ab','A','Bb','B'];
  const DIATONIC_SCALES = {
    0:[0,2,4,5,7,9,11],1:[1,3,5,6,8,10,0],2:[2,4,6,7,9,11,1],3:[3,5,7,8,10,0,2],
    4:[4,6,8,9,11,1,3],5:[5,7,9,10,0,2,4],6:[6,8,10,11,1,3,5],7:[7,9,11,0,2,4,6],
    8:[8,10,0,1,3,5,7],9:[9,11,1,2,4,6,8],10:[10,0,2,3,5,7,9],11:[11,1,3,4,6,8,10]
  };
  const PC_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const ROMAN = ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'];
  const QUALITY_PATTERNS = [
    {intervals:[0,4,7,10], quality:'7', suffix:'7'},
    {intervals:[0,4,7,11], quality:'M7', suffix:'M7'},
    {intervals:[0,3,7,10], quality:'m7', suffix:'m7'},
    {intervals:[0,3,6,10], quality:'ø7', suffix:'ø7'},
    {intervals:[0,4,7], quality:'M', suffix:''},
    {intervals:[0,3,7], quality:'m', suffix:'m'},
    {intervals:[0,3,6], quality:'dim', suffix:'°'},
    {intervals:[0,4,8], quality:'aug', suffix:'+'},
  ];
  const CADENCE_TYPES = ['완전종지 (PAC)','반종지 (HC)','변격종지 (PC)','위종지 (DC)'];

  function toArray(list){return Array.from(list||[])}
  function normSemi(n){return ((n%12)+12)%12}
  function xmlChildren(el,name){return toArray(el?.childNodes).filter(c=>c.nodeType===1&&(!name||c.localName===name))}
  function xmlChild(el,name){return xmlChildren(el,name)[0]||null}
  function xmlText(el,name,fallback=''){const child=xmlChild(el,name);return child?child.textContent:fallback}
  function xmlDesc(el,name){return toArray(el?.getElementsByTagName('*')).find(n=>n.localName===name)||null}
  function getDescText(el,name,fallback=''){const node=xmlDesc(el,name);return node?node.textContent:fallback}

  function getPlayablePartElements(xmlDoc){
    return toArray(xmlDoc?.getElementsByTagName('*')).filter(el=>
      el.localName==='part'&&xmlChildren(el,'measure').length
    );
  }

  function getPitchMidi(note){
    const pitch=xmlChild(note,'pitch');
    if(!pitch)return null;
    const step=xmlText(pitch,'step','C');
    const alter=parseFloat(xmlText(pitch,'alter','0'))||0;
    const octave=parseInt(xmlText(pitch,'octave','4'),10);
    if(!(step in STEP_TO_SEMI)||Number.isNaN(octave))return null;
    return (octave+1)*12+STEP_TO_SEMI[step]+alter;
  }

  function getKeyInfo(xmlDoc){
    const fifths=parseInt(getDescText(toArray(xmlDoc?.getElementsByTagName('*')).find(n=>n.localName==='key')||xmlDoc,'fifths','0'),10);
    const tonicSemi=KEY_FIFTHS.indexOf(Number.isNaN(fifths)?0:fifths);
    const resolved=tonicSemi>=0?tonicSemi:0;
    return {
      fifths:Number.isNaN(fifths)?0:fifths,
      tonicSemi:resolved,
      keyName:KEY_NAMES[resolved]||'C',
    };
  }

  function sameSet(a,b){
    if(a.length!==b.length)return false;
    return a.every((value,index)=>value===b[index]);
  }

  function scorePattern(intervals,pattern){
    return intervals.filter(interval=>pattern.intervals.includes(interval)).length;
  }

  function identifyChord(pitchClassSet){
    const pitchClasses=[...pitchClassSet].map(normSemi).sort((a,b)=>a-b);
    if(!pitchClasses.length)return null;
    let bestFallback={root:pitchClasses[0], quality:'unknown', score:-1, suffix:'', patternSize:0};
    for(let root=0;root<12;root++){
      const intervals=pitchClasses.map(pc=>normSemi(pc-root)).sort((a,b)=>a-b);
      const exact=QUALITY_PATTERNS.find(pattern=>sameSet(intervals,pattern.intervals));
      if(exact){
        return {
          rootSemi:root,
          quality:exact.quality,
          suffix:exact.suffix,
          chordName:PC_NAMES[root]+exact.suffix,
          pitchClasses,
        };
      }
      QUALITY_PATTERNS.forEach(pattern=>{
        const score=scorePattern(intervals,pattern);
        const rootBonus=pitchClassSet.has(root)?0.25:0;
        const total=score+rootBonus;
        if(
          total>bestFallback.score||
          (total===bestFallback.score&&pattern.intervals.length>bestFallback.patternSize)
        ){
          bestFallback={root, quality:pattern.quality, score:total, suffix:pattern.suffix, patternSize:pattern.intervals.length};
        }
      });
    }
    return {
      rootSemi:bestFallback.root,
      quality:bestFallback.quality,
      suffix:bestFallback.suffix,
      chordName:PC_NAMES[bestFallback.root]+(bestFallback.quality==='unknown'?'?':bestFallback.suffix),
      pitchClasses,
    };
  }

  function romanForChord(chord,tonicSemi){
    if(!chord)return {roman:'?', rootRoman:'?', degree:null};
    const scale=DIATONIC_SCALES[tonicSemi]||DIATONIC_SCALES[0];
    const degreeIndex=scale.indexOf(normSemi(chord.rootSemi));
    if(degreeIndex<0)return {roman:'?', rootRoman:'?', degree:null};
    const rootRoman=ROMAN[degreeIndex];
    const suffixByQuality={M:'',m:'m',dim:'°',aug:'+',7:'7',M7:'M7',m7:'m7','ø7':'ø7',unknown:'?'};
    const suffix=suffixByQuality[chord.quality]??'';
    return {roman:rootRoman+suffix, rootRoman, degree:degreeIndex+1};
  }

  function formatBeat(start,divisions){
    const beat=(start/Math.max(1,divisions))+1;
    return Number.isInteger(beat)?String(beat):String(Math.round(beat*100)/100);
  }

  function collectMeasureBeats(parts,measureIndex){
    const beatMap=new Map();
    let displayDivisions=1;
    parts.forEach(part=>{
      const measure=xmlChildren(part,'measure')[measureIndex];
      if(!measure)return;
      const attr=xmlChild(measure,'attributes');
      const divisions=parseFloat(xmlText(attr,'divisions',''))||displayDivisions||1;
      displayDivisions=divisions;
      let cursor=0;
      let lastStart=0;
      xmlChildren(measure).forEach(node=>{
        if(node.localName==='backup'){
          cursor=Math.max(0,cursor-(parseFloat(xmlText(node,'duration','0'))||0));
          return;
        }
        if(node.localName==='forward'){
          cursor+=parseFloat(xmlText(node,'duration','0'))||0;
          return;
        }
        if(node.localName!=='note')return;
        const isChord=!!xmlChild(node,'chord');
        const duration=parseFloat(xmlText(node,'duration','0'))||0;
        const start=isChord?lastStart:cursor;
        if(!isChord)lastStart=start;
        if(!xmlChild(node,'rest')){
          const midi=getPitchMidi(node);
          if(midi!==null){
            if(!beatMap.has(start))beatMap.set(start,new Set());
            beatMap.get(start).add(normSemi(midi));
          }
        }
        if(!isChord)cursor+=duration;
      });
    });
    return [...beatMap.entries()]
      .sort((a,b)=>a[0]-b[0])
      .map(([start,pitchClasses])=>({start, beat:formatBeat(start,displayDivisions), pitchClasses}));
  }

  function measureNumber(measure,index){
    const raw=measure?.getAttribute?.('number');
    const parsed=parseInt(raw||'',10);
    return Number.isNaN(parsed)?index+1:parsed;
  }

  function detectCadence(prev,current){
    if(!prev||!current)return null;
    if(prev.rootRoman==='Ⅴ'&&current.rootRoman==='Ⅰ')return '완전종지 (PAC)';
    if(prev.rootRoman==='Ⅳ'&&current.rootRoman==='Ⅰ')return '변격종지 (PC)';
    if(prev.rootRoman==='Ⅴ'&&current.rootRoman==='Ⅵ')return '위종지 (DC)';
    if(current.rootRoman==='Ⅴ')return '반종지 (HC)';
    return null;
  }

  function summarizeProgressions(rows){
    const counts=new Map();
    rows.filter(row=>row.roman&&row.roman!=='?').forEach((row,index,validRows)=>{
      const next=validRows[index+1];
      if(!next)return;
      const pair=`${row.roman} → ${next.roman}`;
      counts.set(pair,(counts.get(pair)||0)+1);
    });
    return [...counts.entries()]
      .map(([pair,count])=>({pair,count}))
      .sort((a,b)=>b.count-a.count||a.pair.localeCompare(b.pair))
      .slice(0,5);
  }

  function detectRomanNumeral(xmlDoc){
    const key=getKeyInfo(xmlDoc);
    const parts=getPlayablePartElements(xmlDoc);
    const firstMeasures=xmlChildren(parts[0],'measure');
    const rows=[];
    for(let i=0;i<firstMeasures.length;i++){
      const number=measureNumber(firstMeasures[i],i);
      collectMeasureBeats(parts,i).forEach(beatInfo=>{
        const chord=identifyChord(beatInfo.pitchClasses);
        const roman=romanForChord(chord,key.tonicSemi);
        rows.push({
          measure:number,
          beat:beatInfo.beat,
          chordName:chord?.chordName||'-',
          roman:roman.roman,
          rootRoman:roman.rootRoman,
          degree:roman.degree,
          quality:chord?.quality||'unknown',
        });
      });
    }
    const measureRows=[];
    const seenMeasures=new Set();
    rows.forEach(row=>{
      if(seenMeasures.has(row.measure))return;
      seenMeasures.add(row.measure);
      measureRows.push(row);
    });
    const cadenceCounts=CADENCE_TYPES.reduce((acc,type)=>({...acc,[type]:0}),{});
    const cadences=[];
    for(let i=1;i<measureRows.length;i++){
      const label=detectCadence(measureRows[i-1],measureRows[i]);
      if(!label)continue;
      const cadence={measure:measureRows[i].measure, from:measureRows[i-1].roman, to:measureRows[i].roman, label};
      cadences.push(cadence);
      cadenceCounts[label]=(cadenceCounts[label]||0)+1;
      const target=rows.find(row=>row.measure===measureRows[i].measure);
      if(target)target.cadence=label;
    }
    return {
      ...key,
      rows,
      cadences,
      cadenceCounts,
      progressions:summarizeProgressions(rows),
    };
  }

  function insertRomanNumerals(xmlDoc,rows){
    const parts=getPlayablePartElements(xmlDoc);
    const firstPart=parts[0];
    if(!firstPart||!rows?.length)return 0;
    const firstByMeasure=new Map();
    rows.forEach(row=>{
      if(!firstByMeasure.has(row.measure)&&row.roman&&row.roman!=='?')firstByMeasure.set(row.measure,row.roman);
    });
    let inserted=0;
    xmlChildren(firstPart,'measure').forEach((measure,index)=>{
      xmlChildren(measure,'direction').forEach(direction=>{
        const words=xmlDesc(direction,'words');
        if(words?.getAttribute?.('data-roman-analysis')==='true')direction.remove();
      });
      const number=measureNumber(measure,index);
      const roman=firstByMeasure.get(number);
      if(!roman)return;
      const direction=xmlDoc.createElement('direction');
      direction.setAttribute('placement','above');
      const directionType=xmlDoc.createElement('direction-type');
      const words=xmlDoc.createElement('words');
      words.setAttribute('font-size','12');
      words.setAttribute('font-weight','bold');
      words.setAttribute('data-roman-analysis','true');
      words.textContent=roman;
      directionType.appendChild(words);
      direction.appendChild(directionType);
      const firstNote=xmlChild(measure,'note');
      if(firstNote)measure.insertBefore(direction,firstNote);
      else measure.appendChild(direction);
      inserted++;
    });
    return inserted;
  }

  global.RomanAnalysis = {
    detectRomanNumeral,
    insertRomanNumerals,
    getKeyInfo,
    identifyChord,
  };
})(window);
