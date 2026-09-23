# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

MyTabletop is a self-hosted Virtual Tabletop RPG system (a free alternative
to Foundry VTT). Full vision and roadmap live in [README.md](README.md).
**Phase 1** (users, JWT auth, tabletops with DM/Player roles) is done.
**Phase 2** (character/NPC sheets) and **Phase 3** (the VTT) are both being
built incrementally and interleaved, one concept at a time, on explicit
direction from the project owner — don't assume the next slice (sheets:
NEX, skills, derived stats, rituals; VTT: tokens, multi-user cursors) without
asking. See "Sheet architecture" and "VTT architecture" below for what
exists today. Phase 4 (the Obsidian-style Markdown GM shield) does not exist
yet. Tokens-on-a-scene don't exist yet — today's VTT slice is a full-screen
canvas with a DM-controlled background image, live-synced over WebSocket,
that every member can independently pan/zoom.

Monorepo layout: `backend/` (FastAPI) and `frontend/` (Next.js), deployed
together via `docker-compose.yml` at the repo root.

## Commands

### Docker (full stack)

```bash
cp .env.example .env
docker compose up --build
```

Backend: `http://localhost:8042` (Swagger UI at `/docs`) · Frontend:
`http://localhost:3000` · Mongo: `localhost:27017`. Override exposed host
ports via `BACKEND_PORT` / `FRONTEND_PORT` / `MONGO_PORT` in `.env` if one is
already taken on the host.

