import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getDocQuery,getPitchAt,getPitches} from '../helpers.js';
const clefs=page=>page.evaluate(()=>Array.from(window.__mxlGetState().files[0].xmlDoc.querySelectorAll('part'),part=>`${part.getAttribute('id')}:`+Array.from(part.querySelectorAll('clef'),clef=>`${clef.getAttribute('number')||'1'}=${clef.querySelector('sign').textContent}${clef.querySelector('line')?.textContent||''}`).join(',')));
test('@panels clef: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'clef',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByText('F 음자리표',{exact:true}).click();await panel.getByRole('button',{name:/변환 실행/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'clef sign')).toMatchObject({text:'F'});await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'C',octave:'3'});}});
});
test('@panels clef changes only the selected part',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'clef',before:()=>uploadFixture(page,'f02-two-parts.musicxml'),action:async panel=>{
    await panel.getByText('F 음자리표',{exact:true}).click();
    await panel.getByLabel('음자리표를 바꿀 파트').selectOption('P1');
    await panel.getByRole('button',{name:/변환 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>clefs(page)).toEqual(['P1:1=F4','P2:1=G2']);
    expect((await getPitches(page,{part:'P1',measure:1}))).toEqual(['C/3','D/3','E/3','G/3']);
    expect((await getPitches(page,{part:'P2',measure:1}))).toEqual(['C/5','D/5','E/5','G/5']);
  }});
});
test('@panels clef changes only the selected staff of a piano part',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'clef',before:()=>uploadFixture(page,'f12-piano-voices.musicxml'),action:async panel=>{
    await panel.locator('.clef-btn').filter({hasText:'G 음자리표'}).click();
    await panel.getByLabel('음자리표를 바꿀 파트').selectOption('P1');
    await panel.getByRole('button',{name:'2번 보표',exact:true}).click();
    await panel.getByRole('button',{name:/변환 실행/}).click();
  },expect:async panel=>{
    await expect.poll(()=>clefs(page)).toEqual(['P1:1=G2,2=G2']);
    expect(await getPitches(page,{measure:1})).toEqual(['E/4','F#/4','G/4','C/5']);
    expect(await getPitches(page,{measure:2})).toEqual(['C/5','D/5','E/5','F/5','G/5','G/4']);
    expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelector('note accidental')?.textContent)).toBe('sharp');
  }});
});
