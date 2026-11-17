from contextlib import closing
import io
import json
from pathlib import Path
import re
import sqlite3
import tempfile
import unittest
import uuid

from PIL import Image
from app import app, load_venues
from bookings import booking_inventory


class BookingRequestTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.previous_db = app.config['BOOKING_DB']
        app.config['BOOKING_DB'] = str(Path(self.directory.name) / 'requests.sqlite3')
        self.client = app.test_client()
        html = self.client.get('/plan').data.decode()
        self.token = re.search(r'name="booking-token" content="([^"]+)"', html)[1]
        venue = booking_inventory(load_venues())[0]
        self.venue, self.slot = venue, venue['facings'][0]
        self.payload = {'request_key': str(uuid.uuid4()), 'name': 'Test Request', 'email': 'booking@example.test',
                        'campaign': 'travel', 'consent': True, 'weeks': 2, 'start': '', 'budget_pence': 100,
                        'placements': [{'venue_id': venue['id'], 'slot_id': self.slot['id']}],
                        'total_pence': 1}

    def tearDown(self):
        app.config['BOOKING_DB'] = self.previous_db
        self.directory.cleanup()

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
