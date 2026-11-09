import {test,expect} from '@playwright/test';
import path from 'node:path';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt,fixturesDir} from '../helpers.js';
test('@panels roman: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'roman',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'a단조 분석 시작',exact:true}).click();},expect:async panel=>{await expect(panel.locator('.roman-table__numeral')).toHaveText(['i','iv','V7','i']);}});
});
// C18: 단조는 '단조'로 적고, IAC 칸이 따로 있습니다.
test('@panels roman: minor keys are logged as minor and IAC has its own tile',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f04-minor-harmony.musicxml');
  const panel=await openPanel(page,'roman');
  await panel.getByRole('button',{name:'a단조 분석 시작',exact:true}).click();
  const log=panel.locator('.result-log');
  await expect(log).toContainText('a단조');await expect(log).not.toContainText('장조');
  await expect(panel.locator('.stat-tile__label')).toHaveText(['완전종지 (PAC)','불완전정격종지 (IAC)','반종지 (HC)','변격종지 (PC)','위종지 (DC)']);
});
// C09: B♭ 클라리넷 기보 D·F♯·A를 실음 C·E·G로 읽어 피아노 C·E·G와 함께 C장3화음(Ⅰ)입니다.
test('@panels roman: transposing instruments are analyzed at sounding pitch',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f16-ensemble-transposing.musicxml');
  const panel=await openPanel(page,'roman');
  await panel.getByRole('button',{name:'C장조 분석 시작',exact:true}).click();
  const row=panel.locator('.roman-table tbody tr').first();
  await expect(row.locator('td').nth(3)).toHaveText('C');
  await expect(row.locator('.roman-table__numeral')).toHaveText('Ⅰ');
});
// C18·K-4: 분석 뒤 다른 파일로 바꾸면 이전 결과를 지웁니다. 이 패널의 삽입 결과는 남깁니다.
test('@panels roman: switching files clears the previous analysis',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await page.locator('input[type="file"]').setInputFiles(['f01-basic.musicxml','f04-minor-harmony.musicxml'].map(name=>path.join(fixturesDir,name)));
  await expect(page.getByRole('tab')).toHaveCount(2);
  const panel=await openPanel(page,'roman');
  await panel.getByRole('button',{name:/분석 시작/}).click();
  await expect(panel.locator('.roman-table')).toBeVisible();
  await page.getByRole('tab').nth(1).click();
  await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().activeFile)).toBe(1);
  await expect(panel.locator('.roman-table')).toHaveCount(0);
  await expect(panel.locator('.result-log')).toHaveCount(0);
  await panel.getByRole('button',{name:'a단조 분석 시작',exact:true}).click();
  await page.getByRole('group',{name:'도구 적용 대상'}).getByRole('button',{name:'현재 파일'}).click();
  await panel.getByRole('button',{name:'악보에 삽입',exact:true}).click();
  await expect(panel.locator('.result-log')).toContainText('적용 완료');
  await expect(panel.locator('.roman-table')).toBeVisible();
});
