---
name: mytabletop-visual-identity
description: Visual identity and UI conventions for the MyTabletop frontend (Apple-minimalist, always-dark, a rich-mahogany/wine palette with a brown-red accent). Use whenever creating or restyling a page, component, or UI element in frontend/ — new screens, forms, cards, buttons, badges, dashboards, sheet/character UI, VTT overlays. Not for backend code.
---

# MyTabletop visual identity

MyTabletop's UI is deliberately **always dark** (no light-mode variant — the
product's own identity, not a missed a11y feature) with an Apple-minimalist
feel: generous whitespace, restrained color, subtle borders instead of heavy
shadows, one accent color spent carefully. The palette is a fixed set of
wine/mahogany reds handed down by the project owner (not derived from a
design exploration this time) — see the token table below for the exact
values and where each one comes from.

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
   genuinely needed, add it to `globals.css` first, don't inline a hex. As of
   this writing, no component outside `globals.css` has a hardcoded hex —
   keep it that way, it's what makes a full retheme a one-file change.
3. **Don't reach for Tailwind's default palette** (`neutral-*`, `gray-*`,
   `blue-*`, `red-*`...). This app's neutrals and accent are named tokens —
   using default Tailwind grays instead of `text-muted`/`text-faint`/`border`
   is the most common way this identity drifts.

## Design tokens

All defined in `frontend/src/app/globals.css` (`:root`, hard-coded — not
gated behind `prefers-color-scheme`, since the product is single-theme by
design) and exposed as Tailwind utilities via `@theme inline`. Structural
tokens (bg/surface/border) all come from one family (`rich_mahogany`) so the
UI's "shell" reads as one cohesive dark material; accent roles borrow from
the other families in the owner's palette.

