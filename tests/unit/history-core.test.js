import { describe, expect, it } from 'vitest';
import '../../history-core.js';

function parseXml(text) {
  return new DOMParser().parseFromString(text, 'text/xml');
}

describe('HistoryCore', () => {
  it('stores deep-cloned snapshots and restores cloned files', () => {
    const first = { name: 'score.xml', xmlDoc: parseXml('<score><measure number="1"/></score>') };
    const pushedA = window.HistoryCore.pushHistoryEntry([], -1, [first], '업로드', undefined, {mode:'clone'});

    expect(pushedA.history).toHaveLength(1);
    expect(pushedA.index).toBe(0);

    first.xmlDoc.querySelector('measure').setAttribute('number', '99');
    expect(pushedA.history[0].files[0].xmlDoc.querySelector('measure').getAttribute('number')).toBe('1');

    const second = { name: 'score.xml', xmlDoc: parseXml('<score><measure number="2"/></score>') };
    const pushedB = window.HistoryCore.pushHistoryEntry(pushedA.history, pushedA.index, [second], '조옮김', undefined, {mode:'clone'});
    const restoredA = window.HistoryCore.restoreHistoryFiles(pushedB.history[0]);

    expect(restoredA[0].xmlDoc.querySelector('measure').getAttribute('number')).toBe('1');
    restoredA[0].xmlDoc.querySelector('measure').setAttribute('number', '77');
    expect(pushedB.history[0].files[0].xmlDoc.querySelector('measure').getAttribute('number')).toBe('1');
  });

  it('cuts redo branches and caps history at 50 entries', () => {
    const first = { name: 'a.xml', xmlDoc: parseXml('<score><m>1</m></score>') };
    const second = { name: 'b.xml', xmlDoc: parseXml('<score><m>2</m></score>') };
    const pushedA = window.HistoryCore.pushHistoryEntry([], -1, [first], '업로드', undefined, {mode:'clone'});
    const pushedB = window.HistoryCore.pushHistoryEntry(pushedA.history, pushedA.index, [second], '조옮김', undefined, {mode:'clone'});
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

describe('serialized history snapshots',()=>{
  it('round trips XML and Ossia without retaining a DOM and isolates restores',()=>{
    const file={name:'악보.mxl',sourceName:'원본.mxl',xmlDoc:parseXml('<score><note>C</note></score>'),ossiaMxml:'<ossia/>',ossiaMeta:{startMeasure:0}};
    const state=window.HistoryCore.pushHistoryEntry([],-1,[file],'업로드');
    const stored=state.history[0].files[0];expect(stored.xmlDoc).toBeUndefined();expect(stored.xml).toContain('<note>C</note>');
    file.xmlDoc.querySelector('note').textContent='D';file.ossiaMeta.startMeasure=2;
    const restored=window.HistoryCore.restoreHistoryFiles(state.history[0]);expect(restored[0].xmlDoc.querySelector('note').textContent).toBe('C');expect(restored[0].xmlString).toBe(stored.xml);expect(restored[0].ossiaMeta.startMeasure).toBe(0);
    restored[0].xmlDoc.querySelector('note').textContent='E';expect(window.HistoryCore.restoreHistoryFiles(state.history[0])[0].xmlDoc.querySelector('note').textContent).toBe('C');
  });
  it('shares unchanged text and counts each unique UTF-16 string once',()=>{
    const file={name:'a',xmlDoc:parseXml('<score/>')};const first=window.HistoryCore.pushHistoryEntry([],-1,[file]);
    const second=window.HistoryCore.pushHistoryEntry(first.history,first.index,[file]);expect(second.history[0].files[0].xml).toBe(second.history[1].files[0].xml);
    expect(window.HistoryCore.estimateHistoryBytes(second.history)).toBe(first.history[0].files[0].xml.length*2);
  });
  it('accepts injected serialization and parsing',()=>{
    const state=window.HistoryCore.pushHistoryEntry([],-1,[{name:'a',xmlDoc:{value:'data'}}],'test',1,{serialize:doc=>doc.value});
    expect(window.HistoryCore.restoreHistoryFiles(state.history[0],{parse:xml=>({parsed:xml})})[0].xmlDoc).toEqual({parsed:'data'});
  });
});
