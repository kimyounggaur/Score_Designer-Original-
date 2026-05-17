(function(global){
  const LABELS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const COLORS=['#4D96FF','#45C4A0','#FFB84D','#AF52DE','#FF6B6B','#5AC8FA','#8E8E93'];

  function notePitchClass(note){
    const step=note.querySelector('step')?.textContent;
    const oct=note.querySelector('octave')?.textContent;
    if(!step||!oct)return null;
    const semi={C:0,D:2,E:4,F:5,G:7,A:9,B:11}[step]??0;
    const alter=parseInt(note.querySelector('alter')?.textContent||'0',10);
    return (semi+alter+12)%12;
  }

  function measureDurationData(measure){
    const divisions=parseFloat(measure.querySelector('divisions')?.textContent||'1')||1;
    let rest=0,total=0;
    const pitches=[],rhythms=[];
    measure.querySelectorAll('note').forEach(note=>{
      const dur=parseFloat(note.querySelector('duration')?.textContent||'0')||0;
      total+=dur;
      if(note.querySelector('rest'))rest+=dur;
      const pc=notePitchClass(note);
      if(pc!==null){pitches.push(pc);rhythms.push(Math.round((dur/divisions)*100)/100);}
    });
    return {pitches,rhythms,restRatio:total?rest/total:0};
  }

  function levenshtein(a,b){
    const m=a.length,n=b.length;
    const dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
    for(let i=0;i<=m;i++)dp[i][0]=i;
    for(let j=0;j<=n;j++)dp[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        const cost=String(a[i-1])===String(b[j-1])?0:1;
        dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
      }
    }
    return dp[m][n];
  }

  function sequenceSimilarity(a,b){
    const maxLen=Math.max(a.length,b.length,1);
    return Math.max(0,1-levenshtein(a,b)/maxLen);
  }

  function pitchSimilarity(a,b){
    let best=0;
    for(let t=0;t<12;t++){
      const transposed=a.map(p=>(p+t)%12);
      best=Math.max(best,sequenceSimilarity(transposed,b));
    }
    return best;
  }

  function rhythmSimilarity(a,b){
    return sequenceSimilarity(a,b);
  }

  function phraseSimilarity(a,b){
    return pitchSimilarity(a.pitchSeq,b.pitchSeq)*0.6+rhythmSimilarity(a.rhythmSeq,b.rhythmSeq)*0.4;
  }

  function detectCadenceBoundaries(xmlDoc){
    try{
      const roman=global.RomanAnalysis?.detectRomanNumeral?.(xmlDoc);
      return (roman?.cadences||[]).filter(c=>/완전종지|반종지|PAC|HC/.test(c.type||'')).map(c=>parseInt(c.measure,10)).filter(Boolean);
    }catch(e){return []}
  }

  function extractPhrases(xmlDoc,options={}){
    const measures=Array.from(xmlDoc.querySelectorAll('part:first-of-type > measure'));
    if(!measures.length)return [];
    const cadenceBounds=detectCadenceBoundaries(xmlDoc);
    const restBounds=measures.map(m=>({num:parseInt(m.getAttribute('number')||'0',10),data:measureDurationData(m)})).filter(x=>x.data.restRatio>=0.5).map(x=>x.num);
    const manualLen=parseInt(options.phraseLength||0,10);
    let boundaries=[...cadenceBounds,...restBounds].filter(n=>n>0&&n<measures.length);
    if(manualLen>0){
      boundaries=[];
      for(let n=manualLen;n<measures.length;n+=manualLen)boundaries.push(n);
    }
    if(!boundaries.length){
      const step=measures.length>=8?4:Math.max(1,Math.ceil(measures.length/2));
      for(let n=step;n<measures.length;n+=step)boundaries.push(n);
    }
    boundaries=[...new Set(boundaries)].sort((a,b)=>a-b);
    const starts=[1,...boundaries.map(n=>n+1)];
    const ends=[...boundaries,measures.length];
    return starts.map((start,i)=>{
      const end=ends[i];
      const slice=measures.slice(start-1,end);
      const pitchSeq=[],rhythmSeq=[];
      slice.forEach(m=>{
        const d=measureDurationData(m);
        pitchSeq.push(...d.pitches);
        rhythmSeq.push(...d.rhythms);
      });
      return {startMeasure:start,endMeasure:end,length:end-start+1,pitchSeq,rhythmSeq};
    });
  }

  function assignLabels(phrases){
    const groups=[];
    phrases.forEach(phrase=>{
      let best=null;
      groups.forEach((g,idx)=>{
        const sim=phraseSimilarity(phrase,g.seed);
        if(!best||sim>best.sim)best={idx,sim};
      });
      if(best&&best.sim>=0.75){
        phrase.label=groups[best.idx].label;
        phrase.similarTo=groups[best.idx].label;
        groups[best.idx].items.push(phrase);
      }else if(best&&best.sim>=0.5){
        phrase.label=groups[best.idx].label+"'";
        phrase.similarTo=groups[best.idx].label;
      }else{
        const label=LABELS[groups.length]||`S${groups.length+1}`;
        phrase.label=label;
        phrase.similarTo='';
        groups.push({label,seed:phrase,items:[phrase]});
      }
    });
    return phrases;
  }

  function detectPattern(labels){
    const compact=labels.join('');
    if(compact==='AA')return 'AA 이부 반복';
    if(compact==='AB')return 'AB 이부 형식 (Binary Form)';
    if(compact==='ABA')return 'ABA 삼부 형식 (Ternary Form)';
    if(labels.length===3&&labels[0]===labels[2].replace("'",''))return `${compact} Variant Ternary Form`;
    if(compact==='AABA')return 'AABA 32마디 형식';
    if(compact==="A'BA"||compact==="AA'BA")return `${compact} Variant Repetition Form`;
    return `${compact} 자유 형식`;
  }

  function keyPath(xmlDoc){
    const fifthNames={0:'C장조',1:'G장조',2:'D장조',3:'A장조',4:'E장조',5:'B장조',6:'F#장조',[-1]:'F장조',[-2]:'B♭장조',[-3]:'E♭장조',[-4]:'A♭장조',[-5]:'D♭장조',[-6]:'G♭장조'};
    const keys=Array.from(xmlDoc.querySelectorAll('key fifths')).map(k=>fifthNames[parseInt(k.textContent,10)]||`${k.textContent} fifths`);
    return [...new Set(keys)].join(' → ')||'조성 정보 없음';
  }

  function analyzeForm(xmlDoc,options={}){
    const phrases=assignLabels(extractPhrases(xmlDoc,options));
    phrases.forEach((p,i)=>{p.color=COLORS[i%COLORS.length];p.index=i+1;});
    const labels=phrases.map(p=>p.label);
    const averageLength=phrases.length?Math.round((phrases.reduce((s,p)=>s+p.length,0)/phrases.length)*10)/10:0;
    return {
      phrases,
      labels,
      sections:[{name:'전체 구조',startMeasure:phrases[0]?.startMeasure||1,endMeasure:phrases[phrases.length-1]?.endMeasure||1,labels:labels.join(' ')}],
      summary:{formName:detectPattern(labels),phraseCount:phrases.length,averageLength,keyPath:keyPath(xmlDoc)},
    };
  }

  function findMeasure(doc,num){
    const measures=Array.from(doc.querySelectorAll('part:first-of-type > measure'));
    return measures.find(m=>m.getAttribute('number')===String(num))||measures[num-1]||null;
  }

  function insertFormLabels(xmlDoc,phrases){
    let inserted=0;
    (phrases||[]).forEach(p=>{
      const measure=findMeasure(xmlDoc,p.startMeasure);
      if(!measure)return;
      const doc=measure.ownerDocument;
      const direction=doc.createElement('direction');
      direction.setAttribute('placement','above');
      const type=doc.createElement('direction-type');
      const rehearsal=doc.createElement('rehearsal');
      rehearsal.textContent=p.label;
      type.appendChild(rehearsal);
      direction.appendChild(type);
      const first=Array.from(measure.children).find(el=>el.tagName==='note'||el.tagName==='attributes');
      if(first&&first.nextSibling)measure.insertBefore(direction,first.nextSibling);
      else measure.appendChild(direction);
      inserted++;
    });
    return {inserted};
  }

  global.FormAnalysisCore={levenshtein,pitchSimilarity,rhythmSimilarity,phraseSimilarity,extractPhrases,assignLabels,analyzeForm,insertFormLabels};
})(window);
