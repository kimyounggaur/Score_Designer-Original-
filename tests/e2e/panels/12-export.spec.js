import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt,fixturesDir} from '../helpers.js';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
test('@panels export: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'export',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:/미리보기/}).click();},expect:async panel=>{const download=page.waitForEvent('download');await panel.getByRole('button',{name:'📷 PNG 저장',exact:true}).click();expect((await download).suggestedFilename()).toMatch(/\.png$/);}});
});

const zipEntries=async(page,download)=>{
  const base64=(await readFile(await download.path())).toString('base64');
  return page.evaluate(async text=>{const zip=await window.JSZip.loadAsync(text,{base64:true});return Object.keys(zip.files).filter(name=>!zip.files[name].dir).sort();},base64);
};
const pngSize=async download=>{const buffer=await readFile(await download.path());return {width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)};};
async function uploadSameStemPair(page){
  await uploadFixture(page,'f01-basic.musicxml');
  const buffer=await readFile(path.join(fixturesDir,'f01-basic.musicxml'));
  await page.locator('input[type="file"]').setInputFiles({name:'f01-basic.xml',mimeType:'application/xml',buffer});
  await page.waitForFunction(()=>window.__mxlGetState?.().files.length===2);
}

test('@panels export clears a stale preview when the selected file changes (B05)',async({page})=>{
  test.setTimeout(45000);await openApp(page);
  await page.locator('input[type="file"]').setInputFiles([path.join(fixturesDir,'f01-basic.musicxml'),path.join(fixturesDir,'f02-two-parts.musicxml')]);
  await page.waitForFunction(()=>window.__mxlGetState?.().files.length===2);
  await page.evaluate(()=>window.__mxlSetActiveFile(0));
  const panel=await openPanel(page,'export');
  await panel.getByRole('button',{name:/미리보기/}).click();
  await expect(panel.getByRole('button',{name:'🖼️ SVG 저장',exact:true})).toBeVisible();
  await panel.locator('select.form-select').first().selectOption('1');
  await expect(panel.getByRole('button',{name:'🖼️ SVG 저장',exact:true})).toHaveCount(0);
  await expect(panel.locator('.result-log')).toContainText('미리보기를 지웠습니다');
  await panel.getByRole('button',{name:/미리보기/}).click();
  const downloadEvent=page.waitForEvent('download');
  await panel.getByRole('button',{name:'🖼️ SVG 저장',exact:true}).click();
  const download=await downloadEvent;
  expect(download.suggestedFilename()).toBe('f02-two-parts.svg');
  expect((await readFile(await download.path())).toString('utf8')).toContain('Violin');
});

test('@panels export ZIP keeps files whose names differ only by extension (B06)',async({page})=>{
  test.setTimeout(60000);await openApp(page);await uploadSameStemPair(page);
  const panel=await openPanel(page,'export');
  await panel.getByRole('button',{name:/미리보기/}).click();
  const downloadEvent=page.waitForEvent('download');
  await panel.getByRole('button',{name:'📦 전체 파일 PNG (ZIP)',exact:true}).click();
  const download=await downloadEvent;
  expect(await zipEntries(page,download)).toEqual(['f01-basic (2).png','f01-basic.png']);
  await expect(panel.locator('.result-log')).toContainText('2개 PNG');
});

test('@panels export puts the Ossia above the score in PNG and warns on MXL (C13)',async({page})=>{
  test.setTimeout(60000);await openApp(page);await uploadFixture(page,'f01-basic.musicxml');
  let panel=await openPanel(page,'export');
  await panel.getByRole('button',{name:/미리보기/}).click();
  let downloadEvent=page.waitForEvent('download');
  await panel.getByRole('button',{name:'📷 PNG 저장',exact:true}).click();
  const plain=await pngSize(await downloadEvent);
  const ossia=await openPanel(page,'ossia');
  await ossia.locator('.measure-input').nth(1).fill('2');
  await ossia.getByRole('button',{name:'▶ Ossia 추가',exact:true}).click();
  await expect(page.locator('.ossia-inline svg')).toBeVisible();
  panel=await openPanel(page,'export');
  await panel.getByRole('button',{name:/미리보기/}).click();
  await expect(panel.locator('.export-preview__ossia svg')).toBeVisible();
  downloadEvent=page.waitForEvent('download');
  await panel.getByRole('button',{name:'📷 PNG 저장',exact:true}).click();
  const withOssia=await pngSize(await downloadEvent);
  expect(withOssia.height).toBeGreaterThan(plain.height);
  await expect(panel.locator('.result-log')).toContainText('Ossia 포함');
  downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'MXL',exact:true}).first().click();
  await downloadEvent;
  await expect(page.locator('.toast-stack')).toContainText('MusicXML에 포함되지 않습니다');
});
