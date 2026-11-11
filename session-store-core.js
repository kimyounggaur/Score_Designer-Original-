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

  // localStorage 쓰기 결과를 이유와 함께 돌려줍니다. 예외를 밖으로 던지지 않습니다.
  //   no-storage: 저장소 자체가 없음 · quota: 용량 초과 · storage-error: 그 밖의 실패
  function storageFailure(error){
    const quota = Boolean(error) && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22 || error.code === 1014);
    return {ok:false,reason:quota ? 'quota' : 'storage-error',error:String(error?.message || error)};
  }

  function tryWriteJson(key,value){
    const storage = getLocalStorage();
    if(!storage)return {ok:false,reason:'no-storage'};
    try{
      storage.setItem(key,JSON.stringify(value));
      return {ok:true};
    }catch(error){
      return storageFailure(error);
    }
  }

  function localSessionKey(id){
    return `${LOCAL_PREFIX}sessions.${id}`;
  }

  function localListIds(){
    return readJson(LOCAL_INDEX_KEY,[]);
  }

  // 본문 → 목록 순서로 씁니다. 새 id의 목록 쓰기가 실패하면 방금 쓴 본문을 지워 목록과 본문이 어긋나지 않게 합니다.
  function localSaveSession(session){
    const normalized = normalizeSession(session);
    const size = jsonSize(normalized);
    if(size > MAX_JSON_BYTES)return Promise.resolve({ok:false,reason:'too-large',size});
    const key = localSessionKey(normalized.id);
    const body = tryWriteJson(key,normalized);
    if(!body.ok)return Promise.resolve({...body,size});
    const ids = localListIds();
    if(!ids.includes(normalized.id)){
      const index = tryWriteJson(LOCAL_INDEX_KEY,[...ids,normalized.id]);
      if(!index.ok){
        try{getLocalStorage()?.removeItem(key)}catch(_){}
        return Promise.resolve({...index,size});
      }
    }
    return Promise.resolve({ok:true,backend:'local',size});
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

  // 본문을 지우지 못하면 목록은 그대로 두고 false를 돌려줍니다(D13). 본문이 남은 채 목록에서만 빠지면
  // 목록과 본문이 어긋나 loadSession이 지운 세션을 다시 읽습니다.
  function localDeleteSession(id){
    const storage = getLocalStorage();
    if(!storage)return Promise.resolve(true);
    try{storage.removeItem(localSessionKey(id))}catch(_){return Promise.resolve(false)}
    const ids = localListIds();
    if(!ids.includes(id))return Promise.resolve(true);
    // 목록을 못 고쳐도 본문이 없으니 목록 읽기에서 걸러집니다. 결과로만 알립니다.
    return Promise.resolve(tryWriteJson(LOCAL_INDEX_KEY,ids.filter(existing=>existing!==id)).ok);
  }

  function localGetMeta(key){
    return Promise.resolve(readJson(`${LOCAL_META_PREFIX}${key}`,null));
  }

  function localPutMeta(entry){
    const result = tryWriteJson(`${LOCAL_META_PREFIX}${entry.key}`,entry);
    return Promise.resolve(result.ok ? entry : null);
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

  // 요청 성공 뒤에도 트랜잭션 커밋(용량 초과 등)이 실패할 수 있어 complete까지 기다립니다.
  function transactionDone(tx){
    const done = new Promise((resolve,reject)=>{
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    });
    done.catch(()=>{});
    return done;
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

  // IndexedDB가 성공하면 {ok:true,backend:'idb'}. IndexedDB를 쓸 수 없으면 localStorage 결과를 그대로
  // 돌려주므로 둘 다 실패하면 ok:false와 이유(no-storage·quota·storage-error)가 나옵니다.
  async function saveSession(session){
    const normalized = normalizeSession(session);
    const size = jsonSize(normalized);
    if(size > MAX_JSON_BYTES)return {ok:false,reason:'too-large',size};
    // 자동 복구용 로컬 사본을 먼저 씁니다. IndexedDB가 성공하면 사본의 실패는 결과에 넣지 않습니다.
    const local = await localSaveSession(normalized);
    const result = await idbStore(SESSION_STORE,'readwrite',async (store,tx)=>{
      const done = transactionDone(tx);
      await requestAsPromise(store.put(normalized));
      await done;
      return {ok:true,backend:'idb',size};
    });
    return result || local;
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

  // 지웠으면 true, 어느 저장소에서든 지우지 못했으면 false(D13). IndexedDB를 쓸 수 있으면 두 저장소 모두에서 지워야 true입니다.
  // 본문이 하나라도 남으면 loadSession이 지운 세션을 다시 읽을 수 있기 때문입니다. 삭제 트랜잭션은 저장과 같이 complete까지 기다립니다.
  async function deleteSession(id){
    const key = id || AUTOSAVE_ID;
    // IndexedDB 성공 여부와 관계없이 자동 복구용 로컬 사본도 제거합니다.
    const localResult = await localDeleteSession(key);
    const db = await openDb();
    if(!db)return localResult;
    const idbResult = await idbStore(SESSION_STORE,'readwrite',async (store,tx)=>{
      const done = transactionDone(tx);
      await requestAsPromise(store.delete(key));
      await done;
      return true;
    });
    return idbResult === true && localResult;
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

  // 구저장 키(세션 1개·슬롯 목록)를 새 저장소로 옮깁니다. 모두 저장된 경우에만 구저장 키를 지우고
  // migratedAt을 남깁니다. 하나라도 실패하면 키를 그대로 두고 migrationPending을 기록해 다음 실행에서
  // 다시 시도합니다(같은 id로 다시 써도 내용이 같으므로 안전합니다).
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
    const failed = [];
    const migrate = async (session,id) => {
      const result = await saveSession({...session,id});
      if(result.ok)count += 1;
      else failed.push({id,reason:result.reason || 'storage-error'});
    };

    if(legacySession)await migrate(legacySession,legacySession.id || AUTOSAVE_ID);
    for(const [index,slot] of legacySlots.entries()){
      // 다시 시도해도 같은 id가 나오도록 시각 대신 순번을 마지막 대안으로 씁니다.
      await migrate(slot,slot.id || `slot-${slot.timestamp || slot.savedAt || `legacy-${index + 1}`}`);
    }

    if(failed.length){
      await putMeta({key:'migrationPending',value:{lastAttemptAt:new Date().toISOString(),failed:failed.length}});
      return {ok:false,migrated:count,failed};
    }
    try{
      storage.removeItem(sessionKey);
      storage.removeItem(slotKey);
    }catch(_){}
    if((await getMeta('migrationPending'))?.value)await putMeta({key:'migrationPending',value:null});
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
    getMeta,
    estimateUsage,
    backend,
    closeDb,
    _resetForTests: resetForTests,
  };
})(window);
