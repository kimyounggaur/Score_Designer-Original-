import { describe, expect, it } from 'vitest';
import '../../roman-analysis-core.js';

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
