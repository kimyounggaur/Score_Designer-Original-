import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,getPitchAt,openPanel} from './helpers.js';
test('@panels undo redo history jump and clear preserve exact pitches',async({page})=>{
  await openApp(page);await uploadFixture(page);const panel=await openPanel(page,'transpose');
  await panel.getByRole('button',{name:'반음 단위 이동',exact:true}).click();await panel.locator('input[type="number"]').fill('2');
  await panel.getByRole('button',{name:/변환 실행/}).click();await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'D'});
  await page.getByRole('heading',{name:'조옮김 (Transpose)'}).click();await page.keyboard.press('Control+z');await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'C'});
  await page.keyboard.press('Control+y');await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'D'});
  await page.locator('.history-panel__item').first().click();await expect.poll(()=>getPitchAt(page)).toMatchObject({step:'C'});
  await page.locator('.history-panel__clear').click();await expect(page.locator('.history-panel__item')).toHaveCount(0);
});
