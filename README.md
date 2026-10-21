# ACCESS-EASE (AccessSync)

A browser-based accessibility guidance platform for public libraries using RFID-triggered personalized wayfinding.

> **Project Brief:** See [`docs/PROJECT_BRIEF.md`](docs/PROJECT_BRIEF.md) for full project architecture, database schema, and operational specifications.

---

## Tech Stack

- **Backend:** FastAPI, Python 3.11+, SQLAlchemy 2.x, SQLite, Uvicorn
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS
- **Hardware Integration:** ESP32 DevKit V1, RC522 RFID reader, MIFARE Classic 1K cards
- **Accessibility Engine:** `@axe-core/react` runtime audit, W3C WCAG 2.1 Level AA tokens

---

## Prerequisites

- **Python:** 3.11 or higher
- **Node.js:** 18 or higher
- **Package Managers:** `pip` and `npm`
- **Git**

---

## Setup & Local Installation

### 1. Clone Repository
```bash
git clone https://github.com/sanjeevi-007/accesssync.git
cd accesssync
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Seed SQLite database with City Central Library sample records
python -m app.seed

# Run backend development server on http://localhost:8000
# (From repository root so ./database/accesssync.db is located correctly)
cd ..
# Windows PowerShell:
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
# Linux / macOS:
PYTHONPATH=backend python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend API and Swagger documentation will be available at:
- **API Base:** `http://localhost:8000`
- **Swagger Docs:** `http://localhost:8000/docs`

### 3. Frontend Setup
In a new terminal window:
```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server on http://localhost:5173
npm run dev
```

Frontend application will be available at:
- **Landing Page:** `http://localhost:5173/`
- **Staff Portal Sign In:** `http://localhost:5173/login`
- **Visitor Screen:** `http://localhost:5173/visitor`
- **Accessibility Conformance:** `http://localhost:5173/accessibility`

---

## Default Credentials

The initial database seed provisions an administrative account:

| Username | Default Password | Required Action |
| :--- | :--- | :--- |
| `admin` | `ChangeMe123!` | Must update password upon initial sign in |

---

## Branching Model

The project follows a linear, single-branch feature flow merged into `main`:

| Branch | Description |
| :--- | :--- |
| `main` | Production / stable release branch |
| `feature/foundation` | Phase 0 & 0.1: Project initialization, seed data, DB schema |
| `feature/backend-crud` | Phase 1: Authentication, libraries, areas, criteria CRUD |
| `feature/hardware-sim` | Phase 2: Hardware bridge, reader status, scan recording |
| `feature/frontend-auth` | Phase 3: Staff auth, layout, navigation, session management |
| `feature/frontend-crud` | Phase 4: Cards management, RFID UID capture modal |
| `feature/frontend-matrix`| Phase 5: Accessibility assessment matrix & scoring |
| `feature/visitor-mode` | Phase 6: Visitor wayfinding modes (Blind, Hearing, Low-Vision) |
| `feature/reports-live` | Phase 8: Real-time scan feed, summary reports, print, CSV export |
| `feature/a11y-audit` | Phase 9: Accessibility audit, skip links, WCAG AA compliance, docs |

---

## Accessibility Commitment

ACCESS-EASE is committed to meeting **WCAG 2.1 Level AA** standards. Full details on audit findings, applied remediation, and runtime axe-core testing are documented in [`docs/ACCESSIBILITY.md`](docs/ACCESSIBILITY.md).
