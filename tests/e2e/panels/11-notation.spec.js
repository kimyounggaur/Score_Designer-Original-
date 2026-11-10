import {test,expect} from '@playwright/test';
import path from 'node:path';
import {openApp,uploadFixture,openPanel,runPanel,getDocQuery,getPitchAt,fixturesDir} from '../helpers.js';
test('@panels notation: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'notation',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('switch',{name:'코드 심볼 숨기기'}).click();await panel.getByRole('button',{name:/표기 변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony').length)).toBe(0);}});
});

// Phase B B-8(N8): '원본 복원'의 기준은 패널 state(baselineRef)가 아니라 파일 객체의 notationBackup(변환 직전 XML)입니다.
// 변환을 실행하면 그 XML이 파일에 보관되고, 다른 패널이 악보를 커밋하면 지워지며, 작업 기록(실행 취소)에는 참조로 실립니다.
const KEEP = '표기 변환 전 원본을 보관 중입니다';
const snap = (page) => page.evaluate(() => {
  const state = window.__mxlGetState();
  return {
    history: state.history.map((entry) => entry.label),
    files: state.files.map((file) => ({
      xml: file.xmlString,
      backup: file.notationBackup?.xml ?? null,
      harmony: file.xmlDoc.querySelectorAll('harmony').length,
      lyric: file.xmlDoc.querySelectorAll('lyric').length,
      slash: Array.from(file.xmlDoc.querySelectorAll('notehead')).filter((node) => node.textContent === 'slash').length,
      parts: file.xmlDoc.querySelectorAll('part-list score-part').length,
    })),
  };
});
const logOf = (panel) => panel.locator('.result-log');
async function apply(panel, switches) {
  for (const name of switches) await panel.getByRole('switch', { name }).click();
  await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  await expect(logOf(panel)).toContainText('적용 완료');
}
const restore = (panel) => panel.getByRole('button', { name: /원본 복원/ }).click();
async function transposeBy(page, semitones) {
  const panel = await openPanel(page, 'transpose');
  await panel.getByRole('button', { name: '반음 단위 이동', exact: true }).click();
  await panel.locator('input[type="number"]').fill(String(semitones));
  await panel.getByRole('button', { name: /변환 실행/ }).click();
}

test('@panels notation: restore returns to the pre-conversion score byte for byte', async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page);
  await uploadFixture(page, 'f04-minor-harmony.musicxml');
  const original = (await snap(page)).files[0];
  expect(original.harmony).toBe(4);
  expect(original.backup).toBeNull();
  const panel = await openPanel(page, 'notation');
  await expect(panel).not.toContainText(KEEP);
  await apply(panel, ['코드 심볼 숨기기']);
  const converted = (await snap(page)).files[0];
  expect(converted.harmony).toBe(0);
  expect(converted.backup).toBe(original.xml); // 변환 직전 XML이 글자 그대로 보관됩니다.
  await expect(panel).toContainText(KEEP);
  await restore(panel);
  await expect(logOf(panel)).toContainText('복원 완료');
  const after = await snap(page);
  expect(after.files[0].xml).toBe(original.xml);
  expect(after.files[0].harmony).toBe(4);
  expect(after.files[0].backup).toBeNull(); // 복원하면 보관본도 지웁니다.
  expect(after.history).toEqual(['파일 업로드', '악보 표기 변환', '악보 표기 원본 복원']);
  await expect(panel).not.toContainText(KEEP);
});

