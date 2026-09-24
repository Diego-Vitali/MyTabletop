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


@pytest.mark.asyncio
async def test_player_cannot_create_scene_folder(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    player_token, _ = await _register(client, "player1")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player1", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/folders",
        json={"kind": "scene", "name": "Masmorras"},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_player_can_create_token_folder(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    player_token, _ = await _register(client, "player2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player2", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/folders",
        json={"kind": "token", "name": "Monstros"},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 201
    assert resp.json()["kind"] == "token"


@pytest.mark.asyncio
async def test_only_dm_or_creator_can_rename_token_folder(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    p1_token, _ = await _register(client, "player3a")
    p2_token, _ = await _register(client, "player3b")
    tabletop_id = await _create_tabletop(client, dm_token)
    for username in ("player3a", "player3b"):
        await client.post(
            f"/tabletops/{tabletop_id}/members",
            json={"username_or_email": username, "role": "player"},
            headers=auth_headers(dm_token),
        )

    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/folders",
        json={"kind": "token", "name": "Monstros"},
        headers=auth_headers(p1_token),
    )
    folder_id = created.json()["id"]

    other_rename = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/folders/{folder_id}",
        json={"name": "Renomeado"},
        headers=auth_headers(p2_token),
    )
    assert other_rename.status_code == 403

    own_rename = await client.patch(
        f"/tabletops/{tabletop_id}/vtt/folders/{folder_id}",
        json={"name": "Renomeado"},
        headers=auth_headers(p1_token),
    )
    assert own_rename.status_code == 200
    assert own_rename.json()["name"] == "Renomeado"

    dm_delete = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/folders/{folder_id}", headers=auth_headers(dm_token)
    )
    assert dm_delete.status_code == 204


@pytest.mark.asyncio
async def test_list_folders_filters_by_kind(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    tabletop_id = await _create_tabletop(client, dm_token)

    await client.post(
        f"/tabletops/{tabletop_id}/vtt/folders",
        json={"kind": "scene", "name": "Masmorras"},
        headers=auth_headers(dm_token),
    )
    await client.post(
        f"/tabletops/{tabletop_id}/vtt/folders",
        json={"kind": "token", "name": "Monstros"},
        headers=auth_headers(dm_token),
    )

    scene_folders = await client.get(
        f"/tabletops/{tabletop_id}/vtt/folders?kind=scene", headers=auth_headers(dm_token)
    )
    assert [f["kind"] for f in scene_folders.json()] == ["scene"]

    token_folders = await client.get(
        f"/tabletops/{tabletop_id}/vtt/folders?kind=token", headers=auth_headers(dm_token)
    )
    assert [f["kind"] for f in token_folders.json()] == ["token"]

    all_folders = await client.get(
        f"/tabletops/{tabletop_id}/vtt/folders", headers=auth_headers(dm_token)
    )
    assert len(all_folders.json()) == 2


@pytest.mark.asyncio
async def test_deleting_a_folder_unfiles_its_templates(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    folder = await client.post(
        f"/tabletops/{tabletop_id}/vtt/folders",
        json={"kind": "token", "name": "Monstros"},
        headers=auth_headers(dm_token),
    )
    folder_id = folder.json()["id"]

    template = await client.post(
        f"/tabletops/{tabletop_id}/vtt/token-templates",
        data={"name": "Goblin", "folder_id": folder_id},
        files={"image": ("goblin.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers=auth_headers(dm_token),
    )
    assert template.json()["folder_id"] == folder_id

    await client.delete(
        f"/tabletops/{tabletop_id}/vtt/folders/{folder_id}", headers=auth_headers(dm_token)
    )

    templates = await client.get(
        f"/tabletops/{tabletop_id}/vtt/token-templates", headers=auth_headers(dm_token)
    )
    assert templates.json()[0]["folder_id"] is None
