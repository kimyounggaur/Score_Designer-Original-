import {test,expect} from '@playwright/test';
import {openApp,uploadFixture} from './helpers.js';
test('@perf saves identical content only once and loads audio on demand',async({page})=>{
  await openApp(page);expect(await page.evaluate(()=>typeof window.Tone)).toBe('undefined');
  await uploadFixture(page);await page.waitForFunction(()=>window.__mxlGetState().sessionStatus.savedAt);
  const saved=await page.evaluate(()=>window.__mxlGetState().sessionStatus.savedAt);
  // Applying +0 creates a new file object, but serializes to the same score.
  await page.getByTitle('조옮김',{exact:true}).click();await page.getByRole('button',{name:'반음 단위 이동',exact:true}).click();
  await page.locator('.inspector .panel--visible input[type="number"]').fill('0');await page.getByRole('button',{name:/변환 실행/}).click();
  await expect(page.getByText('기록: 조옮김')).toBeVisible();
  await page.waitForTimeout(5500);expect(await page.evaluate(()=>window.__mxlGetState().sessionStatus.savedAt)).toBe(saved);
  await page.getByTitle('재생',{exact:true}).click();await expect.poll(()=>page.evaluate(()=>window.Tone?.Transport.state)).toBe('started');
  await page.getByTitle('정지',{exact:true}).click();
});
test('@perf audio load failure leaves editing available and announces the error',async({page})=>{
  await page.route('**/tone/14.8.49/Tone.js',route=>route.abort());await openApp(page);await uploadFixture(page);
  await page.getByTitle('재생',{exact:true}).click();await expect(page.getByTitle('재생',{exact:true})).toBeDisabled();
  await expect(page.locator('.toast--err')).toContainText('재생 라이브러리');await expect(page.locator('.score-main-render svg')).toBeVisible();
});
