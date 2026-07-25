"""
Standalone hardware test for the MG90S servo (sanitation hose nozzle).

Verifies smooth left-right sweeping motion only. Does not connect to
WiFi, call the API, or implement any scheduling/automation logic.
"""

from controllers.servo_mg90s import sweep

print("Starting MG90S Sweep Test...")
sweep()
print("Sweep Test Complete.")
