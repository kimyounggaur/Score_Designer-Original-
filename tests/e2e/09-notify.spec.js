import { test,expect } from '@playwright/test';
import { openPanel,openHeaderAction,openApp } from './helpers.js';
test('@ux warns without blocking and dismisses the toast',async({page})=>{
  await openApp(page);await openPanel(page,'transpose');
  await page.getByRole('button',{name:/변환 실행/}).click();
  await expect(page.locator('.toast--warn')).toContainText('먼저 파일을 업로드');
  await expect(page.locator('.toast-stack')).toHaveAttribute('aria-live','polite');
  await expect(page.locator('.toast--warn')).toHaveCount(0,{timeout:5000});
});
