import { beforeEach, describe, expect, it, vi } from 'vitest';
const parse=text=>new DOMParser().parseFromString(text,'text/xml');
const name=p=>p.step+({'-2':'bb','-1':'b','0':'','1':'#','2':'##'})[String(p.alter)]+p.octave;
const pitch=text=>{const m=text.match(/^([A-G])(bb|b|##|#)?(-?\d+)$/);return {step:m[1],alter:{bb:-2,b:-1,'#':1,'##':2}[m[2]]||0,octave:Number(m[3])};};
let core,transpose;
beforeEach(async()=>{
  delete window.PitchCore;delete window.TransposeCore;vi.resetModules();
  await import('../../transpose-core.js');await import('../../pitch-core.js');
  core=window.PitchCore;transpose=window.TransposeCore;
});

describe('PitchCore.addInterval',()=>{
  it.each([
    ['E#4',2,4,'G##4'],['B3',1,1,'C4'],['C4',6,10,'Bb4'],['E4',2,4,'G#4'],['B4',2,4,'D#5'],['Cbb4',0,-1,'A3'],
  ])('%s + (%i letters, %i semitones) = %s',(from,steps,semis,expected)=>{
    expect(name(core.addInterval(pitch(from),steps,semis))).toBe(expected);
  });
  it('matches TransposeCore.transposePitch for every natural, sharp and flat across common intervals',()=>{
    for(const step of ['C','D','E','F','G','A','B'])for(const alter of [-1,0,1])for(const [diatonic,chromatic] of [[0,1],[1,1],[1,2],[2,3],[2,4],[3,5],[3,6],[4,6],[4,7],[5,8],[5,9],[6,10],[6,11],[-1,-2],[-2,-4],[-3,-5],[-4,-7]]){
      const input={step,alter,octave:4};
      expect(core.addInterval(input,diatonic,chromatic)).toEqual(transpose.transposePitch(input,{diatonic,chromatic}));
    }
  });
});

describe('PitchCore octave helpers',()=>{
  it('shiftNoteOctave changes only the octave and keeps the accidental',()=>{
    const note=parse('<note><pitch><step>E</step><alter>1</alter><octave>5</octave></pitch><duration>1</duration><accidental>sharp</accidental></note>').documentElement;
    expect(core.shiftNoteOctave(note,-1)).toBe(true);
    expect(note.querySelector('step').textContent).toBe('E');
    expect(note.querySelector('alter').textContent).toBe('1');
    expect(note.querySelector('octave').textContent).toBe('4');
    expect(note.querySelector('accidental').textContent).toBe('sharp');
    expect(core.shiftNoteOctave(note,0)).toBe(false);
    expect(core.shiftNoteOctave(parse('<note><rest/></note>').documentElement,1)).toBe(false);
  });
  it('shiftOctave returns a new pitch',()=>{
    const source={step:'B',alter:1,octave:3};
    expect(core.shiftOctave(source,2)).toEqual({step:'B',alter:1,octave:5});
    expect(source.octave).toBe(3);
  });
});

describe('PitchCore.nearestShift',()=>{
  it.each([[6,4,'nearest',-2],[0,11,'nearest',-1],[0,6,'nearest',6],[0,11,'up',11],[0,1,'down',-11],[4,4,'nearest',0],[4,4,'up',0],[4,4,'down',0],[11,0,'nearest',1]])('%i → %i (%s) = %i',(from,to,direction,expected)=>{
    expect(core.nearestShift(from,to,direction)).toBe(expected);
  });
});

describe('PitchCore.keySignatureAlter',()=>{
  it('reads sharps in F sharp major (B stays natural)',()=>{
    expect(['F','C','G','D','A','E','B'].map(step=>core.keySignatureAlter(6,step))).toEqual([1,1,1,1,1,1,0]);
  });
  it('reads flats in E flat major',()=>{
    expect(['B','E','A','D'].map(step=>core.keySignatureAlter(-3,step))).toEqual([-1,-1,-1,0]);
  });
  it('handles C major and theoretical keys',()=>{
    expect(core.keySignatureAlter(0,'F')).toBe(0);
    expect(core.keySignatureAlter(8,'F')).toBe(2);
    expect(core.keySignatureAlter(-8,'B')).toBe(-2);
  });
});

describe('PitchCore third builders',()=>{
  it.each([
    [6,'F#4','above','A#4'],[6,'E#5','above','G#5'],[5,'D#5','above','F#5'],[-3,'G4','above','Bb4'],[0,'C4','below','A3'],[6,'B#5','above','D#6'],[6,'G#4','above','B4'],
  ])('fifths %i: %s %s → %s',(fifths,from,direction,expected)=>{
    expect(name(core.diatonicThird(pitch(from),fifths,direction))).toBe(expected);
  });
  it('chromaticThird is always a major third with letter spelling',()=>{
    expect(name(core.chromaticThird(pitch('F#4'),'above'))).toBe('A#4');
    expect(name(core.chromaticThird(pitch('Bb4'),'below'))).toBe('Gb4');
  });
});

describe('PitchCore accidentals',()=>{
  const measure=xml=>parse(`<measure>${xml}</measure>`).documentElement;
  it('adds an accidental only when the alteration differs from the key and earlier notes',()=>{
    const m=measure('<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><type>quarter</type></note><note><pitch><step>F</step><octave>4</octave></pitch><duration>1</duration><type>quarter</type><stem>up</stem></note>');
    const [sharp,natural]=m.querySelectorAll('note');
    expect(core.syncAccidental(sharp,0)).toBe(true);
    expect(sharp.querySelector('accidental').textContent).toBe('sharp');
    expect(core.syncAccidental(natural,0)).toBe(true);
    expect(natural.querySelector('accidental').textContent).toBe('natural');
    expect(Array.from(natural.children,c=>c.localName)).toEqual(['pitch','duration','type','accidental','stem']);
  });
  it('removes a plain accidental that the key signature already implies but keeps cautionary ones',()=>{
    const m=measure('<note><pitch><step>F</step><alter>1</alter><octave>4</octave></pitch><duration>1</duration><accidental>sharp</accidental></note><note><pitch><step>C</step><alter>1</alter><octave>5</octave></pitch><duration>1</duration><accidental cautionary="yes">sharp</accidental></note>');
    const [f,c]=m.querySelectorAll('note');
    expect(core.syncAccidental(f,2)).toBe(false);expect(f.querySelector('accidental')).toBeNull();
    expect(core.syncAccidental(c,2)).toBe(false);expect(c.querySelector('accidental')).not.toBeNull();
  });
  it('names accidentals',()=>{
    expect([-2,-1,0,1,2].map(core.accidentalName)).toEqual(['flat-flat','flat','natural','sharp','double-sharp']);
  });
});

describe('PitchCore.bassForInversion',()=>{
  it.each([
    [{step:'E',alter:0},'major',1,{step:'G',alter:1}],
    [{step:'B',alter:0},'dominant',1,{step:'D',alter:1}],
    [{step:'B',alter:0},'dominant',3,{step:'A',alter:0}],
    [{step:'C',alter:0},'major-seventh',3,{step:'B',alter:0}],
    [{step:'A',alter:-1},'minor',1,{step:'C',alter:-1}],
    [{step:'C',alter:0},'major',2,{step:'G',alter:0}],
  ])('%o %s inversion %i',(root,kind,inversion,expected)=>{
    expect(core.bassForInversion(root,kind,inversion)).toEqual(expected);
  });
  it.each([[{step:'C',alter:0},'major',3],[{step:'C',alter:0},'none',1],[{step:'C',alter:0},'other',1],[{step:'H',alter:0},'major',1],[{step:'C',alter:0},'major',0]])('returns null for %o %s %i',(root,kind,inversion)=>{
    expect(core.bassForInversion(root,kind,inversion)).toBeNull();
  });
});

describe('PitchCore.createKeyTracker (D07·D08)',()=>{
  const attributes=body=>parse(`<measure><attributes>${body}</attributes></measure>`).querySelector('attributes');
  it('returns the initial value before any key and applies a key without number to every staff',()=>{
    const keys=core.createKeyTracker(-2);
    expect([keys.fifthsFor(1),keys.fifthsFor(2)]).toEqual([-2,-2]);
    keys.update(attributes('<key><fifths>2</fifths></key>'));
    expect([keys.fifthsFor(1),keys.fifthsFor(2),keys.fifthsFor('3')]).toEqual([2,2,2]);
  });
  it('keeps one key per staff when keys carry a number',()=>{
    const keys=core.createKeyTracker();
    keys.update(attributes('<key number="1"><fifths>0</fifths></key><key number="2"><fifths>1</fifths></key>'));
    expect([keys.fifthsFor(1),keys.fifthsFor(2)]).toEqual([0,1]);
  });
  it('changes only the numbered staff, and lets a later numberless key reset them all',()=>{
    const keys=core.createKeyTracker();
    keys.update(attributes('<key><fifths>3</fifths></key>'));
    keys.update(attributes('<key number="2"><fifths>-1</fifths></key>'));
    expect([keys.fifthsFor(1),keys.fifthsFor(2)]).toEqual([3,-1]);
    keys.update(attributes('<key><fifths>0</fifths></key>'));
    expect([keys.fifthsFor(1),keys.fifthsFor(2)]).toEqual([0,0]);
  });
  it('falls back to the lowest numbered key for a staff without its own key',()=>{
    const keys=core.createKeyTracker();
    keys.update(attributes('<key number="2"><fifths>4</fifths></key><key number="3"><fifths>1</fifths></key>'));
    expect([keys.fifthsFor(2),keys.fifthsFor(3),keys.fifthsFor(1),keys.fifthsFor(9)]).toEqual([4,1,4,4]);
  });
  it('ignores key elements without fifths and tolerates a missing attributes element',()=>{
    const keys=core.createKeyTracker(5);
    keys.update(attributes('<key><mode>minor</mode></key>'));
    keys.update(null);
    expect(keys.fifthsFor(1)).toBe(5);
  });
});

describe('PitchCore.parseNoteName (D09)',()=>{
  it.each([
    ['C4',{step:'C',alter:0,octave:4}],[' F#3 ',{step:'F',alter:1,octave:3}],['Bb5',{step:'B',alter:-1,octave:5}],
    ['A0',{step:'A',alter:0,octave:0}],['G9',{step:'G',alter:0,octave:9}],['B#4',{step:'B',alter:1,octave:4}],
  ])('reads %s',(text,expected)=>{
    expect(core.parseNoteName(text)).toEqual({pitch:expected});
  });
  it.each(['','c4','H4','C-1','C4.5','C#b4','4C','C 4','C♯4',null,undefined,42])('rejects the format of %j',text=>{
    expect(core.parseNoteName(text)).toEqual({error:'format'});
  });
  it('rejects octaves outside 0–9 at once, however large',()=>{
    expect(core.parseNoteName('C10')).toEqual({error:'octave',octave:10});
    expect(core.parseNoteName('C1000000000')).toEqual({error:'octave',octave:1000000000});
    expect(core.parseNoteName(`C${'9'.repeat(400)}`).error).toBe('octave');
    expect(core.parseNoteName('C3',{minOctave:4}).error).toBe('octave');
    expect(core.parseNoteName('C10',{maxOctave:12}).pitch.octave).toBe(10);
  });
});

describe('PitchCore.octavesToFit (D09)',()=>{
  // 예전 RangePanel의 1씩 올리고 내리던 반복문(작은 값에서만 같은 답을 내는 기준)
  const incremental=(midi,low,high)=>{let octaves=0;while(midi+octaves*12<low)octaves++;while(midi+octaves*12>high)octaves--;return {octaves,fits:midi+octaves*12>=low};};
  it('gives the same answer as the old loop for every pitch and many ranges',()=>{
    for(const low of [0,12,21,48,60,72,95])for(const width of [0,1,5,11,12,13,24,40,100])for(let midi=0;midi<=127;midi+=1){
      expect(core.octavesToFit(midi,low,low+width),`${midi} in ${low}..${low+width}`).toEqual(incremental(midi,low,low+width));
    }
  });
  it('keeps a pitch that is already in range and moves one that is not',()=>{
    expect(core.octavesToFit(60,48,72)).toEqual({octaves:0,fits:true});
    expect(core.octavesToFit(40,60,84)).toEqual({octaves:2,fits:true});
    expect(core.octavesToFit(100,60,84)).toEqual({octaves:-2,fits:true});
  });
  it('reports no fit when the range is narrower than an octave and misses the pitch class',()=>{
    expect(core.octavesToFit(61,60,60)).toEqual({octaves:-1,fits:false});
    expect(core.octavesToFit(60,61,66)).toEqual({octaves:0,fits:false});
  });
  it('does not loop, so huge values answer immediately',()=>{
    const started=performance.now();
    expect(core.octavesToFit(60,12_000_000_012,12_000_000_099)).toEqual({octaves:999_999_996,fits:true});
    expect(core.octavesToFit(60,0,1e12)).toEqual({octaves:0,fits:true});
    expect(core.octavesToFit(1e12,0,127)).toEqual({octaves:-83_333_333_323,fits:true});
    expect(performance.now()-started).toBeLessThan(50);
  });
  it('treats non-finite input and reversed ranges as no fit',()=>{
    expect(core.octavesToFit(NaN,0,127)).toEqual({octaves:0,fits:false});
    expect(core.octavesToFit(60,Infinity,Infinity)).toEqual({octaves:0,fits:false});
    expect(core.octavesToFit(60,72,48)).toEqual({octaves:0,fits:false});
  });
});
