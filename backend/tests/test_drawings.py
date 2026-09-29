import pytest


async def _register(client, username: str) -> tuple[str, str]:
    resp = await client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "supersecret",
        },
    )
    token = resp.json()["access_token"]
    me = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    return token, me.json()["id"]


async def _create_tabletop(client, dm_token: str) -> str:
    resp = await client.post(
        "/tabletops",
        json={"name": "Mesa de Teste", "rulebook": "ordem_paranormal_classico"},
        headers={"Authorization": f"Bearer {dm_token}"},
    )
    return resp.json()["id"]


async def _create_scene(client, token: str, tabletop_id: str):
    return await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": "Mapa"},
        files={"image": ("map.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )


@pytest.mark.asyncio
async def test_no_drawings_without_active_scene(client, auth_headers):
    dm_token, _ = await _register(client, "draw1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.get(f"/tabletops/{tabletop_id}/vtt/drawings", headers=auth_headers(dm_token))
    assert resp.json() == []


@pytest.mark.asyncio
async def test_dm_can_create_and_delete_drawing(client, auth_headers):
    dm_token, _ = await _register(client, "draw2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await _create_scene(client, dm_token, tabletop_id)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/drawings",
        json={
            "kind": "freehand",
            "points": [{"x": 0, "y": 0}, {"x": 10, "y": 10}, {"x": 20, "y": 5}],
            "color": "#ff0000",
            "stroke_width": 4,
        },
        headers=auth_headers(dm_token),
    )
    assert created.status_code == 201
    body = created.json()
    assert body["kind"] == "freehand"
    assert len(body["points"]) == 3
    assert body["color"] == "#ff0000"

    listed = await client.get(f"/tabletops/{tabletop_id}/vtt/drawings", headers=auth_headers(dm_token))
    assert len(listed.json()) == 1

    deleted = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/drawings/{body['id']}", headers=auth_headers(dm_token)
    )
    assert deleted.status_code == 204

    listed_after = await client.get(f"/tabletops/{tabletop_id}/vtt/drawings", headers=auth_headers(dm_token))
    assert listed_after.json() == []


@pytest.mark.asyncio
async def test_player_cannot_create_drawing(client, auth_headers):
    dm_token, _ = await _register(client, "draw3")
    player_token, _ = await _register(client, "drawplayer3")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "drawplayer3", "role": "player"},
        headers=auth_headers(dm_token),
    )
    await _create_scene(client, dm_token, tabletop_id)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/drawings",
        json={"kind": "text", "points": [{"x": 5, "y": 5}], "text": "Perigo"},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_map_note_defaults_to_sticky_note_icon_and_accepts_a_custom_one(client, auth_headers):
    dm_token, _ = await _register(client, "draw4")
    tabletop_id = await _create_tabletop(client, dm_token)
    await _create_scene(client, dm_token, tabletop_id)

    default_icon = await client.post(
        f"/tabletops/{tabletop_id}/vtt/notes",
        json={"x": 1, "y": 1, "text": "Nota"},
        headers=auth_headers(dm_token),
    )
    assert default_icon.json()["icon"] == "StickyNote"

    custom_icon = await client.post(
        f"/tabletops/{tabletop_id}/vtt/notes",
        json={"x": 2, "y": 2, "text": "Perigo aqui", "icon": "Skull"},
        headers=auth_headers(dm_token),
    )
    assert custom_icon.status_code == 201
    assert custom_icon.json()["icon"] == "Skull"

    updated = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/notes/{default_icon.json()['id']}",
        json={"icon": "Key"},
        headers=auth_headers(dm_token),
    )
    assert updated.json()["icon"] == "Key"
