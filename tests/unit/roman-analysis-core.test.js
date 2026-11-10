import { describe, expect, it } from 'vitest';
import '../../pitch-core.js';
import '../../measure-core.js';
import '../../chord-tools-core.js';
import '../../roman-analysis-core.js';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<score-partwise version="3.1">
  <part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list>
  <part id="P1">
    <measure number="1">
      <attributes>
        <divisions>1</divisions>
        <key><fifths>1</fifths></key>
        <time><beats>4</beats><beat-type>4</beat-type></time>
      </attributes>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>E</step><octave>5</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>G</step><octave>5</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="2">
      <note><pitch><step>D</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="3">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="4">
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="5">
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>B</step><octave>4</octave></pitch><duration>1</duration></note>
      <note><chord/><pitch><step>D</step><octave>5</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('RomanAnalysis', () => {
  it('detects roman numerals, cadences, and common progressions', () => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const analysis = window.RomanAnalysis.detectRomanNumeral(doc);

    expect(analysis.keyName).toBe('G');
    expect(analysis.tonicSemi).toBe(7);
    expect(analysis.rows.map((row) => row.roman)).toEqual(['Ⅱm7', 'Ⅴ7', 'Ⅰ', 'Ⅳ', 'Ⅰ']);
    expect(analysis.cadences).toContainEqual(
      expect.objectContaining({ label: '완전종지 (PAC)', measure: 3 }),
    );
    expect(analysis.cadences).toContainEqual(
      expect.objectContaining({ label: '변격종지 (PC)', measure: 5 }),
    );
    expect(analysis.progressions).toContainEqual(
      expect.objectContaining({ pair: 'Ⅱm7 → Ⅴ7', count: 1 }),
    );
  });

  it('inserts one direction word per analyzed measure', () => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const analysis = window.RomanAnalysis.detectRomanNumeral(doc);

    const inserted = window.RomanAnalysis.insertRomanNumerals(doc, analysis.rows);
    const words = Array.from(doc.querySelectorAll('direction words')).map((word) => word.textContent);

    expect(inserted).toBe(5);
    expect(words).toEqual(['Ⅱm7', 'Ⅴ7', 'Ⅰ', 'Ⅳ', 'Ⅰ']);
    // MusicXML 4.0의 words에는 사용자 속성을 둘 수 없으므로 표식은 xs:ID 속성 id로 구별합니다(Phase B V2).
    const marks = Array.from(doc.querySelectorAll('direction words'));
    expect(marks.every((word) => /^mxl-roman-1-\d+$/.test(word.getAttribute('id')))).toBe(true);
    expect(new Set(marks.map((word) => word.getAttribute('id'))).size).toBe(marks.length);
    expect(marks.some((word) => word.hasAttribute('data-roman-analysis'))).toBe(false);
  });
});

