(function(global){
  const HANGUL=/[\uAC00-\uD7A3]/;
  const VOWELS=/[aeiouyAEIOUY]/g;

  function notesWithIndex(xmlDoc){
    const rows=[];
    xmlDoc.querySelectorAll('measure').forEach((m,measureIdx)=>{
      m.querySelectorAll('note').forEach((note,noteIdx)=>{
        if(note.querySelector('rest'))return;
        rows.push({measureIdx,noteIdx,measureNum:m.getAttribute('number')||String(measureIdx+1),note});
      });
    });
    return rows;
  }

  function extractLyrics(xmlDoc){
    const result=[];
    xmlDoc.querySelectorAll('measure').forEach((m,measureIdx)=>{
      m.querySelectorAll('note').forEach((n,noteIdx)=>{
        n.querySelectorAll('lyric').forEach(lyric=>{
          const syllabic=lyric.querySelector('syllabic')?.textContent||'single';
          const text=lyric.querySelector('text')?.textContent||'';
          const verse=lyric.getAttribute('number')||'1';
          result.push({measureIdx,noteIdx,measureNum:m.getAttribute('number')||String(measureIdx+1),syllabic,text,verse});
        });
      });
    });
    return result;
  }

  function groupLyricsByVerse(lyrics){
    return (lyrics||[]).reduce((acc,item)=>{
      if(!acc[item.verse])acc[item.verse]={verse:item.verse,items:[],text:''};
      acc[item.verse].items.push(item);
      acc[item.verse].text=acc[item.verse].items.map(x=>x.text).filter(Boolean).join(' ');
      return acc;
    },{});
  }

  function splitEnglishWord(word){
    const clean=word.trim();
    if(!clean)return [];
    if(clean.includes('-'))return clean.split('-').filter(Boolean);
    const vowels=(clean.match(VOWELS)||[]).length;
    if(vowels<=1)return [clean];
    const size=Math.ceil(clean.length/vowels);
    const parts=[];
    for(let i=0;i<clean.length;i+=size)parts.push(clean.slice(i,i+size));
    return parts.filter(Boolean);
  }

  function splitSyllables(text){
    const result=[];
    String(text||'').split(/\s+/).filter(Boolean).forEach(word=>{
      if(Array.from(word).some(ch=>HANGUL.test(ch))){
        Array.from(word).forEach(ch=>{if(HANGUL.test(ch))result.push(ch)});
      }else{
        result.push(...splitEnglishWord(word));
      }
    });
    return result;
  }

  function mapSyllablesToNotes(xmlDoc,syllables){
    const notes=notesWithIndex(xmlDoc);
    return notes.slice(0,syllables.length).map((row,i)=>({...row,syllable:syllables[i],wordIndex:i}));
  }

  function syllabicFor(index,total){
    if(total<=1)return 'single';
    if(index===0)return 'begin';
    if(index===total-1)return 'end';
    return 'middle';
  }

  function removeVerseLyrics(xmlDoc,verse){
    xmlDoc.querySelectorAll(`lyric[number="${verse}"]`).forEach(l=>l.remove());
  }

  function appendLyric(note,verse,text,syllabic,style={}){
    const doc=note.ownerDocument;
    const lyric=doc.createElement('lyric');
    lyric.setAttribute('number',String(verse));
    const syl=doc.createElement('syllabic');
    syl.textContent=syllabic||'single';
    const txt=doc.createElement('text');
    txt.textContent=text;
    Object.entries(style||{}).forEach(([k,v])=>{if(v)txt.setAttribute(k,v)});
    lyric.appendChild(syl);
    lyric.appendChild(txt);
    note.appendChild(lyric);
  }

  function applyLyrics(xmlDoc,mapping,verse='1',style={}){
    removeVerseLyrics(xmlDoc,verse);
    const total=mapping.length;
    mapping.forEach((m,i)=>appendLyric(m.note,verse,m.syllable,syllabicFor(i,total),style));
    return {applied:mapping.length,remaining:0};
  }

  function addTranslationLyrics(xmlDoc,syllables,verse='2'){
    const mapping=mapSyllablesToNotes(xmlDoc,syllables);
    return applyLyrics(xmlDoc,mapping,verse,{'font-style':'italic',color:'#888888'});
  }

  function applyVerseStyle(xmlDoc,verse,style){
    let count=0;
    xmlDoc.querySelectorAll(`lyric[number="${verse}"] text`).forEach(t=>{
      Object.entries(style||{}).forEach(([k,v])=>{if(v)t.setAttribute(k,v);});
      count++;
    });
    return count;
  }

  function exportLyricsText(xmlDoc){
    const groups=groupLyricsByVerse(extractLyrics(xmlDoc));
    return Object.keys(groups).sort().map(v=>`[Verse ${v}]\n${groups[v].text}`).join('\n\n');
  }

  function formatSrtTime(seconds){
    const ms=Math.floor((seconds%1)*1000);
    const total=Math.floor(seconds);
    const s=total%60,m=Math.floor(total/60)%60,h=Math.floor(total/3600);
    const pad=(n,w=2)=>String(n).padStart(w,'0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms,3)}`;
  }

  function exportLyricsSrt(xmlDoc,bpm=120){
    const beatSec=60/(parseFloat(bpm)||120);
    const groups=groupLyricsByVerse(extractLyrics(xmlDoc));
    const verse=groups['1']?.items||Object.values(groups)[0]?.items||[];
    return verse.map((item,i)=>{
      const start=(parseInt(item.measureNum||item.measureIdx+1,10)-1)*4*beatSec;
      const end=start+4*beatSec;
      return `${i+1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${item.text}\n`;
    }).join('\n');
  }

  global.LyricsCore={extractLyrics,groupLyricsByVerse,splitSyllables,mapSyllablesToNotes,applyLyrics,addTranslationLyrics,applyVerseStyle,exportLyricsText,exportLyricsSrt};
})(window);
