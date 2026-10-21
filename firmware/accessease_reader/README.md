# ACCESS-EASE ESP32 RFID Reader Firmware
## Grand Plaza Mall Accessibility Guidance Hardware Deployment

This repository contains the physical RFID reader firmware for the **ACCESS-EASE** accessibility wayfinding infrastructure at **Grand Plaza Mall**. The reader hardware consists of an **ESP32 DevKit V1** microcontroller connected to an **MFRC522 (RC522) 13.56MHz RFID** module over SPI.

When a visitor taps their accessibility RFID card (configured for Blind, Hearing, or Low-Vision modes) at any guidance point, the reader captures the card UID, formats it into an uppercase hex string, debounces duplicate taps, and transmits the scan event to the mall server over Wi-Fi.

---

## 1. Shopping Mall Hardware Deployment & Reader Placement

For barrier-free wayfinding across Grand Plaza Mall, readers should be mounted at physical kiosks and wall touchpoints according to ADA/universal accessibility height standards (850 mm – 1000 mm from the floor):

```
       +-------------------------------------------------------------+
       |                  GRAND PLAZA MALL CHECKPOINTS               |
       +-------------------------------------------------------------+
       |                                                             |
       |  [Point 1: Main Entrance Kiosk]                             |
       |    - Primary orientation station upon mall entry            |
       |    - Taps display overview map & voice welcome              |
       |                                                             |
       |  [Point 2: Food Court Entrance]                             |
       |    - High-contrast visual seating availability & dietary     |
       |      guidance for Hearing and Low-Vision visitors           |
       |                                                             |
       |  [Point 3: Central Elevator Bank & Escalator Hub]           |
       |    - Elevator floor routing, tactile guide path alignment,   |
       |      and audible escalator warnings                         |
       |                                                             |
       |  [Point 4: Accessible Restroom Corridor]                    |
       |    - Direct doorway navigation, braille indicator prompts,  |
       |      and unobstructed pathway confirmation                  |
       |                                                             |
       |  [Point 5: Multi-Level Parking Gateway]                     |
       |    - Level identification, accessible parking stall routing,|
       |      and safe pedestrian zebra crossing paths               |
       |                                                             |
       +-------------------------------------------------------------+
```

### Physical Kiosk Specifications:
- **Mounting Height:** 900 mm (approx. 35 inches) from finished floor level, within accessible reach range for wheelchair users.
- **Visual & Tactile Cue:** Kiosks should include a raised high-contrast yellow/teal border and Braille marker ("TAP RFID CARD HERE") directly above the RC522 antenna.
- **Housing:** Non-metallic plastic (ABS or 3D-printed PETG) enclosure. *Do NOT use metal or aluminum enclosures directly in front of the RC522 coil, as metal detunes the 13.56 MHz RF field.*

---

## 2. Hardware Pinout & Wiring Table

Connect the RC522 module to the ESP32 DevKit V1 development board using standard female-to-female jumper wires:

| RC522 Module Pin | ESP32 DevKit V1 Pin | Pin Function | Wiring Notes |
| :--- | :--- | :--- | :--- |
| **VCC (3.3V)** | **3V3** | Power (3.3V) | **CRITICAL: Connect ONLY to 3.3V. See Warning below.** |
| **RST** | **GPIO 22** | Reset | Hardware reset line |
| **GND** | **GND** | Ground | Common system ground |
| **IRQ** | *NC (Leave open)*| Interrupt | Not connected (polling mode used) |
| **MISO** | **GPIO 19** | SPI MISO | Master In, Slave Out |
| **MOSI** | **GPIO 23** | SPI MOSI | Master Out, Slave In |
| **SCK** | **GPIO 18** | SPI SCK | Serial SPI Clock |
| **SDA (SS)** | **GPIO 5** | SPI SS / CS | Slave Select / Chip Select |
| *Status LED* | **GPIO 2** | Output | Built-in blue LED / external kiosk panel LED |

> [!CAUTION]
> **STRICT 3.3V POWER WARNING:**
> The RC522 RFID reader operates strictly on **3.3V logic and supply voltage**. Connecting the RC522 VCC pin to the ESP32 5V pin (VIN / V5) will permanently burn out and destroy the RC522 chip. Always wire to the **3V3** pin of the ESP32.

---

## 3. Mall Network Configuration Setup

The firmware requires mall local Wi-Fi credentials and the IP address of the running ACCESS-EASE server.

1. Navigate to the firmware directory:
   ```bash
   cd firmware/accessease_reader
   ```
2. Copy the template file `config.h.example` to `config.h`:
   ```bash
   cp config.h.example config.h
   ```
3. Open `config.h` in your text editor and configure:
   - `WIFI_SSID`: Mall Wi-Fi SSID (e.g. `"MALL_GUEST_WIFI"` or your dedicated IoT VLAN). *(Note: ESP32 only connects to 2.4GHz Wi-Fi bands, not 5GHz).*
   - `WIFI_PASS`: Network Wi-Fi password.
   - `BACKEND_URL`: Local IP address of the Grand Plaza Mall server (e.g. `http://192.168.1.100:8000`).
   - `DEVICE_TOKEN`: `"dev-token-accesssync-2024"` (pre-seeded security token).
   - `DEVICE_ID`: Device identifier for this guidance point (e.g. `"reader-01"` for Main Entrance Kiosk, `"reader-02"` for Food Court).