describe('roman marker ids (Phase B V2)', () => {
  const parse = (text) => new DOMParser().parseFromString(text, 'text/xml');
  const base = (body) => parse(`<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">${body}</part></score-partwise>`);
  const measure = (number, extra = '') => `<measure number="${number}">${extra}<note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note></measure>`;
  const rows = (...romans) => romans.map((roman, index) => ({ measure: index + 1, roman }));

  it('re-inserting replaces the earlier markers instead of stacking them and keeps ids unique', () => {
    const doc = base(measure(1) + measure(2));
    expect(window.RomanAnalysis.insertRomanNumerals(doc, rows('Ⅰ', 'Ⅴ'))).toBe(2);
    expect(window.RomanAnalysis.insertRomanNumerals(doc, rows('Ⅳ', 'Ⅰ'))).toBe(2);
    const marks = Array.from(doc.querySelectorAll('direction words'));
    expect(marks.map((word) => word.textContent)).toEqual(['Ⅳ', 'Ⅰ']);
    expect(marks.map((word) => word.getAttribute('id'))).toEqual(['mxl-roman-1-1', 'mxl-roman-1-2']);
  });
  it('does not reuse an id that another element already owns', () => {
    // measure@id도 xs:ID라 문서 전체에서 유일해야 합니다(part@id는 IDREF라 score-part와 같아도 됩니다).
    const doc = base(measure(1) + measure(2));
    doc.querySelector('measure').setAttribute('id', 'mxl-roman-1-1');
    window.RomanAnalysis.insertRomanNumerals(doc, rows('Ⅰ', 'Ⅴ'));
    const wordIds = Array.from(doc.querySelectorAll('direction words'), (word) => word.getAttribute('id'));
    expect(wordIds).toEqual(['mxl-roman-1-2', 'mxl-roman-1-3']);
    expect(doc.querySelector('measure').getAttribute('id')).toBe('mxl-roman-1-1');
  });
  it('recognizes a words element by the id prefix, and only by that', () => {
    const doc = base(measure(1, '<direction><direction-type><words id="mxl-roman-9-9">Ⅰ</words></direction-type></direction><direction><direction-type><words id="memo-1">메모</words></direction-type></direction>'));
    const [roman, memo] = Array.from(doc.querySelectorAll('words'));
    expect(window.RomanAnalysis.isRomanWords(roman)).toBe(true);
    expect(window.RomanAnalysis.isRomanWords(memo)).toBe(false);
    expect(window.RomanAnalysis.isRomanWords(null)).toBe(false);
  });
  it('removes legacy data-roman-analysis directions before inserting', () => {
    const legacy = '<direction placement="above"><direction-type><words font-size="12" font-weight="bold" data-roman-analysis="true">Ⅰ</words></direction-type></direction>';
    const doc = base(measure(1, legacy) + measure(2, legacy));
    window.RomanAnalysis.insertRomanNumerals(doc, rows('Ⅱ'));
    expect(Array.from(doc.querySelectorAll('direction words'), (word) => word.textContent)).toEqual(['Ⅱ']);
    expect(doc.querySelector('[data-roman-analysis]')).toBeNull();
  });
  it('leaves a normal tempo/expression words direction alone', () => {
    const own = '<direction placement="above"><direction-type><words>dolce</words></direction-type></direction>';
    const doc = base(measure(1, own) + measure(2));
    window.RomanAnalysis.insertRomanNumerals(doc, rows('Ⅰ', 'Ⅴ'));
    expect(Array.from(doc.querySelectorAll('direction words'), (word) => word.textContent)).toEqual(['dolce', 'Ⅰ', 'Ⅴ']);
  });
  it('migrateRomanMarkers turns the legacy attribute into a standard id and reports the count', () => {
    const legacy = (text) => `<direction placement="above"><direction-type><words font-size="12" data-roman-analysis="true">${text}</words></direction-type></direction>`;
    const doc = base(measure(1, legacy('Ⅰ')) + measure(2, legacy('Ⅴ')));
    expect(window.RomanAnalysis.migrateRomanMarkers(doc)).toBe(2);
    const marks = Array.from(doc.querySelectorAll('direction words'));
    expect(marks.map((word) => word.getAttribute('id'))).toEqual(['mxl-roman-1-1', 'mxl-roman-1-2']);
    expect(doc.querySelector('[data-roman-analysis]')).toBeNull();
    expect(marks.every((word) => window.RomanAnalysis.isRomanWords(word))).toBe(true);
    expect(window.RomanAnalysis.migrateRomanMarkers(doc)).toBe(0);
  });
  it('migrateRomanMarkers numbers by part, drops a non-true legacy attribute without adding an id and counts every words it touched', () => {
    const word = (text, attr) => `<direction><direction-type><words ${attr}>${text}</words></direction-type></direction>`;
    const doc = parse(`<score-partwise><part-list><score-part id="P1"/><score-part id="P2"/></part-list>
      <part id="P1"><measure number="1">${word('Ⅰ', 'data-roman-analysis="true"')}</measure></part>
      <part id="P2"><measure number="1">${word('Ⅴ', 'data-roman-analysis="true"')}${word('x', 'data-roman-analysis="false"')}</measure></part></score-partwise>`);
    expect(window.RomanAnalysis.migrateRomanMarkers(doc)).toBe(3);
    const marks = Array.from(doc.querySelectorAll('words'));
    expect(marks.map((node) => node.getAttribute('id'))).toEqual(['mxl-roman-1-1', 'mxl-roman-2-1', null]);
    expect(doc.querySelector('[data-roman-analysis]')).toBeNull();
  });
  it('migrateRomanMarkers keeps an id that another program already set', () => {
    const doc = base(measure(1, '<direction><direction-type><words id="x1" data-roman-analysis="true">Ⅰ</words></direction-type></direction>'));
    expect(window.RomanAnalysis.migrateRomanMarkers(doc)).toBe(1);
    expect(doc.querySelector('words').getAttribute('id')).toBe('x1');
    expect(doc.querySelector('[data-roman-analysis]')).toBeNull();
  });
});

