"""
OinkMate-Pico Manual Override Controller

Responsibilities:
    - Check the backend for manual feeding/sanitation commands.
    - Start the appropriate synchronized servo pair.
    - Allow the active servo cycle to finish normally.
    - Reset the backend manual override flags after completion.

IMPORTANT:
    A running manual feeding or sanitation cycle CANNOT be
    force-stopped from the mobile application.

    The mobile application prevents accidental OFF commands while
    a cycle is ongoing.

Existing behavior is preserved:
    - Feeding has priority if both flags are 1.
    - Servo controllers remain responsible for physical movement.
    - This module does not implement servo PWM itself.
    - Temporary API/network failures do NOT interrupt a running cycle.
"""

from config import config
from utils import logger
from api.api_client import _post_json
from machine import Pin

from controllers.servo_mg996r import feed_cycle
from controllers.servo_mg90s import sweep


# --------------------------------------------------------------------------
# SANITATION RELAY
# --------------------------------------------------------------------------

# GP16 -> Relay IN
# Relay is active-LOW:
#     0 = ON
#     1 = OFF
#
# This matches the existing scheduled sanitation controller.
_RELAY_PIN = 16
_relay = Pin(_RELAY_PIN, Pin.OUT)
_relay.value(1)  # Keep relay OFF when the controller starts.


# --------------------------------------------------------------------------
# ENDPOINTS
# --------------------------------------------------------------------------

_GET_MANUAL_OVERRIDE_ENDPOINT = (
    "/iot/manual/get_manual_override.php"
)

_RESET_MANUAL_OVERRIDE_ENDPOINT = (
    "/iot/manual/reset_manual_override.php"
)


# --------------------------------------------------------------------------
# BACKEND STATUS
# --------------------------------------------------------------------------

def _fetch_manual_override_status():
    """
    Ask the backend for the current manual override state.

    Returns:
        dict or None
    """

    payload = {
        "device_code": config.DEVICE_CODE
    }

    return _post_json(
        _GET_MANUAL_OVERRIDE_ENDPOINT,
        payload
    )


def _reset_manual_override():
    """
    Reset the backend manual override state after the current
    operation has completed.

    The reset is verified by checking the backend again.

    This prevents a completed manual sanitation cycle from being
    immediately executed again when the backend flag remains 1
    because of a temporary API/network failure.

    Returns:
        True  -> backend confirmed manual overrides are reset.
        False -> reset could not be confirmed.
    """

    payload = {
        "device_code": config.DEVICE_CODE
    }

    # Try the reset more than once in case of a temporary
    # network/API failure.
    max_attempts = 3

    for attempt in range(1, max_attempts + 1):

        logger.info(
            "Resetting manual override "
            "(attempt {}/{}).".format(
                attempt,
                max_attempts
            )
        )

        result = _post_json(
            _RESET_MANUAL_OVERRIDE_ENDPOINT,
            payload
        )

        if (
            result is not None
            and result.get("success")
        ):

            # ------------------------------------------------------
            # Verify that the backend really reports the flags as 0.
            # ------------------------------------------------------

            status = _fetch_manual_override_status()

            if (
                status is not None
                and status.get("success")
            ):

                manualFeeding = status.get(
                    "manual_feeding"
                )

                manualSanitation = status.get(
                    "manual_sanitation"
                )

                if (
                    manualFeeding == 0
                    and manualSanitation == 0
                ):

                    logger.info(
                        "Manual override reset confirmed by backend."
                    )

                    return True

                logger.warning(
                    "Manual override reset request succeeded, "
                    "but backend still reports "
                    "feeding={} sanitation={}.".format(
                        manualFeeding,
                        manualSanitation
                    )
                )

            else:

                logger.warning(
                    "Manual override reset succeeded, "
                    "but reset state could not be verified."
                )

        else:

            logger.error(
                "Failed to reset manual override flag "
                "on the backend."
            )

    logger.error(
        "Manual override reset could not be confirmed "
        "after {} attempts.".format(
            max_attempts
        )
    )

    return False


# --------------------------------------------------------------------------
# MAIN MANUAL OVERRIDE CHECK
# --------------------------------------------------------------------------

