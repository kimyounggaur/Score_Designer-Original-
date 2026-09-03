import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels roman: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'roman',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'a단조 분석 시작',exact:true}).click();},expect:async panel=>{await expect(panel.locator('.roman-table__numeral')).toHaveText(['i','iv','V7','i']);}});
});
