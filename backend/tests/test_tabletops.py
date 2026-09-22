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
    body = resp.json()
    token = body["access_token"]
    me = await client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    return token, me.json()["id"]


@pytest.mark.asyncio
async def test_create_tabletop_makes_creator_dm(client, auth_headers):
    token, user_id = await _register(client, "dm_user")
    resp = await client.post(
        "/tabletops",
        json={"name": "Mesa de Teste", "rulebook": "ordem_paranormal_classico"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["members"] == [
        {
            "user_id": user_id,
            "username": "dm_user",
            "role": "dm",
            "joined_at": body["members"][0]["joined_at"],
        }
    ]


@pytest.mark.asyncio
async def test_create_tabletop_rejects_invalid_rulebook(client, auth_headers):
    token, _ = await _register(client, "dm_user2")
    resp = await client.post(
        "/tabletops",
        json={"name": "Mesa", "rulebook": "nao_existe"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_dm_can_add_player(client, auth_headers):
    dm_token, _ = await _register(client, "dm3")
    player_token, player_id = await _register(client, "player3")

    create_resp = await client.post(
        "/tabletops",
        json={"name": "Mesa", "rulebook": "ordem_paranormal_classico"},
        headers=auth_headers(dm_token),
    )
    tabletop_id = create_resp.json()["id"]

    add_resp = await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player3", "role": "player"},
        headers=auth_headers(dm_token),
    )
    assert add_resp.status_code == 200
    member_ids = [m["user_id"] for m in add_resp.json()["members"]]
    assert player_id in member_ids

    list_resp = await client.get("/tabletops", headers=auth_headers(player_token))
    assert len(list_resp.json()) == 1


@pytest.mark.asyncio
async def test_player_cannot_add_member(client, auth_headers):
    dm_token, _ = await _register(client, "dm4")
    player_token, _ = await _register(client, "player4")

    create_resp = await client.post(
        "/tabletops",
        json={"name": "Mesa", "rulebook": "ordem_paranormal_classico"},
        headers=auth_headers(dm_token),
    )
    tabletop_id = create_resp.json()["id"]
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player4", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "dm4", "role": "player"},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_cannot_demote_last_dm(client, auth_headers):
    dm_token, dm_id = await _register(client, "onlydm")
    create_resp = await client.post(
        "/tabletops",
        json={"name": "Mesa", "rulebook": "ordem_paranormal_classico"},
        headers=auth_headers(dm_token),
    )
    tabletop_id = create_resp.json()["id"]

    resp = await client.patch(
        f"/tabletops/{tabletop_id}/members/{dm_id}",
        json={"role": "player"},
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_can_promote_player_to_dm(client, auth_headers):
    dm_token, _ = await _register(client, "dm5")
    player_token, player_id = await _register(client, "player5")

    create_resp = await client.post(
        "/tabletops",
        json={"name": "Mesa", "rulebook": "ordem_paranormal_classico"},
        headers=auth_headers(dm_token),
    )
    tabletop_id = create_resp.json()["id"]
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "player5", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.patch(
        f"/tabletops/{tabletop_id}/members/{player_id}",
        json={"role": "dm"},
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 200
    roles = {m["user_id"]: m["role"] for m in resp.json()["members"]}
    assert roles[player_id] == "dm"
