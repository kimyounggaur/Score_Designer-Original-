# MusicXML 4.0 스키마 (테스트 전용)

악보 디자이너가 만든 악보가 **MusicXML 4.0 XSD**를 지키는지 자동 테스트(`tests/e2e/25-schema.spec.js`)에서 검증하기 위한 파일입니다. 앱 실행에는 쓰이지 않고 배포물에도 들어가지 않습니다.

| 파일 | 내용 |
|---|---|
| `musicxml.xsd` | MusicXML 4.0 XSD 본문. 아래 "출처와 변경점" 참고 |
| `xml.xsd` | `xml:lang`·`xml:space` 속성만 선언한 최소 스키마(직접 작성) |
| `xlink.xsd` | `xlink:type`·`href`·`role`·`title`·`show`·`actuate` 속성만 선언한 최소 스키마(직접 작성) |

## 출처와 변경점

- `musicxml.xsd`는 W3C Music Notation Community Group이 배포하는 MusicXML 4.0 XSD(`musicxml.xsd`)입니다. 파일 머리의 저작권·W3C Community Final Specification Agreement(FSA) 문구를 그대로 두었습니다.
  - FSA: <https://www.w3.org/community/about/agreements/final/>
  - 공식 배포 위치: <https://github.com/w3c/musicxml/tree/v4.0/schema>
- 이 저장소의 사본은 작업 환경에서 위 위치에 접근하지 못해 PyPI 패키지 `musicxml` 1.6.3(MIT, 저장소 <https://github.com/alexgorji/musicxml>)의 휠에 들어 있는 `musicxml/generate_classes/musicxml_4_0.xsd`를 받아 만들었습니다.
  - 원본 SHA-256 `88a9784e81442e652a51f3c200011a6c36483ad909e97fbe257daaac6475873a`
  - **바꾼 곳은 26~27행의 `xs:import schemaLocation` 두 줄뿐**입니다. `http://www.musicxml.org/xsd/xml.xsd`·`xlink.xsd`를 같은 폴더의 `xml.xsd`·`xlink.xsd`로 바꿔 네트워크 없이 검증되게 했습니다.
  - 공식 배포본과 바이트 단위로 같은지는 확인하지 못했습니다. 의심되면 위 공식 위치의 `musicxml.xsd`와 `diff`로 비교하고, 두 import 줄만 다르면 같은 스키마입니다.
- `xml.xsd`·`xlink.xsd`는 W3C 원본이 아니라 **직접 쓴 최소 스텁**입니다. MusicXML이 쓰는 속성 이름만 선언하므로 값 형식 검사(예: `xml:lang`이 올바른 언어 태그인지)는 원본보다 느슨합니다. MusicXML 자체의 제약(색상 패턴, 옥타브 0~9, `words`에 허용되는 속성, `xs:ID` 유일성 등)은 `musicxml.xsd`가 정하므로 영향이 없습니다.

## 검증 엔진

`tests/e2e/schema-validate.js`의 `validateMusicXml(xmlString)`이 오류 문장 배열을 돌려줍니다(위반이 없으면 빈 배열).

1. `xmllint-wasm`(devDependency, 5.3.0 고정) — 기본값
2. 시스템 `xmllint`(`libxml2-utils`) — 위가 불러와지지 않을 때의 폴백. CI는 이를 위해 `sudo apt-get install -y libxml2-utils` 단계를 둡니다.
3. 둘 다 없으면 `schemaSupport()`가 `{ok:false, reason}`을 돌려주고 스펙은 `test.skip`으로 건너뜁니다.

폴백 경로만 시험하려면 `MXL_SCHEMA_BACKEND=native`를 지정해 실행합니다.

```bash
npx playwright test tests/e2e/25-schema.spec.js --project=chromium
MXL_SCHEMA_BACKEND=native npx playwright test tests/e2e/25-schema.spec.js --project=chromium
```

## 스키마가 이미 잡아낸 결함 (Phase B)

- V1: 색깔 악보·가사 계이름 색이 소문자 `#e74c3c`로 써져 `color` 패턴(`#[\dA-F]{6}([\dA-F][\dA-F])?`) 위반 → 대문자 정규화(`ExportCore.normalizeColor`)
- V2: 로마 숫자 삽입이 `words`에 `data-roman-analysis` 속성을 붙여 허용되지 않는 속성 위반 → `id="mxl-roman-<파트>-<번호>"`(xs:ID)로 교체
