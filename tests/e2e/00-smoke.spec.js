import { expect, test } from '@playwright/test';
import { getPitchAt, openApp, uploadFixture } from './helpers.js';

test.describe('MXL Studio smoke', () => {
  test('@smoke empty app loads without console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await openApp(page);

    await expect(page.locator('.score-empty__title')).toContainText('메인 악보 편집 영역');
    await expect(page.getByRole('heading', { name: '파일 업로드' })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('@smoke uploads a MusicXML fixture and exposes score state', async ({ page }) => {
    await openApp(page);
    await uploadFixture(page);

    await expect(page.locator('.file-entry__name')).toContainText('f01-basic.musicxml');
    await expect(page.locator('.header__badge')).toContainText('파일 1개');
    await expect.poll(() => getPitchAt(page, { measure: 1, noteIdx: 0 })).toEqual({
      step: 'C',
      alter: '0',
      octave: '4',
    });
  });

  test('@smoke rejects PDF uploads with a helpful message', async ({ page }) => {
    await openApp(page);

    const messages = [];
    page.once('dialog', async (dialog) => {
      messages.push(dialog.message());
      await dialog.dismiss();
    });
    await page.evaluate(() => {
      const file = new File(['%PDF-1.4\n%%EOF'], 'unsupported-score.pdf', { type: 'application/pdf' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      document.querySelector('.upload-zone')?.dispatchEvent(new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        dataTransfer,
      }));
    });

    expect(messages[0]).toContain('PDF는 직접 불러올 수 없습니다');
    await expect(page.locator('.file-entry__name')).toHaveCount(0);
    await expect(page.locator('.header__badge')).toContainText('파일 0개');
  });

  test('@smoke transposes uploaded score by semitone mode', async ({ page }) => {
    await openApp(page);
    await uploadFixture(page);

    await page.getByTitle('조옮김').click();
    await page.getByText('반음 단위 이동').click();
    await page.locator('input[type="number"]').first().fill('2');
    await page.getByRole('button', { name: /변환 실행/ }).click();

    await expect.poll(() => getPitchAt(page, { measure: 1, noteIdx: 0 })).toEqual({
      step: 'D',
      alter: '0',
      octave: '4',
    });
    await expect(page.getByText('기록: 조옮김')).toBeVisible();
  });

  test('@smoke restores autosaved session after reload', async ({ page }) => {
    await openApp(page);
    await uploadFixture(page);

    await page.waitForFunction(() => {
      const raw = localStorage.getItem('mxlStudio.idbFallback.sessions.autosave');
      if (!raw) return false;
      try {
        return Boolean(JSON.parse(raw)?.files?.length);
      } catch {
        return false;
      }
    }, null, { timeout: 8_000 });

    await page.reload();
    await page.waitForFunction(() => {
      const state = window.__mxlGetState?.();
      return Boolean(state?.restoreSession?.files?.length);
    }, null, { timeout: 20_000 });
    const restoreBanner = page.locator('.restore-banner');
    await expect(restoreBanner).toBeVisible();
    await restoreBanner.getByRole('button', { name: '복원하기' }).click();

    await expect(page.locator('.file-entry__name')).toContainText('f01-basic.musicxml');
    await expect.poll(() => getPitchAt(page, { measure: 1, noteIdx: 0 })).toEqual({
      step: 'C',
      alter: '0',
      octave: '4',
    });
  });

  test('@smoke opens compressed share URL in a new page', async ({ page, context }) => {
    await openApp(page);
    await uploadFixture(page);

    await page.getByRole('button', { name: '공유' }).click();
    await expect(page.getByRole('dialog', { name: '악보 URL 공유' })).toBeVisible();
    const shareURL = await page.locator('.share-modal__url').inputValue();

    expect(new URL(shareURL).hash).toMatch(/^#v2\./);

    const sharedPage = await context.newPage();
    await sharedPage.goto(shareURL);
    await sharedPage.waitForLoadState('domcontentloaded');
    await expect(sharedPage.locator('.file-entry__name')).toContainText('f01-basic.musicxml', { timeout: 20_000 });
    await expect.poll(() => getPitchAt(sharedPage, { measure: 1, noteIdx: 0 })).toEqual({
      step: 'C',
      alter: '0',
      octave: '4',
    });
  });
});