describe('minor keys, inversions and secondary dominants',()=>{
  const parse=text=>new DOMParser().parseFromString(text,'text/xml');
  const chord=pitches=>pitches.map(([step,octave,alter=0],index)=>`<note>${index?'<chord/>':''}<pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch><duration>4</duration></note>`).join('');
  const score=measures=>parse(`<score-partwise><part id="P1">${measures.map((body,index)=>`<measure number="${index+1}">${index===0?'<attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes>':''}${body}</measure>`).join('')}</part></score-partwise>`);
  it('analyzes A minor i–iv–V7–i and inserts labels unchanged',()=>{
    const doc=parse(readFileSync(path.resolve('tests/fixtures/f04-minor-harmony.musicxml'),'utf8'));
    const data=window.RomanAnalysis.detectRomanNumeral(doc);expect(data.mode).toBe('minor');expect(data.tonicSemi).toBe(9);
    expect(data.rows.map(row=>row.roman)).toEqual(['i','iv','V7','i']);
    window.RomanAnalysis.insertRomanNumerals(doc,data.rows);
    expect(Array.from(doc.querySelectorAll('words'),el=>el.textContent)).toEqual(['i','iv','V7','i']);
  });
  it('recognizes C/E and G7/F inversions',()=>{
    const data=window.RomanAnalysis.detectRomanNumeral(score([chord([['E',3],['C',4],['G',4]]),chord([['F',3],['G',3],['B',3],['D',4]])]));
    expect(data.rows.map(row=>row.roman)).toEqual(['I6','V4/2']);expect(data.rows.map(row=>row.inversion)).toEqual([1,3]);
  });
  it('labels D7 resolving to G as V7/V and leaves unresolved chromatic harmony unknown',()=>{
    const d7=chord([['D',3],['F',3,1],['A',3],['C',4]]),g=chord([['G',3],['B',3],['D',4]]);
    const data=window.RomanAnalysis.detectRomanNumeral(score([d7,g]));expect(data.rows[0].roman).toBe('V7/V');expect(data.rows[0].secondaryOf).toBe('V');
    expect(window.RomanAnalysis.detectRomanNumeral(score([d7])).rows[0].roman).toBe('?');
  });
  it('does not infer a half cadence at every dominant inside a phrase',()=>{
    const tonic=chord([['C',3],['E',3],['G',3]]),dominant=chord([['G',3],['B',3],['D',4]]);
    const data=window.RomanAnalysis.detectRomanNumeral(score([tonic,dominant,tonic]));expect(data.cadenceCounts['반종지 (HC)']).toBe(0);
    const ending=window.RomanAnalysis.detectRomanNumeral(score([tonic,dominant]));expect(ending.cadenceCounts['반종지 (HC)']).toBe(1);
  });
});

