(function(global){
  'use strict';

  // 숫자 악보(번호 가사) 생성·원본 가사 백업·복원.
  // 생성 가사에는 name="mxl-studio-number" 표식을 붙여 원본 가사와 구분합니다.
  const GENERATED_LYRIC_NAME = 'mxl-studio-number';
  const STEPS = ['C','D','E','F','G','A','B'];
  const SOLFEGE_KR = ['도','레','미','파','솔','라','시'];
  const DOT = '˙';
  const MAX_DOTS = 3;
  const LYRIC_FOLLOWERS = ['play','listen'];

  function childElements(el,name){
    return Array.from(el?.children||[]).filter(child=>!name||child.localName===name);
  }
  function firstChild(el,name){return childElements(el,name)[0]||null;}
  function isGenerated(lyric){return lyric?.getAttribute?.('name')===GENERATED_LYRIC_NAME;}

  // 기준 옥타브에서 떨어진 만큼 점을 찍습니다(위는 앞, 아래는 뒤, 최대 3개).
  function octaveDots(octave,baseOctave=4){
    const diff=Number(octave)-Number(baseOctave);
    if(!Number.isFinite(diff)||diff===0)return {above:0,below:0};
    return diff>0?{above:Math.min(diff,MAX_DOTS),below:0}:{above:0,below:Math.min(-diff,MAX_DOTS)};
  }

  // 조표에서 그 음이름이 갖는 변화표(♯ 순서 F C G D A E B, ♭ 순서 B E A D G C F).
  function keySignatureAlter(fifths,step){
    if(global.PitchCore?.keySignatureAlter)return global.PitchCore.keySignatureAlter(fifths,step);
    const f=Number(fifths)||0;
    if(f>0)return 'FCGDAEB'.slice(0,Math.min(f,7)).includes(step)?1:0;
    if(f<0)return 'BEADGCF'.slice(0,Math.min(-f,7)).includes(step)?-1:0;
    return 0;
  }
  // 조표가 가리키는 장조 으뜸음의 음이름 위치(C=0 … B=6). 완전5도 위는 음이름 4칸 위입니다.
  function tonicStepIndex(fifths){return (((Number(fifths)||0)*4)%7+7)%7;}
  function accidentalText(diff){return diff>0?'#'.repeat(diff):diff<0?'♭'.repeat(-diff):'';}

  // fixed: C=1 고정. movable: 조표의 장조 으뜸음=1, 조표 밖 음은 ♯/♭ 접두. korean: 고정도 계이름.
  function noteToNumStr(step,alter,octave,options={}){
    const {fifths=0,mode='fixed',showOct=true,showSharp=false,baseOctave=4}=options;
    const index=STEPS.indexOf(step);
    if(index<0)return '';
    const a=Number(alter)||0;
    let body,acc;
    if(mode==='movable'){
      body=String(((index-tonicStepIndex(fifths))%7+7)%7+1);
      acc=accidentalText(a-keySignatureAlter(fifths,step));
    }else{
      body=mode==='korean'?SOLFEGE_KR[index]:String(index+1);
      acc=accidentalText(a);
    }
    let text=(showSharp?acc:'')+body;
    if(showOct){const dots=octaveDots(octave,baseOctave);text=DOT.repeat(dots.above)+text+DOT.repeat(dots.below);}
    return text;
  }

  // 보표마다 조표가 다를 수 있으므로 조표 추적은 PitchCore.createKeyTracker가 맡습니다(화성 쌓기와 같은 규칙, D07).
  function newKeyTracker(){
    if(!global.PitchCore?.createKeyTracker)throw new Error('조표 추적 모듈(PitchCore)을 불러오지 못했습니다.');
    return global.PitchCore.createKeyTracker();
  }
  function staffOf(note){return firstChild(note,'staff')?.textContent?.trim()||'1';}

  // 그 마디가 시작될 때(첫 음표 앞 attributes 포함)의 조표 fifths. staff는 보표 번호(기본 1)입니다.
  // MeasureCore.keyFifthsAt은 마디 안 마지막 조표를 돌려주므로 여기서는 쓰지 않습니다(마디 중간 조바꿈 구분).
  function fifthsForMeasure(partEl,measureEl,staff='1'){
    const keys=newKeyTracker();
    for(const measure of childElements(partEl,'measure')){
      for(const child of childElements(measure)){
        if(measure===measureEl&&child.localName==='note')return keys.fifthsFor(staff);
        if(child.localName==='attributes')keys.update(child);
      }
      if(measure===measureEl)return keys.fifthsFor(staff);
    }
    return keys.fifthsFor(staff);
  }

  function removeGeneratedLyrics(doc){
    const generated=Array.from(doc.querySelectorAll('lyric')).filter(isGenerated);
    generated.forEach(lyric=>lyric.remove());
    return generated.length;
  }
  function removeUserLyrics(doc){
    const user=Array.from(doc.querySelectorAll('lyric')).filter(lyric=>!isGenerated(lyric));
    user.forEach(lyric=>lyric.remove());
    return user.length;
  }
  function countGeneratedLyrics(doc){return Array.from(doc.querySelectorAll('lyric')).filter(isGenerated).length;}

  function insertLyric(note,lyric){
    const follower=childElements(note).find(child=>LYRIC_FOLLOWERS.includes(child.localName));
    note.insertBefore(lyric,follower||null);
  }

  // 원본 가사를 (파트 id, 마디 위치, chord가 아닌 음표 순번, chord 안 순번) 키로 문자열 백업합니다.
  // 화성 쌓기처럼 chord 음표가 추가되어도 키가 흔들리지 않습니다.
  function noteSlots(measure){
    const slots=[];let base=-1,offset=0;
    for(const note of childElements(measure,'note')){
      if(firstChild(note,'chord')&&base>=0)offset++;
      else{base++;offset=0;}
      slots.push({note,index:Math.max(base,0),chord:offset});
    }
    return slots;
  }
  function backupLyrics(doc){
    const serializer=new global.XMLSerializer();
    const entries=[];
    for(const part of Array.from(doc.querySelectorAll('score-partwise > part'))){
      childElements(part,'measure').forEach((measure,measureIndex)=>{
        for(const slot of noteSlots(measure)){
          const lyrics=childElements(slot.note,'lyric').filter(lyric=>!isGenerated(lyric));
          if(!lyrics.length)continue;
          entries.push({part:part.getAttribute('id'),measure:measureIndex,number:measure.getAttribute('number'),note:slot.index,chord:slot.chord,lyrics:lyrics.map(lyric=>serializer.serializeToString(lyric))});
        }
      });
    }
    return {version:1,entries};
  }
  function restoreLyrics(doc,backup){
    const parser=new global.DOMParser();
    let restored=0,missing=0;
    for(const entry of backup?.entries||[]){
      const part=Array.from(doc.querySelectorAll('score-partwise > part')).find(p=>p.getAttribute('id')===entry.part);
      const measure=part?childElements(part,'measure')[entry.measure]:null;
      const slot=measure?noteSlots(measure).find(s=>s.index===entry.note&&s.chord===(entry.chord||0)):null;
      if(!slot){missing++;continue;}
      childElements(slot.note,'lyric').filter(lyric=>!isGenerated(lyric)).forEach(lyric=>lyric.remove());
      for(const xml of entry.lyrics){
        const parsed=parser.parseFromString(xml,'text/xml');
        if(parsed.querySelector('parsererror'))continue;
        insertLyric(slot.note,doc.importNode(parsed.documentElement,true));
        restored++;
      }
    }
    return {restored,missing};
  }

  function readPitch(note){
    const pitch=firstChild(note,'pitch');
    if(!pitch)return null;
    const step=firstChild(pitch,'step')?.textContent?.trim();
    const octave=Number(firstChild(pitch,'octave')?.textContent);
    if(!STEPS.includes(step)||!Number.isFinite(octave))return null;
    return {step,alter:Number(firstChild(pitch,'alter')?.textContent)||0,octave};
  }

  // 모든 음높이 음표(쉼표 제외, chord·꾸밈음 포함)에 표식 가사를 붙입니다.
  // 조표는 파트·마디를 따라 문서 순서로 추적하므로 마디 중간 조바꿈도 반영하고, 보표마다 다른 조표는 그 음표의 보표 것을 씁니다.
  // keepLyrics가 아니면 원본 가사 제거는 호출자 책임입니다(백업 후 removeUserLyrics).
  function generateNumberLyrics(doc,options={}){
    const {keepLyrics=false}=options;
    removeGeneratedLyrics(doc);
    let count=0;
    for(const part of Array.from(doc.querySelectorAll('score-partwise > part'))){
      const keys=newKeyTracker();
      for(const measure of childElements(part,'measure')){
        for(const child of childElements(measure)){
          if(child.localName==='attributes'){keys.update(child);continue;}
          if(child.localName!=='note'||firstChild(child,'rest'))continue;
          const pitch=readPitch(child);if(!pitch)continue;
          let number=1;
          if(keepLyrics)childElements(child,'lyric').forEach(lyric=>{const n=parseInt(lyric.getAttribute('number')||'1',10);if(n>=number)number=n+1;});
          const lyric=doc.createElement('lyric');
          lyric.setAttribute('number',String(number));
          lyric.setAttribute('name',GENERATED_LYRIC_NAME);
          const syllabic=doc.createElement('syllabic');syllabic.textContent='single';lyric.appendChild(syllabic);
          const text=doc.createElement('text');text.textContent=noteToNumStr(pitch.step,pitch.alter,pitch.octave,{...options,fifths:keys.fifthsFor(staffOf(child))});lyric.appendChild(text);
          insertLyric(child,lyric);
          count++;
        }
      }
    }
    return {count};
  }

  global.NumberingCore={
    GENERATED_LYRIC_NAME,
    octaveDots,
    noteToNumStr,
    fifthsForMeasure,
    removeGeneratedLyrics,
    removeUserLyrics,
    countGeneratedLyrics,
    backupLyrics,
    restoreLyrics,
    generateNumberLyrics,
  };
})(window);
