"""Booking requests: server-priced quotes and private, durable review storage."""
from contextlib import closing, contextmanager
from email.message import EmailMessage
import hashlib
import io
import json
import os
from pathlib import Path
import re
import secrets
import smtplib
import sqlite3
import ssl
import tempfile
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import click
from flask import jsonify, request
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from PIL import Image, UnidentifiedImageError

CAMPAIGNS = ('travel', 'lifestyle', 'services', 'culture', 'hospitality', 'general')
NOTIFICATION_LEASE = timedelta(minutes=10)


def earliest_campaign_start(lead_days):
    return datetime.now(ZoneInfo('Europe/London')).date() + timedelta(days=lead_days)


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


def send_booking_notification(config, reference, details, total_pence, artwork_name):
    """Send a team copy of the quote request. Uploaded artwork stays in private storage."""
    sender = config['BOOKING_SMTP_FROM']
    recipient = config['BOOKING_SMTP_TO']
    message = EmailMessage()
    message['From'] = sender
    message['To'] = recipient
    message['Reply-To'] = details['email']
    message['Subject'] = f'Workplace campaign quote request {reference}'
    message['Message-ID'] = f'<{reference.lower()}@{sender.rsplit("@", 1)[-1]}>'
    placements = [
        f"- {line['venue']}, {line['city']} · {line['position']}"
        for line in details['placements']
    ]
    budget = details['budget_pence']
    message.set_content('\n'.join([
        f'Quote request {reference}', '',
        f"Contact — {details['name']} ({details['email']})",
        f"Company — {details['company'] or 'Not provided'}",
        f"Phone — {details['phone'] or 'Not provided'}",
        f"Campaign categories — {', '.join(details.get('campaigns', [details['campaign']]))}",
        f"Preferred start — {details['start'] or 'Flexible'}",
        f"Duration — {details['weeks']} week(s)",
        f"Budget — {'£' + format(budget / 100, ',.2f') if budget is not None else 'Not provided'}",
        f'Illustrative placement estimate — £{total_pence / 100:,.2f}',
        '', 'Requested placements', *placements, '',
        'Campaign notes', details['notes'] or 'None provided', '',
        'Artwork — ' + (f'{artwork_name} (saved in the private booking queue)' if artwork_name else 'None uploaded'),
        '', 'Confirm venue availability, timing and final pricing before booking.',
    ]))

    host = config['BOOKING_SMTP_HOST']
    context = ssl.create_default_context()
    implicit_tls = config['BOOKING_SMTP_TLS'].lower() == 'implicit'
    port = int(config['BOOKING_SMTP_PORT'] or (465 if implicit_tls else 587))
    connection = smtplib.SMTP_SSL(host, port, timeout=8, context=context) if implicit_tls else smtplib.SMTP(host, port, timeout=8)
    with closing(connection) as client:
        if not implicit_tls:
            client.starttls(context=context)
        if config['BOOKING_SMTP_USERNAME']:
            client.login(config['BOOKING_SMTP_USERNAME'], config['BOOKING_SMTP_PASSWORD'])
        client.send_message(message, from_addr=sender, to_addrs=[recipient])


