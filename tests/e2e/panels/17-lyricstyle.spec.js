import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,openPanel,getDocQuery,getPitchAt} from '../helpers.js';
test('@panels lyricstyle: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'lyricstyle',before:()=>uploadFixture(page,'f06-lyrics-ties.musicxml'),action:async panel=>{await panel.locator('input[type=number]').fill('14');await panel.getByRole('button',{name:'Bold',exact:true}).click();await panel.getByRole('button',{name:/가사 스타일 적용/}).click();},expect:async panel=>{await expect.poll(()=>getDocQuery(page,'note lyric text')).toMatchObject({attrs:{'font-size':'14','font-weight':'bold'}});}});
});
// E51·E54: 바꿀 항목이 없으면 실행할 수 없고, 범위 밖 크기는 커밋하지 않습니다.
test('@panels lyricstyle: refuses empty or out-of-range settings',async({page})=>{
  test.setTimeout(30000);await openApp(page);await uploadFixture(page,'f06-lyrics-ties.musicxml');
  const panel=await openPanel(page,'lyricstyle');
  const apply=panel.getByRole('button',{name:/가사 스타일 적용/});
  const historyLength=()=>page.evaluate(()=>window.__mxlGetState().history.length);
  const before=await historyLength();
  const size=panel.getByLabel('폰트 크기 (pt, 4~72)');
  await size.fill('200');
  await expect(size).toHaveAttribute('aria-invalid','true');
  await apply.click();
  await expect(panel.locator('.result-log')).toContainText("폰트 크기 '200'은(는) 4~72 사이 숫자여야 합니다");
  expect(await historyLength()).toBe(before);
  expect((await getDocQuery(page,'note lyric text')).attrs['font-size']).not.toBe('200');
  await size.fill('12');await expect(size).toHaveAttribute('aria-invalid','false');
  for(const name of ['크기 적용','굵기 적용','기울기 적용'])await panel.getByRole('button',{name,exact:true}).click();
  await expect(apply).toBeDisabled();
  await expect(panel.getByText('적용할 항목을 하나 이상 켜세요.')).toBeVisible();
  expect(await historyLength()).toBe(before);
});
