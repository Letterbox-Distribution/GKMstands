import hashlib
import gzip
from functools import lru_cache
import re
import json
import os
from pathlib import Path
from flask import Flask, render_template, jsonify, request, make_response
from bookings import register_booking_routes, booking_inventory, earliest_campaign_start
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
    'venue-photos.css', 'planner-polish.css', 'entry-screen.css', 'showcase.css', 'edition-pages.css', 'workplace.css',
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
    if request.path.startswith('/api/booking-requests'):
        response.headers['Cache-Control'] = 'no-store'
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
def load_venues():
    return json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8'))

booking_form_token = register_booking_routes(app, lambda: booking_inventory(load_venues()))

SETTING_PHOTOS = {
    'Office lobby': '/static/editorial/workplace-reception.webp',
    'Cultural venue': '/static/venue-photos/library.webp',
    'Shared workspace': '/static/venue-photos/office.webp',
    'Hotel lobby': '/static/venue-photos/hotel.webp',
    'Student hub': '/static/venue-photos/university.webp',
    'Community venue': '/static/venue-photos/library.webp',
}

CORPORATE_CLIENTS = (
    ('bbc', 'BBC'), ('sky', 'Sky'), ('spotify', 'Spotify'), ('sony', 'Sony'),
    ('barclays', 'Barclays'), ('british-airways', 'British Airways'),
    ('jll', 'JLL'), ('savills', 'Savills'),
)

def edition_context():
    return {'showcase_styles': current_style_bundle(), 'font_url': versioned_asset('vendor/manrope-0.woff2')}

@app.get('/')
def index():
    view = request.args.get('view', os.environ.get('GKM_HOME_VIEW', 'workplace'))
    if view == 'original':
        return render_template('index.html', venues=load_venues(), os_key=map_key(), showcase=False, **edition_context())
    if view == 'showcase' or any(flag in request.args for flag in ('live', 'frames', 'images')):
        return stand_showcase()
    return render_template('workplace.html', clients=CORPORATE_CLIENTS, **edition_context())

@app.get('/showcase')
def stand_showcase():
    return render_template('home.html', home=True, campaign_url='/plan', **edition_context())

@app.get('/audiences')
def audiences():
    return render_template('audiences.html', **edition_context())

@app.get('/clients')
def clients():
    return render_template('clients.html', clients=CORPORATE_CLIENTS, **edition_context())

@app.get('/leaflet-guide')
def leaflet_guide():
    return render_template('leaflet-guide.html', **edition_context())

@app.get('/locations')
def locations():
    venues = load_venues()
    cities = sorted({venue['city'] for venue in venues})
    settings = sorted({venue['type'] for venue in venues})
    city = request.args.get('city', '')
    setting = request.args.get('setting', '')
    query = request.args.get('q', '').strip()[:100]
    results = [
        venue for venue in venues
        if (not city or venue['city'] == city)
        and (not setting or venue['type'] == setting)
        and all(term in ' '.join((venue['name'], venue['city'], venue['area'], venue['type'],
                                  *(venue.get('audiences') or []), *(venue.get('descriptors') or []))).casefold()
                for term in query.casefold().split())
    ]
    starting_pence = {
        venue['id']: min(slot['weekly_pence'] for slot in venue['facings'])
        for venue in booking_inventory(results) if venue['facings']
    }
    return render_template('locations.html', venues=results, cities=cities, settings=settings,
                           city=city, setting=setting, query=query, starting_pence=starting_pence,
                           setting_photos=SETTING_PHOTOS, **edition_context())

@app.get('/booking')
@app.get('/plan')
def plan_campaign():
    venues = [venue for venue in booking_inventory(load_venues()) if venue['facings']]
    preferred_venue = next((venue for venue in venues if venue['id'] == request.args.get('venue')), None)
    cities = list(dict.fromkeys(venue['city'] for venue in venues))
    lead_days = app.config['BOOKING_LEAD_DAYS']
    response = make_response(render_template(
        'booking.html', venues=venues, os_key=map_key(), booking_token=booking_form_token(),
        preferred_venue=preferred_venue, earliest_start=earliest_campaign_start(lead_days).isoformat(),
        lead_days=lead_days, setting_photos=SETTING_PHOTOS, cities=cities, **edition_context()))
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/venues')
def inventory():
    return jsonify(json.loads((ROOT / 'data/venues.json').read_text(encoding='utf-8')))
if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
