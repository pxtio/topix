"""Search icons from Iconify public API."""
import os

import httpx

from pydantic import BaseModel

ICONIFY_SEARCH_URL = "https://api.iconify.design/search"
ICON_FAMILIES = [
    "arcticons",
    "bi",
    "devicon",
    "duo-icons",
    "dinkie-icons",
    "fluent-color",
    "fluent-emoji-flat",
    "fluent-emoji-high-contrast",
    "hugeicons",
    "logos",
    "lucide",
    "material-icon-theme",
    "material-symbols",
    "memory",
    "mingcute",
    "mynaui",
    "openmoji",
    "skill-icons",
    "solar",
    "streamline-color",
    "streamline-emojis",
    "streamline-freehand",
    "streamline-freehand-color",
    "streamline-logos",
    "streamline-pixel",
    "streamline-stickies-color",
    "streamline-ultimate",
    "streamline-ultimate-color",
    "tabler",
    "twemoji",
    "uil",
    "vscode-icons"
]
ICON_FAMILIES_STR = ",".join(ICON_FAMILIES)


class IconifySearchResult(BaseModel):
    """Iconify search result model."""

    name: str
    url: str


async def search_iconify_icons(query: str, limit: int = 100) -> list[IconifySearchResult]:
    """Search Iconify public API for icons matching a query."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        # for now we only search for streamline-freehand icons
        params = {"query": query, "limit": str(limit), "prefixes": ICON_FAMILIES_STR}
        resp = await client.get(ICONIFY_SEARCH_URL, params=params)

        # Handle errors
        if resp.status_code != 200:
            raise RuntimeError(f"Iconify API error: {resp.status_code} - {resp.text}")

        data = resp.json()
        res = []
        for item in data.get("icons", []):
            icon = IconifySearchResult(
                name=item,
                url=f"https://api.iconify.design/{item}.svg"
            )
            res.append(icon)
        return res


class UnsplashImage(BaseModel):
    """Unsplash image model."""

    description: str | None = None
    url: str


SEARCH_URL = "https://api.unsplash.com/search/photos"


async def fetch_images(query: str, per_page: int = 5) -> list[dict]:
    """Fetch images from Unsplash matching the query."""
    access_key = os.environ.get("UNSPLASH_ACCESS_KEY")
    headers = {"Authorization": f"Client-ID {access_key}"}
    params = {"query": query, "per_page": per_page}

    async with httpx.AsyncClient() as client:
        r = await client.get(SEARCH_URL, headers=headers, params=params)
        r.raise_for_status()
        data = r.json()

        images = []
        for photo in data["results"]:
            # Use Unsplash's dynamic resizing via CDN parameters
            raw_url = photo["urls"]["raw"]
            custom_url = f"{raw_url}&w=600&h=400&fit=crop"

            author_name = photo["user"]["name"]
            attribution = f" — Photo by {author_name} on Unsplash"

            description = photo.get("description") or photo.get("alt_description") or "Untitled"
            description = f"{description.strip().rstrip('.')}." + attribution

            images.append({
                "url": custom_url,
                "description": description
            })
        return images
