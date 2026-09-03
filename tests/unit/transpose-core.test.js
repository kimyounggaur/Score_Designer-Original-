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
