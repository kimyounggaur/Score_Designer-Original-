import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels color: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'color',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:/색깔 악보 생성/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'note')).toMatchObject({attrs:{color:expect.stringMatching(/^#[0-9a-f]{6}$/i)}});}});
});

test('@panels color keeps notehead fill to the note value (C14)',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'color',before:()=>uploadFixture(page,'f06-lyrics-ties.musicxml'),action:async panel=>{await panel.getByRole('button',{name:/색깔 악보 생성/}).click();},expect:async panel=>{
    await expect.poll(()=>getDocQuery(page,'note')).toMatchObject({attrs:{color:expect.stringMatching(/^#/)}});
    expect(await page.evaluate(()=>{const d=window.__mxlGetState().files[0].xmlDoc;return [d.querySelectorAll('notehead[filled]').length,d.querySelectorAll('notehead[color]').length,d.querySelectorAll('note pitch').length];})).toEqual([0,7,7]);
  }});
});
