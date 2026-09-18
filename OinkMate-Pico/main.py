"""
OinkMate-Pico main.py
Production version - Sensor Monitoring + API Uploads +
Manual Override + Scheduled Feeding

Behavior:
    - Automatically runs when MicroPython boots.
    - Connects to WiFi and automatically attempts to reconnect if WiFi
      is temporarily lost.
    - Reads all currently connected sensors continuously.
    - Uploads valid sensor readings to the OinkMate backend.
    - Checks for manual feeding/sanitation commands every 5 seconds.
    - Checks for scheduled feeding commands every 5 seconds.
    - Runs the appropriate servo pair when a command exists.
    - Feeding command moves BOTH MG996R servos together.
    - Sanitation command moves BOTH MG90S servos together.
    - Does NOT run the servos automatically every sensor cycle.
    - Manual override and scheduled feeding use separate controllers.

Failure isolation:
    A failure in one sensor, upload, WiFi operation, manual override
    check, or scheduled feeding check must never terminate the main loop.
"""

import time

from config import config
from utils import logger

from wifi.wifi_manager import connect_wifi, ensure_connected

from sensors.dht22 import read as read_dht22
from sensors.mq135 import read as read_mq135
from sensors.ultrasonic import read as read_ultrasonic
from sensors import water_flow

from api.api_client import (
    upload_environment,
    upload_feed_levels,
    upload_water_usage,
)

from controllers import manual_override_controller
from controllers import scheduled_feeding_controller
from controllers import scheduled_sanitation_controller


# --------------------------------------------------------------------------
# TIMING
# --------------------------------------------------------------------------

# Sensor readings and uploads happen every 10 seconds.
_SENSOR_INTERVAL_S = 10

# Manual override is checked every 5 seconds.
_MANUAL_OVERRIDE_INTERVAL_S = 5

# Scheduled feeding is checked every 5 seconds.
_SCHEDULED_FEEDING_INTERVAL_S = 5

# Scheduled sanitation is checked every 5 seconds.
_SCHEDULED_SANITATION_INTERVAL_S = 5


# --------------------------------------------------------------------------
# ULTRASONIC CONFIGURATION
# --------------------------------------------------------------------------

# Only TWO ultrasonic sensors are currently used.
#
# Container 1:
#     Trigger -> GP3
#     Echo    -> GP4
#
# Container 2:
#     Trigger -> GP5
#     Echo    -> GP6
#
# GP8 is reserved exclusively for the YF-S201 water flow sensor.

_ULTRASONIC_CONTAINERS = (
    ("container_1", 3, 4),
    ("container_2", 5, 6),
)


# --------------------------------------------------------------------------
# SENSOR READ FUNCTIONS
# --------------------------------------------------------------------------

def _read_dht22():
    """
    Read DHT22 temperature and humidity.

    Returns:
        tuple or None:
            (temperature, humidity) if successful,
            None if the sensor read fails.
    """

    print("[DHT22]")

    try:
        temperature, humidity = read_dht22()

        print("Temperature: {:.1f} C".format(temperature))
        print("Humidity: {:.0f} %".format(humidity))

        return temperature, humidity

    except Exception as error:
        print("ERROR: {}".format(error))
        logger.error("DHT22 read failed: {}".format(error))
        return None


def _read_mq135():
    """
    Read MQ135.

    Returns:
        raw ADC value if successful,
        None if the sensor read fails.

    The LOW/MEDIUM/HIGH classification is only displayed.
    The raw ADC value is what gets uploaded to the backend.
    """

    print("[MQ135]")

    try:
        raw_adc, ammonia_level = read_mq135()

        print("Raw ADC: {}".format(raw_adc))
        print("Ammonia Level: {}".format(ammonia_level))

        return raw_adc

    except Exception as error:
        print("ERROR: {}".format(error))
        logger.error("MQ135 read failed: {}".format(error))
        return None


