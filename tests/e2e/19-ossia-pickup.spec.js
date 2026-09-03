import {test,expect} from '@playwright/test';
import {openApp,uploadFixture} from './helpers.js';
test('@panels ossia range uses printed numbers and excludes pickup zero',async({page})=>{
  await openApp(page);await uploadFixture(page,'f03-pickup.musicxml');
  await page.getByTitle('Ossia 마디',{exact:true}).click();
  const panel=page.locator('.panel--visible').filter({has:page.getByRole('heading',{name:'Ossia 마디 추가'})});
  await expect(panel.locator('.measure-input').first()).toHaveAttribute('min','0');
  await panel.locator('.measure-input').nth(0).fill('1');await panel.locator('.measure-input').nth(1).fill('2');
  await panel.getByRole('button',{name:'▶ Ossia 추가',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>{
    const text=window.__mxlGetState().files[0]?.ossiaMxml;
    return text?Array.from(new DOMParser().parseFromString(text,'text/xml').querySelectorAll('measure'),el=>el.getAttribute('number')):[];
  })).toEqual(['1','2']);
});
