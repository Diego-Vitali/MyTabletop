---
name: mytabletop-visual-identity
description: Visual identity and UI conventions for the MyTabletop frontend (Apple-minimalist, always-dark, a warm pastel "greige" shell with one saturated red accent). Use whenever creating or restyling a page, component, or UI element in frontend/ — new screens, forms, cards, buttons, badges, dashboards, sheet/character UI, VTT overlays and toolbars. Not for backend code.
---

# MyTabletop visual identity

MyTabletop's UI is deliberately **always dark** (no light-mode variant — the
product's own identity, not a missed a11y feature) with an Apple-minimalist
feel: generous whitespace, restrained color, subtle borders instead of heavy
shadows, one accent color spent carefully. The palette went through two
iterations: a saturated wine/mahogany red-on-red scheme first, then a pass
explicitly asked for because that version was hard to read — structural
surfaces were all so dark and so close in value that panels, cards and
borders barely separated from the page background. The current palette
fixes that: **bg/surface/border are soft, low-saturation warm neutrals
("pastel" tones) with clearly stepped lightness, and red is reserved for
the accent only** — don't reintroduce a saturated red into a structural
token, that's the exact regression this fixed.

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
tokens (bg/surface/surface-2/border) are one warm-neutral "greige" ramp with
clearly separated lightness steps — that separation is the whole point, it's
what makes panels/cards/borders visible against each other and against the
page. Only `accent` carries real saturation.

| Token | Hex | Tailwind utility | Role |
|---|---|---|---|
| `--bg` | `#1C1512` | `bg-bg` | Page background |
| `--surface` | `#2A211D` | `bg-surface` | Elevated panels, nav |
| `--surface-2` | `#382C26` | `bg-surface-2` | Cards, inputs — one step lighter than `surface` |
| `--border` | `#6B5347` | `border-border` | Default border, interactive outlines — deliberately a good bit lighter than `surface-2` so edges are actually visible |
| `--border-soft` | `#40332C` | `border-border-soft` | Quieter divider (card edges, panel borders) |
| `--text` | `#F4E9E1` | `text-text` | Primary text — soft pastel cream, never pure `#fff` |
| `--text-muted` | `#C9AD9D` | `text-text-muted` | Secondary text, labels, nav links |
| `--text-faint` | `#93776A` | `text-text-faint` | Tertiary/eyebrow text, placeholders, timestamps |
| `--accent` | `#C1454E` | `bg-accent` / `text-accent` | **The only saturated color in the palette.** Only for primary actions and the current/important state |
| `--accent-strong` | `#E0838A` | `text-accent-strong` | Hover/emphasis on accent, link color on dark surfaces — a lighter, more pastel step of the same red |
| `--accent-soft` | `rgba(193,69,78,.18)` | `bg-accent-soft` | Accent-tinted background (active badge fill) |
| `--on-accent` | `#1C1512` | `text-on-accent` | Text/icon placed *on top of* `--accent` (dark-on-medium-red for contrast — `accent` is mid-brightness now, not dark, so this flipped from light-on-accent in the previous palette) |
| `--rare` | `#B98A6A` | `text-rare` / `bg-rare` | Soft terracotta — **sparingly**, a rare/special indicator only (e.g. an NPC badge), never a second primary color |
| `--ok` | `#85BD9A` | `bg-ok` | Positive/healthy state (e.g. a full resource bar) — the one non-red hue in the palette, kept because "full health = green" is a strong enough UX convention to be worth a functional exception |
| `--danger` | `#D98A78` | `text-danger` | Destructive actions, errors — a soft coral, deliberately *less* saturated than `accent` so the two never compete for "the red that pops" |

Radius scale (also theme tokens, so `rounded-sm/md/lg` map to these, not
Tailwind's defaults): `--radius-sm: 9px` (buttons, inputs, small controls),
`--radius-md: 14px` (cards), `--radius-lg: 20px` (large panels/frames).

**Before touching any of these values**: the previous iteration failed
specifically because structural tokens (bg/surface/border) were all
near-black and all saturated red — nothing separated visually. If you're
ever asked to adjust the palette again, preserve the lightness *steps*
between bg → surface → surface-2 → border (each one should read as clearly
lighter than the last) and keep saturation concentrated in `accent`/
`accent-strong` — don't let it creep back into the structural tokens.

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
- **VTT icon toolbars + dropdown panels** (`VttView.tsx`): modeled after
  Foundry VTT / Owlbear Rodeo's edge toolbars, per explicit reference from
  the project owner. Small icon-only buttons (`ToolbarIconButton` in
  `ui.tsx`, `lucide-react` icons, 18px) sit in a horizontal or vertical
  strip — `bg-surface/90` + `backdrop-blur`, `border-border-soft`, `p-1`,
  icons separated by a `h-5 w-px bg-border-soft` divider when grouping
  distinct concerns (e.g. exit vs. info panels). Clicking an icon toggles a
  **dropdown panel** anchored near it (`absolute`, positioned just past the
  toolbar — `top-16` under a horizontal bar, `right-16` beside a vertical
  one), same floating-panel styling (`bg-surface/95 backdrop-blur
  border-border-soft rounded-md p-4`) as before. Only one panel is open at a
  time (`openPanel: PanelId | null` state) and clicking the canvas itself
  closes whichever is open — clicking *inside* a panel doesn't, since panels
  live outside the pannable canvas element in the DOM. An active icon gets
  `ToolbarIconButton`'s `active` prop (accent-soft fill), giving the
  "currently open tool" affordance the reference screenshots show. This is
  the one place panels float over content instead of being laid out in the
  page — don't reuse it outside the VTT screen, and prefer extending this
  pattern (a new icon + a new panel) over inventing a different floating-UI
  shape for future VTT tools.
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
