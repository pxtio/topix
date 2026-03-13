"""Authentication method availability helpers."""

import os

GOOGLE_CONNECT_ENABLED_ENV = "GOOGLE_CONNECT_ENABLED"
GOOGLE_CLIENT_ID_ENV = "GOOGLE_CLIENT_ID"


def _is_truthy(value: str | None) -> bool:
    """Parse common truthy env string values."""
    if value is None:
        return False
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _read_env(name: str) -> str | None:
    """Return a non-empty environment variable value or None."""
    value = os.getenv(name)
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def is_google_connect_enabled() -> bool:
    """Return whether Google connect is explicitly enabled."""
    return _is_truthy(os.getenv(GOOGLE_CONNECT_ENABLED_ENV))


def get_google_client_id() -> str | None:
    """Return the configured Google client id when present."""
    return _read_env(GOOGLE_CLIENT_ID_ENV)


def is_google_connect_available() -> bool:
    """Return whether Google connect is both enabled and configured."""
    return is_google_connect_enabled() and get_google_client_id() is not None
