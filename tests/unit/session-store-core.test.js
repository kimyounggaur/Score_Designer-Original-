import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

async function loadCore() {
  vi.resetModules();
  window.indexedDB = new IDBFactory();
  window.ShareSessionCore = {
    SESSION_KEY: 'legacySession',
    SLOT_KEY: 'legacySlots',
  };
  await import('../../session-store-core.js');
  return window.SessionStoreCore;
}

function makeSession(id, savedAt = '2026-07-06T00:00:00.000Z') {
  return {
    id,
    savedAt,
    activeFile: 0,
    files: [
      {
        name: 'score.musicxml',
        xml: '<score-partwise><part id="P1"/></score-partwise>',
        sourceName: 'score.musicxml',
      },
    ],
  };
}

describe('SessionStoreCore', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.SessionStoreCore;
  });

  it('saves and loads sessions through IndexedDB', async () => {
    const core = await loadCore();
    const session = makeSession('autosave');

    const result = await core.saveSession(session);
    const loaded = await core.loadSession('autosave');

    expect(result).toEqual(expect.objectContaining({ ok: true, backend: 'idb' }));
    expect(core.backend()).toBe('idb');
    expect(loaded.files[0].xml).toContain('score-partwise');
  });

  it('rejects sessions larger than 4MB without throwing', async () => {
    const core = await loadCore();
    const oversized = makeSession('autosave');
    oversized.files[0].xml = 'x'.repeat(core.MAX_JSON_BYTES + 1);

    const result = await core.saveSession(oversized);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('too-large');
    expect(result.size).toBeGreaterThan(core.MAX_JSON_BYTES);
    expect(await core.loadSession('autosave')).toBeNull();
  });

  it('migrates legacy localStorage once and removes originals', async () => {
    const core = await loadCore();
    localStorage.setItem('legacySession', JSON.stringify(makeSession('autosave')));
    localStorage.setItem('legacySlots', JSON.stringify([
      makeSession('slot-1', '2026-07-05T00:00:00.000Z'),
    ]));

    const first = await core.migrateFromLocalStorage();
    const second = await core.migrateFromLocalStorage();
    const sessions = await core.listSessions();

    expect(first).toEqual(expect.objectContaining({ ok: true, migrated: 2 }));
    expect(second).toEqual(expect.objectContaining({ ok: true, migrated: 0, skipped: true }));
    expect(localStorage.getItem('legacySession')).toBeNull();
    expect(localStorage.getItem('legacySlots')).toBeNull();
    expect(sessions.map((session) => session.id)).toEqual(['autosave', 'slot-1']);
  });

  it('lists autosave first, then slots by savedAt descending', async () => {
    const core = await loadCore();

    await core.saveSession(makeSession('slot-old', '2026-07-01T00:00:00.000Z'));
    await core.saveSession(makeSession('slot-new', '2026-07-06T00:00:00.000Z'));
    await core.saveSession(makeSession('autosave', '2026-07-02T00:00:00.000Z'));

    const sessions = await core.listSessions();

    expect(sessions.map((session) => session.id)).toEqual(['autosave', 'slot-new', 'slot-old']);
  });

  it('deletes both IndexedDB and the fallback mirror so a slot cannot reappear', async () => {
    const core = await loadCore();
    await core.saveSession(makeSession('slot-delete'));
    expect(core.loadLocalSession('slot-delete')).not.toBeNull();
    await core.deleteSession('slot-delete');
    expect(await core.loadSession('slot-delete')).toBeNull();
    expect(core.loadLocalSession('slot-delete')).toBeNull();
    expect(await core.listSessions()).toEqual([]);
  });
});
