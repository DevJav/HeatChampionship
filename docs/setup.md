# Running your own league

[← Back to the README](../README.md)

- [1. Configure](#1-configure)
- [2. Create the database and start](#2-create-the-database-and-start)
- [3. Invite your friends](#3-invite-your-friends)
- [Deploying](#deploying)
- [Back-ups](#back-ups)
- [Languages](#languages)
- [Scripts](#scripts)

You need [Node.js 24](https://nodejs.org/).

## 1. Configure

Copy `.env.example` to `.env` and fill it in:

| Variable | What it's for |
|---|---|
| `BETTER_AUTH_SECRET` | Secret for login sessions. Generate one with `openssl rand -base64 32`. |
| `BETTER_AUTH_URL` | The public address of the site, e.g. `https://heat.example.com` (`http://localhost:3000` locally). |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_NAME` | The organiser's account, created by the seed script. |
| `APP_LOCALE` | Site language: `es` (default) or `en`. |
| `APP_TIME_ZONE` | Time zone race times are entered and shown in, e.g. `Europe/London` (default `Europe/Madrid`). |
| `DATABASE_URL` | SQLite file, `file:./data/heat.db` by default. |
| `UPLOAD_DIR` | Where photos are stored, `./data/uploads` by default. |
| `SITE_URL` | Optional. Address used in shared links if it differs from `BETTER_AUTH_URL`. |

`APP_LOCALE` and `APP_TIME_ZONE` are read when the site is built, so rebuild (or restart `npm run dev`) after changing them.

The championship name, menu and maximum seats per race are in [`src/config/site.ts`](../src/config/site.ts).

## 2. Create the database and start

```bash
npm install              # also generates the database client
npm run db:migrate       # creates data/heat.db
npm run db:seed          # tracks, car colours, first season and the admin account
npm run dev              # http://localhost:3000
```

The seed uses the language in `APP_LOCALE` for track, colour and season names. You can rename anything later in the admin panel.

## 3. Invite your friends

Share the link: players create their own account at `/registro`. Once everyone has joined, close registration from `/admin`. The [admin panel section of the tour](tour.md#admin-panel) explains the rest.

## Deploying

The site is a regular Next.js app with a SQLite file, so a small server or a home machine is enough. This is how the original league runs it, with [pm2](https://pm2.keymetrics.io/) keeping it alive on `127.0.0.1:3000` behind a Cloudflare tunnel (see [`ecosystem.config.cjs`](../ecosystem.config.cjs)).

First time, with `.env` filled in (a real `BETTER_AUTH_SECRET` and your public `BETTER_AUTH_URL`):

```bash
npm ci
npm run db:deploy        # creates data/heat.db
npm run db:seed
npm run build
pm2 start ecosystem.config.cjs
pm2 save                 # run `pm2 startup` once so pm2 starts on boot
```

Updating:

```bash
git pull
npm ci
npm run db:deploy
npm run build
pm2 restart heat
```

`pm2 logs heat` shows the server output.

## Back-ups

Everything lives in the `data/` folder: the database and the uploaded photos (resized to WebP in `data/uploads/`, or wherever `UPLOAD_DIR` points). Copy that folder to back it up.

## Languages

Each copy of the site runs in one language, chosen with `APP_LOCALE`. You can run a Spanish and an English league from the same code, each with its own `.env` and database.

- Dates, numbers, country names and ordinals (2º / 2nd) follow the language automatically.
- Content in the database (track names, articles, notes) is whatever you type.
- URLs are in Spanish in both languages (`/clasificacion`, `/carreras`, `/pilotos`, …).

To translate the site into another language, see [Translations](development.md#translations) in the developer guide.

## Scripts

| Script | |
|---|---|
| `dev` / `build` / `start` | Development server, production build, production server |
| `db:migrate` | Create and apply migrations after editing `prisma/schema.prisma` |
| `db:deploy` | Apply migrations in production |
| `db:seed` | Catalogues, first season and admin account (safe to re-run) |
| `db:seed:demo` | Same, plus demo players for local testing |
| `db:seed:sample` | Local testing only: a finished season and part of the next, with reproducible random results. Skipped if already there |
| `db:showcase:en` / `dev:en` | Build the English demo database from scratch / run the site in English against it |
| `db:studio` | Browse the database in Prisma Studio |
| `db:reset` | Wipe the database and re-seed |
| `test` / `test:watch` | Unit tests (Vitest) |
| `lint` | ESLint |

Only one `next dev` can run per project folder, so stop `dev` before starting `dev:en` and vice versa.
