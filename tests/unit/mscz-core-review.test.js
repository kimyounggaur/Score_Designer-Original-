import { beforeEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';

// 코드 검토에서 재현된 결함의 회귀 시험입니다. 합성 입력은 MuseScore가 실제로 쓰는 요소 모양을 따릅니다.
const parse = text => new DOMParser().parseFromString(text, 'text/xml');
let core;
beforeEach(async () => { delete window.MsczCore; vi.resetModules(); await import('../../mscz-core.js'); core = window.MsczCore; });

const STEP_ALTER = { '-2': 'bb', '-1': 'b', '0': '', '1': '#', '2': '##' };
const summarize = (doc, partIndex = 0) => Array.from(doc.querySelectorAll('part')[partIndex].querySelectorAll('measure'), measure => Array.from(measure.querySelectorAll('note'), note => {
  const rest = note.querySelector('rest');
  const pitch = rest ? 'R' : `${note.querySelector('step').textContent}${STEP_ALTER[note.querySelector('alter')?.textContent || '0']}${note.querySelector('octave').textContent}`;
  return `${pitch}/${note.querySelector('duration')?.textContent ?? 'g'}${note.querySelector('chord') ? '+' : ''}${note.querySelector('grace') ? 'g' : ''}`;
}));
const wrap = (staffBody, { version = '3.01', instrument = '', score = '', staff = '<StaffType group="pitched"/>', staffExtra = '' } = {}) =>
  `<?xml version="1.0" encoding="UTF-8"?><museScore version="${version}"><Score><Division>480</Division>${score}<Part><Staff id="1">${staff}${staffExtra}</Staff><trackName>테스트</trackName><Instrument>${instrument}</Instrument></Part><Staff id="1">${staffBody}</Staff></Score></museScore>`;
const chord = (pitch, tpc, type = 'quarter', extra = '', noteExtra = '') => `<Chord><durationType>${type}</durationType>${extra}<Note>${noteExtra}<pitch>${pitch}</pitch><tpc>${tpc}</tpc></Note></Chord>`;
const rest = (type = 'quarter', extra = '') => `<Rest><durationType>${type}</durationType>${extra}</Rest>`;
const measure3 = (inner, attrs = '') => `<Measure${attrs}><voice>${inner}</voice></Measure>`;
const convert = (xml, options) => { const result = core.convertMscx(xml, options); return { ...result, doc: parse(result.xmlString) }; };
const CDEF = chord(60, 14) + chord(62, 16) + chord(64, 18) + chord(65, 13);
const GABC = chord(67, 15) + chord(69, 17) + chord(71, 19) + chord(72, 14);
// 마디별·보이스별 길이 합(코드 구성음·장식음 제외)
const totals = doc => Array.from(doc.querySelector('part').querySelectorAll('measure'), measure => {
  const byVoice = new Map();
  for (const note of measure.querySelectorAll('note')) {
    if (note.querySelector('chord') || note.querySelector('grace')) continue;
    const voice = note.querySelector('voice').textContent;
    byVoice.set(voice, (byVoice.get(voice) || 0) + Number(note.querySelector('duration').textContent));
  }
  return Array.from(byVoice.values());
});
const divisionsOf = doc => Number(doc.querySelector('divisions').textContent);

describe('마디 반복·길이·틱 (검토 배치 A)', () => {
  it('2.x·3.0의 <RepeatMeasure>도 앞 마디를 펼칩니다', () => {
    const repeat = '<RepeatMeasure><durationType>measure</durationType><duration z="4" n="4"/></RepeatMeasure>';
    const v2 = convert(wrap(`<Measure number="1">${CDEF}</Measure><Measure number="2">${repeat}</Measure>`, { version: '2.06' })).doc;
    expect(summarize(v2)[1]).toEqual(summarize(v2)[0]);
    const v3 = convert(wrap(measure3(CDEF) + measure3(repeat), { version: '3.01' })).doc;
    expect(summarize(v3)[1]).toEqual(summarize(v3)[0]);
  });

  it('2마디 반복의 둘째 마디(온쉼표로 저장됨)도 해당 마디를 펼치고, 그룹 밖의 온쉼표는 쉼표로 둡니다', () => {
    const header = '<MeasureRepeat><subtype>2</subtype><durationType>measure</durationType><duration>4/4</duration></MeasureRepeat>';
    const wholeRest = rest('measure', '<duration>4/4</duration>');
    const { doc } = convert(wrap(measure3(CDEF) + measure3(GABC) + measure3(header) + measure3(wholeRest) + measure3(wholeRest)));
    const s = summarize(doc);
    expect(s[2]).toEqual(s[0]);
    expect(s[3]).toEqual(s[1]);
    expect(s[4]).toEqual([`R/${divisionsOf(doc) * 4}`]);
  });

  it('반복 마디의 마디선·리허설 마크·코드 심볼을 잃지 않습니다', () => {
    const bar = '<MeasureRepeat><subtype>1</subtype></MeasureRepeat><RehearsalMark><text>B</text></RehearsalMark><Harmony><root>14</root><name>7</name></Harmony><BarLine><subtype>end</subtype></BarLine>';
    const { doc } = convert(wrap(measure3(CDEF) + measure3(bar)));
    const second = doc.querySelectorAll('measure')[1];
    expect(summarize(doc)[1]).toEqual(summarize(doc)[0]);
    expect(second.querySelector('rehearsal').textContent).toBe('B');
    expect(second.querySelector('harmony kind').textContent).toBe('dominant');
    expect(second.querySelector('barline[location="right"] bar-style').textContent).toBe('light-heavy');
  });

  it('<duration>이 있는 잇단음표 속 음표에도 잇단음표 비율을 곱합니다', () => {
    const tuplet = '<Tuplet><normalNotes>2</normalNotes><actualNotes>3</actualNotes><baseNote>eighth</baseNote></Tuplet>';
    const trem = (p, t) => chord(p, t, 'quarter', '<duration>1/8</duration>');
    const { doc } = convert(wrap(measure3(tuplet + trem(60, 14) + trem(62, 16) + chord(64, 18, 'eighth') + '<endTuplet/>' + rest('half') + rest('quarter'))));
    expect(totals(doc)).toEqual([[divisionsOf(doc) * 4]]);
    const [a, b, c] = Array.from(doc.querySelectorAll('note duration'), n => Number(n.textContent));
    expect(a).toBe(b);
    expect(a).toBe(c);
  });

  it('2.x의 <duration z n> 속성과 1.x의 숫자 트레몰로로 두 음 트레몰로 길이를 맞춥니다', () => {
    const tremolo = sub => `<Chord><durationType>eighth</durationType><duration z="1" n="16"/><Note><pitch>60</pitch><tpc>14</tpc></Note>${sub}</Chord>`;
    const v2 = convert(wrap(`<Measure number="1">${tremolo('<Tremolo><subtype>c16</subtype></Tremolo>')}${tremolo('')}${rest('half')}${rest('quarter')}</Measure>`, { version: '2.06' })).doc;
    const d = divisionsOf(v2);
    const durations = Array.from(v2.querySelectorAll('note duration'), n => Number(n.textContent));
    expect(durations.slice(0, 2)).toEqual([d / 4, d / 4]);
    expect(Array.from(v2.querySelectorAll('tremolo'), n => n.getAttribute('type'))).toEqual(['start', 'stop']);

    const legacy = `<?xml version="1.0"?><museScore version="1.14"><Division>480</Division><Part><Staff><cleflist><clef tick="0" idx="0"/></cleflist></Staff><Instrument><trackName>Flute</trackName></Instrument></Part><Staff id="1"><Measure number="1"><TimeSig><subtype>260</subtype><den>4</den><nom1>4</nom1></TimeSig><Chord><durationType>whole</durationType><Note><pitch>72</pitch><tpc>14</tpc></Note></Chord><Chord><tick>960</tick><durationType>whole</durationType><Note><pitch>76</pitch><tpc>18</tpc></Note><Tremolo><subtype>3</subtype></Tremolo></Chord></Measure></Staff></museScore>`;
    const v1 = convert(legacy).doc;
    expect(summarize(v1)[0]).toEqual([`C5/${divisionsOf(v1) * 2}`, `E5/${divisionsOf(v1) * 2}`]);
    expect(Array.from(v1.querySelectorAll('tremolo'), n => `${n.getAttribute('type')}:${n.textContent}`)).toEqual(['start:1', 'stop:1']);
  });

  it('1.x: 음표 안쪽의 <tick>으로 보이스 중간의 빈 구간을 보존합니다', () => {
    const voice2 = `<Chord><track>1</track><durationType>quarter</durationType><Note><pitch>55</pitch><tpc>15</tpc></Note></Chord><Chord><track>1</track><tick>1440</tick><durationType>quarter</durationType><Note><pitch>57</pitch><tpc>17</tpc></Note></Chord>`;
    const { doc } = convert(wrap(`<Measure number="1">${CDEF}${voice2}</Measure>`, { version: '1.14' }));
    const d = divisionsOf(doc), measure = doc.querySelector('measure');
    expect(measure.querySelector('forward duration').textContent).toBe(String(2 * d));
    // 둘째 보이스: 음표 2개(2박) + 사이의 빈 구간 2박. 첫 보이스는 4박입니다.
    expect(totals(doc)[0].sort()).toEqual([2 * d, 4 * d]);
  });

  it('오선별 박자 비율이 있어도 5.00 SpannerMap 위치가 올바른 마디에 놓입니다', () => {
    const ts = '<TimeSig><sigN>12</sigN><sigD>8</sigD><stretchN>3</stretchN><stretchD>2</stretchD></TimeSig>';
    const bar = chord(60, 14, 'half', '<dots>1</dots>') + chord(62, 16, 'half', '<dots>1</dots>');
    const map = '<SpannerMap><HairPin><subtype>0</subtype><track2>0</track2><startTick>1/1</startTick><ticks>1/2</ticks><eid>h</eid><track>0</track></HairPin></SpannerMap>';
    const { doc } = convert(wrap(measure3(ts + bar) + measure3(bar), { version: '5.00' }).replace('</Score>', `${map}</Score>`));
    const measures = doc.querySelectorAll('measure');
    expect(measures[0].querySelector('wedge')).toBeNull();
    expect(measures[1].querySelectorAll('wedge')).toHaveLength(2);
  });

  it('2.x: 박자 비율이 있는 오선의 <tick>은 기보 단위로 환산합니다', () => {
    const ts = '<TimeSig><sigN>12</sigN><sigD>8</sigD><stretchN>3</stretchN><stretchD>2</stretchD></TimeSig>';
    const bar = chord(60, 14, 'half', '<dots>1</dots>') + chord(62, 16, 'half', '<dots>1</dots>');
    const second = `<tick>2880</tick><Chord><track>1</track><durationType>quarter</durationType><Note><pitch>55</pitch><tpc>15</tpc></Note></Chord>`;
    const { doc } = convert(wrap(`<Measure number="1">${ts}${bar}</Measure><Measure number="2">${bar}${second}</Measure>`, { version: '2.06' }));
    const d = divisionsOf(doc);
    // 실제 길이 1(온음표) 마디의 절반 지점은 기보상 12/8 마디의 3박 지점입니다.
    expect(doc.querySelectorAll('measure')[1].querySelector('backup duration').textContent).toBe(String(3 * d));
  });

  it('SpannerMap의 음수 시작 틱은 무시하고 마디 앞쪽으로 되돌아가지 않습니다', () => {
    const map = '<SpannerMap><HairPin><subtype>0</subtype><track2>0</track2><startTick>-1/1</startTick><ticks>1/2</ticks><eid>h</eid><track>0</track></HairPin></SpannerMap>';
    const { doc } = convert(wrap(measure3(CDEF), { version: '5.00' }).replace('</Score>', `${map}</Score>`));
    expect(doc.querySelector('backup')).toBeNull();
    expect(doc.querySelector('wedge')).toBeNull();
  });

  it('근사 divisions(480)에서도 보이스 길이 합이 마디 길이와 정확히 같습니다', () => {
    const tuplet = (actual, normal, count = actual) => `<Tuplet><normalNotes>${normal}</normalNotes><actualNotes>${actual}</actualNotes><baseNote>16th</baseNote></Tuplet>${Array.from({ length: count }, () => chord(60, 14, '16th')).join('')}<endTuplet/>`;
    const bars = [
      measure3(tuplet(7, 4) + rest('half', '<dots>1</dots>')),
      measure3(tuplet(11, 8) + rest('half')),
      measure3(tuplet(13, 8) + rest('half')),
      measure3(tuplet(17, 16)),
      measure3(tuplet(19, 16)),
    ].join('');
    const { doc, warnings } = convert(wrap(bars));
    expect(warnings.some(w => w.includes('근사'))).toBe(true);
    expect(divisionsOf(doc)).toBe(480);
    for (const bar of totals(doc)) expect(bar).toEqual([1920]);
  });

  it('비정상적으로 큰 점 개수는 4개로 제한해 NaN·메모리 폭주를 막습니다', () => {
    for (const dots of ['2000', '20000000', '-3']) {
      const { doc, xmlString } = convert(wrap(measure3(chord(60, 14, 'quarter', `<dots>${dots}</dots>`) + rest('half') + rest('quarter'))));
      expect(xmlString).not.toContain('NaN');
      expect(doc.querySelectorAll('note')[0].querySelectorAll('dot').length).toBeLessThanOrEqual(4);
    }
  });
});

/* ---------- 배치 B: 조표·음자리표·붙임줄 ---------- */
const legacyScore = (staffDefs, staves) => `<?xml version="1.0"?><museScore version="1.14"><Division>480</Division><Part>${staffDefs}<Instrument><trackName>Piano</trackName></Instrument></Part>${staves}</museScore>`;
const sig44 = '<TimeSig><subtype>260</subtype><den>4</den><nom1>4</nom1></TimeSig>';
const clefOf = (doc, number = null) => {
  const clef = Array.from(doc.querySelector('measure attributes').querySelectorAll('clef')).find(c => c.getAttribute('number') === number);
  return `${clef.querySelector('sign').textContent}${clef.querySelector('line').textContent}${clef.querySelector('clef-octave-change')?.textContent ?? ''}`;
};

describe('1.x 조표·음자리표·붙임줄 (검토 배치 B)', () => {
  it('1.x: KeySig <subtype>의 하위 4비트와 <keylist>에서 조표를 읽습니다', () => {
    const body = `<Measure number="1">${sig44}${rest('whole')}</Measure><Measure number="2"><KeySig><subtype>18</subtype></KeySig>${rest('whole')}</Measure><Measure number="3"><KeySig><subtype>45</subtype></KeySig>${rest('whole')}</Measure>`;
    const xml = legacyScore('<Staff><cleflist><clef tick="0" idx="0"/></cleflist><keylist><key tick="0" idx="1"/></keylist></Staff>', `<Staff id="1">${body}</Staff>`);
    const { doc } = convert(xml);
    expect(Array.from(doc.querySelectorAll('measure'), m => m.querySelector('key fifths')?.textContent ?? null)).toEqual(['1', '2', '-3']);
  });

  it('1.x: <cleflist>의 숫자 인덱스로 첫 음자리표를 정합니다(왼손은 낮은음자리표)', () => {
    const defs = '<Staff><cleflist><clef tick="0" idx="0"/></cleflist></Staff><Staff><cleflist><clef tick="0" idx="4"/></cleflist></Staff>';
    const staves = `<Staff id="1"><Measure number="1">${sig44}${rest('whole')}</Measure></Staff><Staff id="2"><Measure number="1">${rest('whole')}</Measure></Staff>`;
    const { doc } = convert(legacyScore(defs, staves));
    expect(clefOf(doc, '1')).toBe('G2');
    expect(clefOf(doc, '2')).toBe('F4');
  });

  it('1.x: 시작 음의 빈 <Tie/>를 같은 보이스의 다음 같은 높이 음에 연결하고, 짝 없는 붙임줄은 지웁니다', () => {
    const tied = pitch => `<Chord><durationType>quarter</durationType><Note><pitch>${pitch}</pitch><tpc>15</tpc><Tie><up>1</up></Tie></Note></Chord>`;
    const body = `<Measure number="1">${sig44}${tied(67)}${chord(67, 15)}${chord(64, 18)}${tied(72)}</Measure>`;
    const { doc } = convert(legacyScore('<Staff><cleflist><clef tick="0" idx="0"/></cleflist></Staff>', `<Staff id="1">${body}</Staff>`));
    const ties = Array.from(doc.querySelectorAll('note'), n => Array.from(n.querySelectorAll('tie'), t => t.getAttribute('type')).join('+'));
    expect(ties).toEqual(['start', 'stop', '', '']);
  });

  it('2.x: 글리산도의 endSpanner는 붙임줄 끝이 아니고, Tie id의 endSpanner만 붙임줄 끝입니다', () => {
    const body = `<Measure number="1">${chord(60, 14, 'quarter', '', '<Glissando id="2"/>')}${chord(64, 18, 'quarter', '', '<endSpanner id="2"/>')}${chord(67, 15, 'quarter', '', '<Tie id="3"></Tie>')}${chord(67, 15, 'quarter', '', '<endSpanner id="3"/>')}</Measure>`;
    const { doc } = convert(wrap(body, { version: '2.07' }));
    const ties = Array.from(doc.querySelectorAll('note'), n => Array.from(n.querySelectorAll('tie'), t => t.getAttribute('type')).join('+'));
    expect(ties).toEqual(['', '', 'start', 'stop']);
  });
});

describe('조표·이조·음자리표 해석 (검토 배치 B)', () => {
  const sax = '<transposeDiatonic>-5</transposeDiatonic><transposeChromatic>-9</transposeChromatic>';
  const keyOnly = '<KeySig><concertKey>0</concertKey></KeySig>';

  it('4.x: actualKey가 없으면 보이는 조표도 concertKey이고, 콘서트 피치 모드에서만 기보 조표로 옮깁니다', () => {
    const body = measure3(`${keyOnly}${rest('whole')}`);
    expect(convert(wrap(body, { version: '4.60', instrument: sax })).doc.querySelector('key fifths').textContent).toBe('0');
    expect(convert(wrap(body, { version: '4.60', instrument: sax, score: '<Style><concertPitch>1</concertPitch></Style>' })).doc.querySelector('key fifths').textContent).toBe('3');
    // actualKey가 있으면 항상 그 값입니다(이조 간격만큼 옮긴 값 3이 아니라 2를 써서 우선순위를 구별합니다).
    const both = measure3(`<KeySig><concertKey>0</concertKey><actualKey>2</actualKey></KeySig>${rest('whole')}`);
    expect(convert(wrap(both, { version: '4.60', instrument: sax })).doc.querySelector('key fifths').textContent).toBe('2');
  });

  it('콘서트 피치로 저장된 임시표가 기보음과 모순되면 내보내지 않습니다', () => {
    const bb = '<transposeDiatonic>-1</transposeDiatonic><transposeChromatic>-2</transposeChromatic>';
    const note = (pitch, tpc, tpc2, acc) => `<Chord><durationType>quarter</durationType><Note><Accidental><subtype>${acc}</subtype></Accidental><pitch>${pitch}</pitch><tpc>${tpc}</tpc><tpc2>${tpc2}</tpc2></Note></Chord>`;
    // 실음 B♭3(flat)은 클라리넷의 기보음 C4(임시표 없음), 실음 E4는 기보음 F♯4(sharp)
    const body = measure3(note(58, 12, 14, 'accidentalFlat') + note(62, 16, 20, 'accidentalSharp') + rest('half'));
    const { doc } = convert(wrap(body, { instrument: bb, score: '<Style><concertPitch>1</concertPitch></Style>' }));
    const notes = doc.querySelectorAll('note');
    expect(notes[0].querySelector('accidental')).toBeNull();
    expect(notes[1].querySelector('accidental').textContent).toBe('sharp');
  });

  it('이조하는 타브 악기는 타브 오선에도 짝이 되는 일반 오선과 같은 음자리표를 씁니다', () => {
    const guitar = '<transposeDiatonic>-7</transposeDiatonic><transposeChromatic>-12</transposeChromatic>';
    const xml = `<?xml version="1.0"?><museScore version="4.60"><Score><Division>480</Division><Part><Staff><StaffType group="pitched"/><defaultClef>G8vb</defaultClef></Staff><Staff><StaffType group="tablature"/><defaultClef>G8vb</defaultClef></Staff><trackName>Guitar</trackName><Instrument>${guitar}<transposingClef>G</transposingClef></Instrument></Part>
      <Staff id="1">${measure3(chord(50, 16, 'whole').replace('<tpc>16</tpc>', '<tpc>16</tpc><tpc2>16</tpc2>'))}</Staff><Staff id="2">${measure3(rest('whole'))}</Staff></Score></museScore>`;
    const { doc } = convert(xml);
    expect(clefOf(doc, '1')).toBe(clefOf(doc, '2'));
    expect(clefOf(doc, '2')).toBe('G2-1');
    const noTranspose = xml.replace(guitar, '').replace('<transposingClef>G</transposingClef>', '');
    expect(clefOf(convert(noTranspose).doc, '2')).toBe('G2-1');
    // 타브 오선이 짝 없이 홀로 있고 이조도 없으면 8vb 없는 높은음자리표를 씁니다.
    const alone = `<?xml version="1.0"?><museScore version="4.60"><Score><Division>480</Division><Part><Staff><StaffType group="tablature"/></Staff><trackName>Uke</trackName><Instrument/></Part><Staff id="1">${measure3(rest('whole'))}</Staff></Score></museScore>`;
    expect(clefOf(convert(alone).doc)).toBe('G2');
  });

  it('2.x의 G1은 프랑스 바이올린 기호이고, 4.x 신규 음자리표 이름과 오선 기본 이조 음자리표를 읽습니다', () => {
    const clef = name => `<Clef><concertClefType>${name}</concertClefType><transposingClefType>${name}</transposingClefType></Clef>`;
    const v2 = convert(wrap(`<Measure number="1">${clef('G1')}${rest('whole')}</Measure>`, { version: '2.06' })).doc;
    expect(clefOf(v2)).toBe('G1');
    const v4 = convert(wrap(measure3(chord(60, 14, 'half') + rest('half')) + measure3(clef('C4_8VB') + rest('whole')) + measure3(clef('F_F18C') + rest('whole')) + measure3(clef('F_19C') + rest('whole')), { version: '4.00' })).doc;
    const signs = Array.from(v4.querySelectorAll('measure'), m => { const c = m.querySelector('attributes clef'); return c ? `${c.querySelector('sign').textContent}${c.querySelector('line').textContent}${c.querySelector('clef-octave-change')?.textContent ?? ''}` : null; });
    expect(signs.slice(1)).toEqual(['C4-1', 'F4', 'F4']);
    const preferred = convert(wrap(measure3(rest('whole')), { version: '4.60', instrument: '<clef>F</clef>', staff: '<StaffType group="pitched"/><defaultTransposingClef>F8va</defaultTransposingClef>' })).doc;
    expect(clefOf(preferred)).toBe('F41');
  });
});

/* ---------- 배치 C: 표지·코드·슬러·스패너·템포 ---------- */
const directionsOf = (doc, selector) => Array.from(doc.querySelectorAll(selector));

describe('표지·코드·슬러·스패너·템포 (검토 배치 C)', () => {
  it('3.x 이후 <Measure> 바로 아래의 Marker·Jump(segno·To Coda·코다·D.S.)를 방향 요소로 옮깁니다', () => {
    const marker = (style, text, label) => `<Marker><style>${style}</style><text>${text}</text><label>${label}</label></Marker>`;
    const jump = '<Jump><style>Repeat Text Right</style><text>D.S. al Coda</text><jumpTo>segno</jumpTo><playUntil>coda</playUntil><continueAt>codab</continueAt></Jump>';
    const xml = wrap(
      `<Measure>${marker('Repeat Text Left', '<sym>segno</sym>', 'segno')}<voice>${chord(60, 14, 'whole')}</voice></Measure>`
      + `<Measure>${marker('Repeat Text Right', 'To Coda', 'coda')}<voice>${chord(62, 16, 'whole')}</voice></Measure>`
      + `<Measure>${jump}<voice>${chord(64, 18, 'whole')}</voice></Measure>`
      + `<Measure>${marker('Repeat Text Left', '<sym>coda</sym>', 'codab')}${marker('Repeat Text Right', 'Fine', 'fine')}<voice>${chord(65, 13, 'whole')}</voice></Measure>`);
    const { doc } = convert(xml);
    const m = doc.querySelectorAll('measure');
    expect(m[0].querySelector('segno')).not.toBeNull();
    expect(m[0].querySelector('sound').getAttribute('segno')).toBe('segno');
    // 'To Coda'(label coda)는 코다 기호가 아니라 글자와 tocoda 사운드입니다.
    expect(m[1].querySelector('coda')).toBeNull();
    expect(m[1].querySelector('words').textContent).toBe('To Coda');
    expect(m[1].querySelector('sound').getAttribute('tocoda')).toBe('coda');
    expect(m[2].querySelector('words').textContent).toBe('D.S. al Coda');
    expect(m[2].querySelector('sound').getAttribute('dalsegno')).toBe('segno');
    expect(m[3].querySelector('coda')).not.toBeNull();
    expect(m[3].querySelector('sound[fine]').getAttribute('fine')).toBe('yes');
    // 마디 끝에 놓는 기호는 보이스 길이를 넘겨 forward를 만들지 않습니다.
    expect(totals(doc)).toEqual([[1], [1], [1], [1]].map(() => [divisionsOf(doc) * 4]));
    expect(doc.querySelector('forward')).toBeNull();
  });

  it('4.6·5.00의 <harmonyInfo> 코드 심볼과 FretDiagram 안의 코드 심볼을 읽습니다', () => {
    const info = '<Harmony><harmonyInfo><name>m7</name><root>17</root><bass>15</bass></harmonyInfo></Harmony>';
    const fret = '<FretDiagram><Harmony><root>14</root><name>7</name></Harmony></FretDiagram>';
    const { doc } = convert(wrap(measure3(info + chord(60, 14, 'half') + fret + chord(62, 16, 'half')), { version: '4.60' }));
    const harmonies = directionsOf(doc, 'harmony');
    expect(harmonies).toHaveLength(2);
    expect(harmonies[0].querySelector('root-step').textContent).toBe('A');
    expect(harmonies[0].querySelector('bass-step').textContent).toBe('G');
    expect(harmonies[0].querySelector('kind').textContent).toBe('minor-seventh');
    expect(harmonies[1].querySelector('kind').textContent).toBe('dominant');
  });

  it('흔한 코드 이름의 종류(kind)를 올바르게 정합니다', () => {
    const table = { 'm7(b5)': 'half-diminished', mi7: 'minor-seventh', mi7b5: 'half-diminished', '7sus': 'suspended-fourth', Maj7: 'major-seventh', '^7': 'major-seventh', m7: 'minor-seventh', 7: 'dominant', 9: 'dominant-ninth', mi: 'minor', min7: 'minor-seventh', sus4: 'suspended-fourth' };
    const names = Object.keys(table);
    const body = names.map(name => `<Harmony><root>14</root><name>${name}</name></Harmony>${chord(60, 14, '16th')}`).join('') + rest('half', '');
    const { doc } = convert(wrap(`<Measure>${'<voice>'}${body}${'</voice>'}</Measure>`));
    expect(directionsOf(doc, 'harmony kind').map(k => `${k.getAttribute('text')}=${k.textContent}`)).toEqual(names.map(name => `${name}=${table[name]}`));
  });

  it('다른 보이스에서 끝나는 슬러도 시작과 짝을 이루고 번호를 반납합니다', () => {
    const slurStart = '<Spanner type="Slur"><Slur/><next><location><voices>1</voices><fractions>1/4</fractions></location></next></Spanner>';
    const slurStop = '<Spanner type="Slur"><prev><location><voices>-1</voices><fractions>-1/4</fractions></location></prev></Spanner>';
    const voice1 = `<voice>${chord(72, 14, 'quarter', slurStart)}${rest('quarter')}${rest('half')}</voice>`;
    const voice2 = `<voice>${rest('quarter')}${chord(60, 14, 'quarter', slurStop)}${rest('half')}</voice>`;
    const later = measure3(chord(64, 18, 'quarter', '<Spanner type="Slur"><Slur/><next><location><fractions>1/4</fractions></location></next></Spanner>') + chord(65, 13, 'quarter', '<Spanner type="Slur"><prev><location><fractions>-1/4</fractions></location></prev></Spanner>') + rest('half'));
    const { doc } = convert(wrap(`<Measure>${voice1}${voice2}</Measure>${later}`));
    const slurs = directionsOf(doc, 'slur').map(s => `${s.getAttribute('type')}${s.getAttribute('number')}`);
    expect(slurs).toEqual(['start1', 'stop1', 'start1', 'stop1']);
  });

  it('5.00: 맞닿은 헤어핀·옥타브 기호는 끝을 먼저 쓰고, 꾸밈음에 걸린 슬러도 유지합니다', () => {
    const c = (id, p, tpc, type = 'quarter', extra = '') => `<Chord><eid>${id}</eid>${extra}<durationType>${type}</durationType><Note><pitch>${p}</pitch><tpc>${tpc}</tpc></Note></Chord>`;
    const bar = `<Measure><eid>m1</eid><voice>${c('g', 62, 16, 'eighth', '<acciaccatura/>')}${c('a', 60, 14)}${c('b', 62, 16)}${c('c', 64, 18)}${c('d', 65, 13)}</voice></Measure>`;
    const map = `<SpannerMap>
      <HairPin><subtype>1</subtype><track2>0</track2><startTick>1/2</startTick><ticks>1/2</ticks><eid>h2</eid><track>0</track></HairPin>
      <HairPin><subtype>0</subtype><track2>0</track2><startTick>0/1</startTick><ticks>1/2</ticks><eid>h1</eid><track>0</track></HairPin>
      <Slur><startElement>g</startElement><endElement>b</endElement><eid>s</eid><track>0</track></Slur>
    </SpannerMap>`;
    const { doc } = convert(wrap(bar, { version: '5.00' }).replace('</Score>', `${map}</Score>`));
    expect(directionsOf(doc, 'wedge').map(w => w.getAttribute('type'))).toEqual(['crescendo', 'stop', 'diminuendo', 'stop']);
    expect(directionsOf(doc, 'slur').map(s => s.getAttribute('type'))).toEqual(['start', 'stop']);
  });

  it('메트로놈의 박 단위(2분·16분 등)를 맞게 쓰고, 숨긴 템포·셈여림·리허설은 보이지 않게 합니다', () => {
    const tempo = (value, text, extra = '') => `<Tempo>${extra}<tempo>${value}</tempo><text>${text}</text></Tempo>`;
    const body = measure3(
      tempo(2.66667, '<sym>metNoteHalfUp</sym> = 80')
      + tempo(0.3, '<sym>metNote16thUp</sym> = 72')
      + tempo(2, '<sym>metNoteQuarterUp</sym><sym>metAugmentationDot</sym> = 40')
      + tempo(1.5, '<sym>metNoteQuarterUp</sym> = 90', '<visible>0</visible>')
      + '<Dynamic><subtype>ff</subtype><visible>0</visible></Dynamic><RehearsalMark><text>Z</text><visible>0</visible></RehearsalMark>'
      + chord(60, 14, 'whole'));
    const { doc } = convert(wrap(body));
    const metronomes = directionsOf(doc, 'metronome').map(m => `${m.querySelector('beat-unit').textContent}${m.querySelector('beat-unit-dot') ? '.' : ''}=${m.querySelector('per-minute').textContent}`);
    expect(metronomes).toEqual(['half=80', '16th=72', 'quarter.=40']);
    expect(directionsOf(doc, 'sound[tempo]').map(s => s.getAttribute('tempo'))).toEqual(['160', '18', '120', '90']);
    expect(doc.querySelector('dynamics')).toBeNull();
    expect(doc.querySelector('rehearsal')).toBeNull();
  });
});

/* ---------- 배치 D: 견고성 ---------- */
const makeZip = async (files, options = {}) => {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) zip.file(name, content);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', ...options });
};
// 압축 헤더(로컬·중앙 디렉터리)에 적힌 풀린 크기를 거짓으로 바꿉니다.
const spoofSizes = (bytes, fake) => {
  const copy = new Uint8Array(bytes), view = new DataView(copy.buffer);
  for (let i = 0; i + 30 < copy.length; i++) {
    if (view.getUint32(i, true) === 0x04034b50) view.setUint32(i + 22, fake, true);
    if (view.getUint32(i, true) === 0x02014b50) view.setUint32(i + 24, fake, true);
  }
  return copy;
};

