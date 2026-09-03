import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadCore() {
  vi.resetModules();
  await import('../../share-session-core.js');
  return window.ShareSessionCore;
}

const xml = '<score-partwise><part id="P1"><measure number="1"><note><lyric><text>안녕</text></lyric></note></measure></part></score-partwise>';

describe('ShareSessionCore', () => {
  beforeEach(() => {
    delete window.ShareSessionCore;
  });

  it('round-trips Korean XML through gzip base64url', async () => {
    const core = await loadCore();

    const encoded = await core.gzipToBase64Url(xml);
    const decoded = await core.gunzipFromBase64Url(encoded);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decoded).toBe(xml);
  });

  it('builds and parses v2 share URLs', async () => {
    const core = await loadCore();

    const info = await core.buildShareURLv2Info({ name: '한글.musicxml', xml }, 'https://example.com/mxl-studio.html');
    const parsed = await core.parseShareURLAny(info.url);

    expect(new URL(info.url).hash).toMatch(/^#v2\./);
    expect(info.version).toBe('v2');
    expect(parsed.name).toBe('한글.musicxml');
    expect(parsed.xml).toBe(xml);
  });

  it('keeps v1 share links parseable', async () => {
    const core = await loadCore();

    const url = core.buildShareURL({ name: 'legacy.musicxml', xml }, 'https://example.com/mxl-studio.html');
    const parsed = await core.parseShareURLAny(url);

    expect(new URL(url).hash).not.toMatch(/^#v2\./);
    expect(parsed.name).toBe('legacy.musicxml');
    expect(parsed.xml).toBe(xml);
  });
});
