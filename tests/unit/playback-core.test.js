import {beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import path from 'node:path';
const parse=text=>new DOMParser().parseFromString(text,'text/xml');
const fixture=name=>parse(readFileSync(path.resolve('tests/fixtures',name),'utf8'));
const score=measures=>parse(`<score-partwise><part id="P1">${measures}</part></score-partwise>`);
const note='<note><pitch><step>C</step><octave>4</octave></pitch><duration>1</duration></note>';
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
});
