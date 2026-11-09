import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt,getPitches} from '../helpers.js';
const harmonies=page=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony'),h=>window.ChordSymbolCore.toString(h)));
test('@panels keychange: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  // C→G는 가까운 쪽(-5반음)이 기본입니다. 이전 기대값 G4는 항상 상행하던 버그를 전제로 했습니다.
  await runPanel(page,{id:'keychange',before:()=>uploadFixture(page,'f02-two-parts.musicxml'),action:async panel=>{await panel.locator('input[type=number]').fill('3');await panel.locator('select').selectOption('7');await panel.getByRole('button',{name:/조바꿈 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'measure[number="3"] key fifths')).toMatchObject({text:'1'});await expect.poll(()=>getPitchAt(page,{measure:3})).toMatchObject({step:'G',octave:'3'});expect(await getPitches(page,{part:'P1',measure:2})).toEqual(['C/4','D/4','E/4','G/4']);}});
});
test('@panels keychange moves F sharp major to E major by the nearest step with key spelling',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'keychange',before:()=>uploadFixture(page,'f07-enharmonic.musicxml'),action:async panel=>{await panel.locator('select').selectOption('4');await panel.getByRole('button',{name:/조바꿈 실행/}).click();},expect:async panel=>{
    await expect.poll(()=>getPitches(page)).toEqual(['E/4','F#/4','G#/4','A/4','B/4','C#/5','D#/5','A#/5']);
    expect((await getDocQuery(page,'key fifths')).text).toBe('4');
    expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('accidental'),a=>a.textContent).filter(t=>t.includes('flat')))).toEqual([]);
    await expect(panel.locator('.result-log')).toContainText('-2반음');
  }});
});
test('@panels keychange honours the upward direction',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'keychange',before:()=>uploadFixture(page,'f07-enharmonic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'위로',exact:true}).click();await panel.locator('select').selectOption('4');await panel.getByRole('button',{name:/조바꿈 실행/}).click();},expect:async panel=>{
    await expect.poll(async()=>(await getPitches(page))[0]).toBe('E/5');
  }});
});
test('@panels keychange keeps minor mode and moves chord symbols',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'keychange',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{
    await expect(panel.locator('select option').nth(5)).toHaveText('Dm minor');
    await panel.locator('select').selectOption('5');await panel.getByRole('button',{name:/조바꿈 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>harmonies(page)).toEqual(['Dm','Gm','A7','Dm']);
    expect((await getDocQuery(page,'key fifths')).text).toBe('-1');
    expect((await getDocQuery(page,'key mode')).text).toBe('minor');
    expect((await getPitches(page,{measure:3}))).toEqual(['A/3','C#/5','E/5','G/4']);
  }});
});
