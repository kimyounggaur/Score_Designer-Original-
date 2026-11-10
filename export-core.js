(function(global){
  'use strict';

  // 악보 XML·내보내기 결과가 MusicXML 4.0 스키마를 지키도록 돕는 순수 함수 모음입니다.
  // (Phase B) 색상 형식, 음높이(옥타브) 범위, 타악기 파트 판정을 다룹니다.
  const MIN_OCTAVE = 0;
  const MAX_OCTAVE = 9;
  const MAX_REPORTED = 5;

  const HEX3 = /^#([0-9a-fA-F]{3})$/;
  const HEX6 = /^#([0-9a-fA-F]{6})$/;
  const HEX8 = /^#([0-9a-fA-F]{8})$/;

  // MusicXML color 형식은 #[\dA-F]{6}([\dA-F][\dA-F])? 입니다. 소문자 16진수는 스키마 위반이라 대문자로 바꿉니다.
  function normalizeColor(value) {
    if (typeof value !== 'string') return null;
    const text = value.trim();
    let match = HEX6.exec(text);
    if (match) return '#' + match[1].toUpperCase();
    match = HEX3.exec(text);
    if (match) return '#' + match[1].split('').map(ch => ch + ch).join('').toUpperCase();
    match = HEX8.exec(text);
    if (match) return '#' + match[1].toUpperCase();
    return null;
  }

  function ownText(parent, tag) {
    for (const child of Array.from(parent.children || [])) {
      if (child.localName === tag) return child.textContent;
    }
    return null;
  }

  // pitch > octave 값이 0~9 정수가 아닌 음표를 [{measure, step, octave}]로 돌려줍니다(최대 5개).
  function octaveOutOfRange(xmlDoc) {
    const found = [];
    if (!xmlDoc || !xmlDoc.getElementsByTagName) return found;
    const pitches = xmlDoc.getElementsByTagName('pitch');
    for (let i = 0; i < pitches.length && found.length < MAX_REPORTED; i++) {
      const pitch = pitches[i];
      const raw = ownText(pitch, 'octave');
      const text = raw === null ? '' : String(raw).trim();
      const octave = /^-?\d+$/.test(text) ? Number(text) : NaN;
      if (Number.isInteger(octave) && octave >= MIN_OCTAVE && octave <= MAX_OCTAVE) continue;
      let measure = null;
      for (let node = pitch.parentNode; node; node = node.parentNode) {
        if (node.localName === 'measure') { measure = node.getAttribute('number'); break; }
      }
      found.push({ measure, step: ownText(pitch, 'step'), octave: raw === null ? null : text });
    }
    return found;
  }

  // 첫 음자리표가 percussion이거나, 높이 없는 음표(unpitched)만 있는 파트입니다.
  // 쉼표만 있는 파트는 타악기로 보지 않습니다(조표를 계속 옮겨야 합니다).
  function isPercussionPart(partEl) {
    if (!partEl || !partEl.getElementsByTagName) return false;
    const clefs = partEl.getElementsByTagName('clef');
    if (clefs.length) {
      const sign = ownText(clefs[0], 'sign');
      if (sign && sign.trim().toLowerCase() === 'percussion') return true;
    }
    const hasUnpitched = partEl.getElementsByTagName('unpitched').length > 0;
    const hasPitched = partEl.getElementsByTagName('pitch').length > 0;
    return hasUnpitched && !hasPitched;
  }

  global.ExportCore = {
    MIN_OCTAVE,
    MAX_OCTAVE,
    normalizeColor,
    octaveOutOfRange,
    isPercussionPart,
  };
})(window);
