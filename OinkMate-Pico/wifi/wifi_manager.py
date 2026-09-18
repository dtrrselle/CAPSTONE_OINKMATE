# wifi/wifi_manager.py
#
# Purpose:
# Responsible ONLY for establishing, checking, and maintaining the WiFi
# connection on the Pico W. It knows nothing about the API or sensors -
# other modules simply call is_connected() before trying to talk to the
# backend, and call connect_wifi() (again) to reconnect if needed.

import network
import time

from config import config
from utils import logger

# Module-level WLAN interface, reused across calls instead of recreating it
_wlan = network.WLAN(network.STA_IF)


def connect_wifi():
    """
    Connect to the WiFi network defined in config.py.
    If already connected, this is a no-op.
    Blocks until connected or until WIFI_CONNECT_TIMEOUT is reached.

    Returns:
        True if connected successfully, False otherwise.
    """
    _wlan.active(True)

    if _wlan.isconnected():
        logger.info("WiFi already connected.")
        return True

    logger.info("Connecting to WiFi SSID '{}'...".format(config.WIFI_SSID))
    _wlan.connect(config.WIFI_SSID, config.WIFI_PASSWORD)

    start = time.time()
    while not _wlan.isconnected():
        if time.time() - start > config.WIFI_CONNECT_TIMEOUT:
            logger.error("WiFi connection timed out.")
            return False
        time.sleep(1)

    logger.info("WiFi connected. IP address: {}".format(_wlan.ifconfig()[0]))
    return True


def disconnect_wifi():
    """Disconnect from WiFi and turn off the WiFi interface."""
    if _wlan.isconnected():
        _wlan.disconnect()
        logger.info("WiFi disconnected.")
    _wlan.active(False)


def is_connected():
    """Return True if currently connected to WiFi, False otherwise."""
    return _wlan.isconnected()


def ensure_connected():
    """
    Convenience helper: if WiFi has dropped, attempt to reconnect
    automatically. Intended to be called periodically from the main loop
    before any API upload attempt.

    Returns:
        True if connected (already or after reconnecting), False otherwise.
    """
    if is_connected():
        return True

    logger.warning("WiFi connection lost. Attempting to reconnect...")
    return connect_wifi()