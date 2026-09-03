import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,getDocQuery} from './helpers.js';
test('@perf mounts only visited panels and restores original lyrics',async({page})=>{
  await openApp(page);expect(await page.locator('.panel').count()).toBeLessThanOrEqual(3);
  await uploadFixture(page,'f06-lyrics-ties.musicxml');await page.getByTitle('조옮김',{exact:true}).click();
  expect(await page.locator('.panel').count()).toBeLessThanOrEqual(4);
  await page.getByTitle('숫자 악보',{exact:true}).click();
  await page.getByRole('button',{name:'한국어 계이름',exact:true}).click();
  await page.getByRole('button',{name:'▶ 숫자 악보 생성',exact:true}).click();
  await expect.poll(()=>getDocQuery(page,'note lyric text')).toMatchObject({text:'도'});
  await page.getByTitle('로마 숫자 분석',{exact:true}).click();await page.getByTitle('숫자 악보',{exact:true}).click();
  await page.getByRole('button',{name:'기존 가사 복원',exact:true}).click();
  await page.getByRole('button',{name:'▶ 숫자 악보 생성',exact:true}).click();
  await expect.poll(()=>getDocQuery(page,'note lyric text')).toMatchObject({text:'아'});
});