> [!NOTE]
> `config.h` is excluded from git tracking in `.gitignore`. Real Wi-Fi credentials will never be committed to source control.

---

## 4. Flashing & Upload Instructions

Build and flash the firmware using either **PlatformIO** (recommended) or the **Arduino IDE**.

### Option A: Using PlatformIO (VS Code / CLI)

1. Open the repository root or `firmware/accessease_reader` in VS Code with the **PlatformIO IDE** extension.
2. Connect the ESP32 to your workstation via a micro-USB data cable.
3. Build the firmware:
   ```bash
   pio run
   ```
   *(PlatformIO automatically downloads `MFRC522` and `ArduinoJson` libraries).*
4. Upload firmware to the ESP32:
   ```bash
   pio run --target upload
   ```
5. Open the serial monitor at 115200 baud:
   ```bash
   pio device monitor -b 115200
   ```

### Option B: Using Arduino IDE

1. **Install ESP32 Board Support:**
   - In Arduino IDE, go to **File** -> **Preferences**.
   - Add to *Additional Boards Manager URLs*:
     `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Go to **Tools** -> **Board** -> **Boards Manager**, search for `esp32` by Espressif Systems, and click **Install**.
2. **Install Required Libraries:**
   - Go to **Tools** -> **Manage Libraries...**
   - Install `MFRC522` by *GithubCommunity (miguelbalboa)* (v1.4.11+).
   - Install `ArduinoJson` by *Benoît Blanchon* (v7.0.4+).
3. **Select Board & Port:**
   - Open `firmware/accessease_reader/accessease_reader.ino`.
   - Under **Tools** -> **Board** -> **esp32**, select **ESP32 Dev Module** (or **DOIT ESP32 DEVKIT V1**).
   - Under **Tools** -> **Port**, select your COM port (e.g., `COM3`, `/dev/ttyUSB0`).
   - Set **Upload Speed** to `921600` or `115200`.
4. **Compile & Upload:**
   - Click the **Verify** button to compile.
   - Click the **Upload** button to flash.
5. **Open Serial Monitor:**
   - Set baud rate to **115200 baud**.

---

## 5. LED Status Code Reference Table

The onboard status LED (GPIO 2) provides physical diagnostic feedback for mall technicians:

| LED Action | Trigger | Meaning / Diagnosis |
| :--- | :--- | :--- |
| **Slow Toggling (1 Hz)** | Mall Wi-Fi connecting | Connecting to Wi-Fi SSID during startup |
| **Quick Double-Blink** | Heartbeat Telemetry | Telemetry sent to `POST /api/devices/heartbeat` (HTTP 200) |
| **Solid ON (500 ms)** | Card Scan Accepted | Card UID transmitted to `POST /api/rfid/scans` (HTTP 200/201) |
| **3 Rapid Blinks** | Error / Warning | Mall Wi-Fi disconnected, HTTP error (401/403/500), or timeout |
| **Continuous OFF** | Idle | Reader standing by, listening for visitor card tap |

---

## 6. Serial Monitor Troubleshooting Guide

### 1. "WARNING: RC522 reader NOT detected!" / Firmware version 0x00 or 0xFF
- **Root Cause:** Loose jumper wire or wrong SPI pin.
- **Resolution:**
  - Verify RC522 VCC is in **3V3** (not 5V, not loose).
  - Verify SPI pinout: SDA -> GPIO 5, SCK -> GPIO 18, MOSI -> GPIO 23, MISO -> GPIO 19, RST -> GPIO 22.
  - Inspect solder joints on the RC522 header pins.

### 2. Mall Wi-Fi connection fails repeatedly
- **Root Cause:** Incorrect Wi-Fi SSID/password or 5GHz band.
- **Resolution:**
  - Ensure the mall router or access point broadcasts on the **2.4GHz band** (ESP32 does not support 5GHz).
  - Re-check credentials in `config.h`.

### 3. "[RFID Scan] Failed (HTTP 401 / 403)"
- **Root Cause:** Invalid device security token.
- **Resolution:**
  - Verify `DEVICE_TOKEN` in `config.h` is `"dev-token-accesssync-2024"`.
  - Confirm backend database was seeded with `python -m app.seed`.

### 4. "[RFID Scan] Failed (Connection timed out / connection refused)"
- **Root Cause:** ESP32 cannot route to mall server IP.
- **Resolution:**
  - Confirm the server host and ESP32 are on the same subnet/VLAN.
  - Set `BACKEND_URL` in `config.h` to the server LAN IP (e.g. `http://192.168.1.150:8000`).
  - Check host firewall settings for port 8000.

### 5. "[Debounce] Ignoring duplicate card tap"
- **Expected Behavior:** If a visitor holds their card continuously against the kiosk antenna, the firmware ignores identical UIDs for 3000 ms (`DEBOUNCE_MS`) to prevent duplicate event spam on mall screens.
