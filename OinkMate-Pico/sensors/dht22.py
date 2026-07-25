"""
DHT22 temperature and humidity sensor driver.

Hardware:
    DATA -> GP2
    VCC  -> 3V3
    GND  -> GND
"""

import dht
import machine
import utime

_DATA_PIN = 2

_sensor = dht.DHT22(machine.Pin(_DATA_PIN))


def read():
    """
    Read temperature and humidity from the DHT22 sensor.

    Returns:
        tuple: (temperature_celsius, humidity_percent) as floats.

    Raises:
        RuntimeError: if the sensor cannot be read (timing/wiring issue).
    """
    try:
        _sensor.measure()
    except Exception as error:
        raise RuntimeError("DHT22 read failed: {}".format(error))

    temperature = _sensor.temperature()
    humidity = _sensor.humidity()

    if temperature is None or humidity is None:
        raise RuntimeError("DHT22 returned no data")

    return temperature, humidity


if __name__ == "__main__":
    while True:
        try:
            t, h = read()
            print("Temperature: {:.1f} C, Humidity: {:.1f} %".format(t, h))
        except RuntimeError as error:
            print(error)
        utime.sleep(2)