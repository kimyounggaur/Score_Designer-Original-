import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openApp, uploadFixture, openPanel, fixturesDir, getPitches } from './helpers.js';

// Phase B B-2: 음높이를 바꾸는 패널의 옥타브 범위 가드(V3), 타악기 파트 조표 보호(V4), TAB 프렛 경고(V5).
// 픽스처 f19-drums-tab: P1 기타(1마디 G4 = 3번 줄 0프렛, 4마디 C9 D9 E9 B9), P2 타악기(percussion 음자리표). 둘 다 C장조로 시작합니다.
const FIXTURE = 'f19-drums-tab.musicxml';

// 첫 파일의 문서 문자열·작업 기록 길이·파트별 조표·TAB 프렛을 한 번에 읽습니다. 가드가 막은 변환은 이 값이 그대로여야 합니다.
const snapshot = (page) => page.evaluate(() => {
  const state = window.__mxlGetState();
  const doc = state.files[0].xmlDoc;
  const keys = {};
  for (const part of doc.querySelectorAll('score-partwise > part')) {
    keys[part.getAttribute('id')] = Array.from(part.querySelectorAll('key fifths'), (node) => node.textContent);
  }
  return { xml: state.files[0].xmlString, history: state.history.length, keys, fret: doc.querySelector('technical fret')?.textContent ?? null };
});

async function semitoneRun(panel, semitones) {
  await panel.getByRole('button', { name: '반음 단위 이동', exact: true }).click();
  await panel.locator('input[type="number"]').fill(String(semitones));
  await panel.getByRole('button', { name: /변환 실행/ }).click();
}

