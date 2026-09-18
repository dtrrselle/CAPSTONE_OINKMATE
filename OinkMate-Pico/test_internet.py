import network
import socket
import time

print("=== PICO NETWORK TEST ===")

wlan = network.WLAN(network.STA_IF)

print("Connected:", wlan.isconnected())

if wlan.isconnected():
    print("IP:", wlan.ifconfig()[0])
    print("Subnet:", wlan.ifconfig()[1])
    print("Gateway:", wlan.ifconfig()[2])
    print("DNS:", wlan.ifconfig()[3])

print("\n[1] DNS TEST")
try:
    result = socket.getaddrinfo("oinkmate.online", 443)
    print("DNS SUCCESS")
    print(result[0])
except Exception as e:
    print("DNS FAILED:", e)

print("\n[2] PORT 443 TEST")
try:
    addr = socket.getaddrinfo("oinkmate.online", 443)[0][-1]
    print("Server address:", addr)

    s = socket.socket()
    s.settimeout(10)
    s.connect(addr)

    print("TCP 443 CONNECTION SUCCESS")

    s.close()

except Exception as e:
    print("TCP 443 FAILED:", e)

print("\n=== TEST COMPLETE ===")