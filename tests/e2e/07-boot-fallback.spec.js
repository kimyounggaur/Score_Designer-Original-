import { test,expect } from '@playwright/test';
import { openApp } from './helpers.js';
test('@robustness explains a missing OSMD library in Korean',async({page})=>{
  await page.route('**/opensheetmusicdisplay*',route=>route.abort());
  await page.goto('mxl-studio.html',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#boot-status')).toContainText('불러오지 못했습니다');
});
test('@robustness replaces the splash after a normal boot',async({page})=>{
  await openApp(page);await expect(page.locator('#boot')).toHaveCount(0);
});
test('@robustness isolates and recovers a panel render error',async({page})=>{
  await openApp(page);await page.evaluate(()=>window.__mxlThrowInPanel='transpose');
  await page.getByTitle('조옮김',{exact:true}).click();
  await expect(page.locator('.panel--visible').getByRole('button',{name:'다시 시도'})).toBeVisible();
  await expect(page.locator('.header')).toBeVisible();
  await page.evaluate(()=>delete window.__mxlThrowInPanel);
  await page.locator('.panel--visible').getByRole('button',{name:'다시 시도'}).click();
  await expect(page.getByRole('heading',{name:'조옮김 (Transpose)'})).toBeVisible();
});
