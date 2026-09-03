import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels parts: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'parts',before:()=>uploadFixture(page,'f02-two-parts.musicxml'),action:async panel=>{await panel.getByRole('switch',{name:'Piano 파트 유지'}).click();await panel.getByRole('button',{name:/추출 실행/}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>{const d=window.__mxlGetState().files[0].xmlDoc;return [d.querySelectorAll('part').length,d.querySelectorAll('part-list score-part').length,d.querySelector('part-name').textContent];})).toEqual([1,1,'Violin']);}});
});