test.describe('Phase B B-2 · 옥타브 범위 가드', () => {
  test('@panels transpose refuses out-of-range octaves', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const before = await snapshot(page);
    const panel = await openPanel(page, 'transpose');
    await semitoneRun(panel, 7); // 4마디 B9가 F♯10이 됩니다.
    const log = panel.locator('.result-log');
    await expect(log).toContainText('옥타브 0~9');
    await expect(log).toContainText('마디 4 F10');
    await expect(log).toContainText('적용된 파일이 없어');
    await expect(log).not.toContainText('적용 완료');
    // 원본 문서·작업 기록·조표·프렛이 모두 그대로입니다.
    expect(await snapshot(page)).toEqual(before);
  });

  test('@panels transpose with several files commits only the files that stay in range', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await page.locator('input[type="file"]').setInputFiles([path.join(fixturesDir, 'f01-basic.musicxml'), path.join(fixturesDir, FIXTURE)]);
    await expect(page.locator('.file-entry')).toHaveCount(2);
    await page.waitForFunction(() => window.__mxlGetState?.().files.length === 2);
    const before = await page.evaluate(() => {
      window.__rangeBefore = window.__mxlGetState().files.slice();
      return { xml: window.__mxlGetState().files[1].xmlString, history: window.__mxlGetState().history.length };
    });
    const panel = await openPanel(page, 'transpose');
    await semitoneRun(panel, 7);
    const log = panel.locator('.result-log');
    await expect(log).toContainText('적용 완료');
    await expect(log).toContainText('✓ f01-basic');
    await expect(log).toContainText('⚠ f19-drums-tab');
    const after = await page.evaluate(() => {
      const state = window.__mxlGetState();
      return { sameF01: state.files[0] === window.__rangeBefore[0], sameF19: state.files[1] === window.__rangeBefore[1], xml: state.files[1].xmlString, history: state.history.length };
    });
    expect(after.sameF01).toBe(false);          // 범위 안인 파일은 옮겨졌고
    expect(after.sameF19).toBe(true);           // 범위를 넘는 파일은 같은 객체 그대로입니다.
    expect(after.xml).toBe(before.xml);
    expect(after.history).toBe(before.history + 1);
  });

  test('@panels transpose all 12 keeps out-of-range keys out of the ZIP and names them in the log', async ({ page }) => {
    test.setTimeout(60_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const before = await snapshot(page);
    const panel = await openPanel(page, 'transpose');
    await panel.getByRole('button', { name: '12개 장조 모두', exact: true }).click();
    const downloadEvent = page.waitForEvent('download');
    await panel.getByRole('button', { name: /변환 실행/ }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('transposed_12keys.zip');
    const base64 = (await readFile(await download.path())).toString('base64');
    const zip = await page.evaluate(async (text) => {
      const archive = await window.JSZip.loadAsync(text, { base64: true });
      const names = Object.keys(archive.files).filter((name) => !archive.files[name].dir).sort();
      const keys = {};
      for (const name of names) {
        const inner = await window.JSZip.loadAsync(await archive.file(name).async('uint8array'));
        const score = new DOMParser().parseFromString(await inner.file('score.xml').async('string'), 'text/xml');
        keys[name] = {};
        for (const part of score.querySelectorAll('score-partwise > part')) {
          keys[name][part.getAttribute('id')] = Array.from(part.querySelectorAll('key fifths'), (node) => node.textContent);
        }
      }
      return { names, keys };
    }, base64);
    // B9가 있으므로 올라가는 6개 조(D♭ D E♭ E F F♯/G♭)는 빠지고, C와 내려가는 5개 조만 남습니다.
    const stem = 'f19-drums-tab';
    const kept = ['C', 'G', 'Ab', 'A', 'Bb', 'B'].map((key) => `${stem}/${stem}_${key}.mxl`).sort();
    expect(zip.names).toEqual(kept);
    // 타악기 파트(P2)의 조표는 어느 조에서도 0이고, 기타(P1)는 조에 맞게 바뀌었습니다.
    for (const name of zip.names) expect(zip.keys[name].P2, name).toEqual(['0']);
    expect(zip.keys[`${stem}/${stem}_G.mxl`].P1).toEqual(['1']);
    const lines = (await panel.locator('.result-log').innerText()).split('\n').map((line) => line.trim());
    // ZIP 항목 수 = ✓ 줄 수, 빠진 조는 모두 ⚠ 줄에 이름이 적힙니다(규칙 J-3).
    expect(lines.filter((line) => line.startsWith('✓'))).toHaveLength(kept.length);
    const skipped = lines.filter((line) => line.startsWith('⚠') && line.includes('ZIP에 넣지 않았습니다'));
    expect(skipped).toHaveLength(12 - kept.length);
    for (const key of ['D♭', 'D', 'E♭', 'E', 'F', 'F#/G♭']) expect(skipped.some((line) => line.includes(`→ ${key}:`)), key).toBe(true);
    expect(lines.some((line) => line.includes('6개 .mxl') && line.includes('범위를 벗어난 6개 조는 제외'))).toBe(true);
    expect(lines.some((line) => line.includes('타악기 파트 1개는 조표를 바꾸지 않았습니다'))).toBe(true);
    expect(lines.some((line) => line.includes('TAB 프렛 표기 1개는 바뀌지 않습니다'))).toBe(true);
    // ZIP만 내려받을 뿐 열린 악보와 작업 기록은 바뀌지 않습니다.
    expect(await snapshot(page)).toEqual(before);
  });

  test('@panels harmony thirds refuse out-of-range octaves', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const before = await snapshot(page);
    const panel = await openPanel(page, 'harmony');
    await panel.getByRole('button', { name: '3도 위', exact: true }).click();
    await panel.getByRole('button', { name: /화성 쌓기 실행/ }).click();
    const log = panel.locator('.result-log');
    await expect(log).toContainText('옥타브 0~9');
    await expect(log).toContainText('마디 4 D10'); // B9의 3도 위
    await expect(log).not.toContainText('적용 완료');
    expect(await snapshot(page)).toEqual(before);
  });

  test('@panels range panel refuses a custom range that would push notes past octave 9', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const before = await snapshot(page);
    const panel = await openPanel(page, 'range');
    await panel.locator('select').selectOption('custom');
    await panel.locator('input.form-input--mono').nth(0).fill('C11');
    await panel.locator('input.form-input--mono').nth(1).fill('C12');
    await panel.getByRole('button', { name: /음역대 조정 실행/ }).click();
    const log = panel.locator('.result-log');
    await expect(log).toContainText('옥타브 0~9');
    await expect(log).not.toContainText('적용 완료');
    expect(await snapshot(page)).toEqual(before);
  });

  test('@panels transposing instrument refuses a shift that leaves the octave range', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    const before = await snapshot(page);
    const panel = await openPanel(page, 'instrument');
    await panel.locator('select').selectOption('custom_instr');
    await panel.locator('input[type="number"]').fill('12');
    await panel.getByRole('button', { name: /이조 변환 실행/ }).click();
    const log = panel.locator('.result-log');
    await expect(log).toContainText('옥타브 0~9');
    await expect(log).not.toContainText('적용 완료');
    expect(await snapshot(page)).toEqual(before);
  });
});

