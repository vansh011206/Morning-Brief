# MorningBrief

> **Personal AI Morning-Briefing & Ranked Notification Intelligence Web Application**  
> MorningBrief connects your communication channels (Google Gmail, GitHub, and more) and automatically synthesizes, ranks, and delivers an actionable, prioritized morning digest every day at 07:00 AM via Email, Telegram, and the web app.

---

## Architecture Overview

MorningBrief is structured as a monorepo:

```
Morning-Brief/
├── backend/                  # Django 5.2 LTS, Python 3.12+, Daphne ASGI, DRF
│   ├── config/               # Settings, Celery, ASGI, WSGI, URLs
│   ├── apps/
│   │   ├── accounts/         # Custom User, UserProfile, SimpleJWT auth
│   │   ├── connections/      # Gmail & GitHub OAuth integrations
│   │   ├── ingestor/         # Raw notifications ingestion & normalization
│   │   ├── digest/           # DailyDigest & ranked DigestItem models & views
│   │   ├── delivery/         # Email & Telegram dispatch audit logs
│   │   ├── feedback/         # User ratings & feedback for ranking alignment
│   │   └── llm/              # AI ranking and summarization engine
│   ├── manage.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                 # Vite, React 19, Strict TypeScript, Tailwind CSS
│   ├── src/
│   │   ├── api/              # Axios client with single-flight JWT token refresh
│   │   ├── components/ui/    # 15 Shared UI Kit components (icons only, zero emojis)
│   │   ├── features/         # auth, onboarding, connections, digest, archive, settings
│   │   ├── layouts/          # AppShell (glass header, icon rail, mobile bottom bar)
│   │   ├── pages/            # /today, /archive, /connections, /settings, etc.
│   │   ├── store/            # Zustand auth and toast state stores
│   │   └── styles/           # Tailwind tokens, fonts (Inter + Sora), canvas glow
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   └── Dockerfile
├── docker-compose.yml        # PostgreSQL 16, Redis 7, Backend, Celery, Frontend
├── .env.example              # Full environment variable reference (no hardcoded secrets)
└── README.md
```

---

## Global Design System & Tokens

MorningBrief adheres strictly to the defined design system tokens:
- **Primary Indigo**: `#4F46E5` (main), `#4338CA` (hover/dark), `#EEF2FF` (light/tint)
- **Amber Sunrise**: `#F59E0B`, `#FFFBEB`
- **Emerald Accent**: `#10B981`
- **Rose Accent**: `#E11D48`
- **Canvas Background**: `#FAFAF9` with soft ambient canvas glow
- **Typography**: `Inter` (body) & `Sora` (display headers) via `@fontsource`
- **Helpers**: `.tabular-nums` for timers and counters, `.glass-header`, `.glass-card`
- **Iconography**: 100% Lucide React SVG icons (**zero emojis** across all code and copy)

---

## Acceptance Criteria Checklist

| Requirement | Implementation Details | Status |
| :--- | :--- | :---: |
| **Both Apps Boot** | Backend Daphne ASGI + Frontend Vite React 19 | Verified |
| **Health 200 OK** | `/api/v1/health/` returns JSON status 200 | Verified |
| **Design Tokens Exact** | Indigo, Amber sunrise, Emerald, Rose, Zinc, Canvas | Verified |
| **Zero Emojis** | Strictly SVG Lucide icons across UI and typography | Verified |
| **Mobile 360px** | Bottom 4-tab bar (Today, Archive, Connections, Settings), no overflow | Verified |
| **Desktop Rail** | Left icon rail on `lg+` (sticky, tooltips) + Glass Header | Verified |
| **TypeScript Strict** | Clean `tsc --noEmit` with zero errors | Verified |
| **Django Checks** | Clean `python manage.py check` and automated unit tests passing | Verified |

---

## Quickstart with Docker Compose

To launch the full production-ready stack (PostgreSQL, Redis, Daphne Backend, Celery Worker, Celery Beat, and Frontend Nginx):

```bash
# 1. Clone or navigate to the repository
cd Morning-Brief

# 2. Configure environment variables
cp .env.example .env

# 3. Build and launch all services in detached mode
docker compose up --build -d

# 4. View logs
docker compose logs -f
```

The services will be available at:
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000/api/v1/`
- **Interactive Swagger Docs**: `http://localhost:8000/api/v1/docs/`
- **ReDoc Schema**: `http://localhost:8000/api/v1/redoc/`
- **Health Check**: `http://localhost:8000/api/v1/health/`

---

## Local Development Without Docker

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# Linux / macOS
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (defaults to SQLite if no PostgreSQL is running locally)
python manage.py migrate

# Run Django system checks
python manage.py check

# Run automated tests
python manage.py test apps/accounts

# Start development server
python manage.py runserver 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install Node dependencies
npm install

# Run TypeScript strict type-checking
npm run typecheck

# Run Vite development server
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically proxies `/api` requests to `http://127.0.0.1:8000`.

---

## API Endpoints Reference

### Core & Health
- `GET /api/v1/health/` - System health check (status 200)
- `GET /api/v1/docs/` - Interactive Swagger OpenAPI UI
- `GET /api/v1/redoc/` - ReDoc OpenAPI specification
- `GET /api/v1/schema/` - Raw OpenAPI schema

### Authentication & Accounts (`apps.accounts`)
- `POST /api/v1/auth/register/` - Register account with timezone and digest preferences
- `POST /api/v1/auth/login/` - SimpleJWT token pair obtain
- `POST /api/v1/auth/refresh/` - Rotate access and refresh tokens
- `POST /api/v1/auth/blacklist/` - Invalidate refresh token on logout
- `GET/PATCH /api/v1/auth/me/` - Current user account details
- `GET/PATCH /api/v1/auth/profile/` - UserProfile delivery preferences:
  - `timezone` (default: `Asia/Kolkata`)
  - `digest_time` (default: `07:00`)
  - `delivery_channel` (`email` \| `telegram` \| `both`)
  - `telegram_chat_id`
  - `job_hunt_mode` (boolean)
  - `digest_enabled` (boolean)

### Daily Digest (`apps.digest`)
- `GET /api/v1/digest/today/` - Current day's ranked briefing
- `GET /api/v1/digest/` - Historical digests list
- `POST /api/v1/digest/generate/` - Trigger on-demand AI compilation
- `POST /api/v1/digest/items/{id}/toggle-read/` - Mark digest item read/unread
- `POST /api/v1/digest/items/{id}/toggle-archive/` - Archive item

### Data Connections (`apps.connections`)
- `GET /api/v1/connections/` - List user connected channels (Gmail, GitHub)
- `POST /api/v1/connections/{id}/sync/` - Trigger manual source re-sync

### Feedback & AI Engine
- `POST /api/v1/feedback/` - Record user ranking signal (helpful, unhelpful, missed_urgent)
- `GET /api/v1/llm/status/` - LLM engine availability and models

---

## Production SPA Authentication Flow

The frontend Axios client (`src/api/client.ts`) implements a **single-flight queued refresh token interceptor**:
1. When any authenticated API call encounters a `401 Unauthorized`:
2. If another refresh is already in progress, subsequent failing requests are queued into an asynchronous promise array.
3. A single `POST /api/v1/auth/refresh/` is dispatched.
4. Upon receiving the new token pair, the queued requests are retried concurrently with the new Bearer token.
5. If the refresh token is expired or revoked, the queue is aborted and the user is gracefully logged out.
