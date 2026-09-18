# wifi/wifi_manager.py
#
# OinkMate WiFi Manager
#
# Responsibilities:
# - Maintain the Pico WiFi connection.
# - Automatically recover after temporary WiFi loss.
# - Retry indefinitely over repeated calls to ensure_connected().
# - Reset the WLAN interface when a connection attempt becomes stuck.
# - Provide useful connection status diagnostics.
#
# IMPORTANT:
# - WiFi credentials remain in config.py.
# - This module does NOT modify config.py.
# - This module does NOT affect sensors, API logic, servos,
#   manual override, or database logic.

import network
import time

from config import config
from utils import logger


# ---------------------------------------------------------------------------
# WLAN INTERFACE
# ---------------------------------------------------------------------------

_wlan = network.WLAN(network.STA_IF)


# ---------------------------------------------------------------------------
# TIMING
# ---------------------------------------------------------------------------

# Maximum time for one connection attempt.
_CONNECT_TIMEOUT_S = 10

# Minimum delay between fresh reconnect attempts.
_RETRY_DELAY_S = 3


# ---------------------------------------------------------------------------
# INTERNAL STATE
# ---------------------------------------------------------------------------

# Prevent repeated reconnect attempts from happening too rapidly.
_last_attempt_ms = None


# ---------------------------------------------------------------------------
# STATUS DESCRIPTION
# ---------------------------------------------------------------------------

def _status_description(status):
    """
    Convert MicroPython WLAN status codes into readable text.
    """

    status_map = {
        getattr(network, "STAT_IDLE", 0): "IDLE",
        getattr(network, "STAT_CONNECTING", 1): "CONNECTING",
        getattr(network, "STAT_WRONG_PASSWORD", -3): "WRONG_PASSWORD",
        getattr(network, "STAT_NO_AP_FOUND", -2): "NO_AP_FOUND",
        getattr(network, "STAT_CONNECT_FAIL", -1): "CONNECT_FAIL",
        getattr(network, "STAT_GOT_IP", 3): "GOT_IP",
    }

    return status_map.get(
        status,
        "UNKNOWN_STATUS"
    )


# ---------------------------------------------------------------------------
# WLAN RESET
# ---------------------------------------------------------------------------

def _reset_wlan():
    """
    Fully reset the station interface before a fresh connection attempt.

    This helps recover from a stale/stuck WLAN state after a prolonged
    disconnection.
    """

    try:

        logger.info(
            "Resetting WiFi interface..."
        )

        try:
            _wlan.disconnect()
        except Exception:
            pass

        _wlan.active(False)

        time.sleep(1)

        _wlan.active(True)

        time.sleep(1)

    except Exception as error:

        logger.error(
            "WiFi interface reset failed: {}".format(
                error
            )
        )


# ---------------------------------------------------------------------------
# CONNECT WIFI
# ---------------------------------------------------------------------------

def connect_wifi():
    """
    Perform ONE WiFi connection attempt.

    Returns:
        True  - connected
        False - connection attempt failed

    This function intentionally performs only one attempt.
    Repeated recovery is handled by ensure_connected().
    """

    global _last_attempt_ms

    try:

        # ---------------------------------------------------------------
        # Make sure station mode is enabled.
        # ---------------------------------------------------------------

        _wlan.active(True)

        # ---------------------------------------------------------------
        # Already connected.
        # ---------------------------------------------------------------

        if _wlan.isconnected():

            logger.info(
                "WiFi already connected. IP address: {}".format(
                    _wlan.ifconfig()[0]
                )
            )

            return True

        # ---------------------------------------------------------------
        # Prevent rapid repeated attempts.
        # ---------------------------------------------------------------

        now_ms = time.ticks_ms()

        if _last_attempt_ms is not None:

            elapsed_ms = time.ticks_diff(
                now_ms,
                _last_attempt_ms
            )

            if elapsed_ms < (_RETRY_DELAY_S * 1000):

                return False

        _last_attempt_ms = now_ms

        # ---------------------------------------------------------------
        # Fresh WLAN reset.
        # ---------------------------------------------------------------

        _reset_wlan()

        logger.info(
            "Connecting to WiFi SSID '{}'...".format(
                config.WIFI_SSID
            )
        )

        # ---------------------------------------------------------------
        # Start connection.
        # ---------------------------------------------------------------

        _wlan.connect(
            config.WIFI_SSID,
            config.WIFI_PASSWORD
        )

        start_ms = time.ticks_ms()

        # ---------------------------------------------------------------
        # Wait for this ONE connection attempt.
        # ---------------------------------------------------------------

        while not _wlan.isconnected():

            elapsed_ms = time.ticks_diff(
                time.ticks_ms(),
                start_ms
            )

            if elapsed_ms >= (_CONNECT_TIMEOUT_S * 1000):

                status = _wlan.status()

                logger.error(
                    "WiFi connection timed out. "
                    "Status: {} ({})".format(
                        status,
                        _status_description(status)
                    )
                )

                return False

            time.sleep(1)

        # ---------------------------------------------------------------
        # Connected successfully.
        # ---------------------------------------------------------------

        ip_address = _wlan.ifconfig()[0]

        logger.info(
            "WiFi connected. IP address: {}".format(
                ip_address
            )
        )

        logger.info(
            "WiFi status: {} ({})".format(
                _wlan.status(),
                _status_description(_wlan.status())
            )
        )

        return True

    except Exception as error:

        logger.error(
            "WiFi connection attempt failed: {}".format(
                error
            )
        )

        return False


# ---------------------------------------------------------------------------
# DISCONNECT WIFI
# ---------------------------------------------------------------------------

def disconnect_wifi():
    """
    Manually disconnect from WiFi.

    Kept for compatibility with the existing project.
    """

    try:

        if _wlan.isconnected():

            _wlan.disconnect()

            logger.info(
                "WiFi disconnected."
            )

        _wlan.active(False)

    except Exception as error:

        logger.error(
            "WiFi disconnect failed: {}".format(
                error
            )
        )


# ---------------------------------------------------------------------------
# CONNECTION STATUS
# ---------------------------------------------------------------------------

def is_connected():
    """
    Return True if the Pico currently has a WiFi connection.
    """

    try:

        return _wlan.isconnected()

    except Exception as error:

        logger.error(
            "WiFi status check failed: {}".format(
                error
            )
        )

        return False


# ---------------------------------------------------------------------------
# ENSURE CONNECTION
# ---------------------------------------------------------------------------

def ensure_connected():
    """
    Make sure the Pico has WiFi.

    If already connected:
        Return immediately.

    If disconnected:
        Perform a fresh reconnect attempt.

    If that attempt fails:
        Return False.

    The MAIN LOOP will call this again later, which means the Pico
    automatically retries indefinitely without blocking the entire
    system.

    This is intentional.

    We do NOT use:

        while not connected:
            connect...

    because that would freeze sensor processing and manual override
    while WiFi is unavailable.
    """

    if is_connected():

        return True


    logger.warning(
        "WiFi connection lost. Attempting automatic reconnect..."
    )


    connected = connect_wifi()


    if connected:

        logger.info(
            "WiFi automatic reconnect successful."
        )

        return True


    logger.warning(
        "WiFi still unavailable. "
        "The system will continue and retry automatically."
    )

    return False