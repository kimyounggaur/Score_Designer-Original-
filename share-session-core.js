(function(global){
  'use strict';

  const SESSION_KEY = 'mxlStudioSession';
  const SLOT_KEY = 'mxlStudioSessionSlots';
  const WARN_BYTES = 200 * 1024;
  const MAX_BYTES = 500 * 1024;

  function supportsCompression(){
    return typeof global.CompressionStream !== 'undefined' && typeof global.DecompressionStream !== 'undefined';
  }

  function bytesFromText(text){
    return new TextEncoder().encode(text);
  }

  function textFromBytes(bytes){
    return new TextDecoder().decode(bytes);
  }

  function bytesToBase64Url(bytes){
    let binary = '';
    const chunk = 0x8000;
    for(let i=0;i<bytes.length;i+=chunk){
      binary += String.fromCharCode(...bytes.slice(i,i+chunk));
    }
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }

  function base64UrlToBytes(value){
    const padded = value.replace(/-/g,'+').replace(/_/g,'/') + '='.repeat((4 - value.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return bytes;
  }

  async function streamToBytes(stream){
    const reader = stream.getReader();
    const chunks = [];
    let total = 0;
    while(true){
      const {done,value} = await reader.read();
      if(done)break;
      chunks.push(value);
      total += value.length;
    }
    const output = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(chunk=>{
      output.set(chunk,offset);
      offset += chunk.length;
    });
    return output;
  }

  function bytesToStream(bytes){
    return new ReadableStream({
      start(controller){
        controller.enqueue(bytes);
        controller.close();
      },
    });
  }

  async function gzipToBase64Url(text){
    if(!supportsCompression())throw new Error('CompressionStream is not supported');
    const stream = bytesToStream(bytesFromText(text))
      .pipeThrough(new global.CompressionStream('gzip'));
    return bytesToBase64Url(await streamToBytes(stream));
  }

  async function gunzipFromBase64Url(value){
    if(!supportsCompression())throw new Error('DecompressionStream is not supported');
    const stream = bytesToStream(base64UrlToBytes(value))
      .pipeThrough(new global.DecompressionStream('gzip'));
    return textFromBytes(await streamToBytes(stream));
  }

  function getFileXml(file){
    if(file?.xmlDoc && global.XMLSerializer){
      return new global.XMLSerializer().serializeToString(file.xmlDoc);
    }
    return file?.xml || file?.xmlString || '';
  }

  function createPayload(file){
    return {
      name:file?.name || '공유 악보.musicxml',
      sourceName:file?.sourceName || file?.name || '공유 악보.musicxml',
      xml:getFileXml(file),
      savedAt:new Date().toISOString(),
    };
  }

  function payloadText(file){
    return JSON.stringify(createPayload(file));
  }

  function makeUrl(fragment,href){
    const url = new URL(href || global.location?.href || 'http://localhost/mxl-studio.html');
    url.hash = fragment;
    return url.toString();
  }

  function parsePayloadText(text){
    const payload = JSON.parse(text);
    return {
      name:payload.name || payload.sourceName || '공유 악보.musicxml',
      sourceName:payload.sourceName || payload.name || '공유 악보.musicxml',
      xml:payload.xml || payload.xmlString || '',
      savedAt:payload.savedAt || null,
    };
  }

  function buildShareURL(file,href){
    const text = payloadText(file);
    return makeUrl(bytesToBase64Url(bytesFromText(text)),href);
  }

  async function buildShareURLv2(file,href){
    if(!supportsCompression())return buildShareURL(file,href);
    const compressed = await gzipToBase64Url(payloadText(file));
    return makeUrl(`v2.${compressed}`,href);
  }

  async function buildShareURLv2Info(file,href){
    const text = payloadText(file);
    const originalBytes = bytesFromText(text).length;
    let compressedBytes = originalBytes;
    let url;
    let version = 'v1';
    if(supportsCompression()){
      const compressed = await gzipToBase64Url(text);
      compressedBytes = bytesFromText(`v2.${compressed}`).length;
      url = makeUrl(`v2.${compressed}`,href);
      version = 'v2';
    }else{
      url = buildShareURL(file,href);
      compressedBytes = bytesFromText(new URL(url).hash.slice(1)).length;
    }
    return {
      url,
      version,
      originalBytes,
      compressedBytes,
      ratio:originalBytes ? Math.max(0,Math.round((1 - compressedBytes / originalBytes) * 100)) : 0,
      warn:compressedBytes > WARN_BYTES,
      tooLarge:compressedBytes > MAX_BYTES,
    };
  }

  function parseShareURL(href){
    const fragment = new URL(href || global.location?.href).hash.replace(/^#/,'');
    if(!fragment)return null;
    const raw = fragment.startsWith('v1.') ? fragment.slice(3) : fragment;
    return parsePayloadText(textFromBytes(base64UrlToBytes(raw)));
  }

  async function parseShareURLAny(href){
    const fragment = new URL(href || global.location?.href).hash.replace(/^#/,'');
    if(!fragment)return null;
    if(fragment.startsWith('v2.')){
      return parsePayloadText(await gunzipFromBase64Url(fragment.slice(3)));
    }
    return parseShareURL(href);
  }

  global.ShareSessionCore = {
    SESSION_KEY,
    SLOT_KEY,
    WARN_BYTES,
    MAX_BYTES,
    supportsCompression,
    gzipToBase64Url,
    gunzipFromBase64Url,
    buildShareURL,
    buildShareURLv2,
    buildShareURLv2Info,
    parseShareURL,
    parseShareURLAny,
    _base64UrlToBytes:base64UrlToBytes,
    _bytesToBase64Url:bytesToBase64Url,
  };
})(window);
