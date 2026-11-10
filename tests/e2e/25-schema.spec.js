import { test, expect } from '@playwright/test';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { openApp, uploadFixture, openPanel, openHeaderAction, waitForScore, fixturesDir } from './helpers.js';
import { schemaSupport, validateMusicXml, validateOpenFiles } from './schema-validate.js';

// Phase B B-1: 모든 패널의 결과가 MusicXML 4.0 스키마를 지키는지 표 하나로 확인합니다(V1·V2 재발 방지).
// 행을 추가하려면 {name, fixture, panel, run} 한 줄만 넣으면 됩니다. run은 패널을 조작만 하고,
// 커밋 여부와 스키마 검증은 아래 공통 코드가 맡습니다. 검증 엔진이 없는 환경에서는 건너뜁니다(tests/e2e/schema-validate.js).
let support = { ok: false, reason: '검증 엔진을 아직 확인하지 않았습니다.' };
test.beforeAll(async () => { support = await schemaSupport(); });

const historyLength = (page) => page.evaluate(() => window.__mxlGetState().history.length);

const rows = [
  // 조옮김·조바꿈·이조
  { name: 'transpose to a key', fixture: 'f04-minor-harmony.musicxml', panel: 'transpose', run: async (panel) => {
    await panel.getByRole('button', { name: 'Bm', exact: true }).click();
    await panel.getByRole('button', { name: /변환 실행/ }).click();
  } },
  { name: 'transpose +2 semitones', fixture: 'f01-basic.musicxml', panel: 'transpose', run: async (panel) => {
    await panel.getByRole('button', { name: '반음 단위 이동', exact: true }).click();
    await panel.locator('input[type="number"]').fill('2');
    await panel.getByRole('button', { name: /변환 실행/ }).click();
  } },
  { name: 'keychange per measure', fixture: 'f02-two-parts.musicxml', panel: 'keychange', run: async (panel) => {
    await panel.locator('input[type=number]').fill('3');
    await panel.locator('select').selectOption('7');
    await panel.getByRole('button', { name: /조바꿈 실행/ }).click();
  } },
  { name: 'capo', fixture: 'f04-minor-harmony.musicxml', panel: 'capo', run: async (panel) => {
    await panel.locator('input[type=number]').fill('1');
    await panel.locator('select').selectOption('2');
    await panel.getByRole('button', { name: /카포 적용 실행/ }).click();
  } },
  { name: 'range (kalimba)', fixture: 'f01-basic.musicxml', panel: 'range', run: async (panel) => {
    await panel.locator('select').selectOption('kalimba');
    await panel.getByRole('button', { name: /음역대 조정 실행/ }).click();
  } },
  { name: 'transposing instrument', fixture: 'f01-basic.musicxml', panel: 'instrument', run: async (panel) => {
    await panel.getByRole('button', { name: '실음 → 이조 악보', exact: true }).click();
    await panel.locator('select').selectOption('bb_clarinet');
    await panel.getByRole('button', { name: /이조 변환 실행/ }).click();
  } },
  // 템포
  { name: 'tempo', fixture: 'f01-basic.musicxml', panel: 'tempo', run: async (panel) => {
    await panel.locator('.tempo-slider').fill('90');
    await panel.getByRole('button', { name: /템포 변경 실행/ }).click();
  } },
  { name: 'tempo change per measure', fixture: 'f01-basic.musicxml', panel: 'tempochange', run: async (panel) => {
    await panel.locator('input[type=number]').nth(0).fill('2');
    await panel.locator('input[type=number]').nth(1).fill('60');
    await panel.getByRole('button', { name: /템포 변경 실행/ }).click();
  } },
  // Ossia는 별도 MusicXML 문자열(file.ossiaMxml)을 만들므로 그것도 검증합니다.
  { name: 'ossia', fixture: 'f01-basic.musicxml', panel: 'ossia', run: async (panel) => {
    await panel.locator('.measure-input').nth(1).fill('2');
    await panel.getByRole('button', { name: '▶ Ossia 추가', exact: true }).click();
  }, extra: async (page) => page.evaluate(() => (window.__mxlGetState().files || [])
    .filter((file) => file.ossiaMxml).map((file) => ({ name: `${file.name} (Ossia)`, xml: file.ossiaMxml }))) },
  // 음자리표·파트·표기 변환
  { name: 'clef', fixture: 'f01-basic.musicxml', panel: 'clef', run: async (panel) => {
    await panel.getByText('F 음자리표', { exact: true }).click();
    await panel.getByRole('button', { name: /변환 실행/ }).click();
  } },
  { name: 'parts extraction', fixture: 'f02-two-parts.musicxml', panel: 'parts', run: async (panel) => {
    await panel.getByRole('switch', { name: 'Piano 파트 유지' }).click();
    await panel.getByRole('button', { name: /추출 실행/ }).click();
  } },
  { name: 'notation: hide chord symbols', fixture: 'f04-minor-harmony.musicxml', panel: 'notation', run: async (panel) => {
    await panel.getByRole('switch', { name: '코드 심볼 숨기기' }).click();
    await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  } },
  { name: 'notation: hide lyrics', fixture: 'f06-lyrics-ties.musicxml', panel: 'notation', run: async (panel) => {
    await panel.getByRole('switch', { name: '가사 숨기기' }).click();
    await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  } },
  { name: 'notation: remove a part', fixture: 'f02-two-parts.musicxml', panel: 'notation', run: async (panel) => {
    await panel.getByRole('switch', { name: 'Piano 파트 제거(출력에서 삭제)' }).click();
    await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  } },
  { name: 'notation: one-line staff', fixture: 'f01-basic.musicxml', panel: 'notation', run: async (panel) => {
    await panel.getByRole('switch', { name: '1줄 보표 변환' }).click();
    await panel.getByRole('button', { name: '임시표 제거', exact: true }).click();
    await panel.getByRole('button', { name: '조표 초기화', exact: true }).click();
    await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  } },
  { name: 'notation: slash notes', fixture: 'f04-minor-harmony.musicxml', panel: 'notation', run: async (panel) => {
    await panel.getByRole('switch', { name: '슬래시 음표 변환' }).click();
    await panel.getByRole('button', { name: '음높이 B4 통일', exact: true }).click();
    await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  } },
  // 색깔 악보 (V1)
  { name: 'color notes', fixture: 'f01-basic.musicxml', panel: 'color', run: async (panel) => {
    await panel.getByRole('button', { name: /색깔 악보 생성/ }).click();
  } },
  { name: 'color notes with stems', fixture: 'f01-basic.musicxml', panel: 'color', run: async (panel) => {
    await panel.getByRole('button', { name: '기둥(Stem) 색상', exact: true }).click();
    await panel.getByRole('button', { name: /색깔 악보 생성/ }).click();
  } },
  // 화성·코드
  { name: 'harmony thirds', fixture: 'f01-basic.musicxml', panel: 'harmony', run: async (panel) => {
    await panel.getByRole('button', { name: '3도 위', exact: true }).click();
    await panel.getByRole('button', { name: /화성 쌓기 실행/ }).click();
  } },
  { name: 'chord tools: batch rename', fixture: 'f04-minor-harmony.musicxml', panel: 'chordtools', run: async (panel) => {
    await panel.getByPlaceholder('원본 (예: Am)').fill('Am');
    await panel.getByPlaceholder('변경 (예: Am7)').fill('Cm');
    await panel.getByRole('button', { name: /코드 일괄 변경/ }).click();
  } },
  { name: 'chord tools: inversion', fixture: 'f11-chords-inversion.musicxml', panel: 'chordtools', run: async (panel) => {
    await panel.getByRole('button', { name: '1st inversion', exact: true }).click();
    await panel.getByRole('button', { name: /자리바꿈 적용/ }).click();
  } },
  { name: 'chord tools: auto insert', fixture: 'f04-minor-harmony.musicxml', panel: 'chordtools', run: async (panel) => {
    await panel.getByRole('button', { name: '기존 코드 덮어쓰기', exact: true }).click();
    await panel.getByRole('button', { name: /코드 분석 & 삽입/ }).click();
  } },
  // 숫자 악보 (각 모드)
  ...[['고정 도법 (C=1)', 'fixed'], ['이동 도법', 'movable'], ['한국어 계이름', 'korean']].map(([label, id]) => ({
    name: `numbering: ${id}`, fixture: 'f01-basic.musicxml', panel: 'numbering', run: async (panel) => {
      await panel.getByRole('button', { name: label, exact: true }).click();
      await panel.getByRole('button', { name: /숫자 악보 생성/ }).click();
    },
  })),
  // 가사 스타일: 서식과 계이름 색(V1)
  { name: 'lyric style: font', fixture: 'f06-lyrics-ties.musicxml', panel: 'lyricstyle', run: async (panel) => {
    await panel.locator('input[type=number]').fill('14');
    await panel.getByRole('button', { name: 'Bold', exact: true }).click();
    await panel.getByRole('button', { name: /가사 스타일 적용/ }).click();
  } },
  { name: 'lyric style: color by pitch', fixture: 'f06-lyrics-ties.musicxml', panel: 'lyricstyle', run: async (panel) => {
    await panel.getByRole('button', { name: /계이름 색상 적용/ }).click();
  } },
  // 로마 숫자 삽입 (V2)
  { name: 'roman numerals insert', fixture: 'f04-minor-harmony.musicxml', panel: 'roman', run: async (panel) => {
    await panel.getByRole('button', { name: '악보에 삽입', exact: true }).click();
  } },
];

