"""Validate deterministic captures, encode seek previews and publish the manifest."""
import json
import os
from concurrent.futures import ThreadPoolExecutor
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
    def encode_frame(frame):
        source = folder / frame['file']
        with Image.open(source) as image:
            assert image.size == (capture['width'] * 2, capture['height'] * 2), source
            assert max(ImageStat.Stat(image.resize((64, 64))).stddev) > 4, 'Blank frame: ' + str(source)
            image.save(folder / ('seek-' + frame['file']), 'WEBP', quality=82, method=4)
        frame['bytes'] = source.stat().st_size
        return frame['bytes']
    total = 0
    with ThreadPoolExecutor(max_workers=min(4, os.cpu_count() or 1)) as encoder:
        for index, size in enumerate(encoder.map(encode_frame, capture['frames'])):
            total += size
            if index % 30 == 0:
                print(name, 'encoded', index, '/', capture['count'], flush=True)
    manifest['variants'][name] = {**capture, 'bytes': total, 'motionNative': True, 'base': '/static/showcase-sequence/' + root.name + '/' + name + '/'}
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
