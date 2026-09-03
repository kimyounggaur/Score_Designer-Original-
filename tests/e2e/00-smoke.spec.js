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

  test('@smoke inserts ossia block into score flow', async ({ page }) => {
    await openApp(page);
    await uploadFixture(page);

    await page.evaluate(() => {
      const addText = '\uCD94\uAC00';
      const addButton = Array.from(document.querySelectorAll('button')).find((button) => {
        const text = button.textContent || '';
        return text.includes('Ossia') && text.includes(addText);
      });
      if (!(addButton instanceof HTMLButtonElement)) {
        throw new Error('Ossia add button not found');
      }
      addButton.click();
    });

    await expect.poll(() => page.evaluate(() => {
      const file = window.__mxlGetState?.()?.files?.[0];
      const overlay = document.querySelector('.ossia-inline');
      const mainScore = document.querySelector('.score-main-render');
      const svg = overlay?.querySelector('svg');
      const svgRect = svg?.getBoundingClientRect();
      const style = overlay ? getComputedStyle(overlay) : null;
      return {
        hasOssiaXml: Boolean(file?.ossiaMxml),
        insertedInScoreContainer: overlay?.parentElement?.classList.contains('score-container') || false,
        beforeMainScore: Boolean(overlay && mainScore && (overlay.compareDocumentPosition(mainScore) & Node.DOCUMENT_POSITION_FOLLOWING)),
        svgUsable: (svgRect?.width || 0) > 100,
        notAbsolute: style?.position !== 'absolute',
        transparentFrame: style?.backgroundColor === 'rgba(0, 0, 0, 0)',
        noBorder: style?.borderTopWidth === '0px',
        noShadow: style?.boxShadow === 'none',
      };
    })).toEqual({
      hasOssiaXml: true,
      insertedInScoreContainer: true,
      beforeMainScore: true,
      svgUsable: true,
      notAbsolute: true,
      transparentFrame: true,
      noBorder: true,
      noShadow: true,
    });
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
    await expect(page.getByText('이전 세션이 있습니다')).toBeVisible();
    await page.getByRole('button', { name: '복원하기' }).click();

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
    await expect(page.getByRole('dialog', { name: '공유 링크' })).toBeVisible();
    const shareURL = await page.locator('.share-modal__url').inputValue();

    expect(new URL(shareURL).hash).toMatch(/^#v2\./);

    const sharedPage = await context.newPage();
    await sharedPage.goto(shareURL, { waitUntil: 'domcontentloaded' });
    await sharedPage.waitForLoadState('domcontentloaded');
    await expect(sharedPage.locator('.file-entry__name')).toContainText('f01-basic.musicxml', { timeout: 20_000 });
    await expect.poll(() => getPitchAt(sharedPage, { measure: 1, noteIdx: 0 })).toEqual({
      step: 'C',
      alter: '0',
      octave: '4',
    });
  });
});
