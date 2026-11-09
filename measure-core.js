// 마디 번호 조회, 조표·attributes 누적, 변경 지점 구간 계산 순수 로직
(function(global){
  'use strict';
  // MusicXML <attributes> 자식 순서.
  const ATTRIBUTE_ORDER=['footnote','level','divisions','key','time','staves','part-symbol','instruments','clef','staff-details','transpose','for-part','directive','measure-style'];
  // 이전 마디에서 이어지는 상태만 누적합니다. measure-style·directive는 해당 마디에만 의미가 있습니다.
  const CARRIED=new Set(['divisions','key','time','staves','part-symbol','instruments','clef','staff-details','transpose']);
  const PER_STAFF=new Set(['key','time','clef','staff-details','transpose']);
  const ALL_STAVES_WHEN_UNNUMBERED=new Set(['key','time','transpose']);
  const kids=(el,name)=>Array.from(el?.children||[]).filter(child=>!name||child.localName===name);

  function measureNumber(measure){
    const raw=measure?.getAttribute?.('number');
    if(raw==null||String(raw).trim()==='')return NaN;
    return Number(raw);
  }
  function firstPart(xmlDoc){
    const root=xmlDoc?.documentElement||xmlDoc;
    return kids(root,'part').find(part=>kids(part,'measure').length)||null;
  }
  // number 속성이 숫자인 마디만 담습니다. 같은 번호가 반복되면 첫 마디를 쓰고 나머지는 duplicates로 돌려줍니다.
  function measuresByNumber(partEl){
    const map=new Map(),duplicates=[];
    for(const measure of kids(partEl,'measure')){
      const number=measureNumber(measure);
      if(!Number.isFinite(number))continue;
      if(map.has(number))duplicates.push(measure);else map.set(number,measure);
    }
    return {map,duplicates};
  }
  function measureNumbers(xmlDoc){
    const part=firstPart(xmlDoc);if(!part)return [];
    return [...new Set(kids(part,'measure').map(measureNumber).filter(Number.isFinite))].sort((a,b)=>a-b);
  }
  // 문서 순서로 target 번호 마디(포함)까지의 <attributes>를 방문합니다.
  function walkAttributes(partEl,target,visit){
    const goal=Number(target);
    for(const measure of kids(partEl,'measure')){
      const number=measureNumber(measure);
      if(Number.isFinite(number)&&number>goal)break;
      for(const attributes of kids(measure,'attributes'))visit(attributes,measure);
      if(number===goal)break;
    }
  }
  function primaryKey(attributes){
    const keys=kids(attributes,'key');
    return keys.find(key=>!key.hasAttribute('number')||key.getAttribute('number')==='1')||keys[0]||null;
  }
  function keyFifthsAt(partEl,target){
    let fifths=0;
    walkAttributes(partEl,target,attributes=>{const value=kids(primaryKey(attributes),'fifths')[0];if(value)fifths=Number(value.textContent.trim())||0;});
    return fifths;
  }
  function modeAt(partEl,target){
    let mode='major';
    walkAttributes(partEl,target,attributes=>{const value=kids(primaryKey(attributes),'mode')[0];if(value)mode=value.textContent.trim()==='minor'?'minor':'major';});
    return mode;
  }
  // target 마디 시점에 유효한 divisions·key·time·staves·clef(보표별)·staff-details·transpose를 담은 새 <attributes>.
  function effectiveAttributes(partEl,target){
    const state=new Map();
    walkAttributes(partEl,target,attributes=>{
      for(const child of kids(attributes)){
        const tag=child.localName;if(!CARRIED.has(tag))continue;
        if(ALL_STAVES_WHEN_UNNUMBERED.has(tag)&&!child.hasAttribute('number'))for(const id of [...state.keys()])if(id.startsWith(`${tag}#`))state.delete(id);
        state.set(PER_STAFF.has(tag)?`${tag}#${child.getAttribute('number')||'1'}`:tag,child);
      }
    });
    const result=partEl.ownerDocument.createElement('attributes');
    const rank=([id,element])=>[ATTRIBUTE_ORDER.indexOf(element.localName),id];
    [...state.entries()].sort((a,b)=>{const [ra,ia]=rank(a),[rb,ib]=rank(b);return ra-rb||ia.localeCompare(ib,undefined,{numeric:true});})
      .forEach(([,element])=>result.appendChild(element.cloneNode(true)));
    return result;
  }
  function insertAttributesChild(attributes,element){
    const rank=ATTRIBUTE_ORDER.indexOf(element.localName);
    const before=kids(attributes).find(child=>ATTRIBUTE_ORDER.indexOf(child.localName)>rank);
    attributes.insertBefore(element,before||null);
    return element;
  }
  // 첫 음표 앞의 <attributes>. create면 없을 때 <print> 뒤에 새로 만듭니다.
  function leadingAttributes(measure,create=false){
    for(const child of kids(measure)){
      if(child.localName==='attributes')return child;
      if(['note','backup','forward'].includes(child.localName))break;
    }
    if(!create)return null;
    const attributes=measure.ownerDocument.createElement('attributes');
    measure.insertBefore(attributes,kids(measure).find(child=>child.localName!=='print')||null);
    return attributes;
  }
  // [{measure,value}] 변경 지점을 마디 번호 구간으로. 같은 마디는 마지막 값, 마지막 구간은 lastNumber까지.
  function segments(points,lastNumber){
    const sorted=Array.from(points||[],(point,index)=>({measure:Number(point?.measure),value:point?.value,index}))
      .filter(point=>Number.isFinite(point.measure)).sort((a,b)=>a.measure-b.measure||a.index-b.index);
    const unique=[];
    for(const point of sorted){
      if(unique.length&&unique[unique.length-1].measure===point.measure)unique[unique.length-1]={measure:point.measure,value:point.value};
      else unique.push({measure:point.measure,value:point.value});
    }
    const last=Number(lastNumber);
    return unique.map((point,index)=>({from:point.measure,to:index<unique.length-1?Math.min(unique[index+1].measure-1,last):last,value:point.value}))
      .filter(segment=>segment.from<=segment.to);
  }

  global.MeasureCore={ATTRIBUTE_ORDER,measureNumber,firstPart,measuresByNumber,measureNumbers,keyFifthsAt,modeAt,effectiveAttributes,insertAttributesChild,leadingAttributes,segments};
})(window);
