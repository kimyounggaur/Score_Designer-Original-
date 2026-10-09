import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const parse = text => new DOMParser().parseFromString(text, 'text/xml');
const fixture = name => readFileSync(path.resolve('tests/fixtures', name), 'utf8');
let core;
beforeEach(async () => { delete window.MsczCore; vi.resetModules(); await import('../../mscz-core.js'); core = window.MsczCore; });

/* ---------- 도우미: 음표 요약과 합성 mscx ---------- */
const STEP_ALTER = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' };
const summarize = (doc, partIndex = 0) => Array.from(doc.querySelectorAll('part')[partIndex].querySelectorAll('measure'), measure => Array.from(measure.querySelectorAll('note'), note => {
  const rest = note.querySelector('rest');
  const pitch = rest ? 'R' : `${note.querySelector('step').textContent}${STEP_ALTER[note.querySelector('alter')?.textContent || '0']}${note.querySelector('octave').textContent}`;
  return `${pitch}/${note.querySelector('duration')?.textContent ?? 'g'}${note.querySelector('chord') ? '+' : ''}${note.querySelector('grace') ? 'g' : ''}`;
}));
const wrap = (staffBody, { version = '3.01', instrument = '', score = '', staff = '<StaffType group="pitched"/>' } = {}) =>
  `<?xml version="1.0" encoding="UTF-8"?><museScore version="${version}"><Score><Division>480</Division>${score}<Part><Staff id="1">${staff}</Staff><trackName>테스트</trackName><Instrument>${instrument}</Instrument></Part><Staff id="1">${staffBody}</Staff></Score></museScore>`;
const chord = (pitch, tpc, type = 'quarter', extra = '', noteExtra = '') => `<Chord><durationType>${type}</durationType>${extra}<Note>${noteExtra}<pitch>${pitch}</pitch><tpc>${tpc}</tpc></Note></Chord>`;
const rest = (type = 'quarter') => `<Rest><durationType>${type}</durationType></Rest>`;
const measure3 = (inner, attrs = '') => `<Measure${attrs}><voice>${inner}</voice></Measure>`;
const convert = (xml, options) => { const result = core.convertMscx(xml, options); return { ...result, doc: parse(result.xmlString) }; };

describe('MsczCore 기본 변환', () => {
  it('tpc를 철자로 바꿉니다', () => {
    expect(core.tpcToPitch(14, 60)).toEqual({ step: 'C', alter: 0, octave: 4 });
    expect(core.tpcToPitch(20, 66)).toEqual({ step: 'F', alter: 1, octave: 4 });
    expect(core.tpcToPitch(12, 70)).toEqual({ step: 'B', alter: -1, octave: 4 });
    expect(core.tpcToPitch(7, 59)).toEqual({ step: 'C', alter: -1, octave: 4 });
    // B♯3은 MIDI 60이지만 옥타브는 3입니다.
    expect(core.tpcToPitch(26, 60)).toEqual({ step: 'B', alter: 1, octave: 3 });
  });

  it('MusicXML 파일명과 확장자를 판별합니다', () => {
    expect(core.isMuseScoreFileName('곡.MSCZ')).toBe(true);
    expect(core.isMuseScoreFileName('곡.mscx')).toBe(true);
    expect(core.isMuseScoreFileName('곡.musicxml')).toBe(false);
    expect(core.musicXmlFileName('곡 (2).mscz')).toBe('곡 (2).musicxml');
  });

  it('출력이 score-partwise이고 파싱 오류가 없습니다', () => {
    const { doc } = convert(fixture('f10-musescore.mscx'));
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.documentElement.localName).toBe('score-partwise');
    expect(doc.querySelectorAll('part')).toHaveLength(2);
  });

  it('제목·작곡가·파트 정보를 옮기고 특수문자를 이스케이프합니다', () => {
    const { doc, title, stats } = convert(fixture('f10-musescore.mscx'));
    expect(title).toBe('MuseScore Fixture');
    expect(doc.querySelector('work-title').textContent).toBe('MuseScore Fixture');
    expect(doc.querySelector('creator[type="composer"]').textContent).toBe('Test Composer');
    expect(Array.from(doc.querySelectorAll('score-part part-name'), n => n.textContent)).toEqual(['Piano', 'Clarinet in B♭']);
    expect(doc.querySelector('score-part[id="P2"] midi-program').textContent).toBe('72');
    expect(stats).toEqual({ parts: 2, measures: 3, notes: 13 });
    const tricky = convert(wrap(measure3(chord(60, 14, 'whole')), { score: '<metaTag name="workTitle">A &amp; B &lt;1&gt; "c"</metaTag>' }));
    expect(tricky.title).toBe('A & B <1> "c"');
    expect(tricky.doc.querySelector('work-title').textContent).toBe('A & B <1> "c"');
  });

  it('제목 메타데이터가 없으면 첫 프레임 제목과 옵션 제목 순으로 씁니다', () => {
    const box = '<VBox><Text><style>title</style><text>프레임 제목</text></Text></VBox>';
    expect(convert(wrap(box + measure3(chord(60, 14, 'whole')))).title).toBe('프레임 제목');
    expect(convert(wrap(measure3(chord(60, 14, 'whole'))), { title: '파일명' }).title).toBe('파일명');
  });
});

