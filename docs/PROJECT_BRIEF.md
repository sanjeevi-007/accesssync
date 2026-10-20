# ACCESS-EASE (AccessSync): Full Project Briefing

Last updated: Project start (nothing built yet)
Repo: https://github.com/sanjeevi-007/accesssync.git
Branch model: `main` plus one branch per phase
Builder: one person (Sanjeevi) working with Antigravity agents

---

## 1. What this app is

ACCESS-EASE is a **browser-based** accessibility guidance platform for **public libraries**. A visitor taps an RFID card on an RC522 reader connected to an ESP32. The ESP32 sends the card UID over Wi-Fi to a FastAPI server. The server checks the card, finds its accessibility mode, and the website shows guidance in that mode.

Demo location: fictional **City Central Library** (2 floors).

Three modes (exact names used in the app):
- **Blind**
- **Hearing** (Deaf / Hard of Hearing)
- **Low-Vision**

Two kinds of users:
- **Visitors**, who only tap a card and read or listen to guidance.
- **Staff** (Administrator, Library Manager, Accessibility Staff), who log in to manage everything.

Hard rules:
1. It is a WEBSITE, not a mobile app.
2. The RFID path is REAL. No fake scan button, no random or simulated scans.
3. Seeded data is labelled "Sample" and can be edited or deleted.
4. The site never claims it can detect real fire alarms or flash physical lights.
5. The assessment score is an "internal assessment indicator", not a certified rating.

---

## 2. Phase plan (status)

Every phase is **NOT STARTED**. One phase = one branch = one commit series, merged to `main` only after manual testing.

| Phase | Name | Branch | Status |
|---|---|---|---|
| 0.1 | Repo, folders, `.gitignore`, `.env.example` | `main` | Not started |
| 0.2 | Backend skeleton, config, database, Alembic | `feature/backend-core` | Not started |
| 0.3 | Models and seed script (library data) | `feature/backend-core` | Not started |
| 0.4 | Auth, password hashing, roles | `feature/backend-core` | Not started |
| 1 | CRUD: libraries, areas, cards, instructions, assessments | `feature/backend-crud` | Not started |
| 2 | Scan API, idempotency, rejection logic, pytest | `feature/scan-api` | Not started |
| 3 | Device heartbeat, status, WebSocket broadcast | `feature/device-status` | Not started |
| 4 | Frontend shell: Vite, Tailwind, router, login, layout | `feature/frontend-shell` | Not started |
| 5 | Staff pages: dashboard, cards, library, instructions | `feature/frontend-staff` | Not started |
| 6 | Assessment page and score logic | `feature/frontend-assessments` | Not started |
| 7 | Visitor views: Blind, Hearing, Low-Vision, `/visitor` | `feature/visitor-modes` | Not started |
| 8 | Live scans page, reports, print, CSV | `feature/reports-live` | Not started |
| 9 | Accessibility testing of the site itself, README | `feature/polish-docs` | Not started |
| 10 | ESP32 firmware (reader test, Wi-Fi, scan, heartbeat) | `feature/firmware` | Not started |
| 11 | Hardware integration and end-to-end demo test | `main` | Not started |

Build order: software first (phases 0 to 9), hardware second (10), integration last (11).

---

## 3. Tech stack (fixed, do not substitute)

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS, React Router v6 |
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| Database | SQLite, SQLAlchemy 2.x, Alembic migrations |
| Passwords | bcrypt (passlib) or argon2 |
| Staff auth | JWT bearer tokens, role-based access |
| Device auth | Per-device token, stored hashed, `X-Device-Token` header |
| Live updates | WebSocket `/ws/events`, polling fallback every 3 to 5 s |
| Text-to-speech | Browser `speechSynthesis` API (optional per mode) |
| Tests | pytest and FastAPI TestClient |
| Firmware | Arduino IDE, ESP32 board package, MFRC522, ArduinoJson, WiFi, HTTPClient |
| Hardware | ESP32 DevKit V1, RC522 (13.56 MHz), MIFARE cards, breadboard, jumpers, USB data cable |

Do not add libraries without asking.

---

## 4. Folder structure

accesssync/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/        # scan_service, status_service, report_service
│   │   ├── core/            # security, permissions, websocket manager
│   │   └── seed.py
│   ├── alembic/
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/
│       ├── modes/           # BlindView, HearingView, LowVisionView
│       ├── components/
│       ├── api/
│       ├── hooks/           # useAuth, useLiveScans, useDeviceStatus, useSpeech
│       └── App.tsx
├── database/                # SQLite file lives here (git-ignored)
├── firmware/accessease_reader/
│   ├── accessease_reader.ino
│   ├── config.h             # git-ignored
│   └── config.example.h
├── docs/PROJECT_BRIEF.md
├── .env.example
├── .gitignore
└── README.md

---

## 5. Design system (simple, fixed, use tokens only)

Define these once as Tailwind theme colors / CSS variables. **Never hardcode hex values in components.**

