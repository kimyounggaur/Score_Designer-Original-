import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt,getPitches,fixturesDir} from '../helpers.js';
test('@panels transpose: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'transpose',before:()=>uploadFixture(page,'f04-minor-harmony.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'Bm',exact:true}).click();await panel.getByRole('button',{name:/변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'key fifths')).toMatchObject({text:'2'});await expect.poll(()=>getDocQuery(page,'harmony root-step')).toMatchObject({text:'B'});}});
});
for(const [direction,expected] of [[null,'B/3'],['위로','B/4'],['아래로','B/3']]){
  test(`@panels transpose to a specific key moves ${direction||'by the nearest step'}`,async({page})=>{
    test.setTimeout(30000);await openApp(page);
    await runPanel(page,{id:'transpose',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{
      await panel.getByRole('button',{name:'B',exact:true}).click();
      if(direction)await panel.getByRole('button',{name:direction,exact:true}).click();
      await panel.getByRole('button',{name:/변환 실행/}).click();
    },expect:async panel=>{
      await expect.poll(async()=>(await getPitches(page))[0]).toBe(expected);
      expect((await getDocQuery(page,'key fifths')).text).toBe('5');
    }});
  });
}
test('@panels transpose all 12 keys downloads twelve MXL files and leaves the open score alone',async({page})=>{
  test.setTimeout(45000);await openApp(page);
  await runPanel(page,{id:'transpose',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{
    await panel.getByRole('button',{name:'12개 장조 모두',exact:true}).click();
    await expect(panel).toContainText('열린 악보는 바뀌지 않습니다');
  },expect:async panel=>{
    const before=await page.evaluate(()=>{const state=window.__mxlGetState();return {xml:state.files[0].xmlString,doc:new XMLSerializer().serializeToString(state.files[0].xmlDoc),history:state.history.length};});
    const downloadEvent=page.waitForEvent('download');
    await panel.getByRole('button',{name:/변환 실행/}).click();
    const download=await downloadEvent;
    expect(download.suggestedFilename()).toBe('transposed_12keys.zip');
    const base64=(await readFile(await download.path())).toString('base64');
    const result=await page.evaluate(async text=>{
      const zip=await window.JSZip.loadAsync(text,{base64:true});
      const names=Object.keys(zip.files).filter(name=>!zip.files[name].dir).sort();
      const entries={};
      for(const name of names){
        const inner=await window.JSZip.loadAsync(await zip.file(name).async('uint8array'));
        const innerNames=Object.keys(inner.files).filter(item=>!inner.files[item].dir).sort();
        const score=new DOMParser().parseFromString(await inner.file('score.xml')?.async('string')||'','text/xml');
        const container=await inner.file('META-INF/container.xml')?.async('string')||'';
        entries[name]={innerNames,parsed:!score.querySelector('parsererror')&&!!score.querySelector('score-partwise'),rootfile:container.includes('full-path="score.xml"'),fifths:score.querySelector('key fifths')?.textContent,first:(score.querySelector('note pitch step')?.textContent||'')+(score.querySelector('note pitch alter')?.textContent||'')};
      }
      return {names,entries};
    },base64);
    expect(result.names).toHaveLength(12);
    expect(result.names).toContain('f01-basic/f01-basic_Db.mxl');
    expect(result.names).toContain('f01-basic/f01-basic_F#-Gb.mxl');
    for(const entry of Object.values(result.entries)){
      expect(entry.innerNames).toEqual(['META-INF/container.xml','score.xml']);
      expect(entry.parsed).toBe(true);
      expect(entry.rootfile).toBe(true);
    }
    expect(new Set(Object.values(result.entries).map(entry=>entry.fifths)).size).toBe(12);
    expect(result.entries['f01-basic/f01-basic_Db.mxl'].fifths).toBe('-5');
    expect(result.entries['f01-basic/f01-basic_Db.mxl'].first).toBe('D-1');
    expect(result.entries['f01-basic/f01-basic_C.mxl'].fifths).toBe('0');
    await expect(panel.locator('.result-log')).toContainText('12개 .mxl');
    const after=await page.evaluate(()=>{const state=window.__mxlGetState();return {xml:state.files[0].xmlString,doc:new XMLSerializer().serializeToString(state.files[0].xmlDoc),history:state.history.length};});
    expect(after).toEqual(before);
  }});
});

test('@panels transpose all 12 keys keeps same-stem files in separate folders (N3)',async({page})=>{
  test.setTimeout(60000);await openApp(page);
  await uploadFixture(page,'f01-basic.musicxml');
  const buffer=await readFile(path.join(fixturesDir,'f01-basic.musicxml'));
  await page.locator('input[type="file"]').setInputFiles({name:'f01-basic.xml',mimeType:'application/xml',buffer});
  await page.waitForFunction(()=>window.__mxlGetState?.().files.length===2);
  await runPanel(page,{id:'transpose',action:async panel=>{
    await panel.getByRole('button',{name:'12개 장조 모두',exact:true}).click();
  },expect:async panel=>{
    const downloadEvent=page.waitForEvent('download');
    await panel.getByRole('button',{name:/변환 실행/}).click();
    const download=await downloadEvent;
    const base64=(await readFile(await download.path())).toString('base64');
    const names=await page.evaluate(async text=>{const zip=await window.JSZip.loadAsync(text,{base64:true});return Object.keys(zip.files).filter(name=>!zip.files[name].dir);},base64);
    expect(names).toHaveLength(24);
    expect(names.filter(name=>name.startsWith('f01-basic/'))).toHaveLength(12);
    expect(names.filter(name=>name.startsWith('f01-basic (2)/'))).toHaveLength(12);
  }});
});
// C06·N4: 음정 이동은 온음계 간격을 지킵니다(C에서 감5도 ↑는 G♭). 완전음정에는 장·단 칩이 없습니다.
test('@panels transpose: diminished fifth keeps the diatonic spelling',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f01-basic.musicxml');
  const panel=await openPanel(page,'transpose');
  await panel.getByRole('button',{name:'음정 이동 (Interval)',exact:true}).click();
  await panel.getByRole('button',{name:'5th',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Perfect (P)',exact:true})).toBeVisible();
  await expect(panel.getByRole('button',{name:'Major (M)',exact:true})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'Minor (m)',exact:true})).toHaveCount(0);
  await panel.getByRole('button',{name:'Diminished (d)',exact:true}).click();
  await panel.getByRole('button',{name:'↑ 위로',exact:true}).click();
  await expect(panel.locator('.card__text').filter({hasText:'현재 설정'})).toContainText('감5도 = +6 반음, 온음계 +4');
  await panel.getByRole('button',{name:/변환 실행/}).click();
  await expect.poll(async()=>(await getPitches(page,{measure:1}))[0]).toBe('Gb/4');
  expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelector('key fifths').textContent)).toBe('-6');
  await expect(panel.locator('.result-log')).toContainText('↑ 감5도 (+6반음, 온음계 +4)');
});
test('@panels transpose: switching to a perfect interval drops a minor quality',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f01-basic.musicxml');
  const panel=await openPanel(page,'transpose');
  await panel.getByRole('button',{name:'음정 이동 (Interval)',exact:true}).click();
  await panel.getByRole('button',{name:'3rd',exact:true}).click();
  await panel.getByRole('button',{name:'Minor (m)',exact:true}).click();
  await panel.getByRole('button',{name:'4th',exact:true}).click();
  await expect(panel.getByRole('button',{name:'Perfect (P)',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(panel.locator('.card__text').filter({hasText:'현재 설정'})).toContainText('완전4도 = +5 반음, 온음계 +3');
});

