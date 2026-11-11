import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, openPanel, uploadFixture, fixturesDir } from './helpers.js';

// 2026-11-11 재검수 보고서(D01~D16) 회귀 시험. 항목 ID는 보고서의 통합 ID(D01~D16)를 따릅니다.
// 앱 상태는 읽기만 하고, 조작은 실제 버튼·입력으로 합니다. 탭 전환만 시험 훅(__mxlSetActiveFile)을 씁니다.

async function uploadMany(page, names) {
  await page.locator('input[type="file"]').setInputFiles(names.map((name) => path.join(fixturesDir, name)));
  await expect(page.locator('.file-entry')).toHaveCount(names.length);
  await page.waitForFunction((count) => window.__mxlGetState?.().files.length === count, names.length);
}
const chordsOf = (page, index = 0) => page.evaluate((i) => Array.from(window.__mxlGetState().files[i].xmlDoc.querySelectorAll('harmony'), (h) => window.ChordSymbolCore.toString(h)), index);
const historyLength = (page) => page.evaluate(() => window.__mxlGetState().history.length);

test.describe('2026-11-11 재검수 · 코드 삽입과 분석 결과', () => {
  test('@panels D01 auto insert keeps existing chords of measures it cannot settle', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, 'f11-chords-inversion.musicxml');
    const before = await chordsOf(page);
    expect(before.length).toBe(4);
    const tools = await openPanel(page, 'chordtools');
    await tools.getByRole('button', { name: '기존 코드 덮어쓰기', exact: true }).click();
    await tools.getByRole('button', { name: /코드 분석 & 삽입/ }).click();
    const log = tools.locator('.result-log');
    // 네 마디 모두 단음이라 확정하지 못하므로 0마디 삽입이고, 기존 코드 4개는 그대로여야 합니다.
    await expect(log).toContainText('0마디 코드 삽입');
    await expect(log).toContainText('기존 코드 0개 교체');
    await expect(log).toContainText('미확정 마디의 기존 코드 4개 유지');
    await expect(log).toContainText('마디 1: 음이 1개라 코드를 확정하지 않았습니다 (기존 코드 1개는 그대로 둡니다)');
    expect(await chordsOf(page)).toEqual(before);
  });

  test('@panels D01 auto insert still replaces the chord of a measure it settles', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, 'f04-minor-harmony.musicxml');
    const tools = await openPanel(page, 'chordtools');
    await tools.getByRole('button', { name: '기존 코드 덮어쓰기', exact: true }).click();
    await tools.getByRole('button', { name: /코드 분석 & 삽입/ }).click();
    await expect(tools.locator('.result-log')).toContainText('4마디 코드 삽입');
    await expect.poll(() => chordsOf(page)).toEqual(['Am', 'Dm', 'E7', 'Am']);
  });

  test('@panels D12 chord analysis result clears when the analysed file changes', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadMany(page, ['f01-basic.musicxml', 'f11-chords-inversion.musicxml']);
    await page.getByRole('group', { name: '인스펙터 적용 대상' }).getByRole('button', { name: '현재 파일' }).click();
    const panel = await openPanel(page, 'chords');
    await panel.getByRole('button', { name: /코드 기호 파악/ }).click();
    await expect(panel.locator('.result-log')).toContainText('코드 기호 없음');
    await expect(panel.locator('.result-log')).toContainText('f01-basic.musicxml');
    await page.evaluate(() => window.__mxlSetActiveFile(1));
    await expect(panel.locator('.result-log')).toHaveCount(0);
    // 다시 실행하면 새 파일의 결과가 나옵니다.
    await panel.getByRole('button', { name: /코드 기호 파악/ }).click();
    await expect(panel.locator('.result-log')).toContainText('f11-chords-inversion.musicxml');
    await expect(panel.locator('.result-log')).toContainText('E');
    await expect(panel.locator('.result-log')).not.toContainText('코드 기호 없음');
  });

  test('@panels D04 statistics clear when the file changes and name their analysed file', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadMany(page, ['f02-two-parts.musicxml', 'f01-basic.musicxml']);
    await page.getByRole('group', { name: '인스펙터 적용 대상' }).getByRole('button', { name: '현재 파일' }).click();
    const panel = await openPanel(page, 'stats');
    await panel.getByRole('button', { name: /기본 분석/ }).click();
    await expect(panel.locator('.stats-caption')).toContainText('분석 대상: 현재 파일(f02-two-parts.musicxml)');
    await expect(panel.getByText('음표 분포')).toBeVisible();
    // 다른 파일로 바꾸면 이전 수치가 사라집니다.
    await page.evaluate(() => window.__mxlSetActiveFile(1));
    await expect(panel.getByText('음표 분포')).toHaveCount(0);
    await expect(panel.locator('.stats-caption')).toHaveCount(0);
    // 새 파일에서 작곡 스타일만 분석하면 이전 파일의 기본 통계가 함께 보이지 않습니다.
    await panel.getByRole('button', { name: /작곡 스타일 분석/ }).click();
    await expect(panel.locator('.stats-caption')).toHaveCount(1);
    await expect(panel.locator('.stats-caption')).toContainText('분석 대상: 현재 파일(f01-basic.musicxml)');
    await expect(panel.getByText('음표 분포')).toHaveCount(0);
  });

  test('@panels D04 statistics also clear after the analysed score is edited', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, 'f01-basic.musicxml');
    const stats = await openPanel(page, 'stats');
    await stats.getByRole('button', { name: /기본 분석/ }).click();
    await expect(stats.getByText('음표 분포')).toBeVisible();
    const before = await historyLength(page);
    const transpose = await openPanel(page, 'transpose');
    await transpose.getByText('반음 단위 이동', { exact: true }).click();
    await transpose.locator('input[type="number"]').fill('2');
    await transpose.getByRole('button', { name: /변환 실행/ }).click();
    await expect.poll(() => historyLength(page)).toBe(before + 1);
    const again = await openPanel(page, 'stats');
    await expect(again.getByText('음표 분포')).toHaveCount(0);
  });
});

