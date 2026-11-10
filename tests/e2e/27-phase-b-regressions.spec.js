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

// Phase B B-6: 뷰어는 OSMD 자체 autoResize를 쓰지 않습니다(첫 렌더 직후 한 번 더 그려 불러오기가 두 배로 걸렸습니다, P1).
// 렌더 횟수는 테스트 훅 window.__mxlRenderCount(ScoreView의 OSMD 인스턴스가 render()를 부를 때마다 +1, OSMD 내부 호출 포함)의 증가분으로 셉니다.
const renderCount = (page) => page.evaluate(() => window.__mxlRenderCount || 0);
const viewerSvgWidth = (page) => page.evaluate(() => parseFloat(document.querySelector('.score-main-render svg')?.getAttribute('width')) || 0);
const viewerBoxWidth = (page) => page.evaluate(() => document.querySelector('.score-main-render').clientWidth);
const LONG_FIXTURE = 'f18-long-64.musicxml';

async function openLongFixture(page) {
  await openApp(page);
  expect(await renderCount(page)).toBe(0); // 파일을 열기 전에는 그린 적이 없습니다.
  await uploadFixture(page, LONG_FIXTURE);
  await expect(page.locator('.score-main-render svg').first()).toBeVisible();
}

// 음표 수가 LONG_SCORE_NOTES(2,000) 이상인 한 파트짜리 악보. 4분음표 6음 화음 4개 × 마디 수.
function longScoreXml(measures) {
  const chord = [['C', 4], ['E', 4], ['G', 4], ['B', 4], ['D', 5], ['F', 5]];
  const note = ([step, octave], index) => `<note>${index > 0 ? '<chord/>' : ''}<pitch><step>${step}</step><octave>${octave}</octave></pitch><duration>1</duration><type>quarter</type></note>`;
  const beat = chord.map(note).join('');
  const attributes = '<attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes>';
  const body = Array.from({ length: measures }, (_, index) => `<measure number="${index + 1}">${index === 0 ? attributes : ''}${beat.repeat(4)}</measure>`).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><score-partwise version="4.0"><work><work-title>Long chords</work-title></work><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
}

