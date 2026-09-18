from machine import Pin
import time

relay = Pin(16, Pin.OUT)

print("Relay test starting...")

while True:
    relay.value(0)
    print("GP16 = 0")
    time.sleep(3)

    relay.value(1)
    print("GP16 = 1")
    time.sleep(3)