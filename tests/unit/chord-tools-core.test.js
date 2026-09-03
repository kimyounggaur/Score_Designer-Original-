import { describe, expect, it } from 'vitest';
import '../../chord-tools-core.js';

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
