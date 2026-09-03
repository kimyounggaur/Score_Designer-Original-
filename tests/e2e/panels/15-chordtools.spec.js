import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels chordtools: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'chordtools',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByPlaceholder('원본 (예: Am)').fill('Am');await panel.getByPlaceholder('변경 (예: Am7)').fill('Cm');await panel.getByRole('button',{name:/코드 일괄 변경/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'C'});await expect.poll(()=>getDocQuery(page,'harmony kind')).toMatchObject({text:'minor'});}});
});