| Token | Hex | Source family | Tailwind utility | Role |
|---|---|---|---|---|
| `--bg` | `#080200` | rich_mahogany 100 | `bg-bg` | Page background, darkest tone |
| `--surface` | `#170601` | rich_mahogany 300 | `bg-surface` | Elevated panels, nav |
| `--surface-2` | `#1F0802` | rich_mahogany 400 | `bg-surface-2` | Cards, inputs — one step lighter than `surface` |
| `--border` | `#250902` | rich_mahogany DEFAULT/500 | `border-border` | Default border, interactive outlines |
| `--border-soft` | `#1F0802` | rich_mahogany 400 | `border-border-soft` | Quieter divider (card edges, panel borders) |
| `--text` | `#F3E7E4` | custom (not in the source palette) | `text-text` | Primary text — warm off-white, never pure `#fff` |
| `--text-muted` | `#B08984` | custom | `text-text-muted` | Secondary text, labels, nav links |
| `--text-faint` | `#7A5B57` | custom | `text-text-faint` | Tertiary/eyebrow text, placeholders, timestamps |
| `--accent` | `#AD2831` | brown_red DEFAULT/500 | `bg-accent` / `text-accent` | **Only** for primary actions and the current/important state |
| `--accent-strong` | `#D23F49` | brown_red 600 | `text-accent-strong` | Hover/emphasis on accent, link color on dark surfaces |
| `--accent-soft` | `rgba(173,40,49,.16)` | brown_red DEFAULT, low alpha | `bg-accent-soft` | Accent-tinted background (active badge fill) |
| `--on-accent` | `#F3E7E4` | = `--text` | `text-on-accent` | Text/icon placed *on top of* `--accent` (light-on-medium-red for contrast) |
| `--rare` | `#8D0A24` | garnet 600 (the palette's second, unnamed family) | `text-rare` / `bg-rare` | **Sparingly** — a rare/special indicator only (e.g. an NPC badge), never a second primary color |
| `--ok` | `#57B98A` | kept from before, not in the owner's palette | `bg-ok` | Positive/healthy state (e.g. a full resource bar) — deliberately still green: no green exists in the wine palette, and "full health = green" is a strong enough UX convention to keep as a functional exception, separate from brand color |
| `--danger` | `#E42C3B` | black_cherry 700 | `text-danger` | Destructive actions, errors |

Radius scale (also theme tokens, so `rounded-sm/md/lg` map to these, not
Tailwind's defaults): `--radius-sm: 9px` (buttons, inputs, small controls),
`--radius-md: 14px` (cards), `--radius-lg: 20px` (large panels/frames).

**A note on hue distinction**: `accent`, `rare`, and `danger` are all reds by
necessity (that's the whole palette) — they read apart mainly by
brightness/saturation, not hue, which is a real constraint of this palette
compared to a multi-hue one. Lean on position/label/context (not color alone)
to distinguish them when it matters — e.g. `danger`-styled text only ever
appears on a "Remover"-type action, never as a standalone status dot.

## Typography

- **UI text** — `font-sans` → Instrument Sans (`next/font/google`, loaded in
  `layout.tsx` as `--font-ui`). Headings are bold/tight (`font-bold
  tracking-tight`), body text sits on `text-text-muted`.
- **Data/numbers** — `font-mono` → IBM Plex Mono (`--font-data`). Use it for
  anything that reads as a system readout: attribute scores, resource
  numbers (PV/PE/Sanidade), NEX%, counts, badges, timestamps. Pair with
  `tabular-nums`/`font-variant-numeric: tabular-nums` wherever digits stack
  in a column.
- Eyebrow/label text (small uppercase caption above a heading) is mono, not
  sans: `font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint`.

## Component patterns already established

- **Buttons**: `Button` variants are `primary` (solid accent, the default —
  use for the one primary action per view, e.g. "Acessar VTT"), `secondary`
  (bordered, for secondary actions like "Fichas"), `ghost` (text-only,
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
  the sparingly-used indicator (NPC). Badge text is always mono, uppercase,
  small.
- **Attribute/stat tiles** (`AttributesEditor` in
  `frontend/src/components/AttributesEditor.tsx`): a `surface`-colored tile
  per stat with a faint mono label on top and a large mono tabular number
  below — this is the established pattern for any future OP-specific stat
  block (resources, skills, NEX), not just attributes. Reuse this shape
  (small caption + big mono number in a `surface` tile) instead of inventing
  a new stat-display style.
- **Nav**: brand mark is a small accent-colored dot + wordmark, never a logo
  image. Current-user affordance is a circular initials avatar (`surface-2`
  bg, mono initials) next to a bordered ghost "Sair" button.
- **Floating VTT panels** (`VttView.tsx`): semi-opaque `bg-surface/80` or
  `/90` with `backdrop-blur`, used for controls that float over the
  full-screen canvas (exit link, history toggle, upload panels) rather than
  sitting in normal document flow. This is the one place panels float over
  content instead of being laid out in the page — don't reuse it outside the
  VTT screen.
- **Tokens on the map**: a circular (`rounded-full`) cropped image
  (`object-cover`) with a `border-border-soft` ring and a drop shadow so it
  reads against any map color. A small danger-colored "×" delete button
  appears top-right on hover, only rendered for users who can actually edit
  that token (see the VTT architecture note in `CLAUDE.md`).

## Layout conventions

- Page container: `mx-auto w-full max-w-4xl px-4 py-10`, applied by
  `src/app/(app)/layout.tsx` (the route group with the shared navbar chrome).
  Pages inside `(app)/` render straight into it, don't re-wrap. The VTT page
  (`app/tabletops/[id]/vtt/`) is the one deliberate exception — it lives
  outside `(app)/` and is full-viewport (`h-dvh w-dvw`), no navbar, no
  container.
- Vertical rhythm between major sections: `flex flex-col gap-8` to `gap-10`.
  Use `gap`, not stacked margins (see the general "let layout do the
  spacing" rule — applies here too).
- Card grids (tabletop list, sheet list): `grid gap-3 sm:grid-cols-2`.
- Forms: `flex max-w-sm flex-col gap-4` inside a `Card`.

## What "Apple-minimalist" means operationally here

- One accent, spent deliberately: `--accent` marks *the* primary action or
  *the* important state in a view. If everything is accent-colored, nothing
  is — reach for `secondary`/`ghost`/`neutral` first and ask whether this
  element is really the primary one before making it accent-colored.
  - `rare` exists for exactly one purpose: flagging something genuinely
    uncommon (currently: NPC sheets). Don't use it as "a second accent" for
    general UI.
- Borders over shadows: surfaces are told apart by a 1px `border`/
  `border-soft` line and a background-shade step (`bg` → `surface` →
  `surface-2`), not drop shadows. The floating VTT panels (see above) are the
  one deliberate exception, since they sit *over* content rather than in the
  page flow.
- Generous, not cramped: prefer the established padding scale
  (`p-5` cards, `px-3.5 py-2.5` inputs/buttons) over tightening things to fit
  more on screen.
