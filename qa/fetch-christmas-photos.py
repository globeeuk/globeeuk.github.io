"""Fetch the selected CC-licensed venue/location photographs; never AI edit them."""
import io, json, subprocess, pathlib, re, html
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCES = {
    'barnfield-auditorium': 'File:Auditorium Panorama.jpg',
    'rosemoor': 'File:RHS Rosemoor gardens - geograph.org.uk - 3041782.jpg',
    'dartington': 'File:Dartington Hall at dusk - geograph.org.uk - 5223578.jpg',
    'totnes-christmas': 'File:Totnes Fore Street Christmas lights (23515688059).jpg',
    'torquay-harbour': 'File:Torquay Harbour.JPG',
    'tavistock': 'File:Tavistock Town Hall (geograph 6275904).jpg',
    'plymouth-centre': 'File:Plymouth Guildhall and tower of St Andrew\'s Church - geograph.org.uk - 1397691.jpg',
    'thorverton': 'File:Thorverton, Devon.jpg',
    'christmas-tree-field': 'File:Christmas tree plantation - geograph.org.uk - 237550.jpg',
}
command = ['curl', '-fLsS', '--get', 'https://commons.wikimedia.org/w/api.php']
for k,v in dict(action='query',format='json',prop='imageinfo',iiprop='url|extmetadata',iiurlwidth='800',titles='|'.join(SOURCES.values())).items():
    command += ['--data-urlencode', f'{k}={v}']
pages = json.loads(subprocess.check_output(command))['query']['pages']
records = []
for page in pages.values():
    key = next(k for k,v in SOURCES.items() if v == page['title'])
    info = page['imageinfo'][0]; meta = info['extmetadata']
    assert meta['LicenseShortName']['value'].startswith(('CC BY-SA ', 'CC BY '))
    raw = subprocess.check_output(['curl','-fLsS',info.get('thumburl',info['url'])])
    im = Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((640,640))
    target = ROOT / 'assets' / 'images' / f'{key}.webp'
    im.save(target,'WEBP',quality=72,method=6)
    artist = meta['Artist']['value'].split('<span')[0]
    creator = html.unescape(re.sub('<[^>]+>', '', artist)).strip()
    records.append(dict(key=key,image=f'assets/images/{key}.webp',source=info['descriptionurl'],
        licence=meta['LicenseShortName']['value'],licenceUrl=meta['LicenseUrl']['value'],
        creator=creator,originalUrl=info['url'],date=meta['DateTimeOriginal']['value'],checked='2026-10-06',
        changes='Resized and converted to WebP; cropped by the card layout. The derivative retains the source licence.',bytes=target.stat().st_size))
(ROOT/'qa'/'christmas-photo-sources.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print(json.dumps([{k:r[k] for k in ('key','creator','date','licence','bytes')} for r in records]))
