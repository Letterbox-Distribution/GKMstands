"""Encode a native-size, independently seekable motion cache."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def encode_motion(folder, capture):
    executable = os.environ.get('FFMPEG_PATH') or shutil.which('ffmpeg')
    if not executable:
        executable = next(Path(os.environ.get('TEMP', '/tmp')).glob(
            'gkm-video-tools/imageio_ffmpeg/binaries/ffmpeg*.exe'), None)
    if not executable:
        raise RuntimeError('Set FFMPEG_PATH to rebuild the native motion cache.')
    frames = [folder / frame['file'] for frame in capture['frames']]
    destination = folder / 'motion-forward.mp4'
    temporary = destination.with_suffix('.tmp')
    # WebP decodes to limited-range BT.601 YUV. Do not compress its levels again.
    command = [str(executable), '-hide_banner', '-loglevel', 'error', '-y',
               '-f', 'image2pipe', '-framerate', '30', '-vcodec', 'webp', '-i', 'pipe:0',
               '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-g', '1', '-keyint_min', '1',
               '-bf', '0', '-threads', '2', '-pix_fmt', 'yuv420p',
               '-vf', 'scale=in_range=tv:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709',
               '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
               '-movflags', '+faststart', '-an', '-f', 'mp4', str(temporary)]
    # Stream the validated images rather than loading the sequence into memory.
    process = subprocess.Popen(command, stdin=subprocess.PIPE)
    try:
        for frame in frames:
            process.stdin.write(frame.read_bytes())
        process.stdin.close()
        if process.wait() != 0:
            raise RuntimeError('Motion encoding failed: ' + str(destination))
    except BaseException:
        process.kill()
        process.wait()
        temporary.unlink(missing_ok=True)
        raise
    temporary.replace(destination)
    print('Encoded', destination, destination.stat().st_size, 'bytes', flush=True)
    return {'file': 'motion-forward.mp4', 'fps': 30, 'version': hashlib.sha256((folder / 'motion-forward.mp4').read_bytes()).hexdigest()[:12]}


if __name__ == '__main__':
    root = Path(sys.argv[1]).resolve()
    destination = root.parent / 'manifest.json'
    manifest = json.loads(destination.read_text(encoding='utf-8'))
    assert manifest['revision'] == root.name
    for name, variant in manifest['variants'].items():
        variant['movie'] = encode_motion(root / name, variant)
    temporary = destination.with_suffix('.tmp')
    temporary.write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
    temporary.replace(destination)
