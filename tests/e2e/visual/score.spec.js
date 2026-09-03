import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {openApp,uploadFixture} from '../helpers.js';
for(const fixture of ['f01-basic.musicxml','f04-minor-harmony.musicxml','f09-real.mxl'])test(`@visual ${fixture}`,async({page},testInfo)=>{
  test.skip(process.platform!=='linux','Canonical snapshots are generated and reviewed on Linux CI.');
  const name=fixture+'.png';
  test.skip(!existsSync(testInfo.snapshotPath(name))&&process.env.UPDATE_SNAPSHOTS!=='true','Generate initial Linux baselines using Nightly update_snapshots=true.');
  await openApp(page);await uploadFixture(page,fixture);await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('.score-main-render svg').first()).toBeVisible();
  await expect(page.locator('.score-main-render')).toHaveScreenshot(name,{maxDiffPixelRatio:.01,animations:'disabled'});
});
