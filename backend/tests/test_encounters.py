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


async def _create_template(client, token: str, tabletop_id: str, name: str):
    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/token-templates",
        data={"name": name},
        files={"image": (f"{name}.png", b"\x89PNG\r\n\x1a\n" + b"x", "image/png")},
        headers={"Authorization": f"Bearer {token}"},
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_create_encounter_computes_grid_offsets(client, auth_headers):
    dm_token, _ = await _register(client, "enc1")
    tabletop_id = await _create_tabletop(client, dm_token)
    t1 = await _create_template(client, dm_token, tabletop_id, "Goblin")
    t2 = await _create_template(client, dm_token, tabletop_id, "Orc")
    t3 = await _create_template(client, dm_token, tabletop_id, "Wolf")

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/encounters",
        json={"name": "Emboscada", "template_ids": [t1, t2, t3]},
        headers=auth_headers(dm_token),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Emboscada"
    assert len(body["members"]) == 3
    offsets = {(m["offset_x"], m["offset_y"]) for m in body["members"]}
    assert len(offsets) == 3  # every member gets a distinct grid slot


@pytest.mark.asyncio
async def test_spawn_encounter_creates_tokens_around_center(client, auth_headers):
    dm_token, _ = await _register(client, "enc2")
    tabletop_id = await _create_tabletop(client, dm_token)
    t1 = await _create_template(client, dm_token, tabletop_id, "Goblin")
    t2 = await _create_template(client, dm_token, tabletop_id, "Orc")
    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/encounters",
        json={"name": "Emboscada", "template_ids": [t1, t2]},
        headers=auth_headers(dm_token),
    )
    encounter_id = created.json()["id"]

    spawned = await client.post(
        f"/tabletops/{tabletop_id}/vtt/encounters/{encounter_id}/spawn",
        json={"x": 500, "y": 500},
        headers=auth_headers(dm_token),
    )
    assert spawned.status_code == 200
    tokens = spawned.json()
    assert len(tokens) == 2
    assert {t["template_id"] for t in tokens} == {t1, t2}
    for t in tokens:
        assert abs(t["x"] - 500) <= 100
        assert abs(t["y"] - 500) <= 100

    live = await client.get(f"/tabletops/{tabletop_id}/vtt/tokens", headers=auth_headers(dm_token))
    assert len(live.json()) == 2


@pytest.mark.asyncio
async def test_spawn_skips_a_deleted_template(client, auth_headers):
    dm_token, _ = await _register(client, "enc3")
    tabletop_id = await _create_tabletop(client, dm_token)
    t1 = await _create_template(client, dm_token, tabletop_id, "Goblin")
    t2 = await _create_template(client, dm_token, tabletop_id, "Orc")
    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/encounters",
        json={"name": "Emboscada", "template_ids": [t1, t2]},
        headers=auth_headers(dm_token),
    )
    encounter_id = created.json()["id"]

    await client.delete(f"/tabletops/{tabletop_id}/vtt/token-templates/{t2}", headers=auth_headers(dm_token))

    spawned = await client.post(
        f"/tabletops/{tabletop_id}/vtt/encounters/{encounter_id}/spawn",
        json={"x": 0, "y": 0},
        headers=auth_headers(dm_token),
    )
    assert spawned.status_code == 200
    assert len(spawned.json()) == 1
    assert spawned.json()[0]["template_id"] == t1


@pytest.mark.asyncio
async def test_only_creator_or_dm_can_delete_encounter(client, auth_headers):
    dm_token, _ = await _register(client, "enc4")
    p1_token, _ = await _register(client, "encplayer4a")
    p2_token, _ = await _register(client, "encplayer4b")
    tabletop_id = await _create_tabletop(client, dm_token)
    for username in ("encplayer4a", "encplayer4b"):
        await client.post(
            f"/tabletops/{tabletop_id}/members",
            json={"username_or_email": username, "role": "player"},
            headers=auth_headers(dm_token),
        )
    t1 = await _create_template(client, p1_token, tabletop_id, "Goblin")
    created = await client.post(
        f"/tabletops/{tabletop_id}/vtt/encounters",
        json={"name": "Grupo do jogador", "template_ids": [t1]},
        headers=auth_headers(p1_token),
    )
    encounter_id = created.json()["id"]

    forbidden = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/encounters/{encounter_id}", headers=auth_headers(p2_token)
    )
    assert forbidden.status_code == 403

    allowed = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/encounters/{encounter_id}", headers=auth_headers(p1_token)
    )
    assert allowed.status_code == 204
