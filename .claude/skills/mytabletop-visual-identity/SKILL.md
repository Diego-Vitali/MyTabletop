---
name: mytabletop-visual-identity
description: Visual identity and UI conventions for the MyTabletop frontend — the apple.com design language in its always-dark "Pro product page" variant (black/graphite sections, #f5f5f7 text, one blue action color, pill buttons, translucent dark-glass nav bars, full-bleed tiles, Store-style card shelves, frosted VTT panels). Use whenever creating or restyling a page, component, or UI element in frontend/ — new screens, forms, cards, buttons, badges, dashboards, sheet/character UI, VTT overlays and toolbars. Not for backend code.
---

# MyTabletop visual identity

The whole frontend follows **the apple.com design language**, on explicit
request from the project owner (2026-10-14: "seguir exatamente o mesmo
padrão e layout que o site www.apple.com"), **always in its dark variant**
(the look of Apple's dark "Pro" product pages) — asked for right after a
light version was built ("deixa tudo escuro"). There is no light theme and
no `prefers-color-scheme` switch; `:root` sets `color-scheme: dark` so
native controls (selects, number spinners, scrollbars, color pickers) also
render dark. It replaced an earlier "greige" shell with a red accent —
don't reintroduce that look, and don't drift toward a generic SaaS
dashboard either. When unsure how
something should look, ask "how would apple.com (or the Apple Store /
Apple Account pages) lay this out?" and follow that.

## Before building anything

1. **Reuse `frontend/src/components/ui.tsx` first.** Prefer extending a
   primitive (a new `Button` variant, a new `Card` variant) over
   hand-rolling styled elements inline.
2. **Never introduce a raw hex color in a component.** Every color comes
   from the tokens in `frontend/src/app/globals.css` (`:root` +
   `@theme inline`). If a new token is genuinely needed, add it there
   first. The only hex values outside `globals.css` are illustrative map
   colors that live *inside* map content (wall stroke, default draw
   color) and the `themeColor` metadata.
3. **Don't reach for Tailwind's default palette** (`gray-*`, `blue-*`,
   `black/5`...). Use the named tokens (`text-muted`, `border`,
   `hairline`, `surface-3`...).

## Design tokens

Surfaces are a graphite ramp with clearly separated lightness steps — each
step must stay visibly different from the one it sits on (that's what makes
cards, tiles and panels read against each other without heavy shadows).

| Token | Value | Utility | Role |
|---|---|---|---|
| `--bg` | `#000000` | `bg-bg` | Page background, "base" sections and tiles |
| `--bg-alt` | `#101011` | `bg-bg-alt` | Alternate section — Store-like pages, footer, ribbon |
| `--surface` | `#1d1d1f` | `bg-surface` | Cards, panels, "raised" tiles, the open nav/flyout |
| `--surface-2` | `#2c2c2e` | `bg-surface-2` | Quiet fill *inside* a surface (stat tiles in a card), field fill (`/60`) |
| `--surface-3` | `#3a3a3c` | `bg-surface-3` | Gray pills/chips, switch track (off) |
| `--control-selected` | `#636366` | `bg-control-selected` | Selected segment of a `SegmentedControl` |
| `--border` | `#424245` | `border-border` | Form fields, dividers |
| `--border-soft` | `#333336` | `border-border-soft` | Quieter row separators |
| `--hairline` | white 10% | `border-hairline` / `bg-hairline` | Glass edges, icon-button hover |
| `--text` | `#f5f5f7` | `text-text` | Primary text |
| `--text-muted` | `#a1a1a6` | `text-text-muted` | Secondary text, the gray half of "**Bold.** Gray." headings |
| `--text-faint` | `#86868b` | `text-text-faint` | Placeholders, floating labels, tertiary |
| `--accent` | `#0071e3` | `bg-accent` | **The only action color** (fills): primary buttons, selected states |
| `--accent-hover` | `#0077ed` | `bg-accent-hover` | Primary button hover |
| `--accent-strong` | `#2997ff` | `text-accent-strong` | Text links ("Saiba mais ›"), outline buttons, accent icons — the blue that reads on dark |
| `--accent-soft` | blue 16% | `bg-accent-soft` | Tinted badge/hover fill |
| `--on-accent` | `#ffffff` | `text-on-accent` | Text on blue/red/monogram, switch knob |
| `--rare` | `#f56300` | `text-rare` | Apple's orange "New" eyebrow (dark version) — sparingly, for the rare/special label (NPC, "Você é o mestre") |
| `--ok` / `--warn` / `--danger` | `#30d158` / `#ff9f0a` / `#ff453a` | `bg-ok`... | iOS dark system colors: switch on, HP bar states, errors/destructive (`--danger-soft` = red 14% invalid-field fill) |
| `--ink` / `--ink-2` / `--ink-3` | `#000` / `#161617` / `#272729` | `bg-ink`... | Mockup bezels/terminal; `bg-ink-2` is also the "deep" home tile tone |
| `--on-ink` / `--on-ink-muted` / `--link-on-ink` | `#f5f5f7` / `#86868b` / `#2997ff` | | Text inside mockups (kept as aliases of the normal text/link colors) |

Never put text links or icons in `text-accent` (`#0071e3`) — on black it's
too dark; use `text-accent-strong`. `bg-accent` is for filled buttons and
selected fills only.

Radius: `rounded-sm` 12px (fields, small tiles), `rounded-md` 18px (cards,
panels), `rounded-lg` 28px (big frames, the VTT dock). Buttons, chips,
badges and segmented controls are `rounded-full`.

Shadows (theme tokens, deep blacks since they sit on dark):
`shadow-card`, `shadow-card-hover`, `shadow-segment`, `shadow-float` (VTT
panels). On dark they mostly add depth at the edges — separation comes from
the surface ramp, not the shadow. Cards
lift with `hover:scale-[1.01] hover:shadow-card-hover` — that's the only
hover motion on cards.

## Typography

- Font stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text"...` first
  (real SF Pro on Apple devices), then **Inter** (`next/font/google`,
  `--font-inter`) as the free fallback everywhere else. Don't add a web
  font for SF Pro — it's not licensed for that.
- Body is 17px / 1.47 / -0.022em (set on `body`). `text-xs`/`text-sm` carry
  Apple's 12px/14px tracking.
- **Use the `type-*` utilities for headings** (responsive, defined with
  `@utility` in `globals.css`), not ad-hoc sizes:
  `type-display` (80/64/48 — product name heroes), `type-hero` (56/40 —
  tile and page titles), `type-headline` (48/32 — section titles),
  `type-title` (40/28), `type-subhead` (28/21 regular — the line under a
  hero title), `type-card` (28/24 — card titles), `type-eyebrow` (21/19
  semibold — a small line above a title), `type-caption` (12px semibold
  uppercase — card eyebrows like "VOCÊ É O MESTRE").
- **No monospace in the UI.** Numbers use `tabular-nums` on the normal
  font. `font-mono` (SF Mono stack) is only for actual code/terminal text.

## Layout patterns (and which page uses each)

- **Global nav** (`GlobalNav.tsx`): 44px (48px mobile) translucent dark
  `glass` bar (`rgb(22 22 23 / .8)` + blur, Apple's dark globalnav),
  glyph at the left, items spread edge to edge at 12px, account icon at
  the right. Items with a flyout (`Mesas`, `Fichas`, `Virtual Tabletop`,
  account) expand a `bg-surface` panel downward on hover — first column with big
  24px links, other columns with 12px links — and a blurred "curtain"
  covers the page. On mobile: two-line hamburger → full-screen menu with
  28px links and drill-down submenus. The global nav scrolls away; it is
  not sticky.
- **Local nav** (`LocalNav.tsx`): the sticky 52px product bar — title at
  the left (21px semibold), 12px links at the right with the current one
  dimmed, one small blue pill CTA ("Abrir VTT"). Links collapse into a
  chevron dropdown on mobile. Used by every tabletop/sheet page and the
  account pages.
- **Footer** (`SiteFooter.tsx`): `bg-bg-alt`, 12px gray text — notes,
  glyph line, directory columns (accordions on mobile), copyright row.
- **Content width**: `page-container` (980px desktop, 692px tablet, 87.5%
  mobile — Apple's own breakpoints). `page-container-wide` for wider
  content. Sections are full-bleed (`bg-bg` / `bg-bg-alt` / `bg-ink`) with
  `page-container` inside; there is no shared container in the layout.
- **Home tiles** (`app/(app)/page.tsx`): stacked full-width tiles in three
  graphite tones (`base` #000, `raised` #1d1d1f, `deep` #161617 — the dark
  equivalent of Apple's white/gray/black alternation) with centered
  title + subhead + CTAs at the top and the "product shot" at the bottom, then a 2-column tile grid with 12px gaps.
  Product shots are CSS mockups in `Mockups.tsx` (laptop, tablet, fog map,
  attributes, initiative list, terminal) — there are no marketing images.
- **Ribbon**: one centered 14px line on `bg-bg-alt` with a `ChevronLink`.
- **"Bold. Gray." headings** (`SectionHeading`): the Store pattern —
  "**Mesas.** Todas as suas campanhas, num só lugar." Use it for every
  page and section title that has a tagline.
- **Shelves** (`Shelf`/`ShelfItem`): horizontal snap-scrolling card rows
  aligned to the content column and bleeding off the right edge, with the
  round gray paddle buttons underneath. Used for tabletops and the home
  "Por que MyTabletop" cards.
- **Store cards** (`TabletopCard`): `bg-surface`, `rounded-md`, `shadow-card`,
  caption eyebrow → `type-card` title → gray line → the visual (the live
  scene image, or `MapThumb`) → footer row.
- **Product page** (`TabletopDetail`): local nav, centered hero (eyebrow,
  `type-display` name, subhead, two pill CTAs, framed visual), a row of
  big-number stats separated by hairlines, then a gray section with an
  inset grouped list (rows separated by `border-border-soft`, `Avatar`
  monograms) and an invite form card.
- **Tech-specs page** (`SheetDetail`): centered hero, then `SpecRow`s —
  label column at the left (`type-eyebrow`), content at the right, `border-t`
  between rows. Unsaved edits surface in a sticky bottom `glass` bar with
  the actions (destructive actions ask for a second click).
- **Account pages** (`AccountShell`): Apple Account style — local nav
  "Conta MyTabletop", app-icon tile, `type-title` heading, gray subtitle,
  a narrow (460px) centered column. Login uses two joined `TextField`s
  (`position="top"`/`"bottom"`) with the round arrow submit inside the
  password field.

## Components (`ui.tsx`)

- `Button` / `buttonClass(variant, size)` — pills. `primary` (filled blue,
  one per view), `secondary` (light-blue outline — the "Comprar" next to
  "Saiba mais"), `tertiary` (gray fill, neutral actions in panels), `ghost`,
  `danger` (red text on gray pill), `inverse` (light pill with dark text —
  maximum emphasis, rare). Sizes `sm`
  (12px, local-nav/panel), `md` (14px), `lg` (17px, heroes/forms). Use
  `buttonClass` on `<Link>` instead of nesting a `<button>` in a link.
- `ChevronLink` — the blue "Saiba mais ›" text link (`onInk` on dark
  tiles, `external` for new-tab links).
- `TextField` — 56px field with a floating label; `invalid` turns it red;
  `position` joins fields into a group; `trailing` for an inline button.
- `Input` / `Select` / `Textarea` — compact fields; `dense` for VTT panels
  (never override padding/font size via `className`, use `dense`).
  `Select` gets the custom chevron (`select-chevron`).
- `SegmentedControl` — macOS/iOS dark segmented control (`surface-2`
  track, lighter `control-selected` segment). Use it for 2–4 mutually exclusive options.
- Switches: `<input type="checkbox" role="switch" className="switch">` —
  iOS toggle styled in `globals.css` (green when on). Plain checkboxes stay
  for multi-select lists.
- Option "configurator" buttons (VTT tool pickers): `rounded-sm border`,
  selected = `border-accent ring-1 ring-accent` (the Apple Store
  configurator's blue 2px outline), unselected = `border-border`.
- `Card` (`raised` = `bg-surface` + shadow on black/`bg-alt` / `flat` =
  `surface-2` / `outline`), `interactive` adds the hover lift.
- `Badge` (`accent`, `neutral`, `rare`), `Avatar` (gradient monogram),
  `SectionHeading`, `Spinner`, `FieldError` (red text with icon).

## VTT (`VttView.tsx`, `vtt/*`)

- Canvas background is `bg-surface`; everything floating over it uses
  the **`panel-float`** material (`rgb(40 40 42 / .8)` + 24px blur +
  saturate + white hairline border + `shadow-float`) — one step lighter
  than the canvas so panels separate from it, `rounded-md p-4` for panels,
  `rounded-full p-1` for the toolbar capsule, `rounded-lg` for the bottom
  dock (inset from the edges, like the macOS Dock).
- Panel titles: `text-[15px] font-semibold text-text`. Help text:
  `text-xs text-text-faint`. Inline actions: blue/red `text-xs` links.
- `ToolbarIconButton`: 36px round icon button, active = filled blue.
  Toolbar icons are `lucide-react` at 18px; the toolbar scrolls
  horizontally on narrow screens.
- Folder chips in the dock: selected = `bg-text text-surface` (inverted,
  light pill),
  others gray pills. Tokens/Cenas switch is a `SegmentedControl`.
- HP bars: `bg-ok` > 50%, `bg-warn` > 20%, `bg-danger` below.
- Selection/rotate/resize handles and note pins get a light ring
  (`border-2 border-text`) so they read on dark maps.
- Only one panel open at a time; clicking the canvas closes it (unchanged
  behavior from the original Foundry/Owlbear-inspired toolbar design).

## Motion

- `animate-rise` (fade + 24px rise) staggers hero text with
  `[animation-delay:…]`; `animate-flyout` for menus/dropdowns. Keep motion
  to these; `prefers-reduced-motion` disables all of it in `globals.css`.
