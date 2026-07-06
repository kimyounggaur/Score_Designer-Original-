(function(global){
  const SESSION_KEY='mxlstudio_session_v1';
  const SLOT_KEY='mxlstudio_session_slots_v1';
  const SHARE_SIZE_WARN=200*1024;
  const SHARE_SIZE_LIMIT=500*1024;

  function supportsCompression(){
    return typeof global.CompressionStream!=='undefined'&&typeof global.DecompressionStream!=='undefined';
  }

  function bytesFromText(text){
    return new TextEncoder().encode(text);
  }

  function textFromBytes(bytes){
    return new TextDecoder().decode(bytes);
  }

  function bytesToStream(bytes){
    return new ReadableStream({
      start(controller){
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  async function streamToBytes(stream){
    const reader=stream.getReader();
    const chunks=[];
    let total=0;
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      chunks.push(value);
      total+=value.length;
    }
    const output=new Uint8Array(total);
    let offset=0;
    chunks.forEach(chunk=>{output.set(chunk,offset);offset+=chunk.length;});
    return output;
  }

  function bytesToBase64Url(bytes){
    let binary='';
    const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)binary+=String.fromCharCode(...bytes.slice(i,i+chunk));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function base64UrlToBytes(value){
    const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
    const binary=atob(padded);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }

  async function gzipToBase64Url(text){
    if(!supportsCompression())throw new Error('CompressionStream is not supported');
    const stream=bytesToStream(bytesFromText(text)).pipeThrough(new global.CompressionStream('gzip'));
    return bytesToBase64Url(await streamToBytes(stream));
  }

  async function gunzipFromBase64Url(value){
    if(!supportsCompression())throw new Error('DecompressionStream is not supported');
    const stream=bytesToStream(base64UrlToBytes(value)).pipeThrough(new global.DecompressionStream('gzip'));
    return textFromBytes(await streamToBytes(stream));
  }

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

  function fileXmlString(file){
    if(file?.xml)return file.xml;
    if(file?.xmlString)return file.xmlString;
    if(file?.xmlStr)return file.xmlStr;
    if(file?.xmlDoc)return serializeXmlDoc(file.xmlDoc);
    return '';
  }

  function fileName(file,xmlStr){
    if(file?.name)return file.name;
    try{return scoreTitle(parseXml(xmlStr))}catch(e){return 'shared.xml'}
  }

  function generateShareURL(files,selectedIdx=0,href){
    const file=files[selectedIdx]||files[0];
    if(!file?.xmlDoc)throw new Error('No file to share');
    const xmlStr=serializeXmlDoc(file.xmlDoc);
    if(xmlStr.length>SHARE_SIZE_LIMIT)throw new Error('File is too large for URL sharing');
    const base=(href||global.location.href).split('?')[0].split('#')[0];
    return `${base}?share=${encodeURIComponent(encodeUnicode(xmlStr))}`;
  }

  function buildShareURL(file,href){
    const xmlStr=fileXmlString(file);
    if(!xmlStr)throw new Error('No file to share');
    const base=(href||global.location.href).split('?')[0].split('#')[0];
    return `${base}?share=${encodeURIComponent(encodeUnicode(xmlStr))}`;
  }

  async function buildShareURLv2Info(file,href){
    const xmlStr=fileXmlString(file);
    if(!xmlStr)throw new Error('No file to share');
    const name=fileName(file,xmlStr);
    const payload=JSON.stringify({name,xml:xmlStr,sourceName:file?.sourceName||name||'share-url'});
    const originalBytes=bytesFromText(payload).length;
    const base=(href||global.location.href).split('?')[0].split('#')[0];
    if(!supportsCompression()){
      const url=buildShareURL(file,href);
      const compressedBytes=bytesFromText(new URL(url).search).length;
      return {url,version:'v1',originalBytes,compressedBytes,ratio:0,warn:compressedBytes>SHARE_SIZE_WARN,tooLarge:compressedBytes>SHARE_SIZE_LIMIT};
    }
    const compressed=await gzipToBase64Url(payload);
    const fragment=`v2.${compressed}`;
    const compressedBytes=bytesFromText(fragment).length;
    return {
      url:`${base}#${fragment}`,
      version:'v2',
      originalBytes,
      compressedBytes,
      ratio:originalBytes?Math.max(0,Math.round((1-compressedBytes/originalBytes)*100)):0,
      warn:compressedBytes>SHARE_SIZE_WARN,
      tooLarge:compressedBytes>SHARE_SIZE_LIMIT,
    };
  }

  function parseShareURL(url){
    const parsed=new URL(url||global.location.href);
    const shareData=parsed.searchParams.get('share');
    if(!shareData)return null;
    const xmlStr=decodeUnicode(shareData);
    const xmlDoc=parseXml(xmlStr);
    return {name:scoreTitle(xmlDoc),xmlDoc,xmlString:xmlStr,xml:xmlStr,size:xmlStr.length,sourceName:'share-url'};
  }

  async function parseShareURLAny(url){
    const parsed=new URL(url||global.location.href);
    const fragment=parsed.hash.replace(/^#/,'');
    if(fragment.startsWith('v2.')){
      const payload=JSON.parse(await gunzipFromBase64Url(fragment.slice(3)));
      const xmlStr=payload.xml||payload.xmlString||'';
      const xmlDoc=parseXml(xmlStr);
      return {name:payload.name||scoreTitle(xmlDoc),xmlDoc,xmlString:xmlStr,xml:xmlStr,size:xmlStr.length,sourceName:payload.sourceName||'share-url'};
    }
    return parseShareURL(url);
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
    supportsCompression,
    gzipToBase64Url,
    gunzipFromBase64Url,
    buildShareURLv2Info,
    buildShareURL,
    generateShareURL,
    parseShareURL,
    parseShareURLAny,
    serializeSession,
    hydrateSession,
    formatSavedAt,
    shortTime,
    upsertSessionSlot,
    readJson,
    writeJson,
  };
})(window);
