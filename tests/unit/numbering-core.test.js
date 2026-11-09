import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
const parse=text=>new DOMParser().parseFromString(text,'text/xml');
const fixture=name=>parse(readFileSync(path.resolve('tests/fixtures',name),'utf8'));
const part=(doc,index=0)=>doc.querySelectorAll('score-partwise > part')[index];
const lyricTexts=(doc,generated)=>Array.from(doc.querySelectorAll('lyric'))
  .filter(lyric=>generated===undefined||(lyric.getAttribute('name')==='mxl-studio-number')===generated)
  .map(lyric=>lyric.querySelector('text').textContent);
let core;
beforeEach(async()=>{delete window.NumberingCore;vi.resetModules();await import('../../numbering-core.js');core=window.NumberingCore;});

describe('NumberingCore octave dots',()=>{
  it('counts dots from the base octave and caps them at three',()=>{
    expect(core.octaveDots(4)).toEqual({above:0,below:0});
    expect(core.octaveDots(5)).toEqual({above:1,below:0});
    expect(core.octaveDots(7)).toEqual({above:3,below:0});
    expect(core.octaveDots(2)).toEqual({above:0,below:2});
    expect(core.octaveDots(0)).toEqual({above:0,below:3});
    expect(core.octaveDots(5,3)).toEqual({above:2,below:0});
  });
});

describe('NumberingCore noteToNumStr',()=>{
  it('writes fixed-do numbers with accidentals and octave dots',()=>{
    expect(core.noteToNumStr('C',0,4,{mode:'fixed'})).toBe('1');
    expect(core.noteToNumStr('F',1,4,{mode:'fixed',showSharp:true})).toBe('#4');
    expect(core.noteToNumStr('F',1,4,{mode:'fixed',showSharp:false})).toBe('4');
    expect(core.noteToNumStr('C',0,5,{mode:'fixed'})).toBe('˙1');
    expect(core.noteToNumStr('C',0,6,{mode:'fixed'})).toBe('˙˙1');
    expect(core.noteToNumStr('C',0,3,{mode:'fixed'})).toBe('1˙');
    expect(core.noteToNumStr('C',0,2,{mode:'fixed'})).toBe('1˙˙');
    expect(core.noteToNumStr('C',0,6,{mode:'fixed',showOct:false})).toBe('1');
  });
  it('writes Korean solfege syllables',()=>{
    expect(core.noteToNumStr('C',0,4,{mode:'korean'})).toBe('도');
    expect(core.noteToNumStr('C',0,5,{mode:'korean'})).toBe('˙도');
    expect(core.noteToNumStr('B',-1,4,{mode:'korean',showSharp:true})).toBe('♭시');
  });
  it('writes movable-do degrees from the key signature with letter-based accidentals',()=>{
    expect(core.noteToNumStr('E',0,4,{mode:'movable',fifths:3})).toBe('5');
    expect(core.noteToNumStr('F',1,4,{mode:'movable',fifths:3})).toBe('6');
    expect(core.noteToNumStr('C',0,4,{mode:'movable',fifths:3,showSharp:true})).toBe('♭3');
    expect(core.noteToNumStr('C',0,4,{mode:'movable',fifths:3,showSharp:false})).toBe('3');
    expect(core.noteToNumStr('B',-1,4,{mode:'movable',fifths:-1})).toBe('4');
    expect(core.noteToNumStr('B',0,4,{mode:'movable',fifths:-1,showSharp:true})).toBe('#4');
    expect(core.noteToNumStr('E',1,4,{mode:'movable',fifths:6})).toBe('7');
  });
});

describe('NumberingCore key tracking',()=>{
  it('reads the key in effect at the start of each measure',()=>{
    const doc=fixture('f10-keychange-clef.musicxml');const p=part(doc);
    const measure=n=>p.querySelector(`measure[number="${n}"]`);
    expect(core.fifthsForMeasure(p,measure(1))).toBe(0);
    expect(core.fifthsForMeasure(p,measure(2))).toBe(0);
    expect(core.fifthsForMeasure(p,measure(3))).toBe(3);
    expect(core.fifthsForMeasure(p,measure(4))).toBe(3);
  });
  it('numbers movable-do lyrics with the key of each measure',()=>{
    const doc=fixture('f10-keychange-clef.musicxml');
    core.generateNumberLyrics(doc,{mode:'movable',showOct:false});
    const at=n=>doc.querySelector(`measure[number="${n}"] lyric text`).textContent;
    expect([at(1),at(2),at(3),at(4)]).toEqual(['1','2','5','6']);
  });
});

describe('NumberingCore generated lyrics and backup',()=>{
  it('marks generated lyrics and does not stack them on repeated runs',()=>{
    const doc=fixture('f06-lyrics-ties.musicxml');
    const notes=doc.querySelectorAll('note pitch').length;
    expect(core.generateNumberLyrics(doc,{mode:'fixed',keepLyrics:true}).count).toBe(notes);
    expect(core.generateNumberLyrics(doc,{mode:'fixed',keepLyrics:true}).count).toBe(notes);
    expect(lyricTexts(doc,true)).toHaveLength(notes);
    expect(lyricTexts(doc,false)).toEqual(['아','리','랑']);
    expect(doc.querySelector('lyric[name="mxl-studio-number"]').getAttribute('number')).toBe('2');
  });
  it('round-trips original lyrics through backup, removal and restore',()=>{
    const doc=fixture('f06-lyrics-ties.musicxml');
    const backup=core.backupLyrics(doc);
    expect(backup.entries).toHaveLength(3);
    expect(core.removeUserLyrics(doc)).toBe(3);
    core.generateNumberLyrics(doc,{mode:'fixed'});
    expect(lyricTexts(doc,false)).toEqual([]);
    expect(core.removeGeneratedLyrics(doc)).toBe(7);
    expect(core.restoreLyrics(doc,backup)).toEqual({restored:3,missing:0});
    expect(lyricTexts(doc)).toEqual(['아','리','랑']);
    expect(doc.querySelector('lyric').getAttribute('number')).toBe('1');
    expect(doc.querySelector('lyric syllabic').textContent).toBe('begin');
  });
  it('restores by non-chord note position even after chord notes are added',()=>{
    const doc=fixture('f06-lyrics-ties.musicxml');
    const backup=core.backupLyrics(doc);core.removeUserLyrics(doc);
    // 화성 쌓기처럼 첫 음표 뒤에 chord 음표를 끼워 넣습니다.
    const first=doc.querySelector('note');const added=first.cloneNode(true);
    added.querySelectorAll('lyric').forEach(lyric=>lyric.remove());
    added.insertBefore(doc.createElement('chord'),added.firstChild);
    first.after(added);
    expect(core.restoreLyrics(doc,backup)).toEqual({restored:3,missing:0});
    expect(doc.querySelector('note').querySelector('lyric text').textContent).toBe('아');
    expect(added.querySelector('lyric')).toBeNull();
  });
  it('counts entries whose part no longer exists as missing',()=>{
    const doc=fixture('f06-lyrics-ties.musicxml');
    const backup=core.backupLyrics(doc);
    doc.querySelector('part').setAttribute('id','P9');
    expect(core.restoreLyrics(doc,backup)).toEqual({restored:0,missing:3});
  });
});