describe('chord identification needs three pitch classes (C01, C15, C18)',()=>{
  const fixture=name=>new DOMParser().parseFromString(readFileSync(path.resolve('tests/fixtures',name),'utf8'),'text/xml');
  it('keeps single notes and dyads unknown instead of forcing a seventh chord',()=>{
    expect(window.RomanAnalysis.identifyChord(new Set([0]))).toEqual(expect.objectContaining({quality:'unknown',rootSemi:null,chordName:'C(단음)'}));
    expect(window.RomanAnalysis.identifyChord(new Set([0,7]))).toEqual(expect.objectContaining({quality:'unknown',rootSemi:null,chordName:'C·G'}));
    expect(window.RomanAnalysis.identifyChord(new Set([0,4,7])).chordName).toBe('C');
    expect(window.RomanAnalysis.identifyChord(new Set([0,1,2]))).toEqual(expect.objectContaining({quality:'unknown',rootSemi:null,chordName:'C?'}));
    expect(window.RomanAnalysis.identifyChord(new Set([0,2,4,7]),{bass:0})).toEqual(expect.objectContaining({quality:'M',rootSemi:0}));
  });
  it('turns a unison beat into ? rather than a chord in roman analysis',()=>{
    const doc=new DOMParser().parseFromString('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note><note><chord/><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note></measure></part></score-partwise>','text/xml');
    const row=window.RomanAnalysis.detectRomanNumeral(doc).rows[0];
    expect(row.roman).toBe('?');expect(row.degree).toBeNull();expect(row.chordName).toBe('C(단음)');
  });
  it('analyzes verticalities per onset with printed measure numbers',()=>{
    const piano=window.RomanAnalysis.analyzeVerticalities(fixture('f12-piano-voices.musicxml')).filter(row=>row.measure===1);
    expect(piano.map(row=>row.beat)).toEqual(['1','2','3']);
    expect(piano.map(row=>row.pitchClasses.length)).toEqual([2,2,2]);
    expect(piano.map(row=>row.chord?.symbol??null)).toEqual([null,null,'C5']);
    const pickup=window.RomanAnalysis.analyzeVerticalities(fixture('f03-pickup.musicxml'));
    expect(pickup[0]).toEqual(expect.objectContaining({measure:0,beat:'1',chord:null}));
    const minor=window.RomanAnalysis.analyzeVerticalities(fixture('f04-minor-harmony.musicxml'));
    expect(minor.map(row=>row.chord?.symbol)).toEqual(['Am','Dm','E7','Am']);
  });
  it('spells chords with each measure key, matching MeasureCore.keyFifthsAt',()=>{
    const doc=fixture('f10-keychange-clef.musicxml');
    const rows=window.RomanAnalysis.analyzeVerticalities(doc);
    const part=window.MeasureCore.firstPart(doc);
    for(const row of rows)expect(row.fifths).toBe(window.MeasureCore.keyFifthsAt(part,row.measure));
    const flats=new DOMParser().parseFromString('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes><note><pitch><step>G</step><alter>1</alter><octave>3</octave></pitch><duration>4</duration></note><note><chord/><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note><note><chord/><pitch><step>D</step><alter>1</alter><octave>4</octave></pitch><duration>4</duration></note></measure><measure number="2"><attributes><key><fifths>-4</fifths></key></attributes><note><pitch><step>A</step><alter>-1</alter><octave>3</octave></pitch><duration>4</duration></note><note><chord/><pitch><step>C</step><octave>4</octave></pitch><duration>4</duration></note><note><chord/><pitch><step>E</step><alter>-1</alter><octave>4</octave></pitch><duration>4</duration></note></measure></part></score-partwise>','text/xml');
    expect(window.RomanAnalysis.analyzeVerticalities(flats).map(row=>row.chord.symbol)).toEqual(['G#','A♭']);
    expect(window.RomanAnalysis.analyzeVerticalities(flats,{fifthsByMeasure:new Map([[1,-4]])})[0].chord.symbol).toBe('A♭');
  });
});

