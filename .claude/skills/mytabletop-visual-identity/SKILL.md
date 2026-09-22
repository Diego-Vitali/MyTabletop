---
name: mytabletop-visual-identity
description: Visual identity and UI conventions for the MyTabletop frontend ("Sinal" direction — Apple-minimalist, always-dark, Deep Space Blue base with a warm gold accent). Use whenever creating or restyling a page, component, or UI element in frontend/ — new screens, forms, cards, buttons, badges, dashboards, sheet/character UI. Not for backend code.
---

# MyTabletop visual identity — "Sinal"

MyTabletop's UI is deliberately **always dark** (no light-mode variant — the
product's own identity, not a missed a11y feature) with an Apple-minimalist
feel: generous whitespace, restrained color, subtle borders instead of heavy
shadows, one accent color spent carefully. This direction was chosen from
three explored options (Sinal / Véu / Aurora — see the design exploration
artifact linked in the project if it still exists) — **Sinal** ("a lit
window in a dark house") is the one in production.

## Before building anything

1. **Reuse `frontend/src/components/ui.tsx` first** — `Button`, `Input`,
   `Select`, `Card`, `Badge`, `FieldError`. Almost every form/list/detail
   page in this app is built from these five primitives. Only write new
   one-off markup+classes when none of them fit, and prefer extending a
   primitive (a new `Button` variant, a new `Badge` variant) over hand-rolling
   styled elements inline.
2. **Never introduce a new raw hex color in a component.** Every color comes
   from the tokens below (Tailwind utilities generated from
   `frontend/src/app/globals.css`'s `@theme inline` block). If a new token is
   genuinely needed, add it to `globals.css` first, don't inline a hex.
3. **Don't reach for Tailwind's default palette** (`neutral-*`, `gray-*`,
   `blue-*`, `red-*`...). This app's neutrals and accent are named tokens —
   using default Tailwind grays instead of `text-muted`/`text-faint`/`border`
   is the most common way this identity drifts.

## Design tokens

All defined in `frontend/src/app/globals.css` (`:root`, hard-coded — not
gated behind `prefers-color-scheme`, since the product is single-theme by
design) and exposed as Tailwind utilities via `@theme inline`.

| Token | Hex | Tailwind utility | Role |
|---|---|---|---|
| `--bg` | `#01141C` | `bg-bg` / `text-bg` | Page background (darker than Deep Space Blue) |
| `--surface` | `#022B3C` | `bg-surface` | Deep Space Blue — the required brand base. Elevated panels, nav, attribute tiles |
| `--surface-2` | `#0C3547` | `bg-surface-2` | Cards, inputs — one step lighter than `surface` |
| `--border` | `#14425A` | `border-border` | Default border, interactive element outlines |
| `--border-soft` | `#0C3547` | `border-border-soft` | Quieter divider (card edges, nav bottom border) |
| `--text` | `#EDF3F6` | `text-text` | Primary text — cool-tinted off-white, never pure `#fff` |
| `--text-muted` | `#8CA3AF` | `text-text-muted` | Secondary text, labels, nav links |
| `--text-faint` | `#5E7986` | `text-text-faint` | Tertiary/eyebrow text, placeholders, timestamps |
| `--accent` | `#F3C647` (Tuscan Sun) | `bg-accent` / `text-accent` | **Only** for primary actions and the current/important state (primary buttons, active badges) |
| `--accent-strong` | `#FFE481` (Jasmine) | `text-accent-strong` | Hover/emphasis on accent, link color on dark surfaces |
| `--accent-soft` | `rgba(243,198,71,.14)` | `bg-accent-soft` | Accent-tinted background (active badge fill) |
| `--on-accent` | `#01141C` | `text-on-accent` | Text/icon color placed *on top of* `--accent` (dark-on-gold for contrast) |
| `--rare` | `#6B7FD7` (Glaucous) | `text-rare` / `bg-rare` | **Sparingly** — a rare/special indicator only (e.g. an NPC badge), never a second primary color |
| `--ok` | `#57B98A` | `bg-ok` | Positive/healthy state (e.g. a full resource bar) |
| `--danger` | `#E8695B` | `text-danger` | Destructive actions, errors |

Radius scale (also theme tokens, so `rounded-sm/md/lg` map to these, not
Tailwind's defaults): `--radius-sm: 9px` (buttons, inputs, small controls),
`--radius-md: 14px` (cards), `--radius-lg: 20px` (large panels/frames).

## Typography

- **UI text** — `font-sans` → Instrument Sans (`next/font/google`, loaded in
  `layout.tsx` as `--font-ui`). Headings are bold/tight (`font-bold
  tracking-tight`), body text sits on `text-text-muted`.
- **Data/numbers** — `font-mono` → IBM Plex Mono (`--font-data`). Use it for
  anything that reads as a system readout: attribute scores, resource
  numbers (PV/PE/Sanidade), NEX%, counts, badges. Pair with
  `tabular-nums`/`font-variant-numeric: tabular-nums` wherever digits stack
  in a column.
- Eyebrow/label text (small uppercase caption above a heading) is mono, not
  sans: `font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint`.

## Component patterns already established

- **Buttons**: `Button` variants are `primary` (solid accent, the default —
  use for the one primary action per view), `secondary` (bordered, for
  secondary actions like "Fichas" on the tabletop page), `ghost` (text-only,
  nav-level actions like "Sair"), `danger` (destructive, red text no fill).
  Don't add a `w-fit`/width utility to the base — buttons size to content by
  default; pass `className="w-full justify-center"` only when a form
  explicitly wants a full-width submit.
- **Cards** (`Card`): the base building block for anything boxed — tabletop
  cards, sheet cards, member rows, forms. `Card` accepts `as` to render as a
  `form` (`<Card as="form" onSubmit={...}>`) so forms get the same visual
  container without a wrapper div.
- **Badges** (`Badge`): `accent` for the "important/mine" state (DM role,
  character sheet), `neutral` for a plain label (player role), `rare` for
  the sparingly-used Glaucous indicator (NPC). Badge text is always mono,
  uppercase, small.
- **Attribute/stat tiles** (`AttributesEditor` in
  `frontend/src/components/AttributesEditor.tsx`): a `surface`-colored tile
  per stat with a faint mono label on top and a large mono tabular number
  below — this is the established pattern for any future OP-specific stat
  block (resources, skills, NEX), not just attributes. Reuse this shape
  (small caption + big mono number in a `surface` tile) instead of inventing
  a new stat-display style.
- **Nav**: brand mark is a small accent-colored dot + wordmark, never a
  logo image. Current-user affordance is a circular initials avatar
  (`surface-2` bg, mono initials) next to a bordered ghost "Sair" button.

## Layout conventions

- Page container: `mx-auto w-full max-w-4xl px-4 py-10` (set once in
  `layout.tsx` — pages render inside it, don't re-wrap).
- Vertical rhythm between major sections: `flex flex-col gap-8` to `gap-10`.
  Use `gap`, not stacked margins (see the general "let layout do the
  spacing" rule — applies here too).
- Card grids (tabletop list, sheet list): `grid gap-3 sm:grid-cols-2`.
- Forms: `flex max-w-sm flex-col gap-4` inside a `Card`.

## What "Apple-minimalist" means operationally here

- One accent, spent deliberately: gold marks *the* primary action or *the*
  important state in a view. If everything is gold, nothing is — reach for
  `secondary`/`ghost`/`neutral` first and ask whether this element is really
  the primary one before making it accent-colored.
  - `rare` (Glaucous) exists for exactly one purpose: flagging something
    genuinely uncommon (currently: NPC sheets). Don't use it as "a second
    blue accent" for general UI.
- Borders over shadows: surfaces are told apart by a 1px `border`/
  `border-soft` line and a background-shade step (`bg` → `surface` →
  `surface-2`), not drop shadows. The one exception is the outer app frame
  in the original design exploration, which is not a pattern to repeat in
  regular pages.
- Generous, not cramped: prefer the established padding scale
  (`p-5` cards, `px-3.5 py-2.5` inputs/buttons) over tightening things to
  fit more on screen.
