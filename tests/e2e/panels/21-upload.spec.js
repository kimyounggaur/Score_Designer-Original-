import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {openApp,uploadFixture,runPanel,openHeaderAction,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels upload: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'upload',before:()=>uploadFixture(page,'f09-real.mxl'),action:async panel=>{},expect:async panel=>{await expect(page.locator('.score-main-render svg').first()).toBeVisible();expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('note').length)).toBeGreaterThan(100);}});
});
// R10·R52: 라이브러리의 영문 예외를 한글 문장으로 보여 주고 원문은 괄호에 남깁니다.
test('@panels upload: broken MXL and session JSON errors are explained in Korean',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await page.locator('input[type="file"]').setInputFiles({name:'broken.mxl',mimeType:'application/vnd.recordare.musicxml',buffer:Buffer.from('PK\x03\x04junk','binary')});
  const log=page.locator('.inspector .panel--visible .result-log');
  await expect(log).toContainText('broken.mxl: MXL(ZIP) 파일이 손상되었거나 압축 파일이 아닙니다 (');
  await uploadFixture(page,'f01-basic.musicxml');
  await openHeaderAction(page,'세션');
  await page.getByLabel('세션 JSON 가져오기').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{"version":1,')});
  await expect(page.locator('.toast--err')).toContainText('JSON 형식이 올바르지 않습니다 (');
});
// 추가 발견: XML 선언(<?xml …?>)이 없는 짧은 MusicXML은 OSMD가 URL로 보고 그리지 못했습니다.
test('@panels upload: renders MusicXML that has no XML declaration',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  const xml='<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Flute</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>1</divisions><key><fifths>0</fifths></key><time><beats>4</beats><beat-type>4</beat-type></time><clef><sign>G</sign><line>2</line></clef></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration><type>whole</type></note></measure></part></score-partwise>';
  await page.locator('input[type="file"]').setInputFiles({name:'no-declaration.musicxml',mimeType:'application/xml',buffer:Buffer.from(xml)});
  await expect(page.locator('.score-main-render svg').first()).toBeVisible();
  await expect(page.locator('.score-error')).toHaveCount(0);
  // 내보낸 MXL의 score.xml에도 선언이 붙어 OSMD를 쓰는 다른 프로그램이 다시 읽을 수 있습니다.
  const downloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'MXL',exact:true}).click();
  const base64=(await readFile(await (await downloadEvent).path())).toString('base64');
  const xmlText=await page.evaluate(async text=>(await (await window.JSZip.loadAsync(text,{base64:true})).file('score.xml').async('string')),base64);
  expect(xmlText.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
});
