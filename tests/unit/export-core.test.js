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

describe('PAGE_FORMATS / EXPORT_WIDTHS', () => {
  it('lists A4 portrait, A4 landscape and Letter portrait with OSMD ids and @page values', () => {
    expect(Object.keys(core.PAGE_FORMATS)).toEqual(['A4_P', 'A4_L', 'LETTER_P']);
    for (const format of Object.values(core.PAGE_FORMATS)) {
      expect(typeof format.label).toBe('string');
      expect(typeof format.osmd).toBe('string');
      expect(format.css).toMatch(/^(A4|letter) (portrait|landscape)$/);
    }
    expect(core.PAGE_FORMATS.A4_L.css).toBe('A4 landscape');
  });
  it('offers three export widths and uses 1100 as the default', () => {
    expect(core.EXPORT_WIDTHS).toEqual([800, 1100, 1400]);
    expect(core.DEFAULT_EXPORT_WIDTH).toBe(1100);
    expect(core.EXPORT_WIDTHS).toContain(core.DEFAULT_EXPORT_WIDTH);
  });
});

describe('clampExportWidth', () => {
  it('keeps the listed widths, also when given as a numeric string', () => {
    expect(core.clampExportWidth(800)).toBe(800);
    expect(core.clampExportWidth('1400')).toBe(1400);
  });
  it('falls back to the default for anything else', () => {
    for (const bad of [0, 1000, 358, -1, NaN, '', 'wide', null, undefined]) {
      expect(core.clampExportWidth(bad)).toBe(1100);
    }
  });
});

describe('pngPixelSize', () => {
  it('multiplies by the scale and rounds to whole pixels', () => {
    expect(core.pngPixelSize({ width: 1100, height: 821.33 }, 2)).toEqual({ width: 2200, height: 1643, tooLarge: false });
    expect(core.pngPixelSize({ width: 800, height: 600 }, 1.5)).toEqual({ width: 1200, height: 900, tooLarge: false });
  });
  it('flags a side beyond the 16,384px canvas limit', () => {
    expect(core.pngPixelSize({ width: 1100, height: 5000 }, 4).tooLarge).toBe(true);
    expect(core.pngPixelSize({ width: 1100, height: 4096 }, 4).tooLarge).toBe(false);
    expect(core.pngPixelSize({ width: 16385, height: 10 }, 1).tooLarge).toBe(true);
  });
  it('flags an area beyond the canvas limit even when each side fits', () => {
    expect(core.pngPixelSize({ width: 16000, height: 16000 }, 1).tooLarge).toBe(false);
    expect(core.pngPixelSize({ width: 16384, height: 16384 }, 1).tooLarge).toBe(true);
  });
  it('flags missing or zero sizes instead of producing a blank PNG', () => {
    expect(core.pngPixelSize(null, 2).tooLarge).toBe(true);
    expect(core.pngPixelSize({ width: 0, height: 100 }, 2).tooLarge).toBe(true);
    expect(core.pngPixelSize({ width: 'x', height: 100 }, 2).tooLarge).toBe(true);
  });
});

describe('svgIntrinsicSize', () => {
  const svg = attrs => {
    const doc = parse(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}/>`);
    return doc.documentElement;
  };
  it('reads the width and height attributes (fractional heights kept)', () => {
    expect(core.svgIntrinsicSize(svg('width="1100" height="821.33" viewBox="0 0 1100 821.33"'))).toEqual({ width: 1100, height: 821.33 });
  });
  it('accepts px units', () => {
    expect(core.svgIntrinsicSize(svg('width="640px" height="480px"'))).toEqual({ width: 640, height: 480 });
  });
  it('falls back to the viewBox when width/height are missing or relative', () => {
    expect(core.svgIntrinsicSize(svg('viewBox="0 0 900 300"'))).toEqual({ width: 900, height: 300 });
    expect(core.svgIntrinsicSize(svg('width="100%" height="auto" viewBox="0 0 700 200"'))).toEqual({ width: 700, height: 200 });
    expect(core.svgIntrinsicSize(svg('viewBox="0,0,500,250"'))).toEqual({ width: 500, height: 250 });
  });
  it('returns null when the size cannot be known', () => {
    expect(core.svgIntrinsicSize(svg(''))).toBeNull();
    expect(core.svgIntrinsicSize(svg('viewBox="0 0 0 0"'))).toBeNull();
    expect(core.svgIntrinsicSize(svg('width="0" height="0"'))).toBeNull();
    expect(core.svgIntrinsicSize(null)).toBeNull();
    expect(core.svgIntrinsicSize({})).toBeNull();
  });
});
