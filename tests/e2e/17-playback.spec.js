import {test,expect} from '@playwright/test';
import {openApp,uploadFixture} from './helpers.js';
// B-7: D.C./D.S./Fine/Coda 점프. 재생 순서(measureTimeline)와 플레이어가 그 순서를 그대로 따르는지 봅니다.
// probe: 점프 뒤에만 나오는 재생 위치(펼친 순서의 index)를 시각으로 옮겨 마디 표시가 그 마디인지 확인합니다.
for(const row of [
  {name:'D.C. al Fine plays 6 measures',fixture:'f20-dc-al-fine.musicxml',order:[1,2,3,4,1,2],probe:{index:4,measure:'1'}},
  {name:'D.S. al Coda plays 8 measures',fixture:'f21-ds-al-coda.musicxml',order:[1,2,3,4,2,3,5,6],probe:{index:6,measure:'5'}},
])test(`@panels ${row.name}`,async({page})=>{
  await openApp(page);await uploadFixture(page,row.fixture);
  const timeline=()=>page.evaluate(()=>{const s=window.__mxlGetState();return PlaybackCore.extractPlaybackData(s.files[s.activeFile||0].xmlDoc).measureTimeline;});
  expect((await timeline()).map(m=>m.measure)).toEqual(row.order);
  await expect(page.locator('.player__warning')).toHaveCount(0);
  await expect(page.locator('.midi-player__stat--measure')).toContainText(`/${row.order.length})`);
  await page.getByTitle('재생',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>typeof window.Tone)).toBe('object'); // Tone은 첫 재생 때 불러옵니다.
  await expect.poll(()=>page.evaluate(()=>Tone.Transport.state)).toBe('started');
  const probeSec=(await timeline())[row.probe.index].startSec+.5;
  await page.evaluate(sec=>{Tone.Transport.seconds=sec;},probeSec);
  await expect(page.locator('.score-measure-overlay__value')).toHaveText(row.probe.measure);
  await page.getByTitle('정지',{exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Tone.Transport.state)).toBe('stopped');
});
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
