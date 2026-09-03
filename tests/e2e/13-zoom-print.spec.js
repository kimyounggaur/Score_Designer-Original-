import { test,expect } from '@playwright/test';
import { openPanel,openHeaderAction,openApp,uploadFixture } from './helpers.js';
test('@ux zooms without reloading XML and prints only the score',async({page})=>{
  await openApp(page);await uploadFixture(page);await expect(page.locator('.score-main-render svg').first()).toBeVisible();
  await page.getByRole('button',{name:'악보 확대',exact:true}).click();await page.getByRole('button',{name:'악보 확대',exact:true}).click();
  await expect(page.getByRole('button',{name:'악보 확대율 초기화'})).toHaveText('120%');
  await page.keyboard.press('Control+0');await expect(page.getByRole('button',{name:'악보 확대율 초기화'})).toHaveText('100%');
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.header')).toBeHidden();await expect(page.locator('.score-main-render svg').first()).toBeVisible();
});
