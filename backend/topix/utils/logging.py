"""Logging configuration utilities."""
import inspect
import logging
import os
from datetime import datetime

logger = logging.getLogger(__name__)

DEFAULT_LOG_DIR = 'logs'


def logging_config(
    level: int = logging.INFO,
    local_file_logs: bool = False,
    log_dir: str = DEFAULT_LOG_DIR
):
    """Set up logging configuration."""
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    handlers = []
    if local_file_logs:  # enable local file logs
        os.makedirs(log_dir, exist_ok=True)

        # Generate a filename with the current date and time
        current_time = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        fp = inspect.stack()[-1].filename
        fp = fp.replace(os.path.abspath('.') + '/', '').replace('/', '__')
        filename = os.path.join(log_dir, f"{current_time}__{fp}.txt")
        handler = logging.FileHandler(filename, encoding='utf-8')
        handlers.append(handler)

    logging_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

    logging.basicConfig(
        level=level,
        format=logging_format,
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    for handler in handlers:
        handler.setLevel(level)
        handler.setFormatter(logging.Formatter(logging_format))
        try:
            root_logger.addHandler(handler)
        except Exception as e:
            logger.warning(e, exc_info=True)
