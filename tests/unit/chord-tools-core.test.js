import { describe, expect, it } from 'vitest';
import '../../pitch-core.js';
import '../../chord-tools-core.js';
import '../../chord-symbol-core.js';

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

