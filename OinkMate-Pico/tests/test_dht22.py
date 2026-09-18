"""
Continuously prints DHT22 temperature and humidity readings every 2 seconds.
"""

import utime

from sensors.dht22 import read

while True:
    try:
        temperature, humidity = read()
        print("Temperature : {:.1f} \u00b0C".format(temperature))
        print("Humidity    : {:.0f} %".format(humidity))
        print("--------------------------------")
    except RuntimeError as error:
        print("Error: {}".format(error))

    utime.sleep(2)