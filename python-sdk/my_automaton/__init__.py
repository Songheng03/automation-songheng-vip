"""my-automaton API client — Python SDK.

AI-powered code review, text analysis, security scanning, and summarization.
"""

from .client import AutomatonClient
from .exceptions import (
    AutomatonError,
    AuthenticationError,
    InsufficientCreditsError,
    RateLimitError,
    ServiceError,
)

__all__ = [
    "AutomatonClient",
    "AutomatonError",
    "AuthenticationError",
    "InsufficientCreditsError",
    "RateLimitError",
    "ServiceError",
]
