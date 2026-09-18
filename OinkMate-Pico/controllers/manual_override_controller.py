# controllers/manual_override_controller.py
#
# Purpose:
# Periodically checks the backend for a pending manual-override command
# (manual_feeding / manual_sanitation) and, if one is pending, runs the
# matching existing servo controller and resets the flag once the
# movement finishes.
#
# Responsibilities ONLY:
#   - Fetch manual override status from the backend.
#   - Decide whether feeding or sanitation should run.
#   - Call the proper (existing, unmodified) servo controller.
#   - Reset the manual override flag once the movement is done.
#   - Return a status value to the caller (main.py).
#
# This module does NOT talk to WiFi directly, does NOT read sensors, and
# does NOT implement its own HTTP/JSON handling from scratch - it reuses
# api_client's internal _post_json() helper so the request/response
# handling (timeouts, JSON parsing, error logging) stays in one place,
# exactly like upload_environment() / upload_feed_levels() already do.
#
# NOTE on the two endpoint paths below: config.py currently only defines
# ENVIRONMENT_UPLOAD_ENDPOINT and FEED_LEVELS_UPLOAD_ENDPOINT, and per
# the task constraints config.py must not be modified. The manual
# override endpoints are therefore defined locally here instead.
#
# NOTE on simultaneous flags: reset_manual_override.php clears BOTH
# manual_feeding and manual_sanitation for the device in one call. If a
# future response ever has both flags set to 1 at once, only the
# feeding action runs this cycle (feeding is checked first) and the
# sanitation flag is cleared as a side effect of that reset. This
# matches the priority order given in the task spec; changing that
# would require changing the backend reset endpoint, which is out of
# scope here.

from config import config
from utils import logger
from api.api_client import _post_json
from controllers.servo_mg996r import feed_cycle
from controllers.servo_mg90s import sweep

# Endpoints (relative to config.API_BASE_URL), mirroring the pattern used
# by config.ENVIRONMENT_UPLOAD_ENDPOINT / FEED_LEVELS_UPLOAD_ENDPOINT.
_GET_MANUAL_OVERRIDE_ENDPOINT = "/iot/manual/get_manual_override.php"
_RESET_MANUAL_OVERRIDE_ENDPOINT = "/iot/manual/reset_manual_override.php"


def _fetch_manual_override_status():
    """
    Ask the backend whether a manual override is currently pending for
    this device.

    Returns:
        dict or None: parsed server response
            {"success": True, "manual_feeding": 0|1, "manual_sanitation": 0|1}
        or None if the request failed (already logged by _post_json).
    """
    payload = {"device_code": config.DEVICE_CODE}
    return _post_json(_GET_MANUAL_OVERRIDE_ENDPOINT, payload)


def _reset_manual_override():
    """
    Tell the backend to clear the manual override flags for this device,
    after the corresponding servo movement has finished.

    Any failure here is logged only - a failed reset should not crash
    the loop or block sensor uploads. (Worst case: the same override
    command gets executed again next cycle.)
    """
    payload = {"device_code": config.DEVICE_CODE}
    result = _post_json(_RESET_MANUAL_OVERRIDE_ENDPOINT, payload)

    if result is None or not result.get("success"):
        logger.error("Failed to reset manual override flag on the backend.")


def check_manual_override():
    """
    Perform one manual-override check cycle:

        1. Fetch the current manual_feeding / manual_sanitation status.
        2. If manual_feeding == 1: run the MG996R feed cycle (blocking -
           waits until the movement finishes), then reset the flag.
        3. Else if manual_sanitation == 1: run the MG90S sweep (blocking
           - waits until the movement finishes), then reset the flag.
        4. Otherwise, do nothing.

    Never raises - any WiFi/API failure is logged and this cycle is
    simply skipped, so sensor uploads in main.py are never affected.

    Returns:
        str or None: "feeding" or "sanitation" if an override action
        was executed this cycle, otherwise None (nothing pending, or
        the check itself failed/was skipped).
    """
    try:
        result = _fetch_manual_override_status()

        if result is None:
            # _post_json already logged the specific network/API error.
            return None

        if not result.get("success"):
            logger.warning(
                "Manual override check rejected by server: {}".format(
                    result.get("message")
                )
            )
            return None

        manual_feeding = result.get("manual_feeding")
        manual_sanitation = result.get("manual_sanitation")

        if manual_feeding == 1:
            logger.info("Manual feeding override triggered.")
            feed_cycle()  # Blocking - returns only once the cycle is done.
            logger.info("Manual feeding movement complete.")
            _reset_manual_override()
            return "feeding"

        if manual_sanitation == 1:
            logger.info("Manual sanitation override triggered.")
            sweep()  # Blocking - returns only once the sweep is done.
            logger.info("Manual sanitation movement complete.")
            _reset_manual_override()
            return "sanitation"

        return None

    except Exception as error:
        # Defensive catch-all: a manual override check must never crash
        # the main loop or interrupt sensor uploads.
        logger.error("Manual override check failed: {}".format(error))
        return None