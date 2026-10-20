// ACCESS-EASE Reader Configuration
// Copy this file to config.h and fill in real values.
// config.h is git-ignored. NEVER commit real credentials.

#ifndef CONFIG_H
#define CONFIG_H

// Wi-Fi
#define WIFI_SSID "YOUR_WIFI_SSID"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Server
#define SERVER_URL "http://192.168.1.100:8000"
#define DEVICE_ID "reader-01"
#define DEVICE_TOKEN "CHANGE_ME_TO_REAL_DEVICE_TOKEN"

// Timing (milliseconds)
#define HEARTBEAT_MS 15000
#define SAME_CARD_COOLDOWN_MS 3000
#define HTTP_TIMEOUT_MS 5000
#define MAX_RETRIES 3
#define RETRY_BACKOFF_MS 1000

#endif
