import { test,expect } from '@playwright/test';
import { openPanel,openHeaderAction,openApp,uploadFixture } from './helpers.js';
test('@ux zooms without reloading XML and does not print the viewer',async({page})=>{
  await openApp(page);await uploadFixture(page);await expect(page.locator('.score-main-render svg').first()).toBeVisible();
  await page.getByRole('button',{name:'악보 확대',exact:true}).click();await page.getByRole('button',{name:'악보 확대',exact:true}).click();
  await expect(page.getByRole('button',{name:'악보 확대율 초기화'})).toHaveText('120%');
  await page.keyboard.press('Control+0');await expect(page.getByRole('button',{name:'악보 확대율 초기화'})).toHaveText('100%');
  // 뷰어 화면은 인쇄 대상이 아닙니다(PDF는 내보내기의 인쇄 영역을 씁니다). Ctrl+P를 직접 누르면 화면 대신 안내 한 줄만 인쇄됩니다.
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.header')).toBeHidden();await expect(page.locator('#root')).toBeHidden();
  await expect(page.locator('.print-hint')).toBeVisible();await expect(page.locator('.print-hint')).toContainText('인쇄 / PDF로 저장');
  await page.emulateMedia({media:'screen'});
  await expect(page.locator('.print-hint')).toBeHidden();await expect(page.locator('.score-main-render svg').first()).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('beforeprint')));
  await expect(page.locator('.toast-stack')).toContainText('인쇄는 내보내기의 PDF 버튼을 사용하세요.');
});