| Token | Hex | Use |
|---|---|---|
| `bg` | #F3F5F7 | App background, flat |
| `surface` | #E6EBEF | Cards, panels, table headers |
| `primary` | #1F4E79 | Buttons, links, active nav item |
| `text` | #111827 | All body text |
| `muted` | #4B5563 | Secondary text (4.5:1 or better on `bg`) |
| `mode-blind` | #0F766E | Blind mode accent (teal) |
| `mode-hearing` | #B45309 | Hearing mode accent (amber) |
| `mode-lowvision` | #6D28D9 | Low-Vision mode accent (purple) |
| `success` | #15803D | Pass |
| `warning` | #B45309 | Needs Improvement |
| `danger` | #B91C1C | Fail, rejected scan, obstruction |
| `neutral` | #6B7280 | Not Assessed |

Low-Vision themes (user-switchable): **Default**, **High-Contrast** (white on black), **Yellow on Black**.
Optional dark theme for staff pages, using Tailwind `dark:` classes.

Rules:
- Font: **Inter** (or system sans-serif fallback) everywhere.
- Flat style only. No gradients, no glow, no bounce animations.
- Icons: one set (lucide-react), single color, always paired with a text label.
- **Never use color alone** to carry meaning. Every status has an icon and a text label.
- Text contrast at least 4.5:1. Large text at least 3:1.
- Respect `prefers-reduced-motion`. No auto-playing audio.
- Status badge values: Online, Offline, Never connected.

---

## 6. How the scan flow behaves

1. Visitor taps a card on the RC522.
2. ESP32 reads the UID, formats it as uppercase hex (e.g. `04A1B2C3`), creates one `event_id` per tap.
3. ESP32 POSTs to `/api/rfid/scans` with `X-Device-Token`.
4. Server steps, in order:
   1. Verify device token. Wrong token returns 401.
   2. If `event_id` already exists, return the stored result and create nothing.
   3. Validate and normalize the UID (hex, 8 to 20 chars, uppercase, no separators).
   4. Look up the card.
   5. Unknown card: `rejected`, reason `UNREGISTERED`. Inactive card: `rejected`, reason `INACTIVE`. Return only `{result, reason}`, no private data.
   6. Accepted: load mode, library, and the entrance area tied to the device.
   7. Query active instructions matching library, area, mode, and language, ordered by priority.
   8. Store the event with an instruction snapshot.
   9. Update the device `last_seen_at`.
   10. Broadcast over WebSocket and return JSON.
5. The `/visitor` screen switches to the matching mode view. After 60 s of inactivity it returns to: "Tap your accessibility card on the reader."
6. A rejected scan shows a neutral message and no private data.

Device status: **online** only if `now - last_seen_at <= timeout` (default heartbeat 15 s, timeout 45 s). Otherwise **offline** with the real last-seen time. Never connected devices show "Never connected."

Card registration includes a "Capture UID from the next real scan" helper (waits for a real tap) plus a manual UID field as a fallback.

---

## 7. Database tables

`users`, `libraries`, `areas`, `visitors`, `rfid_cards`, `scan_events`, `instructions`, `criteria`, `assessments`, `devices`, `settings`.

Key rules:
- `mode`: `blind`, `hearing`, `low_vision`.
- `language`: `en`, `ta`, `hi` (only `en` seeded).
- `status`: `pass`, `needs_improvement`, `fail`, `not_assessed`.
- `area_type`: entrance, reception, shelves, reading_hall, computer_section, children_section, restroom, lift, stairs, corridor, exit, assembly_point, parking.
- Only one **active** card per UID.
- Every seeded row has `is_sample = true`.
- Score = Pass / (Pass + Needs Improvement + Fail) x 100. Not Assessed and not-applicable are excluded. Always label: "Internal assessment indicator, not a certified accessibility rating."

Seed data (idempotent, `python -m app.seed`):
- City Central Library, code `CCL`, 2 floors.
- Ground floor: Main Entrance, Reception Desk, Reading Hall, Computer Section, Accessible Restroom, Lift L1, Stairs S1, Emergency Exit E2.
- First floor: Children's Section, Periodicals Area, Lift Lobby, Stairs S1, Emergency Exit E3.
- Assembly point: Front Lawn.
- Three cards with placeholder UIDs `AAAAAAAA`, `BBBBBBBB`, `CCCCCCCC`, marked "REPLACE WITH REAL UID."
- Instructions per area per mode (English), sample assessments, one default admin that must change password on first login.

---

## 8. Website pages

Public: `/` landing, `/accessibility` info, `/login`, `/visitor` (scan-reactive screen).

Staff (sidebar, top bar with page title, device status badge, user menu):
`/app/dashboard`, `/app/cards`, `/app/library`, `/app/assessments`, `/app/instructions`, `/app/scans`, `/app/reports`, `/app/settings`.

Mode views:
- **BlindView:** semantic landmarks, one `<h1>`, `aria-live="assertive"` for new instructions, skip link, ordered-list steps, Read aloud / Pause / Stop, obstacle warnings with `role="alert"`, full keyboard use.
- **HearingView:** large text cards, visual alert banner (icon + text + color), lift and maintenance panels, numbered emergency steps, note that physical flashing lights need extra hardware.
- **LowVisionView:** base font at least 24 px, A- / A+ (100% to 200%), three themes plus Reset to default, buttons at least 56 px tall, short directions, bold obstruction panel, optional text-to-speech, settings saved in `localStorage`.

