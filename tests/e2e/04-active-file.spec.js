import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, fixturesDir } from './helpers.js';
for(const [active,remove,expected,name] of [[1,0,0,'f02'],[1,1,1,'f03'],[0,2,0,'f01']]){
  test(`@panels removes index ${remove} while index ${active} is active`,async({page})=>{
    await openApp(page);
    await page.locator('.upload-zone__input').setInputFiles(['f01-basic.musicxml','f02-two-parts.musicxml','f03-pickup.musicxml'].map(n=>path.join(fixturesDir,n)));
    await expect(page.locator('.file-entry')).toHaveCount(3);
    await page.evaluate(i=>window.__mxlSetActiveFile(i),active);
    await page.locator('.file-entry__remove').nth(remove).click();
    await expect.poll(()=>page.evaluate(()=>{const s=window.__mxlGetState();return {index:s.activeFile,name:s.files[s.activeFile].name.slice(0,3)};})).toEqual({index:expected,name});
  });
}
test('@panels removing the last file resets active index to zero',async({page})=>{
  await openApp(page);await page.locator('.upload-zone__input').setInputFiles(path.join(fixturesDir,'f01-basic.musicxml'));
  await page.locator('.file-entry__remove').click();
  await expect.poll(()=>page.evaluate(()=>{const s=window.__mxlGetState();return [s.files.length,s.activeFile]})).toEqual([0,0]);
});
test('@panels part list follows the active file',async({page})=>{
  await openApp(page);await page.locator('.upload-zone__input').setInputFiles(['f01-basic.musicxml','f02-two-parts.musicxml'].map(n=>path.join(fixturesDir,n)));
  await expect(page.locator('.file-entry')).toHaveCount(2);
  await page.evaluate(()=>window.__mxlSetActiveFile(1));
  await page.getByTitle('파트 추출',{exact:true}).click();
  await expect(page.locator('.panel--visible').getByText('Violin',{exact:true})).toBeVisible();
  await expect(page.locator('.panel--visible').getByText('Piano',{exact:true})).toBeVisible();
});
