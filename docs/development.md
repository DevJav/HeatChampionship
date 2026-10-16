# Developer guide

[← Back to the README](../README.md)

- [Stack](#stack)
- [Project layout](#project-layout)
- [Translations](#translations)
- [Customising the look](#customising-the-look)
- [Conventions](#conventions)
- [Cache Components rules](#cache-components-rules)
- [Accounts](#accounts)

## Stack

Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, TypeScript, Prisma 7 + SQLite and Better Auth. Unit tests use Vitest. Code and comments are in English.

To get a database to work with, follow [the setup guide](setup.md), or run `npm run db:showcase:en` for a ready-made English demo league.

## Project layout

```
prisma/                Schema, migrations, seed scripts (seed-content.ts holds the seed data per language)
scripts/               generate-icons.mjs: favicon and app icons from the logo
docs/                  These guides and the README screenshots
src/
  actions/             Server actions: auth, profile, races, results, seasons, catalog, articles, comments, …
  app/                 Routes. /admin is the organiser panel, /dev/ui the living UI kit
  components/
    ui/                Generic building blocks: Button, Card, Badge, Table, Modal, …
    domain/            Heat-specific pieces built from ui/: PositionBadge, CarColorChip, …
    layout/            Header, footer, navigation, user menu
    races/ standings/ stats/ achievements/ players/ articles/ activity/ notifications/
                       Components for each section of the site
    admin/ forms/      Admin forms, and form fields wired to server-action state
    charts/ og/        Shared chart pieces; link-preview image frame
  config/site.ts       Site name, navigation, locale and time zone, seats per race
  i18n/                Interface text: es.ts, en.ts and the active `t`
  lib/
    data/              Read queries for pages (each starts with `await connection()`)
    auth.ts, session.ts             Better Auth setup; getCurrentUser / requireUser / requireAdmin
    forms.ts                        FormState, parseForm() and zod field helpers
    registration-rules.ts           Seats and waitlist rules (pure, unit-tested)
    scoring.ts, results-rules.ts    Points and results-sheet validation (pure, unit-tested)
    standings.ts, player-stats.ts   Standings with countback, points progression, player summaries (pure, unit-tested)
    stats.ts, achievements.ts       Records, head to head, tallies; trophies and badges (pure, unit-tested)
    articles.ts                     Article embeds and mentions
    race-log/                       Round-by-round race log: track layouts and traced maps, round rules, stats, export (pure, unit-tested)
    activity.ts, notifications.ts   Text and links for feed entries and notifications
    format.ts, dates.ts             Date and number formatting; site time zone ⇄ UTC
    uploads.ts                      Photo and avatar storage (sharp → WebP), served by app/media/[...path]
  styles/tokens.css    Design tokens: colours, radii, shadows, layout sizes
```

## Translations

- All interface text is in [`src/i18n/es.ts`](../src/i18n/es.ts) and [`src/i18n/en.ts`](../src/i18n/en.ts). Components use it as `t.standings.title`, or `t.common.round(3)` for text with values in it. It works the same in server and client components.
- The English file is type-checked against the Spanish one, so a missing or extra translation fails the build.
- `APP_LOCALE` is inlined at build time through [`next.config.ts`](../next.config.ts), which is why changing it needs a rebuild.
- Data written by the seed scripts (track and colour names, demo drivers, showcase articles) is in [`prisma/seed-content.ts`](../prisma/seed-content.ts).

To add another language, copy `en.ts`, translate it, and add it to `Locale`, `intlLocale` and `t` in [`src/i18n/index.ts`](../src/i18n/index.ts).

## Customising the look

1. **Colours, shapes, textures:** edit `src/styles/tokens.css`. Every component reads from these.
   - `--slant` / `--chamfer` control the slanted buttons and cut panel corners. Set them to `0` for plain rectangles.
   - `--bar-*` is the dark broadcast bar (header, card headers, table heads); `--texture` is the carbon background.
2. **Fonts:** change the `next/font` imports in `src/app/layout.tsx` (`--font-body`, `--font-code`); `--font-heading` is set in `tokens.css`.
3. **A component's style:** each component in `src/components/ui/` defines its variants in one place (e.g. `buttonVariants` in `Button.tsx`). Change it there and every usage updates.
4. **Icons:** the favicon and home-screen icons are generated from the logo by `node scripts/generate-icons.mjs`. Change the colours or shape there and run it again.

Open [/dev/ui](http://localhost:3000/dev/ui) to see every component and token at once (this page is in Spanish only).

Retro style utilities, defined in `globals.css`:

| Class | Effect |
|---|---|
| `clip-slant` | Parallelogram shape (buttons, tags, nav items) |
| `clip-chamfer` | Panel with the top-right corner cut |
| `surface-panel` | Gradient panel with glossy top edge |
| `surface-bar` | Dark glossy broadcast bar |
| `gloss` | Glossy highlight over a solid colour |
| `chequered`, `speed-stripes`, `texture-carbon` | Decorative patterns |
| `focus-inset` | Focus ring that survives clipping |

## Conventions

- Pages compose components from `components/ui` and `components/domain`; they don't style raw `<button>`s, tables or cards.
- Use semantic token classes (`bg-surface`, `text-fg-muted`, `bg-primary`, `rounded-card`), never raw colours like `bg-red-600`.
- Need a new look for a button or badge? Add a variant to the component rather than overriding classes where it's used.
- Navigation that looks like a button uses `<ButtonLink>`, which shares the variants of `<Button>`.
- On top of a dark broadcast bar use `text-bar-fg` and the `inverse` button variant.
- No hard-coded user-facing text: add it to both `src/i18n/es.ts` and `src/i18n/en.ts` and use `t`.

## Cache Components rules

- Anything that reads the session (`getCurrentUser`), the URL (`usePathname`) or the database must be rendered inside a `<Suspense>` boundary **within the page**. A boundary in a layout doesn't cover client navigations. Admin pages use `<AdminSuspense>`.
- Page queries go in `src/lib/data/` and begin with `await connection()`. The SQLite driver is synchronous, so without that call Next would run the query at build time and freeze the result into the page.
- Server actions check permissions themselves (`requireAdmin()`) and call `refresh()` after a write. Admin pages call `requireAdmin()` too, because the layout check only hides the UI.

## Accounts

Players log in with a username and password. Better Auth also needs an email, so one is generated behind the scenes (`<username>@users.heat.local`); no real emails are collected or sent. The registration on/off switch is enforced inside the auth API itself, so the sign-up endpoint can't be called directly to get around it.
