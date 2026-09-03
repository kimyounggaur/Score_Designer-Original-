import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.resolve(__dirname, '../fixtures');

export async function openApp(page) {
  await page.goto('mxl-studio.html');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.app-root .main-score')).toBeVisible({ timeout: 30_000 });
}

export async function waitForScore(page) {
  await expect(page.locator('.file-entry__name')).toBeVisible();
  await expect(page.locator('.header__badge')).toContainText('파일 1개');
  await page.waitForFunction(() => {
    const state = window.__mxlGetState?.();
    return Boolean(state?.files?.length);
  });
}

export async function uploadFixture(page, name = 'f01-basic.musicxml') {
  await page.locator('input[type="file"]').setInputFiles(path.join(fixturesDir, name));
  await waitForScore(page);
}

export async function getDocQuery(page, selector) {
  return page.evaluate((cssSelector) => {
    const state = window.__mxlGetState?.();
    const doc = state?.files?.[state.activeFile || 0]?.xmlDoc;
    const node = doc?.querySelector(cssSelector);
    return node
      ? {
          text: node.textContent,
          attrs: Array.from(node.attributes || []).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
        }
      : null;
  }, selector);
}

export async function getPitchAt(page, { measure = 1, noteIdx = 0 } = {}) {
  return page.evaluate(({ measure, noteIdx }) => {
    const state = window.__mxlGetState?.();
    const doc = state?.files?.[state.activeFile || 0]?.xmlDoc;
    const measureNode = doc?.querySelector(`measure[number="${measure}"]`);
    const notes = Array.from(measureNode?.querySelectorAll('note') || []).filter((note) => !note.querySelector('rest'));
    const pitch = notes[noteIdx]?.querySelector('pitch');
    if (!pitch) return null;
    return {
      step: pitch.querySelector('step')?.textContent || null,
      alter: pitch.querySelector('alter')?.textContent || '0',
      octave: pitch.querySelector('octave')?.textContent || null,
    };
  }, { measure, noteIdx });
}