describe('per-measure keys, sounding pitch and cadence types (C09, C10)',()=>{
  const fixture=name=>new DOMParser().parseFromString(readFileSync(path.resolve('tests/fixtures',name),'utf8'),'text/xml');
  it('reads a B-flat clarinet at sounding pitch so the ensemble is a C major triad',()=>{
    const data=window.RomanAnalysis.detectRomanNumeral(fixture('f16-ensemble-transposing.musicxml'));
    expect(data.rows[0]).toEqual(expect.objectContaining({chordName:'C',roman:'Ⅰ',keyName:'C'}));
    expect(data.rows).toHaveLength(1);
  });
  it('applies chromatic and octave-change transposition',()=>{
    const doc=new DOMParser().parseFromString('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><transpose><diatonic>-8</diatonic><chromatic>-2</chromatic><octave-change>-1</octave-change></transpose></attributes><note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note></measure><measure number="2"><note><pitch><step>D</step><octave>5</octave></pitch><duration>4</duration></note></measure></part></score-partwise>','text/xml');
    const parts=[doc.querySelector('part')];
    expect(window.RomanAnalysis.collectMeasureBeats(parts,0)[0].bassMidi).toBe(60);
    expect(window.RomanAnalysis.collectMeasureBeats(parts,1)[0].bassMidi).toBe(60);
    expect(window.RomanAnalysis.getPitchMidi(doc.querySelector('note'),-14)).toBe(60);
    expect(window.RomanAnalysis.getPitchMidi(doc.querySelector('note'))).toBe(74);
  });
  it('follows key changes from the measure where they appear',()=>{
    const data=window.RomanAnalysis.detectRomanNumeral(fixture('f10-keychange-clef.musicxml'));
    const keyOf=measure=>data.rows.filter(row=>row.measure===measure).map(row=>row.keyName);
    expect(keyOf(1)).toEqual(['C']);expect(keyOf(2)).toEqual(['C']);
    expect(keyOf(3)).toEqual(['A']);expect(keyOf(4)).toEqual(['A']);
    expect(data.keyName).toBe('C');
    expect(data.keyChanges).toEqual([expect.objectContaining({measure:3,keyName:'A',mode:'major',fifths:3})]);
  });
  it('labels roman numerals with the new tonic after a modulation',()=>{
    const triad=(notes)=>notes.map(([step,octave,alter=0],index)=>`<note>${index?'<chord/>':''}<pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch><duration>4</duration></note>`).join('');
    const doc=new DOMParser().parseFromString(`<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes>${triad([['G',3],['B',3],['D',4]])}</measure><measure number="2"><attributes><key><fifths>1</fifths></key></attributes>${triad([['G',3],['B',3],['D',4]])}</measure></part></score-partwise>`,'text/xml');
    expect(window.RomanAnalysis.detectRomanNumeral(doc).rows.map(row=>row.roman)).toEqual(['Ⅴ','Ⅰ']);
  });
  it('separates PAC from IAC by inversion and ignores undetermined chords',()=>{
    const {detectCadence}=window.RomanAnalysis;
    expect(detectCadence({degree:5,inversion:1,quality:'M'},{degree:1,inversion:1,quality:'M'})).toBe('불완전정격종지 (IAC)');
    expect(detectCadence({degree:5,inversion:0,quality:'M'},{degree:1,inversion:1,quality:'M'})).toBe('불완전정격종지 (IAC)');
    expect(detectCadence({degree:5,inversion:0,quality:'M'},{degree:1,inversion:0,quality:'M'})).toBe('완전종지 (PAC)');
    expect(detectCadence({degree:5,inversion:0,quality:'unknown'},{degree:1,inversion:0,quality:'M'})).toBeNull();
    expect(detectCadence({degree:5,inversion:0,quality:'M'},{degree:null,inversion:0,quality:'unknown'})).toBeNull();
    expect(window.RomanAnalysis.CADENCE_TYPES).toContain('불완전정격종지 (IAC)');
  });
  it('links a cadence across an undetermined beat in roman analysis',()=>{
    const chord=(notes,duration=4)=>notes.map(([step,octave,alter=0],index)=>`<note>${index?'<chord/>':''}<pitch><step>${step}</step><alter>${alter}</alter><octave>${octave}</octave></pitch><duration>${duration}</duration></note>`).join('');
    const doc=new DOMParser().parseFromString(`<score-partwise><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key></attributes>${chord([['G',3],['B',3],['D',4]],2)}${chord([['D',4]],2)}</measure><measure number="2">${chord([['C',3],['E',3],['G',3]])}</measure></part></score-partwise>`,'text/xml');
    const data=window.RomanAnalysis.detectRomanNumeral(doc);
    expect(data.rows.map(row=>row.roman)).toEqual(['Ⅴ','?','Ⅰ']);
    expect(data.cadences).toEqual([expect.objectContaining({measure:2,from:'Ⅴ',to:'Ⅰ',label:'완전종지 (PAC)'})]);
  });
});

