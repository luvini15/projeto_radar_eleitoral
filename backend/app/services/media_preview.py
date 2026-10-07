import html
import os
from html.parser import HTMLParser
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse
from urllib.parse import urljoin

import httpx

from app.models import InstagramPost

MAX_IMAGE_BYTES = 10 * 1024 * 1024
CACHE_LOCKS: dict[int, Lock] = {}
CACHE_LOCKS_GUARD = Lock()
CONTENT_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


class PreviewUnavailable(Exception):
    pass


class OpenGraphParser(HTMLParser):
    image_url: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        if tag != "meta" or self.image_url:
            return
        values = dict(attrs)
        image_kind = values.get("property") or values.get("name")
        if image_kind in {"og:image", "twitter:image", "twitter:image:src"} and values.get("content"):
            self.image_url = html.unescape(values["content"] or "")


def _allowed_post_url(url: str | None) -> bool:
    parsed = urlparse(url or "")
    return parsed.scheme == "https" and (
        parsed.hostname == "instagram.com" or (parsed.hostname or "").endswith(".instagram.com")
    )


def _allowed_image_url(url: str | None) -> bool:
    parsed = urlparse(url or "")
    hostname = parsed.hostname or ""
    return parsed.scheme == "https" and (
        hostname == "instagram.com"
        or hostname.endswith(".instagram.com")
        or hostname.endswith(".cdninstagram.com")
        or hostname.endswith(".fbcdn.net")
    )

def _fetch_limited(client: httpx.Client, url: str, limit: int, allowed) -> tuple[bytes, str]:
    for _ in range(4):
        if not allowed(url):
            raise PreviewUnavailable()
        with client.stream("GET", url, headers={"Referer": "https://www.instagram.com/"}) as response:
            if response.status_code in {301, 302, 303, 307, 308}:
                location = response.headers.get("location")
                if not location:
                    raise PreviewUnavailable()
                url = urljoin(url, location)
                continue
            response.raise_for_status()
            size = 0
            chunks = []
            for chunk in response.iter_bytes():
                size += len(chunk)
                if size > limit:
                    raise PreviewUnavailable()
                chunks.append(chunk)
            return b"".join(chunks), response.headers.get("content-type", "").split(";", 1)[0].lower()
    raise PreviewUnavailable()


def _download(client: httpx.Client, url: str) -> tuple[bytes, str]:
    content, content_type = _fetch_limited(client, url, MAX_IMAGE_BYTES, _allowed_image_url)
    if content_type not in CONTENT_EXTENSIONS or not content:
        raise PreviewUnavailable()
    return content, content_type


def get_post_preview(
    post: InstagramPost,
    cache_dir: Path | None = None,
    client: httpx.Client | None = None,
) -> tuple[bytes, str]:
    root = cache_dir or Path(os.getenv("PREVIEW_CACHE_DIR", Path(__file__).resolve().parents[2] / ".cache" / "previews"))
    root.mkdir(parents=True, exist_ok=True)
    for content_type, extension in CONTENT_EXTENSIONS.items():
        cached = root / f"{post.id}{extension}"
        if cached.exists():
            return cached.read_bytes(), content_type

    owns_client = client is None
    http = client or httpx.Client(
        timeout=20,
        follow_redirects=False,
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with CACHE_LOCKS_GUARD:
        post_lock = CACHE_LOCKS.setdefault(post.id or 0, Lock())
    try:
        with post_lock:
            for content_type, extension in CONTENT_EXTENSIONS.items():
                cached = root / f"{post.id}{extension}"
                if cached.exists():
                    return cached.read_bytes(), content_type

            try:
                content, content_type = _download(http, post.thumbnail_url or "")
            except (httpx.HTTPError, PreviewUnavailable):
                if not _allowed_post_url(post.url):
                    raise PreviewUnavailable() from None
                page_content, page_type = _fetch_limited(http, post.url, 2 * 1024 * 1024, _allowed_post_url)
                if page_type not in {"text/html", "text/plain", ""}:
                    raise PreviewUnavailable()
                parser = OpenGraphParser()
                parser.feed(page_content.decode("utf-8", errors="replace"))
                content, content_type = _download(http, parser.image_url or "")

            destination = root / f"{post.id}{CONTENT_EXTENSIONS[content_type]}"
            temporary = destination.with_suffix(destination.suffix + ".tmp")
            temporary.write_bytes(content)
            temporary.replace(destination)
            return content, content_type
    except (httpx.HTTPError, OSError, PreviewUnavailable):
        raise PreviewUnavailable() from None
    finally:
        if owns_client:
            http.close()
