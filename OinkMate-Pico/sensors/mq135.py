"""
MQ135 gas sensor driver (raw ADC + rule-based ammonia level classification).

Hardware:
    AO   -> GP26 (ADC0), via a voltage divider (sensor runs on 5V/VBUS,
            the divider brings the signal into the Pico's safe 0-3.3V range)
    VCC  -> VBUS (5V)
    GND  -> GND

This is a prototype. No real ammonia ppm estimation or lab calibration is
performed. The sensor's raw ADC reading is instead compared against
configurable thresholds to classify the ammonia level into LOW, MEDIUM,
or HIGH. These thresholds are placeholders and are meant to be tuned
later once the sensor is calibrated against known conditions.
"""

import machine

_ADC_PIN = 26

# --------------------------------------------------------------------------
# Ammonia level thresholds (raw ADC, 0-65535 range from ADC.read_u16()).
#
# Rule:
#   raw_adc <  LOW_THRESHOLD                        -> "LOW"
#   LOW_THRESHOLD <= raw_adc < MEDIUM_THRESHOLD      -> "MEDIUM"
#   raw_adc >= MEDIUM_THRESHOLD                      -> "HIGH"
#
# HIGH_THRESHOLD is kept for readability/documentation purposes and to make
# future 3-way or 4-way threshold changes easy to extend without touching
# the classification logic below.
#
# These are placeholder values only. Adjust after real sensor calibration.
# --------------------------------------------------------------------------
LOW_THRESHOLD = 10000
MEDIUM_THRESHOLD = 30000
HIGH_THRESHOLD = 65535

_adc = machine.ADC(machine.Pin(_ADC_PIN))


def classify_ammonia(raw_adc):
    """
    Classify a raw ADC reading into an ammonia risk level.

    Args:
        raw_adc (int): Raw ADC value (0-65535).

    Returns:
        str: "LOW", "MEDIUM", or "HIGH".
    """
    if raw_adc < LOW_THRESHOLD:
        return "LOW"
    elif raw_adc < MEDIUM_THRESHOLD:
        return "MEDIUM"
    else:
        return "HIGH"


def read():
    """
    Read the raw ADC value from the MQ135 sensor and classify the
    corresponding ammonia level.

    Returns:
        tuple: (raw_adc, ammonia_level) where raw_adc is an int (0-65535)
               and ammonia_level is a str: "LOW", "MEDIUM", or "HIGH".

    Raises:
        RuntimeError: if the ADC cannot be read.
    """
    try:
        raw_adc = _adc.read_u16()
    except Exception as error:
        raise RuntimeError("MQ135 ADC read failed: {}".format(error))

    ammonia_level = classify_ammonia(raw_adc)

    return raw_adc, ammonia_level


if __name__ == "__main__":
    import utime

    while True:
        try:
            adc_value, level = read()
            print("Raw ADC: {}, Ammonia Level: {}".format(adc_value, level))
        except RuntimeError as error:
            print(error)
        utime.sleep(1)
