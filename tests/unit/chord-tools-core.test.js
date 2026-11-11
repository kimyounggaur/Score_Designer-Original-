import { describe, expect, it, vi } from 'vitest';
import '../../pitch-core.js';
import '../../measure-core.js';
import '../../chord-tools-core.js';
import '../../chord-symbol-core.js';
import '../../roman-analysis-core.js';

const xml = `<score-partwise>
  <part id="P1">
    <measure number="1">
      <harmony><kind>none</kind></harmony>
      <note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="2">
      <harmony><root><root-step>G</root-step></root><kind>major</kind></harmony>
      <note><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="3">
      <direction><direction-type><words>N.C.</words></direction-type></direction>
      <note><pitch><step>E</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
    <measure number="4">
      <harmony><root><root-step>A</root-step></root><kind text="N.C.">none</kind></harmony>
      <note><pitch><step>A</step><octave>4</octave></pitch><duration>1</duration></note>
    </measure>
  </part>
</score-partwise>`;

describe('ChordToolsCore', () => {
  it('detects no-chord markings from harmony and direction words', () => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    const measures = doc.querySelectorAll('measure');

    expect(window.ChordToolsCore.measureHasNoChordHarmony(measures[0])).toBe(true);
    expect(window.ChordToolsCore.measureHasNoChordHarmony(measures[1])).toBe(false);
    expect(window.ChordToolsCore.measureHasNoChordHarmony(measures[2])).toBe(true);
    expect(window.ChordToolsCore.measureHasNoChordHarmony(measures[3])).toBe(true);
  });

  it('preserves N.C. harmonies while clearing ordinary harmonies', () => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');

    window.ChordToolsCore.preserveNoChordHarmonies(doc);

    expect(doc.querySelectorAll('measure')[0].querySelectorAll('harmony')).toHaveLength(1);
    expect(doc.querySelectorAll('measure')[0].querySelector('kind').textContent).toBe('none');
    expect(doc.querySelectorAll('measure')[1].querySelectorAll('harmony')).toHaveLength(0);
  });
});

describe('ChordToolsCore.detectChordFromPitchClasses', () => {
  const core = () => window.ChordToolsCore;
  const symbol = (pcs, options) => core().detectChordFromPitchClasses(pcs, options)?.symbol ?? null;

  it('does not settle a chord from one note or a non-fifth dyad', () => {
    expect(core().detectChordFromPitchClasses([1])).toBeNull();
    expect(core().detectChordFromPitchClasses([0, 2])).toBeNull();
    expect(core().detectChordFromPitchClasses([0, 0, 12])).toBeNull();
    expect(core().detectChordFromPitchClasses([])).toBeNull();
  });

  it('names a perfect fifth dyad as a power chord on its lower note', () => {
    expect(core().detectChordFromPitchClasses([0, 7])).toEqual(expect.objectContaining({ quality: '5', symbol: 'C5' }));
    expect(symbol([7, 0])).toBe('C5');
  });

  it('requires every pattern tone and has no partial fallback', () => {
    expect(symbol([0, 4, 7])).toBe('C');
    expect(symbol([0, 1, 2])).toBeNull();
    expect(symbol([0, 3, 7, 10])).toBe('Cm7');
    expect(symbol([0, 4, 7, 10], {})).toBe('C7');
    expect(symbol([0, 3, 6, 9])).toBe('Cdim7');
    expect(symbol([2, 5, 9, 0])).toBe('Dm7');
    expect(symbol([0, 5, 7])).toBe('Csus4');
    expect(symbol([0, 3, 7, 11])).toBe('CmMaj7');
    expect(symbol([11, 2, 5, 9])).toBe('Bm7♭5');
  });

  it('spells the root from the key signature', () => {
    expect(symbol([1, 5, 8], { fifths: 6 })).toBe('C#');
    expect(symbol([1, 5, 8], { fifths: -5 })).toBe('D♭');
    expect(symbol([8, 0, 3], { fifths: -4 })).toBe('A♭');
    expect(symbol([8, 0, 3], { fifths: 5 })).toBe('G#');
    expect(core().spellPitchClass(10, -1)).toEqual({ step: 'B', alter: -1 });
    expect(core().spellPitchClass(6, 1)).toEqual({ step: 'F', alter: 1 });
    expect(core().spellPitchClass(3, 0)).toEqual({ step: 'D', alter: 1 });
    expect(core().spellPitchClass(3, -2)).toEqual({ step: 'E', alter: -1 });
  });

  it('falls back to the key direction when PitchCore is missing', () => {
    const pitchCore = window.PitchCore;
    delete window.PitchCore;
    try {
      expect(core().spellPitchClass(1, 6)).toEqual({ step: 'C', alter: 1 });
      expect(core().spellPitchClass(1, -5)).toEqual({ step: 'D', alter: -1 });
    } finally {
      window.PitchCore = pitchCore;
    }
  });

  it('breaks ties by bass, then by the first input note', () => {
    expect(symbol([0, 3, 6, 9], { bass: 6 })).toBe('F#dim7');
    expect(symbol([9, 0, 3, 6])).toBe('Adim7');
    expect(symbol([0, 4, 8], { bass: 4 })).toBe('Eaug');
  });

  it('writes symbols that ChordSymbolCore can read back', () => {
    for (const pcs of [[1, 5, 8], [8, 0, 3, 6], [0, 2, 7], [0, 7], [11, 2, 5, 9], [0, 3, 7, 11], [10, 2, 5, 9]]) {
      const chord = core().detectChordFromPitchClasses(pcs, { fifths: -4 });
      const parsed = window.ChordSymbolCore.parse(chord.symbol);
      expect(parsed, chord.symbol).not.toBeNull();
      const doc = new DOMParser().parseFromString('<harmony/>', 'text/xml');
      window.ChordSymbolCore.apply(doc.documentElement, parsed);
      expect(window.ChordSymbolCore.toString(doc.documentElement)).toBe(chord.symbol);
    }
  });
});