def register_booking_routes(app, load_venues):
    # Vercel's application directory is read-only; demo data lives in temporary storage.
    database_root = Path(tempfile.gettempdir()) / 'goldkey-demo' if os.environ.get('VERCEL') else Path(app.instance_path)
    app.config.setdefault('BOOKING_DB', os.environ.get('GKM_BOOKING_DB', str(database_root / 'booking-requests.sqlite3')))
    app.config.setdefault('BOOKING_LEAD_DAYS', max(0, int(os.environ.get('GKM_BOOKING_LEAD_DAYS', '14'))))
    for field in ('HOST', 'PORT', 'FROM', 'TO', 'TLS', 'USERNAME', 'PASSWORD'):
        key = 'BOOKING_SMTP_' + field
        app.config.setdefault(key, os.environ.get('GKM_' + key, ''))
    app.config['MAX_CONTENT_LENGTH'] = 11 * 1024 * 1024
    signer = URLSafeTimedSerializer(os.environ.get('GKM_SECRET_KEY') or secrets.token_hex(32), salt='booking-form')

    def form_token():
        return signer.dumps({'form': 'booking-request'})

    @contextmanager
    def connection():
        path = Path(app.config['BOOKING_DB'])
        path.parent.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(path)) as db:
            db.row_factory = sqlite3.Row
            db.execute('''CREATE TABLE IF NOT EXISTS booking_requests (
                reference TEXT PRIMARY KEY, request_key TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL, status TEXT NOT NULL,
                payload TEXT NOT NULL, payload_hash TEXT NOT NULL,
                total_pence INTEGER NOT NULL, artwork_name TEXT,
                artwork_type TEXT, artwork BLOB)''')
            db.execute('''CREATE TABLE IF NOT EXISTS booking_notifications (
                reference TEXT PRIMARY KEY REFERENCES booking_requests(reference),
                status TEXT NOT NULL, updated_at TEXT NOT NULL)''')
            with db:
                yield db

    def notifications_enabled():
        return all(app.config['BOOKING_SMTP_' + field] for field in ('HOST', 'FROM', 'TO'))

    def deliver_notification(reference):
        now = datetime.now(timezone.utc)
        claimed_at = now.isoformat()
        expires_before = (now - NOTIFICATION_LEASE).isoformat()
        with connection() as db:
            claimed = db.execute('''UPDATE booking_notifications SET status='sending', updated_at=?
                WHERE reference=? AND (status IN ('pending', 'failed') OR (status='sending' AND updated_at < ?))''',
                (claimed_at, reference, expires_before))
            if not claimed.rowcount:
                return None
            booking = db.execute('SELECT payload, total_pence, artwork_name FROM booking_requests WHERE reference=?',
                                 (reference,)).fetchone()
        try:
            send_booking_notification(app.config, reference, json.loads(booking['payload']),
                                      booking['total_pence'], booking['artwork_name'])
        except (OSError, ValueError) as error:
            app.logger.warning('Quote email for %s failed (%s).', reference, type(error).__name__)
            status = 'failed'
        else:
            status = 'sent'
        with connection() as db:
            db.execute('''UPDATE booking_notifications SET status=?, updated_at=?
                WHERE reference=? AND status='sending' AND updated_at=?''',
                (status, datetime.now(timezone.utc).isoformat(), reference, claimed_at))
        return status

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
            if not re.fullmatch(r'[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+', email):
                raise ValueError('Please enter a valid email address.')
            if data.get('consent') is not True:
                raise ValueError('Please confirm that we may contact you about this request.')
            weeks = data.get('weeks')
            if type(weeks) is not int or not 1 <= weeks <= 52:
                raise ValueError('Choose a duration between 1 and 52 weeks.')
            choices = data.get('campaigns', [data.get('campaign')])
            if (not isinstance(choices, list) or not 1 <= len(choices) <= len(CAMPAIGNS)
                    or any(choice not in CAMPAIGNS for choice in choices)):
                raise ValueError('Please choose at least one campaign type.')
            campaigns = [choice for choice in CAMPAIGNS if choice in choices]
            start = text(data, 'start', 10)
            start_date = date.fromisoformat(start) if start else None
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
                       'campaign': campaigns[0], 'weeks': weeks, 'start': start, 'budget_pence': budget,
                       'cities': sorted(cities), 'placements': lines,
                       'inventory': 'illustrative; availability and pricing require team confirmation'}
            if len(campaigns) > 1:
                payload['campaigns'] = campaigns
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
            notify_team = notifications_enabled()
            with connection() as db:
                db.execute('BEGIN IMMEDIATE')
                previous = db.execute('SELECT reference, total_pence, payload_hash FROM booking_requests WHERE request_key=?', (key,)).fetchone()
                if previous:
                    if previous['payload_hash'] != digest:
                        return jsonify(error='This request has already been saved. Start a new campaign to submit another.'), 409
                    return jsonify(reference=previous['reference'], status='awaiting_confirmation', total_pence=previous['total_pence'])
                lead_days = app.config['BOOKING_LEAD_DAYS']
                if start_date and start_date < earliest_campaign_start(lead_days):
                    raise ValueError(f'Allow at least {lead_days} calendar days before your preferred start.')
                now = datetime.now(timezone.utc)
                reference = 'GKE-' + now.strftime('%y%m%d') + '-' + secrets.token_hex(4).upper()
                db.execute('INSERT INTO booking_requests VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                           (reference, key, now.isoformat(), 'awaiting_confirmation',
                            encoded, digest, total, artwork_name, artwork_type, artwork))
                if notify_team:
                    db.execute('INSERT INTO booking_notifications VALUES (?, ?, ?)', (reference, 'pending', now.isoformat()))
            if notify_team:
                try:
                    deliver_notification(reference)
                except sqlite3.Error:
                    app.logger.exception('Quote email status could not be updated for %s.', reference)
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
                row = db.execute('''SELECT reference, booking_requests.status, created_at, total_pence,
                    artwork_name, payload, booking_notifications.status AS notification_status
                    FROM booking_requests LEFT JOIN booking_notifications USING (reference)
                    WHERE reference=?''', (reference,)).fetchone()
                if not row:
                    raise click.ClickException('Request not found.')
                click.echo(json.dumps({'reference': row['reference'], 'status': row['status'],
                                       'created_at': row['created_at'], 'total_pence': row['total_pence'],
                                       'artwork_name': row['artwork_name'],
                                       'notification_status': row['notification_status'], **json.loads(row['payload'])}, indent=2))
                return
            for row in db.execute('''SELECT reference, booking_requests.status, total_pence, payload,
                    booking_notifications.status AS notification_status
                    FROM booking_requests LEFT JOIN booking_notifications USING (reference)
                    ORDER BY created_at DESC LIMIT 25'''):
                details = json.loads(row['payload'])
                notification = f" | Email {row['notification_status']}" if row['notification_status'] else ''
                click.echo(f"{row['reference']} | {row['status']} | {details['name']} | {details['email']} | GBP {row['total_pence']/100:.2f}{notification}")

    @app.cli.command('booking-notify')
    @click.option('--reference', help='Retry one queued request by reference.')
    @click.option('--limit', type=click.IntRange(1, 250), default=25, show_default=True)
    def retry_booking_notifications(reference, limit):
        """Send queued team emails and retry failed deliveries."""
        if not notifications_enabled():
            raise click.ClickException('Configure the booking SMTP host, sender and team inbox first.')
        if reference:
            references = [reference]
        else:
            expires_before = (datetime.now(timezone.utc) - NOTIFICATION_LEASE).isoformat()
            with connection() as db:
                references = [row['reference'] for row in db.execute('''SELECT reference FROM booking_notifications
                    WHERE status IN ('pending', 'failed') OR (status='sending' AND updated_at < ?)
                    ORDER BY updated_at LIMIT ?''', (expires_before, limit))]
        if not references:
            click.echo('No quote emails are queued for delivery.')
            return
        failed = False
        for reference in references:
            status = deliver_notification(reference)
            click.echo(f'{reference} | Email {status or "already handled or unavailable"}')
            failed = failed or status == 'failed'
        if failed:
            raise click.ClickException('Some quote emails could not be delivered and remain queued for retry.')

    return form_token
