import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels tempochange: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempochange',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('input[type=number]').nth(0).fill('2');await panel.locator('input[type=number]').nth(1).fill('60');await panel.getByRole('button',{name:/템포 변경 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'measure[number="2"] sound')).toMatchObject({attrs:{tempo:'60'}});}});
});
test('@panels tempochange uses printed measure numbers with a pickup bar',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempochange',before:()=>uploadFixture(page,'f03-pickup.musicxml'),action:async panel=>{await panel.getByLabel('템포 변경 1 시작 마디').fill('1');await panel.locator('input[type=number]').nth(1).fill('90');await panel.getByRole('button',{name:/템포 변경 실행/}).click();},expect:async panel=>{
    await expect.poll(()=>getDocQuery(page,'measure[number="1"] sound')).toMatchObject({attrs:{tempo:'90'}});
    expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('measure[number="0"] sound'),s=>s.getAttribute('tempo')))).toEqual(['100']);
  }});
});

test('@panels tempochange rejects a BPM outside 20~400 without committing',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempochange',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{
    const before=await page.evaluate(()=>window.__mxlGetState().history.length);
    await panel.getByLabel('템포 변경 1 BPM').fill('-60');
    await expect(panel.getByLabel('템포 변경 1 BPM')).toHaveAttribute('aria-invalid','true');
    await panel.getByRole('button',{name:/템포 변경 실행/}).click();
    await expect(panel.locator('.result-log')).toContainText('20~400');
    expect(await page.evaluate(()=>window.__mxlGetState().history.length)).toBe(before);
  },expect:async panel=>{
    expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('sound[tempo]'),s=>s.getAttribute('tempo')))).toEqual(['100']);
  }});
});
test('@panels tempochange keeps a dotted-quarter metronome consistent',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempochange',before:()=>uploadFixture(page,'f14-dotted-metronome.musicxml'),action:async panel=>{
    await panel.getByLabel('템포 변경 1 BPM').fill('120');
    await panel.getByRole('button',{name:/템포 변경 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>getDocQuery(page,'measure[number="1"] sound')).toMatchObject({attrs:{tempo:'120'}});
    expect((await getDocQuery(page,'measure[number="1"] per-minute')).text).toBe('80');
  }});
});