test.describe('Phase B B-6 · 뷰어 이중 렌더 제거', () => {
  test('@panels viewer renders once per load', async ({ page }) => {
    test.setTimeout(45_000);
    await openLongFixture(page);
    await page.waitForTimeout(1500); // autoResize가 켜져 있으면 첫 렌더 직후 한 번 더 그리는 시간
    expect(await renderCount(page)).toBe(1);
  });

  test('@panels viewer renders once per zoom step', async ({ page }) => {
    test.setTimeout(45_000);
    await openLongFixture(page);
    await expect.poll(() => renderCount(page)).toBe(1);
    const zoomIn = page.getByRole('button', { name: '악보 확대', exact: true });
    await zoomIn.click();
    await expect(page.getByRole('button', { name: '악보 확대율 초기화' })).toHaveText('110%');
    await expect.poll(() => renderCount(page)).toBe(2);
    await page.waitForTimeout(1000);
    expect(await renderCount(page)).toBe(2);
    await zoomIn.click();
    await expect.poll(() => renderCount(page)).toBe(3);
    await page.waitForTimeout(1000);
    expect(await renderCount(page)).toBe(3);
  });

  test('@panels window resize triggers one debounced render and fits the new width', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openLongFixture(page);
    await expect.poll(() => renderCount(page)).toBe(1);
    const before = { count: await renderCount(page), svg: await viewerSvgWidth(page), box: await viewerBoxWidth(page) };
    expect(Math.abs(before.svg - before.box)).toBeLessThanOrEqual(2); // 첫 렌더가 상자 폭에 맞게 그려졌습니다.
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect.poll(() => renderCount(page), { timeout: 10_000 }).toBe(before.count + 1);
    await page.waitForTimeout(1000);
    expect((await renderCount(page)) - before.count).toBe(1); // 두 번 바꿨어도 디바운스되어 한 번만
    const after = { svg: await viewerSvgWidth(page), box: await viewerBoxWidth(page) };
    expect(after.box).toBeLessThan(before.box);
    expect(after.svg).toBeLessThan(before.svg);
    expect(Math.abs(after.svg - after.box)).toBeLessThanOrEqual(2);
  });

  test('@panels panel toggle re-renders once and uses the freed width', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openLongFixture(page);
    await expect.poll(() => renderCount(page)).toBe(1);
    const before = { count: await renderCount(page), svg: await viewerSvgWidth(page) };
    await page.keyboard.press('Control+b'); // 왼쪽 패널 닫기
    await expect(page.locator('.app-root--left-closed')).toHaveCount(1);
    await expect.poll(() => renderCount(page), { timeout: 10_000 }).toBe(before.count + 1);
    await page.waitForTimeout(1000);
    expect((await renderCount(page)) - before.count).toBe(1);
    const closed = await viewerSvgWidth(page);
    expect(closed).toBeGreaterThan(before.svg);
    expect(Math.abs(closed - (await viewerBoxWidth(page)))).toBeLessThanOrEqual(2);
    await page.keyboard.press('Control+b'); // 다시 열면 원래 폭으로 한 번 더
    await expect.poll(() => renderCount(page), { timeout: 10_000 }).toBe(before.count + 2);
    await page.waitForTimeout(1000);
    expect((await renderCount(page)) - before.count).toBe(2);
    expect(await viewerSvgWidth(page)).toBeLessThan(closed);
  });

  test('@panels a width change under 4px does not re-render', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openLongFixture(page);
    await expect.poll(() => renderCount(page)).toBe(1);
    const box = await viewerBoxWidth(page);
    await page.setViewportSize({ width: 1438, height: 900 }); // 악보 영역이 2px 좁아집니다.
    await expect.poll(() => viewerBoxWidth(page)).toBe(box - 2);
    await page.waitForTimeout(1000);
    expect(await renderCount(page)).toBe(1);
  });

  test('@panels a width change during playback waits for stop, keeps the cursor, then renders once', async ({ page }) => {
    test.setTimeout(45_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await uploadFixture(page, 'f08-repeats-tempo.musicxml');
    await expect(page.locator('.score-main-render svg')).toBeVisible();
    await expect.poll(() => renderCount(page)).toBe(1);
    await page.getByTitle('재생', { exact: true }).click();
    const cursor = page.locator('.score-main-render img[id^="cursorImg"]');
    await expect(cursor).toBeVisible();
    const before = await renderCount(page);
    const box = await viewerBoxWidth(page);
    await page.setViewportSize({ width: 1100, height: 900 });
    await expect.poll(() => viewerBoxWidth(page)).toBeLessThan(box);
    await page.waitForTimeout(1000); // 디바운스(250ms)가 지난 뒤에도
    expect(await renderCount(page)).toBe(before); // 재생 중에는 그리지 않고
    await expect(cursor).toBeVisible(); // 커서도 그대로입니다.
    await page.getByTitle('정지', { exact: true }).click();
    await expect.poll(() => renderCount(page), { timeout: 10_000 }).toBe(before + 1); // 정지하면 한 번 그립니다.
    await page.waitForTimeout(1000);
    expect(await renderCount(page)).toBe(before + 1);
    expect(Math.abs((await viewerSvgWidth(page)) - (await viewerBoxWidth(page)))).toBeLessThanOrEqual(2);
  });
});

test.describe('Phase B B-6 · 긴 악보 진행 표시', () => {
  // 한 파트 · 6음 화음 4개 × 90마디 = 2,160음. 렌더 한 번에 1초 안팎이 걸립니다.
  const LONG_XML = longScoreXml(90);
  const longUpload = (page) => page.locator('input[type="file"]').setInputFiles({ name: 'long-chords.musicxml', mimeType: 'application/xml', buffer: Buffer.from(LONG_XML) });

  test('@panels long score shows the progress message while it renders, then hides it', async ({ page }) => {
    test.setTimeout(90_000);
    await openApp(page);
    await page.evaluate(() => {
      const overlay = document.querySelector('.progress-overlay');
      window.__progressLog = [];
      new MutationObserver(() => window.__progressLog.push({
        visible: !overlay.classList.contains('progress-overlay--hidden'),
        text: overlay.querySelector('.progress-message').textContent,
      })).observe(overlay, { attributes: true, childList: true, subtree: true, characterData: true });
    });
    await longUpload(page);
    await expect(page.locator('.score-main-render svg').first()).toBeVisible({ timeout: 60_000 });
    const noteCount = await page.evaluate(() => window.__mxlGetState().files[0].xmlDoc.getElementsByTagName('note').length);
    expect(noteCount).toBeGreaterThanOrEqual(2000);
    await expect.poll(() => page.evaluate(() => window.__progressLog.at(-1)?.visible)).toBe(false);
    const log = await page.evaluate(() => window.__progressLog);
    expect(log.some((entry) => entry.visible && entry.text === '악보를 그리는 중...')).toBe(true);
    expect(await renderCount(page)).toBe(1); // 진행 표시를 거쳐도 렌더는 한 번
  });

  test('@panels zoom clicks in a burst render only the last value of a long score', async ({ page }) => {
    test.setTimeout(90_000);
    await openApp(page);
    await longUpload(page);
    await expect(page.locator('.score-main-render svg').first()).toBeVisible({ timeout: 60_000 });
    await expect.poll(() => renderCount(page)).toBe(1);
    // 한 프레임 양보(requestAnimationFrame)를 붙잡아 두고 확대를 세 번 누른 뒤 한꺼번에 풀어 줍니다. 앞의 두 요청은 물러나야 합니다.
    await page.evaluate(async () => {
      window.__heldFrames = [];
      window.requestAnimationFrame = (callback) => { window.__heldFrames.push(callback); return 0; };
      const zoomIn = document.querySelector('.score-zoom [aria-label="악보 확대"]');
      for (let index = 0; index < 3; index += 1) {
        zoomIn.click();
        await new Promise((resolve) => setTimeout(resolve, 30)); // React가 상태·effect를 반영할 시간
      }
    });
    await expect(page.getByRole('button', { name: '악보 확대율 초기화' })).toHaveText('130%');
    await expect(page.locator('.progress-overlay:not(.progress-overlay--hidden)')).toHaveCount(1); // 기다리는 동안 진행 표시가 떠 있음
    expect(await renderCount(page)).toBe(1); // 아직 아무도 그리지 않았습니다.
    await page.evaluate(() => window.__heldFrames.splice(0).forEach((callback) => callback(performance.now())));
    await expect.poll(() => renderCount(page), { timeout: 30_000 }).toBe(2);
    await expect(page.locator('.progress-overlay--hidden')).toHaveCount(1);
    await page.waitForTimeout(1500);
    expect(await renderCount(page)).toBe(2); // 세 번 눌렀어도 마지막 값 한 번만
  });
});

