import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels export: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'export',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:/미리보기/}).click();},expect:async panel=>{const download=page.waitForEvent('download');await panel.getByRole('button',{name:'📷 PNG 저장',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.png$/);}});
});
