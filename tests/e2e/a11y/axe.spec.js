import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {openApp,uploadFixture,openHeaderAction} from '../helpers.js';
for(const scene of ['empty','score','share','sessions'])test(`@a11y ${scene} has no serious or critical axe violations`,async({page},testInfo)=>{
  await openApp(page);
  if(scene!=='empty'){await uploadFixture(page);await expect(page.locator('.score-main-render svg')).toBeVisible();}
  if(scene==='share')await openHeaderAction(page,'공유');
  if(scene==='sessions')await openHeaderAction(page,'세션');
  const result=await new AxeBuilder({page}).analyze();
  await testInfo.attach('axe-violations',{body:JSON.stringify(result.violations,null,2),contentType:'application/json'});
  expect(result.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))).toEqual([]);
});
