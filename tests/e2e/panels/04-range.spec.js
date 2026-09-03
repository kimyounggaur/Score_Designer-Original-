import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels range: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'range',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('select').selectOption('kalimba');await panel.getByRole('button',{name:/음역대 조정 실행/}).click();},expect:async panel=>{await expect(panel.locator('.result-log')).toContainText('완료');expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('note pitch'),p=>12*(Number(p.querySelector('octave').textContent)+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[p.querySelector('step').textContent]+Number(p.querySelector('alter')?.textContent||0)).every(n=>n>=60&&n<=88))).toBe(true);}});
});
