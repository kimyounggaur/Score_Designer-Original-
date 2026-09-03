import { test, expect } from '@playwright/test';
import { openApp, uploadFixture, getDocQuery } from './helpers.js';
test('@panels transposes notes and minor chord symbols together',async({page})=>{
  await openApp(page);await uploadFixture(page,'f04-minor-harmony.musicxml');
  await page.getByTitle('조옮김',{exact:true}).click();
  await page.getByText('반음 단위 이동',{exact:true}).click();
  await page.locator('.panel--visible input[type="number"]').fill('2');
  await page.getByRole('button',{name:/변환 실행/}).click();
  await expect.poll(async()=>(await getDocQuery(page,'harmony root-step'))?.text).toBe('B');
});
