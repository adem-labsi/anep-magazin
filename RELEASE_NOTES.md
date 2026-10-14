# Release Notes — ANEP Magasin

## v1.0.0 — Next.js + Django + PostgreSQL

Port of the standalone `magasin.html` (single-file PHP-less app) to a typed,
container-ready stack. Feature parity preserved across all modules.

### Stack

- **Frontend** — Next.js 14 (App Router) · React 18 · TypeScript.
  Vitest + Testing Library for unit tests. No runtime dependencies beyond
  Next/React.
- **Backend** — Django + Django REST Framework · DRF TokenAuth.
- **Database** — PostgreSQL (SQLite in-memory fallback for tests).
- **Orchestration** — Podman/Docker via `docker-compose.yml` (dev) and
  `docker-compose.deploy.yml` (production, gunicorn).

### Features (parity with `magasin.html`)

- Dashboard with KPIs, stock distribution bars, daily signal and summary table.
- Articles referential: categories, units, thresholds, locations, prices.
- Entrées (réceptions) with supplier / BL / invoice and duplicate-invoice guard.
- Sorties to workshops with atelier and motif.
- Ajustements with signed variation and justification.
- Stock state view (initial / in / out / adjustments / available / value).
- Mouvements journal (consolidated, typed).
- Alertes center (ruptures, sous-seuil, réappro value).
- Inventaires with per-article physical count, écart and value.
- Bons (vouchers) rendered client-side from entrées/sorties and printed to A4.
- Sauvegarde & Restauration (JSON export/restore/reset).
- Audit journal.
- Users management with role permissions (admin / magasinier / consultant).
- FR/AR i18n with RTL support, light/dark theme, both persisted client-side.
- CSV export and print for every relevant module.

### Backend highlights

- Token authentication (`POST /api/auth/login/`, `Authorization: Token <token>`).
- Cancel endpoints for entrées / sorties / ajustements.
- Server-side stock recomputation on every create/update/cancel.
- Audit logging (`log_audit`) on mutations.
- Backup API: `GET /api/backup/`, `POST /api/backup/restore/`,
  `POST /api/backup/reset/` (admin only).
- `post_migrate` signal seeds the default accounts.

### Frontend architecture

`app/page.tsx` is a thin wrapper around `components/app/AppShell.tsx`. Ambient
state (session, preferences, stock data, search, print/export, capabilities) is
exposed through `components/app/AppContext.tsx`; each module and form is a small
typed component. Logic is split into `lib/` (`api`, `types`, `constants`, `i18n`,
`helpers`, `csv`, `print`, `hooks/*`) so it is unit-testable without the UI.

### Quality

- `npx tsc --noEmit` clean.
- `npm run build` succeeds (ESLint + type check).
- Tests: **backend 30**, **frontend 27** (`make test`).

### Known limitations / follow-ups

- `next@14.2.5` carries a security advisory; upgrade planned.
- Frontend unit tests cover `lib/` and `BonDocument`/`ErrorBoundary`; module and
  form components are exercised manually (no component-level test harness yet).
