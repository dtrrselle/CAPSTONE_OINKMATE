"""
MG996R servo motor controller (feeding gate / stopper).

Hardware:
    Signal -> GP10 (PWM)
    VCC    -> VBUS (5V)
    GND    -> GND

Standard hobby servo control: 50 Hz PWM, pulse width ~0.5 ms (0 deg) to
~2.5 ms (180 deg). Angles are converted to a duty_u16 value for
machine.PWM using a linear mapping between the min/max pulse widths.

Unlike the MG90S sweep controller, this servo does not continuously
sweep. It performs a single feeding cycle: rotate smoothly from CLOSED
(0 degrees) to OPEN (90 degrees), hold briefly, then rotate smoothly
back to CLOSED.

This module is a standalone hardware controller only. It does not
connect to WiFi, call the API, or implement any scheduling/automation
logic.
"""

import machine
import utime

# --------------------------------------------------------------------------
# Configuration constants
# --------------------------------------------------------------------------
_SERVO_PIN = 10
_PWM_FREQ = 50  # Standard servo PWM frequency (Hz)

# Pulse width range for the MG996R, in milliseconds.
# These are typical values and may be fine-tuned per servo unit.
_MIN_PULSE_MS = 0.5   # corresponds to 0 degrees
_MAX_PULSE_MS = 2.5   # corresponds to 180 degrees

# Servo angle range
_MIN_ANGLE = 0
_MAX_ANGLE = 180

# Gate positions
_CLOSED_ANGLE = 0    # gate closed (starting position)
_OPEN_ANGLE = 90     # gate open

# Smooth-motion tuning
_STEP_DEGREES = 2       # angle increment per movement step (smoothness)
_STEP_DELAY_MS = 20     # delay between steps (ms)

_PERIOD_MS = 1000 / _PWM_FREQ  # PWM period in ms (20 ms at 50 Hz)

_pwm = machine.PWM(machine.Pin(_SERVO_PIN))
_pwm.freq(_PWM_FREQ)

# Tracks the servo's last known angle so movements start from the
# current position instead of jumping.
_current_angle = _CLOSED_ANGLE


def set_angle(angle):
    """
    Move the servo directly to the given angle (no smoothing) by
    converting it to a PWM duty cycle. Updates the tracked current
    angle.

    Args:
        angle (int or float): Target angle, clamped to [0, 180].
    """
    global _current_angle

    # Clamp angle to the valid servo range.
    if angle < _MIN_ANGLE:
        angle = _MIN_ANGLE
    elif angle > _MAX_ANGLE:
        angle = _MAX_ANGLE

    # Linear interpolation from angle -> pulse width (ms).
    pulse_ms = _MIN_PULSE_MS + (
        (angle - _MIN_ANGLE) / (_MAX_ANGLE - _MIN_ANGLE)
    ) * (_MAX_PULSE_MS - _MIN_PULSE_MS)

    # Convert pulse width -> duty cycle fraction of the PWM period.
    duty_fraction = pulse_ms / _PERIOD_MS

    # Convert duty fraction -> 16-bit duty value.
    duty_u16 = int(duty_fraction * 65535)

    _pwm.duty_u16(duty_u16)
    _current_angle = angle


def _move_smooth(target_angle, step_degrees=_STEP_DEGREES,
                  step_delay_ms=_STEP_DELAY_MS):
    """
    Gradually move the servo from its current angle to the target angle,
    in small increments, to avoid sudden/jerky motion.

    Args:
        target_angle (int or float): Angle to move to (0-180 degrees).
        step_degrees (int): Angle increment per step.
        step_delay_ms (int): Delay between steps, in milliseconds.
    """
    global _current_angle

    if target_angle > _current_angle:
        step = step_degrees
    else:
        step = -step_degrees

    angle = _current_angle
    # Move in increments until within one step of the target.
    while abs(target_angle - angle) > abs(step):
        angle += step
        set_angle(angle)
        utime.sleep_ms(step_delay_ms)

    # Final precise move to the exact target angle.
    set_angle(target_angle)


def open_gate():
    """Rotate smoothly from CLOSED to OPEN (90 degrees)."""
    _move_smooth(_OPEN_ANGLE)


def close_gate():
    """Rotate smoothly back from OPEN to CLOSED (0 degrees)."""
    _move_smooth(_CLOSED_ANGLE)


def feed_cycle(open_time=5):
    """
    Execute one complete feeding cycle:

        Close position -> Open gate (90 deg) -> Hold open for
        `open_time` seconds -> Close gate -> Stop.

    This runs only once per call; it does not loop or sweep
    continuously.

    Args:
        open_time (int or float): How long to hold the gate open, in
            seconds. Defaults to 5 seconds.
    """
    # Ensure the gate starts from the closed position.
    close_gate()

    # Open the gate to release feed.
    open_gate()

    # Hold open for the specified duration.
    utime.sleep(open_time)

    # Close the gate to stop feeding.
    close_gate()


if __name__ == "__main__":
    print("Starting MG996R Feeding Test...")
    feed_cycle()
    print("Feeding Cycle Complete.")
