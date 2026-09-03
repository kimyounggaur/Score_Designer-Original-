import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels stats: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'stats',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'▶ 기본 분석',exact:true}).click();},expect:async panel=>{await expect(panel.locator('.stat-tile').filter({hasText:'총 음표'}).locator('.stat-tile__value')).toHaveText('8');}});
});
