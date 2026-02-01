"""Web common utilities."""
from urllib.parse import urlparse


def get_domain(url: str) -> str:
    """Extract the domain from a URL.

    Examples:
        http://www.sthg.com/... -> sthg.com
        https://example.org    -> example.org

    """
    parsed = urlparse(url)
    host = parsed.netloc

    # handle URLs without scheme like "www.sthg.com/path"
    if not host:
        # urlparse puts it in path if scheme is missing
        parsed = urlparse("http://" + url)
        host = parsed.netloc

    # remove "www." if present
    if host.startswith("www."):
        host = host[4:]

    return host
