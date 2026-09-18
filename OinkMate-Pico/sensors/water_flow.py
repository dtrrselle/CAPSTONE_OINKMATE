# sensors/water_flow.py
#
# Purpose:
# Reads the YF-S201 water flow sensor (signal on GP8) via an
# interrupt-driven pulse counter and reports the amount of water
# consumed, in liters, since the previous read_incremental_liters()
# call - i.e. an INCREMENTAL value, not a running total.
#
# This module is a sensor-reading module ONLY. It does not send HTTP
# requests, does not know about api_client.py, farmer IDs, device
# codes, or expense calculations - main.py is responsible for taking
# the incremental liters returned here and uploading them.
#
# Hardware:
#   YF-S201 signal   -> GP7 (previously used by Ultrasonic 3, now
#                        removed - GP8 is dedicated to this sensor)
#   YF-S201 positive -> 5V rail
#   YF-S201 negative -> GND rail

from machine import Pin, disable_irq, enable_irq

_SIGNAL_PIN = 7

# YF-S201 pulse-to-volume calibration constant.
#
# The commonly cited YF-S201 characteristic is:
#   frequency (Hz) = 7.5 * flow_rate (L/min)
# which works out to 450 pulses per liter. This is a manufacturer
# datasheet approximation, NOT a value calibrated against this
# project's actual sensor/plumbing - treat it as a starting point and
# adjust this single constant after real-world calibration (e.g.
# comparing pulse counts against a known measured volume).
_PULSES_PER_LITER = 450

_pulse_count = 0
_flow_pin = None


def _on_pulse(pin):
    # Interrupt handler: must stay extremely lightweight - no HTTP,
    # no logging, no long calculations, no sleeps. Just increment.
    global _pulse_count
    _pulse_count += 1


def initialize():
    """
    Set up GP8 as the YF-S201 pulse input and attach the rising-edge
    interrupt that counts pulses. Safe to call more than once - later
    calls are a no-op if already initialized.

    Raises:
        RuntimeError: if the pin/interrupt could not be configured.
    """
    global _flow_pin

    if _flow_pin is not None:
        return

    try:
        _flow_pin = Pin(_SIGNAL_PIN, Pin.IN, Pin.PULL_UP)
        _flow_pin.irq(trigger=Pin.IRQ_RISING, handler=_on_pulse)
    except Exception as error:
        _flow_pin = None
        raise RuntimeError("Water flow sensor init failed: {}".format(error))


def read_incremental_liters():
    """
    Return the amount of water, in liters, consumed since the
    previous call to this function - an incremental reading, not a
    running total. Returns 0.0 if no pulses were detected during the
    period (never invents consumption).

    The pulse counter is read and reset atomically (interrupts briefly
    disabled for that single operation only) to avoid a race with the
    interrupt handler incrementing it mid-read.

    Raises:
        RuntimeError: if the sensor has not been initialized yet, or
        the counter could not be read safely. Callers should catch
        this the same way they catch other sensor read failures.
    """
    global _pulse_count

    if _flow_pin is None:
        raise RuntimeError("Water flow sensor read before initialize().")

    try:
        state = disable_irq()
        try:
            pulses = _pulse_count
            _pulse_count = 0
        finally:
            enable_irq(state)
    except Exception as error:
        raise RuntimeError("Water flow sensor read failed: {}".format(error))

    if pulses <= 0:
        return 0.0

    return pulses / _PULSES_PER_LITER
