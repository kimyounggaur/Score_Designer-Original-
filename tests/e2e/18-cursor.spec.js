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
// B10: 반복 재생 중 A-B를 꺼도 곡 끝 정지 이벤트가 새로 예약되어 끝에서 멈추고 커서가 사라집니다.
test('@panels turning the A-B loop off mid-playback still stops at the end',async({page})=>{
  await openApp(page);await uploadFixture(page);
  await expect(page.locator('.score-main-render svg')).toBeVisible();
  const loop=page.getByRole('button',{name:'A-B',exact:true}),play=page.getByTitle('재생',{exact:true});
  await loop.click();await expect(loop).toHaveAttribute('aria-pressed','true');
  await play.click();
  await expect.poll(()=>page.evaluate(()=>window.Tone?.Transport.state)).toBe('started');
  const totalDuration=await page.evaluate(()=>Tone.Transport.loopEnd);
  expect(totalDuration).toBeGreaterThan(1);
  const cursor=page.locator('.score-main-render img[id^="cursorImg"]');
  await expect(cursor).toBeVisible();
  await page.waitForTimeout(300);
  await loop.click();await expect(loop).toHaveAttribute('aria-pressed','false');
  await expect.poll(()=>page.evaluate(()=>Tone.Transport.loop)).toBe(false);
  await expect.poll(()=>page.evaluate(()=>Tone.Transport.state),{timeout:(totalDuration+1.5)*1000}).toBe('stopped');
  await expect(play).not.toHaveClass(/transport__btn--playing/);
  await expect(cursor).toBeHidden();
  const times=page.locator('.midi-player__time > span');
  await expect(times.first()).toHaveText(await times.last().textContent());
});
