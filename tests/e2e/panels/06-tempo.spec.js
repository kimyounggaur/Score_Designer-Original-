import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels tempo: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempo',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('.tempo-slider').fill('90');await panel.getByRole('button',{name:/템포 변경 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'sound[tempo]')).toMatchObject({attrs:{tempo:'90'}});await expect.poll(()=>getDocQuery(page,'per-minute')).toMatchObject({text:'90'});}});
});
