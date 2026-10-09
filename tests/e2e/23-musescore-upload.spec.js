import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openApp, fixturesDir } from './helpers.js';

const input = page => page.locator('.upload-zone__input');
const log = page => page.locator('.inspector .panel--visible');
const state = page => page.evaluate(() => {
  const s = window.__mxlGetState();
  const file = s.files[s.activeFile || 0];
  return file && {
    count: s.files.length,
    name: file.name,
    sourceName: file.sourceName,
    root: file.xmlDoc.documentElement.localName,
    parts: file.xmlDoc.querySelectorAll('part').length,
    xmlStringRoot: new DOMParser().parseFromString(file.xmlString, 'text/xml').documentElement.localName,
    firstNote: (() => { const p = file.xmlDoc.querySelector('part measure note pitch'); return p ? `${p.querySelector('step').textContent}${p.querySelector('octave').textContent}` : null; })(),
  };
});

test('@musescore @smoke uploads a .mscz, converts it and renders the score', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await openApp(page);
  await input(page).setInputFiles(path.join(fixturesDir, 'f10-musescore.mscz'));
  await expect(page.locator('.file-entry__name')).toHaveText('f10-musescore.musicxml');
  await expect(page.locator('.header__badge')).toContainText('파일 1개');
  await expect(log(page)).toContainText('MuseScore 악보를 MusicXML로 변환했습니다');
  await expect(page.locator('.score-main-render svg').first()).toBeVisible();
  // 파일 객체 계약: name은 변환된 이름, sourceName은 원본 이름이며 xmlString은 xmlDoc과 같은 악보입니다.
  expect(await state(page)).toEqual({ count: 1, name: 'f10-musescore.musicxml', sourceName: 'f10-musescore.mscz', root: 'score-partwise', parts: 2, xmlStringRoot: 'score-partwise', firstNote: 'F4' });
  expect(errors).toEqual([]);
});

test('@musescore uploads an uncompressed .mscx and a Korean-named .mscz together', async ({ page }) => {
  await openApp(page);
  // Playwright는 경로와 버퍼를 한 번에 섞어 줄 수 없으므로 둘 다 버퍼로 전달합니다.
  await input(page).setInputFiles([
    { name: 'f10-musescore.mscx', mimeType: 'text/xml', buffer: await readFile(path.join(fixturesDir, 'f10-musescore.mscx')) },
    { name: '한글 악보 (1).mscz', mimeType: 'application/octet-stream', buffer: await readFile(path.join(fixturesDir, 'f10-musescore.mscz')) },
  ]);
  await expect(page.locator('.file-entry__name')).toHaveText(['f10-musescore.musicxml', '한글 악보 (1).musicxml']);
  await expect(page.locator('.header__badge')).toContainText('파일 2개');
});

test('@musescore gives a converted file a suffix when the same score is uploaded twice', async ({ page }) => {
  await openApp(page);
  await input(page).setInputFiles(path.join(fixturesDir, 'f10-musescore.mscz'));
  await expect(page.locator('.file-entry__name')).toHaveCount(1);
  await input(page).setInputFiles(path.join(fixturesDir, 'f10-musescore.mscz'));
  await expect(page.locator('.file-entry__name').nth(1)).toHaveText('f10-musescore (2).musicxml');
  await expect(log(page)).toContainText('중복 이름을 f10-musescore (2).musicxml(으)로 변경했습니다');
});

test('@musescore keeps working with converted scores in MusicXML-only features', async ({ page }) => {
  await openApp(page);
  await input(page).setInputFiles(path.join(fixturesDir, 'f10-musescore.mscz'));
  await expect(page.locator('.file-entry__name')).toHaveCount(1);
  // 같은 악보를 MusicXML 업로드와 같은 규칙으로 다룹니다(저장 직전 xmlString 동기화).
  const roundTrip = await page.evaluate(() => {
    const s = window.__mxlGetState();
    const file = s.files[0];
    const reparsed = new DOMParser().parseFromString(file.xmlString, 'text/xml');
    return { notes: file.xmlDoc.querySelectorAll('note').length, reparsedNotes: reparsed.querySelectorAll('note').length, divisions: file.xmlDoc.querySelector('divisions').textContent };
  });
  expect(roundTrip.notes).toBeGreaterThan(10);
  expect(roundTrip.reparsedNotes).toBe(roundTrip.notes);
  expect(Number(roundTrip.divisions)).toBeGreaterThan(0);
});

test('@musescore reports a clear error for a damaged .mscz without adding a file', async ({ page }) => {
  await openApp(page);
  await input(page).setInputFiles({ name: 'broken.mscz', mimeType: 'application/octet-stream', buffer: Buffer.from('이것은 압축 파일이 아닙니다') });
  await expect(log(page)).toContainText('broken.mscz');
  await expect(page.locator('.file-entry')).toHaveCount(0);
  await input(page).setInputFiles({ name: 'empty.mscx', mimeType: 'text/xml', buffer: Buffer.from('<score-partwise/>') });
  await expect(log(page)).toContainText('MuseScore 악보 파일이 아닙니다');
  await expect(page.locator('.file-entry')).toHaveCount(0);
});

test('@musescore still rejects unsupported types and mentions MuseScore support', async ({ page }) => {
  await openApp(page);
  await input(page).setInputFiles({ name: 'wrong.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF') });
  await expect(log(page)).toContainText('PDF는 직접 불러올 수 없습니다');
  await input(page).setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') });
  await expect(log(page)).toContainText('MuseScore(.mscz)');
  await expect(input(page)).toHaveAttribute('accept', /\.mscz/);
});

test('@musescore @robustness falls back to a guide message when the converter script fails to load', async ({ page }) => {
  await page.route('**/mscz-core.js*', route => route.abort());
  await openApp(page);
  await input(page).setInputFiles(path.join(fixturesDir, 'f10-musescore.mscz'));
  await expect(log(page)).toContainText('MuseScore 변환 모듈을 불러오지 못했습니다');
  await expect(page.locator('.file-entry')).toHaveCount(0);
  // MusicXML 업로드는 영향을 받지 않습니다.
  await input(page).setInputFiles(path.join(fixturesDir, 'f01-basic.musicxml'));
  await expect(page.locator('.file-entry__name')).toHaveText('f01-basic.musicxml');
});
