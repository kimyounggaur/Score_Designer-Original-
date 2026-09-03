import {describe,expect,it} from 'vitest';
import '../../chord-tools-core.js';
import '../../chord-symbol-core.js';
const core=window.ChordSymbolCore;
const harmony=()=>new DOMParser().parseFromString('<harmony placement="above"><offset>2</offset></harmony>','text/xml').documentElement;
describe('ChordSymbolCore',()=>{
  it.each(Object.keys(core.KIND_TABLE))('round trips MusicXML kind %s',kind=>{
    expect(Object.keys(core.KIND_TABLE)).toHaveLength(33);
    const el=harmony();core.apply(el,{rootStep:'C',rootAlter:0,kind});
    const parsed=core.parse(core.toString(el));expect(parsed?.kind).toBe(kind);
    const next=harmony();core.apply(next,parsed);expect(next.querySelector('kind').textContent).toBe(kind);
    expect(next.getAttribute('placement')).toBe('above');expect(next.lastElementChild.localName).toBe('offset');
  });
  it.each([['C/E','major','C/E'],['Cmaj7','major-seventh','Cmaj7'],['F#m7b5','half-diminished','F#m7♭5'],['Bbadd9','major','B♭add9'],['N.C.','none','N.C.'],['G7b9/D','dominant','G7♭9/D']])('parses %s',(text,kind,result)=>{
    const parsed=core.parse(text);expect(parsed.kind).toBe(kind);const el=harmony();core.apply(el,parsed);expect(core.toString(el)).toBe(result);
  });
  it('prefers kind text and rejects unrecognized suffixes without silently using major',()=>{
    const el=harmony();core.apply(el,{rootStep:'C',kind:'major-seventh',kindText:'Δ7'});expect(core.toString(el)).toBe('CΔ7');
    expect(core.parse('Cbanana')).toBeNull();expect(core.parse('Hello')).toBeNull();
  });
});
