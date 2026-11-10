import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {openApp,uploadFixture,openHeaderAction,waitForScore,fixturesDir} from '../helpers.js';
// 'navigation-warning': 플레이어의 "재생 미반영" 줄이 떠 있는 장면. B-7부터 f17(D.C. al Fine)은 점프로 따르므로 줄이 뜨지 않아,
// f17의 D.C. al Fine을 되돌아갈 segno 없는 D.S. al Fine으로 바꾼 문서(점프하지 않아 경고가 남는다)를 그 자리에서 만들어 올립니다.
// f19(타악기)는 극단 음 때문에 악보가 패널보다 높아져 이 줄과 무관한 기존 지적(#score-panel 스크롤 영역)이 걸려 쓰지 않습니다.
const unsupportedJump=async()=>{
  const source=await readFile(path.join(fixturesDir,'f17-dacapo.musicxml'),'utf8');
  return {name:'f17-ds-without-segno.musicxml',mimeType:'application/vnd.recordare.musicxml+xml',buffer:Buffer.from(source.replace('D.C. al Fine','D.S. al Fine').replace('dacapo="yes"','dalsegno="segno1"'))};
};
for(const scene of ['empty','score','share','sessions','navigation-warning'])test(`@a11y ${scene} has no serious or critical axe violations`,async({page},testInfo)=>{
  await openApp(page);
  if(scene==='navigation-warning'){await page.locator('input[type="file"]').setInputFiles(await unsupportedJump());await waitForScore(page);}
  else if(scene!=='empty')await uploadFixture(page);
  if(scene!=='empty')await expect(page.locator('.score-main-render svg')).toBeVisible();
  if(scene==='navigation-warning')await expect(page.locator('.player__warning')).toBeVisible();
  if(scene==='share')await openHeaderAction(page,'공유');
  if(scene==='sessions')await openHeaderAction(page,'세션');
  const result=await new AxeBuilder({page}).analyze();
  await testInfo.attach('axe-violations',{body:JSON.stringify(result.violations,null,2),contentType:'application/json'});
  expect(result.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
});
