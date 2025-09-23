"""Web utilities related to favicons and meta images."""
import asyncio
import ipaddress
import re

from typing import Iterable, Optional
from urllib.parse import urljoin, urlparse

import httpx

from pydantic import BaseModel, HttpUrl
from selectolax.parser import HTMLParser


class MetaImages(BaseModel):
    """Favicon + cover image fetched from a webpage."""

    favicon: HttpUrl | None = None
    cover_image: HttpUrl | None = None


# ---- helpers ----
def _is_private_literal_ip(hostname: str) -> bool:
    """Fast, non-blocking SSRF guard.

    - If hostname is a *literal IP*, reject private/loopback/link-local.
    - If hostname is a domain name, do NOT resolve here (avoid blocking).
    Leave full DNS policies to upstream infra or a separate async check.
    """
    try:
        # Quick allow-list for common local hostnames
        lowered = hostname.lower()
        if lowered in {"localhost", "ip6-localhost", "ip6-loopback"}:
            return True

        # If it's a literal IP, check ranges
        ip = ipaddress.ip_address(hostname)
        if ip.is_private or ip.is_loopback or ip.is_link_local:
            return True
    except ValueError:
        # Not a literal IP → treat as domain; don't block here
        return False
    return False


def _score_icon(href: str, sizes: str | None, icon_type: str | None) -> float:
    score = 0.0
    type_lower = (icon_type or "").lower()
    if "png" in type_lower:
        score += 3
    if "svg" in type_lower:
        score += 2
    size_match = re.search(r"(\d+)x(\d+)", sizes or "", re.I)
    if size_match:
        min_side = min(int(size_match.group(1)), int(size_match.group(2)))
        score += min_side / 64
    if "apple-touch-icon" in href:
        score += 1
    if href.lower().endswith(".ico"):
        score -= 0.25
    return score


async def fetch_meta_images(  # noqa: C901
    url: str,
    timeout: float = 0.5,
    verify_exists: bool = False,
    favicon_only: bool = False,
    client: Optional[httpx.AsyncClient] = None,
) -> MetaImages:
    """Fetch favicon and (optionally) cover image from a webpage using httpx."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("Only http/https URLs are allowed")
    if _is_private_literal_ip(parsed.hostname or ""):
        raise ValueError("Private/loopback hosts are not allowed")

    headers = {
        "User-Agent": "MetaFetcher/3.2 (+httpx)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
    }

    owns_client = client is None
    if owns_client:
        client = httpx.AsyncClient(
            follow_redirects=True,
            timeout=httpx.Timeout(timeout, connect=min(timeout, 0.3)),
            http2=True,
            headers=headers,
        )

    try:
        assert client is not None
        response = await client.get(url)
        response.raise_for_status()
        final_url = str(response.url)

        html_text = response.text
        if len(response.content) > 2_000_000:
            html_text = response.content[:2_000_000].decode(
                response.encoding or "utf-8", errors="ignore"
            )

        document = HTMLParser(html_text)

        # favicon
        favicon_url: Optional[str] = None
        candidate_links = []
        for link_node in document.css("link[rel]"):
            rel_value = " ".join((link_node.attributes.get("rel") or "").lower().split())
            if any(keyword in rel_value for keyword in ["icon", "shortcut icon", "apple-touch-icon", "apple-touch-icon-precomposed"]):
                href_value = link_node.attributes.get("href")
                if href_value:
                    candidate_links.append({
                        "href": href_value,
                        "sizes": link_node.attributes.get("sizes"),
                        "type": link_node.attributes.get("type"),
                    })
        if candidate_links:
            candidate_links.sort(
                key=lambda candidate: _score_icon(
                    candidate["href"], candidate.get("sizes"), candidate.get("type")
                ),
                reverse=True,
            )
            favicon_url = urljoin(final_url, candidate_links[0]["href"])
        else:
            favicon_url = urljoin(final_url, "/favicon.ico")

        # cover image (only if not favicon_only)
        cover_image_url: Optional[str] = None
        if not favicon_only:
            open_graph_meta = document.css_first('meta[property="og:image"]')
            twitter_meta = document.css_first('meta[name="twitter:image"]')
            if open_graph_meta and open_graph_meta.attributes.get("content"):
                cover_image_url = urljoin(final_url, open_graph_meta.attributes["content"])
            elif twitter_meta and twitter_meta.attributes.get("content"):
                cover_image_url = urljoin(final_url, twitter_meta.attributes["content"])
            else:
                first_image_node = document.css_first("img[src]")
                if first_image_node:
                    cover_image_url = urljoin(final_url, first_image_node.attributes.get("src"))

        # optional existence check (extra I/O)
        if verify_exists:
            async def _check_url_exists(asset_url: str | None) -> str | None:
                if not asset_url:
                    return None
                try:
                    head_response = await client.head(asset_url)
                    if head_response.status_code < 400:
                        return asset_url
                    get_response = await client.get(asset_url)
                    return asset_url if get_response.status_code < 400 else None
                except httpx.RequestError:
                    return None

            favicon_task = _check_url_exists(favicon_url)
            if favicon_only:
                favicon_url, _ = await asyncio.gather(favicon_task, asyncio.sleep(0))
            else:
                cover_task = _check_url_exists(cover_image_url)
                favicon_url, cover_image_url = await asyncio.gather(favicon_task, cover_task)

        return MetaImages(favicon=favicon_url, cover_image=cover_image_url)

    finally:
        if owns_client and client is not None:
            await client.aclose()


async def fetch_meta_images_batch(
    urls: Iterable[str],
    timeout: float = 0.5,
    verify_exists: bool = False,
    favicon_only: bool = False,
    concurrency_limit: int = 200,
) -> dict[str, MetaImages]:
    """Fetch meta images for many URLs concurrently with a shared client.

    Per-URL errors are caught; that URL maps to MetaImages() (all None).
    """
    headers = {
        "User-Agent": "MetaFetcher/3.2 (+httpx-batch)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
    }
    results: dict[str, MetaImages] = {}
    semaphore = asyncio.Semaphore(concurrency_limit)

    async with httpx.AsyncClient(
        follow_redirects=True,
        timeout=httpx.Timeout(timeout, connect=min(timeout, 0.3)),
        http2=True,
        headers=headers,
    ) as shared_client:

        async def process_url(target_url: str) -> None:
            async with semaphore:
                try:
                    # Local precheck avoids blocking DNS
                    parsed = urlparse(target_url)
                    if parsed.scheme not in {"http", "https"} or _is_private_literal_ip(parsed.hostname or ""):
                        results[target_url] = MetaImages()
                        return

                    results[target_url] = await fetch_meta_images(
                        target_url,
                        timeout=timeout,
                        verify_exists=verify_exists,
                        favicon_only=favicon_only,
                        client=shared_client,
                    )
                except Exception:
                    results[target_url] = MetaImages()

        # Launch all tasks concurrently
        await asyncio.gather(*(process_url(target_url) for target_url in urls))

    return results
