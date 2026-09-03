import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels keychange: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'keychange',before:()=>uploadFixture(page,'f02-two-parts.musicxml'),action:async panel=>{await panel.locator('input[type=number]').fill('3');await panel.locator('select').selectOption('7');await panel.getByRole('button',{name:/조바꿈 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'measure[number="3"] key fifths')).toMatchObject({text:'1'});await expect.poll(()=>getPitchAt(page,{measure:3})).toMatchObject({step:'G',octave:'4'});}});
});
