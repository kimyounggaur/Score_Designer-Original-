import { test,expect } from '@playwright/test';
import { openApp } from './helpers.js';
test('@a11y navigates transformation menus with arrow keys',async({page})=>{
  await openApp(page);
  await page.getByRole('button',{name:'변환',exact:true}).focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem',{name:'조옮김 (Transpose)'})).toBeFocused();
  await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect(page.locator('.inspector .panel--visible').getByRole('heading',{name:/카포/})).toBeVisible();
  await page.getByRole('button',{name:'변환',exact:true}).click();await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);await expect(page.getByRole('button',{name:'변환',exact:true})).toBeFocused();
  await page.emulateMedia({reducedMotion:'reduce'});
  expect(await page.locator('.panel--visible').first().evaluate(el=>getComputedStyle(el).animationDuration)).toBe('0s');
});
