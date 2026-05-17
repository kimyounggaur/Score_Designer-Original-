(function(global){
  const SESSION_KEY='mxlstudio_session_v1';
  const SLOT_KEY='mxlstudio_session_slots_v1';
  const SHARE_SIZE_WARN=200*1024;
  const SHARE_SIZE_LIMIT=500*1024;

  function encodeUnicode(text){
    return btoa(unescape(encodeURIComponent(text)));
  }

  function decodeUnicode(b64){
    return decodeURIComponent(escape(atob(decodeURIComponent(b64))));
  }

  function serializeXmlDoc(xmlDoc){
    return new XMLSerializer().serializeToString(xmlDoc);
  }

  function parseXml(xmlStr){
    const xmlDoc=new DOMParser().parseFromString(xmlStr,'text/xml');
    if(xmlDoc.querySelector('parsererror'))throw new Error('XML parse error');
    return xmlDoc;
  }

  function scoreTitle(xmlDoc,fallback='shared.xml'){
    const title=xmlDoc.querySelector('movement-title,work-title')?.textContent?.trim();
    return title?`${title.replace(/[\\/:*?"<>|]+/g,'_')}.xml`:fallback;
  }

  function generateShareURL(files,selectedIdx=0,href){
    const file=files[selectedIdx]||files[0];
    if(!file?.xmlDoc)throw new Error('No file to share');
    const xmlStr=serializeXmlDoc(file.xmlDoc);
    if(xmlStr.length>SHARE_SIZE_LIMIT)throw new Error('File is too large for URL sharing');
    const base=(href||global.location.href).split('?')[0].split('#')[0];
    return `${base}?share=${encodeURIComponent(encodeUnicode(xmlStr))}`;
  }

  function parseShareURL(url){
    const parsed=new URL(url||global.location.href);
    const shareData=parsed.searchParams.get('share');
    if(!shareData)return null;
    const xmlStr=decodeUnicode(shareData);
    const xmlDoc=parseXml(xmlStr);
    return {name:scoreTitle(xmlDoc),xmlDoc,xmlString:xmlStr,size:xmlStr.length,sourceName:'share-url'};
  }

  function serializeFiles(files){
    return (files||[]).filter(f=>f?.xmlDoc).map(f=>{
      const xmlStr=serializeXmlDoc(f.xmlDoc);
      return {name:f.name||scoreTitle(f.xmlDoc),size:f.size||xmlStr.length,xmlStr};
    });
  }

  function serializeSession({files,activePanel,activeLeftPanel,rightPanel,selectedFileIdx}){
    return {
      savedAt:new Date().toISOString(),
      files:serializeFiles(files),
      activePanel:activePanel||activeLeftPanel||'upload',
      rightPanel:rightPanel||'chords',
      selectedFileIdx:selectedFileIdx||0,
    };
  }

  function hydrateSession(data){
    if(!data||!Array.isArray(data.files))throw new Error('Invalid session');
    return {
      ...data,
      files:data.files.map(f=>{
        const xmlDoc=parseXml(f.xmlStr);
        return {name:f.name||scoreTitle(xmlDoc),size:f.size||f.xmlStr.length,xmlString:f.xmlStr,xmlDoc,sourceName:'saved-session'};
      }),
      selectedFileIdx:Math.max(0,parseInt(data.selectedFileIdx||0,10)),
    };
  }

  function formatSavedAt(value){
    if(!value)return '';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return '';
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function shortTime(value){
    const d=value?new Date(value):new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function upsertSessionSlot(slots,slot){
    const next=[slot,...(slots||[]).filter(s=>s.id!==slot.id)];
    next.sort((a,b)=>new Date(b.savedAt||0)-new Date(a.savedAt||0));
    return next.slice(0,5);
  }

  function readJson(key){
    try{
      const raw=global.localStorage?.getItem(key);
      return raw?JSON.parse(raw):null;
    }catch(e){return null}
  }

  function writeJson(key,value){
    global.localStorage?.setItem(key,JSON.stringify(value));
  }

  global.ShareSessionCore={
    SESSION_KEY,
    SLOT_KEY,
    SHARE_SIZE_WARN,
    SHARE_SIZE_LIMIT,
    generateShareURL,
    parseShareURL,
    serializeSession,
    hydrateSession,
    formatSavedAt,
    shortTime,
    upsertSessionSlot,
    readJson,
    writeJson,
  };
})(window);
