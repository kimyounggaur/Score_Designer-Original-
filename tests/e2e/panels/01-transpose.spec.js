import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels transpose: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'transpose',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'Bm',exact:true}).click();await panel.getByRole('button',{name:/변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'key fifths')).toMatchObject({text:'2'});await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'B'});}});
});
