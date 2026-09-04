# Electronics Quiz — Project Handoff

Paste this whole document into a new Claude chat to bring it up to speed. It captures the architecture, key decisions, conventions, and exactly where the build is.

_Last updated: after operational hardening. DONE: secret rotation (#14), DB password rotation, automated daily backups (#9, GitHub Action, restore-verified). Remaining: #8 DMARC (minor), parked #17, shelved #7. All features prod-verified._

---

## What this project is

"Electronics Quiz" — a web quiz platform for an electronics course. Questions are circuit-diagram images (Ohm's Law problems); each has 5 options (A–E) and a correct answer stored as a **label** ('A'–'E'), never an index. Quizzes are 10 questions. Brand: **Etalvis**.

Owner is a **beginner** developer on **Windows**, located in **Chennai / IST**. Give exact commands, explain concepts simply, and work in the collaborative pattern described below.

---

## Working conventions (IMPORTANT — follow these)

**The owner wants an advisor, not a yes-man.** Every reply must:
1. Not start with agreement — first sentence challenges an assumption, points out what's missing, or exposes a gap.
2. Tag claims `[Certain]` / `[Likely]` / `[Guessing]`.
3. Never use these phrases: "Great question", "You're absolutely right", "That makes a lot of sense", "Absolutely", "Definitely".
4. Disagree with structure: "I disagree because [reason]. Here's what I'd do instead [alternative]. The risk in your approach is [downside]."
5. Lead with the uncomfortable truth in the first line.
6. No warm-up paragraphs.
7. Hold position under pushback unless given genuinely new information.

**Build/deploy workflow:**
- Claude edits files in its container, zips them, shares via a download link.
- **Zip structure convention (as of suggestion #1):** zips MIRROR the real project tree (e.g. `frontend/src/components/QuizPage.jsx`, `backend/routes/session.js`), so the owner extracts over the project root and files land in place.
- Owner replaces files locally, tests, then pushes to GitHub.
- For schema changes, owner runs `node migrate.js` on the Railway backend console after deploy.
- **The container filesystem resets between sessions** — the authoritative code lives on the owner's machine + GitHub, NOT in Claude's container. Claude cannot access GitHub directly (no connector, no network for arbitrary fetches). To work on current code, the owner must upload the files into the chat.
- **Two-store gotcha:** files uploaded into a chat and any older "project knowledge" snapshot are SEPARATE. Trust freshly uploaded files (read from disk), not stale snapshots. When told files are missing, verify against the actual uploads on disk before claiming so.
- Claude has no network access in the container (can't `npm install` or build) — verify code by review, not execution. Deliverables are **review-verified, not build-verified**; owner runs `npm start` to catch compile errors.

**Handoff convention (as of suggestion #1):** at the END of every completed suggestion, Claude regenerates and delivers this `PROJECT_HANDOFF.md`. Owner pushes it to GitHub and keeps it current. (Claude cannot edit files silently between turns — it regenerates the full doc on request/completion.)

---

## Tech stack & architecture

- **DB:** PostgreSQL. Local via Docker (`docker compose up -d` from root; container `electronics-quiz-db-1`). Prod on Railway.
- **Backend:** Node.js + Express, port 4000.
- **Frontend:** React (react-scripts) + **React Router v6**, port 3000.
- **Images:** stored FLAT in Cloudinary (folder `electronics-quiz`); DB stores the full Cloudinary URL in `image_filename`. DECISION: keep file storage flat/dumb, organize via DB only — never via Cloudinary folders. (The legacy `/images` static route and `seed.js` are unused.)
- **Deploy:** Railway, 3 services (Frontend, Backend, PostgreSQL). Users only see the frontend. Railway auto-deploys on push (restarts the backend).
- **Email:** Resend, sending from subdomain `quiz.etalvis.com` (verified via GoDaddy DNS — DKIM TXT, SPF MX, SPF TXT on the subdomain; no DMARC yet). `FROM_EMAIL=noreply@quiz.etalvis.com`.
- **Custom domain:** `quiz.etalvis.com` attached to the Railway **frontend** service (CNAME + TXT via GoDaddy, SSL issued). Backend `FRONTEND_URL` = `https://quiz.etalvis.com` for CORS.

**Local run sequence:** Terminal 1 (root): `docker compose up -d`. Terminal 2 (backend): `npm run dev`. Terminal 3 (frontend): `npm start`. Three `.env` files: root (DB vars for docker-compose), `backend/.env` (DB + JWT_SECRET + Cloudinary + Resend + ADMIN_* vars), `frontend/.env` (`REACT_APP_API_URL`).

**GitHub:** https://github.com/vyasbalajee/electronics-quiz . Push auth: use a valid PAT. **Recommended:** remote WITHOUT embedded token + `git config --global credential.helper manager` (Windows Credential Manager holds the token) so the token never lives in the URL/history.

**Admin account:** username `Etalvis_Admin`.

---

## Folder structure

```
electronics-quiz/
├── docker-compose.yml, .env, .gitignore, README.md (README is STALE — ignore it)
├── backend/
│   ├── index.js, db.js, migrate.js, seed.js (legacy/unused),
│   │   auditLog.js, createAdmin.js, email.js, storage.js, package.json, railway.json
│   ├── middleware/  → auth.js (requireAuth/requireRole), rateLimiter.js
│   └── routes/      → analytics.js, auditLogRoute.js, auth.js, questions.js,
│                      response.js, session.js, topics.js, upload.js, users.js
└── frontend/
    ├── package.json (react-router-dom ^6), railway.json (serves with `npx serve -s build`), .npmrc
    └── src/
        ├── App.jsx (React Router setup), index.js, index.css
        ├── context/AuthContext.jsx
        └── components/ → LoginPage, RegisterPage, OTPVerification, PasswordField (NEW),
             AdminDashboard, InstructorDashboard, InstructorPage, StudentDashboard,
             QuizPage, ResultsPage, QuestionCard, Results, VideoModal, ImageModal,
             (+ legacy unused: LandingPage, QuizStart) and their .css files
```

---

## Database schema (current, after all migrations incl. topic quizzes)

- **users**: id, username (unique), email (unique), password_hash, role ('admin'|'instructor'|'student'), email_verified bool, is_test_account bool, created_at (timestamptz)
- **questions**: id, image_filename (Cloudinary URL), option_a–e, correct_option ('A'–'E'), video_url, time_limit_seconds (int, null=unlimited), difficulty (int 1–10, nullable)
- **quiz_sessions**: session_id (uuid), question_ids (int[]), user_id, created_at (timestamptz), status ('in_progress'|'completed'), is_preview bool, **quiz_type ('random'|'topic')**, **topic_id** (FK topics)
- **responses**: id, session_id, question_id, chosen_option, time_taken_seconds, answered_at (timestamptz), UNIQUE(session_id, question_id)
- **topics**: id, name (unique), created_by, created_at
- **question_topics**: (question_id, topic_id) many-to-many
- **otps**: id, email, otp, type ('email_verification'|'password_reset'), expires_at, used, created_at
- **audit_log**: id, user_id, action, target_type, target_id, details (jsonb), created_at (timestamptz)

**Timezone note:** all timestamp columns are `timestamptz`. Frontend uses a manual `formatIST()` helper (adds +5:30 via arithmetic) in AdminDashboard/InstructorDashboard/StudentDashboard. `migrate.js` re-runs `ALTER COLUMN ... TYPE TIMESTAMPTZ ... AT TIME ZONE 'UTC'` every run — safe ONLY because the Railway Postgres session is UTC. (Root cause of the old TZ bug: `timestamp without time zone` + a drifted Docker container clock, fixed via `wsl --shutdown` + container recreate.)

---

## Features built (all deployed & working)

Core quiz; JWT auth (7-day, roles, stateless — no server-side session or activity tracking); email verification (mandatory OTP) + password reset via OTP; instructor CSV+image upload to Cloudinary (columns: image_filename, option_a–e, correct_option, video_url, topics [semicolon-separated, auto-create], time_limit_seconds, difficulty); instructor analytics (attempts, avg score, per-question difficulty, student list + per-attempt drill-down with timing); question management (edit/delete with response-count confirmation, topic assignment, search + pagination); per-question timer; topics (admin CRUD + instructor assignment + CSV auto-create); YouTube video explanation modal on results; student dashboard (stats + history + view past results); print results; click-to-enlarge images; rate limiting (login 5/15min, register 5/hr, OTP 3/hr); test-account flag (excluded from analytics); audit log (admin-only, IST timestamps); last-admin safeguard; auto-expire abandoned sessions (>2hr); hourly OTP cleanup; session locking/resume; live role re-verification (`/api/auth/me` returns `tokenStale`; AuthContext forces re-login on role change, on load + 60s interval); student-view preview mode (admin/instructor, orange banner, `is_preview`, excluded from analytics); difficulty column (1–10); React Router (protected/role-gated routes).

### DONE — Topic-based quizzes (suggestion #3, all 3 stages, pushed + migrated + tested)
- **Backend (Stage 1):** `session.js` POST accepts `quiz_type='topic'` + `topic_id`; verifies the topic is quiz-ready (≥1 question at EVERY difficulty 1–10), then picks ONE RANDOM question per level 1→10 ascending and snapshots them in `question_ids` (resume shows the same 10 — no re-roll). Resume match keys on quiz_type AND topic_id. Random path unchanged. New `GET /api/topics/quiz-ready` (topics with a question at every level 1–10). New `GET /api/analytics/topics-difficulty` returning four views.
- **Frontend (Stage 2):** `QuizPage` reads `?type=topic&topic=<id>` and sends `quiz_type`/`topic_id` (deps include them); preview stays random-only. `StudentDashboard` "Take a Quiz" opens a picker modal (Random + quiz-ready topics from `/api/topics/quiz-ready`); topic → `/quiz?type=topic&topic=<id>` (auto-starts). Only fully-populated topics appear.
- **Frontend (Stage 3):** New **"Topic Insights"** tab in `InstructorDashboard` rendering the four views: (1) avg score by difficulty [ALL quizzes], (2) avg score by topic [TOPIC QUIZZES ONLY], (3) topic × difficulty heat grid [ALL quizzes], (4) most-missed question per level [ALL quizzes]. Views labeled with scope.
- **KNOWN DESIGN NOTE:** view 1 (per_topic) counts only `quiz_type='topic'` sessions; views 2–4 count all sessions. Labeled in the UI. If undesired, widen the `per_topic` query in `analytics.js` (a 1-line Stage-1 change). Postgres returns `ROUND(...)` percentages as strings — frontend coerces with `Number()`.
- **TEST DEPENDENCY:** the topic picker + insights only populate when a topic has a question at every difficulty 1–10 and has been quizzed.

### DONE — Password field enhancements (suggestion #1, pushed + tested)
- New reusable `frontend/src/components/PasswordField.jsx` (+ styles in `AuthPages.css`), used in `LoginPage`, `RegisterPage`, `OTPVerification` (reset flow).
- **Show/hide toggle:** inline SVG eye icons (no new dependency). **Action-based** (owner's confirmed preference): OPEN eye when hidden (click to reveal), SLASHED eye when visible (click to hide). Colored with accent teal `--accent` for visibility. Toggle is `type="button"` (won't submit the form), `tabIndex={-1}`.
- **Caps Lock warning:** shows "⚠ Caps Lock is on" while typing (browser only exposes caps state via keydown/keyup, so it appears on first keystroke, not on focus — a browser limitation, not a bug).
- Added `autoComplete` hints (`current-password` / `new-password`).

---

## KEY BUGS FIXED (so they don't recur)

- **CSV symbols (Ω, µ) showed as `?`/hex** → UTF-8 + `bom:true` in csv-parse.
- **Login failing on deploy** → JWT_SECRET not set on Railway.
- **Registration "failed to fetch"** → FRONTEND_URL not set (CORS); hit again when custom domain went live (fix: update FRONTEND_URL).
- **Reset code not arriving** → Resend free shared domain only sends to account owner → fixed via subdomain verification.
- **Timezone bug** → see timezone note above.
- **"Take Quiz" button dead** → click event passed as `preview` arg then `JSON.stringify` threw on circular ref. FIX: `onStartQuiz()` not `onStartQuiz`, and coerce `preview === true`.
- **Role change crash (blank page after promotion)** → stale student token, analytics 403'd, `.map()` on undefined. FIX: `/api/auth/me` returns `tokenStale`; AuthContext forces logout+re-login; analytics hardened. (`roleChangedMessage` IS rendered in `LoginPage` — confirmed working.)
- **GitHub push auth failure** → PAT in remote URL invalid/expired. FIX: regenerate PAT; prefer credential-manager over embedded-URL token.

---

## PENDING SUGGESTIONS (owner adds to this; implement when asked)

Approved sequence was 2 → 5 → 3 → 1 → 4. **#2, #5, #3, #1 = DONE.** Remaining:

Approved sequence was 2 → 5 → 3 → 1 → 4. **#2, #5, #3, #1, #4 = DONE** (#4 built + delivered, pending owner test/push). Remaining:

4. ~~UI decluttering~~ **DONE** — Users table: collapsed Verified/Test into one Status column (verified ✓/✗ icon + TEST/REAL toggle pill), dropped redundant Role badge column (kept dropdown), removed unused `roleBadge` helper, added responsive card layout below 640px (fixes horizontal overflow). Question edit form: options in 2-col grid (E full width), secondary fields (Correct Option, Difficulty, Time Limit) in compact 3-across row + Video URL full width, collapses to 1 col below 560px. Owner NOTE: Joined column was KEPT (owner said "reconsider") — can be dropped if still cluttered.
6. ~~Login with email OR username~~ **DONE (pending owner test/push)** — login query matches `username = $1 OR email = $1`; field relabeled "Username or Email" (kept `type="text"`). Edge case: a username identical to another user's email string could mis-match (won't happen in practice — emails have `@`). Files: `backend/routes/auth.js`, `frontend/src/components/LoginPage.jsx`.
7. **"Questions per quiz" config value** — centralize the hardcoded 10. **STATUS: built once, then SHELVED at owner request — revisit later.** DESIGN NOTE (so we don't re-litigate): the "10" is TWO things — (a) random quiz length (`session.js` random `LIMIT 10`) is genuinely configurable; (b) topic quiz length is STRUCTURALLY 10 (one question per difficulty level 1-10) and canNOT change without adding difficulty levels. A prior build centralized (a) via `backend/config.js` (`QUESTIONS_PER_QUIZ`, env-overridable) + `frontend/src/config.js` (`REACT_APP_QUESTIONS_PER_QUIZ`) used in StudentDashboard's "/N" display, left (b) untouched. Two env vars must agree. That zip was NOT shipped. Reuse or rethink when revisited.
8. **DMARC record** for email deliverability on quiz.etalvis.com.
9. **Database backup strategy** on Railway (no backups currently — risk).
10. ~~Python bulk-upload script~~ **DONE (verified in prod — standalone external kit)** — NOT a repo drop-in; it's for a THIRD PARTY who has none of the project code (e.g. a content person uploading questions). Kit folder `question-uploader/`: `upload_questions.py`, `README.txt` (plain-English, non-dev), `sample_questions.csv`, `requirements.txt`. Script logs in, auto-discovers CSV-referenced images from a folder, POSTs CSV+images to `/api/upload`. Args: --csv, --images, --url, --username, --yes. Has a `DEFAULT_BACKEND_URL` constant OWNER MUST SET to the prod BACKEND url before sharing (else prompts). getpass password, pre-flight prints UPLOADING TO + y-confirm. SECURITY NOTE: upload needs instructor/admin role, so the uploader gets instructor access (can see analytics/student list) — owner should make a dedicated disposable instructor account; an 'upload-only' role would be a separate build. Overlaps #17d seeding.
11. ~~Registration email validation~~ **DONE (verified in prod)** — validate format + domain MX (can't guarantee inbox exists without sending).
12. _(reserved / not used)_
13. ~~"Under maintenance" protocol (admin-only)~~ **DONE (verified in prod)**.
    - **Exempt:** admins (full access) + **test accounts**. Everyone else blocked/logged out.
    - **State:** DB-persisted single-row `maintenance` table (id=1: enabled, set_by, set_at).
    - **Stage A files (backend):** `maintenance.js` (flag helper, 3s cache, fails OPEN), `middleware/maintenanceGate.js` (gate: exempts admin/test, allows `/status`+`/login`+`/me`, allows in-progress quiz finish via `POST /api/response` + `GET /api/session/:id/*`, blocks `POST /api/session` and everything else with 503), `routes/maintenance.js` (`GET /status` public, `POST /` admin toggle → audit_log), `migrate.js` (table), `index.js` (wires gate before routes), `routes/auth.js` (login blocks non-exempt; `/me` returns `maintenance` + `is_test_account`). NO-DOWNTIME deploy (fails open if table missing). **REQUIRES `node migrate.js` on Railway or the toggle silently no-ops in prod.**
    - **Stage B files (frontend):** `MaintenanceDialog.jsx/.css` (full-page dialog + "Staff sign in"), `AuthContext.jsx` (reads maintenance from `/me` poll + `/status` for visitors; `enterQuizFlow`/`exitQuizFlow` COUNTER defers logout until quiz+results done; exposes `maintenance`, `setMaintenance`, `quizInProgress`), `App.jsx` (`MaintenanceGate` wraps routes), `QuizPage.jsx` + `ResultsPage.jsx` (enter/exit flow on mount/unmount), `AdminDashboard.jsx/.css` (Start/End Maintenance button + "ON" banner).
    - **KNOWN LIMITATIONS:** (1) a non-exempt student who REFRESHES mid-quiz during maintenance gets locked out (flow counter resets to 0 on load). (2) a logged-out visitor on the dialog must refresh to recover after maintenance ends (dialog doesn't poll).
    - **GOTCHA fixed during build:** an `// eslint-disable-next-line react-hooks/exhaustive-deps` comment failed the CRA build because that rule isn't registered in this project's ESLint config — do NOT add rule-specific eslint-disable comments here.

14. **Rotate leaked secrets** — regenerate + invalidate JWT_SECRET, Cloudinary key+secret, Resend key, DB password, ADMIN_PASSWORD, and the GitHub PAT (all exposed in-chat during setup). Operational task done in each dashboard, not a code build. GitHub PAT + DB password are the two that actually matter. STILL OUTSTANDING unless done.
15. ~~Rewrite the stale README~~ **DONE (built, pending push)** — new onboarding README (setup, env vars, structure, deploy, gotchas). Placeholders only, no secrets. Omits QUESTIONS_PER_QUIZ (#7 shelved).
16. ~~Trust proxy for rate limiting~~ **DONE (verified in prod)** — behind Railway's proxy, `express-rate-limit` keys every user to the proxy's IP, so real users rate-limit each other (or the limit becomes meaningless). Fix: `app.set('trust proxy', 1)` in `index.js`, verify limits behave per-user in prod. (Also why local testing trips the limit fast — all localhost logins share one IP; restart the backend to clear the in-memory counter.)
17. **Comprehensive testing environment** — LARGE, multi-stage (bigger than #13). Parked; owner to sequence. Parts: (a) **staging environment** — separate Railway deploy with own DB/Cloudinary/Resend so migrations + maintenance + risky changes are tested off live data (highest practical value; overlaps #9 backups + #13); (b) **backend tests** — Jest + Supertest for auth, sessions, scoring, upload validation, maintenance gate, role perms (needs test DB + fixtures); (c) **frontend tests** — React Testing Library for auth flows, quiz-taking, maintenance dialog; (d) **test data seeding** — script to populate a known-state DB (users across roles, fully-populated topics across difficulty scale, sample questions) — OVERLAPS #10, reuse it; (e) **CI** — GitHub Actions running (b)/(c) on push before deploy. Recommended start: (a) staging or (d) seeding, not the test suites.

Also open: topic-based quizzes could later allow topic **preview** for instructors (currently preview is random-only).

---

## UNRESOLVED / LOOSE ENDS

- **Rotate leaked secrets.** During setup, `.env` (JWT_SECRET, Cloudinary, Resend, DB password, ADMIN_*) and a GitHub PAT were shared into a chat. Rotate: JWT_SECRET (logs out all users — fine), Cloudinary keys, Resend key, DB password, and **revoke/regenerate the GitHub PAT**. STILL OUTSTANDING unless done.
- **README.md is stale** — describes the old seed.js/local-images flow. Ignore it or rewrite; low priority.
- **No DB backups on Railway** (suggestion #9) — real data-loss risk.

---

## Immediate next action

The originally-approved sequence plus #6 and #13 are all built. Remaining buildable code suggestions: #7 (centralize hardcoded "10"), #11 (registration email validation), #15 (rewrite README), #16 (trust proxy — small, in `index.js`). Operational (not code builds): #8 (DMARC), #9 (DB backups — highest-priority risk), #14 (rotate leaked secrets). No fixed order — owner picks. If starting fresh: upload the relevant current files, confirm they match the repo (WATCH FOR DRIFT — many files changed across suggestions; also note filename collisions on upload: two `index.js`, two `auth.js` — verify which is which before editing), then build.

## Current outstanding owner actions (as of last update)
- **All built features verified in prod** (#1-#6, #10, #11, #13, #15, #16, Provisioning, header-spacing).
- **#14 DONE** — all leaked secrets rotated: GitHub PAT, JWT_SECRET, Cloudinary key+secret, Resend key, ADMIN_PASSWORD, and the DB password. NOTE: backend connects via discrete `DB_HOST/DB_USER/DB_PASSWORD/DB_NAME` vars on the BACKEND service; `DB_PASSWORD` there is the one that matters (Postgres service PGPASSWORD/POSTGRES_PASSWORD/DATABASE_URL references were side quests). To rotate again: `ALTER USER` on the DB + update backend `DB_PASSWORD` + redeploy.
- **#9 DONE** — automated daily backups via GitHub Action (`.github/workflows/db-backup.yml`), pg_dump over `DATABASE_PUBLIC_URL` (stored as GitHub secret), 30-day artifacts, small-file guard. Restore verified against a throwaway local Postgres. Runs need the PAT to have `workflow` scope.
- **Public endpoint: still OPEN by design** (Path A) — required so the external GitHub Action can reach the DB. Acceptable given the strong rotated password. Closing it would require moving backups inside Railway (cron + off-site storage) or going Railway Pro (native backups).
- **Remaining:** #8 DMARC (minor email-deliverability polish, operational). Parked: #17 (testing environment). Shelved: #7 (questions-per-quiz config).
- Backups contain PII (user emails + bcrypt hashes) in GitHub artifacts on the private repo — acceptable for now; upgrade path is dumping to R2/B2/S3.


## New suggestions backlog (added after operational hardening; older list all shelved/done)

**Immediate work queued (before the backlog below):**
- **A. Fix question-upload error** — DONE (prod-tested). Root cause: the rotated Cloudinary API key had only view/download access, not upload → Cloudinary returned 403 per image (auth OK, write forbidden). Fix: grant the key full/upload access. LESSON: Cloudinary keys can be permission-restricted; a signed upload with a read-only key = 403, not 401.
- **B. Version number** — DONE + prod-verified. `frontend/src/version.js` (APP_VERSION single source of truth), VersionBadge.jsx/.css (fixed top-right, 11px grey, pointer-events:none), rendered in App.jsx on every page. Bump = edit version.js one line. NOW AT v1.1 (bumped from 1.0 for the permissions release; 1.1 chosen over 1.01 since it's a feature, not a patch).
- **C. Permissions system** — Stage 1 (backend engine) DONE + prod-verified. `permissions.js` (leaf perms grouped in CATEGORIES: Users/Questions/Topics/Analytics/Site/Quizzes; fixed PRESETS admin=all, instructor=questions+topics+analytics+provision+take, student=take; CODE_LOCKED=['users.manage_permissions']; getEffectivePermissions = preset +/- overrides). migrate.js adds user_permission_overrides(user_id,permission,granted). middleware/auth.js adds requirePermission (coexists with requireRole; checks effective perms per-request so overrides apply w/o re-login). users.js adds GET /me/permissions, GET/POST/DELETE /:id/permissions (admin-only, code-lock enforced server-side). upload.js swapped to requirePermission('questions.upload') as proof. Also: rate limiter now skipSuccessfulRequests (only failed logins count).
  - Stage 1b DONE + prod-verified: swapped requireRole->requirePermission on ALL routes (users, questions, maintenance, topics, analytics, auditLogRoute, session; upload done in Stage 1; response.js untouched - was requireAuth-only). requireRole REMOVED from middleware/auth.js entirely (exports requireAuth + requirePermission only). Mappings: users provision->users.provision, list->users.view, role+test-flag->users.change_role, delete->users.delete; questions list/edit/response-count->questions.edit, delete->questions.delete; maintenance POST->maintenance.manage; topics create->topics.create/delete->topics.delete/question GET+PUT->topics.edit; analytics overview+topics-difficulty->analytics.view, students+history->students.view; audit->audit.view; session start+my/history->quizzes.take. BEHAVIOR CHANGES (accepted): instructors GAINED topic create/delete (matches preset); test-flag->users.change_role (judgment call). No migration (table from Stage 1). Verified: revoke quizzes.take from a student -> 403 on quiz start + history immediately; all roles normal actions work; instructor topic mgmt works.
  - Stage 2 (admin UI) DONE + prod-verified: PermissionsPanel.jsx/.css (new) + per-row "Permissions" button in AdminDashboard Users table opens a contextual view. Shows leaf perms grouped by category, checkbox = effective state, source label (from preset / granted override / revoked override / not in preset), reset link clears an override (DELETE), users.manage_permissions shown but locked. Reads GET /:id/permissions. No migration.
  - PERMISSIONS SYSTEM COMPLETE end-to-end (engine + enforcement + UI), all prod-verified.

**New improvement suggestions (N1-N5):**
- **N1. Observability** (aspect: monitoring) — `/health` endpoint (checks DB), Sentry error tracking (backend+frontend), UptimeRobot uptime monitor. Biggest operational blind spot now that backups/secrets done. Low effort, high impact.
- **N2. Accessibility for image-based questions** (aspect: frontend/UX) — questions are images with no text alternative; screen-reader users / failed image loads = can't take quiz. Add optional per-question text/alt field, keyboard nav, contrast, graceful image-fail. WCAG/ADA relevance for a university tool. Moderate effort, high impact.
- **N3. Cloudinary image lifecycle / orphan cleanup** [DONE — prod-verified] — Stage 1 (A1) DONE + prod-verified: added `cloudinary_public_id` column (migrate.js), storage.js returns {url, publicId} + deleteImage() helper, upload.js stores public_id, questions.js delete route destroys the image (best-effort, DB-row-first). New questions self-clean on delete. NOTE: needed `node migrate.js` on Railway. Cloudinary key needs upload AND destroy permission. Stage 2 (merged B2/B3) DONE + prod-verified: standalone `scripts/cloudinary-sweep.js` + `.github/workflows/cloudinary-sweep.yml`. Lists Cloudinary electronics-quiz folder, compares vs DB (protects images referenced by cloudinary_public_id OR derived-from-URL, so pre-A1 rows are safe), deletes orphans. Weekly Sun 09:00 UTC auto-deletes; manual runs dry-run by default (confirm input). Safety guard: refuses to delete if referenced=0 (failed-read protection). Runs over DATABASE_PUBLIC_URL; needs CLOUDINARY_* GitHub secrets + Admin API list/delete permission. First dry-run verified: 11 images, 6 referenced (=6 questions), 5 orphans. (aspects: content, data) — delete Cloudinary image when question deleted (store public_id + destroy API); one-time script to purge existing orphans from past deletes + prod wipe. Repeatedly flagged. Low effort, moderate/growing impact.
- **N4. Student progress & answer review** (aspects: quiz engine, UX, analytics) — post-quiz: show which questions were wrong + correct answer + video; progress view (score trend, mastery by topic/difficulty). Highest product value; response data already stored. Moderate effort, high impact.
- **N5. Dependency & security hardening** (aspect: security) — Dependabot, npm audit + patch, helmet HTTP headers, confirm CORS locked to frontend origin. Automated version of the manual secrets rotation. Low effort, moderate-high preventive impact.
- **(Parked) #17 automated testing** — still the biggest quality gap; pragmatic slice = backend API tests for auth/scoring/provisioning.

**Suggested order:** N1 -> N5 -> N4 -> N3 -> N2.

**Full aspect map (for categorizing future work):** 1 quiz engine, 2 content/media, 3 users/auth/access, 4 frontend/UX, 5 analytics, 6 backend/API, 7 data/DB, 8 email, 9 devops/infra, 10 observability, 11 security, 12 performance, 13 testing, 14 docs.

## v1.1 release (permissions) — SHIPPED + prod-verified
- version.js -> '1.1'. WhatsNew.jsx/.css: one-time "What's New" popup after login, gated per-browser via localStorage key `whatsNewSeenVersion` (shows again on next version bump). Rendered in App.jsx next to VersionBadge; only fires when logged in. To update for future releases: bump version.js + edit the notes list inside WhatsNew.jsx. Notes source-of-truth also in WHATS_NEW_v1.01.md (retitle to 1.1).
- CACHE FIX (SHIPPED): frontend served via `npx serve -s build -l $PORT` (set in frontend/railway.json). Added frontend/serve.json: index.html -> `no-cache, no-store, must-revalidate` (browsers re-check every visit, so new deploys reach users on next page load), hashed js/css/images -> `public, max-age=31536000, immutable`. Forward-looking (a browser holding the OLD index.html revalidates once, then current). This is why a fresh deploy no longer shows a stale version badge. Verify: Network tab -> index.html response headers show the no-cache value.
- (Pre-fix note, still true for browsers with a warm cache from before the fix: check incognito before assuming a deploy failed.)
- Rate limiter: loginLimiter now skipSuccessfulRequests (only failed logins count) — shipped this release too.

## NEXT BATCH (approved, in order) — then v1.2 release
Order: #3 -> #2 -> #4, then bump to v1.2 (version.js + What's New notes + handoff update covering everything).
- **#3 Enable/disable per question** [DONE + prod-verified]: `enabled BOOLEAN DEFAULT TRUE` (migrate.js, needed node migrate.js). session.js excludes disabled from random pick + topic per-difficulty pick + quiz-ready check. DEDICATED `PATCH /api/questions/:id/enabled` endpoint (requirePermission questions.edit) — separate from edit PATCH to avoid wiping video_url/time_limit/difficulty (those are set directly not COALESCE'd). InstructorDashboard Questions tab: Disable/Enable button per row + 'Disabled (hidden from quizzes)' badge + dimmed image. Students mid-quiz unaffected (snapshot).
- **#2 Filter question list** [DONE + prod-verified]: SERVER-SIDE combinable filters on GET /api/questions — topic (EXISTS subquery so it doesn't disturb topics json_agg), difficulty (=), time (has: time_limit>0 / none: null-or-0), all AND + search (now also matches topic names). Frontend Questions tab reworked: client-side search/slice REPLACED with server-side search+filters+pagination (was loading only 100 -> missed questions past #100). Filter bar (topic/difficulty/time dropdowns + Clear), debounced refetch, server pagination via questionPage/questionTotalPages. No migration.
  - DEPLOY INCIDENT (resolved): after the #2 push the FRONTEND 502'd on everything (incl favicon) = serve not listening. ROOT CAUSE was NOT #2 code (build succeeded). Start command `npx serve` downloaded serve@latest at EVERY container start (never a dependency); the #2 push forced a fresh container start which re-ran that boot-time download, and it failed. FIX: `cd frontend && npm install serve --save` so serve is baked into the image at build time (no runtime download). LESSON: anything fetched at runtime vs build time is a latent outage that surfaces on the next restart; a deploy is the moment boot-time downloads get re-exercised.
- **#4 Version notes button + changelog.view** [DONE + prod-verified]: added `changelog.view` to permissions.js Site category (admin preset only via ALL_PERMISSIONS; grantable to others via panel; NOT code-locked). VersionNotes.jsx/.css (new) = global top-right button shown only if effective perms include changelog.view (checked via GET /me/permissions); opens modal with history by version (v1.2/v1.1/v1.0) in plain functional language. Rendered in App.jsx next to VersionBadge. No migration.
- **#1 Topic-restricted quiz URLs** [DEFERRED]: design fork unresolved (soft assignment link vs global assignment mode vs per-student lock). Revisit later.
- **v1.2 release** [DONE]: version.js -> '1.2'; WhatsNew.jsx popup notes updated to the v1.2 batch (enable/disable, filters, version notes). VersionNotes modal already carries the full v1.0/1.1/1.2 history. All of #3/#2/#4 prod-verified.

## AUDIT BACKLOG (owner requested a project-wide loophole/scale review, like the serve issue)
Findings so far (from files seen this session + architecture; NOT a full line-by-line pass):
- requirePermission queries user_permission_overrides on EVERY protected request -> DB load multiplier at scale; fix later via caching / JWT-embedded perms with version bump.
- Public DB endpoint still OPEN (biggest attack surface); backups + Cloudinary sweep depend on it (closing it silently breaks both).
- No helmet, no dependency scanning (N5 open). No JWT server-side revocation (leaked token valid until expiry; role change relies on staleness check).
- Analytics queries are heavy multi-joins with likely-missing indexes (responses(session_id), responses(question_id), question_topics(topic_id)) -> slow at thousands of responses.
- Cloudinary sweep lists whole folder each run (fine now).
- No observability/error tracking/health check (N1) -- owner has hand-diagnosed 500/CORS/cache/502 this project. TOP recommendation.
- No automated tests (#17).
- NEED for full audit: index.js, db.js (pool config), both package.json (dep versions), InstructorPage.jsx, QuizPage.jsx -- not yet seen.

