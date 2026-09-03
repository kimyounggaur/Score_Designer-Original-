import {chromium} from '@playwright/test';
import {spawn,spawnSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const files=[
  'MXL-Studio-사용자설명서/MXL-Studio-User-Manual-ko',
  'MXL-Studio-퀵스타트-사용자설명서/MXL-Studio-Quick-Start-ko',
  'MXL-Studio-업데이트-문서/MXL-Studio-최근업데이트-안내',
];
const server=spawn(process.execPath,[path.join(root,'node_modules/http-server/bin/http-server'),root,'-p','8082','-c-1'],{windowsHide:true,stdio:'ignore'});
let browser;
try{
  for(let i=0;i<30;i++){try{if((await fetch('http://127.0.0.1:8082/')).ok)break;}catch{}await delay(100);}
  browser=await chromium.launch(process.env.CI?{}:{channel:'chrome'});
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  for(const file of files){
    await page.goto('http://127.0.0.1:8082/'+file.split('/').map(encodeURIComponent).join('/')+'.html',{waitUntil:'load'});
    await page.evaluate(()=>document.fonts.ready);
    const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>!img.complete||img.naturalWidth===0).map(img=>img.src));
    if(broken.length)throw new Error('Missing manual images: '+broken.join(', '));
    await page.pdf({path:path.join(root,file+'.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true,tagged:true});
    console.log('PDF: '+file);
  }
}finally{await browser?.close();server.kill();}
const python=process.env.DOCS_PYTHON||'python';
const result=spawnSync(python,[path.join(root,'scripts/pdf-to-svg.py'),...files.map(file=>path.join(root,file+'.pdf'))],{windowsHide:true,stdio:'inherit',env:{...process.env,PYTHONUTF8:'1'}});
if(result.status!==0)throw new Error('SVG conversion needs PyMuPDF. Install scripts/requirements-docs.txt and set DOCS_PYTHON if needed.');