test.describe('MusicXML 4.0 schema', () => {
  for (const row of rows) {
    test(`@panels schema ${row.name}`, async ({ page }) => {
      test.setTimeout(60_000);
      test.skip(!support.ok, support.reason);
      await openApp(page);
      await uploadFixture(page, row.fixture);
      const before = await historyLength(page);
      const panel = await openPanel(page, row.panel);
      await row.run(panel, page);
      // 패널이 실제로 악보를 커밋했는지부터 확인합니다(아무 일도 안 한 채 통과하는 것을 막습니다).
      await expect.poll(() => historyLength(page), { message: `${row.name}: 패널 실행이 작업 기록을 남겨야 합니다` }).toBeGreaterThan(before);
      for (const result of await validateOpenFiles(page)) {
        expect(result.errors, `${row.name}: ${result.name}`).toEqual([]);
      }
      for (const extra of (await row.extra?.(page)) || []) {
        expect(await validateMusicXml(extra.xml), `${row.name}: ${extra.name}`).toEqual([]);
      }
    });
  }

  test('@panels schema every fixture is valid as imported', async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!support.ok, support.reason);
    await openApp(page);
    const names = (await readdir(fixturesDir)).filter((name) => /\.(musicxml|xml|mxl)$/i.test(name)).sort();
    await page.locator('input[type="file"]').setInputFiles(names.map((name) => path.join(fixturesDir, name)));
    await expect(page.locator('.file-entry')).toHaveCount(names.length);
    for (const result of await validateOpenFiles(page)) {
      expect(result.errors, result.name).toEqual([]);
    }
  });
});