### Backend (`backend/`)

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload   # requires a local MongoDB, see MONGO_URI in .env
pytest                          # run full suite
pytest tests/test_vtt.py::test_dm_can_set_background  # single test
```

Tests run against `mongomock-motor` (an in-memory Mongo mock), not a real
database — no live Mongo needed for `pytest`. `pyproject.toml` sets
`asyncio_mode = "auto"`, so async test functions don't need
`@pytest.mark.asyncio`... except this project's tests still carry that
marker explicitly; either style works.

### Frontend (`frontend/`)

```bash
npm install
npm run dev      # dev server
npm run build    # production build (also runs the TypeScript check)
npm run lint     # eslint
```

No frontend test runner is configured yet.

## Backend architecture

Layered, one direction of dependency: **routers → services → models**.

- `app/models/` — Beanie `Document`s (Pydantic models that map directly to
  MongoDB collections: `User`, `Tabletop`). `app/models/rulebooks.py` is a
  plain dict (`RULEBOOK_REGISTRY`) that is the extension point for future
  rulebooks beyond `ordem_paranormal_classico` — it's just used to validate
  the `Tabletop.rulebook` field today.
- `app/schemas/` — request/response Pydantic DTOs, kept separate from the DB
  models.
- `app/services/` — business logic that touches more than one document
  (`auth_service.py`, `tabletop_service.py`). Routers stay thin and call
  into these.
- `app/routers/` — FastAPI endpoints only; auth/role checks are delegated to
  `app/core/deps.py` dependencies (`get_current_user`, `require_member`,
  `require_dm`).
- `app/core/security.py` — bcrypt password hashing and JWT
  encode/decode (24h expiry, configured via `Settings` in `app/core/config.py`).
- `app/main.py` — creates the FastAPI app, and in `lifespan` connects to
  Mongo via **`pymongo`'s native async client** (`pymongo.AsyncMongoClient`)
  and calls `beanie.init_beanie`. Do not reach for the `motor` package here:
  Beanie 2.x expects `pymongo`'s own async driver, and mixing in `motor`
  against a real MongoDB causes a `MotorDatabase object is not callable`
  startup crash (it only worked in tests because those use
  `mongomock-motor`, which is a different, tolerant code path — see
  `tests/conftest.py`).

**Membership is intentionally denormalized in two places**: `User.tabletops`
(a list of `{tabletop_id, role, joined_at}`, required by the original spec)
and `Tabletop.members` (a list of `{user_id, username, role, joined_at}`,
needed to list a table's members without scanning every user). Both lists
are written together inside `tabletop_service.py` functions
(`create_tabletop`, `add_member`, `update_member_role`, `remove_member`).
There's no multi-document transaction (no replica set locally), so if you
add a new mutation of tabletop membership, keep writing both sides in the
same service function. A tabletop must always retain at least one DM —
`update_member_role`/`remove_member` block demoting or removing the last one.

### Sheet architecture (Phase 2, in progress)

`app/models/sheet.py` (`Sheet`) is deliberately generic today: `kind`
(`"character"` | `"npc"`), `owner_id`, `tabletop_id`, `rulebook`, `name`, and
a flexible `attributes: dict[str, int]` — no NEX/skills/derived-stat/ritual
fields yet, by design (see the Phase 2 note above). Rulebook-specific pieces
don't get hardcoded onto `Sheet` as they're added; they get validated
against `RULEBOOK_REGISTRY[rulebook]` instead — e.g. `attributes` keys must
be exactly the set declared in that rulebook's `"attributes"` list
(`app/models/rulebooks.py`, `attribute_keys()`), enforced in
`sheet_service._validate_attributes`. Follow this pattern (registry-declared
shape + validation in the service layer) for the next slice, rather than
adding fields like `nex` or `skills` directly to the `Sheet` model.

Permissions (`app/core/deps.py`): any tabletop member can create/own a
`"character"` sheet; only a DM can create a `"npc"` sheet
(`sheet_service.create_sheet`). Editing/deleting uses
`require_sheet_editor(tabletop, sheet, user)`: a DM can touch any sheet in
their tabletop, a non-DM member only their own `"character"` sheets — never
an `"npc"` one. All tabletop members can currently *view* every sheet
(including NPCs) — there's no hidden-from-players concept yet.

Frontend mirrors the attribute registry in `src/lib/types.ts`
(`ATTRIBUTE_DEFS`, kept in sync with `RULEBOOK_REGISTRY` by hand — there's no
shared source of truth between backend and frontend yet). Stat blocks render
via `src/components/AttributesEditor.tsx`, which is meant to be the reusable
shape for *any* future stat display (resources, skills, NEX), not just
attributes — extend it rather than building a parallel stat-tile component.

### VTT architecture (Phase 3, in progress)

**The background is not a separate resource** — this was deliberately
simplified from an earlier "Scene" collection (list/switch/delete) after
explicit product direction: the VTT background is fixed, singular, and
un-deletable by anyone (DM included). It's just one field,
`Tabletop.background_image` (a filename, nullable), replaced in place by
the DM. There is no scene library, no "activate" endpoint, no delete
endpoint — don't reintroduce that shape unless asked again.

- `PUT /tabletops/{id}/vtt/background` (`app/routers/vtt.py`, DM-only,
  `multipart/form-data` with an `image` file — this is the one endpoint in
  the API that isn't JSON in/out, hence `python-multipart` in
  `pyproject.toml`) replaces the background: `vtt_service.set_background`
  saves the new file, points `Tabletop.background_image` at it, deletes the
  old file (no history kept), and broadcasts the change over WebSocket.
- Images live on **disk**, not in Mongo (`app/core/storage.py`, `UPLOAD_DIR`
  = `<repo>/backend/uploads/`, a Docker volume — `uploads_data:/app/uploads`
  in `docker-compose.yml` — so they survive container recreation).
  `save_image` validates content-type against an allowlist
  (`ALLOWED_IMAGE_TYPES`: PNG/JPEG/WEBP/GIF) and a 15MB cap, then writes it
  under a random `uuid4` filename (never trust/reuse the uploaded filename).
  Served back by mounting `StaticFiles` at `/uploads` in `app/main.py`;
  `TabletopPublic.background_image_url` is the browsable path
  (`/uploads/{filename}`) — a relative path from the *backend's* origin, so
  the frontend prepends `API_URL` to it, not its own origin.
- **Real-time sync** (`app/core/ws_manager.py` + `app/routers/ws.py`): a
  single in-memory `ConnectionManager` keyed by `tabletop_id` — fine for one
  backend process (this project's local self-hosted target), would need a
  pub/sub backend to run more than one. `GET /ws/tabletops/{id}` (note: a
  WebSocket route, not visible in `/docs`/OpenAPI) authenticates via a
  `?token=<jwt>` query param rather than an `Authorization` header, because
  the browser's native `WebSocket` constructor can't set custom headers.
  `set_background` broadcasts `{"type": "background_updated",
  "background_image_url": "..."}` to everyone connected to that tabletop's
  room; there's no other message type yet (no client→server messages are
  expected — the endpoint just blocks on `receive_text()` to detect
  disconnects). This is the first WebSocket usage in the app and the
  pattern (one manager, one room per tabletop, JSON `{"type": ...}`
  messages) is meant to be extended for tokens later, not replaced.
- Tests: `tests/test_vtt.py` covers the HTTP endpoint; `tests/test_ws_manager.py`
  unit-tests `ConnectionManager` directly against fake WebSocket objects
  (`send_json`) rather than through the full ASGI stack — our async
  `httpx`-based test `client` fixture doesn't support WebSocket upgrades, so
  there's no automated test of the endpoint's auth/broadcast wiring end to
  end; that's been verified manually instead (two sessions/tabs, one
  uploading, one watching it update live).

## Frontend architecture

**Visual identity**: before styling anything, read the
`mytabletop-visual-identity` skill
(`.claude/skills/mytabletop-visual-identity/SKILL.md`) — it documents the
"Sinal" design tokens (dark navy + gold accent, deliberately single-theme),
typography, and the `src/components/ui.tsx` primitives (`Button`, `Input`,
`Select`, `Card`, `Badge`, `FieldError`) that essentially every page is
built from. Don't hand-roll styled markup or introduce raw hex colors when
those primitives and tokens already cover the case.

Next.js App Router, but **auth is plain client-side JWT in `localStorage`**,
not cookies/middleware — there is no server-side session. The pattern:

- `src/lib/api.ts` — thin `fetch` wrapper that injects `Authorization:
  Bearer <token>` and throws `ApiError` on non-2xx responses.
- `src/lib/auth-context.tsx` — `AuthProvider` holds `token`/`user`/`loading`
  in React state, mirrors the token to `localStorage`, and exposes
  `login`/`register`/`logout`/`refreshUser`. Wraps the whole app from
  `src/app/layout.tsx`.
- `src/components/RequireAuth.tsx` — client-only guard that redirects to
  `/login` when there's no authenticated user; wrap any page that needs a
  logged-in user in it (see `src/app/tabletops/page.tsx` and
  `src/components/TabletopDetail.tsx`).
- Dynamic routes with an authenticated, client-fetched detail view are split
  in two: e.g. `app/(app)/tabletops/[id]/page.tsx` is a plain **Server
  Component** that only `await`s the `params` Promise and passes the plain
  `id` string down to a **Client Component** (`components/TabletopDetail.tsx`)
  that does the actual fetching/rendering. Follow this split for any future
  dynamic, client-rendered route — a Client Component page can't `await
  params` directly.
- `NEXT_PUBLIC_API_URL` is baked in at Next.js **build time** (see the
  `ARG`/`ENV` in `frontend/Dockerfile` and the build `args` in
  `docker-compose.yml`), not read at runtime — changing it requires a
  rebuild of the frontend image/bundle, not just a container restart.

**Route groups**: `src/app/(app)/` holds every page that gets the normal
chrome (`NavBar` + centered `max-w-4xl` container, applied by
`(app)/layout.tsx`). `src/app/tabletops/[id]/vtt/page.tsx` is deliberately
**outside** that group — it only inherits the root `layout.tsx` (fonts +
`AuthProvider`, nothing else), because the VTT is a full-viewport canvas
with no navbar. `(app)` doesn't appear in the URL (`/tabletops` either
way), so when adding a new page ask whether it wants the shared chrome —
if yes it goes in `(app)/`, if it needs to be edge-to-edge (like the VTT)
it goes outside. Don't add a second *root* layout (a group with its own
`<html>`/`<body>`) for this — Next.js forces a full page reload navigating
between different root layouts, and this project only needs a different
nested layout, not a different root.

### Important: this is Next.js 16, not the Next.js in your training data

`frontend/AGENTS.md` (auto-generated, re-added by `next dev` — keep it) warns
that this version has breaking API/convention changes. Before writing
frontend code, check `frontend/node_modules/next/dist/docs/` for the current
behavior — most relevant here: route `params`/`searchParams` are `Promise`s
that must be `await`ed, and the `PageProps<'/route/[slug]'>` /
`LayoutProps<'/route'>` global helper types (no import needed) are how page
and layout prop types are declared.

### Effect lint rule: no synchronous `setState` inside `useEffect`

`eslint-plugin-react-hooks` here enables `react-hooks/set-state-in-effect`,
which errors on any state setter called synchronously in the body of a
`useEffect` callback — including calling an `async` helper function that
sets state before its first `await`. The pattern used throughout this repo
(see the effects in `src/lib/auth-context.tsx`, `src/app/tabletops/page.tsx`,
`src/components/TabletopDetail.tsx`) is: keep the effect callback
non-`async`, fire the request, and set state inside its `.then(onSuccess,
onError)` callbacks (with an `ignore` flag closed over for cleanup). Follow
that shape for new data-fetching effects instead of `async () => {...}`
directly inside `useEffect`.

## Data model notes

- `rulebook` on a `Tabletop` is a string key into `RULEBOOK_REGISTRY`
  (`app/models/rulebooks.py`) — currently only `"ordem_paranormal_classico"`.
  Adding a new rulebook starts there.
- Passwords are hashed with `bcrypt` directly (not `passlib`, which has
  known compatibility issues with recent `bcrypt` releases).
