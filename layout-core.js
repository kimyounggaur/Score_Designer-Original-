(function(global){
  const PAGE_SIZES={
    A4:{width:210,height:297},
    Letter:{width:215.9,height:279.4},
    A3:{width:297,height:420},
    A5:{width:148,height:210},
  };

  const DEFAULT_LAYOUT={
    pageSize:'A4',
    margins:{left:10,right:10,top:12,bottom:12},
    staffDistance:80,
    systemDistance:100,
    scalePercent:100,
    measureNumbering:'system',
    startMeasure:1,
    breaks:{system:[],page:[],removeAll:false},
    meta:{title:'',workTitle:'',composer:'',lyricist:'',rights:''},
  };

  function mmToTenths(mm){
    const value=parseFloat(mm);
    return Math.round((Number.isFinite(value)?value:0)*40);
  }

  function formatNumber(value){
    const rounded=Math.round(value*1000)/1000;
    return String(rounded).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
  }

  function rootOf(doc){return doc.documentElement}

  function child(parent,name){
    return Array.from(parent.children||[]).find(el=>el.tagName===name)||null;
  }

  function ensureChild(parent,name,before){
    let el=child(parent,name);
    if(!el){
      el=parent.ownerDocument.createElement(name);
      if(before&&before.parentNode===parent)parent.insertBefore(el,before);
      else parent.appendChild(el);
    }
    return el;
  }

  function setChildText(parent,name,value){
    const el=ensureChild(parent,name);
    el.textContent=String(value);
    return el;
  }

  function ensureDefaults(doc){
    const root=rootOf(doc);
    const before=child(root,'part-list')||child(root,'part')||root.firstElementChild;
    return ensureChild(root,'defaults',before);
  }

  function ensureIdentification(doc){
    const root=rootOf(doc);
    const before=child(root,'part-list')||child(root,'part')||null;
    return ensureChild(root,'identification',before);
  }

  function ensureCreator(ident,type){
    let el=Array.from(ident.querySelectorAll(':scope > creator')).find(c=>c.getAttribute('type')===type);
    if(!el){
      el=ident.ownerDocument.createElement('creator');
      el.setAttribute('type',type);
      ident.appendChild(el);
    }
    return el;
  }

  function firstPart(doc){
    return doc.querySelector('part');
  }

  function partMeasures(doc){
    const part=firstPart(doc);
    return part?Array.from(part.querySelectorAll(':scope > measure')):[];
  }

  function findMeasure(doc,measureNumber){
    const wanted=String(measureNumber);
    const measures=partMeasures(doc);
    return measures.find(m=>m.getAttribute('number')===wanted)||measures[parseInt(measureNumber,10)-1]||null;
  }

  function insertPrint(measure,attr){
    if(!measure)return null;
    const doc=measure.ownerDocument;
    const print=doc.createElement('print');
    print.setAttribute(attr,'yes');
    const notes=measure.querySelectorAll(':scope > note');
    const lastNote=notes[notes.length-1];
    if(lastNote&&lastNote.nextSibling)measure.insertBefore(print,lastNote.nextSibling);
    else measure.appendChild(print);
    return print;
  }

  function addBreak(doc,measureNumber,type){
    const attr=type==='page'?'new-page':'new-system';
    return insertPrint(findMeasure(doc,measureNumber),attr);
  }

  function removeBreaks(doc){
    Array.from(doc.querySelectorAll('print')).forEach(el=>el.remove());
    return doc;
  }

  function applyPageLayout(doc,options){
    const size=PAGE_SIZES[options.pageSize]||PAGE_SIZES.A4;
    const defaults=ensureDefaults(doc);
    const scaling=ensureChild(defaults,'scaling',child(defaults,'page-layout')||null);
    const scale=(parseFloat(options.scalePercent)||100)/100;
    setChildText(scaling,'millimeters',formatNumber(7*scale));
    setChildText(scaling,'tenths',40);

    const pageLayout=ensureChild(defaults,'page-layout');
    setChildText(pageLayout,'page-height',mmToTenths(size.height));
    setChildText(pageLayout,'page-width',mmToTenths(size.width));

    const margins=ensureChild(pageLayout,'page-margins');
    margins.setAttribute('type','both');
    const m=options.margins||{};
    setChildText(margins,'left-margin',mmToTenths(m.left));
    setChildText(margins,'right-margin',mmToTenths(m.right));
    setChildText(margins,'top-margin',mmToTenths(m.top));
    setChildText(margins,'bottom-margin',mmToTenths(m.bottom));

    const systemLayout=ensureChild(pageLayout,'system-layout');
    setChildText(systemLayout,'system-distance',parseFloat(options.systemDistance)||100);
    const staffLayout=ensureChild(pageLayout,'staff-layout');
    setChildText(staffLayout,'staff-distance',parseFloat(options.staffDistance)||80);
  }

  function applyMeasureNumbering(doc,options){
    const measures=partMeasures(doc);
    const first=measures[0];
    if(!first)return;
    const attrs=ensureChild(first,'attributes',first.firstElementChild||null);
    setChildText(attrs,'measure-numbering',options.measureNumbering||'system');
    const start=parseInt(options.startMeasure,10);
    if(Number.isFinite(start)&&start>0)first.setAttribute('number',String(start));
  }

  function applyMetadata(doc,meta){
    if(!meta)return;
    const root=rootOf(doc);
    if(meta.title!==undefined){
      const before=child(root,'identification')||child(root,'part-list')||child(root,'part')||null;
      ensureChild(root,'movement-title',before).textContent=meta.title;
    }
    if(meta.workTitle!==undefined){
      const before=child(root,'movement-title')||child(root,'identification')||child(root,'part-list')||null;
      const work=ensureChild(root,'work',before);
      setChildText(work,'work-title',meta.workTitle);
    }
    const ident=ensureIdentification(doc);
    if(meta.composer!==undefined)ensureCreator(ident,'composer').textContent=meta.composer;
    if(meta.lyricist!==undefined)ensureCreator(ident,'lyricist').textContent=meta.lyricist;
    if(meta.rights!==undefined)setChildText(ident,'rights',meta.rights);
  }

  function applyBreaks(doc,breaks){
    if(!breaks)return;
    if(breaks.removeAll)removeBreaks(doc);
    (breaks.system||[]).forEach(n=>{if(n)addBreak(doc,n,'system')});
    (breaks.page||[]).forEach(n=>{if(n)addBreak(doc,n,'page')});
  }

  function applyLayout(xmlDoc,options){
    const merged={
      ...DEFAULT_LAYOUT,
      ...(options||{}),
      margins:{...DEFAULT_LAYOUT.margins,...((options&&options.margins)||{})},
      breaks:{...DEFAULT_LAYOUT.breaks,...((options&&options.breaks)||{})},
      meta:{...DEFAULT_LAYOUT.meta,...((options&&options.meta)||{})},
    };
    applyBreaks(xmlDoc,merged.breaks);
    applyPageLayout(xmlDoc,merged);
    applyMeasureNumbering(xmlDoc,merged);
    applyMetadata(xmlDoc,merged.meta);
    return xmlDoc;
  }

  function readMetadata(doc){
    return {
      title:doc.querySelector('movement-title')?.textContent||'',
      workTitle:doc.querySelector('work-title')?.textContent||'',
      composer:doc.querySelector('creator[type="composer"]')?.textContent||'',
      lyricist:doc.querySelector('creator[type="lyricist"]')?.textContent||'',
      rights:doc.querySelector('rights')?.textContent||'',
    };
  }

  global.LayoutCore={
    PAGE_SIZES,
    DEFAULT_LAYOUT,
    mmToTenths,
    applyLayout,
    addBreak,
    removeBreaks,
    readMetadata,
  };
})(window);
