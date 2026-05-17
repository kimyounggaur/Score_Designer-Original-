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
    const stats={kept:0,removedNoChord:0,removedOther:0};
    Array.from(xmlDoc?.querySelectorAll?.('measure')||[]).forEach(measure=>{
      let keptNoChord=false;
      measure.querySelectorAll('harmony').forEach(harmony=>{
        if(isNoChordHarmony(harmony)){
          if(keptNoChord){
            harmony.remove();
            stats.removedNoChord++;
          }else{
            keptNoChord=true;
            stats.kept++;
          }
        }else{
          harmony.remove();
          stats.removedOther++;
        }
      });
    });
    return stats;
  }

  function dedupeNoChordHarmonies(xmlDoc){
    const stats={kept:0,removedNoChord:0};
    Array.from(xmlDoc?.querySelectorAll?.('measure')||[]).forEach(measure=>{
      let keptNoChord=false;
      measure.querySelectorAll('harmony').forEach(harmony=>{
        if(!isNoChordHarmony(harmony))return;
        if(keptNoChord){
          harmony.remove();
          stats.removedNoChord++;
        }else{
          keptNoChord=true;
          stats.kept++;
        }
      });
    });
    return stats;
  }

  global.ChordToolsCore = {
    dedupeNoChordHarmonies,
    isNoChordHarmony,
    isNoChordText,
    measureHasNoChordHarmony,
    preserveNoChordHarmonies,
  };
})(window);
