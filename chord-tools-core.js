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

  function removeNoChordWords(measure,stats){
    measure.querySelectorAll('direction').forEach(direction=>{
      let touched=false;
      direction.querySelectorAll('words').forEach(words=>{
        if(!isNoChordText(words.textContent))return;
        words.remove();
        stats.removedWords++;
        touched=true;
      });
      if(!touched)return;
      direction.querySelectorAll('direction-type').forEach(type=>{
        if(!type.children.length&&!type.textContent.trim())type.remove();
      });
      if(!direction.children.length&&!direction.textContent.trim()){
        direction.remove();
        stats.removedDirections++;
      }
    });
  }

  function removeNoChordMarkings(xmlDoc){
    const stats={removedNoChord:0,removedWords:0,removedDirections:0};
    Array.from(xmlDoc?.querySelectorAll?.('measure')||[]).forEach(measure=>{
      measure.querySelectorAll('harmony').forEach(harmony=>{
        if(!isNoChordHarmony(harmony))return;
        harmony.remove();
        stats.removedNoChord++;
      });
      removeNoChordWords(measure,stats);
    });
    return stats;
  }

  function preserveNoChordHarmonies(xmlDoc){
    const stats={kept:0,removedNoChord:0,removedOther:0,removedWords:0,removedDirections:0};
    Array.from(xmlDoc?.querySelectorAll?.('measure')||[]).forEach(measure=>{
      measure.querySelectorAll('harmony').forEach(harmony=>{
        if(isNoChordHarmony(harmony)){
          harmony.remove();
          stats.removedNoChord++;
        }else{
          harmony.remove();
          stats.removedOther++;
        }
      });
      removeNoChordWords(measure,stats);
    });
    return stats;
  }

  function dedupeNoChordHarmonies(xmlDoc){
    return removeNoChordMarkings(xmlDoc);
  }

  global.ChordToolsCore = {
    dedupeNoChordHarmonies,
    isNoChordHarmony,
    isNoChordText,
    measureHasNoChordHarmony,
    preserveNoChordHarmonies,
    removeNoChordMarkings,
  };
})(window);
