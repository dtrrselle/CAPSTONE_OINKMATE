# api/api_client.py
#
# Purpose:
# Responsible ONLY for talking to the PHP backend over HTTP POST.
# It builds URLs, sends JSON payloads, and reports success/failure back
# to the caller. It does NOT read sensors and does NOT decide what data
# to send - callers (e.g. main.py, or future sensor modules) build the
# payload dict and pass it in.

import urequests
import ujson

from config import config
from utils import logger


def _post_json(endpoint, payload):
    """
    Internal helper: send a JSON POST request to the given endpoint
    (relative to API_BASE_URL) and return the parsed JSON response,
    or None if the request failed for any reason.

    This keeps the actual HTTP/JSON handling in one place so
    upload_environment() and upload_feed_levels() stay simple.
    """
    url = config.API_BASE_URL + endpoint
    response = None

    try:
        logger.info("POST {}".format(url))
        response = urequests.post(
            url,
            data=ujson.dumps(payload),
            headers={"Content-Type": "application/json"}
        )

        result = response.json()
        response.close()

        if result.get("success"):
            logger.info("Upload succeeded: {}".format(result.get("message")))
        else:
            logger.warning("Upload rejected by server: {}".format(result.get("message")))

        return result

    except Exception as e:
        logger.error("API request failed: {}".format(e))
        if response is not None:
            response.close()
        return None


def upload_environment(temperature, humidity, ammonia):
    """
    Send an environmental reading to the backend.

    Args:
        temperature (float): temperature reading
        humidity (float): humidity reading
        ammonia (float): ammonia reading

    Returns:
        dict or None: parsed server response, or None on failure.
    """
    payload = {
        "device_code": config.DEVICE_CODE,
        "temperature": temperature,
        "humidity": humidity,
        "ammonia": ammonia
    }
    return _post_json(config.ENVIRONMENT_UPLOAD_ENDPOINT, payload)


def upload_feed_levels(container_1, container_2, container_3):
    """
    Send feed level readings to the backend.

    Args:
        container_1 (float/int): level of container 1
        container_2 (float/int): level of container 2
        container_3 (float/int): level of container 3

    Returns:
        dict or None: parsed server response, or None on failure.
    """
    payload = {
        "device_code": config.DEVICE_CODE,
        "container_1": container_1,
        "container_2": container_2,
        "container_3": container_3
    }
    return _post_json(config.FEED_LEVELS_UPLOAD_ENDPOINT, payload)