// 타악기 파트의 조표는 조옮김·카포·조바꿈 어느 경로로도 바뀌지 않고, 기타(P1)는 정상적으로 바뀝니다.
// TAB 프렛 음표(1마디 G4)가 옮겨지는 경로(조옮김·카포)에서는 프렛이 그대로라는 경고가 남고, 그 음표를 건드리지 않는 3~4마디 조바꿈에서는 남지 않습니다.
const percussionCases = [
  { name: 'transpose', panel: 'transpose', tab: true, run: (panel) => semitoneRun(panel, -5) },
  { name: 'capo', panel: 'capo', tab: true, run: async (panel) => {
    await panel.locator('input[type=number]').fill('1');
    await panel.locator('select').selectOption('2');
    await panel.getByRole('button', { name: /카포 적용 실행/ }).click();
  } },
  { name: 'keychange', panel: 'keychange', tab: false, run: async (panel) => {
    await panel.locator('input[type=number]').fill('3');
    await panel.locator('select').selectOption('7');
    await panel.getByRole('button', { name: /조바꿈 실행/ }).click();
  } },
];

test.describe('Phase B B-2 · 타악기 조표 보호와 TAB 경고', () => {
  for (const row of percussionCases) {
    test(`@panels percussion key stays after ${row.name}`, async ({ page }) => {
      test.setTimeout(45_000);
      await openApp(page);
      await uploadFixture(page, FIXTURE);
      const before = await snapshot(page);
      expect(before.keys).toEqual({ P1: ['0'], P2: ['0'] });
      const panel = await openPanel(page, row.panel);
      await row.run(panel);
      const log = panel.locator('.result-log');
      await expect(log).toContainText('적용 완료');
      await expect(log).toContainText('타악기 파트 1개는 조표를 바꾸지 않았습니다');
      if (row.tab) await expect(log).toContainText('TAB 프렛 표기 1개는 바뀌지 않습니다');
      else await expect(log).not.toContainText('TAB 프렛');
      const after = await snapshot(page);
      expect(after.history).toBe(before.history + 1);
      expect(after.keys.P2).toEqual(['0']);                    // 타악기: 바뀌지도, 새로 삽입되지도 않음
      expect(after.keys.P1).not.toEqual(['0']);                // 기타: 조표가 바뀜(조바꿈은 3마디에 key가 새로 들어감)
      expect(after.fret).toBe('0');                            // 프렛은 고쳐 쓰지 않고 경고만 합니다.
    });
  }

  test('@panels TAB note keeps its fret while its pitch moves, and the log says so', async ({ page }) => {
    test.setTimeout(45_000);
    await openApp(page);
    await uploadFixture(page, FIXTURE);
    expect((await getPitches(page, { measure: 1, part: 'P1' }))[0]).toBe('G/4');
    const panel = await openPanel(page, 'transpose');
    await semitoneRun(panel, -5);
    await expect(panel.locator('.result-log')).toContainText('줄·프렛을 직접 확인하세요');
    expect((await getPitches(page, { measure: 1, part: 'P1' }))[0]).toBe('D/4');
    expect((await snapshot(page)).fret).toBe('0');
  });
});
