"""
Standalone hardware test for the MG996R servo (feeding gate).

Verifies a single feeding cycle (close -> open -> hold -> close) only.
Does not connect to WiFi, call the API, or integrate with schedules or
sensors.
"""

from controllers.servo_mg996r import feed_cycle

print("Starting MG996R Feeding Test...")
feed_cycle()
print("Feeding Cycle Complete.")
