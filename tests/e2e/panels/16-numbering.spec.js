import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels numbering: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'numbering',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'한국어 계이름',exact:true}).click();await panel.getByRole('button',{name:/숫자 악보 생성/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'note lyric text')).toMatchObject({text:'도'});}});
});
