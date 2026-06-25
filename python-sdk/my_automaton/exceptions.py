"""Custom exceptions for the my-automaton API client."""


class AutomatonError(Exception):
    """Base exception for all API errors."""


class AuthenticationError(AutomatonError):
    """Invalid or missing API key."""


class InsufficientCreditsError(AutomatonError):
    """Not enough credits to perform the request."""


class RateLimitError(AutomatonError):
    """Too many requests — free tier limit exceeded."""


class ServiceError(AutomatonError):
    """Server-side error processing the request."""
