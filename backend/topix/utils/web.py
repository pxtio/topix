"""Web-related utilities."""
import logging

import cloudscraper
from linkpreview import Link, LinkPreview
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class PreviewLink(BaseModel):
    """Class to fetch and preview a webpage."""

    title: str | None = None
    description: str | None = None
    image: str | None = None
    site_name: str | None = None
    favicon: str | None = None


def preview_webpage(url: str) -> PreviewLink:
    """Fetch a preview of the webpage at the given URL.

    Args:
        url (str): The URL of the webpage to preview.

    Returns:
        PreviewLink: An object containing the title, description, image, site name, and favicon of the webpage.

    """
    scraper = cloudscraper.create_scraper()
    html = scraper.get(url, timeout=5).text
    link = Link(url, html)
    preview = LinkPreview(link, parser="lxml")
    absolute_favicon = None
    try:
        absolute_favicon = preview.absolute_favicon[0][0]
    except Exception as e:
        logger.warning(f"Error fetching absolute favicon: {e}")
    return PreviewLink(
        title=preview.title,
        description=preview.description,
        image=preview.absolute_image,
        site_name=preview.site_name,
        favicon=absolute_favicon
    )
