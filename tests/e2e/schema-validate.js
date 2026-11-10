// MusicXML 4.0 스키마(tests/schema/musicxml.xsd)로 악보 XML을 검증하는 테스트 헬퍼입니다.
// 검증 엔진은 ① xmllint-wasm(devDependency, 버전 고정) ② 시스템 xmllint(libxml2-utils) 순서로 찾습니다.
// 둘 다 없으면 schemaSupport()가 {ok:false, reason}을 돌려주므로 스펙은 test.skip(…, reason)으로 건너뜁니다.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const schemaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../schema');
const schemaFile = path.join(schemaDir, 'musicxml.xsd');
const MAX_ERRORS = 8;

let cached;
async function detect() {
  if (cached) return cached;
  const reasons = [];
  try {
    // MXL_SCHEMA_BACKEND=native 로 시스템 xmllint 폴백 경로만 시험할 수 있습니다.
    if (process.env.MXL_SCHEMA_BACKEND === 'native') throw new Error('MXL_SCHEMA_BACKEND=native 로 건너뜀');
    const mod = await import('xmllint-wasm');
    const validateXML = mod.validateXML ?? mod.default?.validateXML;
    if (typeof validateXML !== 'function') throw new Error('validateXML을 찾지 못했습니다.');
    const read = (name) => fs.readFileSync(path.join(schemaDir, name), 'utf8');
    cached = {
      ok: true,
      backend: 'xmllint-wasm',
      validateXML,
      schema: read('musicxml.xsd'),
      preload: [
        { fileName: 'xml.xsd', contents: read('xml.xsd') },
        { fileName: 'xlink.xsd', contents: read('xlink.xsd') },
      ],
    };
    return cached;
  } catch (error) {
    reasons.push(`xmllint-wasm: ${error.message}`);
  }
  try {
    execFileSync('xmllint', ['--version'], { stdio: 'ignore' });
    cached = { ok: true, backend: 'xmllint' };
    return cached;
  } catch (error) {
    reasons.push(`xmllint: ${error.code === 'ENOENT' ? '설치되어 있지 않습니다' : error.message}`);
  }
  cached = { ok: false, reason: `MusicXML 스키마 검증 엔진이 없습니다 (${reasons.join('; ')})` };
  return cached;
}

// {ok:true, backend} 또는 {ok:false, reason}.
export async function schemaSupport() {
  const { ok, backend, reason } = await detect();
  return ok ? { ok, backend } : { ok, reason };
}

// 오류 문장 배열을 돌려줍니다. 위반이 없으면 빈 배열입니다. 엔진이 없으면 예외를 던집니다(먼저 schemaSupport로 확인하세요).
export async function validateMusicXml(xmlString) {
  const engine = await detect();
  if (!engine.ok) throw new Error(engine.reason);
  if (engine.backend === 'xmllint-wasm') {
    const result = await engine.validateXML({
      xml: [{ fileName: 'score.xml', contents: String(xmlString) }],
      schema: [engine.schema],
      preload: engine.preload,
    });
    if (result.valid) return [];
    return result.errors.slice(0, MAX_ERRORS).map((error) => clean(error.rawMessage || error.message));
  }
  const tmp = path.join(os.tmpdir(), `mxl-schema-${process.pid}-${Math.random().toString(36).slice(2)}.xml`);
  fs.writeFileSync(tmp, String(xmlString));
  try {
    execFileSync('xmllint', ['--noout', '--nonet', '--schema', schemaFile, tmp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    return [];
  } catch (error) {
    const lines = String(error.stderr || error.message).split('\n').filter((line) => /error/i.test(line));
    return lines.map((line) => clean(line.replace(/^.*?:\d+:\s*/, ''))).slice(0, MAX_ERRORS);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

function clean(text) {
  return String(text).replace(/\s+/g, ' ').trim();
}

// 열려 있는 모든 파일의 xmlDoc을 직렬화해 {이름, 오류 배열} 목록으로 돌려줍니다.
export async function validateOpenFiles(page) {
  const files = await page.evaluate(() => (window.__mxlGetState?.().files || []).map((file) => ({
    name: file.name,
    xml: new XMLSerializer().serializeToString(file.xmlDoc),
  })));
  const results = [];
  for (const file of files) results.push({ name: file.name, errors: await validateMusicXml(file.xml) });
  return results;
}
