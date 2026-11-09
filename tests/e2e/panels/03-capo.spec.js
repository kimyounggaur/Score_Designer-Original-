import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt,getPitches} from '../helpers.js';
const harmonies=page=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony'),h=>window.ChordSymbolCore.toString(h)));
const words=page=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('direction words'),w=>w.textContent));
test('@panels capo: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'capo',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.locator('input[type=number]').fill('1');await panel.locator('select').selectOption('2');await panel.getByRole('button',{name:/카포 적용 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'G'});await expect.poll(()=>getDocQuery(page,'direction words')).toMatchObject({text:'Capo 2 Fret'});}});
});
test('@panels capo applies each segment against the original pitch without accumulating frets',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'capo',before:()=>uploadFixture(page,'f02-two-parts.musicxml'),action:async panel=>{
    await panel.getByRole('button',{name:'+ 카포 지점 추가'}).click();
    await panel.getByLabel('카포 1 시작 마디').fill('1');await panel.getByLabel('카포 1 프렛').selectOption('2');
    await panel.getByLabel('카포 2 시작 마디').fill('3');await panel.getByLabel('카포 2 프렛').selectOption('4');
    await panel.getByRole('button',{name:/카포 적용 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>getPitches(page,{measure:1})).toEqual(['Bb/3','C/4','D/4','F/4','Bb/4','C/5','D/5','F/5']);
    expect(await getPitches(page,{measure:3})).toEqual(['Ab/3','Bb/3','C/4','Eb/4','Ab/4','Bb/4','C/5','Eb/5']);
    expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('part > measure'),m=>m.querySelector('key fifths')?`${m.parentNode.getAttribute('id')}m${m.getAttribute('number')}:${m.querySelector('key fifths').textContent}`:null).filter(Boolean))).toEqual(['P1m1:-2','P1m3:-4','P2m1:-2','P2m3:-4']);
    expect(await words(page)).toEqual(['Capo 2 Fret','Capo 4 Fret']);
  }});
});
test('@panels capo moves chord roots and slash basses with flat key spelling',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'capo',before:()=>uploadFixture(page,'f11-chords-inversion.musicxml'),action:async panel=>{
    await panel.getByRole('button',{name:/카포 적용 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>harmonies(page)).toEqual(['D','A7','G♭m','B♭/D']);
    expect(await getPitches(page)).toEqual(['D/4','A/3','Gb/3','Bb/3']);
    expect((await getDocQuery(page,'key fifths')).text).toBe('-2');
  }});
});
test('@panels capo re-run replaces the capo label instead of duplicating it',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'capo',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{
    await panel.getByRole('button',{name:/카포 적용 실행/}).click();
    await expect.poll(()=>words(page)).toEqual(['Capo 2 Fret']);
    await panel.getByLabel('카포 1 프렛').selectOption('3');
    await panel.getByRole('button',{name:/카포 적용 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>words(page)).toEqual(['Capo 3 Fret']);
  }});
});