test('@panels notation: switching options starts again from the original instead of stacking', async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page);
  await uploadFixture(page, 'f06-lyrics-ties.musicxml');
  const original = (await snap(page)).files[0];
  expect(original.lyric).toBe(3);
  const firstPitch = await getPitchAt(page);
  const panel = await openPanel(page, 'notation');
  await apply(panel, ['슬래시 음표 변환']); // 방식 A: 슬래시 음표(음높이 B4 통일)
  const slashed = (await snap(page)).files[0];
  expect(slashed.slash).toBeGreaterThan(0);
  expect(slashed.lyric).toBe(3);
  await panel.getByRole('switch', { name: '슬래시 음표 변환' }).click(); // A를 끄고
  await apply(panel, ['가사 숨기기']); // 방식 B: 가사만
  const next = (await snap(page)).files[0];
  // 원본에 B만 적용한 결과와 글자까지 같아야 합니다. A의 슬래시·B4 통일이 남으면 겹친 것입니다.
  const expected = await page.evaluate((xml) => {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    doc.querySelectorAll('lyric').forEach((node) => node.remove());
    return new XMLSerializer().serializeToString(doc);
  }, original.xml);
  expect(next.xml).toBe(expected);
  expect(next.slash).toBe(0);
  expect(next.lyric).toBe(0);
  expect(await getPitchAt(page)).toEqual(firstPitch);
  expect(next.backup).toBe(original.xml); // 보관본은 처음 원본 그대로입니다.
});

test('@panels notation: another panel clears the backup and restore says there is nothing to restore', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page);
  await uploadFixture(page, 'f04-minor-harmony.musicxml');
  const notation = await openPanel(page, 'notation');
  await apply(notation, ['코드 심볼 숨기기']);
  const converted = (await snap(page)).files[0];
  await expect(notation).toContainText(KEEP);
  await transposeBy(page, 2);
  await expect.poll(async () => (await snap(page)).files[0].xml).not.toBe(converted.xml);
  const before = await snap(page);
  expect(before.files[0].backup).toBeNull(); // 다른 패널의 커밋이 보관본을 지웠습니다.
  await expect(notation).not.toContainText(KEEP);
  await restore(notation);
  await expect(logOf(notation)).toContainText('복원할 원본이 없습니다');
  await expect(logOf(notation)).not.toContainText('복원 완료');
  expect(await snap(page)).toEqual(before); // 조옮김 상태 그대로, 작업 기록도 그대로입니다.
});

test('@panels notation: undoing the other panel brings the backup back', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page);
  await uploadFixture(page, 'f04-minor-harmony.musicxml');
  const original = (await snap(page)).files[0];
  const notation = await openPanel(page, 'notation');
  await apply(notation, ['코드 심볼 숨기기']);
  const converted = (await snap(page)).files[0];
  await transposeBy(page, 2);
  await expect.poll(async () => (await snap(page)).files[0].xml).not.toBe(converted.xml);
  await page.getByRole('heading', { name: '조옮김 (Transpose)' }).click();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await snap(page)).files[0].xml).toBe(converted.xml);
  expect((await snap(page)).files[0].backup).toBe(original.xml); // 작업 기록이 보관본을 참조로 들고 있습니다.
  await expect(notation).toContainText(KEEP);
  await restore(notation);
  await expect(logOf(notation)).toContainText('복원 완료');
  expect((await snap(page)).files[0].xml).toBe(original.xml);
});

test('@panels notation: running with no option selected restores the original, or says there is nothing to restore', async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page);
  await uploadFixture(page, 'f04-minor-harmony.musicxml');
  const original = (await snap(page)).files[0];
  const panel = await openPanel(page, 'notation');
  await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  await expect(logOf(panel)).toContainText('복원할 원본이 없습니다');
  expect((await snap(page)).history).toEqual(['파일 업로드']); // 바뀐 것이 없으니 작업 기록도 남기지 않습니다.
  await apply(panel, ['코드 심볼 숨기기']);
  await panel.getByRole('switch', { name: '코드 심볼 숨기기' }).click(); // 옵션을 모두 끄고 실행
  await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  await expect(logOf(panel)).toContainText('복원 완료');
  expect((await snap(page)).files[0].xml).toBe(original.xml);
});

test('@panels notation: every open file is restored from its own backup', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page);
  await page.locator('input[type="file"]').setInputFiles(['f04-minor-harmony.musicxml', 'f06-lyrics-ties.musicxml'].map((name) => path.join(fixturesDir, name)));
  await expect(page.locator('.file-entry')).toHaveCount(2);
  await page.waitForFunction(() => window.__mxlGetState?.().files.length === 2);
  const originals = (await snap(page)).files;
  const panel = await openPanel(page, 'notation');
  await apply(panel, ['슬래시 음표 변환']);
  const converted = (await snap(page)).files;
  expect(converted.map((file) => file.backup)).toEqual(originals.map((file) => file.xml));
  expect(converted.every((file) => file.slash > 0)).toBe(true);
  await restore(panel);
  await expect(logOf(panel)).toContainText('복원 완료');
  const after = await snap(page);
  expect(after.files.map((file) => file.xml)).toEqual(originals.map((file) => file.xml));
  expect(after.files.every((file) => file.backup === null)).toBe(true);
  expect(after.history.at(-1)).toContain('악보 표기 원본 복원');
});

