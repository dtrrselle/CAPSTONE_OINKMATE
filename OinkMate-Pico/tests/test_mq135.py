"""
Continuously prints MQ135 raw ADC value and voltage every second.
"""

import utime

from sensors.mq135 import read

while True:
    try:
        raw_adc, voltage = read()
        print("Raw ADC : {}".format(raw_adc))
        print("Voltage : {:.3f} V".format(voltage))
        print("--------------------------------")
    except RuntimeError as error:
        print("Error: {}".format(error))

    utime.sleep(1)