"""
Continuously prints distance readings from all three JSN-SR04T sensors
every second.
"""

import utime

from sensors.ultrasonic import read

_SENSORS = (
    ("Container 1", 3, 4),
    ("Container 2", 5, 6),
    ("Container 3", 7, 8),
)

while True:
    for label, trigger_pin, echo_pin in _SENSORS:
        try:
            distance = read(trigger_pin, echo_pin)
            print("{} : {:.1f} cm".format(label, distance))
        except RuntimeError as error:
            print("{} : Error - {}".format(label, error))

    print("--------------------------------")
    utime.sleep(1)