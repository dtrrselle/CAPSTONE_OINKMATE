"""
MQ135 gas sensor driver (raw analog readings only).

Hardware:
    AO   -> GP26 (ADC0), via a voltage divider (sensor runs on 5V/VBUS,
            the divider brings the signal into the Pico's safe 0-3.3V range)
    VCC  -> VBUS (5V)
    GND  -> GND

Ammonia ppm estimation is intentionally NOT implemented yet; this module
only exposes stable raw ADC and voltage readings.
"""

import machine

_ADC_PIN = 26
_ADC_MAX = 65535      # 16-bit resolution returned by ADC.read_u16()
_ADC_REF_VOLTAGE = 3.3  # Pico ADC reference voltage

_adc = machine.ADC(machine.Pin(_ADC_PIN))


def read():
    """
    Read the raw ADC value and corresponding voltage from the MQ135 sensor.

    Returns:
        tuple: (raw_adc, voltage) where raw_adc is an int (0-65535) and
               voltage is a float in volts, as measured at GP26 (i.e. after
               the voltage divider).

    Raises:
        RuntimeError: if the ADC cannot be read.
    """
    try:
        raw_adc = _adc.read_u16()
    except Exception as error:
        raise RuntimeError("MQ135 ADC read failed: {}".format(error))

    voltage = (raw_adc / _ADC_MAX) * _ADC_REF_VOLTAGE

    return raw_adc, voltage


if __name__ == "__main__":
    import utime

    while True:
        try:
            adc_value, adc_voltage = read()
            print("Raw ADC: {}, Voltage: {:.3f} V".format(adc_value, adc_voltage))
        except RuntimeError as error:
            print(error)
        utime.sleep(1)