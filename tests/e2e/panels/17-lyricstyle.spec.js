import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels lyricstyle: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'lyricstyle',before:()=>uploadFixture(page,'f06-lyrics-ties.musicxml'),action:async panel=>{await panel.locator('input[type=number]').fill('14');await panel.getByRole('button',{name:'Bold',exact:true}).click();await panel.getByRole('button',{name:/가사 스타일 적용/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'note lyric text')).toMatchObject({attrs:{'font-size':'14','font-weight':'bold'}});}});
});
