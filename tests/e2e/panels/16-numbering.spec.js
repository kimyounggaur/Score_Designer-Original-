import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels numbering: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'numbering',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'한국어 계이름',exact:true}).click();await panel.getByRole('button',{name:/숫자 악보 생성/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'note lyric text')).toMatchObject({text:'도'});}});
});

const lyricState=page=>page.evaluate(()=>{
  const doc=window.__mxlGetState().files[0].xmlDoc;const lyrics=Array.from(doc.querySelectorAll('lyric'));
  return {user:lyrics.filter(l=>l.getAttribute('name')!=='mxl-studio-number').map(l=>l.querySelector('text').textContent),generated:lyrics.filter(l=>l.getAttribute('name')==='mxl-studio-number').length,total:lyrics.length};
});
test('@panels numbering restores original lyrics after another panel commits (B04)',async({page})=>{
  test.setTimeout(45000);await openApp(page);await uploadFixture(page,'f06-lyrics-ties.musicxml');
  let panel=await openPanel(page,'numbering');
  await expect(panel.getByRole('button',{name:'숫자 (도=1)',exact:true})).toHaveCount(0);
  await expect(panel.getByRole('button',{name:'고정 도법 (C=1)',exact:true})).toHaveAttribute('aria-pressed','true');
  await panel.getByRole('button',{name:/숫자 악보 생성/}).click();
  await expect.poll(()=>lyricState(page)).toEqual({user:[],generated:7,total:7});
  const color=await openPanel(page,'color');
  await color.getByRole('button',{name:/색깔 악보 생성/}).click();
  await expect.poll(()=>getDocQuery(page,'note')).toMatchObject({attrs:{color:expect.stringMatching(/^#/)}});
  panel=await openPanel(page,'numbering');
  await panel.getByRole('button',{name:'기존 가사 복원',exact:true}).click();
  await panel.getByRole('button',{name:/숫자 악보 생성/}).click();
  await expect.poll(()=>lyricState(page)).toEqual({user:['아','리','랑'],generated:0,total:3});
  await expect(panel.locator('.result-log')).toContainText('원본 가사 3개 복원');
});
test('@panels numbering does not stack generated lyrics when kept lyrics are on (E37)',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f06-lyrics-ties.musicxml');
  const panel=await openPanel(page,'numbering');
  await panel.getByRole('button',{name:'기존 가사 유지',exact:true}).click();
  await panel.getByRole('button',{name:/숫자 악보 생성/}).click();
  await expect.poll(()=>lyricState(page)).toEqual({user:['아','리','랑'],generated:7,total:10});
  await panel.getByRole('button',{name:/숫자 악보 생성/}).click();
  await expect(panel.locator('.result-log')).toContainText('적용 완료');
  expect(await lyricState(page)).toEqual({user:['아','리','랑'],generated:7,total:10});
});
test('@panels numbering follows key changes in movable-do (C03) and marks octaves (C04)',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f10-keychange-clef.musicxml');
  const panel=await openPanel(page,'numbering');
  await panel.getByRole('button',{name:'이동 도법',exact:true}).click();
  await panel.getByRole('button',{name:/숫자 악보 생성/}).click();
  await expect.poll(()=>getDocQuery(page,'measure[number="3"] lyric text')).toMatchObject({text:'5˙'});
  expect((await getDocQuery(page,'measure[number="4"] lyric text')).text).toBe('6˙');
  expect((await getDocQuery(page,'measure[number="1"] lyric text')).text).toBe('1');
  await panel.getByLabel('기준 옥타브').selectOption('3');
  await panel.getByRole('button',{name:'고정 도법 (C=1)',exact:true}).click();
  await panel.getByRole('button',{name:/숫자 악보 생성/}).click();
  await expect.poll(()=>getDocQuery(page,'measure[number="1"] lyric text')).toMatchObject({text:'˙1'});
});
