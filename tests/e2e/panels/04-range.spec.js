import {test,expect} from '@playwright/test';
import {openApp,uploadFixture,runPanel,getPitches} from '../helpers.js';
const midi=text=>{const [name,octave]=text.split('/');const alter=(name.match(/#/g)||[]).length-(name.match(/b/g)||[]).length;return 12*(Number(octave)+1)+({C:0,D:2,E:4,F:5,G:7,A:9,B:11})[name[0]]+alter;};
test('@panels range: validates the resulting score',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'range',before:()=>uploadFixture(page,'f01-basic.musicxml'),action:async panel=>{await panel.locator('select').selectOption('kalimba');await panel.getByRole('button',{name:/음역대 조정 실행/}).click();},expect:async panel=>{await expect(panel.locator('.result-log')).toContainText('완료');expect((await getPitches(page)).map(midi).every(n=>n>=60&&n<=88)).toBe(true);}});
});
test('@panels range keeps F sharp major spelling and only changes octaves',async({page})=>{
  test.setTimeout(30000);await openApp(page);
  await runPanel(page,{id:'range',before:()=>uploadFixture(page,'f07-enharmonic.musicxml'),action:async panel=>{
    expect(await getPitches(page)).toEqual(['F#/4','G#/4','A#/4','B/4','C#/5','D#/5','E#/5','B#/5']);
    // 소프라노 리코더 C5~D7: 4옥타브 음은 한 옥타브 올라가고 B#5는 그대로 둡니다.
    await panel.locator('select').selectOption('recorder_soprano');await panel.getByRole('button',{name:/음역대 조정 실행/}).click();
  },expect:async panel=>{
    await expect(panel.locator('.result-log')).toContainText('4개 음표 이동');
    expect(await getPitches(page)).toEqual(['F#/5','G#/5','A#/5','B/5','C#/5','D#/5','E#/5','B#/5']);
    expect(await page.evaluate(()=>window.__mxlGetState().files[0].xmlDoc.querySelectorAll('note accidental').length)).toBe(0);
  }});
});
