"""
Continuously prints incremental water consumption
from the YF-S201 water flow sensor every second.
"""

import utime

from sensors.water_flow import initialize, read_incremental_liters


initialize()

print("YF-S201 Water Flow Test")
print("Flow sensor initialized.")
print("--------------------------------")

while True:
    try:
        liters = read_incremental_liters()

        print("Water consumed : {:.4f} L".format(liters))
        print("--------------------------------")

    except RuntimeError as error:
        print("Water Flow Error: {}".format(error))
        print("--------------------------------")

    utime.sleep(1)