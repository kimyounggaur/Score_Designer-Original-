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

  // ---- 이미지·PDF 내보내기(Phase B O1~O4) ----
  // 내보내기 크기는 화면에 보이는 요소가 아니라 이 값으로 정합니다. 같은 파일·같은 설정이면 PNG 저장·ZIP·헤더 PNG의 크기가 같습니다.
  // PAGE_FORMATS.osmd는 OSMD setPageFormat에 넘기는 id, css는 @page size 값, width는 인쇄용 렌더 폭(CSS px, 96dpi 기준 용지 폭)입니다.
  // 쪽 높이는 OSMD가 용지 비율(A4 297/210, Letter 11/8.5)로 정합니다.
  const PAGE_FORMATS = {
    A4_P: { label: 'A4 세로', osmd: 'A4_P', css: 'A4 portrait', width: 794 },
    A4_L: { label: 'A4 가로', osmd: 'A4_L', css: 'A4 landscape', width: 1123 },
    LETTER_P: { label: 'Letter 세로', osmd: 'Letter_P', css: 'letter portrait', width: 816 },
  };
  const EXPORT_WIDTHS = [800, 1100, 1400];
  const DEFAULT_EXPORT_WIDTH = 1100;
  // 브라우저 canvas 한도(Chromium 기준 한 변 16,384px, 넓이 약 2억 6,800만 px)를 넘으면 PNG를 만들 수 없습니다.
  const MAX_PNG_SIDE = 16384;
  const MAX_PNG_AREA = 268000000;

  // 목록에 없는 값(빈 값·문자·다른 숫자)은 기본 폭으로 돌립니다. 숫자 문자열('1400')은 받아들입니다.
  function clampExportWidth(value) {
    const width = Number(value);
    return EXPORT_WIDTHS.includes(width) ? width : DEFAULT_EXPORT_WIDTH;
  }

  // 배율을 곱한 PNG 픽셀 크기. 어느 한 변이든 넓이든 canvas 한도를 넘으면 tooLarge가 true입니다.
  function pngPixelSize(size, scale) {
    const width = Math.round(Number(size && size.width) * scale);
    const height = Math.round(Number(size && size.height) * scale);
    const tooLarge = !(width > 0 && height > 0) || width > MAX_PNG_SIDE || height > MAX_PNG_SIDE || width * height > MAX_PNG_AREA;
    return { width, height, tooLarge };
  }

  const plainNumber = value => (/^\s*\d+(\.\d+)?(px)?\s*$/.test(value || '') ? parseFloat(value) : NaN);

  // SVG의 본래 크기(좌표계 크기). 화면에 CSS로 줄어든 크기(getBoundingClientRect)가 아니라 width·height 속성, 없거나 %면 viewBox를 씁니다.
  // 알 수 없으면 null이며, 그때는 호출한 쪽이 화면 크기로 대신합니다.
  function svgIntrinsicSize(svg) {
    if (!svg || typeof svg.getAttribute !== 'function') return null;
    let width = plainNumber(svg.getAttribute('width'));
    let height = plainNumber(svg.getAttribute('height'));
    if (!(width > 0 && height > 0)) {
      const box = String(svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
      if (box.length === 4 && box.every(Number.isFinite) && box[2] > 0 && box[3] > 0) { width = box[2]; height = box[3]; }
    }
    return width > 0 && height > 0 ? { width, height } : null;
  }

  global.ExportCore = {
    MIN_OCTAVE,
    MAX_OCTAVE,
    PAGE_FORMATS,
    EXPORT_WIDTHS,
    DEFAULT_EXPORT_WIDTH,
    normalizeColor,
    octaveOutOfRange,
    isPercussionPart,
    clampExportWidth,
    pngPixelSize,
    svgIntrinsicSize,
  };
})(window);
