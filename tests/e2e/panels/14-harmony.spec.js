import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt,getPitches} from '../helpers.js';
const chordNotes=page=>page.evaluate(()=>{
  const signs={'-2':'bb','-1':'b','0':'','1':'#','2':'##'};
  return Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('note')).filter(note=>note.querySelector(':scope > chord')).map(note=>{
    const pitch=note.querySelector('pitch');
    let source=note.previousElementSibling;while(source&&source.querySelector(':scope > chord'))source=source.previousElementSibling;
    const read=(el,tag)=>el?.querySelector(`:scope > ${tag}`)?.textContent??null;
    return {pitch:`${pitch.querySelector('step').textContent}${signs[String(Number(pitch.querySelector('alter')?.textContent||0))]}/${pitch.querySelector('octave').textContent}`,
      voice:read(note,'voice'),sourceVoice:read(source,'voice'),staff:read(note,'staff'),sourceStaff:read(source,'staff'),
      tuplet:!!note.querySelector(':scope > time-modification'),sourceTuplet:!!source?.querySelector(':scope > time-modification'),
      accidental:read(note,'accidental'),order:Array.from(note.children,c=>c.localName).join(',')};
  });
});
test('@panels harmony: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'harmony',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3도 위',exact:true}).click();await panel.getByRole('button',{name:/화성 쌓기 실행/}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('measure[number="1"] note').length)).toBe(8);}});
});
test('@panels harmony spells diatonic thirds from the key signature',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'harmony',before:()=>uploadFixture(page,'f07-enharmonic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3도 위',exact:true}).click();await panel.getByRole('button',{name:/화성 쌓기 실행/}).click();},expect:async panel=>{
    await expect.poll(async()=>(await chordNotes(page)).map(n=>n.pitch)).toEqual(['A#/4','B/4','C#/5','D#/5','E#/5','F#/5','G#/5','D#/6']);
    expect((await chordNotes(page)).every(n=>n.accidental===null)).toBe(true);
  }});
});
test('@panels harmony copies voice, staff and tuplet data into the added notes',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'harmony',before:()=>uploadFixture(page,'f12-piano-voices.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3도 아래',exact:true}).click();await panel.getByRole('button',{name:/화성 쌓기 실행/}).click();},expect:async panel=>{
    await expect.poll(async()=>(await chordNotes(page)).map(n=>n.pitch)).toEqual(['C/4','D/4','E/4','A/2','A/4','B/4','C/5','D/5','E/5','E/2']);
    const notes=await chordNotes(page);
    expect(notes.every(n=>n.voice===n.sourceVoice&&n.staff===n.sourceStaff&&n.tuplet===n.sourceTuplet)).toBe(true);
    expect(notes.filter(n=>n.tuplet)).toHaveLength(3);
    expect(notes[0].order).toBe('chord,pitch,duration,voice,type,stem,staff');
    await expect(page.locator('.score-main-render svg').first()).toBeVisible();
    await expect(page.locator('.score-error')).toHaveCount(0);
  }});
});
test('@panels harmony uses natural minor thirds without a harmonic minor option',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'harmony',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3도 위',exact:true}).click();await panel.getByRole('button',{name:/화성 쌓기 실행/}).click();},expect:async panel=>{
    await expect.poll(()=>getPitches(page,{measure:3})).toEqual(['E/3','G/3','G#/4','B/4','D/4']);
    expect(await getPitches(page,{measure:1})).toEqual(['A/3','C/4','C/4','E/4']);
  }});
});
test('@panels harmony keeps ties on added notes so playback joins them',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'harmony',before:()=>uploadFixture(page,'f06-lyrics-ties.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3도 위',exact:true}).click();await panel.getByRole('button',{name:/화성 쌓기 실행/}).click();},expect:async panel=>{
    await expect.poll(()=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('measure[number="1"] note'),n=>n.querySelector(':scope > chord')?`${n.querySelector('step').textContent}:${Array.from(n.querySelectorAll(':scope > tie'),t=>t.getAttribute('type')).join('')}:${Array.from(n.querySelectorAll(':scope > notations > tied'),t=>t.getAttribute('type')).join('')}:${n.querySelectorAll('lyric').length}`:null).filter(Boolean))).toEqual(['E:start:start:0','E:stop:stop:0']);
    const events=await page.evaluate(()=>window.PlaybackCore.extractPlaybackData(window.__mxlGetState().files[0].xmlDoc,{}).events.filter(e=>e.measure===1).map(e=>e.midiNote));
    expect(events.sort()).toEqual([60,64]);
  }});
});
