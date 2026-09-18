"""
MG90S servo motor controller (sanitation hose nozzle).

Hardware:
    Signal -> GP13 (PWM)
    VCC    -> VBUS (5V)
    GND    -> GND

Standard hobby servo control: 50 Hz PWM, pulse width ~0.5 ms (0 deg) to
~2.5 ms (180 deg). Angles are converted to a duty_u16 value for
machine.PWM using a linear mapping between the min/max pulse widths.

This module is a standalone hardware controller only. It does not connect
to WiFi, call the API, or implement any scheduling/automation logic.
"""

import machine
import utime

# --------------------------------------------------------------------------
# Configuration constants
# --------------------------------------------------------------------------
_SERVO_PIN = 13
_PWM_FREQ = 50  # Standard servo PWM frequency (Hz)

# Pulse width range for the MG90S, in milliseconds.
# These are typical values and may be fine-tuned per servo unit.
_MIN_PULSE_MS = 0.5   # corresponds to 0 degrees
_MAX_PULSE_MS = 2.5   # corresponds to 180 degrees

# Servo angle range
_MIN_ANGLE = 0
_MAX_ANGLE = 180
_CENTER_ANGLE = 90

# Sweep motion tuning
_SWEEP_STEP_DEGREES = 2      # angle increment per movement step (smoothness)
_SWEEP_STEP_DELAY_MS = 50    # delay between steps (ms)

_PERIOD_MS = 1000 / _PWM_FREQ  # PWM period in ms (20 ms at 50 Hz)

_pwm = machine.PWM(machine.Pin(_SERVO_PIN))
_pwm.freq(_PWM_FREQ)

# Tracks the servo's last known angle so movements (e.g. sweep) can move
# gradually from the current position instead of jumping.
_current_angle = _CENTER_ANGLE


def _angle_to_duty_u16(angle):
    """
    Convert a servo angle (0-180 degrees) to a 16-bit PWM duty value.

    Args:
        angle (int or float): Target angle, clamped to [0, 180].

    Returns:
        int: duty_u16 value (0-65535) for machine.PWM.
    """
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

    return duty_u16


def _set_angle(angle):
    """
    Move the servo directly to the given angle (no smoothing) and update
    the tracked current angle.

    Args:
        angle (int or float): Target angle (0-180 degrees).
    """
    global _current_angle

    duty_u16 = _angle_to_duty_u16(angle)
    _pwm.duty_u16(duty_u16)
    _current_angle = angle


def _move_smooth(target_angle, step_degrees=_SWEEP_STEP_DEGREES,
                  step_delay_ms=_SWEEP_STEP_DELAY_MS):
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
        _set_angle(angle)
        utime.sleep_ms(step_delay_ms)

    # Final precise move to the exact target angle.
    _set_angle(target_angle)


def move_left():
    """Move the servo to 0 degrees (left)."""
    _move_smooth(_MIN_ANGLE)


def move_center():
    """Move the servo to 90 degrees (center)."""
    _move_smooth(_CENTER_ANGLE)


def move_right():
    """Move the servo to 180 degrees (right)."""
    _move_smooth(_MAX_ANGLE)


def sweep(duration=5):
    """
    Continuously sweep the servo left <-> right for the given duration,
    moving smoothly in small angle increments. Returns the servo to
    center (90 degrees) once finished.

    Args:
        duration (int or float): Approximate total sweep duration, in
            seconds. Defaults to 5 seconds.
    """
    start_time_ms = utime.ticks_ms()
    duration_ms = int(duration * 1000)

    # Start from the left.
    move_left()

    going_right = True
    while utime.ticks_diff(utime.ticks_ms(), start_time_ms) < duration_ms:
        if going_right:
            move_right()
        else:
            move_left()
        going_right = not going_right

    # Always finish centered.
    move_center()


if __name__ == "__main__":
    print("Starting MG90S Sweep Test...")
    sweep()
    print("Sweep Test Complete.")
