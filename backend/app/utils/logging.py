"""
Logging configuration using Loguru.
"""
import sys
from loguru import logger
from app.core.config import settings


def setup_logging() -> None:
    """Configure Loguru with console and file handlers."""
    logger.remove()

    logger.add(
        sys.stdout,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan> - <level>{message}</level>",
        level=settings.LOG_LEVEL,
        colorize=True,
    )

    logger.info(f"Logging initialized | Level: {settings.LOG_LEVEL}")


def get_logger(name: str):
    """Get a logger bound to a module name."""
    return logger.bind(module=name)