from app.core.geometry import Point, Segment, is_visible
from app.core.ws_manager import manager
from app.models.scene import Scene
from app.models.tabletop import Tabletop
from app.models.token import Token
from app.models.wall import Wall
from app.schemas.token import TokenPublic

# scene_id -> the set of live token ids players could see as of the last
# recompute. In-memory only (matches ws_manager's own single-process
# design) — cleared whenever a scene is (de)activated, see reset_scene_cache.
_visible_cache: dict[str, set[str]] = {}


def reset_scene_cache(scene_id: str) -> None:
    _visible_cache.pop(scene_id, None)


async def _compute_visible(tabletop: Tabletop, scene_id: str) -> tuple[set[str], dict[str, Token]]:
    tokens = await Token.find(Token.tabletop_id == str(tabletop.id)).to_list()
    walls = await Wall.find(Wall.scene_id == scene_id, Wall.blocks_light == True).to_list()  # noqa: E712
    segments: list[Segment] = [((w.x1, w.y1), (w.x2, w.y2)) for w in walls]
    player_ids = {m.user_id for m in tabletop.members if m.role != "dm"}
    lights: list[tuple[Point, float]] = [
        ((t.x, t.y), t.light_radius or 0.0)
        for t in tokens
        if t.emits_light and t.created_by in player_ids
    ]

    visible: set[str] = set()
    for t in tokens:
        point = (t.x, t.y)
        if any(is_visible(point, light, radius, segments) for light, radius in lights):
            visible.add(str(t.id))
    return visible, {str(t.id): t for t in tokens}


async def gated_token_broadcast(tabletop: Tabletop, message: dict) -> None:
    """Every token_added/token_updated/token_deleted broadcast goes through
    here instead of straight to `manager.broadcast`. When the active scene
    doesn't have dynamic lighting on, behavior is unchanged (broadcast to
    everyone). When it's on, the DM still gets the raw event unconditionally,
    but players don't — recompute_and_broadcast below decides what (if
    anything) they're told, based on actual line-of-sight."""
    scene = await Scene.find_one(Scene.tabletop_id == str(tabletop.id), Scene.is_active == True)  # noqa: E712
    if not scene or not scene.dynamic_lighting_enabled:
        await manager.broadcast(str(tabletop.id), message)
        return

    await manager.send_to_dm(str(tabletop.id), message)
    await recompute_and_broadcast(tabletop, str(scene.id))


async def recompute_and_broadcast(tabletop: Tabletop, scene_id: str) -> None:
    """Recomputes which live tokens are currently lit for the players' combined
    vision and tells player sockets what changed: newly-visible tokens (or
    ones still visible but with fresh data) get `token_entered_view` — an
    upsert the client applies whether or not it already has that token —
    and newly-hidden ones get `token_left_view` (id only; the token is NOT
    deleted server-side, the player client just stops rendering it)."""
    new_visible, by_id = await _compute_visible(tabletop, scene_id)
    old_visible = _visible_cache.get(scene_id, set())
    _visible_cache[scene_id] = new_visible

    tabletop_id = str(tabletop.id)
    for token_id in new_visible:
        token = by_id.get(token_id)
        if not token:
            continue
        await manager.send_to_players(
            tabletop_id,
            {"type": "token_entered_view", "token": TokenPublic.from_token(token).model_dump(mode="json")},
        )
    for token_id in old_visible - new_visible:
        await manager.send_to_players(tabletop_id, {"type": "token_left_view", "token_id": token_id})


async def is_token_visible_to_players(scene_id: str, token_id: str) -> bool:
    """Cheap read-only check against the last computed set — used to gate
    the high-frequency token_move_live relay without recomputing on every
    pointermove (see routers/ws.py)."""
    return token_id in _visible_cache.get(scene_id, set())
