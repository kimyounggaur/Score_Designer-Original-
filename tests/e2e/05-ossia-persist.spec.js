import { test, expect } from '@playwright/test';
import { openApp, uploadFixture } from './helpers.js';
test('@panels restores ossia XML and SVG after reload',async({page})=>{
  await openApp(page);await uploadFixture(page);
  await page.getByTitle('Ossia 마디',{exact:true}).click();
  await page.getByRole('button',{name:/Ossia.*추가/}).click();
  await expect(page.locator('.ossia-inline svg').first()).toBeVisible();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('mxlStudio.idbFallback.sessions.autosave')||'{}')?.files?.[0]?.ossiaMxml,null,{timeout:8000});
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'복원하기'}).click();
  await expect(page.locator('.ossia-inline svg').first()).toBeVisible();
  expect(await page.evaluate(()=>window.__mxlGetState().files[0].ossiaMeta.startMeasure)).toBe(1);
});
