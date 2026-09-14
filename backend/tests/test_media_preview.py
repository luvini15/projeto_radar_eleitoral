import tempfile
import unittest
from pathlib import Path

import httpx

from app.models import InstagramPost
from app.services.media_preview import PreviewUnavailable, get_post_preview


class MediaPreviewTests(unittest.TestCase):
    def test_refreshes_expired_instagram_thumbnail_and_caches_result(self):
        requests = []

        def handler(request: httpx.Request):
            requests.append(str(request.url))
            if request.url.host == 'expired.cdninstagram.com':
                return httpx.Response(403, text='expired')
            if request.url.host == 'www.instagram.com':
                return httpx.Response(200, text='<meta property="og:image" content="https://fresh.cdninstagram.com/cover.jpg?a=1&amp;b=2">')
            if request.url.host == 'fresh.cdninstagram.com':
                return httpx.Response(200, content=b'jpeg-content', headers={'content-type': 'image/jpeg'})
            return httpx.Response(404)

        post = InstagramPost(id=7, profile_id=1, shortcode='abc', url='https://www.instagram.com/p/abc/', thumbnail_url='https://expired.cdninstagram.com/old.jpg')
        with tempfile.TemporaryDirectory() as directory, httpx.Client(transport=httpx.MockTransport(handler)) as client:
            content, content_type = get_post_preview(post, Path(directory), client)
            self.assertEqual(content, b'jpeg-content')
            self.assertEqual(content_type, 'image/jpeg')
            request_count = len(requests)
            cached, cached_type = get_post_preview(post, Path(directory), client)
            self.assertEqual((cached, cached_type), (content, content_type))
            self.assertEqual(len(requests), request_count)

    def test_rejects_non_instagram_fallback_url(self):
        post = InstagramPost(id=8, profile_id=1, shortcode='bad', url='https://example.com/post')
        with tempfile.TemporaryDirectory() as directory, httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(404))) as client:
            with self.assertRaises(PreviewUnavailable):
                get_post_preview(post, Path(directory), client)

    def test_accepts_twitter_image_used_by_older_reels(self):
        def handler(request: httpx.Request):
            if request.url.host == 'www.instagram.com':
                return httpx.Response(200, text='<meta name="twitter:image" content="https://fresh.cdninstagram.com/reel.jpg">')
            if request.url.host == 'fresh.cdninstagram.com':
                return httpx.Response(200, content=b'reel-cover', headers={'content-type': 'image/jpeg'})
            return httpx.Response(404)

        post = InstagramPost(id=9, profile_id=1, shortcode='reel', url='https://www.instagram.com/p/reel/')
        with tempfile.TemporaryDirectory() as directory, httpx.Client(transport=httpx.MockTransport(handler)) as client:
            content, content_type = get_post_preview(post, Path(directory), client)
            self.assertEqual((content, content_type), (b'reel-cover', 'image/jpeg'))


if __name__ == '__main__':
    unittest.main()
