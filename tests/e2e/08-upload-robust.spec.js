import { test,expect } from '@playwright/test';
import path from 'node:path';
import { openApp,uploadFixture,fixturesDir } from './helpers.js';
test('@robustness gives duplicate upload names a suffix',async({page})=>{
  await openApp(page);await uploadFixture(page);
  await page.locator('.upload-zone__input').setInputFiles(path.join(fixturesDir,'f01-basic.musicxml'));
  await expect(page.locator('.file-entry__name').nth(1)).toHaveText('f01-basic (2).musicxml');
});
test('@robustness rejects unsupported file types',async({page})=>{
  await openApp(page);await page.locator('.upload-zone__input').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('hello')});
  await expect(page.locator('.inspector .panel--visible')).toContainText('지원하지 않는 파일 형식');
  await expect(page.locator('.file-entry')).toHaveCount(0);
});
test('@robustness rejects a file larger than 20MB',async({page})=>{
  await openApp(page);await page.locator('.upload-zone__input').setInputFiles({name:'large.xml',mimeType:'text/xml',buffer:Buffer.alloc(21*1024*1024)});
  await expect(page.locator('.inspector .panel--visible')).toContainText('20MB를 넘는 파일은 열 수 없습니다');
  await expect(page.locator('.file-entry')).toHaveCount(0);
});