def check_manual_override():
    """
    Perform one manual override check.

    Normal flow:

        1. Fetch backend state.
        2. If feeding == 1:
               run MG996R pair normally.
        3. If sanitation == 1:
               run MG90S pair normally.
        4. Reset flags after completion.

    IMPORTANT:
        Once a manual cycle starts, it is NOT force-stopped by
        checking the backend again.

        The servo cycle is allowed to finish normally.

    Returns:
        "feeding"
        "sanitation"
        None
    """

    try:

        # ----------------------------------------------------------
        # Initial backend check
        # ----------------------------------------------------------

        result = _fetch_manual_override_status()

        if result is None:

            return None


        if not result.get("success"):

            logger.warning(
                "Manual override check rejected by server: {}".format(
                    result.get("message")
                )
            )

            return None


        manual_feeding = result.get(
            "manual_feeding"
        )

        manual_sanitation = result.get(
            "manual_sanitation"
        )

        manual_sanitation_duration = result.get(
            "manual_sanitation_duration"
        )

        manual_feeding_amount = result.get(
            "manual_feeding_amount"
        )


        # ==========================================================
        # FEEDING
        # ==========================================================

        if manual_feeding == 1:

            logger.info(
                "Manual feeding override triggered."
            )

            # Get the TOTAL feed amount entered by the farmer.
            #
            # The backend returns this from the currently running
            # manual feeding log.
            #
            # Temporary dispenser calibration:
            #     1 kg = 1 second
            #
            # Therefore, the entered total kg is used directly
            # as the servo gate open duration.
            try:
                feeding_duration = float(
                    manual_feeding_amount
                )
            except (TypeError, ValueError):
                raise ValueError(
                    "Manual feeding amount is unavailable or invalid."
                )

            if feeding_duration <= 0:
                raise ValueError(
                    "Invalid manual feeding amount: {}".format(
                        feeding_duration
                    )
                )

            logger.info(
                "Manual feeding amount: {:.2f} kg.".format(
                    feeding_duration
                )
            )

            logger.info(
                "Starting manual feeding cycle "
                "for {:.2f} seconds.".format(
                    feeding_duration
                )
            )

            # Run the complete feeding cycle normally.
            #
            # NO stop_check.
            # NO backend polling during servo movement.
            #
            # This allows both MG996R servos to move smoothly.
            feed_cycle(
                open_time=feeding_duration
            )

            logger.info(
                "Manual feeding cycle complete."
            )

            # Reset backend ONLY after the cycle has completed.
            _reset_manual_override()

            return "feeding"


        # ==========================================================
        # SANITATION
        # ==========================================================

        if manual_sanitation == 1:

            logger.info(
                "Manual sanitation override triggered."
            )

            # Get the duration entered by the farmer.
            #
            # The backend returns this from the currently running
            # manual sanitation log.
            #
            # If the duration is unavailable or invalid, preserve
            # the existing 5-second behavior as a safe fallback.
            try:
                sanitation_duration = int(
                    manual_sanitation_duration
                )
            except (TypeError, ValueError):
                sanitation_duration = 5

            if sanitation_duration <= 0:
                sanitation_duration = 5

            logger.info(
                "Manual sanitation duration: {} seconds.".format(
                    sanitation_duration
                )
            )

            # Relay is active-LOW: 0 = ON, 1 = OFF.
            # Turn the sanitation relay ON before the servo sweep.
            _relay.value(0)

            logger.info(
                "Manual sanitation relay: ON (GP16 = 0)."
            )

            try:

                # Run the complete sanitation sweep using the duration
                # entered by the farmer.
                #
                # NO stop_check.
                # NO force-stop behavior.
                sweep(
                    duration=sanitation_duration
                )

                logger.info(
                    "Manual sanitation cycle complete."
                )

            finally:

                # Always turn the relay OFF after the sanitation
                # cycle, even if the servo operation raises an error.
                _relay.value(1)

                logger.info(
                    "Manual sanitation relay: OFF (GP16 = 1)."
                )

            # Reset backend ONLY after the cycle has completed.
            #
            # The reset function verifies that the backend
            # actually reports manual_sanitation = 0 before
            # allowing this function to finish.

            reset_confirmed = _reset_manual_override()

            if not reset_confirmed:

                logger.error(
                    "Manual sanitation completed, but the backend "
                    "reset could not be confirmed."
                )

                # Do NOT immediately start another sanitation cycle.
                #
                # The current physical cycle is already finished.
                # Returning here prevents this function from trying
                # to run the servo again during the same call.

                return "sanitation"

            logger.info(
                "Manual sanitation override successfully reset."
            )

            return "sanitation"


        # ==========================================================
        # NOTHING PENDING
        # ==========================================================

        return None


    except Exception as error:

        # Manual override must NEVER crash main.py.
        logger.error(
            "Manual override check failed: {}".format(
                error
            )
        )

        return None

