/**
 * ACCESS-EASE ESP32 RFID Reader Firmware
 * Grand Plaza Mall Accessibility Guidance System
 * 
 * Hardware:
 *   - ESP32 DevKit V1
 *   - RC522 13.56MHz RFID Reader (SPI mode)
 *   - MIFARE Classic 1K / ISO 14443A RFID Cards
 *   - Built-in / External Status LED
 * 
 * Mall Guidance Deployment:
 *   Installed at physical mall navigation touchpoints including:
 *   - Main Mall Entrances & Information Desk Kiosks
 *   - Food Court Entrance Checkpoints
 *   - Central Escalator & Elevator Hubs
 *   - Accessible Restroom Corridors
 *   - Multi-Level Parking Gateways
 * 
 * Purpose:
 *   Detects physical RFID card taps from visitors with accessibility profiles
 *   (Blind, Hearing, or Low-Vision), formats the card UID as an uppercase hex string,
 *   debounces rapid repeated reads, and transmits the scan event to the Grand Plaza
 *   Mall server over local Wi-Fi. Also sends periodic heartbeat telemetry to maintain
 *   reader online status on staff dashboards.
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

// Configuration: Shopping Mall Wi-Fi credentials, backend URL, pinouts
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.h.example"
  #warning "config.h not found. Using config.h.example defaults. Copy config.h.example to config.h and configure mall network credentials."
#endif

// =============================================================================
// Global Hardware Instances
// =============================================================================
MFRC522 mfrc522(SS_PIN, RST_PIN);

// =============================================================================
// State Tracking (Non-blocking Timers & Debounce)
// =============================================================================
unsigned long lastHeartbeatTime = 0;
unsigned long lastScannedTime = 0;
String lastScannedUid = "";
unsigned long lastWifiRetryTime = 0;

// =============================================================================
// Visual Feedback LED Helpers
// =============================================================================

// Quick double-blink on successful heartbeat ping
void ledDoubleBlink() {
  digitalWrite(LED_PIN, HIGH);
  delay(60);
  digitalWrite(LED_PIN, LOW);
  delay(60);
  digitalWrite(LED_PIN, HIGH);
  delay(60);
  digitalWrite(LED_PIN, LOW);
}

// Solid 500ms ON on successful scan acceptance
void ledSuccess() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
}

// 3 rapid blinks on network error or rejected scan
void ledError() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(100);
    digitalWrite(LED_PIN, LOW);
    delay(100);
  }
}

// =============================================================================
// Shopping Mall Wi-Fi Connection & Reconnection Management
// =============================================================================
void connectWiFi() {
  Serial.println();
  Serial.print("[WiFi] Connecting to Mall Wi-Fi SSID: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_PIN, !digitalRead(LED_PIN)); // Toggle LED while waiting
    attempts++;
  }
  digitalWrite(LED_PIN, LOW);

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("[WiFi] Connected to Grand Plaza Mall network successfully!");
    Serial.print("[WiFi] Assigned IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[WiFi] Signal Strength (RSSI): ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println();
    Serial.println("[WiFi] Connection failed. Will retry in background loop.");
  }
}

// a) Auto-reconnect Wi-Fi if network drops in mall environment
void handleWiFiReconnection(unsigned long currentMillis) {
  if (WiFi.status() != WL_CONNECTED) {
    if (currentMillis - lastWifiRetryTime >= 10000) {
      lastWifiRetryTime = currentMillis;
      Serial.println("[WiFi] Mall Wi-Fi connection dropped. Attempting reconnect...");
      WiFi.disconnect();
      WiFi.reconnect();
    }
  }
}

// =============================================================================
// b) Non-blocking Heartbeat (POST /api/devices/heartbeat)
// =============================================================================
void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[Heartbeat] Skipped: Mall Wi-Fi not connected.");
    return;
  }

  HTTPClient http;
  String heartbeatEndpoint = String(BACKEND_URL) + "/api/devices/heartbeat";

  Serial.print("[Heartbeat] Sending mall kiosk telemetry to: ");
  Serial.println(heartbeatEndpoint);

  http.begin(heartbeatEndpoint);
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(4000);

  int httpCode = http.POST("{}");

  if (httpCode == HTTP_CODE_OK || httpCode == 201) {
    String response = http.getString();
    Serial.print("[Heartbeat] Success (HTTP ");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(response);
    ledDoubleBlink();
  } else {
    Serial.print("[Heartbeat] Error (HTTP ");
    Serial.print(httpCode);
    Serial.print("): ");
    if (httpCode > 0) {
      Serial.println(http.getString());
    } else {
      Serial.println(http.errorToString(httpCode));
    }
  }

  http.end();
}

// =============================================================================
// g) Scan HTTP POST (POST /api/rfid/scans)
// =============================================================================
void transmitScan(const String& hexUid) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[RFID Scan] Error: Mall Wi-Fi not connected. Cannot transmit scan.");
    ledError();
    return;
  }

  // f) Generate unique event_id: String(DEVICE_ID) + "-" + String(millis())
  String eventId = String(DEVICE_ID) + "-" + String(millis());

  // Build JSON payload: {"event_id": event_id, "uid": hex_uid}
  JsonDocument doc;
  doc["event_id"] = eventId;
  doc["uid"] = hexUid;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  HTTPClient http;
  String scanEndpoint = String(BACKEND_URL) + "/api/rfid/scans";

  Serial.println("--------------------------------------------------");
  Serial.print("[RFID Scan] Transmitting card UID: ");
  Serial.println(hexUid);
  Serial.print("[RFID Scan] Event ID: ");
  Serial.println(eventId);
  Serial.print("[RFID Scan] Endpoint: ");
  Serial.println(scanEndpoint);
  Serial.print("[RFID Scan] Payload: ");
  Serial.println(jsonPayload);

  http.begin(scanEndpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Token", DEVICE_TOKEN);
  http.setTimeout(5000);

  int httpCode = http.POST(jsonPayload);

  // h) LED feedback: Solid ON 500ms on success response, 3 rapid blinks on network error or rejected scan
  if (httpCode == HTTP_CODE_OK || httpCode == 201) {
    String response = http.getString();
    Serial.print("[RFID Scan] Success (HTTP ");
    Serial.print(httpCode);
    Serial.print("): ");
    Serial.println(response);
    ledSuccess();
  } else {
    Serial.print("[RFID Scan] Failed (HTTP ");
    Serial.print(httpCode);
    Serial.print("): ");
    if (httpCode > 0) {
      Serial.println(http.getString());
    } else {
      Serial.println(http.errorToString(httpCode));
    }
    ledError();
  }

  http.end();
  Serial.println("--------------------------------------------------");
}

// =============================================================================
// Setup: Serial, SPI, MFRC522, LED, Wi-Fi loop
// =============================================================================
void setup() {
  // 1. Initialize Serial Communication at 115200 baud
  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==================================================");
  Serial.println("  ACCESS-EASE Grand Plaza Mall RFID Reader");
  Serial.print("  Guidance Point Device ID: ");
  Serial.println(DEVICE_ID);
  Serial.println("==================================================");

  // 2. Initialize Status LED output pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // 3. Initialize SPI Bus with designated pins
  Serial.print("[SPI] Initializing SPI bus (SCK=");
  Serial.print(SCK);
  Serial.print(", MISO=");
  Serial.print(MISO);
  Serial.print(", MOSI=");
  Serial.print(MOSI);
  Serial.print(", SS=");
  Serial.print(SS_PIN);
  Serial.println(")...");
  SPI.begin(SCK, MISO, MOSI, SS_PIN);

  // 4. Initialize MFRC522 RFID Reader
  Serial.println("[RC522] Initializing MFRC522 RFID reader...");
  mfrc522.PCD_Init();
  delay(50);

  // Log reader firmware version for wiring verification
  Serial.print("[RC522] Firmware Version: ");
  mfrc522.PCD_DumpVersionToSerial();

  byte version = mfrc522.PCD_ReadRegister(mfrc522.VersionReg);
  if (version == 0x00 || version == 0xFF) {
    Serial.println("[RC522] WARNING: RC522 reader NOT detected! Check 3.3V power, GND, and SPI connections.");
    ledError();
  } else {
    Serial.println("[RC522] Reader detected and operational at mall kiosk!");
  }

  // 5. Connect to Shopping Mall Wi-Fi Network
  connectWiFi();

  // 6. Send initial heartbeat immediately upon boot
  if (WiFi.status() == WL_CONNECTED) {
    sendHeartbeat();
    lastHeartbeatTime = millis();
  }

  Serial.println("[Setup] Mall guidance reader active. Listening for card taps...");
  Serial.println();
}

// =============================================================================
// Main Operational Loop
// =============================================================================
void loop() {
  unsigned long currentMillis = millis();

  // a) Auto-reconnect Wi-Fi if network drops in mall environment
  handleWiFiReconnection(currentMillis);

  // b) Non-blocking heartbeat (millis()): POST /api/devices/heartbeat every HEARTBEAT_INTERVAL_MS
  if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeat();
  }

  // c) RFID read: Check card presence and serial availability
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // d) Format UID: Convert byte array to uppercase hex string without spaces (e.g. "04A1B2C3")
  String hexUid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) {
      hexUid += "0";
    }
    hexUid += String(mfrc522.uid.uidByte[i], HEX);
  }
  hexUid.toUpperCase();

  // e) Debounce: Ignore identical UID scanned within DEBOUNCE_MS to prevent double-triggering at mall kiosks
  if (hexUid == lastScannedUid && (currentMillis - lastScannedTime < DEBOUNCE_MS)) {
    Serial.print("[Debounce] Ignoring duplicate card tap for UID ");
    Serial.print(hexUid);
    Serial.print(" (");
    Serial.print(DEBOUNCE_MS - (currentMillis - lastScannedTime));
    Serial.println(" ms cooldown remaining).");
  } else {
    // Record scan timestamp and UID
    lastScannedUid = hexUid;
    lastScannedTime = currentMillis;

    // f) & g) & h) Transmit scan HTTP POST to mall server with LED feedback
    transmitScan(hexUid);
  }

  // i) Clean halt: PICC_HaltA() and PCD_StopCrypto1()
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
