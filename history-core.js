(function(global){
  'use strict';

  const MAX_HISTORY = 50;

  function cloneFile(file){
    return {
      ...file,
      xmlDoc:file?.xmlDoc?.cloneNode ? file.xmlDoc.cloneNode(true) : file?.xmlDoc,
    };
  }

  function cloneFiles(files){
    return Array.from(files||[]).map(cloneFile);
  }

  function pushHistoryEntry(history,index,files,label,timestamp){
    const nextEntry={
      files:cloneFiles(files),
      label:label||'변환',
      timestamp:timestamp||Date.now(),
    };
    const truncated=Array.from(history||[]).slice(0,index+1);
    const nextHistory=[...truncated,nextEntry].slice(-MAX_HISTORY);
    return {history:nextHistory,index:nextHistory.length-1};
  }

  function restoreHistoryFiles(entry){
    return cloneFiles(entry?.files||[]);
  }

  function serializeHistoryMeta(history){
    return Array.from(history||[]).map(({label,timestamp})=>({label,timestamp}));
  }

  global.HistoryCore = {
    MAX_HISTORY,
    cloneFiles,
    pushHistoryEntry,
    restoreHistoryFiles,
    serializeHistoryMeta,
  };
})(window);
