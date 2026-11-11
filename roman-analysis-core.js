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
  const CADENCE_TYPES = ['완전종지 (PAC)','불완전정격종지 (IAC)','반종지 (HC)','변격종지 (PC)','위종지 (DC)'];

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

  // transposeSemis: 기보음 → 실음 반음 수(<transpose>의 chromatic + 12×octave-change).
  function getPitchMidi(note,transposeSemis=0){
    const pitch=xmlChild(note,'pitch');
    if(!pitch)return null;
    const step=xmlText(pitch,'step','C');
    const alter=parseFloat(xmlText(pitch,'alter','0'))||0;
    const octave=parseInt(xmlText(pitch,'octave','4'),10);
    if(!(step in STEP_TO_SEMI)||Number.isNaN(octave))return null;
    return (octave+1)*12+STEP_TO_SEMI[step]+alter+(Number(transposeSemis)||0);
  }

  // <attributes> 안의 <transpose>(number 없는 것 또는 number="1")를 {semis, diatonic}으로 바꿉니다. 없으면 null(이전 값 유지).
  // semis: 기보음 → 실음 반음 수(chromatic + 12×octave-change). diatonic: 기보음 → 실음 글자 이동(7음계 단계 수).
  // <diatonic>은 선택 요소라서 없으면, 옥타브(12반음의 배수) 이동일 때만 0으로 보고 그 밖에는 null(실음 글자를 알 수 없음)입니다.
  function transposeInfo(attributes){
    const transposes=xmlChildren(attributes,'transpose');
    if(!transposes.length)return null;
    const transpose=transposes.find(node=>!node.hasAttribute('number')||node.getAttribute('number')==='1')||transposes[0];
    const chromatic=Number(xmlText(transpose,'chromatic','0'))||0;
    const semis=chromatic+12*(Number(xmlText(transpose,'octave-change','0'))||0);
    const rawDiatonic=xmlText(transpose,'diatonic','').trim();
    const diatonic=/^-?\d+$/.test(rawDiatonic)?Number(rawDiatonic):(normSemi(chromatic)===0?0:null);
    return {semis,diatonic};
  }
  function transposeSemitones(attributes){return transposeInfo(attributes)?.semis??null}

  // 음 이름 글자(C=0 … B=6). 실음의 글자는 기보음의 step 글자를 이조의 diatonic만큼 옮긴 것이고, 알 수 없으면 null입니다.
  const STEP_LETTER={C:0,D:1,E:2,F:3,G:4,A:5,B:6};
  function getPitchLetter(note,diatonic=0){
    const pitch=xmlChild(note,'pitch');
    if(!pitch||diatonic===null||diatonic===undefined)return null;
    const step=xmlText(pitch,'step','C');
    if(!Object.prototype.hasOwnProperty.call(STEP_LETTER,step))return null;
    return (((STEP_LETTER[step]+Math.trunc(Number(diatonic)||0))%7)+7)%7;
  }

  // 기보 조표(fifths)에 이조 반음 수를 적용한 실음 조표입니다(예: B♭ 클라리넷 기보 D장조 fifths 2, semis -2 → 0).
  // 12반음의 배수 이동이면 값을 그대로 돌려주고, 그 밖에는 -7…7 범위로 맞춥니다.
  function concertFifths(fifths,semis){
    const written=Number(fifths)||0,shift=normSemi(7*Math.round(Number(semis)||0));
    if(shift===0)return written;
    let value=written+(shift>5?shift-12:shift);
    if(value>7)value-=12;else if(value<-7)value+=12;
    return value;
  }

  // 문서에서 처음 나오는 <key>의 기보 조표입니다. 첫 파트가 조표를 정하기 전 마디의 기본 조로 씁니다.
  function firstKeyOf(xmlDoc){
    const key=xmlDoc?.querySelector('key');
    return {
      fifths:parseInt(xmlText(key,'fifths','0'),10)||0,
      mode:xmlText(key,'mode','major').trim()==='minor'?'minor':'major',
    };
  }

  // 첫 재생 파트의 시작 조입니다. 분석하는 음(실음)과 같은 기준이라 이조 악기가 첫 파트면 <transpose>를 적용한 조입니다(D05).
  function getKeyInfo(xmlDoc){
    const first=firstPartKeys(xmlDoc)[0];
    if(first)return first;
    const {fifths,mode}=firstKeyOf(xmlDoc);
    return keyFromFifths(fifths,mode);
  }

  function sameSet(a,b){
    if(a.length!==b.length)return false;
    return a.every((value,index)=>value===b[index]);
  }

  // root에서 3도씩 쌓은 글자(L, L+2, L+4, …)가 spelling(음이름 번호 → 그 박에 쓰인 글자 집합)과 맞으면 true,
  // 어긋나면 false, 글자를 모르면 null입니다.
  function stackedThirdsFit(root,pattern,spelling){
    if(!spelling||typeof spelling.get!=='function')return null;
    const tones=pattern.intervals.map(interval=>spelling.get(normSemi(root+interval)));
    if(tones.some(letters=>!letters||!letters.size))return null;
    for(const letter of tones[0])if(tones.every((letters,step)=>letters.has((letter+2*step)%7)))return true;
    return false;
  }

  // 정확히 일치한 화음의 근음 후보(roots) 중 하나를 고릅니다. 후보가 하나면 그대로입니다.
  // 대칭 화음(dim7은 네 음, aug는 세 음이 모두 근음 후보)은 ① 철자: 근음 글자에서 3도씩 쌓은 글자와 맞는 후보,
  // ② dim7이면 조의 으뜸음·딸림음의 이끎음, ③ 가장 낮은 음이름 번호 순으로 고릅니다(D06).
  function pickSymmetricRoot(roots,pattern,{spelling=null,key=null}={}){
    if(roots.length<2)return roots[0];
    const fits=[],open=[];
    for(const root of roots){
      const fit=stackedThirdsFit(root,pattern,spelling);
      if(fit===true)fits.push(root);
      if(fit!==false)open.push(root);
    }
    if(fits.length===1)return fits[0];
    const pool=fits.length?fits:(open.length?open:roots);
    if(pattern.quality==='dim7'&&key&&Number.isFinite(Number(key.tonicSemi))){
      const tonic=normSemi(key.tonicSemi);
      const leading=[normSemi(tonic-1),normSemi(tonic+6)].find(pc=>pool.includes(pc));
      if(leading!==undefined)return leading;
    }
    return Math.min(...pool);
  }

  // 음이 3개 미만이면 화음으로 확정하지 않습니다(단음·유니슨이 C°7이 되던 C01).
  // 정확히 일치하는 패턴이 없으면 "패턴의 모든 음이 들어 있는" 후보만 고르고, 없으면 unknown입니다.
  // spelling(음이름 번호 → 쓰인 글자 집합)·key({tonicSemi})는 대칭 화음(dim7·aug)의 근음을 고를 때만 쓰입니다.
  function identifyChord(pitchClassSet,{bass=null,spelling=null,key=null}={}){
    const pitchClasses=[...new Set([...pitchClassSet].map(normSemi))].sort((a,b)=>a-b);
    if(!pitchClasses.length)return null;
    if(pitchClasses.length<3){
      const chordName=pitchClasses.length===1?PC_NAMES[pitchClasses[0]]+'(단음)':pitchClasses.map(pc=>PC_NAMES[pc]).join('·');
      return {rootSemi:null,quality:'unknown',suffix:'',chordName,pitchClasses};
    }
    let exact=null;
    const exactRoots=[];
    for(let root=0;root<12;root++){
      const intervals=pitchClasses.map(pc=>normSemi(pc-root)).sort((a,b)=>a-b);
      const pattern=QUALITY_PATTERNS.find(candidate=>sameSet(intervals,candidate.intervals));
      if(pattern){exact=pattern;exactRoots.push(root);}
    }
    if(exact){
      const root=pickSymmetricRoot(exactRoots,exact,{spelling,key});
      return {
        rootSemi:root,
        quality:exact.quality,
        suffix:exact.suffix,
        chordName:PC_NAMES[root]+exact.suffix,
        pitchClasses,
      };
    }
    const bassPc=bass===null||bass===undefined||!Number.isFinite(Number(bass))?null:normSemi(bass);
    const candidates=[];
    pitchClasses.forEach(root=>{
      const intervals=new Set(pitchClasses.map(pc=>normSemi(pc-root)));
      QUALITY_PATTERNS.forEach((pattern,patternIndex)=>{
        if(pattern.intervals.every(interval=>intervals.has(interval)))candidates.push({root,pattern,patternIndex});
      });
    });
    candidates.sort((x,y)=>
      y.pattern.intervals.length-x.pattern.intervals.length||
      Number(y.root===bassPc)-Number(x.root===bassPc)||
      x.root-y.root||
      x.patternIndex-y.patternIndex);
    const best=candidates[0];
    if(!best){
      const root=bassPc??pitchClasses[0];
      return {rootSemi:null,quality:'unknown',suffix:'',chordName:PC_NAMES[root]+'?',pitchClasses};
    }
    return {
      rootSemi:best.root,
      quality:best.pattern.quality,
      suffix:best.pattern.suffix,
      chordName:PC_NAMES[best.root]+best.pattern.suffix,
      pitchClasses,
    };
  }

  function romanForChord(chord,tonicSemi,mode='major',bass){
    if(!chord||chord.quality==='unknown'||chord.rootSemi===null||chord.rootSemi===undefined)return {roman:'?',rootRoman:'?',degree:null,inversion:0};
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
      let divisions=1,transpose=0,diatonic=0;
      const follow=attr=>{
        divisions=Number(xmlText(attr,'divisions'))||divisions;
        const info=transposeInfo(attr);
        if(info){transpose=info.semis;diatonic=info.diatonic;}
      };
      for(let i=0;i<measureIndex;i++)for(const attr of xmlChildren(measures[i],'attributes'))follow(attr);
      let cursor=0,lastStart=0;
      for(const node of xmlChildren(measure)){
        if(node.localName==='attributes'){follow(node);continue;}
        const duration=(Number(xmlText(node,'duration','0'))||0)/divisions;
        if(node.localName==='backup'){cursor=Math.max(0,cursor-duration);continue;}
        if(node.localName==='forward'){cursor+=duration;continue;}
        if(node.localName!=='note')continue;
        const chord=!!xmlChild(node,'chord'),start=chord?lastStart:cursor;
        if(xmlChild(node,'rest'))rests.push(start);
        else{const midi=getPitchMidi(node,transpose);if(midi!==null&&!xmlChild(node,'grace')){notes.push({midi,start,end:start+duration,letter:getPitchLetter(node,diatonic)});starts.add(start);}}
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
      // 음이름 번호 → 그 박에 쓰인 글자 집합(C=0 … B=6). 이조 diatonic을 모르는 음은 글자 없이 음이름만 셉니다.
      const spelling=new Map();
      sounding.forEach(note=>{
        const pc=normSemi(note.midi);
        if(!spelling.has(pc))spelling.set(pc,new Set());
        if(note.letter!==null)spelling.get(pc).add(note.letter);
      });
      return {start,beat:String(Math.round((start+1)*100)/100),pitchClasses:new Set(sounding.map(note=>normSemi(note.midi))),bass: normSemi(bass),bassMidi:bass,spelling,phraseEnd:index===sorted.length-1&&(phraseAfter||rests.some(rest=>rest>start))};
    });
  }

  function measureNumber(measure,index){
    const raw=measure?.getAttribute?.('number');
    const parsed=parseInt(raw||'',10);
    return Number.isNaN(parsed)?index+1:parsed;
  }

  // V→I은 두 화음이 모두 기본위치일 때만 PAC, 하나라도 전위면 IAC입니다(최상성부는 보지 않음).
  // 판정하지 못한 화음(quality unknown)은 앞·뒤 어느 쪽으로도 쓰지 않습니다.
  function detectCadence(prev,current){
    if(!current||current.quality==='unknown')return null;
    const before=prev&&prev.quality!=='unknown'?prev:null;
    if(before?.degree===5&&current.degree===1)return (before.inversion||0)===0&&(current.inversion||0)===0?'완전종지 (PAC)':'불완전정격종지 (IAC)';
    if(before?.degree===4&&current.degree===1)return '변격종지 (PC)';
    if(before?.degree===5&&current.degree===6)return '위종지 (DC)';
    if(current.degree===5&&['M','7'].includes(current.quality)&&current.phraseEnd)return '반종지 (HC)';
    return null;
  }

  function keyFromFifths(fifths,mode){
    const tonicSemi=normSemi(fifths*7+(mode==='minor'?9:0));
    return {fifths,mode,tonicSemi,keyName:KEY_NAMES[tonicSemi]||'C'};
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

  // 첫 파트의 조표를 마디 순서로 따라가며 행마다 그 시점의 조(keyName·tonicSemi·fifths·mode)로 해석합니다.
  // 조는 분석하는 음과 같은 실음 기준입니다. 첫 파트가 이조 악기면 기보 조표에 <transpose>를 적용한 조입니다(D05).
  // 반환 객체의 keyName·mode는 첫 조표(헤더 표시용)이고, 조가 바뀐 마디는 keyChanges에 담깁니다.
  function detectRomanNumeral(xmlDoc){
    const keys=firstPartKeys(xmlDoc);
    const key=keys[0]||getKeyInfo(xmlDoc);
    const parts=getPlayablePartElements(xmlDoc);
    const firstMeasures=xmlChildren(parts[0],'measure');
    const rows=[],keyChanges=[];
    for(let i=0;i<firstMeasures.length;i++){
      const number=measureNumber(firstMeasures[i],i);
      const rowKey=keys[i],before=keys[i-1];
      if(before&&(rowKey.tonicSemi!==before.tonicSemi||rowKey.mode!==before.mode))keyChanges.push({measure:number,...rowKey});
      collectMeasureBeats(parts,i).forEach(beatInfo=>{
        const chord=identifyChord(beatInfo.pitchClasses,{bass:beatInfo.bass,spelling:beatInfo.spelling,key:rowKey});
        const roman=romanForChord(chord,rowKey.tonicSemi,rowKey.mode,beatInfo.bass);
        rows.push({
          measure:number,
          beat:beatInfo.beat,
          chordName:chord?.chordName||'-',
          roman:roman.roman,
          rootRoman:roman.rootRoman,
          degree:roman.degree,
          quality:chord?.quality||'unknown',
          rootSemi:chord?.rootSemi,pitchClasses:chord?.pitchClasses||[],inversion:roman.inversion,figure:roman.figure,phraseEnd:beatInfo.phraseEnd,
          keyName:rowKey.keyName,tonicSemi:rowKey.tonicSemi,fifths:rowKey.fifths,mode:rowKey.mode,
        });
      });
    }
    rows.forEach((row,index)=>{
      const next=rows[index+1];
      const scales=row.mode==='minor'?Object.values(DIATONIC_SCALES_MINOR):[DIATONIC_SCALES[0]];
      const diatonic=scales.some(scale=>row.pitchClasses.every(pc=>scale.includes(normSemi(pc-row.tonicSemi))));
      if(!diatonic&&['M','7'].includes(row.quality)){
        if(next?.degree&&normSemi(row.rootSemi-next.rootSemi)===7){
          const target=['I','II','III','IV','V','VI','VII'][next.degree-1];
          row.secondaryOf=['m','m7','dim','ø7'].includes(next.quality)?target.toLowerCase():target;
          row.roman='V'+(row.quality==='7'?'7':'')+'/'+row.secondaryOf;
        }else row.roman='?';
      }
    });
    const cadenceCounts=CADENCE_TYPES.reduce((acc,type)=>({...acc,[type]:0}),{}),cadences=[];
    // 판정하지 못한 박(단음·두 음 등)은 건너뛰고, 바로 앞의 판정된 화음과 이어서 종지를 봅니다.
    let previous=null;
    rows.forEach(row=>{
      if(row.quality==='unknown')return;
      const label=detectCadence(previous,row);
      if(label){
        cadences.push({measure:row.measure,from:previous?.roman||'',to:row.roman,label});
        cadenceCounts[label]++;row.cadence=label;
      }
      previous=row;
    });
    return {
      ...key,
      keyChanges,
      rows,
      cadences,
      cadenceCounts,
      progressions:summarizeProgressions(rows),
    };
  }

  function primaryKeyOf(attributes){
    const keys=xmlChildren(attributes,'key');
    return keys.find(key=>!key.hasAttribute('number')||key.getAttribute('number')==='1')||keys[0]||null;
  }
  // 첫 파트 조표(number 없는 key 또는 number="1")와 <transpose>를 마디 순서로 따라가며, 마디마다 실음 기준 {fifths, mode}를 돌려줍니다.
  // initial은 첫 조표가 나오기 전 마디의 값입니다. 첫 파트가 이조 악기가 아니면 fifths는 기보 조표 그대로입니다.
  function trackFirstPart(measures,initial={}){
    let fifths=initial.fifths??0,mode=initial.mode??'major',semis=0;
    return measures.map(measure=>{
      for(const attributes of xmlChildren(measure,'attributes')){
        semis=transposeSemitones(attributes)??semis;
        const keyEl=primaryKeyOf(attributes);if(!keyEl)continue;
        const fifthsEl=xmlChild(keyEl,'fifths'),modeEl=xmlChild(keyEl,'mode');
        if(fifthsEl)fifths=parseInt(fifthsEl.textContent.trim(),10)||0;
        if(modeEl)mode=modeEl.textContent.trim()==='minor'?'minor':'major';
      }
      return {fifths:concertFifths(fifths,semis),mode};
    });
  }
  // 첫 재생 파트의 마디마다 실음 기준 조(keyFromFifths와 같은 모양)를 돌려줍니다. 첫 조표 전 마디는 문서의 첫 <key>를 따릅니다.
  function firstPartKeys(xmlDoc){
    const parts=getPlayablePartElements(xmlDoc);
    return trackFirstPart(xmlChildren(parts[0],'measure'),firstKeyOf(xmlDoc)).map(state=>keyFromFifths(state.fifths,state.mode));
  }
  // 마디별 실음 기준 fifths입니다. 이조 악기가 아니면 MeasureCore.keyFifthsAt(첫 파트, 번호)와 같은 값입니다(번호가 숫자인 마디 기준).
  function trackFifths(measures){return trackFirstPart(measures).map(state=>state.fifths)}

  // 박(onset)마다 함께 울리는 음으로 코드를 판정합니다(D10). 코드 판정은 ChordToolsCore를 씁니다.
  // fifthsByMeasure: 마디 번호 → fifths(Map·객체·함수). 없으면 첫 파트 조표를 따라갑니다.
  function analyzeVerticalities(xmlDoc,{fifthsByMeasure}={}){
    const parts=getPlayablePartElements(xmlDoc);
    const measures=xmlChildren(parts[0],'measure');
    const tracked=trackFifths(measures);
    const detect=global.ChordToolsCore?.detectChordFromPitchClasses;
    const lookup=number=>{
      if(!fifthsByMeasure)return undefined;
      if(fifthsByMeasure instanceof Map)return fifthsByMeasure.get(number);
      if(typeof fifthsByMeasure==='function')return fifthsByMeasure(number);
      return fifthsByMeasure[number];
    };
    const rows=[];
    measures.forEach((measure,index)=>{
      const number=measureNumber(measure,index);
      const given=lookup(number);
      const fifths=given!==null&&given!==undefined&&Number.isFinite(Number(given))?Number(given):tracked[index];
      collectMeasureBeats(parts,index).forEach(beatInfo=>{
        const pitchClasses=[...beatInfo.pitchClasses];
        const chord=typeof detect==='function'?detect(pitchClasses,{fifths,bass:beatInfo.bass}):null;
        rows.push({measure:number,measureIndex:index,beat:beatInfo.beat,start:beatInfo.start,fifths,bass:beatInfo.bass,pitchClasses,chord});
      });
    });
    return rows;
  }

  // MusicXML 4.0의 words에는 사용자 속성을 둘 수 없으므로(XSD 위반) 로마 숫자 표식은 xs:ID 속성인 id로 구별합니다.
  // 구버전이 쓰던 data-roman-analysis="true" 속성은 읽을 때만 인식하고, 새로 쓰지는 않습니다.
  const ROMAN_ID_PREFIX='mxl-roman-';
  const LEGACY_ROMAN_ATTR='data-roman-analysis';
  function isRomanWords(words){
    if(!words||typeof words.getAttribute!=='function')return false;
    return String(words.getAttribute('id')||'').startsWith(ROMAN_ID_PREFIX)||words.getAttribute(LEGACY_ROMAN_ATTR)==='true';
  }
  // xs:ID는 문서 전체에서 유일해야 하므로 이미 쓰인 id를 모두 모읍니다.
  function collectIds(xmlDoc){
    const ids=new Set();
    toArray(xmlDoc?.getElementsByTagName?.('*')).forEach(el=>{const id=el.getAttribute('id');if(id)ids.add(id);});
    return ids;
  }
  function partNumberOf(xmlDoc,partEl){
    const index=toArray(xmlDoc?.getElementsByTagName?.('*')).filter(el=>el.localName==='part').indexOf(partEl);
    return index<0?1:index+1;
  }
  // 파트 번호(1부터)와 일련번호로 mxl-roman-<파트>-<번호> id를 만들고, 이미 쓰인 id는 건너뜁니다.
  function makeRomanIdAllocator(used){
    const counters=new Map();
    return partNumber=>{
      let n=counters.get(partNumber)||1,id;
      do{id=ROMAN_ID_PREFIX+partNumber+'-'+n;n++;}while(used.has(id));
      counters.set(partNumber,n);
      used.add(id);
      return id;
    };
  }
  // xmlString에 구버전 표식 속성이 있는지 문자열만 보고 확인합니다. 읽어 들인 파일마다 DOM을 훑지 않으려는 사전 검사입니다.
  function hasLegacyMarkers(xmlString){return typeof xmlString==='string'&&xmlString.includes(LEGACY_ROMAN_ATTR);}
  // 구버전 표식(words@data-roman-analysis)을 표준 id 표식으로 바꿉니다. 문서를 고친 words 수를 돌려줍니다(고친 것이 없으면 0).
  // 업로드·세션·공유·작업 기록으로 들어온 문서를 커밋하기 전에 한 번 호출하고, 0보다 크면 xmlString을 다시 직렬화해야 합니다.
  function migrateRomanMarkers(xmlDoc){
    const legacy=toArray(xmlDoc?.getElementsByTagName?.('words')).filter(words=>words.hasAttribute(LEGACY_ROMAN_ATTR));
    if(!legacy.length)return 0;
    const allocate=makeRomanIdAllocator(collectIds(xmlDoc));
    legacy.forEach(words=>{
      const isRoman=words.getAttribute(LEGACY_ROMAN_ATTR)==='true';
      words.removeAttribute(LEGACY_ROMAN_ATTR);
      // 값이 true가 아니거나 다른 프로그램이 이미 id를 붙여 둔 words는 속성만 지우고 그대로 둡니다.
      if(!isRoman||words.hasAttribute('id'))return;
      let part=words.parentNode;
      while(part&&part.localName!=='part')part=part.parentNode;
      words.setAttribute('id',allocate(partNumberOf(xmlDoc,part)));
    });
    return legacy.length;
  }

  function insertRomanNumerals(xmlDoc,rows){
    const parts=getPlayablePartElements(xmlDoc);
    const firstPart=parts[0];
    if(!firstPart||!rows?.length)return 0;
    const firstByMeasure=new Map();
    rows.forEach(row=>{
      if(!firstByMeasure.has(row.measure)&&row.roman&&row.roman!=='?')firstByMeasure.set(row.measure,row.roman);
    });
    // 1) 이전에 넣은 표식(구버전 속성 포함)을 모든 파트에서 먼저 지웁니다. 새 id가 남은 id와 겹치지 않게 하는 순서입니다.
    toArray(xmlDoc.getElementsByTagName('direction')).forEach(direction=>{
      if(isRomanWords(xmlDesc(direction,'words')))direction.remove();
    });
    // 2) 첫 번째 재생 파트의 마디마다 로마 숫자를 넣습니다.
    const allocate=makeRomanIdAllocator(collectIds(xmlDoc));
    const partNumber=partNumberOf(xmlDoc,firstPart);
    let inserted=0;
    xmlChildren(firstPart,'measure').forEach((measure,index)=>{
      const number=measureNumber(measure,index);
      const roman=firstByMeasure.get(number);
      if(!roman)return;
      const direction=xmlDoc.createElement('direction');
      direction.setAttribute('placement','above');
      const directionType=xmlDoc.createElement('direction-type');
      const words=xmlDoc.createElement('words');
      words.setAttribute('font-size','12');
      words.setAttribute('font-weight','bold');
      words.setAttribute('id',allocate(partNumber));
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
    migrateRomanMarkers,
    hasLegacyMarkers,
    isRomanWords,
    ROMAN_ID_PREFIX,
    getKeyInfo,
    identifyChord,
    detectCadence,
    getPitchMidi,
    getPitchLetter,
    concertFifths,
    firstPartKeys,
    collectMeasureBeats,
    analyzeVerticalities,
    CADENCE_TYPES,
    DIATONIC_SCALES_MINOR,
  };
})(window);
