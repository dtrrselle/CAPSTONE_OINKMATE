"""
OinkMate-Pico main entry point (production).

Flow:
    1. Initialize logger.
    2. Connect to WiFi (via wifi.wifi_manager) and wait until connected.
    3. Every 5 seconds:
        - Check for a pending manual override command via
          controllers.manual_override_controller.check_manual_override().
          If manual_feeding or manual_sanitation is set, the matching
          servo controller runs (blocking until the movement finishes)
          and the flag is reset on the backend.
        - Every 10 seconds (every other tick):
            - Read the DHT22 sensor (temperature, humidity).
            - Read the MQ135 sensor (raw_adc, ammonia_level). Only
              raw_adc is uploaded; the LOW/MEDIUM/HIGH classification is
              ignored for upload purposes.
            - Upload the environmental readings via
              api.api_client.upload_environment(temperature, humidity, raw_adc).
            - Read all three JSN-SR04T ultrasonic sensors independently,
              one per feed container.
            - Upload the feed levels via
              api.api_client.upload_feed_levels(container_1, container_2, container_3).
            - Log success or failure for each upload.

This module must never crash due to a temporary WiFi, sensor, or manual
override check failure - errors are logged and the loop continues on
the next cycle.

DHT22, MQ135, and the three ultrasonic feed-level sensors are wired up
here. The MG996R (feeding) and MG90S (sanitation) servo controllers are
driven only in response to a manual override command, via
controllers.manual_override_controller.
"""

import time

from utils import logger
from wifi.wifi_manager import connect_wifi, ensure_connected
from sensors.dht22 import read as read_dht22
from sensors.mq135 import read as read_mq135
from sensors.ultrasonic import read as read_ultrasonic
from api.api_client import upload_environment, upload_feed_levels
from controllers import manual_override_controller

# How often (seconds) to read the sensors and upload, per requirements.
_READ_INTERVAL_S = 10

# How often (seconds) to check for a pending manual override command.
# 10 is an exact multiple of 5, so the main loop below ticks every
# _MANUAL_OVERRIDE_INTERVAL_S seconds and runs the (unchanged) sensor
# upload cycle only on every other tick - keeping the original 10s
# sensor cadence while checking manual override every 5s.
_MANUAL_OVERRIDE_INTERVAL_S = 5

# Trigger/echo GPIO pairs for each of the three feed containers' JSN-SR04T
# ultrasonic sensors. Each container is read independently.
_ULTRASONIC_CONTAINERS = (
    ("container_1", 3, 4),
    ("container_2", 5, 6),
    ("container_3", 7, 8),
)


def _read_and_upload_environment():
    """
    Perform one read + upload cycle for the DHT22 and MQ135 sensors.

    Reads temperature/humidity and the MQ135 raw ADC value, then uploads
    them to the backend. The MQ135 LOW/MEDIUM/HIGH classification is
    read but intentionally ignored for upload - only raw_adc is sent.
    All failures are logged and swallowed here so the caller's loop
    never crashes.
    """
    # Make sure WiFi is still up before attempting to read/upload.
    if not ensure_connected():
        logger.error("WiFi not connected. Skipping this cycle.")
        return

    # Read the DHT22 sensor.
    try:
        temperature, humidity = read_dht22()
    except RuntimeError as error:
        logger.error("DHT22 read failed: {}".format(error))
        return

    # Read the MQ135 sensor. The ammonia_level classification is not
    # used here - only the raw ADC value is uploaded.
    try:
        raw_adc, ammonia_level = read_mq135()
    except RuntimeError as error:
        logger.error("MQ135 read failed: {}".format(error))
        return

    # Upload the readings to the backend.
    result = upload_environment(temperature, humidity, raw_adc)

    if result is not None and result.get("success"):
        logger.info("Temperature: {:.1f} C".format(temperature))
        logger.info("Humidity: {:.0f} %".format(humidity))
        logger.info("MQ135 Raw ADC: {}".format(raw_adc))
        logger.info("Upload Success")
    else:
        logger.error("Upload failed for this cycle.")


def _read_feed_levels():
    """
    Read all three ultrasonic feed-container sensors independently.

    Each container is read one at a time using its own trigger/echo
    pin pair - readings are never reused or copied across containers.

    Returns:
        dict or None: {"container_1": ..., "container_2": ...,
        "container_3": ...} with distance readings in centimeters, or
        None if any single sensor read fails (the whole cycle is
        skipped rather than uploading incomplete/stale data).
    """
    levels = {}

    for container_name, trigger_pin, echo_pin in _ULTRASONIC_CONTAINERS:
        try:
            distance_cm = read_ultrasonic(trigger_pin, echo_pin)
        except RuntimeError as error:
            logger.error(
                "Ultrasonic read failed for {}: {}".format(container_name, error)
            )
            return None

        levels[container_name] = distance_cm

    return levels


def _read_and_upload_feed_levels():
    """
    Perform one read + upload cycle for the three feed-container
    ultrasonic sensors.

    Reads container_1, container_2, and container_3 independently, then
    uploads them via upload_feed_levels(). If any sensor fails, the
    upload is skipped for this cycle and the error is logged.
    """
    # Make sure WiFi is still up before attempting to read/upload.
    if not ensure_connected():
        logger.error("WiFi not connected. Skipping this cycle.")
        return

    levels = _read_feed_levels()
    if levels is None:
        return

    container_1 = levels["container_1"]
    container_2 = levels["container_2"]
    container_3 = levels["container_3"]

    # Upload the feed levels to the backend.
    result = upload_feed_levels(container_1, container_2, container_3)

    if result is not None and result.get("success"):
        logger.info("Feed Level 1: {:.1f} cm".format(container_1))
        logger.info("Feed Level 2: {:.1f} cm".format(container_2))
        logger.info("Feed Level 3: {:.1f} cm".format(container_3))
        logger.info("Upload Success")
    else:
        logger.error("Feed level upload failed for this cycle.")


def main():
    logger.info("OinkMate-Pico starting up...")

    wifi_connected = connect_wifi()
    if not wifi_connected:
        logger.error("WiFi connection failed. Halting startup.")
        return

    logger.info("WiFi connected. Starting sensor read/upload loop...")

    # Number of _MANUAL_OVERRIDE_INTERVAL_S ticks that make up one full
    # sensor upload cycle (10s / 5s = 2), so the sensor cycle keeps
    # running on its original cadence even though the loop itself now
    # ticks every 5 seconds.
    _ticks_per_sensor_cycle = _READ_INTERVAL_S // _MANUAL_OVERRIDE_INTERVAL_S
    tick = 0

    while True:
        # Checked every tick (every 5 seconds), per requirements.
        manual_override_controller.check_manual_override()

        # Sensor read/upload cycle stays on its original 10-second cadence.
        if tick % _ticks_per_sensor_cycle == 0:
            _read_and_upload_environment()
            _read_and_upload_feed_levels()

        tick += 1
        time.sleep(_MANUAL_OVERRIDE_INTERVAL_S)


if __name__ == "__main__":
    main()