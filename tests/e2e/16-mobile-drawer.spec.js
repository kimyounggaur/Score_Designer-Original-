import { test,expect } from '@playwright/test';
import path from 'node:path';
import { openApp,fixturesDir,getPitchAt } from './helpers.js';
test('@ux uploads and transposes through the mobile drawer at 390px',async({page})=>{
  await page.setViewportSize({width:390,height:844});await openApp(page);
  await page.getByRole('button',{name:'도구',exact:true}).click();
  await page.getByRole('dialog',{name:'악보 도구'}).getByRole('button',{name:'파일 업로드',exact:true}).click();
  await page.locator('.upload-zone__input').setInputFiles(path.join(fixturesDir,'f01-basic.musicxml'));
  await expect(page.locator('.file-entry__name')).toBeVisible();
  await page.getByRole('button',{name:'← 목록',exact:true}).click();
  await page.getByRole('dialog',{name:'악보 도구'}).getByRole('button',{name:'조옮김',exact:true}).click();
  await page.getByRole('button',{name:'반음 단위 이동',exact:true}).click();
  await page.locator('.inspector .panel--visible input[type="number"]').fill('2');
  await page.getByRole('button',{name:/변환 실행/}).click();
  await expect.poll(()=>getPitchAt(page)).toEqual({step:'D',alter:'0',octave:'4'});
  await page.getByRole('button',{name:'도구 닫기'}).click();
  await expect(page.getByRole('dialog',{name:'인스펙터 도구'})).toHaveCount(0);
  await page.setViewportSize({width:1280,height:800});await expect(page.locator('.mobile-tools')).toBeHidden();
});