def _read_ultrasonic_levels():
    """
    Read both ultrasonic sensors independently.

    Returns:
        dict containing successful readings.

        Example:
            {
                "container_1": 12.5,
                "container_2": 18.2
            }

    A failure in one sensor does NOT prevent the other sensor from
    being read.
    """

    print("[ULTRASONIC]")

    levels = {}

    for container_name, trigger_pin, echo_pin in _ULTRASONIC_CONTAINERS:

        try:
            distance_cm = read_ultrasonic(
                trigger_pin,
                echo_pin
            )

            print(
                "{}: {:.1f} cm".format(
                    container_name,
                    distance_cm
                )
            )

            levels[container_name] = distance_cm

        except Exception as error:

            print(
                "{} ERROR: {}".format(
                    container_name,
                    error
                )
            )

            logger.error(
                "Ultrasonic {} read failed: {}".format(
                    container_name,
                    error
                )
            )

    return levels


def _read_water_flow():
    """
    Read incremental water consumption from the YF-S201.

    Returns:
        float or None:
            Incremental liters since the previous reading,
            or None if the sensor read fails.
    """

    print("[WATER FLOW]")

    try:
        water_liters = water_flow.read_incremental_liters()

        print(
            "Water Consumption: {:.2f} L".format(
                water_liters
            )
        )

        return water_liters

    except Exception as error:

        print("ERROR: {}".format(error))

        logger.error(
            "Water flow read failed: {}".format(
                error
            )
        )

        return None


# --------------------------------------------------------------------------
# API UPLOAD FUNCTIONS
# --------------------------------------------------------------------------

def _upload_environment(dht22_reading, mq135_raw_adc):
    """
    Upload DHT22 + MQ135 data.

    The backend expects:
        temperature
        humidity
        raw MQ135/ammonia value

    If either sensor failed, the environment upload is skipped.

    WiFi failure does not stop the main loop.
    """

    print("[ENVIRONMENT UPLOAD]")

    if dht22_reading is None:
        print("Skipped: DHT22 reading unavailable.")
        return

    if mq135_raw_adc is None:
        print("Skipped: MQ135 reading unavailable.")
        return

    try:

        if not ensure_connected():
            print("Skipped: WiFi not connected.")
            return

    except Exception as error:

        print(
            "WiFi check ERROR: {}".format(
                error
            )
        )

        logger.error(
            "WiFi check failed: {}".format(
                error
            )
        )

        return

    try:

        temperature, humidity = dht22_reading

        result = upload_environment(
            temperature,
            humidity,
            mq135_raw_adc
        )

        if result is not None and result.get("success"):

            print("Environment Upload: Success")

        else:

            print("Environment Upload: Failed")

    except Exception as error:

        print(
            "Environment Upload ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Environment upload failed: {}".format(
                error
            )
        )


def _upload_feed_levels(ultrasonic_levels):
    """
    Upload both feed-container ultrasonic readings.

    The API requires both container values.

    If one ultrasonic sensor failed, the readings are still displayed,
    but the paired upload is skipped for that cycle.
    """

    print("[FEED LEVELS UPLOAD]")

    if "container_1" not in ultrasonic_levels:
        print("Skipped: Container 1 reading unavailable.")
        return

    if "container_2" not in ultrasonic_levels:
        print("Skipped: Container 2 reading unavailable.")
        return

    try:

        if not ensure_connected():
            print("Skipped: WiFi not connected.")
            return

    except Exception as error:

        print(
            "WiFi check ERROR: {}".format(
                error
            )
        )

        logger.error(
            "WiFi check failed: {}".format(
                error
            )
        )

        return

    try:

        result = upload_feed_levels(
            config.DEVICE_CODE,
            ultrasonic_levels["container_1"],
            ultrasonic_levels["container_2"]
        )

        if result is not None and result.get("success"):

            print("Feed Levels Upload: Success")

        else:

            print("Feed Levels Upload: Failed")

    except Exception as error:

        print(
            "Feed Levels Upload ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Feed levels upload failed: {}".format(
                error
            )
        )


