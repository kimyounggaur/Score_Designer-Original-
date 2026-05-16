(function(global){
  'use strict';

  function isNoChordHarmony(harmony){
    if(!harmony)return false;
    const kind=(harmony.querySelector('kind')?.textContent||'').trim().toLowerCase();
    const text=(harmony.textContent||'').trim().toLowerCase().replace(/\s+/g,'');
    return kind==='none'||kind==='no-chord'||text==='n.c.'||text==='n.c'||text==='nc'||text==='n,c';
  }

  function measureHasNoChordHarmony(measure){
    return Array.from(measure?.querySelectorAll?.('harmony')||[]).some(isNoChordHarmony);
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
    measureHasNoChordHarmony,
    preserveNoChordHarmonies,
  };
})(window);
