import { test,expect } from '@playwright/test';
import { openApp } from './helpers.js';
test('@ux toggles both sidebars and restores saved width',async({page})=>{
  await openApp(page);
  const root=page.locator('.app-root');
  await page.getByRole('button',{name:'도구 패널 토글'}).click();
  await expect(root).toHaveClass(/app-root--right-closed/);
  await page.getByRole('button',{name:'도구 패널 토글'}).click();
  await expect(root).not.toHaveClass(/app-root--right-closed/);
  await page.keyboard.press('Control+b');
  await expect(root).toHaveClass(/app-root--left-closed/);
  await page.keyboard.press('Control+b');
  const handle=page.getByRole('separator',{name:'인스펙터 너비'});
  await handle.press('ArrowRight');
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('mxlStudio.layout')).left)).toBe(310);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect.poll(()=>page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--inspector-w'))).toBe('310px');
});
