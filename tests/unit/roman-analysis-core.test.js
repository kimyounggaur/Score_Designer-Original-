import { describe, expect, it } from 'vitest';
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
    expect(Array.from(doc.querySelectorAll('direction words')).every((word) => word.getAttribute('data-roman-analysis') === 'true')).toBe(true);
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
