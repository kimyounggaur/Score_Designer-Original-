import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, openPanel, fixturesDir } from './helpers.js';

async function uploadTwo(page) {
  await page.locator('input[type="file"]').setInputFiles([path.join(fixturesDir, 'f01-basic.musicxml'), path.join(fixturesDir, 'f02-two-parts.musicxml')]);
  await expect(page.locator('.file-entry')).toHaveCount(2);
  await page.waitForFunction(() => window.__mxlGetState?.().files.length === 2);
}
const firstPitch = (page, index) => page.evaluate((i) => {
  const pitch = window.__mxlGetState().files[i].xmlDoc.querySelector('note pitch');
  return pitch.querySelector('step').textContent + (pitch.querySelector('alter')?.textContent || '') + pitch.querySelector('octave').textContent;
}, index);

test('@panels scope: transforms every open file by default and only the current file on request', async ({ page }) => {
  await openApp(page); await uploadTwo(page);
  const toggle = page.getByRole('group', { name: '인스펙터 적용 대상' });
  await expect(toggle.getByRole('button', { name: '전체 2개' })).toHaveAttribute('aria-pressed', 'true');
  const panel = await openPanel(page, 'transpose');
  await panel.getByText('반음 단위 이동', { exact: true }).click();
  await panel.locator('input[type="number"]').fill('2');
  await panel.getByRole('button', { name: /변환 실행/ }).click();
  await expect.poll(() => firstPitch(page, 0)).toBe('D4');
  expect(await firstPitch(page, 1)).toBe('D4');
  await expect(panel.locator('.result-log')).toContainText('대상: 열린 파일 2개');

  await toggle.getByRole('button', { name: '현재 파일' }).click();
  await expect(toggle.getByRole('button', { name: '현재 파일' })).toHaveAttribute('aria-pressed', 'true');
  await page.evaluate(() => window.__mxlSetActiveFile(1));
  await page.evaluate(() => { window.__firstFileBefore = window.__mxlGetState().files[0]; });
  const before = await page.evaluate(() => window.__mxlGetState().files[0].xmlString);
  await panel.getByRole('button', { name: /변환 실행/ }).click();
  await expect.poll(() => firstPitch(page, 1)).toBe('E4');
  expect(await firstPitch(page, 0)).toBe('D4');
  expect(await page.evaluate(() => window.__mxlGetState().files[0] === window.__firstFileBefore)).toBe(true);
  expect(await page.evaluate(() => window.__mxlGetState().files[0].xmlString)).toBe(before);
  const labels = await page.evaluate(() => window.__mxlGetState().history.map((entry) => entry.label));
  expect(labels.slice(-2)).toEqual(['조옮김 · 전체 2개', '조옮김 · 현재 파일']);
  await expect(panel.locator('.result-log')).toContainText('대상: 현재 파일(f02-two-parts.musicxml)');

  expect(await page.evaluate(() => localStorage.getItem('mxlStudio.scope'))).toBe('active');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('.app-root .main-score')).toBeVisible({ timeout: 30_000 });
  const banner = page.locator('.session-restore-banner');
  if (await banner.isVisible().catch(() => false)) await banner.getByRole('button', { name: '닫기' }).click();
  await uploadTwo(page);
  await expect(page.getByRole('group', { name: '도구 적용 대상' }).getByRole('button', { name: '현재 파일' })).toHaveAttribute('aria-pressed', 'true');
});

test('@panels scope: the toggle stays hidden with a single file', async ({ page }) => {
  await openApp(page);
  await page.locator('input[type="file"]').setInputFiles(path.join(fixturesDir, 'f01-basic.musicxml'));
  await expect(page.locator('.file-entry')).toHaveCount(1);
  await expect(page.getByRole('group', { name: '인스펙터 적용 대상' })).toHaveCount(0);
});
