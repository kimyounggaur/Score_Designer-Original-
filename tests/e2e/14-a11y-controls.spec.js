import { test,expect } from '@playwright/test';
import { openApp,uploadFixture } from './helpers.js';
test('@a11y selects transpose mode and switches parts using the keyboard',async({page})=>{
  await openApp(page);await uploadFixture(page,'f02-two-parts.musicxml');
  await page.getByTitle('조옮김',{exact:true}).click();
  const chip=page.getByRole('button',{name:'반음 단위 이동',exact:true});
  for(let i=0;i<80;i++){
    if(await chip.evaluate(el=>el===document.activeElement))break;
    await page.keyboard.press('Tab');
  }
  await expect(chip).toBeFocused();await page.keyboard.press('Space');await expect(chip).toHaveAttribute('aria-pressed','true');
  await page.getByTitle('파트 추출',{exact:true}).click();
  const toggle=page.getByRole('switch',{name:'Violin 파트 유지'});await toggle.focus();await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked','false');
});
