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


async def _create_scene(client, dm_token: str, tabletop_id: str):
    return await client.post(
        f"/tabletops/{tabletop_id}/vtt/scenes",
        data={"name": "Mapa"},
        files={"image": ("map.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers={"Authorization": f"Bearer {dm_token}"},
    )


@pytest.mark.asyncio
async def test_notes_empty_without_active_scene(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    listing = await client.get(f"/tabletops/{tabletop_id}/vtt/notes", headers=auth_headers(dm_token))
    assert listing.json() == []


@pytest.mark.asyncio
async def test_dm_can_create_and_edit_note_player_can_only_read(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    player_token, _ = await _register(client, "player2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player2", "role": "player"},
        headers=auth_headers(dm_token),
    )
    await _create_scene(client, dm_token, tabletop_id)

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/notes",
        json={"x": 10, "y": 20, "text": "Armadilha escondida aqui"},
        headers=auth_headers(dm_token),
    )
    assert created.status_code == 201
    note_id = created.json()["id"]

    player_create = await client.post(
        f"/tabletops/{tabletop_id}/vtt/notes",
        json={"x": 1, "y": 1, "text": "não deveria funcionar"},
        headers=auth_headers(player_token),
    )
    assert player_create.status_code == 403

    player_listing = await client.get(
        f"/tabletops/{tabletop_id}/vtt/notes", headers=auth_headers(player_token)
    )
    assert len(player_listing.json()) == 1

    edited = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/notes/{note_id}",
        json={"text": "Editado"},
        headers=auth_headers(dm_token),
    )
    assert edited.json()["text"] == "Editado"

    deleted = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/notes/{note_id}", headers=auth_headers(dm_token)
    )
    assert deleted.status_code == 204
