"""Validate deterministic captures, encode seek previews and publish the manifest."""
import json
from pathlib import Path
import sys
from PIL import Image, ImageStat

root = Path(sys.argv[1]).resolve()
manifest = {'version': 1, 'revision': root.name, 'variants': {}}
for name in ('desktop', 'mobile'):
    folder = root / name
    capture = json.loads((folder / 'capture.json').read_text())
    assert len(capture['frames']) == capture['count'] >= 2
    assert capture['frames'][0]['progress'] == 0 and capture['frames'][-1]['progress'] == 1
    columns = 12
    cell_width = 256 if name == 'desktop' else 156
    cell_height = round(cell_width * capture['height'] / capture['width'])
    rows = (capture['count'] + columns - 1) // columns
    atlas = Image.new('RGB', (columns * cell_width, rows * cell_height), 'white')
    total = 0
    for index, frame in enumerate(capture['frames']):
        source = folder / frame['file']
        with Image.open(source) as image:
            assert image.size == (capture['width'] * 2, capture['height'] * 2), source
            assert max(ImageStat.Stat(image.resize((64, 64))).stddev) > 4, 'Blank frame: ' + str(source)
            preview = image.copy()
            preview.thumbnail((640, 640) if name == 'desktop' else (300, 600))
            preview.save(folder / ('seek-' + frame['file']), 'WEBP', quality=85, method=6)
            atlas.paste(image.resize((cell_width, cell_height), Image.Resampling.LANCZOS), ((index % columns) * cell_width, (index // columns) * cell_height))
        frame['bytes'] = source.stat().st_size
        total += frame['bytes']
    atlas.save(folder / 'seek-atlas.webp', 'WEBP', quality=86, method=5)
    manifest['variants'][name] = {**capture, 'bytes': total, 'atlas': {'file': 'seek-atlas.webp', 'columns': columns, 'cellWidth': cell_width, 'cellHeight': cell_height}, 'base': '/static/showcase-sequence/' + root.name + '/' + name + '/'}
    print(name, capture['count'], 'validated frames;', round(total / 1024 / 1024, 2), 'MiB full sequence', flush=True)
destination = root.parent / 'manifest.json'
temporary = destination.with_suffix('.tmp')
temporary.write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
temporary.replace(destination)
for name in ('desktop', 'mobile'):
    opening = root.parent.parent / 'environments' / ('instant-panorama-' + name + '.webp')
    opening_temporary = opening.with_suffix('.tmp')
    opening_temporary.write_bytes((root / name / '0000.webp').read_bytes())
    opening_temporary.replace(opening)
print('Published', destination)
