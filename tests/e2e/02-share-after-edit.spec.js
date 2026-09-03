import { test, expect } from '@playwright/test';
import { openApp, uploadFixture, getPitchAt } from './helpers.js';

test('@smoke shares the edited pitch rather than the uploaded original', async ({ page, context }) => {
  await openApp(page);
  await uploadFixture(page);
  await page.getByTitle('조옮김', { exact: true }).click();
  await page.getByText('반음 단위 이동', { exact: true }).click();
  await page.locator('.panel--visible input[type="number"]').fill('2');
  await page.getByRole('button', { name: /변환 실행/ }).click();
  await expect.poll(() => getPitchAt(page)).toEqual({ step: 'D', alter: '0', octave: '4' });
  await page.getByRole('button', { name: '공유', exact: true }).click();
  const link = await page.locator('.share-modal__url').inputValue();
  const recipient = await context.newPage();
  await recipient.goto(link, { waitUntil: 'domcontentloaded' });
  await expect.poll(() => getPitchAt(recipient)).toEqual({ step: 'D', alter: '0', octave: '4' });
});
