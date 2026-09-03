import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels instrument: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'instrument',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'실음 → 이조 악보',exact:true}).click();await panel.locator('select').selectOption('bb_clarinet');await panel.getByRole('button',{name:/이조 변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'D',octave:'4'});await expect.poll(()=>getDocQuery(page,'transpose chromatic')).toMatchObject({text:'-2'});}});
});
