"""
MG996R DUAL SERVO CONTROLLER - OinkMate

Purpose:
    Controls the two MG996R feeding servos as ONE synchronized pair.

Hardware:
    MG996R #1 Signal -> GP10
    MG996R #2 Signal -> GP11
    VCC -> 5V
    GND -> GND

Both MG996R servos always perform the SAME movement at the SAME time.

Normal feeding cycle:
    CLOSED (45 degrees)
        ->
    OPEN (0 degrees)
        ->
    HOLD
        ->
    CLOSED (45 degrees)

MANUAL OVERRIDE:
    Manual feeding starts the same normal feeding cycle.

    IMPORTANT:
    The feeding cycle CANNOT be force-stopped while it is running.
    This keeps the servo movement smooth and uninterrupted.

This module does not connect to WiFi directly.
"""

import machine
import utime


# --------------------------------------------------------------------------
# CONFIGURATION
# --------------------------------------------------------------------------

_SERVO_1_PIN = 10
_SERVO_2_PIN = 11

_PWM_FREQ = 50

_MIN_PULSE_MS = 0.5
_MAX_PULSE_MS = 2.5

_MIN_ANGLE = 0
_MAX_ANGLE = 180

_CLOSED_ANGLE = 45
_OPEN_ANGLE = 0

_STEP_DEGREES = 2
_STEP_DELAY_MS = 20

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


# Both servos start logically at the same position.
_current_angle = _CLOSED_ANGLE


# --------------------------------------------------------------------------
# ANGLE -> PWM
# --------------------------------------------------------------------------

def _angle_to_duty_u16(angle):
    """
    Convert an angle to a 16-bit PWM duty value.

    The SAME PWM value is used for both MG996R servos.
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

    duty_fraction = pulse_ms / _PERIOD_MS

    duty_u16 = int(
        duty_fraction * 65535
    )

    return duty_u16


# --------------------------------------------------------------------------
# SYNCHRONIZED SERVO MOVEMENT
# --------------------------------------------------------------------------

def set_angle(angle):
    """
    Move BOTH MG996R servos to the same angle.

    GP10 -> MG996R #1
    GP11 -> MG996R #2
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
    step_degrees=_STEP_DEGREES,
    step_delay_ms=_STEP_DELAY_MS
):
    """
    Smoothly move BOTH MG996R servos together.

    No network calls or manual-override checks are performed
    during movement.

    This keeps the physical servo movement smooth and uninterrupted.
    """

    global _current_angle

    if target_angle > _current_angle:
        step = step_degrees

    else:
        step = -step_degrees

    angle = _current_angle

    while abs(target_angle - angle) > abs(step):

        angle += step

        # BOTH servos receive the same command.
        set_angle(angle)

        utime.sleep_ms(
            step_delay_ms
        )

    # Final exact position.
    set_angle(
        target_angle
    )


# --------------------------------------------------------------------------
# FEEDING MOVEMENTS
# --------------------------------------------------------------------------

def open_gate():
    """
    Open BOTH feeding gates smoothly.
    """

    _move_smooth(
        _OPEN_ANGLE
    )


def close_gate():
    """
    Close BOTH feeding gates smoothly.
    """

    _move_smooth(
        _CLOSED_ANGLE
    )


# --------------------------------------------------------------------------
# FEEDING CYCLE
# --------------------------------------------------------------------------

def feed_cycle(
    open_time=5
):
    """
    Execute one complete synchronized feeding cycle.

    Behavior:

        1. Close both gates.
        2. Smoothly open both gates.
        3. Hold open for open_time seconds.
        4. Smoothly close both gates.

    IMPORTANT:
        Once the cycle starts, it is allowed to finish normally.
        There is NO force-stop or network checking during movement.
    """

    # --------------------------------------------------------------
    # 1. Ensure BOTH gates start closed.
    # --------------------------------------------------------------

    close_gate()


    # --------------------------------------------------------------
    # 2. Open BOTH gates smoothly.
    # --------------------------------------------------------------

    open_gate()


    # --------------------------------------------------------------
    # 3. HOLD OPEN
    # --------------------------------------------------------------

    utime.sleep(
        open_time
    )


    # --------------------------------------------------------------
    # 4. Close BOTH gates smoothly.
    # --------------------------------------------------------------

    close_gate()


    return False


# --------------------------------------------------------------------------
# STANDALONE TEST
# --------------------------------------------------------------------------

if __name__ == "__main__":

    print(
        "Starting MG996R Dual Servo Feeding Test..."
    )

    feed_cycle()

    print(
        "MG996R Dual Servo Feeding Test Complete."
    )
