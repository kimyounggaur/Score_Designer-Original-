from pathlib import Path
import sys,re
import pymupdf as fitz

for value in sys.argv[1:]:
 path=Path(value);doc=fitz.open(path);width=max(page.rect.width for page in doc);height=sum(page.rect.height for page in doc)
 contents=[];offset=0
 for index,page in enumerate(doc):
  svg=page.get_svg_image(text_as_path=True)
  ids=re.findall(r'\bid="([^"]+)"',svg)
  for id in sorted(set(ids),key=len,reverse=True):
   unique=f'p{index}_{id}'
   svg=svg.replace(f'id="{id}"',f'id="{unique}"').replace(f'="#'+id+'"',f'="#'+unique+'"').replace(f'url(#{id})',f'url(#{unique})')
  contents.append(f'<g transform="translate(0,{offset})">{svg}</g>');offset+=page.rect.height
 output=f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'+''.join(contents)+'</svg>'
 path.with_suffix('.svg').write_text(output,encoding='utf-8',newline='\n');print(f'SVG: {path.name}, {len(doc)} pages')
