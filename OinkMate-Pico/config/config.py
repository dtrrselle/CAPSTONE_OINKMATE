# config/config.py
#
# Purpose:
# Single source of truth for every configurable value used across the
# project (WiFi credentials, API endpoints, device identity, timing).
# No logic lives here - only constants. Other modules import from this
# file instead of hardcoding values, so changing an environment (e.g.
# switching from a test network to a farm network) only requires
# editing this one file.

# ---------------------------------------------------------------------------
# WiFi Settings
# ---------------------------------------------------------------------------
WIFI_SSID = "HEART"
WIFI_PASSWORD = "Twobrothers1999"

# Max seconds to wait for a WiFi connection attempt before giving up
WIFI_CONNECT_TIMEOUT = 15

# ---------------------------------------------------------------------------
# Backend API Settings
# ---------------------------------------------------------------------------
# Base URL of the PHP backend (no trailing slash)
API_BASE_URL = "https://unmotivated-marietta-unbuffered.ngrok-free.dev/oinkmate-api/api"

# Specific endpoint paths (appended to API_BASE_URL)
ENVIRONMENT_UPLOAD_ENDPOINT = "/iot/environment/upload_environment.php"
FEED_LEVELS_UPLOAD_ENDPOINT = "/iot/feeding/upload_feed_levels.php"

# How long (seconds) to wait for a response from the server
HTTP_TIMEOUT = 10

# ---------------------------------------------------------------------------
# Device Identity
# ---------------------------------------------------------------------------
# Unique code identifying this Pico / OINKMATE unit to the backend
DEVICE_CODE = "OINKMATE-001"

# ---------------------------------------------------------------------------
# Timing
# ---------------------------------------------------------------------------
# How often (seconds) the main loop should perform an upload cycle
UPLOAD_INTERVAL = 60