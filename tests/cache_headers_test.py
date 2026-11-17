import gzip
import re
import unittest

from app import app


class AssetDeliveryTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_showcase_uses_one_fingerprinted_stylesheet(self):
        html = self.client.get('/').data.decode()
        styles = re.findall(r'<link rel="stylesheet" href="([^"]+)"', html)
        self.assertEqual(len(styles), 1)
        self.assertRegex(styles[0], r'/assets/site-[0-9a-f]{12}\.css')
        response = self.client.get(styles[0], headers={'Accept-Encoding': 'gzip'})
        self.assertIn('immutable', response.headers['Cache-Control'])
        self.assertEqual(response.headers['Content-Encoding'], 'gzip')
        css = gzip.decompress(response.data).decode()
        self.assertIn('.site-entry', css)
        self.assertIn('.showcase-stage', css)
        self.assertRegex(css, r'manrope-0\.woff2\?v=[0-9a-f]{12}')

    def test_editable_code_revalidates_and_is_compressed(self):
        response = self.client.get('/static/showcase-render.worker.mjs', headers={'Accept-Encoding': 'gzip'})
        self.addCleanup(response.close)
        self.assertEqual(response.headers['Cache-Control'], 'no-cache')
        self.assertEqual(response.headers['Content-Encoding'], 'gzip')
        self.assertIn(b'loadCachedLighting', gzip.decompress(response.data))
        cached = self.client.get('/static/showcase-render.worker.mjs', headers={
            'Accept-Encoding': 'gzip', 'If-None-Match': response.headers['ETag'],
        })
        self.addCleanup(cached.close)
        self.assertEqual(cached.status_code, 304)

    def test_media_cache_preserves_video_byte_ranges(self):
        response = self.client.get('/static/video/goldkey-advert-cinematic.mp4?v=test', headers={'Range': 'bytes=0-1023'})
        self.addCleanup(response.close)
        self.assertEqual(response.status_code, 206)
        self.assertEqual(len(response.data), 1024)
        self.assertTrue(response.headers['Content-Range'].startswith('bytes 0-1023/'))
        self.assertIn('immutable', response.headers['Cache-Control'])

    def test_original_view_keeps_its_stylesheets(self):
        html = self.client.get('/?view=original').data.decode()
        self.assertIn('/static/stand-studio.css', html)
        self.assertNotIn('/assets/site-', html)


if __name__ == '__main__':
    unittest.main()
