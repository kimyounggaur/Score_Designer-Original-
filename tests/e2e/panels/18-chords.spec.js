import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels chords: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'chords',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:/코드 기호 파악/}).click();},expect:async panel=>{await expect(panel.locator('.result-log')).toContainText('Am');}});
});
// C15·C18: 수직 음향 분석은 박 단위이고 마디는 number 속성(못갖춘마디 0)으로 적습니다.
test('@panels chords: vertical analysis runs per beat with printed measure numbers',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'chords',before:()=>uploadFixture(page,'f03-pickup.musicxml'),action:async panel=>{await panel.getByRole('button',{name:/수직 음향 분석/}).click();},expect:async panel=>{
    const log=panel.locator('.result-log');
    await expect(log).toContainText('마디 0: 1박 ?');
    await expect(log).toContainText('마디 1: 1박 ? · 2박 ? · 3박 ? · 4박 ?');
    await expect(log).not.toContainText('마디 5:');
  }});
});
// C02: 옥타브 유니슨만 있는 박은 코드가 아니며, 자동 삽입은 첫 박이 확정된 마디에만 코드를 넣습니다.
test('@panels chords: unison beats stay ? and auto insert adds only settled chords',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f02-two-parts.musicxml');
  const chords=await openPanel(page,'chords');
  await chords.getByRole('button',{name:/수직 음향 분석/}).click();
  await expect(chords.locator('.result-log')).toContainText('마디 1: 1박 ? · 2박 ? · 3박 ? · 4박 ?');
  await expect(chords.locator('.result-log')).toContainText('박 16개 중 0개 코드 확정');
  const settled=await page.evaluate(()=>{
    const rows=window.RomanAnalysis.analyzeVerticalities(window.__mxlGetState().files[0].xmlDoc),first=new Map();
    rows.forEach(row=>{if(!first.has(row.measureIndex))first.set(row.measureIndex,row);});
    return [...first.values()].filter(row=>row.chord).length;
  });
  const tools=await openPanel(page,'chordtools');
  await tools.getByRole('button',{name:/코드 분석 & 삽입/}).click();
  await expect(tools.locator('.result-log')).toContainText('⚠ 마디 1: 음이 1개라 코드를 확정하지 않았습니다');
  await expect(tools.locator('.result-log')).toContainText('0마디 코드 삽입');
  expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony').length)).toBe(settled);
});
test('@panels chordtools: auto insert writes the first settled chord of each measure',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f04-minor-harmony.musicxml');
  const tools=await openPanel(page,'chordtools');
  await tools.getByRole('button',{name:'기존 코드 덮어쓰기',exact:true}).click();
  await tools.getByRole('button',{name:/코드 분석 & 삽입/}).click();
  await expect(tools.locator('.result-log')).toContainText('4마디 코드 삽입');
  await expect.poll(()=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('harmony'),h=>window.ChordSymbolCore.toString(h)))).toEqual(['Am','Dm','E7','Am']);
});
