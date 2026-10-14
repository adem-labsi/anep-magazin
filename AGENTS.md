# AGENTS.md — ANEP Magasin

Handoff notes for AI coding agents (opencode, Claude, etc.). Read this before editing.

## What this project is

A port of the standalone file `magasin.html` into a modern stack:

- `backend/` — Django + Django REST Framework + PostgreSQL (`stock` app).
- `frontend/` — Next.js 14 (App Router, TypeScript, React 18).
- Container orchestration: `docker-compose.yml` (dev, sources mounted) and
  `docker-compose.deploy.yml` (gunicorn, `DJANGO_DEBUG=0`).

Goal: feature parity with `magasin.html` (stock management: articles, entrées,
sorties, ajustements, inventaires, mouvements, alertes, bons, audit, users,
backup) with a clean, typed codebase.

## Golden rules

1. **No behavior changes without reason.** The frontend was refactored from one
   1200-line `page.tsx` into typed modules/hooks. Preserve API calls, filters,
   toasts, confirmations and print/export output.
2. **CSS class contract.** `app/globals.css` and the print CSS depend on exact
   class names and IDs: `module-*` section ids, `loginScreen`, `btn`/`btn <variant>`,
   `small`, `no-print`, `badge ok|warn|danger|info`, `card`, `prix-cell`,
   `total-cell`, `toast show`, `modal-overlay show`, `modal`, `modal wide`. Do not
   rename them.
3. **No comments** in code unless asked.
4. **No new dependencies** without asking. The frontend intentionally has only
   Next/React/TypeScript + Vitest/Testing Library.
5. **Never commit** unless the user explicitly asks.

## Commands

```bash
make test          # backend (40) + frontend (43), writes test.log in each dir
make build         # build both compose images
make dev           # dev stack up (auto-runs `seed_data` on backend start)
make seed          # dev container: `seed_data --reset` (wipe ops, keep users, reseed)
make deploy        # prod stack up --build
make down / logs / ps
```

Frontend-only, from `frontend/`:

```bash
npm run dev            # dev server
npx tsc --noEmit       # typecheck (must stay clean)
npm run build          # production build (runs ESLint + type check)
npm test               # vitest run
```

Backend-only, from `backend/`:

```bash
.venv/bin/python manage.py test -v 2
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_data            # idempotent (per-section count guards)
.venv/bin/python manage.py seed_data --reset    # wipe ops (keep users) then reseed
```

## Environment facts (verified)

- podman 5.8.7 + podman-compose 1.6.0; `docker` is the podman-docker alias.
  Makefile auto-detect priority: `podman-compose` > `docker compose` > `podman compose`.
- Login endpoint: `POST /api/auth/login/` → `{ token, user }`. **Not** `/api/login/`.
- Auth header: `Authorization: Token <token>` (DRF TokenAuth).
- Unauthenticated requests return **401** (not 403).
- `Article.categorie` is a required CharField.
- DRF Decimal fields serialize as **strings** → frontend types use `Money = string | number`.
- The Bons module is **client-side** (built from `entrees`/`sorties`); there is no `/bons/` endpoint.
- Backend tests run on a SQLite in-memory DB (settings fallback). The `post_migrate`
  signal in `stock/apps.py` seeds default users **even in the test DB**, so test
  fixtures must use `get_or_create` rather than `create_user`.
- Default accounts: `admin/admin123`, `magasin/mag123`, `consult/cons123`.
- `next@14.2.5` has a security advisory; upgrading is a known follow-up (out of scope).
- Compose startup race is handled by a wait-for-postgres loop in the backend
  command plus a `db` healthcheck.
- Single ingress via `nginx/nginx.conf` (port hôte `8080:80`): `/api/` → `backend:8000`,
  `/` → `frontend:3000`. `db`/`backend`/`frontend` publish **no** host ports.
  `NEXT_PUBLIC_API_URL` is relative (`/api`); non-Docker local dev relies on the
  `/api/:path*` rewrite in `frontend/next.config.mjs` (`API_PROXY_TARGET` override).

## Frontend architecture (post-refactor)

`app/page.tsx` is a 4-line wrapper that renders `<AppShell />`. `app/layout.tsx`
has `suppressHydrationWarning` on `<html>`/`<body>` (theme/lang are applied
client-side, with a pre-paint inline script as the first `<body>` child).

```
components/app/AppShell.tsx      Orchestrator: session, prefs, data, modals, context
components/app/AppContext.tsx    AppContextValue + useApp() (ambient state)
components/auth/LoginBox.tsx     Login screen (#loginScreen)
components/modules/*             One file per module, read ambient state via useApp()
components/forms/*               One modal per entity; own local form state + API calls
components/ui/*                  Button, Card, ConfirmDialog, DataTable, EmptyRow, Modal, StatusBadge, Toast, Toolbar
components/bons/BonDocument.tsx  JSX rendering of a bon (replaces old buildBonHTML string)
components/ErrorBoundary.tsx     Wraps children in layout

lib/types.ts        All domain interfaces + Money/Statut/SearchState
lib/constants.ts    NAV, CATEGORIES, UNITES, ROLES, PERMISSIONS, STORAGE_KEYS, EMPTY_SEARCH, SEARCH_FIELDS
lib/i18n.ts         I18N dictionaries + t(lang, key)
lib/helpers.ts      fmt, todayStr, errorMessage, statutClass, downloadFile
lib/csv.ts          toCSV, buildCSV, CSV_EXPORTS, buildExport
lib/print.ts        PRINT_CSS_MODULE, PRINT_CSS_BON, preparePrintable, printHtml
lib/api.ts          api<T>(), authApi, getToken, setToken
lib/hooks/*         usePreferences, useToast, useSession, useStockData, usePrint
lib/logo.ts         ANEP_LOGO_DATA_URL base64 logo
```

