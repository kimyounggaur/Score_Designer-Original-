import {beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const parse=text=>new DOMParser().parseFromString(text,'text/xml');
const fixture=name=>parse(readFileSync(path.resolve('tests/fixtures',name),'utf8'));
const score=measures=>parse(`<score-partwise><part id="P1">${measures}</part></score-partwise>`);
const note='<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>';
const measuresOf=doc=>Array.from(doc.querySelector('part').children).filter(el=>el.localName==='measure');
const numbers=data=>data.measureTimeline.map(m=>m.measure);
// 한 마디짜리 합성 악보 조각: inner(방향·막대선)가 음표 앞에 온다.
const bar=(number,inner='')=>`<measure number="${number}">${inner}${note}</measure>`;
const words=(text,sound='')=>`<direction><direction-type><words>${text}</words></direction-type>${sound&&`<sound ${sound}/>`}</direction>`;
const segnoAt=id=>`<direction><direction-type><segno/></direction-type><sound segno="${id}"/></direction>`;
const codaAt=id=>`<direction><direction-type><coda/></direction-type><sound coda="${id}"/></direction>`;
const repeat=direction=>`<barline><repeat direction="${direction}"/></barline>`;
const twoParts=(first,second)=>parse(`<score-partwise><part-list><score-part id="P1"><part-name>A</part-name></score-part><score-part id="P2"><part-name>B</part-name></score-part></part-list><part id="P1">${first}</part><part id="P2">${second}</part></score-partwise>`);
let core;
beforeEach(async()=>{vi.resetModules();await import('../../playback-core.js');core=window.PlaybackCore;});
describe('PlaybackCore',()=>{
  it('merges tied notes without double attacks and preserves triplet timing',()=>{
    const data=core.extractPlaybackData(fixture('f06-lyrics-ties.musicxml'));
    expect(data.events).toHaveLength(6);expect(data.events[0].durationSec).toBeCloseTo(2.4);
    expect(data.events.at(-1).durationSec).toBeCloseTo(.2);
  });
  it('uses p/f velocities',()=>{
    const data=core.extractPlaybackData(fixture('f06-lyrics-ties.musicxml'));
    expect(data.events[0].velocity).toBe(49);expect(data.events[1].velocity).toBe(96);
  });
  it('unfolds repeats and restores score tempo when returning',()=>{
    const doc=fixture('f08-repeats-tempo.musicxml'),data=core.extractPlaybackData(doc);
    expect(data.measureTimeline.map(m=>m.measure)).toEqual([1,2,1,2,3,4]);
    expect(data.measureTimeline.map(m=>m.bpm)).toEqual([100,60,100,60,60,60]);
    expect(data.totalDuration).toBeCloseTo(20.8);
    expect(core.extractPlaybackData(doc,{expandRepeats:false}).totalMeasures).toBe(4);
    const faster=core.extractPlaybackData(doc,{bpm:200});expect(faster.totalDuration).toBeCloseTo(10.4);
    expect(faster.measureTimeline[1].bpm).toBe(120);
  });
  it('retains pickup number zero and its shorter duration',()=>{
    const data=core.extractPlaybackData(fixture('f03-pickup.musicxml'));
    expect(data.measureTimeline[0].measure).toBe(0);expect(data.measureTimeline[0].endSec).toBeCloseTo(.6);
  });
  it('finds exact boundaries, clamps outside the timeline and handles empty scores',()=>{
    const timeline=[{startSec:0,endSec:1},{startSec:1,endSec:3},{startSec:3,endSec:7}];
    expect(core.measureAtTime(timeline,-1)).toBe(timeline[0]);expect(core.measureAtTime(timeline,.99)).toBe(timeline[0]);
    expect(core.measureAtTime(timeline,1)).toBe(timeline[1]);expect(core.measureAtTime(timeline,9)).toBe(timeline[2]);
    expect(core.measureAtTime([],0)).toBeNull();
  });
  it('aligns parts with different divisions and sounds transposing instruments correctly',()=>{
    const data=core.extractPlaybackData(fixture('f02-two-parts.musicxml'));
    expect(new Set(data.events.filter(n=>n.measure===2).map(n=>n.startSec)).size).toBe(4);
    const clarinet=core.extractPlaybackData(fixture('f05-transposing.musicxml'));expect(clarinet.events[0].midiNote).toBe(60);
  });
  it('integrates tempo changes inside a 6/8 measure using quarter units',()=>{
    const doc=score(`<measure number="1"><attributes><divisions>1</divisions><time><beats>6</beats><beat-type>8</beat-type></time></attributes>${note}<direction><sound tempo="60" dynamics="100"/></direction>${note}${note}</measure>`);
    const data=core.extractPlaybackData(doc);expect(data.totalDuration).toBeCloseTo(2.5);
    expect(data.events[0].durationSec).toBeCloseTo(.5);expect(data.events[1].velocity).toBe(90);
  });
  it('selects first and second endings and bounds nested repeats',()=>{
    const doc=score('<measure number="1"><barline><repeat direction="forward"/></barline></measure><measure number="2"><barline location="left"><ending type="start" number="1"/></barline><barline><ending type="stop" number="1"/><repeat direction="backward"/></barline></measure><measure number="3"><barline><ending type="start" number="2"/><ending type="stop" number="2"/></barline></measure>');
    expect(core.expandMeasureOrder(Array.from(doc.querySelectorAll('measure')))).toEqual([0,1,0,2]);
    const nested=score('<measure><repeat direction="forward"/></measure><measure><repeat direction="forward"/></measure><measure><repeat direction="backward"/></measure><measure><repeat direction="backward"/></measure>');
    expect(core.expandMeasureOrder(Array.from(nested.querySelectorAll('measure')))).toEqual([0,1,2,1,2,3,0,1,2,1,2,3]);
  });
  it('warns about each navigation mark it does not follow, by its written label and without duplicates',()=>{
    // B-7부터 f17의 Fine + D.C. al Fine은 따르는 조합이다. 따르지 않는 경우(반복 펼치기 끔)로 라벨 안내를 확인한다.
    const data=core.extractPlaybackData(fixture('f17-dacapo.musicxml'),{expandRepeats:false});
    expect(data.warnings.length).toBeGreaterThanOrEqual(1);
    expect(new Set(data.warnings).size).toBe(data.warnings.length);
    const text=data.warnings.join(' ');
    expect(text).toContain('D.C.');expect(text).toContain('Fine');
    expect(data.warnings).toEqual(['반복 기호 Fine은(는) 재생에 반영되지 않습니다.','반복 기호 D.C. al Fine은(는) 재생에 반영되지 않습니다.']);
    expect(data.navigationMarks).toEqual(['Fine','D.C. al Fine']);
    expect(numbers(data)).toEqual([1,2,3,4]);
    expect(core.extractPlaybackData(fixture('f08-repeats-tempo.musicxml')).warnings).toEqual([]);
  });
  it('follows the f17 D.C. al Fine now: jump order and no leftover warning',()=>{
    const data=core.extractPlaybackData(fixture('f17-dacapo.musicxml'));
    expect(numbers(data)).toEqual([1,2,3,4,1,2]);
    expect(data.warnings).toEqual([]);expect(data.navigationMarks).toEqual([]);
  });
  it('labels segno, coda and bare sound jumps when no words name them',()=>{
    const doc=score(`<measure number="1"><direction><direction-type><segno/></direction-type><sound segno="s1"/></direction>${note}</measure>`
      +`<measure number="2"><barline location="left"><coda/></barline>${note}<sound dalsegno="s1"/></measure>`
      +`<measure number="3"><direction><direction-type><words>rit.</words></direction-type><sound tocoda="c1"/></direction>${note}<direction><direction-type><words>To  Coda</words></direction-type></direction></measure>`);
    expect(core.extractPlaybackData(doc).warnings).toEqual([
      '반복 기호 Segno은(는) 재생에 반영되지 않습니다.',
      '반복 기호 Coda은(는) 재생에 반영되지 않습니다.',
      '반복 기호 D.S.은(는) 재생에 반영되지 않습니다.',
      '반복 기호 To Coda은(는) 재생에 반영되지 않습니다.',
    ]);
  });
  describe('jumps (D.C./D.S./Fine/Coda)',()=>{
    it('f20 D.C. al Fine plays 1,2,3,4,1,2 and reports the marks it followed',()=>{
      const doc=fixture('f20-dc-al-fine.musicxml'),data=core.extractPlaybackData(doc);
      expect(numbers(data)).toEqual([1,2,3,4,1,2]);expect(data.totalMeasures).toBe(6);
      expect(data.warnings).toEqual([]);expect(data.navigationMarks).toEqual([]);
      expect(core.expandMeasureOrderDetailed(measuresOf(doc))).toEqual({order:[0,1,2,3,0,1],applied:['D.C. al Fine','Fine'],unsupported:[]});
    });
    it('f21 D.S. al Coda plays 1,2,3,4,2,3,5,6: back to the segno, then from To Coda to the coda',()=>{
      const doc=fixture('f21-ds-al-coda.musicxml'),data=core.extractPlaybackData(doc);
      expect(numbers(data)).toEqual([1,2,3,4,2,3,5,6]);
      expect(data.warnings).toEqual([]);expect(data.navigationMarks).toEqual([]);
      expect(core.expandMeasureOrderDetailed(measuresOf(doc))).toEqual({order:[0,1,2,3,1,2,4,5],applied:['D.S. al Coda','Segno','To Coda','Coda'],unsupported:[]});
    });
    it('D.S. al Fine returns to the segno and stops at Fine',()=>{
      const doc=score(bar(1)+bar(2,segnoAt('s1'))+bar(3,words('Fine','fine="yes"'))+bar(4,words('D.S. al Fine','dalsegno="s1"')));
      expect(numbers(core.extractPlaybackData(doc))).toEqual([1,2,3,4,2,3]);
    });
    it('D.C. al Coda replays from the start, leaves at To Coda and plays the coda',()=>{
      const doc=score(bar(1)+bar(2,words('To Coda','tocoda="c1"'))+bar(3,words('D.C. al Coda','dacapo="yes"'))+bar(4,codaAt('c1'))+bar(5));
      const data=core.extractPlaybackData(doc);
      expect(numbers(data)).toEqual([1,2,3,1,2,4,5]);expect(data.warnings).toEqual([]);
    });
    it('infers al Fine or al Coda from the marks when the D.C. text does not say which',()=>{
      const withFine=score(bar(1)+bar(2,words('Fine','fine="yes"'))+bar(3,words('D.C.','dacapo="yes"')));
      expect(numbers(core.extractPlaybackData(withFine))).toEqual([1,2,3,1,2]);
      const withCoda=score(bar(1)+bar(2,words('To Coda','tocoda="c1"'))+bar(3,words('D.C.','dacapo="yes"'))+bar(4,codaAt('c1')));
      expect(numbers(core.extractPlaybackData(withCoda))).toEqual([1,2,3,1,2,4]);
    });
    it('refuses to guess when one measure says both al Fine and al Coda',()=>{
      const doc=score(bar(1)+bar(2,words('Fine','fine="yes"'))+bar(3,words('D.C. al Fine','dacapo="yes"')+words('al Coda')));
      const result=core.expandMeasureOrderDetailed(measuresOf(doc));
      expect(result.order).toEqual([0,1,2]);expect(result.unsupported).toEqual(['D.C. al Fine']);
    });
    it('picks the segno named by the D.S. mark when there are several',()=>{
      const marks=id=>score(bar(1,segnoAt('a'))+bar(2,segnoAt('b'))+bar(3,words('Fine','fine="yes"'))+bar(4,words('D.S. al Fine',`dalsegno="${id}"`)));
      expect(numbers(core.extractPlaybackData(marks('b')))).toEqual([1,2,3,4,2,3]);
      expect(numbers(core.extractPlaybackData(marks('a')))).toEqual([1,2,3,4,1,2,3]);
      expect(core.expandMeasureOrderDetailed(measuresOf(marks('x'))).unsupported).toEqual(['D.S. al Fine']);
    });
    it('a plain D.C. with no Fine or Coda replays the whole score once more',()=>{
      const doc=score(bar(1)+bar(2)+bar(3,words('D.C.','dacapo="yes"')));
      const data=core.extractPlaybackData(doc);
      expect(numbers(data)).toEqual([1,2,3,1,2,3]);expect(data.warnings).toEqual([]);
    });
    it('does not jump when D.S. has no segno, and keeps the warning',()=>{
      const doc=score(bar(1)+bar(2,words('D.S.','dalsegno="s1"')));
      expect(core.expandMeasureOrderDetailed(measuresOf(doc))).toEqual({order:[0,1],applied:[],unsupported:['D.S.']});
      const data=core.extractPlaybackData(doc);
      expect(numbers(data)).toEqual([1,2]);expect(data.warnings).toEqual(['반복 기호 D.S.은(는) 재생에 반영되지 않습니다.']);
    });
    it('does not jump when the segno comes after the D.S. mark',()=>{
      const doc=score(bar(1,words('D.S.','dalsegno="s1"'))+bar(2,segnoAt('s1')));
      const result=core.expandMeasureOrderDetailed(measuresOf(doc));
      expect(result.order).toEqual([0,1]);expect(result.unsupported).toEqual(['D.S.']);
    });
    it('does not jump when there are two jump marks and keeps every warning',()=>{
      const doc=score(bar(1)+bar(2,words('D.C. al Fine','dacapo="yes"'))+bar(3,words('Fine','fine="yes"'))+bar(4,words('D.C.','dacapo="yes"')));
      const result=core.expandMeasureOrderDetailed(measuresOf(doc));
      expect(result.order).toEqual([0,1,2,3]);expect(result.applied).toEqual([]);expect(result.unsupported).toEqual(['D.C. al Fine','D.C.']);
      const data=core.extractPlaybackData(doc);
      expect(numbers(data)).toEqual([1,2,3,4]);
      expect(data.navigationMarks).toEqual(['D.C. al Fine','Fine','D.C.']);expect(data.warnings).toHaveLength(3);
    });
    it('does not replay the repeat after the jump',()=>{
      const doc=score(bar(1,repeat('forward'))+bar(2,repeat('backward'))+bar(3,words('Fine','fine="yes"'))+bar(4,words('D.C. al Fine','dacapo="yes"')));
      expect(numbers(core.extractPlaybackData(doc))).toEqual([1,2,1,2,3,4,1,2,3]);
    });
    it('plays only the last ending after the jump',()=>{
      const doc=score(bar(1,repeat('forward'))
        +bar(2,'<barline location="left"><ending type="start" number="1"/></barline><barline><ending type="stop" number="1"/><repeat direction="backward"/></barline>')
        +bar(3,'<barline><ending type="start" number="2"/><ending type="stop" number="2"/></barline>')
        +bar(4,words('Fine','fine="yes"'))+bar(5,words('D.C. al Fine','dacapo="yes"')));
      expect(numbers(core.extractPlaybackData(doc))).toEqual([1,2,1,3,4,5,1,3,4]);
    });
    it('reads marks from any part, counting the same mark in several parts once',()=>{
      const onlySecond=twoParts(bar(1)+bar(2)+bar(3),bar(1)+bar(2,words('Fine','fine="yes"'))+bar(3,words('D.C. al Fine','dacapo="yes"')));
      expect(numbers(core.extractPlaybackData(onlySecond))).toEqual([1,2,3,1,2]);
      const both=twoParts(bar(1)+bar(2,words('Fine','fine="yes"'))+bar(3,words('D.C. al Fine','dacapo="yes"')),bar(1)+bar(2,words('Fine','fine="yes"'))+bar(3,words('D.C. al Fine','dacapo="yes"')));
      const data=core.extractPlaybackData(both);
      expect(numbers(data)).toEqual([1,2,3,1,2]);expect(data.warnings).toEqual([]);
    });
    it('only treats a whole phrase as a jump mark, not ordinary words that contain Fine',()=>{
      const doc=score(bar(1,words('play fine'))+bar(2,words('D.C. al Fine','dacapo="yes"')));
      const result=core.expandMeasureOrderDetailed(measuresOf(doc));
      expect(result.order).toEqual([0,1]);expect(result.unsupported).toEqual(['D.C. al Fine']);
      expect(core.extractPlaybackData(doc).navigationMarks).toEqual(['play fine','D.C. al Fine']);
    });
    it('does not apply jumps when repeats are not expanded',()=>{
      const doc=fixture('f20-dc-al-fine.musicxml');
      expect(core.expandMeasureOrder(measuresOf(doc),false)).toEqual([0,1,2,3]);
      expect(core.expandMeasureOrder(measuresOf(doc),true,{jumps:false})).toEqual([0,1,2,3]);
      expect(core.expandMeasureOrder(measuresOf(doc))).toEqual([0,1,2,3,0,1]);
    });
    it('collects marks per measure from words, sound attributes and symbols',()=>{
      const f20=core.collectNavigation(measuresOf(fixture('f20-dc-al-fine.musicxml')));
      expect(f20).toHaveLength(4);
      expect(f20[1].fine).toBe(true);expect(f20[3]).toMatchObject({dacapo:true,alFine:true,alCoda:false});
      expect(f20[0]).toMatchObject({dacapo:false,dalsegno:false,segno:false,fine:false,tocoda:false,coda:false});
      const f21=core.collectNavigation(measuresOf(fixture('f21-ds-al-coda.musicxml')));
      expect(f21[1].segno).toBe('segno1');expect(f21[2].tocoda).toBe('coda1');
      expect(f21[3]).toMatchObject({dalsegno:'segno1',alCoda:true,alFine:false});expect(f21[4].coda).toBe('coda1');
    });
    it('puts a segno on a right barline at the next measure and keeps a left one in place',()=>{
      const right=core.collectNavigation(measuresOf(score(`<measure number="1">${note}<barline location="right"><segno/></barline></measure><measure number="2">${note}</measure>`)));
      expect(right.map(m=>m.segno)).toEqual([false,true]);
      const left=core.collectNavigation(measuresOf(score(`<measure number="1">${note}</measure><measure number="2"><barline location="left"><coda/></barline>${note}</measure>`)));
      expect(left.map(m=>m.coda)).toEqual([false,true]);
    });
    it('does not jump when Fine lies before the segno that D.S. returns to',()=>{
      const doc=score(bar(1,words('Fine','fine="yes"'))+bar(2,segnoAt('s1'))+bar(3,words('D.S. al Fine','dalsegno="s1"')));
      const result=core.expandMeasureOrderDetailed(measuresOf(doc));
      expect(result.order).toEqual([0,1,2]);expect(result.unsupported).toEqual(['D.S. al Fine']);
    });
    it('does not take a sign drawn inside a D.S. mark for a segno position',()=>{
      const sign='<direction><direction-type><segno/></direction-type></direction>';
      const doc=score(bar(1,sign)+bar(2,words('Fine','fine="yes"'))+bar(3,'<direction><direction-type><words>D.S. al Fine</words></direction-type><direction-type><segno/></direction-type></direction>'));
      expect(numbers(core.extractPlaybackData(doc))).toEqual([1,2,3,1,2]);
    });
    it('returns to a segno placed in the second ending and still plays that ending',()=>{
      const doc=score(bar(1,repeat('forward'))
        +bar(2,'<barline location="left"><ending type="start" number="1"/></barline><barline><ending type="stop" number="1"/><repeat direction="backward"/></barline>')
        +bar(3,segnoAt('s1')+'<barline><ending type="start" number="2"/><ending type="stop" number="2"/></barline>')
        +bar(4,words('Fine','fine="yes"'))+bar(5,words('D.S. al Fine','dalsegno="s1"')));
      expect(numbers(core.extractPlaybackData(doc))).toEqual([1,2,1,3,4,5,3,4]);
    });
    it('caps the order at 20,000 measures after the jump as well',()=>{
      // 중첩 반복(×6·×9·×16·×7)으로 점프 전 순서가 19,993개가 되게 맞춘 악보. 점프 뒤 10마디를 더하면 상한을 넘는다.
      const forward=[1,2,3,4].map(n=>bar(n,repeat('forward'))).join('');
      const closing=[7,16,9,6].map((times,i)=>bar(6+i,`<barline><repeat direction="backward" times="${times}"/></barline>`)).join('');
      const measures=measuresOf(score(forward+bar(5)+closing+bar(10,words('D.C.','dacapo="yes"'))));
      expect(core.expandMeasureOrder(measures,true,{jumps:false})).toHaveLength(19993);
      const result=core.expandMeasureOrderDetailed(measures);
      expect(result.applied).toEqual(['D.C.']);expect(result.order).toHaveLength(20000);expect(result.order[19993]).toBe(0);
    });
    it('never builds an order longer than 20,000 measures, even with nested 16x repeats and a jump',()=>{
      const forward=[1,2,3,4,5].map(n=>bar(n,repeat('forward'))).join('');
      const backward=[6,7,8,9,10].map(n=>bar(n,'<barline><repeat direction="backward" times="16"/></barline>')).join('');
      const result=core.expandMeasureOrderDetailed(measuresOf(score(forward+backward+bar(11,words('D.C.','dacapo="yes"')))));
      expect(result.order).toHaveLength(20000);expect(result.unsupported).toEqual(['D.C.']);
    });
  });
  describe('percussion parts',()=>{
    it('reports an unpitched part as muted and produces no events for it',()=>{
      const data=core.extractPlaybackData(fixture('f19-drums-tab.musicxml'));
      expect(data.mutedParts).toEqual(['Drums']);expect(data.unpitchedParts).toEqual(['Drums']);
      expect(data.events.filter(e=>e.partId==='P2')).toHaveLength(0);expect(data.events.filter(e=>e.partId==='P1').length).toBeGreaterThan(0);
      expect(data.warnings).toContain('타악기 파트 Drums은(는) 재생되지 않습니다.');
    });
    it('a score with only unpitched notes has no events and a pitched score has no muted parts',()=>{
      const drums=score('<measure number="1"><note><unpitched><display-step>C</display-step><display-octave>5</display-octave></unpitched><duration>1</duration></note></measure>');
      const data=core.extractPlaybackData(drums);
      expect(data.events).toHaveLength(0);expect(data.mutedParts).toHaveLength(1);expect(data.warnings).toEqual(['타악기 파트 Part 1은(는) 재생되지 않습니다.']);
      const pitched=core.extractPlaybackData(fixture('f08-repeats-tempo.musicxml'));
      expect(pitched.mutedParts).toEqual([]);expect(pitched.unpitchedParts).toEqual([]);
    });
  });
});
