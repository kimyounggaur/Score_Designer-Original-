import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const parse=text=>new DOMParser().parseFromString(text,'text/xml');
const fixture=name=>parse(readFileSync(path.resolve('tests/fixtures',name),'utf8'));
const part=(doc,index=0)=>doc.querySelectorAll('score-partwise > part')[index];
let core;
beforeEach(async()=>{delete window.MeasureCore;vi.resetModules();await import('../../measure-core.js');core=window.MeasureCore;});

describe('MeasureCore numbering',()=>{
  it('maps printed measure numbers including the pickup 0',()=>{
    const {map,duplicates}=core.measuresByNumber(part(fixture('f03-pickup.musicxml')));
    expect([...map.keys()]).toEqual([0,1,2,3,4]);
    expect(map.get(0).getAttribute('implicit')).toBe('yes');
    expect(duplicates).toEqual([]);
  });
  it('lists sorted numbers from the first part and reports duplicates',()=>{
    expect(core.measureNumbers(fixture('f02-two-parts.musicxml'))).toEqual([1,2,3,4]);
    const doc=parse('<score-partwise><part id="P1"><measure number="1"/><measure number="2"/><measure number="2"/><measure number="X1"/></part></score-partwise>');
    const {map,duplicates}=core.measuresByNumber(part(doc));
    expect([...map.keys()]).toEqual([1,2]);expect(duplicates).toHaveLength(1);
    expect(core.measureNumbers(doc)).toEqual([1,2]);
  });
});

describe('MeasureCore key tracking',()=>{
  it('follows key changes by measure number',()=>{
    const p=part(fixture('f10-keychange-clef.musicxml'));
    expect([1,2,3,4].map(n=>core.keyFifthsAt(p,n))).toEqual([0,0,3,3]);
    expect(core.modeAt(p,4)).toBe('major');
  });
  it('reads minor mode',()=>{
    expect(core.modeAt(part(fixture('f04-minor-harmony.musicxml')),3)).toBe('minor');
  });
});

describe('MeasureCore.effectiveAttributes',()=>{
  it('accumulates divisions, key, time and clef up to the requested measure',()=>{
    const p=part(fixture('f10-keychange-clef.musicxml'));
    const attributes=core.effectiveAttributes(p,4);
    expect(attributes.querySelector('divisions').textContent).toBe('1');
    expect(attributes.querySelector('key fifths').textContent).toBe('3');
    expect(attributes.querySelector('time beats').textContent).toBe('4');
    expect(attributes.querySelector('clef sign').textContent).toBe('F');
    expect(Array.from(attributes.children,c=>c.localName)).toEqual(['divisions','key','time','clef']);
    expect(attributes.parentNode).toBeNull();
    expect(core.effectiveAttributes(p,2).querySelector('clef sign').textContent).toBe('G');
  });
  it('keeps clefs per staff number',()=>{
    const doc=parse('<score-partwise><part id="P1"><measure number="1"><attributes><divisions>2</divisions><staves>2</staves><clef number="1"><sign>G</sign><line>2</line></clef><clef number="2"><sign>F</sign><line>4</line></clef></attributes></measure><measure number="2"><attributes><clef number="2"><sign>G</sign><line>2</line></clef></attributes></measure></part></score-partwise>');
    const attributes=core.effectiveAttributes(part(doc),2);
    expect(Array.from(attributes.querySelectorAll('clef'),c=>`${c.getAttribute('number')}:${c.querySelector('sign').textContent}`)).toEqual(['1:G','2:G']);
    expect(attributes.querySelector('staves').textContent).toBe('2');
  });
  it('inserts attribute children in schema order and creates leading attributes after print',()=>{
    const doc=parse('<measure number="1"><print new-system="yes"/><note><rest/><duration>1</duration></note></measure>');
    const attributes=core.leadingAttributes(doc.documentElement,true);
    core.insertAttributesChild(attributes,doc.createElement('clef'));
    core.insertAttributesChild(attributes,doc.createElement('divisions'));
    core.insertAttributesChild(attributes,doc.createElement('key'));
    expect(Array.from(attributes.children,c=>c.localName)).toEqual(['divisions','key','clef']);
    expect(Array.from(doc.documentElement.children,c=>c.localName)).toEqual(['print','attributes','note']);
    expect(core.leadingAttributes(doc.documentElement)).toBe(attributes);
  });
});

describe('MeasureCore.segments',()=>{
  it('sorts points, keeps the last value per measure and closes the last segment',()=>{
    expect(core.segments([{measure:3,value:'b'},{measure:1,value:'a'},{measure:3,value:'c'}],8)).toEqual([{from:1,to:2,value:'a'},{from:3,to:8,value:'c'}]);
  });
  it('drops points past the last measure',()=>{
    expect(core.segments([{measure:2,value:1},{measure:9,value:2}],4)).toEqual([{from:2,to:4,value:1}]);
  });
});

// D02: 업로드·세션·공유가 같은 구조 검사를 쓰도록 MeasureCore가 판정을 한 곳에서 맡습니다.
describe('MeasureCore.unsupportedScoreReason',()=>{
  const reason=text=>core.unsupportedScoreReason(parse(text));
  it('accepts a partwise score that has a part with a measure',()=>{
    expect(core.unsupportedScoreReason(fixture('f01-basic.musicxml'))).toBeNull();
    expect(reason('<score-partwise><part id="P1"><measure number="1"/></part></score-partwise>')).toBeNull();
    // 첫 파트가 비어 있어도 다른 파트에 마디가 있으면 열 수 있습니다.
    expect(reason('<score-partwise><part id="P1"/><part id="P2"><measure number="1"/></part></score-partwise>')).toBeNull();
  });
  it('rejects every structure the uploader rejects, with a distinct reason',()=>{
    expect(reason('<score-timewise><measure number="1"/></score-timewise>')).toContain('score-timewise');
    expect(reason('<opus/>')).toContain('opus');
    expect(reason('<html/>')).toContain('루트 요소: html');
    expect(reason('<score-partwise><part-list/></score-partwise>')).toBe('악보에 파트가 없습니다.');
    expect(reason('<score-partwise><part id="P1"/></score-partwise>')).toBe('악보에 마디가 없습니다.');
    expect(core.unsupportedScoreReason(null)).toContain('루트 요소: 없음');
  });
  it('does not count measures nested in other elements as a part measure',()=>{
    expect(reason('<score-partwise><part-list><score-part id="P1"><measure/></score-part></part-list></score-partwise>')).toBe('악보에 파트가 없습니다.');
  });
});
