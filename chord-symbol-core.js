// 코드 심볼 문자열과 MusicXML harmony를 상호 변환하는 순수 로직
(function(global){
  'use strict';
  const KIND_TABLE={major:'',minor:'m',augmented:'aug',diminished:'dim',dominant:'7','major-seventh':'maj7','minor-seventh':'m7','diminished-seventh':'dim7','augmented-seventh':'aug7','half-diminished':'m7♭5','major-minor':'mMaj7','major-sixth':'6','minor-sixth':'m6','dominant-ninth':'9','major-ninth':'maj9','minor-ninth':'m9','dominant-11th':'11','major-11th':'maj11','minor-11th':'m11','dominant-13th':'13','major-13th':'maj13','minor-13th':'m13','suspended-second':'sus2','suspended-fourth':'sus4',Neapolitan:'Neapolitan',Italian:'Italian',French:'French',German:'German',pedal:'pedal',power:'5',Tristan:'Tristan',other:'other',none:'N.C.'};
  const accidental=value=>value>0?'#'.repeat(value):value<0?'♭'.repeat(-value):'';
  const alteration=text=>[...text].reduce((sum,char)=>sum+(char==='#'?1:-1),0);
  const normalize=text=>String(text||'').trim().replaceAll('♯','#').replaceAll('♭','b').replaceAll('(', '').replaceAll(')','').replace(/\s/g,'');
  const suffixes=[...Object.entries(KIND_TABLE).filter(([kind])=>kind!=='none').map(([kind,suffix])=>[normalize(suffix),kind]),['M7','major-seventh'],['min7','minor-seventh'],['min','minor'],['-','minor'],['+','augmented'],['°7','diminished-seventh'],['°','diminished'],['ø','half-diminished'],['ø7','half-diminished']].sort((a,b)=>b[0].length-a[0].length);
  function parse(value){
    if(global.ChordToolsCore?.isNoChordText(value))return {kind:'none',rootStep:null,rootAlter:0,bass:null,degrees:[]};
    const match=normalize(value).match(/^([A-G])([#b]{0,2})(.*)$/);if(!match)return null;
    let suffix=match[3],bass=null;
    const slash=suffix.match(/\/([A-G])([#b]{0,2})$/);
    if(slash){bass={step:slash[1],alter:alteration(slash[2])};suffix=suffix.slice(0,slash.index);}
    for(const [candidate,kind] of suffixes){
      if(!suffix.startsWith(candidate))continue;
      let remainder=suffix.slice(candidate.length);const degrees=[];
      while(remainder){
        const degree=remainder.match(/^(add|no|omit)?([#b]?)(\d+)/);if(!degree)break;
        degrees.push({value:Number(degree[3]),alter:alteration(degree[2]),type:['no','omit'].includes(degree[1])?'subtract':degree[1]==='add'?'add':degree[2]?'alter':'add'});
        remainder=remainder.slice(degree[0].length);
      }
      if(!remainder)return {rootStep:match[1],rootAlter:alteration(match[2]),kind,bass,degrees};
    }
    return null;
  }
  function toString(harmony){
    if(!harmony)return '';
    if(global.ChordToolsCore?.isNoChordHarmony(harmony))return 'N.C.';
    const root=harmony.querySelector('root-step')?.textContent||'';
    const alter=Number(harmony.querySelector('root-alter')?.textContent||0);
    const kind=harmony.querySelector('kind');
    let suffix=kind?.hasAttribute('text')?kind.getAttribute('text'):(KIND_TABLE[kind?.textContent||'major']??kind?.textContent??'');
    for(const degree of harmony.querySelectorAll('degree')){
      const value=degree.querySelector('degree-value')?.textContent||'',change=Number(degree.querySelector('degree-alter')?.textContent||0),type=degree.querySelector('degree-type')?.textContent||'add';
      suffix+=(type==='subtract'?'no':type==='add'?'add':'')+accidental(change)+value;
    }
    const bass=harmony.querySelector('bass-step');
    return root+accidental(alter)+suffix+(bass?'/'+bass.textContent+accidental(Number(harmony.querySelector('bass-alter')?.textContent||0)):'');
  }
  function apply(harmony,parsed){
    if(!harmony||!parsed)return false;
    const doc=harmony.ownerDocument;
    const make=(name,text)=>{const node=doc.createElement(name);if(text!==undefined)node.textContent=String(text);return node;};
    Array.from(harmony.children).filter(node=>['root','function','kind','inversion','bass','degree'].includes(node.localName)).forEach(node=>node.remove());
    const anchor=harmony.firstChild,append=node=>harmony.insertBefore(node,anchor);
    if(parsed.kind!=='none'){
      const root=make('root');root.appendChild(make('root-step',parsed.rootStep));if(parsed.rootAlter)root.appendChild(make('root-alter',parsed.rootAlter));append(root);
    }
    const kind=make('kind',parsed.kind);if(parsed.kindText!==undefined)kind.setAttribute('text',parsed.kindText);append(kind);
    if(parsed.bass){const bass=make('bass');bass.appendChild(make('bass-step',parsed.bass.step));if(parsed.bass.alter)bass.appendChild(make('bass-alter',parsed.bass.alter));append(bass);}
    for(const value of parsed.degrees||[]){const degree=make('degree');degree.appendChild(make('degree-value',value.value));degree.appendChild(make('degree-alter',value.alter||0));degree.appendChild(make('degree-type',value.type||'add'));append(degree);}
    return true;
  }
  global.ChordSymbolCore={KIND_TABLE,parse,toString,apply};
})(window);
