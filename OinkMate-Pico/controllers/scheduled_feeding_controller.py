"""
OinkMate-Pico Scheduled Feeding Controller

Responsibilities:
    - Check the backend for pending scheduled feeding jobs.
    - Claim one pending feeding job.
    - Receive the calculated feeding duration.
    - Run the MG996R feeding cycle for that duration.
    - Save the feeding information to the backend.
    - Mark the scheduled feeding as completed or failed.

IMPORTANT:
    Feeding duration is calculated by the backend.

TEMPORARY DISPENSER CALIBRATION:
    3 seconds = 3 kg

    Therefore:
        1 second = 1 kg

    The farmer does NOT enter feeding duration.
"""

from config import config
from utils import logger
from api.api_client import _post_json

from controllers.servo_mg996r import feed_cycle


# --------------------------------------------------------------------------
# ENDPOINTS
# --------------------------------------------------------------------------

_CLAIM_PENDING_FEEDING_ENDPOINT = (
    "/schedules/claim_pending_feeding.php"
)

_COMPLETE_FEEDING_ENDPOINT = (
    "/schedules/complete_feeding.php"
)


# --------------------------------------------------------------------------
# CLAIM SCHEDULED FEEDING
# --------------------------------------------------------------------------

def _claim_pending_feeding():
    """
    Ask the backend for one pending scheduled feeding.

    The backend:
        1. Claims the pending job.
        2. Gets the latest pig count.
        3. Gets feed amount per pig.
        4. Calculates total feed required.
        5. Calculates feeding duration.
        6. Returns those values to the Pico.

    Returns:
        dict or None
    """

    result = _post_json(
        _CLAIM_PENDING_FEEDING_ENDPOINT,
        {}
    )

    if result is None:
        return None

    if not result.get("success"):

        logger.warning(
            "Scheduled feeding claim rejected: {}".format(
                result.get("message")
            )
        )

        return None

    if not result.get("claimed"):
        return None

    return result.get("feeding")


# --------------------------------------------------------------------------
# COMPLETE SCHEDULED FEEDING
# --------------------------------------------------------------------------

def _complete_feeding(
    log_id,
    completed,
    feed_type=None,
    feed_dispensed_kg=None,
    error_message=None
):
    """
    Tell the backend that the scheduled feeding
    has finished.

    completed=True:
        running → completed

    completed=False:
        running → failed
    """

    payload = {
        "log_id": log_id,
        "completed": completed,
        "feed_type": feed_type,
        "feed_dispensed_kg": feed_dispensed_kg,
        "error_message": error_message
    }

    result = _post_json(
        _COMPLETE_FEEDING_ENDPOINT,
        payload
    )

    if (
        result is None
        or not result.get("success")
    ):

        logger.error(
            "Failed to update scheduled feeding log #{}".format(
                log_id
            )
        )

        return False

    return True


# --------------------------------------------------------------------------
# MAIN SCHEDULED FEEDING CHECK
# --------------------------------------------------------------------------

def check_scheduled_feeding():
    """
    Perform one scheduled feeding check.

    Normal flow:

        1. Ask backend for a pending feeding.
        2. Backend claims the job.
        3. Backend calculates required feed.
        4. Backend calculates feeding duration.
        5. Pico runs MG996R pair for that duration.
        6. Feeding information is saved.
        7. Log becomes completed.

    Returns:
        True  - feeding was executed
        False - no scheduled feeding was pending
    """

    try:

        feeding = _claim_pending_feeding()

        if feeding is None:
            return False


        # --------------------------------------------------------------
        # Get backend-calculated values
        # --------------------------------------------------------------

        log_id = feeding.get("log_id")

        schedule_id = feeding.get(
            "schedule_id"
        )

        pen_id = feeding.get(
            "pen_id"
        )

        pig_count = feeding.get(
            "pig_count"
        )

        feed_amount_per_pig = feeding.get(
            "feed_amount_per_pig"
        )

        total_feed_required = feeding.get(
            "total_feed_required"
        )

        feeding_duration = feeding.get(
            "feeding_duration_seconds"
        )

        feed_type = feeding.get(
            "feed_type"
        )


        logger.info(
            "Scheduled feeding claimed: "
            "log_id={}, schedule_id={}, pen_id={}".format(
                log_id,
                schedule_id,
                pen_id
            )
        )


        logger.info(
            "Feeding calculation: "
            "pigs={}, feed_per_pig={}kg, "
            "total={}kg, duration={}s, feed_type={}".format(
                pig_count,
                feed_amount_per_pig,
                total_feed_required,
                feeding_duration,
                feed_type
            )
        )


        # --------------------------------------------------------------
        # Validate duration
        # --------------------------------------------------------------

        if feeding_duration is None:

            raise ValueError(
                "Backend did not provide feeding duration."
            )


        feeding_duration = float(
            feeding_duration
        )


        if feeding_duration <= 0:

            raise ValueError(
                "Invalid feeding duration: {}".format(
                    feeding_duration
                )
            )


        # --------------------------------------------------------------
        # Run feeding
        # --------------------------------------------------------------

        try:

            logger.info(
                "Starting scheduled feeding cycle "
                "for {:.2f} seconds.".format(
                    feeding_duration
                )
            )


            # IMPORTANT:
            # feed_cycle() uses open_time as the
            # amount of time the gates remain open.
            feed_cycle(
                open_time=feeding_duration
            )


            logger.info(
                "Scheduled feeding cycle complete."
            )


            # ----------------------------------------------------------
            # Save feeding execution information
            # ----------------------------------------------------------

            _complete_feeding(
                log_id=log_id,
                completed=True,
                feed_type=feed_type,
                feed_dispensed_kg=total_feed_required,
                error_message=None
            )


            return True


        except Exception as error:

            logger.error(
                "Scheduled feeding cycle failed: {}".format(
                    error
                )
            )


            _complete_feeding(
                log_id=log_id,
                completed=False,
                feed_type=feed_type,
                feed_dispensed_kg=total_feed_required,
                error_message=str(error)
            )


            return False


    except Exception as error:

        logger.error(
            "Scheduled feeding check failed: {}".format(
                error
            )
        )

        return False