def _upload_water_usage(water_liters):
    """
    Upload positive incremental water consumption.

    A 0.0 L reading is displayed but is not uploaded.
    """

    print("[WATER USAGE UPLOAD]")

    if water_liters is None:

        print(
            "Skipped: Water flow reading unavailable."
        )

        return

    if water_liters <= 0:

        print(
            "Skipped: 0.00 L consumption."
        )

        return

    try:

        if not ensure_connected():
            print("Skipped: WiFi not connected.")
            return

    except Exception as error:

        print(
            "WiFi check ERROR: {}".format(
                error
            )
        )

        logger.error(
            "WiFi check failed: {}".format(
                error
            )
        )

        return

    try:

        result = upload_water_usage(
            water_liters
        )

        if result is not None and result.get("success"):

            print(
                "Water Usage Upload: Success"
            )

        else:

            print(
                "Water Usage Upload: Failed"
            )

    except Exception as error:

        print(
            "Water Usage Upload ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Water usage upload failed: {}".format(
                error
            )
        )


# --------------------------------------------------------------------------
# MANUAL OVERRIDE
# --------------------------------------------------------------------------

def _check_manual_override():
    """
    Check the backend for a manual feeding or sanitation command.

    The existing manual_override_controller is responsible for:

        manual_feeding
            -> feed_cycle()
            -> MG996R #1 + MG996R #2

        manual_sanitation
            -> sweep()
            -> MG90S #1 + MG90S #2

    The manual override controller also resets the command after
    the movement completes.

    This function only calls the existing controller and isolates
    any unexpected failure.
    """

    print("[MANUAL OVERRIDE]")

    try:

        result = (
            manual_override_controller
            .check_manual_override()
        )

        if result == "feeding":

            print(
                "Manual Feeding: MG996R pair completed."
            )

        elif result == "sanitation":

            print(
                "Manual Sanitation: MG90S pair completed."
            )

        else:

            print(
                "No manual override pending."
            )

    except Exception as error:

        print(
            "Manual Override ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Manual override check failed: {}".format(
                error
            )
        )


# --------------------------------------------------------------------------
# SCHEDULED FEEDING
# --------------------------------------------------------------------------

def _check_scheduled_feeding():
    """
    Check the backend for a pending scheduled feeding.

    The separate scheduled_feeding_controller is responsible for:

        pending
            -> running
            -> feed_cycle()
            -> completed / failed

    This does NOT modify the manual override controller.
    """

    print("[SCHEDULED FEEDING]")

    try:

        result = (
            scheduled_feeding_controller
            .check_scheduled_feeding()
        )

        if result:

            print(
                "Scheduled Feeding: "
                "MG996R pair completed."
            )

        else:

            print(
                "No scheduled feeding pending."
            )

    except Exception as error:

        print(
            "Scheduled Feeding ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Scheduled feeding check failed: {}".format(
                error
            )
        )


# --------------------------------------------------------------------------
# SCHEDULED SANITATION
# --------------------------------------------------------------------------

def _check_scheduled_sanitation():
    """
    Check the backend for a pending scheduled sanitation.

    The separate scheduled_sanitation_controller is responsible for:

        pending
            -> running
            -> sanitation sweep
            -> completed / failed

    This does NOT modify the manual override controller.
    """

    print("[SCHEDULED SANITATION]")

    try:

        result = (
            scheduled_sanitation_controller
            .check_scheduled_sanitation()
        )

        if result:

            print(
                "Scheduled Sanitation: "
                "MG90S pair completed."
            )

        else:

            print(
                "No scheduled sanitation pending."
            )

    except Exception as error:

        print(
            "Scheduled Sanitation ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Scheduled sanitation check failed: {}".format(
                error
            )
        )


# --------------------------------------------------------------------------
# WIFI
# --------------------------------------------------------------------------

def _connect_wifi_at_startup():
    """
    Attempt the initial WiFi connection.

    A failed connection does NOT stop the program.
    The main loop continues and later calls to ensure_connected()
    will attempt reconnection.
    """

    print("[WIFI]")

    try:

        connected = connect_wifi()

        if connected:

            print("WiFi connected.")

        else:

            print(
                "WiFi connection failed."
            )

            print(
                "The system will continue and retry later."
            )

    except Exception as error:

        print(
            "WiFi ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Startup WiFi connection failed: {}".format(
                error
            )
        )


