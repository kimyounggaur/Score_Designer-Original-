(function(global){
  'use strict';
  const MAX_HISTORY=50;
  const cloneFiles=files=>Array.from(files||[],file=>({...file,xmlDoc:file?.xmlDoc?.cloneNode?file.xmlDoc.cloneNode(true):file?.xmlDoc,ossiaMeta:file?.ossiaMeta?{...file.ossiaMeta}:undefined}));
  function pushHistoryEntry(history,index,files,label,timestamp,{mode='string',serialize}={}){
    const truncated=Array.from(history||[]).slice(0,index+1);
    const previous=truncated.at(-1)?.files||[];
    const write=serialize||((doc)=>new global.XMLSerializer().serializeToString(doc));
    const snapshots=mode==='clone'?cloneFiles(files):Array.from(files||[],(file,fileIndex)=>{
      const xml=file.xmlDoc?write(file.xmlDoc):(file.xmlString||file.xml||'');
      const same=previous[fileIndex];
      return {name:file.name,sourceName:file.sourceName,xml:same?.xml===xml?same.xml:xml,ossiaMxml:file.ossiaMxml,ossiaMeta:file.ossiaMeta?{...file.ossiaMeta}:undefined};
    });
    const entry={files:snapshots,label:label||'변환',timestamp:timestamp??Date.now()};
    const nextHistory=[...truncated,entry].slice(-MAX_HISTORY);
    return {history:nextHistory,index:nextHistory.length-1};
  }
  function restoreHistoryFiles(entry,{parse}={}){
    const read=parse||((xml)=>new global.DOMParser().parseFromString(xml,'text/xml'));
    return Array.from(entry?.files||[],file=>{
      if(typeof file.xml!=='string')return cloneFiles([file])[0];
      const {xml,...rest}=file,xmlDoc=read(xml);
      if(xmlDoc?.querySelector?.('parsererror'))throw new Error('작업 기록의 악보 XML을 읽을 수 없습니다.');
      return {...rest,ossiaMeta:rest.ossiaMeta?{...rest.ossiaMeta}:undefined,xmlDoc,xmlString:xml};
    });
  }
  function estimateHistoryBytes(history){
    const unique=new Set();
    for(const entry of history||[])for(const file of entry.files||[]){if(typeof file.xml==='string')unique.add(file.xml);if(file.ossiaMxml)unique.add(file.ossiaMxml);}
    // Approximation of unique UTF-16 text storage; DOM/object/engine overhead excluded.
    return [...unique].reduce((sum,xml)=>sum+xml.length*2,0);
  }
  const serializeHistoryMeta=history=>Array.from(history||[],({label,timestamp})=>({label,timestamp}));
  global.HistoryCore={MAX_HISTORY,cloneFiles,pushHistoryEntry,restoreHistoryFiles,serializeHistoryMeta,estimateHistoryBytes};
})(window);