Key data-flow notes:

- `useStockData(showToast, onUnauthorized)` fetches all 10 endpoints in parallel
  (`load()`), normalizing list responses through `asArray` (handles DRF
  `{results: []}`). `refresh(keys?)` re-fetches only the given `EndpointKey`s
  (default all) and exposes `loading` (initial) + `refreshing` (scoped).
  It catches errors and toasts internally (never rejects); a `401` (via
  `ApiError.status`) calls `onUnauthorized` instead of toasting.
- `lib/api.ts` throws `ApiError(status, message)` so callers can branch on HTTP status.
- `useSession.hydrate()` restores token+user from localStorage on mount; permission
  helpers derive `canWrite` (admin|magasinier), `canDelete`/`canManageUsers` (admin).
- `AppShell` gates rendering on a `mounted` bootstrap flag (inline `BootSplash`) to
  avoid a login-screen flash while hydrating; `app/layout.tsx` runs a pre-paint
  inline script (first `<body>` child) applying `ANEP_THEME`/`ANEP_LANG` (dark/rtl)
  before first paint.
- `AppContext` exposes `refresh(keys?)`, `showToast(message, type?)`, and a
  promise-based `confirm(message, opts?)` (renders `ui/ConfirmDialog`) replacing
  native `window.confirm()`.
- `DataTable` supports client-side sorting (`Column.sortValue?`, asc→desc→none) and
  a `loading` skeleton; forms set a `saving` flag and `await refresh([...])` before
  closing.
- `usePrint` prints the current module by DOM id (`module-<key>`) or a specific node
  (bons), stripping `input/select/textarea/button/.no-print`.
- Export CSV: `AppShell.exportCSV(key)` builds a `CsvContext` from `stock`, calls
  `buildExport`, then `downloadFile` with `text/csv`.
- Storage keys: token `anep_token`, user `anep_user`, theme `ANEP_THEME`, lang `ANEP_LANG`.
- Preferences: theme/lang are cached in localStorage **and** persisted per-user on
  the backend (`GET/PATCH /api/preferences/`). After login, `AppShell` calls
  `usePreferences.applyServerPrefs(user)`; `usePreferences` also GETs the endpoint
  on mount when a token exists and PATCHes on every toggle (silent). The server
  value wins over localStorage once authenticated.

## Frontend tests

`vitest.config.ts` uses jsdom + `@testing-library/react`, alias `@ -> frontend/`.

- `lib/__tests__/api.test.ts` — api/authApi/token helpers.
- `lib/__tests__/helpers.test.ts` — fmt/todayStr/statutClass/errorMessage.
- `lib/__tests__/i18n.test.ts` — I18N fellback behavior + PERMISSIONS.
- `lib/__tests__/csv.test.ts` — toCSV/buildCSV/buildExport.
- `lib/__tests__/usePreferences.test.ts` — theme/lang hydration + server sync.
- `lib/__tests__/useStockData.test.tsx` — full vs scoped `refresh`, `401` → `onUnauthorized`.
- `components/__tests__/BonDocument.test.tsx` — bon rendering (entree/sortie/null/price fallback).
- `components/__tests__/DataTable.test.tsx` — sort cycle, numeric sort, skeleton, `.sortable`.
- `components/__tests__/Toast.test.tsx` — toast variants.
- `components/__tests__/ErrorBoundary.test.tsx`.

When you move an export, update its test import. Run `npx tsc --noEmit` before finishing.

## Backend map

```
backend/stock/models.py        Article, Entree, Sortie, Ajustement, Inventaire, Mouvement, AuditLog
backend/stock/views.py         ViewSets + dashboard/alertes + BackupView/Restore/Reset
backend/stock/serializers.py   Includes UserUpdateSerializer
backend/stock/services.py      log_audit, stock recomputation helpers
backend/stock/urls.py          API routes
backend/stock/apps.py          post_migrate seed signal
backend/stock/management/commands/seed_data.py   demo dataset (all modules) + `--reset`
backend/stock/tests.py         API/permissions/stock-calculation/seed tests
```

Notable backend behaviors:

- `seed_data` is deterministic (`random.seed`), seeds **every** module — 12 articles,
  entrees/sorties/ajustements (incl. one `Annulé` each), derived `Mouvement`s,
  2 `Inventaire` records with computed `lines`/écarts, and audit logs. Some articles
  are intentionally left at rupture/sous-seuil so Dashboard/Alertes populate.
  Per-section `count()==0` guards keep it idempotent; `--reset` clears operational
  data (keeps users, mirrors `BackupResetView`) before reseeding.
- Entrée create/update handles Decimal quantities and saves once; duplicate invoice
  returns 400 unless `force_facture=true` is sent.
- Cancel endpoints: `POST /api/<entrees|sorties|ajustements>/<id>/cancel/`.
- Backup: `GET /api/backup/`, `POST /api/backup/restore/`, `POST /api/backup/reset/`
  (reset is admin-only).

## Known follow-ups / ideas

- Upgrade `next` past 14.2.5 to clear the advisory.
- Consider React Context → server components split if SSR of ambient state is wanted.
- `README.md` documents counts and commands; keep it in sync.
