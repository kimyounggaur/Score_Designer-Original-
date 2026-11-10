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

const printButton = (page) => page.locator('.header__export-btn[title="인쇄 / PDF로 저장"]');
// window.print를 바꿔 인쇄 직전의 인쇄 영역(쪽 수·@page·용지 id·제목)을 window.__printed에 담습니다. 인쇄 창은 열리지 않습니다.
const stubPrint = (page) => page.evaluate(() => {
  window.__printed = null;
  window.print = () => {
    window.__printed = {
      pages: Array.from(document.querySelectorAll('.print-root .print-page'), (node) => node.querySelectorAll('svg').length),
      style: document.getElementById('mxl-print-page')?.textContent ?? null,
      format: document.querySelector('.print-root')?.getAttribute('data-page-format') ?? null,
      title: document.title,
      ratio: (() => { const box = (document.querySelector('.print-page > svg')?.getAttribute('viewBox') || '').split(/\s+/).map(Number); return box[3] / box[2]; })(),
      offscreen: document.querySelectorAll('[data-export-offscreen]').length,
    };
  };
});
const waitPrinted = async (page) => {
  await page.waitForFunction(() => window.__printed, null, { timeout: 30_000 });
  return page.evaluate(() => window.__printed);
};
const expectNoPrintLeftovers = async (page) => {
  await expect(page.locator('.print-root')).toHaveCount(0);
  await expect(page.locator('#mxl-print-page')).toHaveCount(0);
  expect(await page.evaluate(() => document.body.classList.contains('mxl-printing'))).toBe(false);
  expect(await offscreenCount(page)).toBe(0);
};

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

// Phase B B-5: PDF는 뷰어 화면이 아니라 body 직속 .print-root(쪽마다 .print-page)를 인쇄합니다(O3·O4).
test.describe('Phase B B-5 · PDF 쪽 나눔 인쇄 영역', () => {
  test('@panels print root paginates a long score and cleans up after printing', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    await stubPrint(page);
    const title = await page.title();
    await printButton(page).click();
    const printed = await waitPrinted(page);

    // 64마디는 A4 세로 3쪽 이상으로 나뉘고 쪽마다 .print-page 하나·SVG 하나입니다. 용지·제목은 인쇄 직전에 정해집니다.
    expect(printed.pages.length).toBeGreaterThanOrEqual(3);
    expect(printed.pages.every((count) => count === 1)).toBe(true);
    expect(printed.style).toBe('@page{size:A4 portrait;margin:0}');
    expect(printed.format).toBe('A4_P');
    expect(printed.title).toBe(STEM);
    expect(printed.ratio).toBeCloseTo(297 / 210, 2);
    expect(printed.offscreen).toBe(0);
    // 인쇄 뒤에는 인쇄 영역·@page 스타일·표시 클래스·화면 밖 상자와 문서 제목이 남지 않습니다.
    await expectNoPrintLeftovers(page);
    expect(await page.title()).toBe(title);
  });

  test('@panels pdf page count equals the print pages and ignores the window size', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'page.pdf()는 데스크톱 Chromium에서만 씁니다.');
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    // 시험 전용 훅: 정리를 건너뛰어 인쇄 영역을 남기고, 그 상태에서 page.pdf()로 실제 쪽 수를 셉니다.
    await page.evaluate(() => { window.__mxlKeepPrintRoot = true; });
    await stubPrint(page);

    const measure = async () => {
      await page.evaluate(() => { window.__printed = null; });
      await printButton(page).click();
      await waitPrinted(page);
      const printPages = await page.locator('.print-root .print-page').count();
      const buffer = await page.pdf({ preferCSSPageSize: true });
      const pdfPages = (buffer.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
      await page.evaluate(() => {
        document.querySelector('.print-root')?.remove();
        document.getElementById('mxl-print-page')?.remove();
        document.body.classList.remove('mxl-printing');
      });
      return { printPages, pdfPages };
    };
    const wide = await measure();
    expect(wide.printPages).toBeGreaterThanOrEqual(3);
    expect(wide.pdfPages).toBe(wide.printPages);

    // 창을 줄이고 이미지 / PDF 패널을 열어도 쪽 수는 같습니다.
    await page.setViewportSize({ width: 1000, height: 800 });
    await openPanel(page, 'export');
    expect(await measure()).toEqual(wide);
  });

  test('@panels the paper setting changes the page box and the page ratio', async ({ page }) => {
    test.setTimeout(90_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const panel = await openPanel(page, 'export');
    await expect(panel.getByLabel('용지')).toHaveValue('A4_P');
    await expect(panel.getByRole('option')).toContainText(['A4 세로', 'A4 가로', 'Letter 세로']);
    await openPreview(page, panel);
    await expect(panel).toContainText("인쇄 창에서 대상을 'PDF로 저장'으로 고르면 PDF 파일이 됩니다.");
    await stubPrint(page);
    const printNow = () => panel.getByRole('button', { name: '🖨️ 인쇄 / PDF로 저장', exact: true }).click();

    await panel.getByLabel('용지').selectOption('A4_L');
    await printNow();
    const landscape = await waitPrinted(page);
    expect(landscape.style).toBe('@page{size:A4 landscape;margin:0}');
    expect(landscape.format).toBe('A4_L');
    expect(landscape.ratio).toBeCloseTo(210 / 297, 2);

    await stubPrint(page);
    await panel.getByLabel('용지').selectOption('LETTER_P');
    await printNow();
    const letter = await waitPrinted(page);
    expect(letter.style).toBe('@page{size:letter portrait;margin:0}');
    expect(letter.format).toBe('LETTER_P');
    expect(letter.ratio).toBeCloseTo(279.4 / 215.9, 2);
    // 미리보기는 용지와 상관없으므로 용지를 바꿔도 지워지지 않습니다.
    await expect(svgButton(panel)).toBeVisible();
    await expectNoPrintLeftovers(page);
  });

  const addOssia = async (page) => {
    const ossia = await openPanel(page, 'ossia');
    await ossia.locator('.measure-input').nth(1).fill('2');
    await ossia.getByRole('button', { name: '▶ Ossia 추가', exact: true }).click();
    await expect(page.locator('.ossia-inline svg')).toBeVisible();
  };

  test('@panels the Ossia shares the first page when it fits', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, 'f01-basic.musicxml');
    await addOssia(page);
    await stubPrint(page);
    await printButton(page).click();
    // 짧은 악보: 첫 쪽 아래가 비어 있어 Ossia와 본보가 한 쪽(SVG 둘)에 들어갑니다.
    expect((await waitPrinted(page)).pages).toEqual([2]);
    await expectNoPrintLeftovers(page);
  });

  test('@panels the Ossia gets its own first page when the first score page is full', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    await addOssia(page);
    await stubPrint(page);
    await printButton(page).click();
    // 긴 악보: 첫 쪽이 가득 차 Ossia만 담은 쪽이 맨 앞에 더해지고(3쪽 → 4쪽) 본보 쪽은 그대로입니다.
    const printed = await waitPrinted(page);
    expect(printed.pages.length).toBeGreaterThanOrEqual(4);
    expect(printed.pages.every((count) => count === 1)).toBe(true);
    await expectNoPrintLeftovers(page);
  });
});
