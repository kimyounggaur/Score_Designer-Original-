(function(global){
  const TYPES={
    note:{label:'일반메모',icon:'📝'},
    practice:{label:'연습지시',icon:'🎯'},
    theory:{label:'이론설명',icon:'💡'},
    warning:{label:'주의',icon:'⚠'},
  };
  const COLORS=['#FFD166','#4D96FF','#45C4A0','#FF6B6B'];

  function createAnnotation(input){
    return {
      id:input.id||`ann-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      measureNum:Math.max(1,parseInt(input.measureNum||1,10)),
      text:String(input.text||'').slice(0,200),
      color:input.color||COLORS[0],
      type:TYPES[input.type]?input.type:'note',
      createdAt:input.createdAt||new Date().toISOString(),
    };
  }

  function filterForPrint(annotations,mode){
    const list=annotations||[];
    if(mode==='student')return list.filter(a=>a.type==='note'||a.type==='practice');
    return list.slice();
  }

  function findMeasure(doc,measureNum){
    const wanted=String(measureNum);
    const measures=Array.from(doc.querySelectorAll('part:first-of-type > measure'));
    return measures.find(m=>m.getAttribute('number')===wanted)||measures[parseInt(measureNum,10)-1]||null;
  }

  function insertDirection(measure,annotation){
    const doc=measure.ownerDocument;
    const direction=doc.createElement('direction');
    direction.setAttribute('placement','above');
    const type=doc.createElement('direction-type');
    const words=doc.createElement('words');
    words.setAttribute('font-size','8');
    words.setAttribute('color',annotation.color||COLORS[0]);
    words.textContent=annotation.text;
    type.appendChild(words);
    direction.appendChild(type);
    const firstNote=Array.from(measure.children).find(el=>el.tagName==='note');
    if(firstNote)measure.insertBefore(direction,firstNote);
    else measure.appendChild(direction);
  }

  function insertAnnotations(xmlDoc,annotations){
    let inserted=0,missing=0;
    (annotations||[]).forEach(raw=>{
      const ann=createAnnotation(raw);
      if(!ann.text.trim())return;
      const measure=findMeasure(xmlDoc,ann.measureNum);
      if(!measure){missing++;return}
      insertDirection(measure,ann);
      inserted++;
    });
    return {inserted,missing};
  }

  function groupByFileName(items){
    return (items||[]).reduce((acc,item)=>{
      const key=item.fileName||'';
      if(!acc[key])acc[key]=[];
      acc[key].push(item);
      return acc;
    },{});
  }

  global.AnnotationsCore={
    TYPES,
    COLORS,
    createAnnotation,
    filterForPrint,
    insertAnnotations,
    groupByFileName,
  };
})(window);
