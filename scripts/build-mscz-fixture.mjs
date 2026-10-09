// tests/fixtures/f10-musescore.mscx → f10-musescore.mscz (MuseScore 컨테이너 구조) 생성
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const dir = path.resolve('tests/fixtures');
const name = 'f10-musescore';
const zip = new JSZip();
zip.file('META-INF/container.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<container>\n  <rootfiles>\n    <rootfile full-path="${name}.mscx">\n    </rootfile>\n  </rootfiles>\n</container>\n`);
zip.file(`${name}.mscx`, readFileSync(path.join(dir, `${name}.mscx`)));
// 고정 날짜로 만들어 다시 생성해도 바이트가 같게 합니다.
for (const file of Object.values(zip.files)) file.date = new Date(Date.UTC(2026, 0, 1));
const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
writeFileSync(path.join(dir, `${name}.mscz`), bytes);
console.log(`${name}.mscz ${bytes.length}바이트`);
