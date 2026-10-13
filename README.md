# Heat Championship

League tracker for monthly **Heat: Pedal to the Metal** races: sign-ups, results, standings, stats and player profiles.

The UI is in Spanish (Spain) with a retro F1-broadcast look (circa 2012). Code and comments are in English.

Built with Next.js 16 (App Router, Cache Components), Tailwind CSS 4 and TypeScript.

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Project layout

```
src/
  app/                 Routes (pages). /dev/ui is the living UI kit.
  components/
    ui/                Generic building blocks: Button, Card, Badge, Table, Modal, …
    domain/            Heat-specific pieces built from ui/: PositionBadge, CarColorChip, …
    layout/            Header, footer, navigation
  config/site.ts       Site name, navigation menu, max players per race
  lib/                 Helpers (cn class merger, …)
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