# --------------------------------------------------------------------------
# MAIN
# --------------------------------------------------------------------------

def main():

    print("")
    print("========================================")
    print("OINKMATE PRODUCTION SYSTEM")
    print("========================================")
    print("")

    # --------------------------------------------------------------
    # 1. Initial WiFi connection
    # --------------------------------------------------------------

    _connect_wifi_at_startup()

    print("")

    # --------------------------------------------------------------
    # 2. Initialize water flow sensor
    # --------------------------------------------------------------

    try:

        water_flow.initialize()

        print(
            "[WATER FLOW] Initialized successfully."
        )

    except Exception as error:

        print(
            "[WATER FLOW] Initialization ERROR: {}".format(
                error
            )
        )

        logger.error(
            "Water flow initialization failed: {}".format(
                error
            )
        )

    print("")

    # --------------------------------------------------------------
    # Timing
    # --------------------------------------------------------------

    last_sensor_cycle = 0
    last_manual_override_check = 0
    last_scheduled_feeding_check = 0
    last_scheduled_sanitation_check = 0

    # --------------------------------------------------------------
    # Continuous production loop
    # --------------------------------------------------------------

    while True:

        current_time = time.time()

        print("")
        print("========================================")
        print("OINKMATE SYSTEM CYCLE")
        print("========================================")
        print("")

        # ==========================================================
        # SENSOR CYCLE
        # ==========================================================

        if (
            current_time - last_sensor_cycle
            >= _SENSOR_INTERVAL_S
        ):

            # ------------------------------------------------------
            # DHT22
            # ------------------------------------------------------

            dht22_reading = _read_dht22()

            print("")

            # ------------------------------------------------------
            # MQ135
            # ------------------------------------------------------

            mq135_raw_adc = _read_mq135()

            print("")

            # ------------------------------------------------------
            # Ultrasonic sensors
            # ------------------------------------------------------

            ultrasonic_levels = (
                _read_ultrasonic_levels()
            )

            print("")

            # ------------------------------------------------------
            # Water flow
            # ------------------------------------------------------

            water_liters = _read_water_flow()

            print("")

            # ------------------------------------------------------
            # Upload environment
            # ------------------------------------------------------

            _upload_environment(
                dht22_reading,
                mq135_raw_adc
            )

            print("")

            # ------------------------------------------------------
            # Upload feed levels
            # ------------------------------------------------------

            _upload_feed_levels(
                ultrasonic_levels
            )

            print("")

            # ------------------------------------------------------
            # Upload water usage
            # ------------------------------------------------------

            _upload_water_usage(
                water_liters
            )

            print("")

            last_sensor_cycle = current_time

        # ==========================================================
        # MANUAL OVERRIDE CHECK
        # ==========================================================

        if (
            current_time - last_manual_override_check
            >= _MANUAL_OVERRIDE_INTERVAL_S
        ):

            _check_manual_override()

            print("")

            last_manual_override_check = current_time

        # ==========================================================
        # SCHEDULED FEEDING CHECK
        # ==========================================================

        if (
            current_time - last_scheduled_feeding_check
            >= _SCHEDULED_FEEDING_INTERVAL_S
        ):

            _check_scheduled_feeding()

            print("")

            last_scheduled_feeding_check = current_time

        # ==========================================================
        # SCHEDULED SANITATION CHECK
        # ==========================================================

        if (
            current_time - last_scheduled_sanitation_check
            >= _SCHEDULED_SANITATION_INTERVAL_S
        ):

            _check_scheduled_sanitation()

            print("")

            last_scheduled_sanitation_check = current_time

        # ==========================================================
        # SHORT SLEEP
        # ==========================================================

        # Small sleep keeps the loop responsive while avoiding
        # unnecessary CPU usage.

        time.sleep(1)


# --------------------------------------------------------------------------
# AUTO START
# --------------------------------------------------------------------------

if __name__ == "__main__":
    main()