// Phase B B-7: 높이 없는 타악기(unpitched) 파트는 재생 이벤트가 0개라 소리가 나지 않는데 알리지 않던 문제(R1).
// 플레이어의 "재생 미반영" 줄이 따르지 못한 이동 기호와 소리 없는 타악기 파트를 함께 보여 줍니다.
test.describe('Phase B B-7 · 재생: 타악기 안내', () => {
  test('@panels unpitched part is reported as muted', async ({ page }) => {
    await openApp(page);
    await uploadFixture(page, 'f19-drums-tab.musicxml');
    await expect(page.locator('.score-main-render svg').first()).toBeVisible();
    const warning = page.locator('.player__warning');
    await expect(warning).toHaveAttribute('role', 'status');
    await expect(warning).toContainText('타악기');
    await expect(warning.locator('.player__warning-text')).toHaveText('⚠ 재생 미반영: 타악기 Drums');
    await expect(warning.locator('.visually-hidden')).toHaveText('타악기 파트 Drums은(는) 재생되지 않습니다.');
    await expect(warning).toHaveAttribute('title', '타악기 파트 Drums은(는) 재생되지 않습니다.');
    // 소리가 나는 기타 파트는 그대로 재생 이벤트가 있고, 타악기 파트는 0개입니다.
    const counts = await page.evaluate(() => {
      const events = PlaybackCore.extractPlaybackData(window.__mxlGetState().files[0].xmlDoc).events;
      return { guitar: events.filter((event) => event.partId === 'P1').length, drums: events.filter((event) => event.partId === 'P2').length };
    });
    expect(counts.drums).toBe(0);
    expect(counts.guitar).toBeGreaterThan(0);
  });

  test('@panels the warning line shows unfollowed marks and muted parts together', async ({ page }) => {
    // f19의 기타 2마디 첫머리에 segno 없는 D.S.를 넣은 문서: 되돌아갈 곳이 없어 점프하지 않고, 타악기 파트는 소리가 없습니다.
    const source = await readFile(path.join(fixturesDir, 'f19-drums-tab.musicxml'), 'utf8');
    const withJump = source.replace('<measure number="2">', '<measure number="2"><direction placement="above"><direction-type><words>D.S.</words></direction-type><sound dalsegno="s1"/></direction>');
    expect(withJump).not.toBe(source);
    await openApp(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'f19-ds-without-segno.musicxml', mimeType: 'application/vnd.recordare.musicxml+xml', buffer: Buffer.from(withJump) });
    await expect(page.locator('.score-main-render svg').first()).toBeVisible();
    const warning = page.locator('.player__warning');
    await expect(warning.locator('.player__warning-text')).toHaveText('⚠ 재생 미반영: D.S. · 타악기 Drums');
    await expect(warning.locator('.visually-hidden')).toHaveText('반복 기호 D.S.은(는) 재생에 반영되지 않습니다. 타악기 파트 Drums은(는) 재생되지 않습니다.');
  });
});
