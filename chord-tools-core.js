(function(global){
  'use strict';

  function normalizeNoChordText(text){
    return (text||'').trim().toLowerCase().replace(/\s+/g,'');
  }

  function isNoChordText(text){
    return /^n[.,]?c[.,]?$/.test(normalizeNoChordText(text));
  }

  function isNoChordHarmony(harmony){
    if(!harmony)return false;
    const kindEl=harmony.querySelector('kind');
    const kind=(kindEl?.textContent||'').trim().toLowerCase();
    const kindText=kindEl?.getAttribute('text')||'';
    return kind==='none'||kind==='no-chord'||isNoChordText(kindText)||isNoChordText(harmony.textContent);
  }

  function measureHasNoChordHarmony(measure){
    if(Array.from(measure?.querySelectorAll?.('harmony')||[]).some(isNoChordHarmony))return true;
    return Array.from(measure?.querySelectorAll?.('direction words')||[]).some(words=>isNoChordText(words.textContent));
  }

  function preserveNoChordHarmonies(xmlDoc){
    Array.from(xmlDoc?.querySelectorAll?.('measure')||[]).forEach(measure=>{
      measure.querySelectorAll('harmony').forEach(harmony=>{
        if(!isNoChordHarmony(harmony))harmony.remove();
      });
    });
  }

  // ── 음높이류(pitch class) 집합으로 코드 판정 ──
  // 패턴의 모든 음이 집합에 있어야 후보가 됩니다(부분 일치로 코드를 만들지 않음).
  // 음이 하나뿐이거나 두 음이 완전5도가 아니면 확정하지 않습니다.
  const CHORD_PATTERNS=[
    {quality:'M',intervals:[0,4,7]},
    {quality:'m',intervals:[0,3,7]},
    {quality:'dim',intervals:[0,3,6]},
    {quality:'aug',intervals:[0,4,8]},
    {quality:'sus4',intervals:[0,5,7]},
    {quality:'sus2',intervals:[0,2,7]},
    {quality:'7',intervals:[0,4,7,10]},
    {quality:'maj7',intervals:[0,4,7,11]},
    {quality:'m7',intervals:[0,3,7,10]},
    {quality:'m7♭5',intervals:[0,3,6,10]},
    {quality:'dim7',intervals:[0,3,6,9]},
    {quality:'mMaj7',intervals:[0,3,7,11]},
  ];
  // ChordSymbolCore.parse가 읽는 접미사(기존 자동 코드 출력과 같음).
  const QUALITY_SUFFIX={M:'',m:'m',dim:'dim',aug:'aug',sus4:'sus4',sus2:'sus2','7':'7',maj7:'maj7',m7:'m7','m7♭5':'m7♭5',dim7:'dim7',mMaj7:'mMaj7','5':'5'};
  const SHARP_SPELLING=[['C',0],['C',1],['D',0],['D',1],['E',0],['F',0],['F',1],['G',0],['G',1],['A',0],['A',1],['B',0]];
  const FLAT_SPELLING=[['C',0],['D',-1],['D',0],['E',-1],['E',0],['F',0],['G',-1],['G',0],['A',-1],['A',0],['B',-1],['B',0]];
  const normPc=value=>((Math.round(Number(value))%12)+12)%12;

  // 조표 안의 음이면 그 철자(♯ 또는 ♭), 아니면 조표 방향(fifths<0이면 ♭)으로 적습니다.
  function spellPitchClass(pc,fifths=0){
    const index=normPc(pc);
    const sharp={step:SHARP_SPELLING[index][0],alter:SHARP_SPELLING[index][1]};
    const flat={step:FLAT_SPELLING[index][0],alter:FLAT_SPELLING[index][1]};
    const keyAlter=global.PitchCore?.keySignatureAlter;
    if(typeof keyAlter==='function'){
      if(sharp.alter===keyAlter(fifths,sharp.step))return sharp;
      if(flat.alter===keyAlter(fifths,flat.step))return flat;
    }
    return Number(fifths)<0?flat:sharp;
  }

  function chordSymbolText({root,quality}={}){
    if(!root)return '';
    const accidental=root.alter===1?'#':root.alter===-1?'♭':'';
    return `${root.step}${accidental}${QUALITY_SUFFIX[quality]??quality??''}`;
  }

  // pitchClasses: 0~11 숫자 배열(순서는 동점 처리에 씁니다). bass: 가장 낮은 음의 pc(없으면 null).
  // 반환: {root:{step,alter}, rootPc, quality, symbol, pitchClasses} 또는 null.
  function detectChordFromPitchClasses(pitchClasses,{fifths=0,bass=null}={}){
    const order=[];
    for(const value of pitchClasses||[]){
      if(value===null||value===undefined||!Number.isFinite(Number(value)))continue;
      const pc=normPc(value);if(!order.includes(pc))order.push(pc);
    }
    const result=(rootPc,quality)=>{
      const root=spellPitchClass(rootPc,fifths);
      return {root,rootPc,quality,symbol:chordSymbolText({root,quality}),pitchClasses:order.slice()};
    };
    if(order.length<2)return null;
    if(order.length===2){
      const [a,b]=order;
      if(normPc(b-a)===7)return result(a,'5');
      if(normPc(a-b)===7)return result(b,'5');
      return null;
    }
    const bassPc=bass===null||bass===undefined||!Number.isFinite(Number(bass))?null:normPc(bass);
    const candidates=[];
    for(const rootPc of order){
      const intervals=new Set(order.map(pc=>normPc(pc-rootPc)));
      CHORD_PATTERNS.forEach((pattern,patternIndex)=>{
        if(pattern.intervals.every(interval=>intervals.has(interval)))candidates.push({rootPc,pattern,patternIndex});
      });
    }
    if(!candidates.length)return null;
    candidates.sort((x,y)=>
      y.pattern.intervals.length-x.pattern.intervals.length||
      Number(y.rootPc===bassPc)-Number(x.rootPc===bassPc)||
      Number(y.rootPc===order[0])-Number(x.rootPc===order[0])||
      x.rootPc-y.rootPc||
      x.patternIndex-y.patternIndex);
    return result(candidates[0].rootPc,candidates[0].pattern.quality);
  }

  global.ChordToolsCore = {
    isNoChordHarmony,
    isNoChordText,
    measureHasNoChordHarmony,
    preserveNoChordHarmonies,
    CHORD_PATTERNS,
    spellPitchClass,
    chordSymbolText,
    detectChordFromPitchClasses,
  };
})(window);
