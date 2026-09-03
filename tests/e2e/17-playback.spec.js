import {test,expect} from '@playwright/test';
import {openApp,uploadFixture} from './helpers.js';
test('@panels repeat playback follows score tempo and source measures',async({page})=>{
  await openApp(page);await uploadFixture(page,'f08-repeats-tempo.musicxml');
  expect(await page.evaluate(()=>typeof window.Tone)).toBe('undefined');
  await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().bpm)).toBe(100);
  await page.getByTitle('재생',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>typeof window.Tone)).toBe('object');
  await expect.poll(()=>page.evaluate(()=>Tone.Transport.state)).toBe('started');
  await page.evaluate(()=>{Tone.Transport.seconds=6.5;});
  await expect(page.locator('.score-measure-overlay__value')).toHaveText('1');
  await page.evaluate(()=>{Tone.Transport.seconds=9;});
  await expect(page.locator('.score-measure-overlay__value')).toHaveText('2');
  await page.getByTitle('정지',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Tone.Transport.state)).toBe('stopped');
});
