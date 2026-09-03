import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels upload: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'upload',before:()=>uploadFixture(page,'f09-real.mxl'),action:async panel=>{},expect:async panel=>{await expect(page.locator('.score-main-render svg').first()).toBeVisible();expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('note').length)).toBeGreaterThan(100);}});
});