describe('MsczCore 음표·리듬 변환', () => {
  it('픽스처의 못갖춘마디·붙임줄·슬러·잇단음표·둘째 보이스를 보존합니다', () => {
    const { doc } = convert(fixture('f10-musescore.mscx'));
    const measures = doc.querySelectorAll('part')[0].querySelectorAll('measure');
    // 못갖춘마디는 0번·implicit, 이후 번호는 1부터입니다.
    expect(Array.from(measures, m => m.getAttribute('number'))).toEqual(['0', '1', '2']);
    expect(measures[0].getAttribute('implicit')).toBe('yes');
    expect(doc.querySelector('divisions').textContent).toBe('3');
    expect(summarize(doc)[0]).toEqual(['F#4/3', 'R/3']);
    expect(summarize(doc)[1]).toEqual(['D5/3', 'D5/3', 'A4/1', 'B4/1', 'C#5/1', 'R/3', 'D4/6', 'E4/6', 'F#3/12']);
    // 같은 마디의 두 보이스는 backup으로 되돌아오고 오선·보이스 번호가 겹치지 않습니다.
    const backups = Array.from(measures[1].querySelectorAll('backup duration'), n => n.textContent);
    expect(backups).toEqual(['12', '12']);
    const voices = new Set(Array.from(measures[1].querySelectorAll('note voice'), n => n.textContent));
    expect(Array.from(voices).sort()).toEqual(['1', '2', '5']);
    const tied = measures[1].querySelectorAll('note');
    expect(Array.from(tied[0].querySelectorAll('tie'), n => n.getAttribute('type'))).toEqual(['start']);
    expect(Array.from(tied[1].querySelectorAll('tie'), n => n.getAttribute('type'))).toEqual(['stop']);
    expect(tied[0].querySelector('slur').getAttribute('type')).toBe('start');
    expect(tied[1].querySelector('slur').getAttribute('type')).toBe('stop');
    expect(tied[0].querySelector('slur').getAttribute('number')).toBe(tied[1].querySelector('slur').getAttribute('number'));
    const triplet = Array.from(measures[1].querySelectorAll('note')).filter(n => n.querySelector('time-modification'));
    expect(triplet).toHaveLength(3);
    expect(triplet[0].querySelector('actual-notes').textContent).toBe('3');
    expect(triplet[0].querySelector('normal-notes').textContent).toBe('2');
    expect(triplet[0].querySelector('tuplet').getAttribute('type')).toBe('start');
    expect(triplet[2].querySelector('tuplet').getAttribute('type')).toBe('stop');
  });

  it('반복·코드·가사·템포·셈여림을 옮깁니다', () => {
    const { doc } = convert(fixture('f10-musescore.mscx'));
    const measures = doc.querySelectorAll('part')[0].querySelectorAll('measure');
    expect(measures[1].querySelector('barline[location="left"] repeat').getAttribute('direction')).toBe('forward');
    expect(measures[2].querySelector('barline[location="right"] repeat').getAttribute('direction')).toBe('backward');
    expect(measures[2].querySelector('harmony root-step').textContent).toBe('D');
    expect(measures[2].querySelector('harmony kind').textContent).toBe('minor-seventh');
    expect(measures[2].querySelector('harmony kind').getAttribute('text')).toBe('m7');
    expect(measures[0].querySelector('lyric text').textContent).toBe('la');
    expect(measures[0].querySelector('metronome per-minute').textContent).toBe('100');
    expect(measures[0].querySelector('sound').getAttribute('tempo')).toBe('100');
    expect(measures[0].querySelector('dynamics mf')).not.toBeNull();
    expect(doc.querySelector('key fifths').textContent).toBe('2');
    expect(doc.querySelector('time beats').textContent).toBe('4');
  });

  it('둘 이상의 오선을 가진 파트에 staves와 음자리표를 만듭니다', () => {
    const { doc } = convert(fixture('f10-musescore.mscx'));
    const first = doc.querySelector('part[id="P1"] measure attributes');
    expect(first.querySelector('staves').textContent).toBe('2');
    expect(Array.from(first.querySelectorAll('clef'), c => `${c.getAttribute('number')}:${c.querySelector('sign').textContent}`)).toEqual(['1:G', '2:F']);
    expect(Array.from(doc.querySelectorAll('part[id="P1"] note staff'), n => n.textContent)).toContain('2');
  });

  it('이조 악기는 기보음·기보 조표와 transpose를 씁니다', () => {
    const { doc } = convert(fixture('f10-musescore.mscx'));
    expect(summarize(doc, 1)).toEqual([['R/3'], ['E4/12'], ['G#4/12']]);
    expect(doc.querySelector('part[id="P2"] transpose diatonic').textContent).toBe('-1');
    expect(doc.querySelector('part[id="P2"] transpose chromatic').textContent).toBe('-2');
    expect(doc.querySelector('part[id="P2"] key fifths').textContent).toBe('4');
  });

  it('각 보이스의 길이 합이 마디 길이를 넘지 않습니다', () => {
    const { doc } = convert(fixture('f10-musescore.mscx'));
    const divisions = Number(doc.querySelector('divisions').textContent);
    for (const part of doc.querySelectorAll('part')) {
      for (const measure of part.querySelectorAll('measure')) {
        const totals = new Map();
        for (const note of measure.querySelectorAll('note')) {
          if (note.querySelector('chord') || note.querySelector('grace')) continue;
          const voice = note.querySelector('voice').textContent;
          totals.set(voice, (totals.get(voice) || 0) + Number(note.querySelector('duration').textContent));
        }
        const limit = measure.getAttribute('implicit') === 'yes' ? divisions : divisions * 4;
        for (const total of totals.values()) expect(total).toBeLessThanOrEqual(limit);
      }
    }
  });

  it('장식음은 grace로, 코드의 여러 음은 chord로 내보냅니다', () => {
    const grace = `<Chord><acciaccatura/><durationType>eighth</durationType><Note><pitch>62</pitch><tpc>16</tpc></Note></Chord>`;
    const triad = `<Chord><durationType>whole</durationType><Note><pitch>60</pitch><tpc>14</tpc></Note><Note><pitch>64</pitch><tpc>18</tpc></Note><Note><pitch>67</pitch><tpc>15</tpc></Note></Chord>`;
    const { doc } = convert(wrap(measure3(grace + triad)));
    const notes = doc.querySelectorAll('note');
    expect(notes[0].querySelector('grace').getAttribute('slash')).toBe('yes');
    expect(notes[0].querySelector('duration')).toBeNull();
    const whole = Number(doc.querySelector('divisions').textContent) * 4;
    expect(summarize(doc)[0]).toEqual(['D4/gg', `C4/${whole}`, `E4/${whole}+`, `G4/${whole}+`]);
  });

  it('점음표와 겹잇단(2중 잇단음표) 길이를 정수로 맞춥니다', () => {
    const dotted = chord(60, 14, 'quarter', '<dots>1</dots>') + chord(62, 16, 'eighth');
    const { doc } = convert(wrap(measure3(dotted + `<Tuplet><normalNotes>2</normalNotes><actualNotes>3</actualNotes><baseNote>eighth</baseNote></Tuplet>${chord(64, 18, 'eighth')}${chord(65, 13, 'eighth')}${chord(67, 15, 'eighth')}<endTuplet/>${rest('quarter')}`)));
    const durations = Array.from(doc.querySelectorAll('note duration'), n => Number(n.textContent));
    expect(durations.every(Number.isInteger)).toBe(true);
    const divisions = Number(doc.querySelector('divisions').textContent);
    expect(durations.reduce((a, b) => a + b, 0)).toBe(divisions * 4);
    expect(doc.querySelector('note dot')).not.toBeNull();
  });

  it('유효한 음이 없는 Chord는 같은 길이의 쉼표로 대신합니다', () => {
    const empty = '<Chord><durationType>half</durationType></Chord>';
    const { doc } = convert(wrap(measure3(empty + chord(60, 14, 'half'))));
    expect(summarize(doc)[0]).toEqual(['R/' + doc.querySelector('note duration').textContent, 'C4/' + doc.querySelector('note duration').textContent]);
  });

  it('옥타브 기호(8va) 아래의 기보 pitch를 실음으로 환산합니다', () => {
    const start = '<Spanner type="Ottava"><Ottava><subtype>8va</subtype></Ottava><next><location><fractions>1/4</fractions></location></next></Spanner>';
    const stop = '<Spanner type="Ottava"><prev><location><fractions>-1/4</fractions></location></prev></Spanner>';
    const { doc } = convert(wrap(measure3(start + chord(69, 17) + stop + chord(69, 17) + rest('half'))));
    expect(summarize(doc)[0].slice(0, 2).map(s => s.split('/')[0])).toEqual(['A5', 'A4']);
    expect(doc.querySelector('octave-shift').getAttribute('type')).toBe('down');
  });

  it('두 음 트레몰로는 기보 길이가 아니라 실제 길이를 따릅니다', () => {
    const tremolo = type => `<Chord><durationType>half</durationType><duration>1/4</duration><Note><pitch>60</pitch><tpc>14</tpc></Note>${type}</Chord>`;
    const { doc } = convert(wrap(measure3(tremolo('<Tremolo><subtype>c16</subtype></Tremolo>') + tremolo('') + rest('half'))));
    const durations = Array.from(doc.querySelectorAll('note duration'), n => Number(n.textContent));
    const divisions = Number(doc.querySelector('divisions').textContent);
    expect(durations.reduce((a, b) => a + b, 0)).toBe(divisions * 4);
    expect(Array.from(doc.querySelectorAll('tremolo'), n => n.getAttribute('type'))).toEqual(['start', 'stop']);
    expect(doc.querySelector('tremolo').textContent).toBe('2');
  });

  it('마디 반복 기호는 앞 마디의 음표를 펼칩니다', () => {
    const repeat = '<MeasureRepeat><subtype>1</subtype><durationType>measure</durationType><duration>4/4</duration></MeasureRepeat>';
    const { doc } = convert(wrap(measure3(chord(60, 14, 'half') + chord(62, 16, 'half')) + measure3(repeat)));
    expect(summarize(doc)[1]).toEqual(summarize(doc)[0]);
  });

  it('아티큘레이션·장식음·페르마타·가사 연장을 옮깁니다', () => {
    const marked = `<Chord><durationType>quarter</durationType>
      <Articulation><subtype>articStaccatoAbove</subtype></Articulation>
      <Articulation><subtype>articAccentBelow</subtype></Articulation>
      <Articulation><subtype>fermataAbove</subtype></Articulation>
      <Ornament><subtype>ornamentTrill</subtype></Ornament>
      <Lyrics><no>1</no><syllabic>begin</syllabic><text>둘째 절</text><ticks>480</ticks></Lyrics>
      <Note><pitch>60</pitch><tpc>14</tpc></Note></Chord>`;
    const { doc } = convert(wrap(measure3(marked + rest('half') + rest('quarter'))));
    const note = doc.querySelector('note');
    expect(Array.from(note.querySelectorAll('articulations > *'), n => n.localName)).toEqual(['staccato', 'accent']);
    expect(note.querySelector('ornaments trill-mark')).not.toBeNull();
    expect(note.querySelector('fermata')).not.toBeNull();
    expect(note.querySelector('lyric').getAttribute('number')).toBe('2');
    expect(note.querySelector('lyric syllabic').textContent).toBe('begin');
    expect(note.querySelector('lyric extend')).not.toBeNull();
  });

  it('셈여림·템포 글·리허설·반복 기호를 방향 요소로 옮깁니다', () => {
    const marks = `<Dynamic><subtype>sfz</subtype></Dynamic><Dynamic><subtype>mp</subtype></Dynamic>
      <Tempo><tempo>2</tempo><text>Allegro</text></Tempo><StaffText><text><b>dolce</b></text></StaffText>
      <RehearsalMark><text>A</text></RehearsalMark><Marker><label>coda</label></Marker><Jump><jumpTo>start</jumpTo><text>D.C.</text></Jump>`;
    const { doc } = convert(wrap(measure3(marks + chord(60, 14, 'whole'))));
    expect(Array.from(doc.querySelectorAll('dynamics > *'), n => n.localName)).toEqual(['sfz', 'mp']);
    expect(doc.querySelector('words').textContent).toBe('Allegro');
    expect(doc.querySelector('sound[tempo]').getAttribute('tempo')).toBe('120');
    expect(Array.from(doc.querySelectorAll('words'), n => n.textContent)).toContain('dolce');
    expect(doc.querySelector('rehearsal').textContent).toBe('A');
    expect(doc.querySelector('coda')).not.toBeNull();
    expect(doc.querySelector('sound[dacapo="yes"]')).not.toBeNull();
  });

  it('보이지 않는 음표와 큐 음표를 표시합니다', () => {
    const hidden = `<Chord><durationType>quarter</durationType><Note><visible>0</visible><pitch>60</pitch><tpc>14</tpc></Note></Chord>`;
    const cue = `<Chord><small>1</small><durationType>quarter</durationType><Note><Spanner type="Tie"><Tie/><next><location><fractions>1/4</fractions></location></next></Spanner><pitch>62</pitch><tpc>16</tpc><play>0</play></Note></Chord>`;
    const { doc } = convert(wrap(measure3(hidden + cue + rest('half'))));
    const notes = doc.querySelectorAll('note');
    expect(notes[0].getAttribute('print-object')).toBe('no');
    expect(notes[1].querySelector('cue')).not.toBeNull();
    expect(notes[1].querySelector('tie')).toBeNull();
  });
});

