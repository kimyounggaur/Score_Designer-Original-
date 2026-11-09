import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels chordtools: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'chordtools',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByPlaceholder('원본 (예: Am)').fill('Am');await panel.getByPlaceholder('변경 (예: Am7)').fill('Cm');await panel.getByRole('button',{name:/코드 일괄 변경/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'C'});await expect.poll(()=>getDocQuery(page,'harmony kind')).toMatchObject({text:'minor'});}});
});
const harmonies=page=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony'),h=>window.ChordSymbolCore.toString(h)));
test('@panels chordtools spells inversion basses from the chord root',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'chordtools',before:()=>uploadFixture(page,'f11-chords-inversion.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'1st inversion',exact:true}).click();await panel.getByRole('button',{name:/자리바꿈 적용/}).click();},expect:async panel=>{
    await expect.poll(()=>harmonies(page)).toEqual(['E/G#','B7/D#','A♭m/C♭','C/E']);
    expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelector('harmony').children,c=>c.localName))).toEqual(['root','kind','inversion','bass']);
  }});
});
test('@panels chordtools skips chords without the requested inversion',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'chordtools',before:()=>uploadFixture(page,'f11-chords-inversion.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3rd inversion',exact:true}).click();await panel.getByRole('button',{name:/자리바꿈 적용/}).click();},expect:async panel=>{
    await expect.poll(()=>harmonies(page)).toEqual(['E','B7/A','A♭m','C/E']);
    await expect(panel.locator('.result-log')).toContainText('1개 적용, 3개 생략');
  }});
});