Empty state on Live Scans: "Waiting for a physical RFID scan. No scans have been received yet."

---

## 9. Hardware

Wiring (ESP32 DevKit V1 to RC522):

| RC522 | ESP32 |
|---|---|
| SDA / SS | GPIO 5 |
| SCK | GPIO 18 |
| MOSI | GPIO 23 |
| MISO | GPIO 19 |
| RST | GPIO 22 |
| 3.3V | 3V3 (never 5V) |
| GND | GND |
| IRQ | not connected |

Notes:
- Solder the RC522 header pins. Keep wires under about 15 cm. Wire with USB unplugged.
- Read range is 2 to 3 cm.
- A card's printed number is not its UID. Always read the UID from a real scan.
- ESP32 needs a 2.4 GHz Wi-Fi network. Use a data-capable USB cable.
- Backend must run with `--host 0.0.0.0`, and the firewall must allow port 8000.

Firmware config (`config.h`, git-ignored): Wi-Fi SSID and password, `SERVER_URL`, `DEVICE_ID`, `DEVICE_TOKEN`, `HEARTBEAT_MS` 15000, `SAME_CARD_COOLDOWN_MS` 3000, `HTTP_TIMEOUT_MS` 5000, `MAX_RETRIES` 3, `RETRY_BACKOFF_MS` 1000 (doubling).

Firmware behavior: check the RC522 version register (0x00 or 0xFF means not detected), connect Wi-Fi with timeout and reconnect, heartbeat, read UID, apply cooldown, create `event_id` ONCE per tap and reuse it on retries, bounded retry, then `PICC_HaltA()` and `PCD_StopCrypto1()`.

Hardware test order: reader version check, UID read, Wi-Fi, server reachability, heartbeat shows Online, accepted scan, unknown card rejected, deactivated card rejected, unplug test (Offline with real last-seen), retry test (stop server, tap, restart, no duplicate).

---

## 10. Git workflow (exact, follow precisely)

Repo: https://github.com/sanjeevi-007/accesssync.git
Default branch: `main`

First-time setup (only if the repo is not yet connected):
git init
git branch -M main
git remote add origin https://github.com/sanjeevi-007/accesssync.git
git push -u origin main

If `origin` already exists, use `git remote set-url origin <url>` instead. Do not re-run `git init` in a folder that is already a repository.

Per phase:
git checkout main
git pull origin main
git checkout -b <branch-for-this-phase>
# build and test manually
git add .
git commit -m "Phase <N>: <short description>"
git push origin <branch-for-this-phase>
# after manual testing passes:
git checkout main
git merge <branch-for-this-phase>
git push origin main

Rules:
- One phase, one clear commit message (`Phase 2: Scan API with idempotency and rejection logic`).
- Test manually before every merge to `main`.
- NEVER commit: `.env`, `*.db`, `*.sqlite`, `node_modules/`, `__pycache__/`, `.venv/`, `dist/`, `firmware/accessease_reader/config.h`.
- Commit `.env.example` and `config.example.h` with placeholder values.
- Before each push, show the list of files being committed and confirm no secrets are included.
- If a secret is ever committed, rotate it immediately. Deleting it in a later commit does not remove it from history.
- If a push fails, show the error. Do not change git settings or force-push.

---

## 11. Rules for Antigravity agents

1. Work on one phase at a time. Stop when the phase is done and tested.
2. Follow the fixed stack and the design tokens. Do not add libraries or hardcode colors.
3. Never add a fake scan button, random scan events, or simulated reader features to the website.
4. Never put real passwords, tokens, or Wi-Fi details in committed files.
5. Do not edit the theme tokens, database models, or the scan service outside the phase that owns them. If another file needs a change, leave `// TODO(Sanjeevi): need <change> because <reason>` and report it.
6. Every API error uses this shape: `{ "error": { "code": "...", "message": "..." } }`.
7. Every phase ends with: how to run it, how to test it, and what was NOT verified.
8. Anything needing real hardware or a human assessor must be stated clearly as not verified.

---

## 12. Integration points (final check)

1. Seeded device token matches the token in `firmware/.../config.h`.
2. Server LAN IP is set in `SERVER_URL`, and the backend is bound to `0.0.0.0`.
3. The three placeholder UIDs are replaced by the real UIDs read from physical cards.
4. `/visitor` shows a different instruction text for the same location in each mode.
5. Sample data is still labelled, editable, and persists after a server restart.
6. Reports export to CSV and print cleanly.

---

## 13. Honest limits (state these in the demo and report)

- The score is an internal indicator, not a certification.
- The website cannot detect real alarms or flash physical lights. That needs external hardware or a verified alert integration.
- Tactile guidance, signage contrast, and lighting must be assessed by a person.
- Plain HTTP is fine on a local network. A real deployment should use HTTPS.

---

## 14. If you have a doubt

Do NOT guess. Do NOT silently create your own version of a shared file. Stop and ask Sanjeevi, describing exactly what is unclear.
