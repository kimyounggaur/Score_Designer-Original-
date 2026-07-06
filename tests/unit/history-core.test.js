import { describe, expect, it } from 'vitest';
import '../../history-core.js';

function parseXml(text) {
  return new DOMParser().parseFromString(text, 'text/xml');
}

describe('HistoryCore', () => {
  it('stores deep-cloned snapshots and restores cloned files', () => {
    const first = { name: 'score.xml', xmlDoc: parseXml('<score><measure number="1"/></score>') };
    const pushedA = window.HistoryCore.pushHistoryEntry([], -1, [first], '업로드');

    expect(pushedA.history).toHaveLength(1);
    expect(pushedA.index).toBe(0);

    first.xmlDoc.querySelector('measure').setAttribute('number', '99');
    expect(pushedA.history[0].files[0].xmlDoc.querySelector('measure').getAttribute('number')).toBe('1');

    const second = { name: 'score.xml', xmlDoc: parseXml('<score><measure number="2"/></score>') };
    const pushedB = window.HistoryCore.pushHistoryEntry(pushedA.history, pushedA.index, [second], '조옮김');
    const restoredA = window.HistoryCore.restoreHistoryFiles(pushedB.history[0]);

    expect(restoredA[0].xmlDoc.querySelector('measure').getAttribute('number')).toBe('1');
    restoredA[0].xmlDoc.querySelector('measure').setAttribute('number', '77');
    expect(pushedB.history[0].files[0].xmlDoc.querySelector('measure').getAttribute('number')).toBe('1');
  });

  it('cuts redo branches and caps history at 50 entries', () => {
    const first = { name: 'a.xml', xmlDoc: parseXml('<score><m>1</m></score>') };
    const second = { name: 'b.xml', xmlDoc: parseXml('<score><m>2</m></score>') };
    const pushedA = window.HistoryCore.pushHistoryEntry([], -1, [first], '업로드');
    const pushedB = window.HistoryCore.pushHistoryEntry(pushedA.history, pushedA.index, [second], '조옮김');
    const branched = window.HistoryCore.pushHistoryEntry(pushedB.history, 0, [second], '분기 작업');

    expect(branched.history).toHaveLength(2);
    expect(branched.history[1].label).toBe('분기 작업');

    let rolling = { history: [], index: -1 };
    for (let i = 0; i < 55; i += 1) {
      rolling = window.HistoryCore.pushHistoryEntry(
        rolling.history,
        rolling.index,
        [{ name: `${i}.xml`, xmlDoc: parseXml(`<score><m>${i}</m></score>`) }],
        `작업 ${i}`,
      );
    }

    expect(rolling.history).toHaveLength(window.HistoryCore.MAX_HISTORY);
    expect(rolling.index).toBe(49);
    expect(rolling.history[0].label).toBe('작업 5');
  });

  it('serializes lightweight history metadata only', () => {
    const pushed = window.HistoryCore.pushHistoryEntry(
      [],
      -1,
      [{ name: 'score.xml', xmlDoc: parseXml('<score/>') }],
      '업로드',
      1234,
    );
    const meta = window.HistoryCore.serializeHistoryMeta(pushed.history);

    expect(meta).toEqual([{ label: '업로드', timestamp: 1234 }]);
    expect(meta[0]).not.toHaveProperty('files');
  });
});
