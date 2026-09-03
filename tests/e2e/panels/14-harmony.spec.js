import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels harmony: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'harmony',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'3도 위',exact:true}).click();await panel.getByRole('button',{name:/화성 쌓기 실행/}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('measure[number="1"] note').length)).toBe(8);}});
});
