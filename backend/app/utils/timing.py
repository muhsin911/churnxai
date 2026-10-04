"""
Performance timing utilities.
"""
import time
from functools import wraps
from typing import Callable, Any
from app.utils.logging import get_logger

logger = get_logger(__name__)


def timing_decorator(func: Callable) -> Callable:
    """Decorator that measures function execution time."""

    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        start = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            elapsed = time.perf_counter() - start
            logger.info(f"{func.__name__} executed in {elapsed:.3f}s")
            return result
        except Exception as e:
            elapsed = time.perf_counter() - start
            logger.error(f"{func.__name__} failed after {elapsed:.3f}s: {e}")
            raise

    return wrapper