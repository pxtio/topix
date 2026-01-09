"""Tests for domain extraction from URLs."""


from topix.utils.web.common import get_domain


def test_http_with_www_and_path():
    """Ensure domains are extracted correctly for HTTP URLs with www and path."""
    url = "http://www.sthg.com/some/path?x=1"
    assert get_domain(url) == "sthg.com"


def test_https_with_www_and_trailing_slash():
    """Ensure domains extract correctly for HTTPS URLs with www and trailing slash."""
    url = "https://www.example.com/"
    assert get_domain(url) == "example.com"


def test_https_without_www():
    """Ensure domains extract correctly for HTTPS URLs without www."""
    url = "https://example.org/page"
    assert get_domain(url) == "example.org"


def test_http_with_port():
    """Ensure domains with ports are preserved."""
    url = "http://www.my-site.net:8080/index.html"
    assert get_domain(url) == "my-site.net:8080"


def test_subdomain():
    """Ensure full subdomains are returned without modification."""
    url = "https://blog.sub.domain.com/article"
    assert get_domain(url) == "blog.sub.domain.com"


def test_no_scheme_with_www():
    """Handle URLs missing a scheme but starting with www."""
    url = "www.sthg.com/some/page"
    assert get_domain(url) == "sthg.com"


def test_no_scheme_without_www():
    """Handle URLs missing a scheme and without www."""
    url = "sub.domain.co.uk/path"
    assert get_domain(url) == "sub.domain.co.uk"


def test_ip_address():
    """Ensure IP addresses are returned as-is."""
    url = "http://192.168.0.1/login"
    assert get_domain(url) == "192.168.0.1"


def test_empty_string():
    """Return empty string when URL is empty."""
    url = ""
    assert get_domain(url) == ""


def test_garbage_string():
    """Gracefully handle strings that are not URLs."""
    url = "not a url at all"
    assert get_domain(url) == "not a url at all"
