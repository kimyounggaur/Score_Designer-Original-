import { test,expect } from '@playwright/test';
import path from 'node:path';
import { openApp,fixturesDir } from './helpers.js';
test('@ux switches file tabs using click and arrow keys and closes a file',async({page})=>{
  await openApp(page);
  await page.locator('.upload-zone__input').setInputFiles(['f01-basic.musicxml','f02-two-parts.musicxml'].map(n=>path.join(fixturesDir,n)));
  await expect(page.getByRole('tab')).toHaveCount(2);
  await page.getByRole('tab').nth(1).click();
  await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().activeFile)).toBe(1);
  await expect(page.locator('.score-main-render svg').first()).toContainText('Violin');
  await page.getByRole('tab').nth(1).press('ArrowLeft');
  await expect(page.getByRole('tab').first()).toHaveAttribute('aria-selected','true');
  await page.getByRole('tab').first().press('ArrowRight');
  await page.locator('.file-tabs').getByRole('button',{name:'파일 닫기: f02-two-parts.musicxml'}).click();
  await expect(page.locator('.file-tabs')).toHaveCount(0);
  await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().activeFile)).toBe(0);
});
