import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels ossia: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'ossia',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('.measure-input').nth(1).fill('2');await panel.getByRole('button',{name:'▶ Ossia 추가',exact:true}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().files[0].ossiaMeta)).toMatchObject({startMeasure:1,endMeasure:2});await expect(page.locator('.ossia-inline svg')).toBeVisible();}});
});
const ossiaAttributes=page=>page.evaluate(()=>{const doc=new DOMParser().parseFromString(window.__mxlGetState().files[0].ossiaMxml,'text/xml');const a=doc.querySelector('measure attributes');return {measures:Array.from(doc.querySelectorAll('measure'),m=>m.getAttribute('number')),divisions:a?.querySelector('divisions')?.textContent,fifths:a?.querySelector('key fifths')?.textContent,clef:a?.querySelector('clef sign')?.textContent,order:Array.from(a?.children||[],c=>c.localName).join(',')};});
const ossiaPitches=page=>page.evaluate(()=>{const doc=new DOMParser().parseFromString(window.__mxlGetState().files[0].ossiaMxml,'text/xml');const signs={'-2':'bb','-1':'b','0':'','1':'#','2':'##'};return Array.from(doc.querySelectorAll('note pitch'),p=>`${p.querySelector('step').textContent}${signs[String(Number(p.querySelector('alter')?.textContent||0))]}/${p.querySelector('octave').textContent}`);});
test('@panels ossia starts with the key, clef and divisions in effect at its first measure',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'ossia',before:()=>uploadFixture(page,'f10-keychange-clef.musicxml'),action:async panel=>{await panel.locator('.measure-input').nth(0).fill('4');await panel.locator('.measure-input').nth(1).fill('4');await panel.getByRole('button',{name:'▶ Ossia 추가',exact:true}).click();},expect:async panel=>{
    await expect.poll(()=>ossiaAttributes(page)).toEqual({measures:['4'],divisions:'1',fifths:'3',clef:'F',order:'divisions,key,time,clef'});
    await expect(page.locator('.ossia-inline svg')).toBeVisible();
  }});
});
test('@panels ossia transposes with key spelling and moves its key signature',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'ossia',before:()=>uploadFixture(page,'f07-enharmonic.musicxml'),action:async panel=>{await panel.locator('.measure-input').nth(1).fill('2');await panel.locator('input.form-input--mono').nth(0).fill('1');await panel.locator('input.form-input--mono').nth(1).fill('-1');await panel.getByRole('button',{name:'▶ Ossia 추가',exact:true}).click();},expect:async panel=>{
    await expect.poll(()=>ossiaPitches(page)).toEqual(['G/3','A/3','B/3','C/4','D/4','E/4','F#/4','C#/5']);
    expect((await ossiaAttributes(page)).fifths).toBe('1');
  }});
});