describe('MsczCore 형식 버전 호환', () => {
  it('2.x: 보이스를 track/tick으로, 잇단음표를 id 참조로, 붙임줄을 Tie id로 읽습니다', () => {
    const v1 = chord(60, 14, 'half', '', '<Tie id="2"></Tie>') + chord(60, 14, 'quarter', '', '<endSpanner id="2"/>') + rest('quarter');
    // 둘째 보이스는 <track>으로 구분하고, 마디 안 960틱(=2분음표 위치)에서 시작합니다.
    const v2 = `<tick>960</tick><Chord><track>1</track><durationType>half</durationType><Note><pitch>55</pitch><tpc>15</tpc></Note></Chord>`;
    const tuplet = `<Tuplet id="1"><normalNotes>2</normalNotes><actualNotes>3</actualNotes><baseNote>eighth</baseNote></Tuplet>`
      + [[64, 18], [65, 13], [67, 15]].map(([p, t]) => `<Chord><Tuplet>1</Tuplet><durationType>eighth</durationType><Note><pitch>${p}</pitch><tpc>${t}</tpc></Note></Chord>`).join('') + rest('quarter') + rest('half');
    const { doc } = convert(wrap(`<Measure number="1">${v1}${v2}</Measure><Measure number="2">${tuplet}</Measure>`, { version: '2.06' }));
    const d = Number(doc.querySelector('divisions').textContent);
    expect(summarize(doc)[0]).toEqual([`C4/${2 * d}`, `C4/${d}`, `R/${d}`, `G3/${2 * d}`]);
    const first = doc.querySelectorAll('measure')[0];
    expect(Array.from(first.querySelectorAll('tie'), n => n.getAttribute('type'))).toEqual(['start', 'stop']);
    // 첫 보이스가 4박에서 끝난 뒤, 둘째 보이스가 시작하는 2박 지점으로 한 번에 되돌아갑니다.
    expect(first.querySelector('backup duration').textContent).toBe(String(2 * d));
    expect(first.querySelector('forward')).toBeNull();
    expect(doc.querySelectorAll('measure')[1].querySelectorAll('time-modification')).toHaveLength(3);
    expect(Array.from(new Set(Array.from(first.querySelectorAll('note voice'), n => n.textContent))).sort()).toEqual(['1', '2']);
  });

  it('2.x: 옥타브 기호는 id로 시작하고 endSpanner로 끝나며 pitch를 실음으로 환산합니다', () => {
    const body = `<Ottava id="3"><subtype>8vb</subtype></Ottava>${chord(72, 14)}<endSpanner id="3"/>${chord(72, 14)}${rest('half')}`;
    const { doc } = convert(wrap(`<Measure number="1">${body}</Measure>`, { version: '2.06' }));
    expect(summarize(doc)[0].slice(0, 2).map(s => s.split('/')[0])).toEqual(['C4', 'C5']);
  });

  it('1.x: Score 래퍼가 없고 박자표가 nom1/den이며 음자리표가 숫자입니다', () => {
    const xml = `<?xml version="1.0"?><museScore version="1.14"><Division>480</Division><Part><Staff id="1"/><Instrument><trackName>Flute</trackName></Instrument></Part><Staff id="1"><Measure number="1"><TimeSig><subtype>260</subtype><den>4</den><nom1>3</nom1></TimeSig><Clef><subtype>4</subtype></Clef>${chord(48, 14)}${rest('half')}</Measure></Staff></museScore>`;
    const { doc } = convert(xml);
    expect(doc.querySelector('time beats').textContent).toBe('3');
    expect(doc.querySelector('clef sign').textContent).toBe('F');
    expect(doc.querySelector('part-name').textContent).toBe('Flute');
  });

  it('4.x: concertKey/actualKey 조표를 읽고 이조 악기는 actualKey를 우선합니다', () => {
    const sax = '<transposeDiatonic>-5</transposeDiatonic><transposeChromatic>-9</transposeChromatic>';
    const xml = wrap(`<Measure><voice><KeySig><concertKey>0</concertKey><actualKey>3</actualKey></KeySig><TimeSig><sigN>4</sigN><sigD>4</sigD></TimeSig>${chord(60, 14, 'whole', '', '').replace('<tpc>14</tpc>', '<tpc>14</tpc><tpc2>17</tpc2>')}</voice></Measure>`, { version: '4.60', instrument: sax });
    const { doc } = convert(xml);
    expect(doc.querySelector('key fifths').textContent).toBe('3');
    expect(summarize(doc)[0]).toEqual(['A4/' + doc.querySelector('note duration').textContent]);
    // actualKey가 없으면 실음 조표를 이조 간격만큼 옮깁니다(E♭ 알토 색소폰, C → A 장조).
    const noActual = wrap(`<Measure><voice><KeySig><concertKey>0</concertKey></KeySig>${rest('whole')}</voice></Measure>`, { version: '4.60', instrument: sax });
    expect(convert(noActual).doc.querySelector('key fifths').textContent).toBe('3');
  });

  it('3.x 콘서트 피치 모드에서는 accidental을 실음 조표로 보고 옮깁니다', () => {
    const bb = '<transposeDiatonic>-1</transposeDiatonic><transposeChromatic>-2</transposeChromatic>';
    const body = measure3(`<KeySig><accidental>-1</accidental></KeySig>${rest('whole')}`);
    expect(convert(wrap(body, { instrument: bb })).doc.querySelector('key fifths').textContent).toBe('-1');
    expect(convert(wrap(body, { instrument: bb, score: '<Style><concertPitch>1</concertPitch></Style>' })).doc.querySelector('key fifths').textContent).toBe('1');
  });

  it('4.6 이후: 파트 안의 Staff에 id가 없어도 악보 전체 순서로 연결합니다', () => {
    const xml = `<?xml version="1.0"?><museScore version="4.60"><Score><Division>480</Division>
      <Part id="1"><Staff><StaffType group="pitched"/></Staff><trackName>A</trackName><Instrument id="a"/></Part>
      <Part id="2"><Staff><StaffType group="pitched"/></Staff><Staff><StaffType group="pitched"/><defaultClef>F</defaultClef></Staff><trackName>B</trackName><Instrument id="b"/></Part>
      <Staff id="1">${measure3(chord(60, 14, 'whole'))}</Staff><Staff id="2">${measure3(chord(62, 16, 'whole'))}</Staff><Staff id="3">${measure3(chord(48, 14, 'whole'))}</Staff></Score></museScore>`;
    const { doc } = convert(xml);
    expect(summarize(doc, 0)[0][0].split('/')[0]).toBe('C4');
    expect(summarize(doc, 1)[0].map(s => s.split('/')[0])).toEqual(['D4', 'C3']);
  });

  it('여러 마디를 접어 보이는 multiMeasureRest 마디는 건너뜁니다', () => {
    const xml = wrap(measure3(rest('whole')) + `<Measure len="8/4"><multiMeasureRest>2</multiMeasureRest><voice><Rest><durationType>measure</durationType><duration>8/4</duration></Rest></voice></Measure>` + measure3(rest('whole')));
    expect(convert(xml).doc.querySelectorAll('measure')).toHaveLength(2);
  });

  it('5.00: 끝 음에 저장된 붙임줄(startElement/endElement)을 양쪽 음에 연결합니다', () => {
    const first = `<Chord><eid>c1</eid><durationType>whole</durationType><Note><eid>n1</eid><pitch>60</pitch><tpc>14</tpc></Note></Chord>`;
    const second = `<Chord><eid>c2</eid><durationType>whole</durationType><Note><eid>n2</eid><Tie><startElement>n1</startElement><endElement>n2</endElement></Tie><pitch>60</pitch><tpc>14</tpc></Note></Chord>`;
    const { doc } = convert(wrap(measure3(first) + measure3(second), { version: '5.00' }));
    const notes = doc.querySelectorAll('note');
    expect(Array.from(notes[0].querySelectorAll('tie'), n => n.getAttribute('type'))).toEqual(['start']);
    expect(Array.from(notes[1].querySelectorAll('tie'), n => n.getAttribute('type'))).toEqual(['stop']);
  });

  it('5.00: SpannerMap의 옥타브·슬러·헤어핀·볼타를 처리합니다', () => {
    const c = (id, p, tpc, type = 'quarter') => `<Chord><eid>${id}</eid><durationType>${type}</durationType><Note><pitch>${p}</pitch><tpc>${tpc}</tpc></Note></Chord>`;
    const m1 = `<Measure><eid>m1</eid><voice>${c('a', 60, 14)}${c('b', 62, 16)}${c('c', 64, 18)}${c('d', 65, 13)}</voice></Measure>`;
    const m2 = `<Measure><eid>m2</eid><voice>${c('e', 60, 14, 'whole')}</voice></Measure>`;
    const map = `<SpannerMap>
      <Ottava><subtype>8va</subtype><track2>0</track2><startTick>1/4</startTick><ticks>1/4</ticks><eid>o</eid><track>0</track></Ottava>
      <Slur><startElement>a</startElement><endElement>c</endElement><eid>s</eid><track>0</track></Slur>
      <HairPin><subtype>0</subtype><track2>0</track2><startTick>0/1</startTick><ticks>1/2</ticks><eid>h</eid><track>0</track></HairPin>
      <Volta><endHookType>1</endHookType><startElement>m2</startElement><endElement>m2</endElement><eid>v</eid><track>0</track><endings>1</endings></Volta>
    </SpannerMap>`;
    const xml = wrap(m1 + m2, { version: '5.00' }).replace('</Score>', `${map}</Score>`);
    const { doc } = convert(xml);
    expect(summarize(doc)[0][1].split('/')[0]).toBe('D5');
    expect(summarize(doc)[0][0].split('/')[0]).toBe('C4');
    expect(summarize(doc)[0][2].split('/')[0]).toBe('E4');
    expect(Array.from(doc.querySelectorAll('slur'), n => n.getAttribute('type'))).toEqual(['start', 'stop']);
    expect(Array.from(doc.querySelectorAll('wedge'), n => n.getAttribute('type'))).toEqual(['crescendo', 'stop']);
    expect(doc.querySelectorAll('measure')[1].querySelector('ending').getAttribute('type')).toBe('start');
    expect(doc.querySelectorAll('measure')[1].querySelectorAll('ending')).toHaveLength(2);
  });

  it('3.x: 볼타(Spanner)를 시작·끝 ending으로 옮깁니다', () => {
    const volta = '<Spanner type="Volta"><Volta><endings>1</endings></Volta><next><location><measures>1</measures></location></next></Spanner>';
    const xml = wrap(measure3(chord(60, 14, 'whole')) + `<Measure><endRepeat>2</endRepeat><voice>${volta}${chord(62, 16, 'whole')}</voice></Measure>` + measure3(chord(64, 18, 'whole')));
    const { doc } = convert(xml);
    const measures = doc.querySelectorAll('measure');
    expect(measures[1].querySelector('ending[type="start"]').getAttribute('number')).toBe('1');
    expect(measures[1].querySelector('ending[type="stop"]')).not.toBeNull();
    expect(measures[1].querySelector('repeat[direction="backward"]')).not.toBeNull();
    expect(measures[2].querySelector('ending')).toBeNull();
  });
});

