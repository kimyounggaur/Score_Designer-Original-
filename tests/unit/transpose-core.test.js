import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const parse=text=>new DOMParser().parseFromString(text,'text/xml');
const fixture=name=>parse(readFileSync(path.resolve('tests/fixtures',name),'utf8'));
let core;
beforeEach(async()=>{delete window.TransposeCore;vi.resetModules();await import('../../transpose-core.js');core=window.TransposeCore;});
describe('TransposeCore harmony and measure numbers',()=>{
  it.each([
    ['A',0,'minor',2,'B',null],['E',0,'dominant',1,'F',null],['B',-1,'major',2,'C',null],
  ])('%s chord transposes and preserves kind',(step,alter,kind,semi,next,nextAlter)=>{
    const doc=parse(`<harmony><root><root-step>${step}</root-step><root-alter>${alter}</root-alter></root><kind>${kind}</kind></harmony>`);
    core.transposeHarmony(doc.documentElement,semi);
    expect(doc.querySelector('root-step').textContent).toBe(next);
    expect(doc.querySelector('root-alter')?.textContent||null).toBe(nextAlter);
    expect(doc.querySelector('kind').textContent).toBe(kind);
  });
  it('transposes C/E into D/F sharp',()=>{
    const doc=parse('<harmony><root><root-step>C</root-step></root><kind>major</kind><bass><bass-step>E</bass-step></bass></harmony>');
    core.transposeHarmony(doc.documentElement,2);
    expect(doc.querySelector('root-step').textContent).toBe('D');
    expect(doc.querySelector('bass-step').textContent).toBe('F');
    expect(doc.querySelector('bass-alter').textContent).toBe('1');
  });
  it('transposes every chord in the minor fixture',()=>{
    const doc=fixture('f04-minor-harmony.musicxml');
    expect(core.transposeDocHarmonies(doc,2)).toBe(4);
    expect(Array.from(doc.querySelectorAll('root-step'),n=>n.textContent)).toEqual(['B','E','F','B']);
  });
  it('uses measure number rather than pickup index',()=>{
    const doc=fixture('f03-pickup.musicxml');
    const visit=vi.fn();const result=core.transposeMeasureRange(doc,1,2,2,{transposeNote:visit});
    expect(result).toEqual({notes:8,harmonies:0,measures:2});
    expect(visit).toHaveBeenCalledTimes(8);
    expect(visit.mock.calls.every(([n])=>n.parentElement.getAttribute('number')!=='0')).toBe(true);
  });
});

describe('Diatonic spelling and instrument relationships',()=>{
  const spelled=doc=>Array.from(doc.querySelectorAll('note pitch'),pitch=>pitch.querySelector('step').textContent+({'-2':'bb','-1':'b','0':'','1':'#','2':'##'})[Number(pitch.querySelector('alter')?.textContent||0)]);
  it.each([[false,['F#','G#','A#','B','C#','D#','E#','F#']],[true,['Gb','Ab','Bb','Cb','Db','Eb','F','Gb']]])('spells C major +6 using flat preference %s',(preferFlat,expected)=>{
    const doc=fixture('f01-basic.musicxml');core.transposeDocument(doc,6,{preferFlat});
    expect(spelled(doc)).toEqual(expected);
    expect(Number(doc.querySelector('fifths').textContent)).toBe(preferFlat?-6:6);
  });
  it('moves A minor into C minor and preserves mode and chord qualities',()=>{
    const doc=fixture('f04-minor-harmony.musicxml');core.transposeDocument(doc,3);
    expect(doc.querySelector('fifths').textContent).toBe('-3');expect(doc.querySelector('mode').textContent).toBe('minor');
    expect(Array.from(doc.querySelectorAll('root-step'),n=>n.textContent)).toEqual(['C','F','G','C']);
    expect(Array.from(doc.querySelectorAll('kind'),n=>n.textContent)).toEqual(['minor','minor','dominant','minor']);
  });
  it('preserves clarinet transpose while moving written D major to E major',()=>{
    const doc=fixture('f05-transposing.musicxml');const before=doc.querySelector('transpose').outerHTML;
    core.transposeDocument(doc,2);expect(doc.querySelector('fifths').textContent).toBe('4');expect(doc.querySelector('transpose').outerHTML).toBe(before);expect(spelled(doc)[0]).toBe('E');
  });
  it('moves E sharp up a minor second into F sharp and avoids needless double sharps in F sharp to G',()=>{
    expect(core.transposePitch({step:'E',alter:1,octave:4},{diatonic:1,chromatic:1})).toEqual({step:'F',alter:1,octave:4});
    const doc=fixture('f07-enharmonic.musicxml');core.transposeDocument(doc,1);
    expect(spelled(doc).slice(0,7)).toEqual(['G','A','B','C','D','E','F#']);expect(spelled(doc).some(p=>p.includes('##'))).toBe(false);
  });
  it('supports downward octave crossings and preserves double accidentals when valid',()=>{
    expect(core.transposePitch({step:'C',alter:0,octave:4},{diatonic:-1,chromatic:-1})).toEqual({step:'B',alter:0,octave:3});
    expect(core.transposePitch({step:'F',alter:2,octave:4},{diatonic:1,chromatic:2})).toEqual({step:'G',alter:2,octave:4});
  });
});
