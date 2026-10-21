# Electronics Quiz (Etalvis)

A web quiz platform for an electronics course. Students take quizzes built from diagram images; instructors upload questions and view analytics; admins manage users, topics, and site settings.

- **Live site:** https://test.etalvis.com
- **Repo:** https://github.com/vyasbalajee/electronics-quiz

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Running locally](#running-locally)
- [Project structure](#project-structure)
- [Common tasks](#common-tasks)
- [How key features work](#how-key-features-work)
- [Deployment (Railway)](#deployment-railway)
- [Conventions & gotchas](#conventions--gotchas)

---

## What it does

- **Roles:** `student`, `instructor`, `admin`. New sign-ups are students by default.
- **Quizzes:** two kinds — a **random** quiz drawn from the whole question bank, and a **topic** quiz that walks one question per difficulty level, easiest to hardest. Answers, timing, and scores are recorded.
- **Auth:** JWT (7-day), email verification via one-time code (OTP), password reset via OTP. Login accepts **username or email**.
- **Instructor tools:** CSV + image upload to add questions, analytics (attempts, average score, per-question difficulty, per-student drill-down), a "Topic Insights" view, and question management.
- **Admin tools:** user/role management, topic CRUD, audit log, and a **maintenance mode** toggle for safe deploys.
- **Theming:** a warm, friendly UI with a **per-user light/dark switch** (bottom-right on every screen). The choice is saved to the user's account (`users.theme_preference`) and cached in `localStorage` so there's no flash on load.

---

## Tech stack

| Layer     | Tech                                                        |
|-----------|-------------------------------------------------------------|
| Database  | PostgreSQL 16 (Docker locally, Railway in production)       |
| Backend   | Node.js + Express (port 4000)                               |
| Frontend  | React (Create React App) + React Router v6 (port 3000)      |
| Images    | Cloudinary (flat storage; DB stores the full image URL)     |
| Email     | Resend (sends from the `quiz.etalvis.com` subdomain)        |
| Hosting   | Railway (3 services: Frontend, Backend, PostgreSQL)         |
| Testing   | Jest (unit) + supertest (API integration) on the backend    |
| CI/CD     | GitHub Actions (tests + build), CodeQL, Dependabot; Railway auto-deploy gated on CI |
| Theming   | CSS custom properties; warm-coral light/dark (per-user)     |

---

## Prerequisites

- **Node.js 18+**
- **Docker Desktop** (for the local Postgres database)
- A **Cloudinary** account (image hosting)
- A **Resend** account + verified sending domain (email OTPs)

---

## Local setup

```bash
git clone https://github.com/vyasbalajee/electronics-quiz.git
cd electronics-quiz
```

You need **three** `.env` files (none are committed — see [Environment variables](#environment-variables)):

1. `.env` in the project root — DB values for `docker-compose`.
2. `backend/.env` — everything the backend needs.
3. `frontend/.env` — the API URL.

Then install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## Environment variables

> Never commit any `.env` file. `.gitignore` already excludes `.env` and `*.env`.

### Root `.env` (used by `docker-compose`)

```
DB_USER=quizuser
DB_PASSWORD=your_local_db_password
DB_NAME=electronics_quiz
```

### `backend/.env`

```
# Database (point at the local Docker Postgres)
DB_HOST=localhost
DB_PORT=5432
DB_USER=quizuser
DB_PASSWORD=your_local_db_password
DB_NAME=electronics_quiz

# Auth
JWT_SECRET=a_long_random_string

# Cloudinary (image hosting)
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Email (Resend)
RESEND_API_KEY=xxx
FROM_EMAIL=noreply@quiz.etalvis.com

# First admin account (used by createAdmin.js)
ADMIN_USERNAME=Etalvis_Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=a_strong_password

# CORS: the frontend origin the backend should allow
FRONTEND_URL=http://localhost:3000
```

### `frontend/.env`

```
REACT_APP_API_URL=http://localhost:4000
```

---

## Running locally

Open **three** terminals:

```bash
# 1) Project root — start the database
docker compose up -d

# 2) backend/ — create tables, seed the admin, run the server
node migrate.js          # creates/updates all tables (safe to re-run)
node createAdmin.js      # creates the admin from ADMIN_* env vars
npm run dev              # starts backend on http://localhost:4000

# 3) frontend/ — start the app
npm start               # opens http://localhost:3000
```

`migrate.js` is **idempotent and self-sufficient** — every statement uses `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`, so re-running it is safe, and it builds the **entire** schema (including the base `questions` / `quiz_sessions` / `responses` tables) from an empty database. It is how you apply schema changes and how a fresh environment (a new dev machine, CI, or disaster recovery) gets set up. The legacy `seed.js` is no longer needed for schema.

To stop the database: `docker compose down` (data is preserved in a Docker volume; add `-v` to wipe it).

---

## Project structure

```
electronics-quiz/
├── docker-compose.yml        # local Postgres
├── .env, .gitignore, README.md, PROJECT_HANDOFF.md
├── .github/
│   ├── workflows/
│   │   ├── ci.yml            # unit + integration tests + frontend build (per push/PR)
│   │   ├── codeql.yml        # CodeQL static security analysis
│   │   ├── db-backup.yml     # scheduled DB backup
│   │   └── cloudinary-sweep.yml # scheduled orphan-image cleanup
│   └── dependabot.yml        # weekly npm + actions update PRs
├── backend/
│   ├── index.js              # Express app (exports app; starts server only when run directly)
│   ├── db.js                 # pg connection pool
│   ├── migrate.js            # full schema (idempotent) — builds a DB from scratch
│   ├── permissions.js        # permission model (presets, overrides, code-lock)
│   ├── permissions.test.js   # unit tests for the permission model (Jest)
│   ├── createAdmin.js        # create the admin account from env vars
│   ├── seed.js               # LEGACY, unused (predates Cloudinary/CSV)
│   ├── email.js              # Resend OTP emails
│   ├── storage.js            # Cloudinary uploads
│   ├── auditLog.js           # audit-log helper
│   ├── maintenance.js        # maintenance-flag helper (cached, fails open)
│   ├── tests/integration/    # supertest API tests (*.int.test.js) — real Postgres
│   ├── middleware/
│   │   ├── auth.js           # requireAuth / requirePermission
│   │   ├── rateLimiter.js    # login/register/OTP limits
│   │   └── maintenanceGate.js# blocks non-exempt requests during maintenance
│   └── routes/
│       ├── auth.js           # register, login, verify, reset, /me
│       ├── session.js        # start/resume quiz, fetch questions, results
│       ├── response.js       # save an answer
│       ├── questions.js      # list/edit/delete questions
│       ├── topics.js         # topics CRUD + quiz-ready topics
│       ├── analytics.js      # instructor analytics + topic/difficulty views
│       ├── users.js          # admin user/role management
│       ├── upload.js         # CSV + image upload
│       ├── auditLogRoute.js  # admin audit-log view
│       └── maintenance.js    # status (public) + toggle (admin)
└── frontend/
    └── src/
        ├── App.jsx           # routes + maintenance gate
        ├── index.js, index.css
        ├── context/AuthContext.jsx   # auth state, role/maintenance polling
        └── components/       # dashboards, quiz, results, auth pages, modals
```

---

## Common tasks

### Add questions (CSV + images)

Log in as an instructor/admin → Instructor panel → upload a CSV plus the referenced image files.

CSV columns:

| Column               | Required | Notes                                                        |
|----------------------|----------|--------------------------------------------------------------|
| `image_filename`     | yes      | Must match an uploaded image file (case-insensitive)         |
| `option_a`…`option_e`| yes      | The five answer choices                                      |
| `correct_option`     | yes      | One of `A`–`E`                                               |
| `video_url`          | no       | YouTube link shown on the results page                       |
| `topics`             | no       | Semicolon-separated; topics are auto-created                 |
| `time_limit_seconds` | no       | Blank = unlimited                                            |
| `difficulty`         | no       | Integer 1–10 (required for a topic to become quiz-ready)     |

Images are uploaded to Cloudinary; the DB stores the resulting URL.

### Make a topic quiz-ready

A topic only appears as a quiz option once it has **at least one question at every difficulty level 1–10**.

### Reset a rate-limit while testing

Login/register/OTP limits are in-memory. Restart the backend (`rs` + Enter under nodemon) to clear the counter. Locally, all logins share one IP, so the shared limit trips fast.

---

## How key features work

- **Auth & roles.** JWT stored client-side; `AuthContext` verifies the token on load and re-checks every 60s (to catch role changes and maintenance mode). Registration requires email verification via OTP before login works.
- **Quizzes.** A session snapshots its question IDs, so resuming shows the same questions (no re-rolling). Random quizzes pull a set from the whole bank; topic quizzes pick one question per difficulty level, easiest to hardest.
- **Maintenance mode.** An admin toggles it from the Admin dashboard. While on, only **admins and test accounts** can use the site; everyone else sees an "Under Maintenance" page. Anyone mid-quiz is allowed to finish before being logged out. The flag lives in the DB (survives restarts/deploys).
- **Timezone.** All timestamps are stored as `timestamptz`; the frontend renders IST via a manual helper.
- **Theming.** `frontend/src/index.css` defines the whole palette as CSS custom properties, with a `[data-theme="dark"]` block overriding the same token names. `AuthContext` holds the theme, sets `data-theme` on `<html>`, caches to `localStorage`, applies the user's saved theme on login, and `PATCH`es `/api/auth/me/theme` when toggled. The quiz diagram box stays light in both themes on purpose (question images have light backgrounds).

---

## Testing & CI/CD

**Tests (backend):**

```bash
cd backend
npm test                 # unit tests (Jest) — pure logic, mocked DB
npm run test:integration # integration tests (supertest) — needs a reachable Postgres
```

- **Unit tests** (`*.test.js`, e.g. `permissions.test.js`) cover pure logic (the permission model) with the database mocked.
- **Integration tests** (`tests/integration/*.int.test.js`) hit the real Express app over HTTP against a real Postgres (login, auth, permission gating). They read DB config from the same `DB_*` env vars; in CI a throwaway Postgres is provided. `backend/index.js` exports the app and only starts the server when run directly, so tests can import it.

**CI (GitHub Actions, `.github/workflows/`):**

- `ci.yml` runs on every push to `main` and every PR: backend unit tests, backend integration tests (against a Postgres service), and the frontend production build. `npm audit` runs as a non-blocking report.
- `codeql.yml` runs CodeQL static security analysis.
- **Dependabot** (`.github/dependabot.yml`) opens weekly PRs for npm (backend + frontend) and GitHub Actions updates.

**Branch protection:** `main` has a ruleset requiring a PR and passing status checks (`Backend — unit tests`, `Backend — integration tests (Postgres)`, `Frontend — build`) before merge. Work on a branch → open a PR → let CI go green → merge.

**CD:** Railway auto-deploys `main`, with **Wait for CI** enabled so a red CI run blocks the deploy.

---

## Deployment (Railway)

Three Railway services: **Frontend**, **Backend**, **PostgreSQL**. Users only reach the frontend (`test.etalvis.com`).

Deploy flow (CI-gated, PR-based):

```bash
git checkout -b my-change
# ...edit...
git commit -am "..."
git push -u origin my-change     # then open a PR; CI must pass before merge
# merging to main triggers the Railway deploy (after Wait for CI passes)
```

After a merge that changes the schema, run the migration on the Railway **backend** service console:

```bash
node migrate.js
```

Set the same environment variables from `backend/.env` and `frontend/.env` in each Railway service's settings. The backend's `FRONTEND_URL` must be the production frontend origin (`https://test.etalvis.com`) for CORS.

---

## Conventions & gotchas

- **Never commit `.env` files, secrets, or database dumps.** `.gitignore` excludes `.env`, `*.env`, `*.sql`, and `*.dump`. If a secret or user data is ever exposed, rotate it (regenerate keys/tokens; force-reset affected user passwords).
- **`main` is protected — use a PR.** Push to a branch, open a PR, let CI pass, then merge. Direct pushes to `main` are blocked for non-admins, and CI must be green to merge.
- **`seed.js` is legacy** — it predates Cloudinary/CSV upload and is no longer needed for schema (`migrate.js` builds everything). Don't use it; use the CSV upload and `createAdmin.js`.
- **Topic-quiz length follows the difficulty scale** (one question per difficulty level, easiest to hardest) rather than a fixed number.
- **Schema changes go in `migrate.js`** using `IF NOT EXISTS` patterns, then run `node migrate.js` locally and on Railway.
- **Two files named `index.js`** (backend entry vs. `frontend/src/index.js`) and **two named `auth.js`** (`middleware/auth.js` vs. `routes/auth.js`) — mind which one you're editing.
- **Railway sets `CI=true`,** so the frontend production build treats ESLint warnings (e.g. unused variables) as **errors**. Keep the code warning-clean or the deploy fails.
