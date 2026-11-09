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
// C17: 템포 프리셋·눈금과 음자리표 카드는 button이라 Tab으로 가서 Enter·Space로 고릅니다.
async function tabTo(page,locator){
  for(let i=0;i<120;i++){
    if(await locator.evaluate(el=>el===document.activeElement))return;
    await page.keyboard.press('Tab');
  }
  throw new Error('키보드로 초점을 옮기지 못했습니다');
}
test('@a11y picks a clef and a tempo preset with the keyboard',async({page})=>{
  await openApp(page);await uploadFixture(page);
  await page.getByTitle('음자리표 변환',{exact:true}).click();
  const clef=page.getByRole('button',{name:/^F 음자리표/});
  await expect(clef).toHaveAttribute('aria-pressed','false');
  await tabTo(page,clef);await page.keyboard.press('Enter');
  await expect(clef).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('button',{name:/^G 음자리표/})).toHaveAttribute('aria-pressed','false');
  await page.getByTitle('템포 조절',{exact:true}).click();
  const allegro=page.getByRole('button',{name:/^Allegro /});
  await tabTo(page,allegro);await page.keyboard.press('Space');
  await expect(page.locator('.tempo-display__bpm')).toContainText('138');
  await expect(allegro).toHaveAttribute('aria-pressed','true');
  const tick=page.getByRole('button',{name:'60 BPM',exact:true});
  await tabTo(page,tick);await page.keyboard.press('Enter');
  await expect(page.locator('.tempo-display__bpm')).toContainText('60');
});