describe('견고성 (검토 배치 D)', () => {
  it('압축 헤더 크기를 속인 .mscz도 실제로 풀리는 크기로 막습니다', async () => {
    const big = '<museScore version="3.01"><Score>' + ' '.repeat(5 * 1024 * 1024) + '</Score></museScore>';
    const spoofed = spoofSizes(await makeZip({ 'a.mscx': big }), 1000);
    await expect(core.extractMscx(spoofed, { JSZip, maxBytes: 1024 * 1024 })).rejects.toThrow('넘습니다');
  });

  it('비정상적으로 큰 container.xml이 있어도 악보를 찾아 변환합니다(container는 1MB까지만 읽음)', async () => {
    const mscx = wrap(measure3(chord(60, 14, 'whole')));
    const bytes = await makeZip({ 'META-INF/container.xml': '<container><rootfiles><rootfile full-path="a.mscx"/></rootfiles></container>' + ' '.repeat(3 * 1024 * 1024), 'a.mscx': mscx });
    const result = await core.convertMscz(bytes, { JSZip, maxBytes: 20 * 1024 * 1024 });
    expect(result.stats.measures).toBe(1);
  });

  it('손상된 압축 파일은 영어 내부 오류 대신 한국어 안내를 줍니다', async () => {
    for (const bytes of [new Uint8Array([1, 2, 3, 4]), new Uint8Array(0), new TextEncoder().encode('<museScore/>')]) {
      await expect(core.convertMscz(bytes, { JSZip })).rejects.toThrow('손상되었거나');
    }
  });

  it('constructor·__proto__ 같은 이름이 표 조회로 새어 나오지 않습니다', () => {
    const body = measure3(
      `<Chord><durationType>constructor</durationType><Note><pitch>60</pitch><tpc>14</tpc></Note></Chord>`
      + `<Chord><durationType>quarter</durationType><Articulation><subtype>constructor</subtype></Articulation><Articulation><subtype>__proto__</subtype></Articulation><Ornament><subtype>toString</subtype></Ornament>`
      + `<Note><head>constructor</head><Accidental><subtype>__proto__</subtype></Accidental><pitch>62</pitch><tpc>16</tpc></Note></Chord>`
      + `<Clef><concertClefType>constructor</concertClefType></Clef><BarLine><subtype>constructor</subtype></BarLine>${rest('half')}${rest('quarter')}`);
    const { xmlString, doc } = convert(wrap(body));
    expect(doc.querySelector('parsererror')).toBeNull();
    for (const bad of ['NaN', 'undefined', '[object', 'function']) expect(xmlString).not.toContain(bad);
  });

  it('터무니없이 큰 숫자 입력에도 멈추지 않고 유한한 결과를 냅니다', () => {
    const sax = '<transposeDiatonic>-5</transposeDiatonic><transposeChromatic>-99999999999999999999999</transposeChromatic>';
    const huge = '1000000000000000000000000000';
    const body = measure3(`<KeySig><concertKey>${huge}</concertKey></KeySig><Tuplet><normalNotes>${huge}</normalNotes><actualNotes>${huge}</actualNotes></Tuplet>${chord(60, 14, 'quarter', `<dots>${huge}</dots>`)}<endTuplet/>${rest('half')}`);
    const { xmlString, doc } = convert(wrap(body, { instrument: sax, score: '<Style><concertPitch>1</concertPitch></Style>' }));
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(xmlString).not.toContain('NaN');
  });

  it('마디가 없는 파일(프레임만 있음)은 변환하지 않고 이유를 알립니다', () => {
    const frameOnly = wrap('<VBox><Text><style>title</style><text>제목만</text></Text></VBox>');
    expect(() => core.convertMscx(frameOnly)).toThrow('마디가 없습니다');
  });

  it('확장자만 있는 이름도 MusicXML 파일명을 만들 수 있습니다', () => {
    expect(core.musicXmlFileName('.mscz')).toBe('MuseScore 악보.musicxml');
    expect(core.musicXmlFileName('곡.mscz')).toBe('곡.musicxml');
  });
});
