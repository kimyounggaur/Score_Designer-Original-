import { beforeEach, describe, expect, it, vi } from 'vitest';

const parse = text => new DOMParser().parseFromString(text, 'text/xml');
let core;
beforeEach(async () => {
  delete window.ExportCore;
  vi.resetModules();
  await import('../../export-core.js');
  core = window.ExportCore;
});

describe('normalizeColor', () => {
  it('uppercases lowercase six-digit hex (MusicXML color pattern)', () => {
    expect(core.normalizeColor('#e74c3c')).toBe('#E74C3C');
  });
  it('expands three-digit shorthand', () => {
    expect(core.normalizeColor('#abc')).toBe('#AABBCC');
  });
  it('keeps an alpha channel (eight digits) and uppercases it', () => {
    expect(core.normalizeColor('#e74c3c80')).toBe('#E74C3C80');
  });
  it('leaves an already normalized value alone', () => {
    expect(core.normalizeColor('#3B82F6')).toBe('#3B82F6');
  });
  it('trims surrounding whitespace', () => {
    expect(core.normalizeColor('  #a855f7 ')).toBe('#A855F7');
  });
  it('returns null for values that are not hex colors', () => {
    expect(core.normalizeColor('red')).toBeNull();
    expect(core.normalizeColor('e74c3c')).toBeNull();
    expect(core.normalizeColor('#12345')).toBeNull();
    expect(core.normalizeColor('#gggggg')).toBeNull();
    expect(core.normalizeColor(undefined)).toBeNull();
    expect(core.normalizeColor(0xe74c3c)).toBeNull();
  });
});

describe('octaveOutOfRange', () => {
  const doc = body => parse(`<score-partwise><part id="P1">${body}</part></score-partwise>`);
  const note = (step, octave, alter = '') => `<note><pitch><step>${step}</step>${alter}<octave>${octave}</octave></pitch><duration>1</duration></note>`;

  it('returns nothing when every octave is 0..9', () => {
    const d = doc(`<measure number="1">${note('C', 0)}${note('B', 9)}${note('A', 4)}</measure>`);
    expect(core.octaveOutOfRange(d)).toEqual([]);
  });
  it('reports octave 10, negative and non-numeric values with their measure number', () => {
    const d = doc(`<measure number="1">${note('C', 4)}</measure><measure number="7">${note('F', 10, '<alter>1</alter>')}${note('G', -1)}${note('A', 'x')}</measure>`);
    expect(core.octaveOutOfRange(d)).toEqual([
      { measure: '7', step: 'F', octave: '10' },
      { measure: '7', step: 'G', octave: '-1' },
      { measure: '7', step: 'A', octave: 'x' },
    ]);
  });
  it('reports at most five notes', () => {
    const d = doc(`<measure number="1">${Array.from({ length: 9 }, () => note('C', 12)).join('')}</measure>`);
    expect(core.octaveOutOfRange(d)).toHaveLength(5);
  });
  it('ignores display-octave of unpitched notes and handles missing documents', () => {
    const d = doc('<measure number="1"><note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration></note></measure>');
    expect(core.octaveOutOfRange(d)).toEqual([]);
    expect(core.octaveOutOfRange(null)).toEqual([]);
  });
});

describe('isPercussionPart', () => {
  const part = body => parse(`<score-partwise><part id="P1">${body}</part></score-partwise>`).querySelector('part');
  const unpitched = '<note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration></note>';
  const pitched = '<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>';
  const rest = '<note><rest/><duration>1</duration></note>';

  it('is true when the first clef is percussion', () => {
    expect(core.isPercussionPart(part(`<measure number="1"><attributes><clef><sign>percussion</sign></clef></attributes>${rest}</measure>`))).toBe(true);
  });
  it('is true for unpitched-only parts even with a treble clef', () => {
    expect(core.isPercussionPart(part(`<measure number="1"><attributes><clef><sign>G</sign><line>2</line></clef></attributes>${unpitched}${unpitched}</measure>`))).toBe(true);
  });
  it('is false for pitched parts and for parts that only contain rests', () => {
    expect(core.isPercussionPart(part(`<measure number="1"><attributes><clef><sign>G</sign><line>2</line></clef></attributes>${pitched}</measure>`))).toBe(false);
    expect(core.isPercussionPart(part(`<measure number="1"><attributes><clef><sign>G</sign><line>2</line></clef></attributes>${rest}</measure>`))).toBe(false);
  });
  it('is false for a part that mixes pitched and unpitched notes, and for null', () => {
    expect(core.isPercussionPart(part(`<measure number="1">${pitched}${unpitched}</measure>`))).toBe(false);
    expect(core.isPercussionPart(null)).toBe(false);
  });
});
