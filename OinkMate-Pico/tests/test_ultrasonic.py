"""
Standalone hardware test for the TWO JSN-SR04T ultrasonic sensors.

Ultrasonic 1:
    Trigger -> GP3
    Echo    -> GP4

Ultrasonic 2:
    Trigger -> GP5
    Echo    -> GP6

GP7/GP8 is NO LONGER used by an ultrasonic sensor.
GP8 is dedicated to the YF-S201 water flow sensor.

The two ultrasonic sensors are tested independently.
If one sensor fails, the other sensor will still be tested.
"""

import utime

from sensors.ultrasonic import read


# --------------------------------------------------------------------------
# ULTRASONIC SENSOR CONFIGURATION
# --------------------------------------------------------------------------

_SENSORS = (
    ("Container 1", 3, 4),
    ("Container 2", 5, 6),
)


# --------------------------------------------------------------------------
# TEST LOOP
# --------------------------------------------------------------------------

print("")
print("========================================")
print("OINKMATE ULTRASONIC SENSOR TEST")
print("========================================")
print("")
print("Container 1 -> Trigger GP3 / Echo GP4")
print("Container 2 -> Trigger GP5 / Echo GP6")
print("GP8 -> YF-S201 Water Flow Sensor")
print("")
print("Starting ultrasonic test...")
print("")


while True:

    for label, trigger_pin, echo_pin in _SENSORS:

        try:

            distance = read(
                trigger_pin,
                echo_pin
            )

            print(
                "{} : {:.1f} cm".format(
                    label,
                    distance
                )
            )

        except Exception as error:

            print(
                "{} : Error - {}".format(
                    label,
                    error
                )
            )

    print("--------------------------------")

    utime.sleep(1)