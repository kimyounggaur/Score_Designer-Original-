import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels clef: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'clef',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByText('F 음자리표',{exact:true}).click();await panel.getByRole('button',{name:/변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'clef sign')).toMatchObject({text:'F'});await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'C',octave:'3'});}});
});