describe('MsczCore .mscz 압축과 오류', () => {
  const makeZip = async files => {
    const zip = new JSZip();
    for (const [name, content] of Object.entries(files)) zip.file(name, content);
    return zip.generateAsync({ type: 'uint8array' });
  };

  it('container.xml의 rootfile로 .mscx를 찾아 변환합니다', async () => {
    const mscx = fixture('f10-musescore.mscx');
    const bytes = await makeZip({
      'META-INF/container.xml': '<container><rootfiles><rootfile full-path="main.mscx"></rootfile></rootfiles></container>',
      'main.mscx': mscx,
      'Thumbnails/thumbnail.png': 'x',
      'Excerpts/part/excerpt.mscx': '<museScore version="4.60"></museScore>',
    });
    const direct = core.convertMscx(mscx);
    const zipped = await core.convertMscz(bytes, { JSZip });
    expect(zipped.xmlString).toBe(direct.xmlString);
  });

  it('container.xml이 없거나 깨져도 최상위 .mscx를 찾습니다', async () => {
    const mscx = fixture('f10-musescore.mscx');
    const noContainer = await makeZip({ 'Excerpts/a/x.mscx': '<museScore version="4.60"></museScore>', 'score.mscx': mscx });
    expect((await core.convertMscz(noContainer, { JSZip })).stats.parts).toBe(2);
    const broken = await makeZip({ 'META-INF/container.xml': '<container><rootfile', 'score.mscx': mscx });
    expect((await core.convertMscz(broken, { JSZip })).stats.parts).toBe(2);
  });

  it('.mscx가 없는 압축 파일, JSZip 부재, 크기 초과를 구분해 알립니다', async () => {
    const empty = await makeZip({ 'readme.txt': 'x' });
    await expect(core.convertMscz(empty, { JSZip })).rejects.toThrow('.mscx');
    const withScore = await makeZip({ 'a.mscx': fixture('f10-musescore.mscx') });
    delete window.JSZip;
    await expect(core.convertMscz(withScore, {})).rejects.toThrow('압축 라이브러리');
    await expect(core.convertMscz(withScore, { JSZip, maxBytes: 10 })).rejects.toThrow('20MB');
  });

  it('MuseScore가 아닌 XML과 깨진 XML을 거부합니다', () => {
    expect(() => core.convertMscx('<score-partwise></score-partwise>')).toThrow('MuseScore 악보 파일이 아닙니다');
    expect(() => core.convertMscx('<museScore version="3.01"><Score></Score></museScore>')).toThrow('파트가 없습니다');
    expect(() => core.convertMscx('<museScore><Score>')).toThrow('파싱 오류');
    expect(() => core.convertMscx('<museScore version="3.01"></museScore>')).toThrow('본문');
  });

  it('지원하지 않는 요소는 경고로 알립니다', () => {
    const tab = wrap(measure3(chord(60, 14, 'whole')), { staff: '<StaffType group="tablature"/>' });
    expect(convert(tab).warnings).toContain('타브 악보는 일반 오선으로 변환됩니다.');
    const custom = wrap(measure3('<KeySig><custom>1</custom></KeySig>' + chord(60, 14, 'whole')));
    expect(convert(custom).warnings.join()).toContain('사용자 정의 조표');
  });
});
