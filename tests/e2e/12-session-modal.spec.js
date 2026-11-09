import { test,expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { openPanel,openHeaderAction,openApp,uploadFixture,getPitchAt,fixturesDir } from './helpers.js';
test('@ux saves restores exports renames and deletes a session',async({page})=>{
  await openApp(page);await uploadFixture(page);
  const trigger=page.getByRole('button',{name:'세션',exact:true});
  await openHeaderAction(page,'세션');const modal=page.getByRole('dialog',{name:'세션 관리'});
  await modal.getByLabel('세션 이름',{exact:true}).fill('테스트 세션');
  await modal.getByRole('button',{name:'저장',exact:true}).click();
  const row=modal.locator('tr').filter({hasText:'테스트 세션'});
  await expect(row).toHaveCount(1);
  await page.keyboard.press('Escape');if(!await page.locator('.mobile-tools').isVisible())await expect(trigger).toBeFocused();
  await openPanel(page,'transpose');await page.getByText('반음 단위 이동',{exact:true}).click();
  await page.locator('.inspector .panel--visible input[type="number"]').fill('2');
  await page.getByRole('button',{name:/변환 실행/}).click();
  await expect.poll(()=>getPitchAt(page)).toEqual({step:'D',alter:'0',octave:'4'});
  await openHeaderAction(page,'세션');await row.getByRole('button',{name:'불러오기'}).click();
  await expect(modal).toContainText('현재 작업을 덮어씁니다');
  await modal.getByRole('button',{name:'확인',exact:true}).click();
  await expect.poll(()=>getPitchAt(page)).toEqual({step:'C',alter:'0',octave:'4'});
  await openHeaderAction(page,'세션');const event=page.waitForEvent('download');await row.getByRole('button',{name:'JSON',exact:true}).click();
  expect((await event).suggestedFilename()).toMatch(/\.json$/);
  await row.getByRole('button',{name:'이름 변경'}).click();await modal.getByLabel('변경할 세션 이름').fill('변경 세션');await modal.getByRole('button',{name:'이름 저장'}).click();
  const renamed=modal.locator('tr').filter({hasText:'변경 세션'});await expect(renamed).toHaveCount(1);
  await renamed.getByRole('button',{name:'삭제',exact:true}).click();await modal.getByRole('button',{name:'확인',exact:true}).click();
  await expect(renamed).toHaveCount(0);await page.keyboard.press('Escape');if(!await page.locator('.mobile-tools').isVisible())await expect(trigger).toBeFocused();
});
test('@ux rejects invalid session JSON and keeps the current score',async({page})=>{
  await openApp(page);await uploadFixture(page);await openHeaderAction(page,'세션');
  await page.getByLabel('세션 JSON 가져오기').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"version":42,"files":[]}')});
  await expect(page.locator('.toast--err')).toContainText('세션 JSON 형식');
  expect(await getPitchAt(page)).toEqual({step:'C',alter:'0',octave:'4'});
});
test('@ux imports JSON files and restores the selected score after confirmation',async({page})=>{
  await openApp(page);await uploadFixture(page);
  const files=await Promise.all(['f01-basic.musicxml','f02-two-parts.musicxml'].map(async name=>({name,sourceName:name,xml:await readFile(path.join(fixturesDir,name),'utf8')})));
  await openHeaderAction(page,'세션');
  await page.getByLabel('세션 JSON 가져오기').setInputFiles({name:'valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({version:1,files,activeFile:1}))});
  await page.getByRole('dialog',{name:'세션 관리'}).getByRole('button',{name:'확인',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>{const s=window.__mxlGetState();return [s.files.length,s.activeFile,s.files[s.activeFile].name]})).toEqual([2,1,'f02-two-parts.musicxml']);
});
// C12: 저장소가 가득 차면 자동 저장 실패를 이유와 함께 한 번만 알리고, 세션 모달에 마지막 실패를 남깁니다.
test('@ux reports a full storage once and keeps the last autosave failure visible',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});
    const setItem=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){
      if(String(key).startsWith('mxlStudio.idbFallback.'))throw new DOMException('The quota has been exceeded.','QuotaExceededError');
      return setItem.call(this,key,value);
    };
    window.__autosaveToasts=0;
    new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.classList.contains('toast')&&node.textContent.includes('자동 저장 실패'))window.__autosaveToasts++;})
      .observe(document,{childList:true,subtree:true});
  });
  await openApp(page);await uploadFixture(page);
  await expect(page.locator('.toast').filter({hasText:'자동 저장 실패: 저장 공간이 부족합니다'})).toBeVisible({timeout:10_000});
  await expect.poll(()=>page.evaluate(()=>window.__mxlGetState().sessionStatus.autosaveError)).toContain('저장 공간이 부족합니다');
  await openPanel(page,'transpose');await page.getByText('반음 단위 이동',{exact:true}).click();
  await page.locator('.inspector .panel--visible input[type="number"]').fill('2');
  await page.getByRole('button',{name:/변환 실행/}).click();
  await expect.poll(()=>getPitchAt(page)).toEqual({step:'D',alter:'0',octave:'4'});
  await page.waitForTimeout(5500);
  expect(await page.evaluate(()=>window.__autosaveToasts)).toBe(1);
  await openHeaderAction(page,'세션');const modal=page.getByRole('dialog',{name:'세션 관리'});
  await expect(modal.locator('.session-autosave-error')).toContainText('마지막 저장 실패: 저장 공간이 부족합니다');
  await modal.getByRole('button',{name:'저장',exact:true}).click();
  await expect(page.locator('.toast--err')).toContainText('저장 공간이 부족합니다. 오래된 세션을 삭제하거나 JSON으로 내보내세요.');
  const download=page.waitForEvent('download');await modal.getByRole('button',{name:'JSON 내보내기',exact:true}).click();
  const file=await download;expect(file.suggestedFilename()).toMatch(/^mxl-session-.+\.json$/);
  const session=JSON.parse(await readFile(await file.path(),'utf8'));
  expect(session.version).toBe(1);expect(session.files).toHaveLength(1);expect(session.files[0].xml).toContain('<step>D</step>');
});
// C12: 저장소를 전혀 쓸 수 없으면 ok:true로 보이지 않고 그 이유를 알립니다.
test('@ux explains that sessions cannot be saved without any browser storage',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(window,'indexedDB',{value:undefined,configurable:true});
    Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Access is denied.','SecurityError');},configurable:true});
  });
  await openApp(page);await uploadFixture(page);
  await openHeaderAction(page,'세션');const modal=page.getByRole('dialog',{name:'세션 관리'});
  await modal.getByRole('button',{name:'저장',exact:true}).click();
  await expect(page.locator('.toast--err')).toContainText('브라우저 저장소를 사용할 수 없어 세션을 저장하지 못했습니다. JSON 내보내기를 이용하세요.');
  await expect(modal.locator('tbody tr')).toHaveCount(0);
});
