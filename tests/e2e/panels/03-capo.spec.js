import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels capo: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'capo',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.locator('input[type=number]').fill('1');await panel.locator('select').selectOption('2');await panel.getByRole('button',{name:/카포 적용 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'G'});await expect.poll(()=>getDocQuery(page,'direction words')).toMatchObject({text:'Capo 2 Fret'});}});
});
