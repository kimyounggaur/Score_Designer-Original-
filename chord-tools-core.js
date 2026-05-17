(function(global){
  'use strict';

  function normalizeNoChordText(text){
    return (text||'').trim().toLowerCase().replace(/\s+/g,'');
  }

  function isNoChordText(text){
    return /^n[.,]?c[.,]?$/.test(normalizeNoChordText(text));
  }

  function isNoChordHarmony(harmony){
    if(!harmony)return false;
    const kindEl=harmony.querySelector('kind');
    const kind=(kindEl?.textContent||'').trim().toLowerCase();
    const kindText=kindEl?.getAttribute('text')||'';
    return kind==='none'||kind==='no-chord'||isNoChordText(kindText)||isNoChordText(harmony.textContent);
  }

  function measureHasNoChordHarmony(measure){
    if(Array.from(measure?.querySelectorAll?.('harmony')||[]).some(isNoChordHarmony))return true;
    return Array.from(measure?.querySelectorAll?.('direction words')||[]).some(words=>isNoChordText(words.textContent));
  }

  function preserveNoChordHarmonies(xmlDoc){
    Array.from(xmlDoc?.querySelectorAll?.('measure')||[]).forEach(measure=>{
      measure.querySelectorAll('harmony').forEach(harmony=>{
        if(!isNoChordHarmony(harmony))harmony.remove();
      });
    });
  }

  global.ChordToolsCore = {
    isNoChordHarmony,
    isNoChordText,
    measureHasNoChordHarmony,
    preserveNoChordHarmonies,
  };
})(window);
