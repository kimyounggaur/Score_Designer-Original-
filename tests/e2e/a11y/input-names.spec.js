import { test, expect } from '@playwright/test';
import { openApp, uploadFixture, openPanel } from '../helpers.js';

// D15(2026-11-11 재검수): 편집 패널의 input·select·textarea가 모두 프로그램상 이름(label 연결 또는 aria-label·aria-labelledby)을 가져야 합니다.
// 화면에 보이는 문구가 옆에 있어도 label이 연결되지 않으면 스크린리더는 이름을 읽지 못합니다. placeholder와 title은 이름으로 치지 않습니다.
// 패널마다 보이는 입력만 검사하므로, 조건부로 나타나는 입력은 reveal 단계에서 먼저 드러냅니다(최소 개수 minControls로 드러났는지도 확인).
const scenarios = [
  { id: 'upload' },
  { id: 'transpose', reveal: (panel) => panel.getByRole('button', { name: '반음 단위 이동', exact: true }).click(), minControls: 1 },
  { id: 'keychange' },
  { id: 'capo' },
  { id: 'range', reveal: (panel) => panel.locator('select').first().selectOption('custom'), minControls: 3 },
  { id: 'instrument', reveal: (panel) => panel.locator('select').first().selectOption('custom_instr'), minControls: 2 },
  { id: 'tempo', minControls: 1 },
  { id: 'tempochange', minControls: 2 },
  { id: 'ossia', minControls: 5 },
  { id: 'clef', minControls: 1 },
  { id: 'parts' },
  { id: 'notation' },
  { id: 'export', minControls: 1 },
  { id: 'color' },
  { id: 'harmony', minControls: 1 },
  // 규칙 줄의 삭제 단추는 "✕" 글자뿐이라 이름을 따로 줘야 합니다.
  { id: 'chordtools', minControls: 2, reveal: (panel) => expect(panel.getByRole('button', { name: '코드 변경 규칙 1 삭제', exact: true })).toBeVisible() },
  { id: 'numbering', minControls: 1 },
  { id: 'lyricstyle', minControls: 1 },
  { id: 'chords' },
  { id: 'roman' },
  { id: 'stats' },
];

const controlsOf = (panel) => panel.evaluate((root) => {
  const named = (el) => Array.from(el.labels || []).some((label) => label.textContent.trim())
    || ['aria-label', 'aria-labelledby'].some((attr) => (el.getAttribute(attr) || '').trim() !== '');
  const visible = (el) => el.getClientRects().length > 0;
  const controls = Array.from(root.querySelectorAll('input, select, textarea')).filter((el) => el.type !== 'hidden' && visible(el));
  return { total: controls.length, unnamed: controls.filter((el) => !named(el)).map((el) => el.outerHTML.replace(/\s+/g, ' ').slice(0, 150)) };
});

test('@a11y D15 every visible input, select and textarea in the edit panels has a programmatic name', async ({ page }) => {
  test.setTimeout(120_000);
  await openApp(page);
  await uploadFixture(page, 'f02-two-parts.musicxml');
  const offenders = [];
  for (const { id, reveal, minControls = 0 } of scenarios) {
    await test.step(`panel ${id}`, async () => {
      const panel = await openPanel(page, id);
      await expect(panel).toBeVisible();
      await reveal?.(panel);
      const { total, unnamed } = await controlsOf(panel);
      expect(total, `${id} 패널에서 검사할 입력 수`).toBeGreaterThanOrEqual(minControls);
      unnamed.forEach((html) => offenders.push(`${id}: ${html}`));
    });
  }
  expect(offenders).toEqual([]);
});

test('@a11y D15 the player transport controls keep their names', async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page);
  await uploadFixture(page, 'f02-two-parts.musicxml');
  const player = page.locator('.midi-player');
  await expect(player).toBeVisible();
  const { total, unnamed } = await controlsOf(player);
  expect(total).toBeGreaterThan(5);
  expect(unnamed).toEqual([]);
});
