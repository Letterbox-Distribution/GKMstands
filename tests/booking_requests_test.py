from contextlib import closing
from datetime import timedelta
import io
import json
from pathlib import Path
import re
import sqlite3
import tempfile
import unittest
from unittest.mock import patch
import uuid

from PIL import Image
from app import app, load_venues
from bookings import booking_inventory, earliest_campaign_start


class BookingRequestTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        booking_config = patch.dict(app.config, {
            'BOOKING_DB': str(Path(self.directory.name) / 'requests.sqlite3'),
            'BOOKING_SMTP_HOST': '',
        })
        booking_config.start()
        self.addCleanup(booking_config.stop)
        self.client = app.test_client()
        html = self.client.get('/plan').data.decode()
        self.token = re.search(r'name="booking-token" content="([^"]+)"', html)[1]
        venue = booking_inventory(load_venues())[0]
        self.venue, self.slot = venue, venue['facings'][0]
        self.payload = {'request_key': str(uuid.uuid4()), 'name': 'Test Request', 'email': 'booking@example.test',
                        'campaign': 'travel', 'consent': True, 'weeks': 2, 'start': '', 'budget_pence': 100,
                        'placements': [{'venue_id': venue['id'], 'slot_id': self.slot['id']}],
                        'total_pence': 1}

    def submit(self, payload=None, **extra):
        return self.client.post('/api/booking-requests', data={'request': json.dumps(payload or self.payload), **extra},
                                headers={'X-Booking-Token': self.token})

    def test_prices_are_server_calculated_and_over_budget_is_allowed(self):
        response = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json['total_pence'], self.slot['weekly_pence'] * 2)
        self.assertEqual(response.json['status'], 'awaiting_confirmation')
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            row = db.execute('SELECT status, payload, total_pence FROM booking_requests').fetchone()
        self.assertEqual(row[0], 'awaiting_confirmation')
        self.assertEqual(json.loads(row[1])['email'], 'booking@example.test')
        self.assertEqual(row[2], self.slot['weekly_pence'] * 2)

    def test_retry_returns_the_same_reference_without_another_request(self):
        first, second = self.submit(), self.submit()
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.json['reference'], second.json['reference'])
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM booking_requests').fetchone()[0], 1)
        changed = {**self.payload, 'weeks': 3}
        self.assertEqual(self.submit(changed).status_code, 409)

    def configure_notification(self):
        app.config.update(BOOKING_SMTP_HOST='smtp.example.test', BOOKING_SMTP_PORT='',
                          BOOKING_SMTP_TLS='', BOOKING_SMTP_USERNAME='', BOOKING_SMTP_PASSWORD='',
                          BOOKING_SMTP_FROM='quotes@example.test', BOOKING_SMTP_TO='team@example.test')

    @patch('bookings.smtplib.SMTP')
    def test_quote_notification_is_sent_once_to_the_team(self, smtp):
        self.configure_notification()
        first, second = self.submit(), self.submit()
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        smtp.assert_called_once_with('smtp.example.test', 587, timeout=8)
        smtp.return_value.starttls.assert_called_once()
        smtp.return_value.send_message.assert_called_once()
        args, delivery = smtp.return_value.send_message.call_args
        message = args[0]
        self.assertEqual(delivery['to_addrs'], ['team@example.test'])
        self.assertEqual(message['Reply-To'], self.payload['email'])
        self.assertIn(first.json['reference'], message['Subject'])
        self.assertIn(self.venue['name'], message.get_content())
        self.assertEqual(list(message.iter_attachments()), [])
        result = app.test_cli_runner().invoke(args=['booking-requests', '--reference', first.json['reference']])
        self.assertEqual(result.exit_code, 0, result.output)
        self.assertEqual(json.loads(result.output)['notification_status'], 'sent')
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            status = db.execute('SELECT status FROM booking_notifications').fetchone()[0]
        self.assertEqual(status, 'sent')

    @patch('bookings.smtplib.SMTP')
    def test_failed_notification_keeps_quote_saved_and_can_be_retried(self, smtp):
        self.configure_notification()
        send = smtp.return_value.send_message
        send.side_effect = OSError('Mail server unavailable')
        first, second = self.submit(), self.submit()
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json['reference'], second.json['reference'])
        send.assert_called_once()
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM booking_requests').fetchone()[0], 1)
            self.assertEqual(db.execute('SELECT status FROM booking_notifications').fetchone()[0], 'failed')
        send.side_effect = None
        runner = app.test_cli_runner()
        self.assertEqual(runner.invoke(args=['booking-notify', '--reference', first.json['reference']]).exit_code, 0)
        self.assertEqual(runner.invoke(args=['booking-notify']).exit_code, 0)
        self.assertEqual(send.call_count, 2)
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            self.assertEqual(db.execute('SELECT status FROM booking_notifications').fetchone()[0], 'sent')

    def test_multiple_categories_and_minimum_start_date(self):
        lead_days = app.config['BOOKING_LEAD_DAYS']
        earliest = earliest_campaign_start(lead_days)
        payload = {**self.payload, 'campaigns': ['services', 'travel']}
        payload.pop('campaign')
        too_soon = self.submit({**payload, 'start': (earliest - timedelta(days=1)).isoformat()})
        self.assertEqual(too_soon.status_code, 400)
        self.assertIn(str(lead_days), too_soon.json['error'])
        payload['start'] = earliest.isoformat()
        self.assertEqual(self.submit(payload).status_code, 201)
        self.assertEqual(self.submit({**payload, 'campaigns': ['travel', 'services']}).status_code, 200)
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            saved = json.loads(db.execute('SELECT payload FROM booking_requests').fetchone()[0])
        self.assertEqual(saved['campaigns'], ['travel', 'services'])

    def test_invalid_placements_duplicates_and_contact_details_are_rejected(self):
        for patch in [
            {'placements': []}, {'placements': self.payload['placements'] * 2},
            {'placements': [{'venue_id': 'random-example-100', 'slot_id': 'top-left'}]},
            {'email': 'not-an-email'}, {'weeks': 0}, {'consent': False}, {'campaign': 'unknown'},
        ]:
            with self.subTest(patch=patch):
                self.assertEqual(self.submit({**self.payload, **patch}).status_code, 400)

    def test_cross_origin_and_missing_form_tokens_are_rejected(self):
        response = self.client.post('/api/booking-requests', data={'request': json.dumps(self.payload)})
        self.assertEqual(response.status_code, 403)
        response = self.client.post('/api/booking-requests', data={'request': json.dumps(self.payload)},
                                    headers={'X-Booking-Token': self.token, 'Origin': 'https://another.example'})
        self.assertEqual(response.status_code, 403)

    def test_artwork_is_verified_and_stored_privately(self):
        image = io.BytesIO()
        Image.new('RGB', (148, 210), '#ded1c6').save(image, 'PNG')
        image.seek(0)
        response = self.submit(artwork=(image, 'campaign.png'))
        self.assertEqual(response.status_code, 201)
        with closing(sqlite3.connect(app.config['BOOKING_DB'])) as db:
            row = db.execute('SELECT artwork_name, artwork_type, LENGTH(artwork) FROM booking_requests').fetchone()
        self.assertEqual(row[:2], ('campaign.png', 'image/png'))
        self.assertGreater(row[2], 100)
        self.payload['request_key'] = str(uuid.uuid4())
        self.assertEqual(self.submit(artwork=(io.BytesIO(b'<script>bad</script>'), 'fake.png')).status_code, 400)

    def test_all_booking_venues_have_the_six_physical_a5_spaces(self):
        for venue in booking_inventory(load_venues()):
            self.assertEqual([slot['id'] for slot in venue['facings']],
                             ['top-left', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-right'])


if __name__ == '__main__':
    unittest.main()