// D02: 세션 JSON·저장 세션·공유 링크도 업로드와 같은 구조 검사로 파트·마디가 없는 악보를 거절하고 현재 작업을 지키는지 봅니다.
const EMPTY_STRUCTURE_XML = '<score-partwise version="4.0"><part-list/></score-partwise>';
const sessionJson = (xml, name = 'empty.musicxml') => Buffer.from(JSON.stringify({ version: 1, activeFile: 0, files: [{ name, sourceName: name, xml }] }));
const openSessions = async (page) => {
  await page.getByRole('button', { name: '세션', exact: true }).click();
  return page.getByRole('dialog', { name: '세션 관리' });
};

test.describe('2026-11-11 재검수 · 세션·공유 구조 검증 (D02)', () => {
  test('@panels D02 session JSON without parts is refused and the current score stays', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, 'f01-basic.musicxml');
    const before = await page.evaluate(() => { const s = window.__mxlGetState(); return { xml: s.files[0].xmlString, history: s.history.length, files: s.files.length }; });
    const modal = await openSessions(page);
    await page.getByLabel('세션 JSON 가져오기').setInputFiles({ name: 'empty.json', mimeType: 'application/json', buffer: sessionJson(EMPTY_STRUCTURE_XML) });
    await expect(page.locator('.toast--err')).toContainText('세션 안의 MusicXML 악보를 읽을 수 없습니다');
    await expect(page.locator('.toast--err')).toContainText('empty.musicxml: 악보에 파트가 없습니다.');
    await expect(modal).not.toContainText('현재 작업을 덮어씁니다');
    const after = await page.evaluate(() => { const s = window.__mxlGetState(); return { xml: s.files[0].xmlString, history: s.history.length, files: s.files.length }; });
    expect(after).toEqual(before);
  });

  test('@panels D02 session JSON without measures is refused even when nothing is open', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    const modal = await openSessions(page);
    await page.getByLabel('세션 JSON 가져오기').setInputFiles({ name: 'nomeasure.json', mimeType: 'application/json', buffer: sessionJson('<score-partwise><part-list><score-part id="P1"/></part-list><part id="P1"/></score-partwise>', 'nomeasure.musicxml') });
    await expect(page.locator('.toast--err')).toContainText('nomeasure.musicxml: 악보에 마디가 없습니다.');
    await expect(modal).toBeVisible();
    expect(await page.evaluate(() => window.__mxlGetState().files.length)).toBe(0);
  });

  test('@panels D02 a valid session JSON is still restored', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    const xml = await (await import('node:fs/promises')).readFile(path.join(fixturesDir, 'f02-two-parts.musicxml'), 'utf8');
    await openSessions(page);
    await page.getByLabel('세션 JSON 가져오기').setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: sessionJson(xml, 'f02-two-parts.musicxml') });
    await expect.poll(() => page.evaluate(() => window.__mxlGetState().files.map((file) => file.name))).toEqual(['f02-two-parts.musicxml']);
  });

  test('@panels D02 a stored session without parts is refused on restore and keeps the current score', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, 'f01-basic.musicxml');
    await page.evaluate(async (xml) => {
      await window.SessionStoreCore.saveSession({ id: 'slot-empty', name: '구조 없는 세션', activeFile: 0, files: [{ name: 'empty.musicxml', xml }] });
    }, EMPTY_STRUCTURE_XML);
    const modal = await openSessions(page);
    const row = modal.locator('tr').filter({ hasText: '구조 없는 세션' });
    await row.getByRole('button', { name: '불러오기' }).click();
    await modal.getByRole('button', { name: '확인', exact: true }).click();
    await expect(page.locator('.toast--err')).toContainText('세션 안의 악보를 읽을 수 없습니다');
    expect(await page.evaluate(() => window.__mxlGetState().files.map((file) => file.name))).toEqual(['f01-basic.musicxml']);
  });

  test('@panels D02 a share link without parts is refused with a reason', async ({ page, context }) => {
    test.setTimeout(45_000);
    await openApp(page);
    const url = await page.evaluate(async (xml) => (await window.ShareSessionCore.buildShareURLv2Info({ name: 'empty.musicxml', xml }, window.location.href.split('#')[0])).url, EMPTY_STRUCTURE_XML);
    const shared = await context.newPage();
    await shared.goto(url);
    await expect(shared.locator('.app-root .main-score')).toBeVisible({ timeout: 30_000 });
    await expect(shared.locator('.history-panel__notice')).toContainText('공유 링크를 읽지 못했습니다: 악보에 파트가 없습니다.');
    expect(await shared.evaluate(() => window.__mxlGetState().files.length)).toBe(0);
  });

  test('@panels D02 a normal share link still opens', async ({ page, context }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, 'f02-two-parts.musicxml');
    const url = await page.evaluate(async () => (await window.ShareSessionCore.buildShareURLv2Info(window.__mxlGetState().files[0], window.location.href.split('#')[0])).url);
    const shared = await context.newPage();
    await shared.goto(url);
    await expect.poll(() => shared.evaluate(() => window.__mxlGetState?.().files.map((file) => file.name))).toEqual(['f02-two-parts.musicxml']);
  });
});