// 구버전이 words에 붙이던 data-roman-analysis 속성은 MusicXML 4.0 위반입니다. 예전 파일을 열어도 표준 id 표식으로 바뀌고,
// 로마 숫자를 다시 삽입하면 이전 표식이 중복 없이 교체되어야 합니다(Phase B V2, E3).
const LEGACY_WORDS = '<direction placement="above"><direction-type><words font-size="12" font-weight="bold" data-roman-analysis="true">i</words></direction-type></direction>';
async function legacyScoreXml() {
  const base = await readFile(path.join(fixturesDir, 'f04-minor-harmony.musicxml'), 'utf8');
  const marked = base.replace('<measure number="1">', `<measure number="1">${LEGACY_WORDS}`);
  expect(marked).not.toBe(base);
  return marked;
}
const romanState = (page) => page.evaluate(() => {
  const file = window.__mxlGetState().files[0];
  return {
    stringLegacy: file.xmlString.includes('data-roman-analysis'),
    docLegacy: file.xmlDoc.querySelectorAll('[data-roman-analysis]').length,
    ids: Array.from(file.xmlDoc.querySelectorAll('words[id^="mxl-roman-"]'), (words) => words.getAttribute('id')),
    texts: Array.from(file.xmlDoc.querySelectorAll('words[id^="mxl-roman-"]'), (words) => words.textContent),
  };
});

test.describe('legacy roman markers', () => {
  test('@panels schema legacy file is migrated on upload and replaced on re-insert', async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!support.ok, support.reason);
    await openApp(page);
    await page.locator('input[type="file"]').setInputFiles({ name: 'legacy-roman.musicxml', mimeType: 'application/xml', buffer: Buffer.from(await legacyScoreXml()) });
    await waitForScore(page);
    const uploaded = await romanState(page);
    expect(uploaded).toMatchObject({ stringLegacy: false, docLegacy: 0, ids: ['mxl-roman-1-1'], texts: ['i'] });
    for (const result of await validateOpenFiles(page)) expect(result.errors, result.name).toEqual([]);

    const panel = await openPanel(page, 'roman');
    await panel.getByRole('button', { name: '악보에 삽입', exact: true }).click();
    await expect(panel.locator('.result-log')).toContainText('적용 완료');
    const inserted = await romanState(page);
    // f04는 4마디 모두 화음이 확정되므로 마디마다 하나씩, 예전 표식은 남지 않고 id는 모두 다릅니다.
    expect(inserted.texts).toEqual(['i', 'iv', 'V7', 'i']);
    expect(new Set(inserted.ids).size).toBe(4);
    expect(inserted).toMatchObject({ stringLegacy: false, docLegacy: 0 });
    for (const result of await validateOpenFiles(page)) expect(result.errors, result.name).toEqual([]);
  });

  test('@panels schema legacy markers in a restored session are migrated', async ({ page }) => {
    test.setTimeout(60_000);
    test.skip(!support.ok, support.reason);
    await openApp(page);
    await uploadFixture(page, 'f01-basic.musicxml');
    const xml = await legacyScoreXml();
    await openHeaderAction(page, '세션');
    await page.getByLabel('세션 JSON 가져오기').setInputFiles({
      name: 'legacy-session.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ version: 1, files: [{ name: 'legacy-roman.musicxml', sourceName: 'legacy-roman.musicxml', xml }], activeFile: 0 })),
    });
    await page.getByRole('dialog', { name: '세션 관리' }).getByRole('button', { name: '확인', exact: true }).click();
    await expect.poll(async () => (await romanState(page)).ids).toEqual(['mxl-roman-1-1']);
    expect(await romanState(page)).toMatchObject({ stringLegacy: false, docLegacy: 0 });
    for (const result of await validateOpenFiles(page)) expect(result.errors, result.name).toEqual([]);
  });
});
