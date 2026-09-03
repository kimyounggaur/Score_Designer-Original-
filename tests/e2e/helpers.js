import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const fixturesDir = path.resolve(__dirname, '../fixtures');

export async function openApp(page) {
  await page.goto('mxl-studio.html', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.app-root .main-score')).toBeVisible({ timeout: 30_000 });
}

export async function waitForScore(page) {
  await expect(page.locator('.file-entry__name')).toHaveCount(1);
  await expect(page.locator('.header__badge')).toContainText('파일 1개');
  await page.waitForFunction(() => {
    const state = window.__mxlGetState?.();
    return Boolean(state?.files?.length);
  });
}

export async function openPanel(page,id,side) {
  const labels={upload:'파일 업로드',transpose:'조옮김',keychange:'마디별 조바꿈',capo:'카포 (Capo)',range:'음역대 조정',instrument:'이조 악기',tempo:'템포 조절',tempochange:'마디별 템포',ossia:'Ossia 마디',clef:'음자리표 변환',parts:'파트 추출',notation:'악보 표기 변환',export:'이미지 / PDF',color:'색깔 악보',harmony:'화성 쌓기',chordtools:'코드 도구',numbering:'숫자 악보',lyricstyle:'가사 스타일',chords:'코드 분석',roman:'로마 숫자 분석',stats:'통계 분석'};
  if(await page.locator('.mobile-tools').isVisible()){
    const drawer=page.getByRole('dialog',{name:'악보 도구'});
    if(await page.getByRole('button',{name:'← 목록',exact:true}).isVisible())await page.getByRole('button',{name:'← 목록',exact:true}).click();
    else if(!await drawer.isVisible())await page.getByRole('button',{name:'도구',exact:true}).click();
    await drawer.getByRole('button',{name:labels[id],exact:true}).click();
  }else{
    const current=await page.evaluate(()=>{const s=window.__mxlGetState();return [s.leftPanel,s.rightPanel];});
    if(!current.includes(id))await page.getByTitle(labels[id],{exact:true}).click();
  }
  const right=['parts','notation','export','color','harmony','chordtools','numbering','lyricstyle','chords','roman','stats'].includes(id);
  return page.locator(`${right?'.analysis':'.inspector'} .panel--visible`);
}

export async function openHeaderAction(page,name) {
  const close=page.getByRole('button',{name:'도구 닫기',exact:true});if(await close.isVisible())await close.click();
  const details=page.locator('.mobile-actions');
  if(await details.isVisible())await details.locator('summary').click();
  await page.getByRole('button',{name,exact:true}).click();
}

export async function runPanel(page,{id,side,before,action,expect:verify}) {
  await before?.();const panel=await openPanel(page,id,side);await expect(panel).toBeVisible();await action?.(panel);await verify(panel);
}

export async function uploadFixture(page, name = 'f01-basic.musicxml') {
  await page.locator('input[type="file"]').setInputFiles(path.join(fixturesDir, name));
  await waitForScore(page);
}

export async function getDocQuery(page, selector) {
  return page.evaluate((cssSelector) => {
    const state = window.__mxlGetState?.();
    const doc = state?.files?.[state.activeFile || 0]?.xmlDoc;
    const node = doc?.querySelector(cssSelector);
    return node
      ? {
          text: node.textContent,
          attrs: Array.from(node.attributes || []).reduce((acc, attr) => {
            acc[attr.name] = attr.value;
            return acc;
          }, {}),
        }
      : null;
  }, selector);
}

export async function getPitchAt(page, { measure = 1, noteIdx = 0 } = {}) {
  return page.evaluate(({ measure, noteIdx }) => {
    const state = window.__mxlGetState?.();
    const doc = state?.files?.[state.activeFile || 0]?.xmlDoc;
    const measureNode = doc?.querySelector(`measure[number="${measure}"]`);
    const notes = Array.from(measureNode?.querySelectorAll('note') || []).filter((note) => !note.querySelector('rest'));
    const pitch = notes[noteIdx]?.querySelector('pitch');
    if (!pitch) return null;
    return {
      step: pitch.querySelector('step')?.textContent || null,
      alter: pitch.querySelector('alter')?.textContent || '0',
      octave: pitch.querySelector('octave')?.textContent || null,
    };
  }, { measure, noteIdx });
}
