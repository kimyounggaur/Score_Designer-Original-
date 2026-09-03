import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels ossia: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'ossia',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('.measure-input').nth(1).fill('2');await panel.getByRole('button',{name:'▶ Ossia 추가',exact:true}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().files[0].ossiaMeta)).toMatchObject({startMeasure:1,endMeasure:2});await expect(page.locator('.ossia-inline svg')).toBeVisible();}});
});
