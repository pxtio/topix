"""Compatibility shim for route imports.

Routes currently import `rate_limiter` from this module. The real implementation
lives in the modular package under `api.utils.rate_limit`.
"""

from topix.api.utils.rate_limit.dependency import rate_limiter

__all__ = ["rate_limiter"]
