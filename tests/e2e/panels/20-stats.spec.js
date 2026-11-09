import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels stats: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'stats',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.getByRole('button',{name:'▶ 기본 분석',exact:true}).click();},expect:async panel=>{await expect(panel.locator('.stat-tile').filter({hasText:'음표 (전체 파트)'}).locator('.stat-tile__value')).toHaveText('8');}});
});
// B09: 기본 분석과 작곡 스타일 분석의 마디 수가 같은 기준(첫 파트)입니다.
test('@panels stats: measures follow the first part in both analyses',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f02-two-parts.musicxml');
  const panel=await openPanel(page,'stats');
  await panel.getByRole('button',{name:'▶ 기본 분석',exact:true}).click();
  await expect(panel.locator('.stats-caption')).toContainText('마디 4 · 파트 2개');
  await expect(panel.locator('.stat-tile').filter({hasText:'음표 (전체 파트)'}).locator('.stat-tile__value')).toHaveText('32');
  await panel.getByRole('button',{name:/작곡 스타일 분석/}).click();
  await expect(panel.locator('.stats-heading')).toHaveText('작곡 스타일 (첫 파트 선율 기준)');
  const measureTiles=panel.locator('.stat-tile').filter({has:page.locator('.stat-tile__label',{hasText:/^마디$/})}).locator('.stat-tile__value');
  await expect(measureTiles).toHaveText(['4','4']);
});
// C08: A단조 악보는 조성 상위에 Am으로 보입니다.
test('@panels stats: minor keys are classified as minor',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f04-minor-harmony.musicxml');
  const panel=await openPanel(page,'stats');
  await panel.getByRole('button',{name:/작곡 스타일 분석/}).click();
  await expect(panel.locator('.composer-keys .composer-tag').first()).toHaveText('Am');
});
// N6: 최저·최고음은 악보 철자 그대로(F♯장조의 B♯5가 C6으로 보이지 않음).
test('@panels stats: lowest and highest notes keep their written spelling',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f07-enharmonic.musicxml');
  const panel=await openPanel(page,'stats');
  await panel.getByRole('button',{name:'▶ 기본 분석',exact:true}).click();
  await expect(panel.locator('.stat-tile').filter({hasText:'최고음'}).locator('.stat-tile__value')).toHaveText('B#5');
  await expect(panel.locator('.stat-tile').filter({hasText:'최저음'}).locator('.stat-tile__value')).toHaveText('F#4');
  await panel.getByRole('button',{name:/작곡 스타일 분석/}).click();
  await expect(panel.locator('.stat-tile').filter({hasText:'음역대'}).locator('.stat-tile__value')).toHaveText('F#4–B#5');
});