test('@panels notation: the part list stays complete after a part is removed, and restore brings the part back', async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page);
  await uploadFixture(page, 'f02-two-parts.musicxml');
  const original = (await snap(page)).files[0];
  expect(original.parts).toBe(2);
  const panel = await openPanel(page, 'notation');
  const switches = panel.getByRole('switch', { name: /파트 제거\(출력에서 삭제\)/ });
  await expect(switches).toHaveCount(2);
  await panel.getByRole('switch', { name: 'Piano 파트 제거(출력에서 삭제)' }).click();
  await panel.getByRole('button', { name: /표기 변환 실행/ }).click();
  await expect(logOf(panel)).toContainText('적용 완료');
  expect((await snap(page)).files[0].parts).toBe(1);
  await expect(switches).toHaveCount(2); // 제거한 파트도 원본 기준 목록에 남아 있어 다시 고를 수 있습니다.
  await restore(panel);
  await expect(logOf(panel)).toContainText('복원 완료');
  const after = (await snap(page)).files[0];
  expect(after.parts).toBe(2);
  expect(after.xml).toBe(original.xml);
});

test('@panels notation: a numbering commit, which passes its own extra fields, also clears the backup', async ({ page }) => {
  test.setTimeout(60_000);
  await openApp(page);
  await uploadFixture(page, 'f01-basic.musicxml');
  const notation = await openPanel(page, 'notation');
  await apply(notation, ['슬래시 음표 변환']);
  expect((await snap(page)).files[0].backup).not.toBeNull();
  const numbering = await openPanel(page, 'numbering');
  await numbering.getByRole('button', { name: /숫자 악보 생성/ }).click();
  await expect.poll(async () => (await snap(page)).files[0].lyric).toBeGreaterThan(0);
  expect((await snap(page)).files[0].backup).toBeNull(); // 숫자 악보는 lyricBackup을 넘기지만 notationBackup 키는 넘기지 않습니다.
  const again = await openPanel(page, 'notation');
  await expect(again).not.toContainText(KEEP);
  await restore(again);
  await expect(logOf(again)).toContainText('복원할 원본이 없습니다');
});

test('@panels notation: the backup is not written into saved sessions or shared links', async ({ page }) => {
  test.setTimeout(45_000);
  await openApp(page);
  await uploadFixture(page, 'f01-basic.musicxml');
  const panel = await openPanel(page, 'notation');
  await apply(panel, ['슬래시 음표 변환']);
  expect((await snap(page)).files[0].backup).not.toBeNull();
  const saved = await page.evaluate(async () => {
    const file = window.__mxlGetState().files[0];
    const session = JSON.stringify(window.serializeSessionFiles([file])); // 세션 저장·자동 저장이 쓰는 직렬화
    // 공유 링크 조각을 풀어 만든 원문 JSON을 봅니다(parseShareURLAny는 알려진 필드만 골라 돌려주므로 누출을 가립니다).
    const info = await window.ShareSessionCore.buildShareURLv2Info(file, location.href.split('#')[0]);
    const fragment = new URL(info.url).hash.slice(1);
    const text = fragment.startsWith('v2.')
      ? await window.ShareSessionCore.gunzipFromBase64Url(fragment.slice(3))
      : new TextDecoder().decode(window.ShareSessionCore._base64UrlToBytes(fragment.replace(/^v1\./, '')));
    return { session: session.includes('notationBackup'), shared: text.includes('notationBackup'), sharedXml: JSON.parse(text).xml === file.xmlString };
  });
  expect(saved.session).toBe(false);
  expect(saved.shared).toBe(false);
  expect(saved.sharedXml).toBe(true); // 공유되는 것은 변환된 현재 악보입니다.
});
