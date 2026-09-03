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
  const DIATONIC_SCALES_MINOR={natural:[0,2,3,5,7,8,10],harmonic:[0,2,3,5,7,8,11]};
  const PC_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
  const ROMAN = ['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'];
  const QUALITY_PATTERNS = [
    {intervals:[0,3,6,9], quality:'dim7', suffix:'°7'},
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
    const key=xmlDoc?.querySelector('key');
    const fifths=parseInt(xmlText(key,'fifths','0'),10)||0;
    const mode=xmlText(key,'mode','major')==='minor'?'minor':'major';
    const tonicSemi=normSemi(fifths*7+(mode==='minor'?9:0));
    return {fifths,tonicSemi,mode,keyName:KEY_NAMES[tonicSemi]||'C'};
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

  function romanForChord(chord,tonicSemi,mode='major',bass){
    if(!chord)return {roman:'?',rootRoman:'?',degree:null,inversion:0};
    const relative=normSemi(chord.rootSemi-tonicSemi);
    let degreeIndex=(mode==='minor'?DIATONIC_SCALES_MINOR.natural:DIATONIC_SCALES[0]).indexOf(relative);
    if(mode==='minor'&&relative===11)degreeIndex=6;
    if(degreeIndex<0)return {roman:'?',rootRoman:'?',degree:null,inversion:0};
    const pattern=QUALITY_PATTERNS.find(p=>p.quality===chord.quality);
    const bassInterval=normSemi((bass??chord.rootSemi)-chord.rootSemi);
    const inversion=Math.max(0,pattern?.intervals.indexOf(bassInterval)??0);
    const seventh=pattern?.intervals.length===4;
    const figure=seventh?['7','6/5','4/3','4/2'][inversion]:['','6','6/4'][inversion];
    const ascii=['I','II','III','IV','V','VI','VII'][degreeIndex];
    const lower=['m','m7','dim','dim7','ø7'].includes(chord.quality);
    const rootRoman=mode==='minor'?(lower?ascii.toLowerCase():ascii):ROMAN[degreeIndex];
    let roman;
    if(mode==='major'&&inversion===0){roman=rootRoman+({M:'',m:'m',dim:'°',dim7:'°7',aug:'+',7:'7',M7:'M7',m7:'m7','ø7':'ø7',unknown:'?'}[chord.quality]??'');}
    else {
      const root=mode==='major'?(lower?ascii.toLowerCase():ascii):rootRoman;
      const quality=['dim','dim7'].includes(chord.quality)?'°':chord.quality==='ø7'?'ø':chord.quality==='M7'?'maj':chord.quality==='aug'?'+':'';
      roman=root+quality+(figure||'');
    }
    return {roman,rootRoman,degree:degreeIndex+1,inversion,figure:figure||'기본위치'};
  }

  function collectMeasureBeats(parts,measureIndex){
    const notes=[],rests=[],starts=new Set();let phraseAfter=false;
    parts.forEach(part=>{
      const measures=xmlChildren(part,'measure'),measure=measures[measureIndex];if(!measure)return;
      let divisions=1;
      for(let i=0;i<measureIndex;i++)for(const attr of xmlChildren(measures[i],'attributes'))divisions=Number(xmlText(attr,'divisions'))||divisions;
      let cursor=0,lastStart=0;
      for(const node of xmlChildren(measure)){
        if(node.localName==='attributes'){divisions=Number(xmlText(node,'divisions'))||divisions;continue;}
        const duration=(Number(xmlText(node,'duration','0'))||0)/divisions;
        if(node.localName==='backup'){cursor=Math.max(0,cursor-duration);continue;}
        if(node.localName==='forward'){cursor+=duration;continue;}
        if(node.localName!=='note')continue;
        const chord=!!xmlChild(node,'chord'),start=chord?lastStart:cursor;
        if(xmlChild(node,'rest'))rests.push(start);
        else{const midi=getPitchMidi(node);if(midi!==null&&!xmlChild(node,'grace')){notes.push({midi,start,end:start+duration});starts.add(start);}}
        if(!chord){lastStart=start;cursor+=duration;}
      }
      const next=measures[measureIndex+1];
      // Conservative phrase boundary: an explicit rest after the last onset,
      // a new system/phrase slur in the next measure, or the end of the piece.
      phraseAfter ||= !next||!!next.querySelector('print[new-system="yes"],note:first-of-type slur[type="start"]');
    });
    const sorted=[...starts].sort((a,b)=>a-b);
    return sorted.map((start,index)=>{
      const sounding=notes.filter(note=>note.start<=start&&note.end>start);
      const bass=Math.min(...sounding.map(note=>note.midi));
      return {start,beat:String(Math.round((start+1)*100)/100),pitchClasses:new Set(sounding.map(note=>normSemi(note.midi))),bass: normSemi(bass),phraseEnd:index===sorted.length-1&&(phraseAfter||rests.some(rest=>rest>start))};
    });
  }

  function measureNumber(measure,index){
    const raw=measure?.getAttribute?.('number');
    const parsed=parseInt(raw||'',10);
    return Number.isNaN(parsed)?index+1:parsed;
  }

  function detectCadence(prev,current){
    if(!current)return null;
    if(prev?.degree===5&&current.degree===1)return '완전종지 (PAC)';
    if(prev?.degree===4&&current.degree===1)return '변격종지 (PC)';
    if(prev?.degree===5&&current.degree===6)return '위종지 (DC)';
    if(current.degree===5&&['M','7'].includes(current.quality)&&current.phraseEnd)return '반종지 (HC)';
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
        const roman=romanForChord(chord,key.tonicSemi,key.mode,beatInfo.bass);
        rows.push({
          measure:number,
          beat:beatInfo.beat,
          chordName:chord?.chordName||'-',
          roman:roman.roman,
          rootRoman:roman.rootRoman,
          degree:roman.degree,
          quality:chord?.quality||'unknown',
          rootSemi:chord?.rootSemi,pitchClasses:chord?.pitchClasses||[],inversion:roman.inversion,figure:roman.figure,phraseEnd:beatInfo.phraseEnd,
        });
      });
    }
    rows.forEach((row,index)=>{
      const next=rows[index+1];
      const scales=key.mode==='minor'?Object.values(DIATONIC_SCALES_MINOR):[DIATONIC_SCALES[0]];
      const diatonic=scales.some(scale=>row.pitchClasses.every(pc=>scale.includes(normSemi(pc-key.tonicSemi))));
      if(!diatonic&&['M','7'].includes(row.quality)){
        if(next?.degree&&normSemi(row.rootSemi-next.rootSemi)===7){
          const target=['I','II','III','IV','V','VI','VII'][next.degree-1];
          row.secondaryOf=['m','m7','dim','ø7'].includes(next.quality)?target.toLowerCase():target;
          row.roman='V'+(row.quality==='7'?'7':'')+'/'+row.secondaryOf;
        }else row.roman='?';
      }
    });
    const cadenceCounts=CADENCE_TYPES.reduce((acc,type)=>({...acc,[type]:0}),{}),cadences=[];
    rows.forEach((row,index)=>{
      const label=detectCadence(rows[index-1],row);if(!label)return;
      cadences.push({measure:row.measure,from:rows[index-1]?.roman||'',to:row.roman,label});
      cadenceCounts[label]++;row.cadence=label;
    });
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
    collectMeasureBeats,
    DIATONIC_SCALES_MINOR,
  };
})(window);