// D13: 저장소가 삭제를 막으면 성공이라고 알리지 않고 목록과 본문이 어긋나지 않는다.
test.describe('2026-11-11 재검수 · 세션 삭제 실패 (D13)', () => {
  test('@panels D13 a blocked delete is reported and the session stays listed', async ({ page }) => {
    test.setTimeout(45_000);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
      const removeItem = Storage.prototype.removeItem;
      Storage.prototype.removeItem = function (key) {
        if (window.__blockRemove && String(key).startsWith('mxlStudio.idbFallback.sessions.slot-')) throw new DOMException('blocked', 'SecurityError');
        return removeItem.call(this, key);
      };
    });
    await openApp(page);
    await uploadFixture(page, 'f01-basic.musicxml');
    const modal = await openSessions(page);
    await modal.getByLabel('세션 이름', { exact: true }).fill('삭제 시험');
    await modal.getByRole('button', { name: '저장', exact: true }).click();
    const row = modal.locator('tr').filter({ hasText: '삭제 시험' });
    await expect(row).toHaveCount(1);
    await page.evaluate(() => { window.__blockRemove = true; });
    await row.getByRole('button', { name: '삭제', exact: true }).click();
    await modal.getByRole('button', { name: '확인', exact: true }).click();
    await expect(page.locator('.toast--err')).toContainText('세션을 완전히 삭제하지 못했습니다');
    await expect(page.locator('.toast--ok').filter({ hasText: '세션을 삭제했습니다' })).toHaveCount(0);
    await expect(row).toHaveCount(1);
    // 막힘이 풀리면 같은 세션을 다시 지울 수 있습니다.
    await page.evaluate(() => { window.__blockRemove = false; });
    await row.getByRole('button', { name: '삭제', exact: true }).click();
    await modal.getByRole('button', { name: '확인', exact: true }).click();
    await expect(row).toHaveCount(0);
  });
});
