import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels notation: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'notation',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('switch',{name:'코드 심볼 숨기기'}).click();await panel.getByRole('button',{name:/표기 변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony').length)).toBe(0);}});
});
