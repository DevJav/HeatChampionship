# Heat Championship

League tracker for monthly **Heat: Pedal to the Metal** races: sign-ups, results, standings, stats and player profiles.

The UI is in Spanish (Spain) with a retro F1-broadcast look (circa 2012). Code and comments are in English.

Built with Next.js 16 (App Router, Cache Components), Tailwind CSS 4, TypeScript, Prisma 7 + SQLite and Better Auth.

## Running locally

```bash
cp .env.example .env     # then set BETTER_AUTH_SECRET and the admin credentials
npm install              # also generates the Prisma client
npm run db:migrate       # creates data/heat.db
npm run db:seed          # tracks, car colors, first season, admin account
npm run dev              # http://localhost:3000
```

`npm run db:seed:demo` also adds 7 demo players (password `carreras`) for local testing.

| Script | |
|---|---|
| `db:migrate` | Create/apply migrations after editing `prisma/schema.prisma` |
| `db:deploy` | Apply migrations in production |
| `db:seed` / `db:seed:demo` | Seed data (safe to re-run) |
| `db:studio` | Browse the database in Prisma Studio |
| `db:reset` | Wipe the database and re-seed |
| `test` / `test:watch` | Unit tests (Vitest) |

## Running the championship

Everything is managed from `/admin` (shield icon in the header):

| Section | |
|---|---|
| Carreras | Create a race (season, track, date, sign-up deadline, seats). **Borrador** hides it, **Inscripción abierta** lets players join, **Inscripción cerrada** stops new sign-ups. On a race you can also add or remove players yourself. |
| Temporadas | Seasons and their points table. Only one season can be in progress at a time. |
| Circuitos / Mejoras / Colores | The catalogs: track default laps, upgrade cards, car colors. Anything already used can be deactivated but not deleted. |

**Results:** after the race, open it in admin and click **Resultados**. Fill in each driver's finishing position (or *Retirado*), starting position, car and upgrade cards. Points are previewed live from the season's table. Saving awards the points, marks the race *Finalizada* and opens its page with the podium and full results. You can edit the results later or cancel them. Changing a season's points table re-scores its finished races.

**Photos:** the race's drivers (and admins) can upload photos once the race has started. They're resized to WebP (max 2000px, plus a thumbnail) and stored in `data/uploads/`, which you can change with `UPLOAD_DIR`. Back up the whole `data/` folder to keep both the database and the photos.

**Sign-ups:** seats go in sign-up order. Once a race is full, new players join the waitlist. When someone withdraws, the first person on the waitlist moves into the seat automatically. A player who withdraws and signs up again goes to the back of the queue. Players can withdraw until the race starts.

All dates are entered and shown in Madrid time (`siteConfig.timeZone`), whatever time zone the server runs in.

## Accounts

- Players sign up at `/registro` with a username, a display name and a password, then log in at `/entrar`. Behind the scenes Better Auth also needs an email, so one is generated: `<username>@users.heat.local`.
- The admin account comes from `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env` when you run `db:seed`. Admins get a shield icon in the header that leads to `/admin`.
- In `/admin` you can close registration once all your friends have signed up. The check runs inside the auth API itself, so the sign-up endpoint can't be called directly to get around it.

## Project layout

```
prisma/                Schema, migrations, seed script
src/
  actions/             Server actions (auth, races, seasons, catalog, admin)
  app/                 Routes (pages). /dev/ui is the living UI kit.
  components/
    ui/                Generic building blocks: Button, Card, Badge, Table, Modal, …
    domain/            Heat-specific pieces built from ui/: PositionBadge, CarColorChip, …
    layout/            Header, footer, navigation, user menu
    auth/              Login / sign-up forms
    races/             Race card, entry list, sign-up panel
    admin/             Admin forms and helpers
    forms/             Form fields wired to server-action state (errors, echoed values)
  config/site.ts       Site name, navigation, locale & time zone, max players per race
  generated/prisma/    Generated Prisma client (git-ignored)
  lib/
    data/              Read queries for pages (each starts with `await connection()`)
    auth.ts            Better Auth config;  session.ts — getCurrentUser / requireUser / requireAdmin
    db.ts              Prisma client;  format.ts — es-ES date formatting;  dates.ts — Madrid ⇄ UTC
    forms.ts           FormState, parseForm() and zod field helpers
    registration-rules.ts  Seat/waitlist rules (pure, unit-tested);  registrations.ts — DB operations
    scoring.ts, results-rules.ts  Points and results-sheet validation (pure, unit-tested);  results.ts — DB operations
    uploads.ts         Photo storage (sharp → WebP) served by app/media/[...path]
  styles/tokens.css    Design tokens — colors, radii, shadows, layout sizes
```

## Customizing the look

1. **Colors, shapes, textures** — edit `src/styles/tokens.css`. Every component reads from these.
   - `--slant` / `--chamfer` control the slanted buttons and cut panel corners — set to `0` for plain rectangles.
   - `--bar-*` is the dark broadcast bar (header, card headers, table heads); `--texture` is the carbon background.
2. **Fonts** — change the `next/font` imports in `src/app/layout.tsx` (`--font-body`, `--font-code`); `--font-heading` is set in `tokens.css`.
3. **Name & menu** — edit `src/config/site.ts`.
4. **A component's style** — each component in `src/components/ui/` defines its variants in one place (e.g. `buttonVariants` in `Button.tsx`). Change it there and every usage updates.

Open [/dev/ui](http://localhost:3000/dev/ui) to see every component and token at once.

### Retro style utilities (defined in `globals.css`)

| Class | Effect |
|---|---|
| `clip-slant` | Parallelogram shape (buttons, tags, nav items) |
| `clip-chamfer` | Panel with the top-right corner cut |
| `surface-panel` | Gradient panel with glossy top edge |
| `surface-bar` | Dark glossy broadcast bar |
| `gloss` | Glossy highlight over a solid color |
| `chequered`, `speed-stripes`, `texture-carbon` | Decorative patterns |
| `focus-inset` | Focus ring that survives clipping |

### Rules of thumb

- Pages compose components from `components/ui` and `components/domain`; they don't style raw `<button>`s, tables or cards.
- Use semantic token classes (`bg-surface`, `text-fg-muted`, `bg-primary`, `rounded-card`), never raw colors like `bg-red-600`.
- Need a new look for a button or badge? Add a variant to the component rather than overriding classes at the call site.
- Navigation that looks like a button uses `<ButtonLink>`, which shares the same variants as `<Button>`.
- On top of a dark broadcast bar use `text-bar-fg` and the `inverse` button variant.
- User-facing text is in Spanish; routes use Spanish slugs (`/clasificacion`, `/carreras`, `/pilotos`, `/estadisticas`).

### Cache Components rules

- Anything that reads the session (`getCurrentUser`), the URL (`usePathname`) or the database must be rendered inside a `<Suspense>` boundary **within the page**. A boundary in a layout doesn't cover client navigations. Admin pages use `<AdminSuspense>`.
- Page queries go in `src/lib/data/` and begin with `await connection()`. The SQLite driver is synchronous, so without that call Next would run the query at build time and freeze the result into the page.
- Server actions check permissions themselves (`requireAdmin()`) and call `refresh()` after a write. Admin pages call `requireAdmin()` too, because the layout check is only for the UI.
