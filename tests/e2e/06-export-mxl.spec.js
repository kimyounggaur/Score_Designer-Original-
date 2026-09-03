import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openApp, uploadFixture } from './helpers.js';
test('@panels exports a real MXL zip which can be uploaded again',async({page})=>{
  await openApp(page);await uploadFixture(page);
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'MXL',exact:true}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.mxl$/);
  const filePath=await download.path();
  const base64=(await readFile(filePath)).toString('base64');
  const content=await page.evaluate(async text=>{
    const zip=await window.JSZip.loadAsync(text,{base64:true});
    return {container:await zip.file('META-INF/container.xml').async('string'),xml:await zip.file('score.xml').async('string')};
  },base64);
  expect(content.container).toContain('full-path="score.xml"');
  expect(content.xml).toContain('<step>C</step>');
  await page.locator('.upload-zone__input').setInputFiles({name:download.suggestedFilename(),mimeType:'application/vnd.recordare.musicxml',buffer:await readFile(filePath)});
  await expect(page.locator('.file-entry')).toHaveCount(2);
  await page.evaluate(()=>window.__mxlSetActiveFile(1));
  await expect(page.locator('.score-main-render svg').first()).toBeVisible();
});
