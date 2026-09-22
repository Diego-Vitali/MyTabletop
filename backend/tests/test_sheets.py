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
async def test_member_can_create_character_sheet(client, auth_headers):
    dm_token, _ = await _register(client, "dm1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "character", "name": "Elena Duarte", "attributes": {"INT": 3, "PRE": 2}},
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["kind"] == "character"
    assert body["attributes"] == {"FOR": 0, "AGI": 0, "INT": 3, "VIG": 0, "PRE": 2}


@pytest.mark.asyncio
async def test_player_cannot_create_npc_sheet(client, auth_headers):
    dm_token, _ = await _register(client, "dm2")
    player_token, _ = await _register(client, "player2")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player2", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "npc", "name": "Soldado", "attributes": {}},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dm_can_create_npc_sheet(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "npc", "name": "Soldado", "attributes": {"FOR": 2}},
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 201
    assert resp.json()["kind"] == "npc"


@pytest.mark.asyncio
async def test_unknown_attribute_key_rejected(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "character", "name": "Teste", "attributes": {"MANA": 5}},
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_owner_can_edit_own_character_sheet(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    player_token, _ = await _register(client, "player5")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player5", "role": "player"},
        headers=auth_headers(dm_token),
    )
    create_resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "character", "name": "Personagem", "attributes": {}},
        headers=auth_headers(player_token),
    )
    sheet_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/tabletops/{tabletop_id}/sheets/{sheet_id}",
        json={"name": "Novo Nome", "attributes": {"AGI": 4}},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Novo Nome"
    assert resp.json()["attributes"]["AGI"] == 4


@pytest.mark.asyncio
async def test_player_cannot_edit_others_character_sheet(client, auth_headers):
    dm_token, _ = await _register(client, "dm6")
    owner_token, _ = await _register(client, "owner6")
    other_token, _ = await _register(client, "other6")
    tabletop_id = await _create_tabletop(client, dm_token)
    for username in ("owner6", "other6"):
        await client.post(
            f"/tabletops/{tabletop_id}/members",
            json={"username_or_email": username, "role": "player"},
            headers=auth_headers(dm_token),
        )
    create_resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "character", "name": "Personagem", "attributes": {}},
        headers=auth_headers(owner_token),
    )
    sheet_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/tabletops/{tabletop_id}/sheets/{sheet_id}",
        json={"name": "Hackeado"},
        headers=auth_headers(other_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_dm_can_edit_any_sheet_and_player_cannot_edit_npc(client, auth_headers):
    dm_token, _ = await _register(client, "dm7")
    player_token, _ = await _register(client, "player7")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player7", "role": "player"},
        headers=auth_headers(dm_token),
    )
    npc_resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "npc", "name": "Monstro", "attributes": {}},
        headers=auth_headers(dm_token),
    )
    sheet_id = npc_resp.json()["id"]

    forbidden = await client.patch(
        f"/tabletops/{tabletop_id}/sheets/{sheet_id}",
        json={"name": "Hackeado"},
        headers=auth_headers(player_token),
    )
    assert forbidden.status_code == 403

    allowed = await client.patch(
        f"/tabletops/{tabletop_id}/sheets/{sheet_id}",
        json={"name": "Monstro Ferido"},
        headers=auth_headers(dm_token),
    )
    assert allowed.status_code == 200
    assert allowed.json()["name"] == "Monstro Ferido"


@pytest.mark.asyncio
async def test_list_and_delete_sheet(client, auth_headers):
    dm_token, _ = await _register(client, "dm8")
    tabletop_id = await _create_tabletop(client, dm_token)
    create_resp = await client.post(
        f"/tabletops/{tabletop_id}/sheets",
        json={"kind": "character", "name": "Temp", "attributes": {}},
        headers=auth_headers(dm_token),
    )
    sheet_id = create_resp.json()["id"]

    list_resp = await client.get(
        f"/tabletops/{tabletop_id}/sheets", headers=auth_headers(dm_token)
    )
    assert len(list_resp.json()) == 1

    del_resp = await client.delete(
        f"/tabletops/{tabletop_id}/sheets/{sheet_id}", headers=auth_headers(dm_token)
    )
    assert del_resp.status_code == 204

    list_resp = await client.get(
        f"/tabletops/{tabletop_id}/sheets", headers=auth_headers(dm_token)
    )
    assert list_resp.json() == []
