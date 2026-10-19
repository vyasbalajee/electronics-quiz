# Etalvis UI Revamp — Warm Coral (light + dark)

This drop restyles the whole app to the **Warm Coral** theme with a **per-user light/dark
switch**. Extract over your repo root (paths are preserved), then test locally and push.

## IMPORTANT — run the migration after deploying the backend
The theme preference is stored per user, so there's a new column.
On the Railway **backend** console (same as before):

    node migrate.js

This adds `users.theme_preference` (TEXT, default `'light'`). It's idempotent — safe to re-run.
Until it runs, the theme switch still works (it falls back to localStorage), but the choice
won't persist across devices.

## What changed

**Design system (the foundation)**
- `frontend/src/index.css` — rewritten token system. The warm coral palette is mapped onto the
  **same token names** you already used, plus a `[data-theme="dark"]` block. Font is now Nunito
  (body) with Share Tech Mono kept for the ETALVIS badge. Because the tokens drive everything,
  every screen re-skins in both themes automatically.

**Theme switch (new)**
- `components/ThemeToggle.jsx` / `.css` — a light/dark pill, fixed bottom-right, on every screen.
- `context/AuthContext.jsx` — holds `theme` + `toggleTheme`, sets `data-theme` on `<html>`,
  caches to localStorage (no flash), applies the user's saved theme on login/verify, and
  PATCHes it to the server when signed in.
- `backend/routes/auth.js` — `/me` and `/login` now return `theme_preference`; new
  `PATCH /api/auth/me/theme` (token-only) saves it.
- `backend/migrate.js` — adds the column.

**Screens restyled to the approved prototypes**
- Login / Register / OTP / Forgot — ETALVIS badge, rounded cards, coral buttons.
- Student Dashboard — badge bar, warm stat cards, rounded CTA.
- Quiz (QuestionCard) — dashed light diagram box (kept light in BOTH themes, because your
  question images have light backgrounds), circular A–E labels, coral progress + Next.
- Results — animated coral **score ring**, warm question review (kept your question thumbnails).

**Admin / Instructor** — moved to the warm system via tokens (colors, fonts, rounding, dark mode).
Their table/form structure is unchanged. Off-brand blue/amber accents were converted to tokens.

## One thing to check yourself
The **diagram box stays light in dark mode** on purpose (your PNGs are light). Once we clean the
PowerPoint backgrounds to transparent, we can make that box fully theme-aware.

## Not built-verified
As always, this is review- + parse-verified (esbuild on every JSX/JS file, CSS brace balance,
and a token audit confirming every `var(--x)` resolves in both themes). Build it locally
(`npm start`) before pushing, and spot-check the theme toggle on a couple of screens.
