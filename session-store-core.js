(function(global){
  'use strict';

  const DB_NAME = 'mxl-studio';
  const DB_VERSION = 1;
  const SESSION_STORE = 'sessions';
  const META_STORE = 'meta';
  const AUTOSAVE_ID = 'autosave';
  const MAX_JSON_BYTES = 4 * 1024 * 1024;
  const LOCAL_PREFIX = 'mxlStudio.idbFallback.';
  const LOCAL_INDEX_KEY = `${LOCAL_PREFIX}sessions.index`;
  const LOCAL_META_PREFIX = `${LOCAL_PREFIX}meta.`;
  const DEFAULT_LEGACY_SESSION_KEY = 'mxlStudioSession';
  const DEFAULT_LEGACY_SLOT_KEY = 'mxlStudioSessionSlots';

  let dbPromise = null;
  let dbInstance = null;
  let activeBackend = 'idb';

  function jsonSize(value){
    const text = JSON.stringify(value || null);
    if(global.TextEncoder)return new global.TextEncoder().encode(text).length;
    return text.length;
  }

  function cloneJson(value){
    return value == null ? null : JSON.parse(JSON.stringify(value));
  }

  function requestAsPromise(request){
    return new Promise((resolve,reject)=>{
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    });
  }

  function getLocalStorage(){
    try{return global.localStorage || null}catch(_){return null}
  }

  function readJson(key,fallback){
    const storage = getLocalStorage();
    if(!storage)return fallback;
    try{
      const raw = storage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    }catch(_){
      return fallback;
    }
  }

  function writeJson(key,value){
    const storage = getLocalStorage();
    if(!storage)return false;
    storage.setItem(key,JSON.stringify(value));
    return true;
  }

  function localSessionKey(id){
    return `${LOCAL_PREFIX}sessions.${id}`;
  }

  function localListIds(){
    return readJson(LOCAL_INDEX_KEY,[]);
  }

  function localSaveSession(session){
    const normalized = normalizeSession(session);
    const size = jsonSize(normalized);
    if(size > MAX_JSON_BYTES)return Promise.resolve({ok:false,reason:'too-large',size});
    try{
      writeJson(localSessionKey(normalized.id),normalized);
      const ids = new Set(localListIds());
      ids.add(normalized.id);
      writeJson(LOCAL_INDEX_KEY,[...ids]);
      return Promise.resolve({ok:true,backend:'local',size});
    }catch(error){
      return Promise.resolve({ok:false,reason:'storage-error',error:String(error),size});
    }
  }

  function localLoadSession(id){
    return Promise.resolve(readJson(localSessionKey(id),null));
  }

  function loadLocalSession(id){
    return readJson(localSessionKey(id || AUTOSAVE_ID),null);
  }

  function localListSessions(){
    const sessions = localListIds()
      .map(id=>readJson(localSessionKey(id),null))
      .filter(Boolean);
    return Promise.resolve(sortSessions(sessions));
  }

  function localDeleteSession(id){
    const storage = getLocalStorage();
    if(storage){
      try{storage.removeItem(localSessionKey(id))}catch(_){}
      writeJson(LOCAL_INDEX_KEY,localListIds().filter(existing=>existing!==id));
    }
    return Promise.resolve(true);
  }

  function localGetMeta(key){
    return Promise.resolve(readJson(`${LOCAL_META_PREFIX}${key}`,null));
  }

  function localPutMeta(entry){
    writeJson(`${LOCAL_META_PREFIX}${entry.key}`,entry);
    return Promise.resolve(entry);
  }

  function normalizeSession(session){
    const normalized = cloneJson(session || {});
    normalized.id = normalized.id || AUTOSAVE_ID;
    normalized.savedAt = normalized.savedAt || new Date().toISOString();
    normalized.files = Array.isArray(normalized.files) ? normalized.files : [];
    return normalized;
  }

  function sortSessions(sessions){
    return Array.from(sessions || []).sort((a,b)=>{
      if(a.id === AUTOSAVE_ID && b.id !== AUTOSAVE_ID)return -1;
      if(b.id === AUTOSAVE_ID && a.id !== AUTOSAVE_ID)return 1;
      return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
    });
  }

  function openDb(){
    if(dbPromise)return dbPromise;
    if(!global.indexedDB){
      activeBackend = 'local';
      dbPromise = Promise.resolve(null);
      return dbPromise;
    }
    dbPromise = new Promise(resolve=>{
      let request;
      try{
        request = global.indexedDB.open(DB_NAME,DB_VERSION);
      }catch(_){
        activeBackend = 'local';
        resolve(null);
        return;
      }
      request.onupgradeneeded = event => {
        const db = event.target.result;
        if(!db.objectStoreNames.contains(SESSION_STORE)){
          db.createObjectStore(SESSION_STORE,{keyPath:'id'});
        }
        if(!db.objectStoreNames.contains(META_STORE)){
          db.createObjectStore(META_STORE,{keyPath:'key'});
        }
      };
      request.onsuccess = () => {
        activeBackend = 'idb';
        dbInstance = request.result;
        dbInstance.onversionchange = () => closeDb();
        resolve(dbInstance);
      };
      request.onerror = () => {
        activeBackend = 'local';
        resolve(null);
      };
      request.onblocked = () => {
        activeBackend = 'local';
        resolve(null);
      };
    });
    return dbPromise;
  }

  function closeDb(){
    try{dbInstance?.close?.()}catch(_){}
    dbInstance = null;
    dbPromise = null;
  }

  async function idbStore(storeName,mode,callback){
    const db = await openDb();
    if(!db)return null;
    try{
      const tx = db.transaction(storeName,mode);
      const store = tx.objectStore(storeName);
      return await callback(store,tx);
    }catch(_){
      activeBackend = 'local';
      return null;
    }
  }

  async function saveSession(session){
    const normalized = normalizeSession(session);
    const size = jsonSize(normalized);
    if(size > MAX_JSON_BYTES)return {ok:false,reason:'too-large',size};
    await localSaveSession(normalized);
    const result = await idbStore(SESSION_STORE,'readwrite',async store=>{
      await requestAsPromise(store.put(normalized));
      return {ok:true,backend:'idb',size};
    });
    return result || localSaveSession(normalized);
  }

  async function loadSession(id){
    const key = id || AUTOSAVE_ID;
    const result = await idbStore(SESSION_STORE,'readonly',store=>requestAsPromise(store.get(key)));
    if(result !== null && result !== undefined)return result || null;
    return localLoadSession(key);
  }

  async function listSessions(){
    const result = await idbStore(SESSION_STORE,'readonly',store=>requestAsPromise(store.getAll()));
    if(Array.isArray(result))return sortSessions(result);
    return localListSessions();
  }

  async function deleteSession(id){
    const key = id || AUTOSAVE_ID;
    const result = await idbStore(SESSION_STORE,'readwrite',async store=>{
      await requestAsPromise(store.delete(key));
      return true;
    });
    return result || localDeleteSession(key);
  }

  async function getMeta(key){
    const result = await idbStore(META_STORE,'readonly',store=>requestAsPromise(store.get(key)));
    if(result !== null && result !== undefined)return result || null;
    return localGetMeta(key);
  }

  async function putMeta(entry){
    const result = await idbStore(META_STORE,'readwrite',async store=>{
      await requestAsPromise(store.put(entry));
      return entry;
    });
    return result || localPutMeta(entry);
  }

  function parseLegacySlots(value){
    if(!value)return [];
    if(Array.isArray(value))return value;
    if(Array.isArray(value.slots))return value.slots;
    if(typeof value === 'object'){
      return Object.entries(value)
        .filter(([,session])=>session && typeof session === 'object')
        .map(([id,session])=>({id, ...session}));
    }
    return [];
  }

  async function migrateFromLocalStorage(){
    const migrated = await getMeta('migratedAt');
    if(migrated)return {ok:true,migrated:0,skipped:true};

    const storage = getLocalStorage();
    if(!storage){
      await putMeta({key:'migratedAt',value:new Date().toISOString()});
      return {ok:true,migrated:0};
    }

    const sessionKey = global.ShareSessionCore?.SESSION_KEY || DEFAULT_LEGACY_SESSION_KEY;
    const slotKey = global.ShareSessionCore?.SLOT_KEY || DEFAULT_LEGACY_SLOT_KEY;
    const legacySession = readJson(sessionKey,null);
    const legacySlots = parseLegacySlots(readJson(slotKey,null));
    let count = 0;

    if(legacySession){
      const result = await saveSession({...legacySession,id:legacySession.id || AUTOSAVE_ID});
      if(result.ok)count += 1;
    }

    for(const slot of legacySlots){
      const id = slot.id || `slot-${slot.timestamp || slot.savedAt || Date.now()}`;
      const result = await saveSession({...slot,id});
      if(result.ok)count += 1;
    }

    try{
      storage.removeItem(sessionKey);
      storage.removeItem(slotKey);
    }catch(_){}
    await putMeta({key:'migratedAt',value:new Date().toISOString()});
    return {ok:true,migrated:count};
  }

  async function estimateUsage(){
    try{
      if(!global.navigator?.storage?.estimate)return null;
      return await global.navigator.storage.estimate();
    }catch(_){
      return null;
    }
  }

  function backend(){
    return activeBackend;
  }

  function resetForTests(){
    closeDb();
    dbPromise = null;
    activeBackend = 'idb';
  }

  if(global.addEventListener){
    global.addEventListener('pagehide',closeDb);
    global.addEventListener('beforeunload',closeDb);
  }

  global.SessionStoreCore = {
    DB_NAME,
    AUTOSAVE_ID,
    MAX_JSON_BYTES,
    openDb,
    saveSession,
    loadSession,
    loadLocalSession,
    listSessions,
    deleteSession,
    migrateFromLocalStorage,
    estimateUsage,
    backend,
    closeDb,
    _resetForTests: resetForTests,
  };
})(window);
