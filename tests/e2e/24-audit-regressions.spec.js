// 2026-11-09 외부 검수 보고서(핵심 오류 B01~B10)의 재현 순서를 그대로 옮긴 회귀 스펙입니다.
// 보고서 "수정 순서 제안 4항" 여섯 사례 중 이 파일에 없는 것은 각 패널 스펙에 있습니다:
//   (2) divisions 1·100→300 템포 → panels/06-tempo.spec.js
//   (4) 미리보기 후 파일 변경 → panels/12-export.spec.js
//   (5) 동명 다른 확장자 ZIP → panels/12-export.spec.js
//   (6) 반복 중 A-B 해제 → 18-cursor.spec.js
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { openApp, openPanel, fixturesDir, uploadFixture, getPitches } from './helpers.js';

async function uploadMany(page, names) {
  await page.locator('input[type="file"]').setInputFiles(names.map((name) => path.join(fixturesDir, name)));
  await expect(page.locator('.file-entry')).toHaveCount(names.length);
  await page.waitForFunction((count) => window.__mxlGetState?.().files.length === count, names.length);
}
const fileSummary = (page, index) => page.evaluate((i) => {
  const file = window.__mxlGetState().files[i];
  const doc = file.xmlDoc;
  return {
    name: file.name,
    parts: doc.querySelectorAll('part-list score-part').length,
    partIds: Array.from(doc.querySelectorAll('part-list score-part'), (sp) => sp.getAttribute('id')),
    notes: doc.querySelectorAll('note').length,
    romans: doc.querySelectorAll('words[data-roman-analysis]').length,
    xml: file.xmlString,
  };
}, index);

// B01: 현재 파일 범위에서 두 번째 파일에 로마 숫자를 삽입하면 첫 파일 내용으로 덮어쓰던 회귀(Phase A A-8).
// 두 번째 파일은 화음이 확정되는 f04를 씁니다(A2-7부터 f02의 옥타브 유니슨 박은 화음이 아니라 삽입할 로마 숫자가 없음).
test('@panels B01 roman insert with active scope keeps the other file', async ({ page }) => {
  await openApp(page);
  await uploadMany(page, ['f01-basic.musicxml', 'f04-minor-harmony.musicxml']);
  await page.evaluate(() => window.__mxlSetActiveFile(1));
  const before0 = await fileSummary(page, 0);
  const panel = await openPanel(page, 'roman');
  await page.getByRole('group', { name: '도구 적용 대상' }).getByRole('button', { name: '현재 파일' }).click();
  await panel.getByRole('button', { name: '악보에 삽입', exact: true }).click();
  await expect(panel.locator('.result-log')).toContainText('적용 완료');
  const names = await page.evaluate(() => window.__mxlGetState().files.map((file) => file.name));
  expect(names).toEqual(['f01-basic.musicxml', 'f04-minor-harmony.musicxml']);
  const after1 = await fileSummary(page, 1);
  expect(after1.parts).toBe(1);
  expect(after1.notes).toBe(13);
  expect(after1.romans).toBe(4);
  const after0 = await fileSummary(page, 0);
  expect(after0.xml).toBe(before0.xml);
  expect(after0.romans).toBe(0);
  await expect(panel.locator('.result-log')).toContainText('f04-minor-harmony.musicxml');
  await expect(page.locator('.score-error')).toHaveCount(0);
});

