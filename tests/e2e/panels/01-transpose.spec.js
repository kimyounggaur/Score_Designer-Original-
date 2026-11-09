import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt,getPitches} from '../helpers.js';
test('@panels transpose: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'transpose',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'Bm',exact:true}).click();await panel.getByRole('button',{name:/변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'key fifths')).toMatchObject({text:'2'});await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'B'});}});
});
for(const [direction,expected] of [[null,'B/3'],['위로','B/4'],['아래로','B/3']]){
  test(`@panels transpose to a specific key moves ${direction||'by the nearest step'}`,async({page})=>{
    test.setTimeout(30000);await openApp(page);
    await runPanel(page,{id:'transpose',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{
      await panel.getByRole('button',{name:'B',exact:true}).click();
      if(direction)await panel.getByRole('button',{name:direction,exact:true}).click();
      await panel.getByRole('button',{name:/변환 실행/}).click();
    },expect:async panel=>{
      await expect.poll(async()=>(await getPitches(page))[0]).toBe(expected);
      expect((await getDocQuery(page,'key fifths')).text).toBe('5');
    }});
  });
}
