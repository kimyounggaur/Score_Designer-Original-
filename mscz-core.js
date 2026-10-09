// MuseScore(.mscz/.mscx) → MusicXML(score-partwise) 브라우저 변환 순수 로직
(function(global){
  'use strict';
  /* ---------- 유리수(전체 음표 단위) ---------- */
  function gcd(a,b){a=Math.abs(a);b=Math.abs(b);while(b){const t=a%b;a=b;b=t;}return a||1;}
  function fr(n,d=1){if(d<0){n=-n;d=-d;}const g=gcd(n,d);return {n:n/g,d:d/g};}
  const ZERO=fr(0),ONE=fr(1);
  const add=(a,b)=>fr(a.n*b.d+b.n*a.d,a.d*b.d),sub=(a,b)=>fr(a.n*b.d-b.n*a.d,a.d*b.d),mul=(a,b)=>fr(a.n*b.n,a.d*b.d);
  const cmp=(a,b)=>a.n*b.d-b.n*a.d;
  function parseFraction(text){const m=String(text==null?'':text).trim().match(/^(-?\d+)(?:\s*\/\s*(\d+))?$/);return m&&Number(m[2]||1)>0?fr(Number(m[1]),Number(m[2]||1)):null;}
  const DURATIONS={long:fr(4),breve:fr(2),whole:fr(1),half:fr(1,2),quarter:fr(1,4),eighth:fr(1,8),'16th':fr(1,16),'32nd':fr(1,32),'64th':fr(1,64),'128th':fr(1,128),'256th':fr(1,256),'512th':fr(1,512),'1024th':fr(1,1024)};
  const dotFactor=dots=>fr(Math.pow(2,dots+1)-1,Math.pow(2,dots));
  /* ---------- DOM 도우미 ---------- */
  function el(parent,name){for(let c=parent&&parent.firstElementChild;c;c=c.nextElementSibling)if(c.localName===name)return c;return null;}
  function els(parent,name){const out=[];for(let c=parent&&parent.firstElementChild;c;c=c.nextElementSibling)if(c.localName===name)out.push(c);return out;}
  function txt(parent,name){const c=el(parent,name);return c?c.textContent:null;}
  function int(parent,name,fallback){const t=txt(parent,name),n=t==null?NaN:parseInt(t,10);return Number.isFinite(n)?n:fallback;}
  const SYMBOLS={metNoteQuarterUp:'♩',metNote8thUp:'♪',metAugmentationDot:'.',accidentalFlat:'♭',accidentalSharp:'♯',accidentalNatural:'♮'};
  function richText(node){
    let out='';
    (function walk(n){for(let c=n.firstChild;c;c=c.nextSibling){
      if(c.nodeType===3||c.nodeType===4)out+=c.nodeValue;
      else if(c.nodeType===1){if(c.localName==='sym')out+=SYMBOLS[c.textContent.trim()]||'';else if(c.localName==='br')out+=' ';else walk(c);}
    }})(node);
    return out.replace(/\s+/g,' ').trim();
  }
  const textOf=(parent,name)=>{const c=el(parent,name);return c?richText(c):'';};
  const lastTxt=(parent,name)=>{const all=els(parent,name);return all.length?all[all.length-1].textContent:null;};
  /* ---------- XML 출력 도우미 ---------- */
  const CONTROL=/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;
  const esc=value=>String(value).replace(CONTROL,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  function tag(name,attrs,body){
    let a='';if(attrs)for(const key of Object.keys(attrs))if(attrs[key]!=null&&attrs[key]!==false)a+=` ${key}="${esc(attrs[key])}"`;
    const content=Array.isArray(body)?body.join(''):body;
    return content==null||content===''?`<${name}${a}/>`:`<${name}${a}>${content}</${name}>`;
  }
  const leaf=(name,value,attrs)=>tag(name,attrs,esc(value));
  /* ---------- 음이름 ---------- */
  const TPC_STEPS=['F','C','G','D','A','E','B'],STEP_NAMES=['C','D','E','F','G','A','B'];
  const validTpc=t=>Number.isFinite(t)&&t>=-1&&t<=33;
  function tpcToPitch(tpc,midi){
    const f=tpc-14,alter=Math.floor((f+1)/7);
    return {step:TPC_STEPS[((f+1)%7+7)%7],alter,octave:Math.floor((midi-alter)/12)-1};
  }
  const SHARP_NAMES=[['C',0],['C',1],['D',0],['D',1],['E',0],['F',0],['F',1],['G',0],['G',1],['A',0],['A',1],['B',0]];
  const FLAT_NAMES=[['C',0],['D',-1],['D',0],['E',-1],['E',0],['F',0],['G',-1],['G',0],['A',-1],['A',0],['B',-1],['B',0]];
  function midiToPitch(midi,fifths){const [step,alter]=(fifths<0?FLAT_NAMES:SHARP_NAMES)[((midi%12)+12)%12];return {step,alter,octave:Math.floor((midi-alter)/12)-1};}
  /* ---------- 음자리표·마디선·조표 ---------- */
  const CLEFS={G:['G',2,0],G8va:['G',2,1],G15ma:['G',2,2],G8vb:['G',2,-1],G15mb:['G',2,-2],G8vbo:['G',2,-1],G8vbp:['G',2,-1],G8vbc:['G',2,-1],G1:['G',1,0],F:['F',4,0],F8vb:['F',4,-1],F15mb:['F',4,-2],F8va:['F',4,1],F15ma:['F',4,2],F3:['F',3,0],F5:['F',5,0],C1:['C',1,0],C2:['C',2,0],C3:['C',3,0],C4:['C',4,0],C5:['C',5,0],C_19C:['C',3,0],C1_F18C:['C',1,0],C3_F18C:['C',3,0],C4_F18C:['C',4,0],C1_F20C:['C',1,0],C3_F20C:['C',3,0],C4_F20C:['C',4,0],PERC:['percussion',2,0],PERC2:['percussion',2,0],TAB:['G',2,-1],TAB2:['G',2,-1],TAB4:['G',2,-1],TAB_SERIF:['G',2,-1],TAB4_SERIF:['G',2,-1]};
  const LEGACY_CLEFS={G1:'G8va',G2:'G15ma',G3:'G8vb',F8:'F8vb',F15:'F15mb',F_B:'F3',F_C:'F5',F_8VA:'F8va',F_15MA:'F15ma',G4:'G1'};
  const LEGACY_CLEF_ORDER=['G','G1','G2','G3','F','F8','F15','F_B','F_C','C1','C2','C3','C4','TAB','PERC','C5','G4','F_8VA','F_15MA','PERC2','TAB2'];
  function parseClef(value,version){
    let name=String(value==null?'':value).trim();
    if(/^\d+$/.test(name))name=LEGACY_CLEF_ORDER[Number(name)]||'G';
    if(version<3&&LEGACY_CLEFS[name])name=LEGACY_CLEFS[name];
    return CLEFS[name]||null;
  }
  const BAR_STYLES={double:'light-light',end:'light-heavy',dashed:'dashed',broken:'dashed',dotted:'dotted',heavy:'heavy','double-heavy':'heavy-heavy','reverse-end':'heavy-light'};
  const LEGACY_BARS=['normal','double','start-repeat','end-repeat','dashed','end','end-start-repeat','dotted'];
  const MODES=['major','minor','dorian','phrygian','lydian','mixolydian','aeolian','ionian','locrian'];
  const wrapFifths=f=>{while(f>7)f-=12;while(f<-7)f+=12;return f;};
  // 실음 조표(fifths) → 기보 조표. d/c는 MuseScore의 transposeDiatonic/Chromatic(실음이 낮으면 음수)입니다.
  const keyShift=(fifths,tr)=>tr&&(tr.c||tr.d)?wrapFifths(fifths-7*tr.c+12*tr.d):fifths;
  /* ---------- 코드 심볼·기호 표 ---------- */
  const KINDS=[['maj7','major-seventh'],['M7','major-seventh'],['Δ','major-seventh'],['Δ7','major-seventh'],['ma7','major-seventh'],['j7','major-seventh'],['maj9','major-ninth'],['M9','major-ninth'],['maj13','major-13th'],['maj','major'],
    ['m7b5','half-diminished'],['ø','half-diminished'],['ø7','half-diminished'],['min7b5','half-diminished'],['mMaj7','major-minor'],['mM7','major-minor'],['m(maj7)','major-minor'],
    ['m13','minor-13th'],['m11','minor-11th'],['m9','minor-ninth'],['m7','minor-seventh'],['min7','minor-seventh'],['-7','minor-seventh'],['m6','minor-sixth'],['min','minor'],['m','minor'],['-','minor'],
    ['dim7','diminished-seventh'],['o7','diminished-seventh'],['dim','diminished'],['o','diminished'],['aug7','augmented-seventh'],['+7','augmented-seventh'],['aug','augmented'],['+','augmented'],
    ['7sus4','suspended-fourth'],['sus4','suspended-fourth'],['sus2','suspended-second'],['sus','suspended-fourth'],['13','dominant-13th'],['11','dominant-11th'],['9','dominant-ninth'],['7','dominant'],['69','major-sixth'],['6','major-sixth'],['5','power']];
  function chordKind(name){
    const key=name.replace(/\s+/g,'');if(!key)return {kind:'major',text:null};
    const exact=KINDS.find(([n])=>n===key);if(exact)return {kind:exact[1],text:key};
    const prefix=KINDS.filter(([n])=>key.startsWith(n)).sort((a,b)=>b[0].length-a[0].length)[0];
    return {kind:prefix?prefix[1]:'other',text:key};
  }
  const DYNAMICS=['pppppp','ppppp','pppp','ppp','pp','p','mp','mf','f','ff','fff','ffff','fffff','ffffff','sf','sfp','sfpp','fp','rf','rfz','sfz','sffz','fz','n','pf'];
  const ARTICULATIONS={staccato:'staccato',tenuto:'tenuto',accent:'accent',marcato:'strong-accent',staccatissimo:'staccatissimo',sforzato:'accent',portato:'detached-legato',stress:'stress',unstress:'unstress'};
  const ORNAMENTS={trill:'trill-mark',prall:'inverted-mordent',mordent:'mordent',turn:'turn',reverseturn:'inverted-turn',upprall:'trill-mark',downprall:'trill-mark'};
  const ACCIDENTALS={sharp:'sharp',flat:'flat',natural:'natural',sharp2:'double-sharp',doublesharp:'double-sharp',flat2:'flat-flat',doubleflat:'flat-flat',naturalsharp:'natural-sharp',naturalflat:'natural-flat',sharpsharp:'sharp-sharp'};
  const GRACE_TAGS=['acciaccatura','appoggiatura','grace4','grace8','grace16','grace32','grace64','grace8after','grace16after','grace32after','grace64after'];
  const OTTAVA={'8va':['down',8],'8vb':['up',8],'15ma':['down',15],'15mb':['up',15],'22ma':['down',22],'22mb':['up',22]};
  const NOTEHEADS={cross:'x',diamond:'diamond',slash:'slash',triangle:'triangle'};
  const MAX_DIVISIONS=20000;

  /* ---------- 마디를 보이스 흐름으로 분해 ---------- */
  // 3.x부터는 모든 보이스가 <voice> 아래에 있습니다. 2.x까지는 <Measure> 바로 아래에 모든 보이스가 섞여 있고,
  // 첫 보이스가 아닌 요소는 <track>(오선×4+보이스) 값을 가지며 <tick>(절대 틱)이 새 위치를 알려 줍니다.
  function measureStreams(measureEl,baseTrack){
    const voices=els(measureEl,'voice');
    if(voices.length)return voices.map(v=>Array.from(v.children));
    const streams=[[]];let pendingTick=null;
    for(let c=measureEl.firstElementChild;c;c=c.nextElementSibling){
      if(c.localName==='tick'){pendingTick=parseInt(c.textContent,10);continue;}
      const track=parseInt(txt(c,'track'),10),voice=Number.isFinite(track-baseTrack)?Math.max(0,Math.min(3,track-baseTrack)):0;
      while(streams.length<=voice)streams.push([]);
      if(pendingTick!=null&&(c.localName==='Chord'||c.localName==='Rest')){streams[voice].push({localName:'tickAbs',ticks:pendingTick});pendingTick=null;}
      streams[voice].push(c);
    }
    return streams;
  }
  function readTime(c){
    const n=int(c,'sigN',int(c,'nom1',4)),d=int(c,'sigD',int(c,'den',4)),subtype=txt(c,'subtype');
    // 오선별 박자 비율(stretchN/stretchD)이 있으면 <location> 간격은 실제 시간이므로 기보 단위로 환산할 비율을 보관합니다.
    const sn=int(c,'stretchN',1),sd=int(c,'stretchD',1);
    return {n:n>0?n:4,d:d>0?d:4,locScale:sn>0&&sd>0?fr(sn,sd):ONE,symbol:subtype==='1'&&n===4&&d===4?'common':subtype==='2'&&n===2&&d===2?'cut':null};
  }
  function readKey(c,ctx){
    if(el(c,'custom')){ctx.warn('사용자 정의 조표는 조표 없음으로 변환됩니다.');return {fifths:0,mode:null};}
    const actual=int(c,'actualKey',NaN),concert=int(c,'concertKey',NaN),accidental=int(c,'accidental',NaN);
    let fifths=0;
    if(Number.isFinite(actual))fifths=actual;
    else if(Number.isFinite(concert))fifths=keyShift(concert,ctx.part.transpose);
    else if(Number.isFinite(accidental))fifths=ctx.concertMode?keyShift(accidental,ctx.part.transpose):accidental;
    const mode=(txt(c,'mode')||'').trim();
    return {fifths:Math.max(-7,Math.min(7,fifths)),mode:MODES.includes(mode)?mode:null};
  }
  function readNote(n,ctx,chord){
    const midi=int(n,'pitch',NaN);
    if(!Number.isFinite(midi))return null;
    const tr=ctx.part.transpose,tpc=int(n,'tpc',NaN),tpc2=int(n,'tpc2',NaN),writtenMidi=midi-(tr?tr.c:0);
    let pitch;
    if(ctx.percussion){
      const drum=ctx.drums.get(midi),index=38-(drum?drum.line:4);
      pitch={unpitched:true,step:STEP_NAMES[((index%7)+7)%7],octave:Math.floor(index/7)};
    }else{
      const tpcWritten=tr&&(tr.c||tr.d)?(validTpc(tpc2)?tpc2:(tr.d%7===0&&validTpc(tpc)?tpc:NaN)):(validTpc(tpc)?tpc:NaN);
      pitch=Number.isFinite(tpcWritten)?tpcToPitch(tpcWritten,writtenMidi):midiToPitch(writtenMidi,ctx.part.fifths);
    }
    const cue=(txt(chord,'small')==='1'||txt(n,'small')==='1')&&txt(n,'play')==='0';
    const eid=txt(n,'eid');
    let tieStart=false,tieStop=!!el(n,'endSpanner');
    for(const sp of els(n,'Spanner')){if(sp.getAttribute('type')!=='Tie')continue;if(el(sp,'next'))tieStart=true;if(el(sp,'prev'))tieStop=true;}
    // 5.00은 끝 음에 <Tie><startElement/><endElement/></Tie>(음 eid)로 저장하고, 2.x는 시작 음에 빈 <Tie id>를 둡니다.
    for(const t of els(n,'Tie')){
      const from=txt(t,'startElement'),to=txt(t,'endElement');
      if(from==null&&to==null)tieStart=true;
      else if(to&&to===eid){tieStop=true;if(from)ctx.score.tieStarts.push(from);}
      else if(from&&from===eid)tieStart=true;
    }
    const acc=el(n,'Accidental');
    const accKey=acc?(txt(acc,'subtype')||'').replace(/^accidental/i,'').replace(/[^a-z0-9]/gi,'').toLowerCase():'';
    const head=(txt(n,'head')||txt(n,'headGroup')||'').toLowerCase().replace(/^head_/,'');
    const note={pitch,cue,tieStart:cue?false:tieStart,tieStop:cue?false:tieStop,accidental:ACCIDENTALS[accKey]||null,notehead:NOTEHEADS[head]||null,visible:txt(n,'visible')!=='0',staffMove:int(chord,'staffMove',0)};
    if(eid)ctx.score.notesByEid.set(eid,note);
    return note;
  }
  function readLyric(l){
    const text=textOf(l,'text');
    if(!text)return null;
    const syllabic=(txt(l,'syllabic')||'single').trim();
    return {number:int(l,'no',0)+1,syllabic:['begin','middle','end'].includes(syllabic)?syllabic:'single',text,extend:parseInt(txt(l,'ticks'),10)>0||(parseFraction(txt(l,'ticks_f'))||ZERO).n>0};
  }
  function readSlurs(c,ctx){
    const result=[],part=ctx.part;
    const stack=part.slurs.get(ctx.streamKey)||[];part.slurs.set(ctx.streamKey,stack);
    const start=id=>{let number=16;for(let n=1;n<=16;n++)if(!part.slurNumbers.has(n)){number=n;break;}part.slurNumbers.add(number);stack.push({id,number});result.push({type:'start',number});};
    const stop=id=>{
      let index=id!=null?stack.findIndex(s=>s.id===id):-1;
      if(index<0)index=stack.length-1;
      if(index<0)return;
      const [slur]=stack.splice(index,1);part.slurNumbers.delete(slur.number);result.push({type:'stop',number:slur.number});
    };
    for(const sp of els(c,'Spanner')){
      if(sp.getAttribute('type')!=='Slur')continue;
      if(el(sp,'prev'))stop(null);
      if(el(sp,'next'))start(null);
    }
    for(const s of els(c,'Slur')){
      const type=s.getAttribute('type'),id=s.getAttribute('id');
      if(type==='stop')stop(id);else if(type==='start')start(id);
    }
    return result;
  }
  // 트레몰로: r8~r64는 한 음 반복, c8~c64는 두 음 사이(첫 음이 start, 다음 음이 stop). 막대 수는 8→1 … 64→4입니다.
  function readTremolo(c,open){
    if(open)return {type:'stop',marks:open};
    const t=el(c,'Tremolo')||el(c,'TremoloSingleChord')||el(c,'TremoloTwoChord');
    const m=t&&(txt(t,'subtype')||'').trim().match(/^([cr])(8|16|32|64)$/i);
    if(!m)return null;
    return {type:m[1].toLowerCase()==='c'?'start':'single',marks:{8:1,16:2,32:3,64:4}[m[2]]};
  }
  function readHarmony(c,ctx){
    const rootTpc=int(c,'root',NaN),baseTpc=int(c,'base',NaN),name=textOf(c,'name');
    const staff=ctx.staffCount>1?[leaf('staff',ctx.si+1)]:[];
    if(!validTpc(rootTpc)){
      const text=name||textOf(c,'function');
      return text?tag('direction',null,[tag('direction-type',null,leaf('words',text))].concat(staff)):null;
    }
    const spell=t=>tpcToPitch(t,60),root=spell(rootTpc),info=chordKind(name);
    const body=[tag('root',null,[leaf('root-step',root.step),root.alter?leaf('root-alter',root.alter):'']),leaf('kind',info.kind,info.text?{text:info.text}:null)];
    if(validTpc(baseTpc)){const b=spell(baseTpc);body.push(tag('bass',null,[leaf('bass-step',b.step),b.alter?leaf('bass-alter',b.alter):'']));}
    return tag('harmony',null,body.concat(staff));
  }

  function directionXml(staffCount,si,inner,soundAttrs,placement){
    const body=[tag('direction-type',null,inner)];
    if(staffCount>1)body.push(leaf('staff',si+1));
    if(soundAttrs)body.push(tag('sound',soundAttrs));
    return tag('direction',placement?{placement}:null,body);
  }
  const OTTAVA_SHIFT={8:12,15:24,22:36};
  /* ---------- 보이스 흐름 → 이벤트 ---------- */
  function runStream(children,ctx){
    const events=[],part=ctx.part,stack=[];
    let pos=ZERO,lastMain=null,pending=[],seenTimed=false,tremoloOpen=0;
    const direction=(inner,soundAttrs,placement)=>directionXml(ctx.staffCount,ctx.si,inner,soundAttrs,placement);
    const raw=xml=>events.push({k:'raw',pos,xml});
    // 2.x는 <Tuplet id>를 먼저 정의하고 음표가 id를 참조하며, 3.x는 <Tuplet>…<endTuplet/> 구간으로 표기합니다.
    const chainOf=c=>{
      const ref=txt(c,'Tuplet');
      if(ref!=null&&ctx.tupDefs.size){const chain=[];let d=ctx.tupDefs.get(ref.trim());while(d&&chain.length<8){chain.unshift(d);d=d.parent?ctx.tupDefs.get(d.parent):null;}return chain;}
      return stack.slice();
    };
    const factorOf=chain=>chain.reduce((acc,t)=>mul(acc,fr(t.normal,t.actual)),ONE);
    for(const c of children){
      switch(c.localName){
        case 'Chord':{
          const dtype=lastTxt(c,'durationType'),base=DURATIONS[dtype];
          if(!base){ctx.warn('알 수 없는 음표 길이를 건너뛰었습니다.');break;}
          const grace=GRACE_TAGS.find(name=>el(c,name)),dots=int(c,'dots',0),chain=grace?[]:chainOf(c);
          const notes=els(c,'Note').map(n=>readNote(n,ctx,c)).filter(Boolean);
          if(!notes.length){
            // 읽을 수 있는 음이 없으면 같은 길이의 쉼표로 대신해 마디 길이가 어긋나지 않게 합니다.
            if(!grace){const dur=mul(mul(base,dotFactor(dots)),factorOf(chain));events.push({k:'rest',pos,type:dtype,dots,measureRest:false,tuplets:chain,dur,graces:[],after:[],visible:true});seenTimed=true;pos=add(pos,dur);}
            break;
          }
          const ev={k:'chord',eid:txt(c,'eid'),pos,type:dtype,dots:grace?0:dots,tuplets:chain,dur:grace?ZERO:(parseFraction(txt(c,'duration'))||mul(mul(base,dotFactor(dots)),factorOf(chain))),notes,graces:[],after:[],tremolo:readTremolo(c,tremoloOpen),visible:txt(c,'visible')!=='0',
            lyrics:els(c,'Lyrics').map(readLyric).filter(Boolean),artics:[],orns:[],fermata:!!el(c,'Fermata'),slurs:readSlurs(c,ctx)};
          for(const a of els(c,'Articulation')){
            const sub=(txt(a,'subtype')||'').replace(/^artic/i,'').replace(/(Above|Below|Up|Down)$/,'').toLowerCase();
            if(sub.startsWith('fermata'))ev.fermata=true;else if(ARTICULATIONS[sub])ev.artics.push(ARTICULATIONS[sub]);else if(ORNAMENTS[sub])ev.orns.push(ORNAMENTS[sub]);
          }
          for(const o of els(c,'Ornament')){const sub=(txt(o,'subtype')||'').replace(/^ornament/i,'').replace(/(Above|Below)$/,'').toLowerCase();if(ORNAMENTS[sub])ev.orns.push(ORNAMENTS[sub]);}
          if(ev.eid)ctx.score.chordsByEid.set(ev.eid,ev);
          if(grace){
            ev.grace={slash:grace==='acciaccatura',after:/after$/.test(grace)};
            if(ev.grace.after&&lastMain)lastMain.after.push(ev);else pending.push(ev);
            break;
          }
          ev.graces=pending;pending=[];
          tremoloOpen=ev.tremolo&&ev.tremolo.type==='start'?ev.tremolo.marks:0;
          events.push(ev);lastMain=ev;seenTimed=true;pos=add(pos,ev.dur);
          break;
        }
        case 'Rest':{
          const dtype=lastTxt(c,'durationType');
          let dur,type=dtype,dots=int(c,'dots',0),measureRest=false,chain=[];
          if(dtype==='measure'){measureRest=true;dur=parseFraction(txt(c,'duration'))||ctx.measLen;type=null;dots=0;}
          else{const base=DURATIONS[dtype];if(!base){ctx.warn('알 수 없는 쉼표 길이를 건너뛰었습니다.');break;}chain=chainOf(c);dur=mul(mul(base,dotFactor(dots)),factorOf(chain));}
          events.push({k:'rest',pos,type,dots,measureRest,tuplets:chain,dur,graces:[],after:[],visible:txt(c,'visible')!=='0'});
          seenTimed=true;pos=add(pos,dur);
          break;
        }
        case 'Tuplet':{
          const t={normal:Math.max(1,int(c,'normalNotes',2)),actual:Math.max(1,int(c,'actualNotes',3))},id=c.getAttribute('id');
          if(id!=null){t.parent=txt(c,'Tuplet');ctx.tupDefs.set(id,t);}else stack.push(t);
          break;
        }
        case 'endTuplet':stack.pop();break;
        case 'tickAbs':{pos=sub(fr(c.ticks,4*ctx.division),ctx.measureStart);if(cmp(pos,ZERO)<0)pos=ZERO;break;}
        case 'Ottava':case 'HairPin':case 'Volta':{
          // 2.x: 시작 요소에 id가 있고 끝은 <endSpanner id>로 표시합니다.
          const id=c.getAttribute('id');
          if(id==null)break;
          if(c.localName==='Ottava'){
            const info=OTTAVA[textOf(c,'subtype')||'8va']||OTTAVA['8va'];
            ctx.ottavaMarks.push({pos,shift:(info[0]==='down'?1:-1)*OTTAVA_SHIFT[info[1]]});
            part.spanIds.set(id,{kind:'Ottava',size:info[1]});
            raw(direction(tag('octave-shift',{type:info[0],size:info[1],number:ctx.voiceNo}),null,'above'));
          }else if(c.localName==='HairPin'){
            const wedge=int(c,'subtype',0)%2===0?'crescendo':'diminuendo';
            part.spanIds.set(id,{kind:'HairPin'});
            raw(direction(tag('wedge',{type:wedge,number:ctx.voiceNo}),null,'below'));
          }else part.spanIds.set(id,{kind:'Volta',start:ctx.m,endings:(txt(c,'endings')||String(part.voltas.length+1)).replace(/\s+/g,'')});
          break;
        }
        case 'endSpanner':{
          const open=part.spanIds.get(c.getAttribute('id'));
          if(!open)break;
          part.spanIds.delete(c.getAttribute('id'));
          if(open.kind==='Ottava'){ctx.ottavaMarks.push({pos,shift:0});raw(direction(tag('octave-shift',{type:'stop',size:open.size,number:ctx.voiceNo}),null,'above'));}
          else if(open.kind==='HairPin')raw(direction(tag('wedge',{type:'stop',number:ctx.voiceNo}),null,'below'));
          else part.voltas.push({start:open.start,last:cmp(pos,ZERO)===0&&ctx.m>open.start?ctx.m-1:ctx.m,endings:open.endings});
          break;
        }
        case 'location':{pos=add(pos,mul(parseFraction(txt(c,'fractions'))||ZERO,ctx.locScale));if(cmp(pos,ZERO)<0)pos=ZERO;break;}
        case 'Clef':{
          const clef=parseClef(txt(c,'transposingClefType')||txt(c,'concertClefType')||txt(c,'clefType')||txt(c,'subtype'),ctx.version);
          if(!clef)break;
          if(!seenTimed&&cmp(pos,ZERO)===0)ctx.measure.clefStart[ctx.si]=clef;else events.push({k:'clef',pos,clef});
          break;
        }
        case 'KeySig':{
          if(ctx.si!==0)break;
          const key=readKey(c,ctx);part.fifths=key.fifths;
          if(cmp(pos,ZERO)===0)ctx.measure.key=key;else events.push({k:'key',pos,key});
          break;
        }
        case 'TimeSig':if(ctx.si===0&&cmp(pos,ZERO)!==0)events.push({k:'time',pos,time:readTime(c)});break;
        case 'InstrumentChange':{
          const inst=el(c,'Instrument');if(!inst)break;
          const d=int(inst,'transposeDiatonic',0),cc=int(inst,'transposeChromatic',0);
          part.transpose=d||cc?{d,c:cc}:null;ctx.measure.transpose=part.transpose||{d:0,c:0};
          break;
        }
        case 'Tempo':{
          const q=parseFloat(txt(c,'tempo')),text=textOf(c,'text');
          if(!(q>0))break;
          const bpm=Math.round(q*6000)/100,metro=text.match(/^(♩|♪)?\s*(\.)?\s*=\s*(\d+(?:\.\d+)?)$/);
          if(metro)raw(direction(tag('metronome',null,[leaf('beat-unit',metro[1]==='♪'?'eighth':'quarter'),metro[2]?tag('beat-unit-dot'):'',leaf('per-minute',metro[3])]),{tempo:bpm},'above'));
          else raw(direction(text?leaf('words',text):tag('words'),{tempo:bpm},'above'));
          break;
        }
        case 'Dynamic':{
          const sub=(txt(c,'subtype')||'').trim();
          if(DYNAMICS.includes(sub))raw(direction(tag('dynamics',null,tag(sub)),null,'below'));
          else{const text=textOf(c,'text')||sub;if(text)raw(direction(tag('dynamics',null,leaf('other-dynamics',text)),null,'below'));}
          break;
        }
        case 'StaffText':case 'SystemText':case 'PlayTechAnnotation':case 'TempoText':{const text=textOf(c,'text');if(text)raw(direction(leaf('words',text),null,'above'));break;}
        case 'RehearsalMark':{const text=textOf(c,'text');if(text)raw(direction(leaf('rehearsal',text),null,'above'));break;}
        case 'Marker':{
          const label=(txt(c,'label')||'').trim(),text=textOf(c,'text');
          if(label==='segno'||label==='varsegno')raw(direction(tag('segno'),{segno:label}));
          else if(label==='coda'||label==='varcoda'||label==='codab')raw(direction(tag('coda'),{coda:label}));
          else if(label==='fine')raw(direction(leaf('words',text||'Fine'),{fine:'yes'}));
          else if(/^to/i.test(label))raw(direction(leaf('words',text||'To Coda'),{tocoda:label.replace(/^to\s*/i,'')||'coda'}));
          else if(text)raw(direction(leaf('words',text)));
          break;
        }
        case 'Jump':{
          const text=textOf(c,'text'),to=(txt(c,'jumpTo')||'').trim();
          raw(direction(leaf('words',text||(to==='start'?'D.C.':'D.S.')),to==='start'?{dacapo:'yes'}:to?{dalsegno:to}:null));
          break;
        }
        case 'Harmony':{const xml=readHarmony(c,ctx);if(xml)raw(xml);break;}
        case 'BarLine':{
          let sub=(txt(c,'subtype')||'').trim();
          if(/^\d+$/.test(sub))sub=LEGACY_BARS[Number(sub)]||'normal';
          const bar=ctx.measure.rightBar;
          if(sub==='start-repeat')ctx.measure.leftBar.repeat=true;
          else if(sub==='end-repeat'||sub==='end-start-repeat'){bar.repeat=true;bar.times=bar.times||2;if(sub==='end-start-repeat')bar.next=true;}
          else if(BAR_STYLES[sub])bar.style=BAR_STYLES[sub];
          break;
        }
        case 'Spanner':{
          const type=c.getAttribute('type'),start=!!el(c,'next'),stop=!!el(c,'prev');
          if(type==='HairPin'){
            const open=part.hairpins.get(ctx.streamKey)||[];part.hairpins.set(ctx.streamKey,open);
            if(start){const wedge=int(el(c,'HairPin'),'subtype',0)%2===0?'crescendo':'diminuendo';open.push(wedge);raw(direction(tag('wedge',{type:wedge,number:ctx.voiceNo}),null,'below'));}
            else if(stop&&open.length){open.pop();raw(direction(tag('wedge',{type:'stop',number:ctx.voiceNo}),null,'below'));}
          }else if(type==='Ottava'){
            if(start){
              const info=OTTAVA[(textOf(el(c,'Ottava'),'subtype')||'8va')]||OTTAVA['8va'];
              part.ottava.set(ctx.streamKey,info[1]);
              ctx.ottavaMarks.push({pos,shift:(info[0]==='down'?1:-1)*(info[1]===8?12:info[1]===15?24:36)});
              raw(direction(tag('octave-shift',{type:info[0],size:info[1],number:ctx.voiceNo}),null,'above'));
            }else if(stop&&part.ottava.has(ctx.streamKey)){
              ctx.ottavaMarks.push({pos,shift:0});
              raw(direction(tag('octave-shift',{type:'stop',size:part.ottava.get(ctx.streamKey),number:ctx.voiceNo}),null,'above'));part.ottava.delete(ctx.streamKey);
            }
          }else if(type==='Volta'&&start){
            const loc=el(el(c,'next'),'location');
            part.voltas.push({start:ctx.m,endings:(txt(el(c,'Volta'),'endings')||String(part.voltas.length+1)).replace(/\s+/g,''),measures:int(loc,'measures',0),fractions:parseFraction(txt(loc,'fractions'))||ZERO});
          }
          break;
        }
        default:break;
      }
    }
    for(const g of pending){if(lastMain)lastMain.after.push(g);else ctx.warn('음표 앞 장식음 일부를 건너뛰었습니다.');}
    const timed=events.filter(e=>e.k==='chord'||e.k==='rest'),seen=new Set();
    for(const ev of timed){ev.tupStart=[];ev.tupStop=[];}
    for(const ev of timed)for(const t of ev.tuplets){if(!seen.has(t)){seen.add(t);t.first=ev;t.number=ev.tuplets.indexOf(t)+1;}t.last=ev;}
    for(const t of seen){t.first.tupStart.push(t);t.last.tupStop.push(t);}
    return events;
  }

  /* ---------- 파트 → 마디 목록 ---------- */
  function buildPart(partEl,partIndex,score){
    const {scoreStaves,version,concertMode,warn}=score;
    // <multiMeasureRest>가 있는 마디는 여러 마디를 접어 보이는 레이아웃용 합성 마디이므로 건너뜁니다.
    // 4.6 이후 형식은 파트 안의 <Staff>에 id가 없고, 악보 전체에서 순서대로 1부터 번호가 매겨집니다.
    const staffDefs=els(partEl,'Staff').map(def=>{
      const type=el(def,'StaffType'),id=def.getAttribute('id')||String(++score.staffCounter);
      score.staffCounter=Math.max(score.staffCounter,Number(id)||0);
      return {def,id,group:(type&&type.getAttribute('group'))||'pitched',measures:els(scoreStaves.get(id),'Measure').filter(m=>!el(m,'multiMeasureRest'))};
    });
    if(!staffDefs.length)throw new Error('파트에 오선이 없습니다.');
    const instrument=el(partEl,'Instrument');
    const transposeOf=inst=>{const d=int(inst,'transposeDiatonic',0),c=int(inst,'transposeChromatic',0);return d||c?{d,c}:null;};
    const initialTranspose=transposeOf(instrument);
    const percussion=staffDefs[0].group==='percussion'||txt(instrument,'useDrumset')==='1';
    const drums=new Map();for(const drum of els(instrument,'Drum'))drums.set(Number(drum.getAttribute('pitch')),{line:int(drum,'line',4)});
    if(staffDefs.some(s=>s.group==='tablature'))warn('타브 악보는 일반 오선으로 변환됩니다.');
    if(percussion)warn('타악기 악보는 음 위치만 근사하여 변환됩니다.');
    const instClefs={};for(const c of els(instrument,'clef'))instClefs[c.getAttribute('staff')||'1']=c.textContent;
    const candidates=[txt(partEl,'trackName'),el(instrument,'longName')?textOf(instrument,'longName'):'',txt(instrument,'trackName')];
    const name=(candidates.find(n=>n&&n.trim())||`파트 ${partIndex+1}`).trim();
    const channelProgram=el(el(instrument,'Channel'),'program');
    const initialClefs=staffDefs.map((s,i)=>parseClef((i===0&&txt(instrument,'transposingClef'))||txt(s.def,'defaultClef')||instClefs[String(i+1)]||(s.group==='percussion'?'PERC':s.group==='tablature'?'TAB':'G'),version)||CLEFS.G);
    const part={transpose:initialTranspose,fifths:0,time:null,slurs:new Map(),slurNumbers:new Set(),ottava:new Map(),ottavaShift:staffDefs.map(()=>0),repeatGroup:staffDefs.map(()=>null),ottavaIntervals:staffDefs.map(()=>[]),spanIds:new Map(),hairpins:new Map(),voltas:[]};
    const staffTime=staffDefs.map(()=>null);
    const measureCount=Math.max(...staffDefs.map(s=>s.measures.length));
    const measures=[];
    let numbered=0;
    // 마디 시작 위치(전체 음표 단위). 5.00의 SpannerMap은 절대 틱으로 구간을 저장하므로 마디 길이를 미리 구합니다.
    const starts=[];
    {
      let time=null,at=ZERO;
      for(let m=0;m<measureCount;m++){
        const me=staffDefs[0].measures[m];starts.push(at);
        if(me)for(const stream of measureStreams(me,0)){const c=stream.find(x=>x.localName==='TimeSig');if(c){time=readTime(c);break;}}
        const len=me?parseFraction(me.getAttribute('len')):null;
        at=add(at,len||(time?fr(time.n,time.d):ONE));
      }
    }
    const locate=tick=>{let m=0;for(let i=0;i<starts.length;i++){if(cmp(starts[i],tick)<=0)m=i;else break;}return {m,pos:sub(tick,starts[m])};};
    const spanners=[],inject=[];
    for(const sp of score.spannerEls){
      const track=int(sp,'track',0),si=staffDefs.findIndex(sd=>Number(sd.id)-1===Math.floor(track/4));
      if(si<0)continue;
      spanners.push({type:sp.localName,el:sp,si,voice:track%4,start:parseFraction(txt(sp,'startTick')),ticks:parseFraction(txt(sp,'ticks'))});
    }
    const addInject=(tick,si,xml)=>{const at=locate(tick);(inject[at.m]=inject[at.m]||[]).push({si,pos:at.pos,xml});};
    for(const sp of spanners){
      if(!sp.start||!sp.ticks)continue;
      const end=add(sp.start,sp.ticks),number=sp.si*4+sp.voice+1;
      if(sp.type==='Ottava'){
        const info=OTTAVA[(textOf(sp.el,'subtype')||'8va')]||OTTAVA['8va'],shift=(info[0]==='down'?1:-1)*OTTAVA_SHIFT[info[1]];
        part.ottavaIntervals[sp.si].push({start:sp.start,end,shift});
        addInject(sp.start,sp.si,directionXml(staffDefs.length,sp.si,tag('octave-shift',{type:info[0],size:info[1],number}),null,'above'));
        addInject(end,sp.si,directionXml(staffDefs.length,sp.si,tag('octave-shift',{type:'stop',size:info[1],number}),null,'above'));
      }else if(sp.type==='HairPin'){
        const wedge=int(sp.el,'subtype',0)%2===0?'crescendo':'diminuendo';
        addInject(sp.start,sp.si,directionXml(staffDefs.length,sp.si,tag('wedge',{type:wedge,number}),null,'below'));
        addInject(end,sp.si,directionXml(staffDefs.length,sp.si,tag('wedge',{type:'stop',number}),null,'below'));
      }
    }
    for(let m=0;m<measureCount;m++){
      const mEls=staffDefs.map(s=>s.measures[m]||null),first=mEls[0];
      const measure={number:'',implicit:false,leftBar:{},rightBar:{},items:[],streamEvents:[],clefStart:[],key:null,time:null,transpose:null};
      if(mEls.some(me=>me&&txt(me,'irregular')==='1')){
        measure.implicit=true;
        if(m===0)measure.number='0';else measure.number=String(++numbered);
      }else measure.number=String(++numbered);
      if(first){
        if(el(first,'startRepeat'))measure.leftBar.repeat=true;
        const end=el(first,'endRepeat');if(end){measure.rightBar.repeat=true;measure.rightBar.times=parseInt(end.textContent,10)||2;}
      }
      for(const me of mEls){const id=me&&txt(me,'eid');if(id)score.measureIndex.set(id,m);}
      const streamsBy=mEls.map((me,si)=>me?measureStreams(me,(Number(staffDefs[si].id)-1)*4):[]);
      const timeIn=streams=>{for(const stream of streams)for(const c of stream)if(c.localName==='TimeSig'){return readTime(c);}return null;};
      streamsBy.forEach((streams,si)=>{const t=timeIn(streams);if(t){staffTime[si]=t;if(si===0){part.time=t;measure.time=t;}}});
      streamsBy.forEach((streams,si)=>{if(si>0&&staffTime[si]&&part.time&&(staffTime[si].n!==part.time.n||staffTime[si].d!==part.time.d)&&timeIn(streams))(measure.staffTimes=measure.staffTimes||{})[si]=staffTime[si];});
      const lenAttr=first?parseFraction(first.getAttribute('len')):null;
      const lengthFor=si=>{const t=staffTime[si]||part.time;return lenAttr||(t?fr(t.n,t.d):ONE);};
      const items=[];let cursor=ZERO;
      const moveTo=(p,voice,staff)=>{
        const c=cmp(p,cursor);
        if(c>0)items.push({k:'forward',dur:sub(p,cursor),voice,staff});
        else if(c<0)items.push({k:'backup',dur:sub(cursor,p)});
        cursor=p;
      };
      streamsBy.forEach((streams,si)=>{
        // 마디 반복 기호: 반복 대상 마디의 음표·쉼표를 그대로 펼칩니다.
        const repeatEl=streams.map(stream=>stream.find(c=>c.localName==='MeasureRepeat')).find(Boolean),group=part.repeatGroup[si];
        let copyFrom=-1;
        if(repeatEl){const n=Math.max(1,int(repeatEl,'subtype',1));part.repeatGroup[si]={n,remaining:n-1};copyFrom=m-n;}
        else if(group&&group.remaining>0&&!streams.some(stream=>stream.some(c=>c.localName==='Chord'||c.localName==='Rest'))){group.remaining--;copyFrom=m-group.n;}
        let lists;
        if(copyFrom>=0&&measures[copyFrom]&&measures[copyFrom].streamEvents[si]){
          lists=measures[copyFrom].streamEvents[si].map(list=>list.filter(ev=>ev.k==='chord'||ev.k==='rest').map(ev=>Object.assign({},ev,{slurs:[],lyrics:[]})));
        }else{
          const tupDefs=new Map(),ottavaMarks=[],chords=[];
          lists=streams.map((children,vi)=>{
            const ctx={score,part,measure,m,si,vi,locScale:(staffTime[si]||{}).locScale||ONE,measureStart:starts[m],division:score.division,voiceNo:si*4+Math.min(vi,3)+1,streamKey:`${si}:${vi}`,staffCount:staffDefs.length,measLen:lengthFor(si),tupDefs,ottavaMarks,warn,percussion,drums,version,concertMode};
            const list=runStream(children,ctx);
            for(const ev of list)if(ev.k==='chord')chords.push(ev);
            return list;
          });
          // 옥타브 기호(8va 등) 아래의 pitch는 기보 위치이므로 실음으로 환산합니다. 기호는 오선 전체(모든 보이스)에 적용됩니다.
          const marks=ottavaMarks.sort((a,b)=>cmp(a.pos,b.pos)),carry=part.ottavaShift[si],intervals=part.ottavaIntervals[si];
          for(const ev of chords)ev.abs=add(starts[m],ev.pos);
          if(marks.length||carry||intervals.length){
            for(const ev of chords){
              let shift=0;
              if(intervals.length){const hit=intervals.find(x=>cmp(x.start,ev.abs)<=0&&cmp(ev.abs,x.end)<0);shift=hit?hit.shift:0;}
              else{shift=carry;for(const mark of marks)if(cmp(mark.pos,ev.pos)<=0)shift=mark.shift;}
              if(!shift)continue;
              for(const target of [ev].concat(ev.graces,ev.after))for(const n of target.notes)if(!n.pitch.unpitched)n.pitch.octave+=shift/12;
            }
            if(marks.length)part.ottavaShift[si]=marks[marks.length-1].shift;
          }
        }
        const extra=(inject[m]||[]).filter(x=>x.si===si);
        if(extra.length){
          if(!lists.length)lists=[[]];
          for(const x of extra){const at=lists[0].findIndex(ev=>cmp(ev.pos,x.pos)>=0);lists[0].splice(at<0?lists[0].length:at,0,{k:'raw',pos:x.pos,xml:x.xml});}
        }
        measure.streamEvents[si]=lists;
        lists.forEach((events,vi)=>{
          const voiceNo=si*4+Math.min(vi,3)+1;
          for(const ev of events){
            if(ev.k==='chord'||ev.k==='rest'){
              moveTo(ev.pos,voiceNo,si+1);
              for(const g of ev.graces)items.push({k:'note',ev:g,staff:si+1,voice:voiceNo});
              items.push({k:'note',ev,staff:si+1,voice:voiceNo,dur:ev.dur});
              cursor=add(ev.pos,ev.dur);
              for(const g of ev.after)items.push({k:'note',ev:g,staff:si+1,voice:voiceNo});
            }else{moveTo(ev.pos,voiceNo,si+1);items.push(Object.assign({staff:si+1,voice:voiceNo},ev));}
          }
        });
      });
      measure.items=items;
      measures.push(measure);
    }
    measures.forEach((measure,i)=>{if(measure.rightBar.next&&measures[i+1])measures[i+1].leftBar.repeat=true;});
    // 5.00 슬러: 시작·끝 음의 eid로 연결합니다. 동시에 열린 슬러가 겹치지 않도록 가장 작은 빈 번호를 씁니다.
    const slurs=spanners.filter(sp=>sp.type==='Slur').map(sp=>({s:score.chordsByEid.get(txt(sp.el,'startElement')),e:score.chordsByEid.get(txt(sp.el,'endElement'))})).filter(x=>x.s&&x.e&&x.s!==x.e&&x.s.abs&&x.e.abs);
    slurs.sort((a,b)=>cmp(a.s.abs,b.s.abs)||cmp(b.e.abs,a.e.abs));
    const active=[];
    for(const sl of slurs){
      for(let i=active.length-1;i>=0;i--)if(cmp(active[i].end,sl.s.abs)<=0)active.splice(i,1);
      let number=1;while(active.some(a=>a.number===number)&&number<16)number++;
      active.push({end:sl.e.abs,number});
      sl.s.slurs.push({type:'start',number});sl.e.slurs.unshift({type:'stop',number});
    }
    for(const sp of spanners){
      if(sp.type!=='Volta')continue;
      const a=score.measureIndex.get(txt(sp.el,'startElement')),b=score.measureIndex.get(txt(sp.el,'endElement'));
      if(a==null)continue;
      part.voltas.push({start:a,last:b==null?a:b,endings:(txt(sp.el,'endings')||String(part.voltas.length+1)).replace(/\s+/g,'')});
    }
    // 볼타(반복 종결): 시작 마디에서 <next> 위치만큼 떨어진 마디까지가 괄호 구간입니다.
    for(const v of part.voltas){
      const last=v.last!=null?v.last:Math.min(measures.length-1,Math.max(v.start,v.start+v.measures-(cmp(v.fractions,ZERO)>0?0:1)));
      measures[v.start].leftBar.endingStart=v.endings;
      measures[last].rightBar.endingStop={number:v.endings,type:measures[last].rightBar.repeat?'stop':'discontinue'};
    }
    return {id:`P${partIndex+1}`,name,abbreviation:el(instrument,'shortName')?textOf(instrument,'shortName'):'',program:channelProgram?Number(channelProgram.getAttribute('value')):NaN,percussion,measures,staffCount:staffDefs.length,initialClefs,initialTranspose};
  }

  /* ---------- 직렬화 ---------- */
  const clefXml=(clef,number)=>tag('clef',number?{number}:null,[leaf('sign',clef[0]),leaf('line',clef[1]),clef[2]?leaf('clef-octave-change',clef[2]):'']);
  const keyXml=key=>tag('key',null,[leaf('fifths',key.fifths),key.mode?leaf('mode',key.mode):'']);
  const timeXml=(t,number)=>tag('time',{number:number||null,symbol:t.symbol},[leaf('beats',t.n),leaf('beat-type',t.d)]);
  const transposeXml=tr=>{const octave=Math.trunc(tr.c/12);return tag('transpose',null,[leaf('diatonic',tr.d%7),leaf('chromatic',tr.c%12),octave?leaf('octave-change',octave):'']);};

  function convertDocument(doc,options={}){
    const warnings=new Set(),warn=message=>warnings.add(message);
    const root=doc.documentElement;
    if(!root||root.localName!=='museScore')throw new Error('MuseScore 악보 파일이 아닙니다.');
    const version=parseFloat(root.getAttribute('version')||'0')||0;
    const scoreEl=el(root,'Score')||(el(root,'Part')?root:null);
    if(!scoreEl)throw new Error('MuseScore 악보 본문(Score)을 찾지 못했습니다.');
    const meta={};for(const m of els(scoreEl,'metaTag'))meta[m.getAttribute('name')]=m.textContent.trim();
    const scoreStaves=new Map();for(const s of els(scoreEl,'Staff'))scoreStaves.set(s.getAttribute('id'),s);
    let boxTitle='';
    for(const staff of scoreStaves.values()){
      for(const box of els(staff,'VBox'))for(const text of els(box,'Text'))if(!boxTitle&&/^title$/i.test(txt(text,'style')||''))boxTitle=textOf(text,'text');
      if(boxTitle)break;
    }
    const partEls=els(scoreEl,'Part');
    if(!partEls.length)throw new Error('악보에 파트가 없습니다.');
    const score={scoreStaves,version,warn,division:int(scoreEl,'Division',480)||480,staffCounter:0,notesByEid:new Map(),chordsByEid:new Map(),measureIndex:new Map(),tieStarts:[],spannerEls:el(scoreEl,'SpannerMap')?Array.from(el(scoreEl,'SpannerMap').children):[],concertMode:(txt(scoreEl,'concertPitch')||txt(el(scoreEl,'Style'),'concertPitch'))==='1'};
    const parts=partEls.map((partEl,index)=>buildPart(partEl,index,score));
    for(const eid of score.tieStarts){const note=score.notesByEid.get(eid);if(note&&!note.cue)note.tieStart=true;}
    const stats={parts:parts.length,measures:Math.max(...parts.map(p=>p.measures.length)),notes:0};

    // MusicXML divisions: 모든 길이를 정수로 표현하는 최소 값을 사용합니다.
    let divisions=1;
    for(const part of parts)for(const measure of part.measures)for(const item of measure.items)if(item.dur){const q=fr(item.dur.n*4,item.dur.d);divisions=divisions/gcd(divisions,q.d)*q.d;}
    if(divisions>MAX_DIVISIONS){warn('매우 복잡한 리듬이 있어 길이를 근사했습니다.');divisions=int(scoreEl,'Division',480)||480;}
    const units=value=>Math.round(value.n*4*divisions/value.d);

    const title=meta.workTitle||meta.movementTitle||boxTitle||options.title||'';
    const out=['<?xml version="1.0" encoding="UTF-8"?>\n<score-partwise version="3.1">\n'];
    out.push(tag('work',null,leaf('work-title',title||'MuseScore 악보'))+'\n');
    if(meta.movementTitle&&meta.movementTitle!==title)out.push(leaf('movement-title',meta.movementTitle)+'\n');
    const creators=[];
    for(const [key,type] of [['composer','composer'],['lyricist','lyricist'],['arranger','arranger']])if(meta[key])creators.push(leaf('creator',meta[key],{type}));
    out.push(tag('identification',null,creators.concat(meta.copyright?[leaf('rights',meta.copyright)]:[],[tag('encoding',null,leaf('software',`MXL Studio MuseScore 변환 (원본 형식 ${root.getAttribute('version')||'알 수 없음'})`))]))+'\n');
    out.push('<part-list>\n');
    parts.forEach((part,index)=>{
      const channel=part.percussion?10:(index%15)+1+((index%15)+1>=10?1:0);
      out.push(tag('score-part',{id:part.id},[leaf('part-name',part.name),part.abbreviation?leaf('part-abbreviation',part.abbreviation):'',
        tag('score-instrument',{id:`${part.id}-I1`},leaf('instrument-name',part.name)),
        tag('midi-instrument',{id:`${part.id}-I1`},[leaf('midi-channel',Math.min(16,channel)),Number.isFinite(part.program)?leaf('midi-program',part.program+1):''])])+'\n');
    });
    out.push('</part-list>\n');

    const noteXml=(item,part)=>{
      const ev=item.ev,notes=ev.k==='rest'?[null]:ev.notes,xml=[];
      notes.forEach((n,idx)=>{
        const body=[];
        if(ev.grace)body.push(tag('grace',ev.grace.slash?{slash:'yes'}:null));
        if(n&&n.cue)body.push(tag('cue'));
        if(idx>0)body.push(tag('chord'));
        if(!n)body.push(tag('rest',ev.measureRest?{measure:'yes'}:null));
        else if(n.pitch.unpitched)body.push(tag('unpitched',null,[leaf('display-step',n.pitch.step),leaf('display-octave',n.pitch.octave)]));
        else body.push(tag('pitch',null,[leaf('step',n.pitch.step),n.pitch.alter?leaf('alter',n.pitch.alter):'',leaf('octave',n.pitch.octave)]));
        if(!ev.grace)body.push(leaf('duration',units(ev.dur)));
        if(n&&n.tieStop)body.push(tag('tie',{type:'stop'}));
        if(n&&n.tieStart)body.push(tag('tie',{type:'start'}));
        body.push(leaf('voice',item.voice));
        if(ev.type)body.push(leaf('type',ev.type));
        for(let i=0;i<ev.dots;i++)body.push(tag('dot'));
        if(n&&n.accidental)body.push(leaf('accidental',n.accidental));
        if(ev.tuplets.length)body.push(tag('time-modification',null,[leaf('actual-notes',ev.tuplets.reduce((a,t)=>a*t.actual,1)),leaf('normal-notes',ev.tuplets.reduce((a,t)=>a*t.normal,1))]));
        if(n&&n.notehead)body.push(leaf('notehead',n.notehead));
        if(part.staffCount>1)body.push(leaf('staff',Math.max(1,Math.min(part.staffCount,item.staff+(n?n.staffMove:0)))));
        const notations=[];
        if(n&&n.tieStop)notations.push(tag('tied',{type:'stop'}));
        if(n&&n.tieStart)notations.push(tag('tied',{type:'start'}));
        if(idx===0){
          for(const s of ev.slurs||[])notations.push(tag('slur',{type:s.type,number:s.number}));
          for(const t of ev.tupStop||[])notations.push(tag('tuplet',{type:'stop',number:t.number}));
          for(const t of ev.tupStart||[])notations.push(tag('tuplet',{type:'start',number:t.number,bracket:'yes'}));
          if(ev.artics&&ev.artics.length)notations.push(tag('articulations',null,Array.from(new Set(ev.artics),a=>tag(a))));
          if((ev.orns&&ev.orns.length)||ev.tremolo)notations.push(tag('ornaments',null,Array.from(new Set(ev.orns||[]),o=>tag(o)).concat(ev.tremolo?[leaf('tremolo',ev.tremolo.marks,{type:ev.tremolo.type})]:[])));
          if(ev.fermata)notations.push(tag('fermata',{type:'upright'}));
        }
        if(notations.length)body.push(tag('notations',null,notations));
        if(idx===0)for(const l of ev.lyrics||[])body.push(tag('lyric',{number:l.number},[leaf('syllabic',l.syllabic),leaf('text',l.text),l.extend?tag('extend'):'']));
        xml.push(tag('note',ev.visible!==false&&(!n||n.visible!==false)?null:{'print-object':'no'},body));
      });
      return xml.join('\n');
    };

    for(const part of parts){
      out.push(`<part id="${part.id}">\n`);
      part.measures.forEach((measure,m)=>{
        const lines=[],attr=[],multi=part.staffCount>1;
        if(m===0)attr.push(leaf('divisions',divisions));
        if(measure.key)attr.push(keyXml(measure.key));else if(m===0)attr.push(keyXml({fifths:0,mode:null}));
        if(measure.time)attr.push(timeXml(measure.time));
        for(const si of Object.keys(measure.staffTimes||{}))attr.push(timeXml(measure.staffTimes[si],Number(si)+1));
        if(m===0&&multi)attr.push(leaf('staves',part.staffCount));
        for(let i=0;i<part.staffCount;i++){
          const clef=measure.clefStart[i]||(m===0?part.initialClefs[i]:null);
          if(clef)attr.push(clefXml(clef,multi?i+1:null));
        }
        const transpose=measure.transpose||(m===0?part.initialTranspose:null);
        if(transpose)attr.push(transposeXml(transpose));
        if(attr.length)lines.push(tag('attributes',null,attr));
        const left=measure.leftBar;
        if(left.endingStart||left.repeat)lines.push(tag('barline',{location:'left'},[left.repeat?leaf('bar-style','heavy-light'):'',left.endingStart?tag('ending',{number:left.endingStart,type:'start'}):'',left.repeat?tag('repeat',{direction:'forward'}):'']));
        for(const item of measure.items){
          if(item.k==='note')lines.push(noteXml(item,part));
          else if(item.k==='forward')lines.push(tag('forward',null,[leaf('duration',units(item.dur)),leaf('voice',item.voice),multi?leaf('staff',item.staff):'']));
          else if(item.k==='backup')lines.push(tag('backup',null,leaf('duration',units(item.dur))));
          else if(item.k==='raw')lines.push(item.xml);
          else if(item.k==='clef')lines.push(tag('attributes',null,clefXml(item.clef,multi?item.staff:null)));
          else if(item.k==='key')lines.push(tag('attributes',null,keyXml(item.key)));
          else if(item.k==='time')lines.push(tag('attributes',null,timeXml(item.time)));
          if(item.k==='note'&&!item.ev.grace&&item.ev.k==='chord')stats.notes+=item.ev.notes.length;
        }
        const bar=measure.rightBar;
        if(bar.repeat||bar.style||bar.endingStop)lines.push(tag('barline',{location:'right'},[bar.repeat?leaf('bar-style','light-heavy'):bar.style?leaf('bar-style',bar.style):'',bar.endingStop?tag('ending',{number:bar.endingStop.number,type:bar.endingStop.type}):'',bar.repeat?tag('repeat',{direction:'backward',times:bar.times&&bar.times!==2?bar.times:null}):'']));
        out.push(tag('measure',{number:measure.number,implicit:measure.implicit?'yes':null},'\n'+lines.join('\n')+'\n')+'\n');
      });
      out.push('</part>\n');
    }
    out.push('</score-partwise>\n');
    return {xmlString:out.join(''),title,warnings:Array.from(warnings),stats,sourceVersion:root.getAttribute('version')||''};
  }

  /* ---------- 공개 API ---------- */
  function parseXml(text){
    const doc=new DOMParser().parseFromString(String(text).replace(/^\uFEFF/,''),'text/xml');
    if(doc.getElementsByTagName('parsererror').length)throw new Error('MuseScore XML 파싱 오류입니다. 파일을 확인하세요.');
    return doc;
  }
  function convertMscx(text,options){return convertDocument(parseXml(text),options);}
  async function extractMscx(data,options={}){
    const Zip=options.JSZip||global.JSZip;
    if(!Zip)throw new Error('MSCZ 압축 라이브러리를 불러오지 못했습니다.');
    const zip=await Zip.loadAsync(data);
    let entry=null;
    const container=zip.file('META-INF/container.xml');
    if(container){
      try{
        const cdoc=new DOMParser().parseFromString(await container.async('string'),'text/xml');
        for(const rootfile of Array.from(cdoc.getElementsByTagName('rootfile'))){
          const path=rootfile.getAttribute('full-path');
          if(path&&/\.mscx$/i.test(path)&&zip.file(path)){entry=zip.file(path);break;}
        }
      }catch(error){entry=null;}
    }
    if(!entry)entry=zip.file(/\.mscx$/i).filter(file=>!/^Excerpts\//i.test(file.name)).sort((a,b)=>a.name.split('/').length-b.name.split('/').length)[0]||null;
    if(!entry)throw new Error('압축 파일에서 MuseScore 악보(.mscx)를 찾지 못했습니다.');
    if(options.maxBytes&&entry._data&&entry._data.uncompressedSize>options.maxBytes)throw new Error('압축 해제한 악보가 20MB를 넘습니다.');
    return {name:entry.name,text:await entry.async('string')};
  }
  async function convertMscz(data,options={}){return convertMscx((await extractMscx(data,options)).text,options);}
  global.MsczCore={convertMscx,convertMscz,convertDocument,extractMscx,tpcToPitch,parseFraction,
    isMuseScoreFileName:name=>/\.(mscz|mscx)$/i.test(String(name||'')),
    musicXmlFileName:name=>String(name||'').replace(/\.(mscz|mscx)$/i,'')+'.musicxml',
    SUPPORTED_EXTENSIONS:['mscz','mscx']};
})(window);
