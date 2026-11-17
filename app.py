import hashlib
import gzip
from functools import lru_cache
import re
import json
import os
from pathlib import Path
from flask import Flask, render_template, jsonify, request, make_response
ROOT = Path(__file__).parent
app = Flask(__name__)
app.config.update(TEMPLATES_AUTO_RELOAD=True, SEND_FILE_MAX_AGE_DEFAULT=0)
@lru_cache(maxsize=64)
def compressed_static(path, modified, size):
    return gzip.compress(Path(path).read_bytes(), compresslevel=6)

@lru_cache(maxsize=64)
def asset_digest(filename, modified, size):
    return hashlib.sha256((ROOT / 'static' / filename).read_bytes()).hexdigest()[:12]

def versioned_asset(filename):
    stat = (ROOT / 'static' / filename).stat()
    return '/static/' + filename + '?v=' + asset_digest(filename, stat.st_mtime_ns, stat.st_size)

STYLE_FILES = (
    'vendor/fonts.css', 'style.css', 'premium.css', 'map-workspace.css',
    'friendly.css', 'one-page.css', 'sections.css', 'location-explorer.css',
    'luxury.css', 'guided-placement.css', 'client-logos.css', 'clear-flow.css',
    'venue-photos.css', 'planner-polish.css', 'entry-screen.css', 'showcase.css',
)
STYLE_BUNDLES = {}

@lru_cache(maxsize=8)
def style_bundle(revision):
    content = '\n'.join((ROOT / 'static' / name).read_text(encoding='utf-8-sig') for name in STYLE_FILES)
    content = re.sub(r'url\((/static/vendor/[^)]+\.woff2)\)', lambda match: 'url(' + versioned_asset(match.group(1)[8:]) + ')', content)
    digest = hashlib.sha256(content.encode()).hexdigest()[:12]
    STYLE_BUNDLES[digest] = content
    return '/assets/site-' + digest + '.css'

def current_style_bundle():
    revision = tuple((ROOT / 'static' / name).stat().st_mtime_ns for name in STYLE_FILES) + tuple(path.stat().st_mtime_ns for path in sorted((ROOT / 'static/vendor').glob('*.woff2')))
    return style_bundle(revision)

@app.get('/assets/site-<digest>.css')
def showcase_styles(digest):
    current_style_bundle()
    if digest not in STYLE_BUNDLES:
        return '', 404
    response = make_response(STYLE_BUNDLES[digest])
    response.mimetype = 'text/css'
    response.set_etag(digest, weak=True)
    response.make_conditional(request)
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
    response.vary.add('Accept-Encoding')
    if response.status_code == 200 and 'gzip' in request.accept_encodings:
        response.set_data(gzip.compress(response.get_data(), compresslevel=6))
        response.headers['Content-Encoding'] = 'gzip'
    return response

@app.after_request
def cache_static(response):
    if request.endpoint != 'static':
        return response
    filename = request.view_args.get('filename', '')
    # Only content-versioned media get a long lifetime. Editable code revalidates.
    versioned = bool(request.args.get('v')) or bool(re.search(r'-[0-9a-f]{12}\.', filename))
    response.headers['Cache-Control'] = 'public, max-age=31536000, immutable' if versioned else 'no-cache'
    if response.status_code == 200 and filename.endswith(('.mjs', '.js', '.css', '.woff2')):
        response.vary.add('Accept-Encoding')
        if 'gzip' in request.accept_encodings:
            path = ROOT / 'static' / filename
            stat = path.stat()
            if stat.st_size > 1024:
                original_body = response.response
                response.direct_passthrough = False
                response.set_data(compressed_static(str(path), stat.st_mtime_ns, stat.st_size))
                if hasattr(original_body, 'close'):
                    original_body.close()
                response.headers['Content-Encoding'] = 'gzip'
                etag, _ = response.get_etag()
                if etag:
                    response.set_etag(etag, weak=True)
    return response

def map_key():
    config = ROOT / 'config.local.json'
    local = json.loads(config.read_text()) if config.exists() else {}
    return os.environ.get('OS_MAPS_API_KEY', local.get('OS_MAPS_API_KEY', ''))
@app.get('/')
def index():
    venues = json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8'))
    showcase = request.args.get('view', os.environ.get('GKM_HOME_VIEW', 'showcase')) != 'original'
    return render_template('index.html', venues=venues, os_key=map_key(), showcase=showcase, showcase_styles=current_style_bundle() if showcase else None, font_url=versioned_asset('vendor/manrope-0.woff2'))
@app.get('/api/venues')
def inventory():
    return jsonify(json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8')))
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
