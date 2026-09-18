# OinkMate Scheduled Sanitation Controller
#
# Separate from manual_override_controller.py.
# Claims one pending scheduled sanitation job, runs the existing MG90S sweep
# for the exact number of seconds stored by the backend, then reports status.

import urequests
from machine import Pin

from controllers.servo_mg90s import sweep

API_BASE_URL = "https://oinkmate.online/oinkmate-api"

# Relay control
# GP16 -> Relay IN
# Relay is active-LOW: 0 = ON, 1 = OFF.
_RELAY_PIN = 16
_relay = Pin(_RELAY_PIN, Pin.OUT)
_relay.value(1)  # Keep relay OFF when the controller starts.

_CLAIM_URL = API_BASE_URL + "/api/schedules/claim_pending_sanitation.php"
_COMPLETE_URL = API_BASE_URL + "/api/schedules/complete_sanitation.php"


def _post_json(url, payload=None):
    response = None

    try:
        response = urequests.post(
            url,
            json=payload or {},
            headers={"Content-Type": "application/json"},
        )

        if response.status_code != 200:
            print("Scheduled sanitation HTTP error:", response.status_code)
            return None

        try:
            return response.json()
        except Exception:
            print("Scheduled sanitation invalid JSON:", response.text[:200])
            return None

    except Exception as e:
        print("Scheduled sanitation request error:", e)
        return None

    finally:
        if response is not None:
            try:
                response.close()
            except Exception:
                pass


def _claim_pending_sanitation():
    data = _post_json(_CLAIM_URL)

    if not data or not data.get("success") or not data.get("claimed"):
        return None

    return data.get("sanitation")


def _complete_sanitation(log_id, completed, error_message=None):
    payload = {
        "log_id": int(log_id),
        "completed": bool(completed),
    }

    if error_message:
        payload["error_message"] = str(error_message)

    data = _post_json(_COMPLETE_URL, payload)

    if not data or not data.get("success"):
        print("Failed to update sanitation log:", log_id)
        return False

    return True


def check_scheduled_sanitation():
    # Check for one pending scheduled sanitation job.
    job = _claim_pending_sanitation()

    if not job:
        return None

    log_id = job.get("log_id")
    duration_seconds = job.get("duration_seconds")

    if log_id is None or duration_seconds is None:
        print("Invalid scheduled sanitation job:", job)
        return None

    try:
        duration_seconds = int(duration_seconds)

        if duration_seconds < 1 or duration_seconds > 1800:
            raise ValueError(
                "Invalid sanitation duration: "
                + str(duration_seconds)
                + " seconds"
            )

        print(
            "Starting scheduled sanitation:",
            duration_seconds,
            "seconds",
        )

        # Relay is active-LOW: 0 = ON, 1 = OFF.
        # Turn relay ON before the sanitation sweep starts.
        _relay.value(0)
        print("Sanitation relay: ON (GP16 = 0)")

        try:
            # Existing servo_mg90s.sweep() already accepts duration in seconds.
            # No manual stop/network check is passed here.
            sweep(duration=duration_seconds)

            _complete_sanitation(log_id, True)

            print("Scheduled sanitation completed:", log_id)
            return "sanitation"

        except Exception as e:
            print("Scheduled sanitation failed:", log_id, e)
            _complete_sanitation(log_id, False, str(e))
            return None

        finally:
            # Always turn relay OFF after the sanitation cycle,
            # including if the servo or completion request fails.
            _relay.value(1)
            print("Sanitation relay: OFF (GP16 = 1)")

    except Exception as e:
        print("Scheduled sanitation failed:", log_id, e)
        return None

