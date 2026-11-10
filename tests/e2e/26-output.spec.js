import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { openApp, uploadFixture, openPanel } from './helpers.js';

// Phase B B-4: PNG 저장·SVG·ZIP·헤더 PNG를 화면 밖 고정 폭 렌더 한 길로 통일합니다(O1·O2).
// 같은 파일·같은 설정(폭×배율)이면 어느 버튼으로 내보내도, 창 크기·패널 폭·확대율이 달라도 크기가 같아야 합니다.
// 픽스처 f18-long-64: 64마디 단선율. 폭 1100px에서 여러 줄로 나뉘어 세로로 긴 이미지가 됩니다.
const FIXTURE = 'f18-long-64.musicxml';
const STEM = 'f18-long-64';
const WIDTH = 1100;

// PNG 헤더(IHDR)의 폭·높이(16~23바이트)를 읽습니다.
const pngSize = async (download) => {
  const buffer = await readFile(await download.path());
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

// ZIP 안의 PNG 한 장에서 IHDR 24바이트를 꺼내 폭·높이를 읽습니다(JSZip은 앱이 이미 불러온 것을 씁니다).
const zipPngSize = async (page, download, entryName) => {
  const base64 = (await readFile(await download.path())).toString('base64');
  const head = await page.evaluate(async ({ text, name }) => {
    const zip = await window.JSZip.loadAsync(text, { base64: true });
    const bytes = await zip.file(name).async('uint8array');
    return Array.from(bytes.slice(0, 24));
  }, { text: base64, name: entryName });
  const buffer = Buffer.from(head);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const zipEntryNames = async (page, download) => {
  const base64 = (await readFile(await download.path())).toString('base64');
  return page.evaluate(async (text) => {
    const zip = await window.JSZip.loadAsync(text, { base64: true });
    return Object.keys(zip.files).filter((name) => !zip.files[name].dir).sort();
  }, base64);
};

const saveWith = async (page, locator) => {
  const [download] = await Promise.all([page.waitForEvent('download'), locator.click()]);
  return download;
};

const offscreenCount = (page) => page.evaluate(() => document.querySelectorAll('[data-export-offscreen]').length);

async function openPreview(page, panel) {
  await panel.getByRole('button', { name: /미리보기/ }).click();
  await expect(panel.getByRole('button', { name: '📷 PNG 저장', exact: true })).toBeVisible({ timeout: 30_000 });
}

const pngButton = (panel) => panel.getByRole('button', { name: '📷 PNG 저장', exact: true });
const svgButton = (panel) => panel.getByRole('button', { name: '🖼️ SVG 저장', exact: true });
const zipButton = (panel) => panel.getByRole('button', { name: '📦 전체 파일 PNG (ZIP)', exact: true });
const headerPng = (page) => page.locator('.header__export-btn[title="PNG 내보내기"]');

test.describe('Phase B B-4 · 이미지 내보내기 통일', () => {
  test('@panels single PNG and ZIP PNG have the same size', async ({ page }) => {
    test.setTimeout(90_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const panel = await openPanel(page, 'export');
    await openPreview(page, panel);

    const single = await pngSize(await saveWith(page, pngButton(panel)));
    const zipDownload = await saveWith(page, zipButton(panel));
    expect(await zipEntryNames(page, zipDownload)).toEqual([`${STEM}.png`]);
    const zipped = await zipPngSize(page, zipDownload, `${STEM}.png`);

    // 두 PNG의 크기가 같고, 폭은 기본 악보 폭 1100px × 기본 배율 1.5입니다. 예전에는 358×2611과 2160×817로 갈렸습니다.
    expect(zipped).toEqual(single);
    expect(single.width).toBe(WIDTH * 1.5);
    expect(single.height).toBeGreaterThan(single.width / 3);
    await expect(panel.locator('.result-log')).toContainText('1650×');
    expect(await offscreenCount(page)).toBe(0);
  });

  test('@panels export size ignores the window size and the preview panel width', async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const panel = await openPanel(page, 'export');
    await openPreview(page, panel);
    const wide = await saveWith(page, pngButton(panel));
    const wideSize = await pngSize(wide);
    // 패널이 좁아도(화면 SVG는 CSS로 줄어 약 360px) PNG는 설정 폭 × 배율입니다.
    expect(wideSize.width).toBe(WIDTH * 1.5);
    const wideSvg = (await readFile(await (await saveWith(page, svgButton(panel))).path())).toString('utf8');
    expect(wideSvg).toMatch(/^<svg[^>]*\swidth="1100"/);

    // 미리보기를 다시 그리지 않고 창만 줄여도(화면에서 SVG가 CSS로 더 줄어듭니다) 내보내기 크기는 그대로입니다.
    await page.setViewportSize({ width: 1000, height: 800 });
    const resizedPanel = await openPanel(page, 'export');
    await expect(pngButton(resizedPanel)).toBeVisible();
    expect(await pngSize(await saveWith(page, pngButton(resizedPanel)))).toEqual(wideSize);

    // 좁은 창에서 미리보기를 새로 그려도 같습니다.
    await openPreview(page, resizedPanel);
    expect(await pngSize(await saveWith(page, pngButton(resizedPanel)))).toEqual(wideSize);
    expect(await offscreenCount(page)).toBe(0);
  });

  test('@panels header PNG ignores zoom and matches the panel PNG at the same settings', async ({ page }) => {
    test.setTimeout(120_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);

    const reference = await pngSize(await saveWith(page, headerPng(page)));
    expect(reference.width).toBe(WIDTH * 2);

    for (let index = 0; index < 3; index += 1) await page.getByRole('button', { name: '악보 확대', exact: true }).click();
    await expect(page.getByRole('button', { name: '악보 확대율 초기화' })).not.toHaveText('100%');
    expect(await pngSize(await saveWith(page, headerPng(page)))).toEqual(reference);

    // 이미지 패널에서 배율만 2×로 맞추면 헤더 PNG와 같은 크기입니다.
    const panel = await openPanel(page, 'export');
    await panel.getByLabel('배율 (PNG)').selectOption('2');
    await openPreview(page, panel);
    expect(await pngSize(await saveWith(page, pngButton(panel)))).toEqual(reference);
    expect(await offscreenCount(page)).toBe(0);
  });

  test('@panels the width setting changes the layout and the PNG size', async ({ page }) => {
    test.setTimeout(120_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const panel = await openPanel(page, 'export');
    const widthSelect = panel.getByLabel('악보 폭');
    await expect(widthSelect).toHaveValue(String(WIDTH));
    await expect(panel).toContainText('폭이 넓을수록 한 줄에 마디가 많이 들어갑니다.');

    await widthSelect.selectOption('800');
    await openPreview(page, panel);
    const narrow = await pngSize(await saveWith(page, pngButton(panel)));
    await widthSelect.selectOption('1400');
    await openPreview(page, panel);
    const wide = await pngSize(await saveWith(page, pngButton(panel)));

    expect(narrow.width).toBe(800 * 1.5);
    expect(wide.width).toBe(1400 * 1.5);
    // 폭이 넓으면 한 줄에 마디가 더 들어가 줄 수가 줄고, 그만큼 세로가 짧아집니다.
    expect(narrow.height).toBeGreaterThan(wide.height);
  });

  test('@panels changing the width clears the preview', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const panel = await openPanel(page, 'export');
    await openPreview(page, panel);
    await expect(svgButton(panel)).toBeVisible();

    await panel.getByLabel('악보 폭').selectOption('1400');
    await expect(svgButton(panel)).toHaveCount(0);
    await expect(panel.locator('.export-preview svg')).toHaveCount(0);
    await expect(panel.locator('.result-log')).toContainText('악보 폭이 바뀌어 미리보기를 지웠습니다');

    // 다시 미리보기를 하면 새 폭으로 저장됩니다.
    await openPreview(page, panel);
    const download = await saveWith(page, svgButton(panel));
    expect((await readFile(await download.path())).toString('utf8')).toMatch(/^<svg[^>]*\swidth="1400"/);
  });

  test('@panels renderForExport leaves no offscreen box and splits pages for a page format', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const result = await page.evaluate(async () => {
      const file = window.__mxlGetState().files[0];
      const count = () => document.querySelectorAll('[data-export-offscreen]').length;
      const plain = await window.renderForExport(file, { width: 800 });
      const during = count();
      const plainPages = plain.pages.length;
      const plainSize = { width: plain.main.getAttribute('width'), height: plain.main.getAttribute('height') };
      plain.dispose();
      const paged = await window.renderForExport(file, { width: 800, pageFormat: 'A4_P' });
      const pageSizes = paged.pages.map((svg) => ({ width: parseFloat(svg.getAttribute('width')), height: parseFloat(svg.getAttribute('height')) }));
      paged.dispose();
      const stale = await window.renderForExport(file, { width: 800, isStale: () => true });
      return { during, plainPages, plainSize, pageSizes, stale, after: count() };
    });
    // 상자는 렌더 중에만 있고 dispose·중단 뒤에는 남지 않습니다.
    expect(result.during).toBe(1);
    expect(result.after).toBe(0);
    expect(result.stale).toBeNull();
    // 쪽 나눔이 없으면 SVG 하나(폭 800), A4 세로이면 여러 쪽이고 쪽마다 A4 비율(297/210)입니다.
    expect(result.plainPages).toBe(1);
    expect(Number(result.plainSize.width)).toBe(800);
    expect(result.pageSizes.length).toBeGreaterThan(1);
    for (const size of result.pageSizes) {
      expect(size.width).toBe(800);
      expect(size.height / size.width).toBeCloseTo(297 / 210, 1);
    }
  });

  test('@panels refuses an image beyond the canvas limit instead of saving a broken PNG', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const panel = await openPanel(page, 'export');
    await openPreview(page, panel);
    // 실제로 한도를 넘는 악보를 만들기는 어려우므로 픽셀 계산만 "너무 큼"으로 바꿔 안내 경로를 확인합니다.
    await page.evaluate(() => {
      const original = window.ExportCore.pngPixelSize;
      window.ExportCore.pngPixelSize = (size, scale) => ({ ...original(size, scale), tooLarge: true });
    });
    let downloads = 0;
    page.on('download', () => { downloads += 1; });

    await pngButton(panel).click();
    await expect(panel.locator('.result-log')).toContainText('이미지가 너무 큽니다');
    await expect(panel.locator('.result-log')).toContainText('배율이나 폭을 낮추세요');

    await zipButton(panel).click();
    await expect(panel.locator('.result-log')).toContainText(`${STEM}.musicxml`);
    await expect(panel.locator('.result-log')).toContainText('이미지가 너무 큽니다');
    await expect(panel.locator('.result-log')).toContainText('ZIP을 내려받지 않았습니다');
    expect(downloads).toBe(0);
    expect(await offscreenCount(page)).toBe(0);
  });
});
