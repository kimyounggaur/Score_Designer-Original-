import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels tempo: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempo',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('.tempo-slider').fill('90');await panel.getByRole('button',{name:/템포 변경 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'sound[tempo]')).toMatchObject({attrs:{tempo:'90'}});await expect.poll(()=>getDocQuery(page,'per-minute')).toMatchObject({text:'90'});}});
});

test('@panels tempo: no duration stretch option and durations stay intact at 300 BPM',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempo',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{
    await expect(panel.getByRole('button',{name:'duration 비례 변환'})).toHaveCount(0);
    await panel.locator('.tempo-slider').fill('300');await panel.getByRole('button',{name:/템포 변경 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>getDocQuery(page,'sound[tempo]')).toMatchObject({attrs:{tempo:'300'}});
    expect(await page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('note duration'),d=>d.textContent))).toEqual(Array(8).fill('1'));
  }});
});
test('@panels tempo: converts a dotted-quarter metronome mark to the same speed',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'tempo',before:()=>uploadFixture(page,'f14-dotted-metronome.musicxml'),action:async panel=>{
    await expect(panel).toContainText('90 BPM');
    await expect(panel).toContainText('점4분음표=60');
    await panel.locator('.tempo-slider').fill('120');await panel.getByRole('button',{name:/템포 변경 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>getDocQuery(page,'sound[tempo]')).toMatchObject({attrs:{tempo:'120'}});
    expect((await getDocQuery(page,'metronome per-minute')).text).toBe('80');
    expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('metronome beat-unit-dot').length)).toBe(1);
  }});
});