// B02: 전체 범위 파트 추출에서 활성 파일의 파트 ID가 없는 다른 파일이 0파트가 되던 문제.
test('@panels B02 part extraction skips files without the kept part', async ({ page }) => {
  await openApp(page);
  await uploadMany(page, ['f02-two-parts.musicxml', 'f13-part-p99.musicxml']);
  await page.evaluate(() => window.__mxlSetActiveFile(0));
  const panel = await openPanel(page, 'parts');
  const toggle = page.getByRole('group', { name: '도구 적용 대상' });
  if (await toggle.isVisible()) await toggle.getByRole('button', { name: '전체 2개' }).click();
  await panel.getByRole('switch', { name: 'Violin 파트 유지' }).click();
  await panel.getByRole('button', { name: /추출 실행/ }).click();
  await expect(panel.locator('.result-log')).toContainText('건너뜁니다');
  await expect(panel.locator('.result-log')).toContainText('1파트 유지 (1파트 제거)');
  const f02 = await fileSummary(page, 0);
  expect(f02.partIds).toEqual(['P1']);
  expect(f02.notes).toBe(16);
  const f13 = await fileSummary(page, 1);
  expect(f13.partIds).toEqual(['P99']);
  expect(f13.notes).toBe(8);
  await page.evaluate(() => window.__mxlSetActiveFile(1));
  await expect(page.locator('.score-main-render svg')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.score-error')).toHaveCount(0);
});

async function transposeSemitones(page, panel, semitones) {
  await panel.getByRole('button', { name: '반음 단위 이동', exact: true }).click();
  await panel.locator('input[type="number"]').fill(String(semitones));
  await panel.getByRole('button', { name: /변환 실행/ }).click();
}

// B07: '모두 지우기'가 현재 악보까지 버려, 다음 편집을 되돌리면 지우기 전 상태로 돌아가지 못하던 문제.
test('@panels B07 history clear keeps a baseline', async ({ page }) => {
  await openApp(page);
  await uploadFixture(page, 'f01-basic.musicxml');
  expect((await getPitches(page, { measure: 1 }))[0]).toBe('C/4');
  const panel = await openPanel(page, 'transpose');
  await transposeSemitones(page, panel, 2);
  await expect.poll(async () => (await getPitches(page, { measure: 1 }))[0]).toBe('D/4');
  await page.locator('.history-panel__clear').click();
  await expect(page.locator('.history-panel__item')).toHaveCount(1);
  const undo = page.getByRole('button', { name: '실행 취소', exact: true });
  await expect(undo).toBeDisabled();
  await transposeSemitones(page, panel, 2);
  await expect.poll(async () => (await getPitches(page, { measure: 1 }))[0]).toBe('E/4');
  await expect(undo).toBeEnabled();
  await undo.click();
  await expect.poll(async () => (await getPitches(page, { measure: 1 }))[0]).toBe('D/4');
  await expect(page.locator('.history-panel__item--current')).toContainText('기준점 (지우기 전 상태)');
});

// C16: D.C./Fine 같은 이동 기호는 재생이 따르지 않는데 그 사실을 알리지 않던 문제.
test('@panels C16 player warns that navigation marks are not followed', async ({ page }) => {
  await openApp(page);
  await uploadFixture(page, 'f17-dacapo.musicxml');
  await expect(page.locator('.score-main-render svg')).toBeVisible();
  const warning = page.locator('.player__warning');
  await expect(warning).toHaveAttribute('role', 'status');
  await expect(warning).toContainText('D.C.');
  await expect(warning).toContainText('Fine');
  await expect(warning.locator('.player__warning-text')).toHaveText('⚠ 재생 미반영: Fine · D.C. al Fine');
  await expect(warning.locator('.visually-hidden')).toHaveText('반복 기호 Fine은(는) 재생에 반영되지 않습니다. 반복 기호 D.C. al Fine은(는) 재생에 반영되지 않습니다.');
  await expect(warning).toHaveAttribute('title', '반복 기호 Fine은(는) 재생에 반영되지 않습니다.\n반복 기호 D.C. al Fine은(는) 재생에 반영되지 않습니다.');
  await page.locator('input[type="file"]').setInputFiles(path.join(fixturesDir, 'f01-basic.musicxml'));
  await expect(page.locator('.file-entry')).toHaveCount(2);
  await page.evaluate(() => window.__mxlSetActiveFile(1));
  await expect(page.locator('.header__badge')).toContainText('현재: f01-basic.musicxml');
  await expect(page.locator('.player__warning')).toHaveCount(0);
});
