# utils/logger.py
#
# Purpose:
# Minimal logging helper for MicroPython. Prints readable, timestamped-style
# log lines to the serial monitor so behavior (WiFi status, API calls,
# errors) can be observed during development and field debugging.
# This module has ONE responsibility: formatting and printing log messages.
# It does not know about WiFi, sensors, or the API.

import time


def _timestamp():
    """
    Return a simple uptime-based timestamp in seconds.
    MicroPython on the Pico W has no RTC set by default, so we use
    ticks_ms() as a lightweight relative timestamp instead of wall-clock time.
    """
    return time.ticks_ms() // 1000


def info(message):
    """Log a normal, informational message."""
    print("[{}s] [INFO] {}".format(_timestamp(), message))


def warning(message):
    """Log a warning: something unexpected, but not fatal."""
    print("[{}s] [WARNING] {}".format(_timestamp(), message))


def error(message):
    """Log an error: an operation failed."""
    print("[{}s] [ERROR] {}".format(_timestamp(), message))