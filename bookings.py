"""Booking requests: server-priced quotes and private, durable review storage."""
from contextlib import contextmanager
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import sqlite3
from datetime import date, datetime, timezone

import click
from flask import jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from PIL import Image, UnidentifiedImageError


def booking_inventory(venues):
    """Expand legacy shelf rates into the six physical A5 positions."""
    result = []
    for original in venues:
        venue = dict(original)
        positions = []
        for shelf in ('top', 'middle', 'bottom'):
            for side in ('left', 'right'):
                existing = next((slot for slot in original['facings'] if slot['id'] == shelf + '-' + side), None)
                source = existing or next((slot for slot in original['facings'] if slot.get('shelf', slot['id']) == shelf), None)
                if source:
                    positions.append({**source, 'id': shelf + '-' + side, 'shelf': shelf, 'side': side,
                                      'label': shelf.title() + ' - ' + side.title()})
        venue['facings'] = positions
        result.append(venue)
    return result


def register_booking_routes(app, load_venues):
    app.config.setdefault('BOOKING_DB', os.environ.get('GKM_BOOKING_DB', str(Path(app.instance_path) / 'booking-requests.sqlite3')))
    app.config['MAX_CONTENT_LENGTH'] = 11 * 1024 * 1024
    signer = URLSafeTimedSerializer(os.environ.get('GKM_SECRET_KEY') or secrets.token_hex(32), salt='booking-form')

    def form_token():
        return signer.dumps({'form': 'booking-request'})

    @contextmanager
    def connection():
        path = Path(app.config['BOOKING_DB'])
        path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(path)
        db.row_factory = sqlite3.Row
        db.execute('''CREATE TABLE IF NOT EXISTS booking_requests (
            reference TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL, status TEXT NOT NULL,
            payload TEXT NOT NULL, payload_hash TEXT NOT NULL,
            total_pence INTEGER NOT NULL, artwork_name TEXT,
            artwork_type TEXT, artwork BLOB)''')
        try:
            with db:
                yield db
        finally:
            db.close()

    def text(data, name, maximum, required=False):
        value = str(data.get(name, '')).strip()
        if len(value) > maximum or (required and not value):
            raise ValueError('Please check your ' + name.replace('_', ' ') + '.')
        return value

    @app.post('/api/booking-requests')
    def create_booking_request():
        origin = request.headers.get('Origin')
        if origin and origin.rstrip('/') != request.host_url.rstrip('/'):
            return jsonify(error='Please submit your request from this website.'), 403
        try:
            signer.loads(request.headers.get('X-Booking-Token', ''), max_age=86400)
        except (BadSignature, SignatureExpired):
            return jsonify(error='Please refresh the page and try again. Your campaign draft is saved.'), 403
        try:
            data = json.loads(request.form.get('request', '{}'))
            if not isinstance(data, dict) or data.get('website'):
                raise ValueError('Please check your request and try again.')
            key = text(data, 'request_key', 64, True)
            if not re.fullmatch(r'[A-Za-z0-9-]{16,64}', key):
                raise ValueError('Please refresh the page and try again.')
            name = text(data, 'name', 120, True)
            email = text(data, 'email', 254, True)
            if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', email):
                raise ValueError('Please enter a valid email address.')
            if data.get('consent') is not True:
                raise ValueError('Please confirm that we may contact you about this request.')
            weeks = data.get('weeks')
            if type(weeks) is not int or not 1 <= weeks <= 52:
                raise ValueError('Choose a duration between 1 and 52 weeks.')
            media = text(data, 'campaign', 40, True)
            if media not in ('travel', 'lifestyle', 'services', 'culture', 'hospitality', 'general'):
                raise ValueError('Please choose a campaign type.')
            start = text(data, 'start', 10)
            if start and date.fromisoformat(start) < date.today():
                raise ValueError('Please choose a preferred start date from today onwards.')
            budget = data.get('budget_pence')
            if budget is not None and (type(budget) is not int or not 0 <= budget <= 100000000):
                raise ValueError('Please check your campaign budget.')
            requested = data.get('placements')
            if not isinstance(requested, list) or not 1 <= len(requested) <= 54:
                raise ValueError('Choose at least one placement before requesting a booking.')
            venues = {venue['id']: venue for venue in load_venues()}
            lines, seen, cities = [], set(), set()
            for item in requested:
                if not isinstance(item, dict):
                    raise ValueError('Please check your selected placements.')
                venue = venues.get(item.get('venue_id'))
                slot = next((slot for slot in venue['facings'] if slot['id'] == item.get('slot_id')), None) if venue else None
                if not slot:
                    raise ValueError('One of your placements is unavailable. Please choose again.')
                identity = (venue['id'], slot['id'])
                if identity in seen:
                    raise ValueError('A placement can only be selected once.')
                seen.add(identity)
                cities.add(venue['city'])
                lines.append({'venue_id': venue['id'], 'venue': venue['name'], 'city': venue['city'],
                              'slot_id': slot['id'], 'position': slot['label'], 'weekly_pence': slot['weekly_pence']})
            total = sum(line['weekly_pence'] * weeks for line in lines)
            payload = {'name': name, 'email': email, 'company': text(data, 'company', 160),
                       'phone': text(data, 'phone', 50), 'notes': text(data, 'notes', 2000),
                       'campaign': media, 'weeks': weeks, 'start': start, 'budget_pence': budget,
                       'cities': sorted(cities), 'placements': lines,
                       'inventory': 'illustrative; availability and pricing require team confirmation'}
            artwork, artwork_name, artwork_type = None, '', ''
            upload = request.files.get('artwork')
            if upload and upload.filename:
                artwork = upload.read(10 * 1024 * 1024 + 1)
                if len(artwork) > 10 * 1024 * 1024:
                    raise ValueError('Artwork must be no larger than 10 MB.')
                try:
                    image = Image.open(io.BytesIO(artwork))
                    artwork_type = {'JPEG': 'image/jpeg', 'PNG': 'image/png', 'WEBP': 'image/webp'}.get(image.format)
                    if not artwork_type or image.width * image.height > 40000000:
                        raise ValueError('Please upload a JPG, PNG or WebP image up to 40 megapixels.')
                    image.verify()
                except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
                    raise ValueError('That artwork could not be read. Please choose another image.')
                artwork_name = Path(upload.filename.replace('\\', '/')).name[:160]
            encoded = json.dumps(payload, sort_keys=True)
            digest = hashlib.sha256(encoded.encode() + (artwork or b'')).hexdigest()
            with connection() as db:
                previous = db.execute('SELECT reference, total_pence, payload_hash FROM booking_requests WHERE request_key=?', (key,)).fetchone()
                if previous:
                    if previous['payload_hash'] != digest:
                        return jsonify(error='This request has already been saved. Start a new campaign to submit another.'), 409
                    return jsonify(reference=previous['reference'], status='awaiting_confirmation', total_pence=previous['total_pence'])
                reference = 'GKE-' + datetime.now(timezone.utc).strftime('%y%m%d') + '-' + secrets.token_hex(4).upper()
                db.execute('INSERT INTO booking_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                           (reference, key, datetime.now(timezone.utc).isoformat(), 'awaiting_confirmation',
                            encoded, digest, total, artwork_name, artwork_type, artwork))
            return jsonify(reference=reference, status='awaiting_confirmation', total_pence=total), 201
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
            message = str(error) if isinstance(error, ValueError) else 'Please check your request and try again.'
            return jsonify(error=message if len(message) < 180 else 'Please check your request and try again.'), 400
        except sqlite3.Error:
            app.logger.exception('Booking request storage failed')
            return jsonify(error='Your request could not be saved. Your campaign is still here; please try again.'), 503

    @app.cli.command('booking-requests')
    @click.option('--reference', default=None, help='Show the full details of one request.')
    def list_booking_requests(reference):
        """Review requests in the private booking queue; never exposed publicly."""
        with connection() as db:
            if reference:
                row = db.execute('SELECT * FROM booking_requests WHERE reference=?', (reference,)).fetchone()
                if not row:
                    raise click.ClickException('Request not found.')
                click.echo(json.dumps({'reference': row['reference'], 'status': row['status'],
                                       'created_at': row['created_at'], 'total_pence': row['total_pence'],
                                       'artwork_name': row['artwork_name'], **json.loads(row['payload'])}, indent=2))
                return
            for row in db.execute('SELECT * FROM booking_requests ORDER BY created_at DESC LIMIT 25'):
                details = json.loads(row['payload'])
                click.echo(f"{row['reference']} | {row['status']} | {details['name']} | {details['email']} | GBP {row['total_pence']/100:.2f}")

    return form_token