// D01: 자동 코드 삽입은 코드를 확정한 마디에서만 기존 코드를 바꾸고, 건너뛴 마디의 기존 코드는 지우지 않는다.
describe('ChordToolsCore.insertAutoChords', () => {
  const chordNotes = (pitches) => pitches.map(([step, alter], index) =>
    `<note>${index ? '<chord/>' : ''}<pitch><step>${step}</step>${alter ? `<alter>${alter}</alter>` : ''}<octave>4</octave></pitch><duration>4</duration></note>`).join('');
  const harmony = (step, kind = 'major') => `<harmony><root><root-step>${step}</root-step></root><kind>${kind}</kind></harmony>`;
  const restMeasure = (number, extra = '') => `<measure number="${number}">${extra}<note><rest/><duration>4</duration></note></measure>`;
  const scoreXml = `<score-partwise version="3.1">
    <part-list><score-part id="P1"><part-name>A</part-name></score-part><score-part id="P2"><part-name>B</part-name></score-part></part-list>
    <part id="P1">
      <measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes>${harmony('F')}${chordNotes([['C'], ['E'], ['G']])}</measure>
      <measure number="2">${harmony('G', 'dominant')}${chordNotes([['G']])}</measure>
      <measure number="3"><harmony><kind text="N.C.">none</kind></harmony>${chordNotes([['C'], ['E'], ['G']])}</measure>
      <measure number="4">${chordNotes([['D'], ['F', 1], ['A']])}</measure>
      ${restMeasure(5, harmony('A', 'minor'))}
    </part>
    <part id="P2">
      <measure number="1">${harmony('A')}<note><rest/><duration>4</duration></note></measure>
      <measure number="2">${harmony('E')}<note><rest/><duration>4</duration></note></measure>
      ${restMeasure(3)}${restMeasure(4)}${restMeasure(5)}
    </part>
  </score-partwise>`;
  const load = () => new DOMParser().parseFromString(scoreXml, 'text/xml');
  const group = (rows) => {
    const groups = [];
    for (const row of rows) {
      const last = groups[groups.length - 1];
      if (last && last.measureIndex === row.measureIndex) last.beats.push(row);
      else groups.push({ measure: row.measure, measureIndex: row.measureIndex, beats: [row] });
    }
    return groups;
  };
  const symbols = (doc, partId) => Array.from(doc.querySelectorAll(`part[id="${partId}"] harmony`), (h) => window.ChordSymbolCore.toString(h));
  const perMeasure = (doc, partId) => Array.from(doc.querySelectorAll(`part[id="${partId}"] measure`), (m) => Array.from(m.querySelectorAll('harmony'), (h) => window.ChordSymbolCore.toString(h)));
  const insert = (doc, options) => window.ChordToolsCore.insertAutoChords(doc, group(window.RomanAnalysis.analyzeVerticalities(doc)), options);

  it('replaces only settled measures and keeps the existing chord of an unsettled measure', () => {
    const doc = load();
    const result = insert(doc, { replaceExisting: true });

    expect(perMeasure(doc, 'P1')).toEqual([['C'], ['G7'], ['N.C.'], ['D'], ['Am']]);
    expect(result.inserted).toBe(2);
    expect(result.unsettled.map((u) => [Number(u.measure), u.existing])).toEqual([[2, 2]]);
    expect(result.keptExisting).toBe(2);
  });

  it('also replaces chords written in other parts at a settled measure, and keeps them elsewhere', () => {
    const doc = load();
    const result = insert(doc, { replaceExisting: true });

    expect(perMeasure(doc, 'P2')).toEqual([[], ['E'], [], [], []]);
    expect(result.replaced).toBe(2);
  });

  it('keeps every existing chord when nothing is replaced and reports the skipped measures', () => {
    const doc = load();
    const result = insert(doc, { replaceExisting: false });

    expect(perMeasure(doc, 'P1')).toEqual([['F'], ['G7'], ['N.C.'], ['D'], ['Am']]);
    expect(perMeasure(doc, 'P2')).toEqual([['A'], ['E'], [], [], []]);
    expect(result).toEqual(expect.objectContaining({ inserted: 1, replaced: 0, skippedExisting: 1 }));
  });

  it('never deletes chords when no measure is settled', () => {
    const doc = new DOMParser().parseFromString(`<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1">
      <measure number="1"><attributes><divisions>1</divisions></attributes>${harmony('E')}${chordNotes([['E']])}</measure>
      <measure number="2">${harmony('B', 'dominant')}${chordNotes([['B']])}</measure>
    </part></score-partwise>`, 'text/xml');
    const result = insert(doc, { replaceExisting: true });

    expect(symbols(doc, 'P1')).toEqual(['E', 'B7']);
    expect(result).toEqual(expect.objectContaining({ inserted: 0, replaced: 0, keptExisting: 2 }));
    expect(result.unsettled).toHaveLength(2);
  });

  it('leaves the existing chord when the detected symbol cannot be written', () => {
    const doc = load();
    const parse = vi.spyOn(window.ChordSymbolCore, 'parse').mockReturnValue(null);
    try {
      const result = insert(doc, { replaceExisting: true });
      expect(result.inserted).toBe(0);
      expect(perMeasure(doc, 'P1')).toEqual([['F'], ['G7'], ['N.C.'], [], ['Am']]);
    } finally {
      parse.mockRestore();
    }
  });
});
