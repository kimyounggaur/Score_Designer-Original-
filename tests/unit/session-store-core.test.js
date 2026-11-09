import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

async function loadCore({ idb = true } = {}) {
  vi.resetModules();
  window.indexedDB = idb ? new IDBFactory() : undefined;
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

const INDEX_KEY = 'mxlStudio.idbFallback.sessions.index';
const quotaError = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError');

describe('SessionStoreCore', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
  it('reports no-storage when neither IndexedDB nor localStorage is available', async () => {
    vi.spyOn(window, 'localStorage', 'get').mockReturnValue(undefined);
    const core = await loadCore({ idb: false });

    const result = await core.saveSession(makeSession('autosave'));

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'no-storage' }));
    expect(await core.loadSession('autosave')).toBeNull();
    expect(core.backend()).toBe('local');
  });

  it('returns quota from a full localStorage and keeps the id out of the index', async () => {
    const core = await loadCore({ idb: false });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError(); });

    const result = await core.saveSession(makeSession('slot-quota'));
    vi.restoreAllMocks();

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'quota' }));
    expect(JSON.parse(localStorage.getItem(INDEX_KEY) || '[]')).not.toContain('slot-quota');
    expect(core.loadLocalSession('slot-quota')).toBeNull();
    expect(await core.listSessions()).toEqual([]);
  });

  it('removes the new body again when only the index write fails', async () => {
    const core = await loadCore({ idb: false });
    const setItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === INDEX_KEY) throw quotaError();
      return setItem.call(this, key, value);
    });

    const result = await core.saveSession(makeSession('slot-rollback'));
    vi.restoreAllMocks();

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'quota' }));
    expect(core.loadLocalSession('slot-rollback')).toBeNull();
    expect(localStorage.getItem(INDEX_KEY)).toBeNull();
  });

  it('classifies other storage exceptions as storage-error', async () => {
    const core = await loadCore({ idb: false });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });

    const result = await core.saveSession(makeSession('slot-denied'));

    expect(result).toEqual(expect.objectContaining({ ok: false, reason: 'storage-error' }));
    expect(result.error).toContain('denied');
  });

  it('still succeeds through IndexedDB when only the local mirror is full', async () => {
    const core = await loadCore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw quotaError(); });

    const result = await core.saveSession(makeSession('slot-idb'));
    vi.restoreAllMocks();

    expect(result).toEqual(expect.objectContaining({ ok: true, backend: 'idb' }));
    expect((await core.loadSession('slot-idb')).id).toBe('slot-idb');
  });

  it('keeps legacy keys until every legacy session is saved, then removes them', async () => {
    const core = await loadCore();
    const oversized = makeSession('autosave');
    oversized.files[0].xml = 'x'.repeat(core.MAX_JSON_BYTES + 1);
    localStorage.setItem('legacySession', JSON.stringify(oversized));
    localStorage.setItem('legacySlots', JSON.stringify([makeSession('slot-1', '2026-07-05T00:00:00.000Z')]));

    const first = await core.migrateFromLocalStorage();

    expect(first).toEqual(expect.objectContaining({ ok: false, migrated: 1 }));
    expect(first.failed).toEqual([{ id: 'autosave', reason: 'too-large' }]);
    expect(localStorage.getItem('legacySession')).not.toBeNull();
    expect(localStorage.getItem('legacySlots')).not.toBeNull();
    expect(await core.getMeta('migratedAt')).toBeNull();
    expect((await core.getMeta('migrationPending')).value).toEqual(expect.objectContaining({ failed: 1 }));

    localStorage.removeItem('legacySession');
    const second = await core.migrateFromLocalStorage();

    expect(second).toEqual(expect.objectContaining({ ok: true, migrated: 1 }));
    expect(localStorage.getItem('legacySession')).toBeNull();
    expect(localStorage.getItem('legacySlots')).toBeNull();
    expect((await core.getMeta('migratedAt')).value).toEqual(expect.any(String));
    expect((await core.getMeta('migrationPending')).value).toBeNull();
    expect((await core.listSessions()).map((session) => session.id)).toEqual(['slot-1']);
  });

  it('gives legacy slots without ids the same id on every retry', async () => {
    const core = await loadCore();
    const { id: _id, savedAt: _savedAt, ...slot } = makeSession('ignored');
    const oversized = { ...slot, files: [{ ...slot.files[0], xml: 'x'.repeat(core.MAX_JSON_BYTES + 1) }] };
    localStorage.setItem('legacySlots', JSON.stringify([slot, oversized]));

    const first = await core.migrateFromLocalStorage();
    const second = await core.migrateFromLocalStorage();

    expect(first.failed).toEqual([{ id: 'slot-legacy-2', reason: 'too-large' }]);
    expect(second).toEqual(expect.objectContaining({ ok: false, migrated: 1 }));
    expect((await core.listSessions()).map((session) => session.id)).toEqual(['slot-legacy-1']);
  });
});
