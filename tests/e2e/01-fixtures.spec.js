import { test, expect } from '@playwright/test';
import { openApp, uploadFixture } from './helpers.js';

for (const file of ['f01-basic.musicxml', 'f02-two-parts.musicxml', 'f03-pickup.musicxml', 'f04-minor-harmony.musicxml', 'f05-transposing.musicxml', 'f06-lyrics-ties.musicxml', 'f07-enharmonic.musicxml', 'f08-repeats-tempo.musicxml', 'f09-real.mxl']) {
  test(`@fixtures renders ${file}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await openApp(page);
    await uploadFixture(page, file);
    await expect(page.locator('.score-main-render svg').first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}
