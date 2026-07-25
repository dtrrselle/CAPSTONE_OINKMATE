"""
JSN-SR04T ultrasonic distance sensor driver.

Reusable for any number of sensors by passing the trigger/echo GPIO pair:

    read(3, 4)  # sensor 1
    read(5, 6)  # sensor 2
    read(7, 8)  # sensor 3
"""

import machine
import utime

_SOUND_SPEED_CM_PER_US = 0.0343 / 2  # round trip -> divide by 2
_TRIGGER_PULSE_US = 10
_ECHO_TIMEOUT_US = 30000  # ~5 m max range for JSN-SR04T, with margin


def read(trigger_pin, echo_pin):
    """
    Measure distance using a JSN-SR04T ultrasonic sensor.

    Args:
        trigger_pin (int): GPIO number connected to TRIG.
        echo_pin (int): GPIO number connected to ECHO.

    Returns:
        float: distance in centimeters.

    Raises:
        RuntimeError: if the echo pulse is not received in time (no echo,
            wiring issue, or object out of range).
    """
    trigger = machine.Pin(trigger_pin, machine.Pin.OUT)
    echo = machine.Pin(echo_pin, machine.Pin.IN)

    trigger.low()
    utime.sleep_us(2)
    trigger.high()
    utime.sleep_us(_TRIGGER_PULSE_US)
    trigger.low()

    try:
        pulse_duration_us = machine.time_pulse_us(echo, 1, _ECHO_TIMEOUT_US)
    except Exception as error:
        raise RuntimeError(
            "Ultrasonic read failed (trig={}, echo={}): {}".format(
                trigger_pin, echo_pin, error
            )
        )

    if pulse_duration_us < 0:
        raise RuntimeError(
            "Ultrasonic sensor timeout (trig={}, echo={}): no echo received".format(
                trigger_pin, echo_pin
            )
        )

    distance_cm = pulse_duration_us * _SOUND_SPEED_CM_PER_US

    return distance_cm


if __name__ == "__main__":
    while True:
        try:
            distance = read(3, 4)
            print("Distance: {:.1f} cm".format(distance))
        except RuntimeError as error:
            print(error)
        utime.sleep(1)