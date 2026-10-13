# Heat Championship — Build Plan

Monthly Heat: Pedal to the Metal league. One race per month on a chosen track; players sign up (max 8, then waitlist), the admin records results, the site shows standings, race results, stats and player profiles. Self-hosted, exposed to friends via Cloudflare tunnel.

## Decisions

- **UI language:** Spanish (Spain), Spanish route slugs. Dates/numbers formatted with `es-ES`.
- **Style:** retro F1 broadcast (circa 2012) — dark glossy bars, red accents, slanted shapes, Titillium Web italic. Light theme only (dark broadcast bars over light panels).
- **Stack:** Next.js 16 (App Router, Cache Components) + TypeScript, Tailwind 4, Prisma + SQLite, Better Auth, Recharts, Vitest. Docker Compose for deployment.
- **Accounts:** every friend has a username/password account; one admin enters results. Admin can switch off new registrations.
- **Scoring:** points table per season, default `9-6-4-3-2-1` (places 1–6). Points are snapshotted when a race is finalized; admin can recalculate a season.
- **Race data:** finish position, starting position, laps, car color, upgrades used, notes, photos.
- **Catalogs as data:** tracks, upgrade cards and car colors are editable in the admin, so expansions only need new entries.

## Data model

| Entity | Key fields |
|---|---|
| User | username, displayName, password hash, role (ADMIN/PLAYER), avatar, favorite color, bio |
| Season | name, year, points table (JSON), status |
| Track | name, country, default laps, image, expansion |
| Race | season, track, round, date/time, location, laps, max players, sign-up deadline, status DRAFT → OPEN → CLOSED → FINISHED |
| Registration | race, user, queuedAt, status CONFIRMED / WAITLIST / WITHDRAWN |
| RaceResult | race, user, position, start position, car color, DNF, points (snapshot), notes |
| Upgrade + ResultUpgrade | upgrade catalog; upgrades used per result |
| CarColor | name, hex |
| RacePhoto | race, file path, caption |

## Phases

- [x] **1. Scaffold + design system** — tokens, `ui/` primitives, layout & nav, `/dev/ui` showcase, Spanish UI, retro F1 style
- [x] **2. Database + auth** — Prisma schema, seed (tracks, colors, season, admin, demo players), Better Auth (username login), role guards, registration on/off in `/admin`
  - Upgrade cards not seeded yet: names depend on the edition — add them once the admin catalog UI exists
- [x] **3. Races & sign-ups** — admin race CRUD, sign-up / withdraw, waitlist with auto-promotion, deadline; admin catalogs (seasons, tracks, upgrades, colors); Vitest
- [x] **4. Results + scoring** — results editor (positions, grid, car, upgrades, notes) with live points, `scoreRace()` + sheet validation with tests, podium/results on the race page, photo uploads, season re-scoring
- [x] **5. Standings, race pages, profiles** — standings with countback, movement and points chart; players list; profiles with stats/form/history; profile editing (name, bio, color, avatar, password); home standings + last race
- [ ] **6. Statistics** — `lib/stats` with tests, charts
- [ ] **7. Deployment** — Dockerfile, compose, persistent volume, backup script
