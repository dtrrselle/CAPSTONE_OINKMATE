"""
MG90S DUAL SERVO CONTROLLER - OinkMate

Purpose:
    Controls the two MG90S sanitation servos as ONE synchronized pair.

Hardware:
    MG90S #1 Signal -> GP13
    MG90S #2 Signal -> GP14
    VCC -> 5V
    GND -> GND

Both MG90S servos always perform the SAME movement at the SAME time.

Normal sweep:
    LEFT
        ->
    RIGHT
        ->
    LEFT
        ->
    ...
        ->
    CENTER

Default sweep duration:
    5 seconds

ADDED MANUAL-OVERRIDE FEATURE:
    sweep() may optionally receive a stop_check callback.

    If stop_check is NOT supplied:
        The original sweep behavior is unchanged.

    If stop_check IS supplied:
        The sweep periodically checks whether the user has
        turned manual sanitation OFF.

        If STOP is detected:
            Both servos safely return to CENTER,
            then the cycle ends.

This module does not connect to WiFi directly.
"""

import machine
import utime


# --------------------------------------------------------------------------
# CONFIGURATION
# --------------------------------------------------------------------------

_SERVO_1_PIN = 13
_SERVO_2_PIN = 14

_PWM_FREQ = 50

_MIN_PULSE_MS = 0.5
_MAX_PULSE_MS = 2.5

_MIN_ANGLE = 0
_MAX_ANGLE = 180

_CENTER_ANGLE = 90

_SWEEP_STEP_DEGREES = 2
_SWEEP_STEP_DELAY_MS = 50

_PERIOD_MS = 1000 / _PWM_FREQ


# --------------------------------------------------------------------------
# PWM INITIALIZATION
# --------------------------------------------------------------------------

_pwm_1 = machine.PWM(
    machine.Pin(_SERVO_1_PIN)
)

_pwm_2 = machine.PWM(
    machine.Pin(_SERVO_2_PIN)
)

_pwm_1.freq(_PWM_FREQ)
_pwm_2.freq(_PWM_FREQ)


# Both servos start logically at center.
_current_angle = _CENTER_ANGLE


# --------------------------------------------------------------------------
# ANGLE -> PWM
# --------------------------------------------------------------------------

def _angle_to_duty_u16(angle):
    """
    Convert an angle to a 16-bit PWM duty value.

    The SAME PWM value is used for both MG90S servos.
    """

    if angle < _MIN_ANGLE:
        angle = _MIN_ANGLE

    elif angle > _MAX_ANGLE:
        angle = _MAX_ANGLE

    pulse_ms = _MIN_PULSE_MS + (
        (angle - _MIN_ANGLE)
        / (_MAX_ANGLE - _MIN_ANGLE)
    ) * (
        _MAX_PULSE_MS - _MIN_PULSE_MS
    )

    duty_fraction = (
        pulse_ms / _PERIOD_MS
    )

    duty_u16 = int(
        duty_fraction * 65535
    )

    return duty_u16


# --------------------------------------------------------------------------
# SYNCHRONIZED SERVO MOVEMENT
# --------------------------------------------------------------------------

def _set_angle(angle):
    """
    Move BOTH MG90S servos to the same angle.

    GP13 -> MG90S #1
    GP14 -> MG90S #2
    """

    global _current_angle

    duty_u16 = _angle_to_duty_u16(
        angle
    )

    _pwm_1.duty_u16(
        duty_u16
    )

    _pwm_2.duty_u16(
        duty_u16
    )

    _current_angle = angle


def _move_smooth(
    target_angle,
    step_degrees=_SWEEP_STEP_DEGREES,
    step_delay_ms=_SWEEP_STEP_DELAY_MS,
    stop_check=None
):
    """
    Smoothly move BOTH MG90S servos together.

    Existing behavior is preserved when stop_check is None.

    If stop_check is supplied, it is checked between movement steps.

    Returns:
        True  -> movement was stopped by manual override.
        False -> target was reached normally.
    """

    global _current_angle

    if target_angle > _current_angle:
        step = step_degrees

    else:
        step = -step_degrees

    angle = _current_angle

    while abs(target_angle - angle) > abs(step):

        # Optional STOP check.
        if stop_check is not None:

            try:

                if stop_check():
                    return True

            except Exception:

                # A failed stop check must never break
                # the servo movement.
                pass

        angle += step

        # SAME command to BOTH servos.
        _set_angle(angle)

        utime.sleep_ms(
            step_delay_ms
        )

    # Final exact position.
    _set_angle(
        target_angle
    )

    return False


# --------------------------------------------------------------------------
# NORMAL MOVEMENT FUNCTIONS
# --------------------------------------------------------------------------

def move_left():
    """
    Move BOTH sanitation servos to LEFT.
    """

    _move_smooth(
        _MIN_ANGLE
    )


def move_center():
    """
    Move BOTH sanitation servos to CENTER.
    """

    _move_smooth(
        _CENTER_ANGLE
    )


def move_right():
    """
    Move BOTH sanitation servos to RIGHT.
    """

    _move_smooth(
        _MAX_ANGLE
    )


# --------------------------------------------------------------------------
# SANITATION SWEEP
# --------------------------------------------------------------------------

def sweep(
    duration=5,
    stop_check=None
):
    """
    Sweep BOTH MG90S servos left <-> right.

    NORMAL CALL:
        sweep()

        Existing behavior is preserved.

    MANUAL OVERRIDE CALL:
        sweep(stop_check=...)

        Same movement pattern, but the active manual sanitation
        state is checked while the sweep is running.

        If STOP is detected:
            - BOTH servos return to CENTER.
            - The cycle ends.
            - Returns True.

    Returns:
        True  -> manually stopped.
        False -> completed normally.
    """

    start_time_ms = utime.ticks_ms()

    duration_ms = int(
        duration * 1000
    )


    # --------------------------------------------------------------
    # Start from LEFT.
    # --------------------------------------------------------------

    stopped = _move_smooth(
        _MIN_ANGLE,
        stop_check=stop_check
    )

    if stopped:

        _move_smooth(
            _CENTER_ANGLE
        )

        return True


    going_right = True


    # --------------------------------------------------------------
    # Main sweep
    # --------------------------------------------------------------

    while (
        utime.ticks_diff(
            utime.ticks_ms(),
            start_time_ms
        ) < duration_ms
    ):

        if going_right:

            stopped = _move_smooth(
                _MAX_ANGLE,
                stop_check=stop_check
            )

        else:

            stopped = _move_smooth(
                _MIN_ANGLE,
                stop_check=stop_check
            )


        # ----------------------------------------------------------
        # Manual STOP detected.
        # ----------------------------------------------------------

        if stopped:

            # SAFETY:
            # Always return BOTH servos to CENTER.
            _move_smooth(
                _CENTER_ANGLE
            )

            return True


        going_right = not going_right


    # --------------------------------------------------------------
    # Normal completion.
    # --------------------------------------------------------------

    _move_smooth(
        _CENTER_ANGLE
    )

    return False


# --------------------------------------------------------------------------
# STANDALONE TEST
# --------------------------------------------------------------------------

if __name__ == "__main__":

    print(
        "Starting MG90S Dual Servo Sweep Test..."
    )

    # No stop_check supplied.
    # Therefore this behaves exactly like the existing test.
    sweep()

    print(
        "MG90S Dual Servo Sweep Test Complete."
    )

