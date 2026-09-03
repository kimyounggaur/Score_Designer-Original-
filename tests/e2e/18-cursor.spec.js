import {test,expect} from '@playwright/test';
import {openApp,uploadFixture} from './helpers.js';
test('@panels cursor follows repeat jumps and hides on stop',async({page})=>{
  await openApp(page);await uploadFixture(page,'f08-repeats-tempo.musicxml');
  await expect(page.locator('.score-main-render svg')).toBeVisible();
  await page.getByTitle('재생',{exact:true}).click();
  const cursor=page.locator('.score-main-render img[id^="cursorImg"]');
  await expect(cursor).toBeVisible();await expect(cursor).toHaveAttribute('data-source-measure','1');
  await page.evaluate(()=>{Tone.Transport.seconds=3;});await expect(cursor).toHaveAttribute('data-source-measure','2');
  await page.evaluate(()=>{Tone.Transport.seconds=6.5;});await expect(cursor).toHaveAttribute('data-source-measure','1');
  await page.getByTitle('정지',{exact:true}).click();await expect(cursor).toBeHidden();
});
test('@panels A-B loop returns cursor to its first measure',async({page})=>{
  await openApp(page);await uploadFixture(page);
  await expect(page.locator('.score-main-render svg')).toBeVisible();
  await page.getByRole('button',{name:'A-B',exact:true}).click();
  await page.getByTitle('재생',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>window.Tone?.Transport.state)).toBe('started');
  const cursor=page.locator('.score-main-render img[id^="cursorImg"]');
  await page.evaluate(()=>{Tone.Transport.seconds=Tone.Transport.loopEnd-.3;});
  await expect(cursor).toHaveAttribute('data-source-measure','2');
  await expect(cursor).toHaveAttribute('data-source-measure','1');
  await page.getByTitle('정지',{exact:true}).click();
});
