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
async def test_get_creates_empty_initiative_lazily(client, auth_headers):
    dm_token, _ = await _register(client, "init1")
    tabletop_id = await _create_tabletop(client, dm_token)

    resp = await client.get(f"/tabletops/{tabletop_id}/vtt/initiative", headers=auth_headers(dm_token))
    assert resp.status_code == 200
    body = resp.json()
    assert body["entries"] == []
    assert body["is_active"] is False
    assert body["round"] == 0


@pytest.mark.asyncio
async def test_add_entries_auto_sorts_by_value_descending(client, auth_headers):
    dm_token, _ = await _register(client, "init2")
    tabletop_id = await _create_tabletop(client, dm_token)

    await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/entries",
        json={"label": "Goblin", "value": 10},
        headers=auth_headers(dm_token),
    )
    await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/entries",
        json={"label": "Herói", "value": 18, "hp_current": 20, "hp_max": 20},
        headers=auth_headers(dm_token),
    )
    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/entries",
        json={"label": "Cultista", "value": 14},
        headers=auth_headers(dm_token),
    )
    labels = [e["label"] for e in resp.json()["entries"]]
    assert labels == ["Herói", "Cultista", "Goblin"]


@pytest.mark.asyncio
async def test_start_advance_and_wrap_rounds(client, auth_headers):
    dm_token, _ = await _register(client, "init3")
    tabletop_id = await _create_tabletop(client, dm_token)
    for label, value in [("A", 10), ("B", 20)]:
        await client.post(
            f"/tabletops/{tabletop_id}/vtt/initiative/entries",
            json={"label": label, "value": value},
            headers=auth_headers(dm_token),
        )

    started = await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/start", headers=auth_headers(dm_token)
    )
    body = started.json()
    assert body["is_active"] is True
    assert body["round"] == 1
    assert body["entries"][body["current_index"]]["label"] == "B"

    nxt = await client.post(f"/tabletops/{tabletop_id}/vtt/initiative/next", headers=auth_headers(dm_token))
    assert nxt.json()["entries"][nxt.json()["current_index"]]["label"] == "A"
    assert nxt.json()["round"] == 1

    wrapped = await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/next", headers=auth_headers(dm_token)
    )
    assert wrapped.json()["round"] == 2
    assert wrapped.json()["entries"][wrapped.json()["current_index"]]["label"] == "B"

    back = await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/previous", headers=auth_headers(dm_token)
    )
    assert back.json()["round"] == 1
    assert back.json()["entries"][back.json()["current_index"]]["label"] == "A"

    ended = await client.post(f"/tabletops/{tabletop_id}/vtt/initiative/end", headers=auth_headers(dm_token))
    assert ended.json()["is_active"] is False
    assert ended.json()["current_index"] == -1
    assert ended.json()["round"] == 0
    # entries are preserved across end-of-combat
    assert len(ended.json()["entries"]) == 2


@pytest.mark.asyncio
async def test_removing_current_entry_keeps_index_in_range(client, auth_headers):
    dm_token, _ = await _register(client, "init4")
    tabletop_id = await _create_tabletop(client, dm_token)
    for label, value in [("A", 30), ("B", 20), ("C", 10)]:
        await client.post(
            f"/tabletops/{tabletop_id}/vtt/initiative/entries",
            json={"label": label, "value": value},
            headers=auth_headers(dm_token),
        )
    await client.post(f"/tabletops/{tabletop_id}/vtt/initiative/start", headers=auth_headers(dm_token))
    await client.post(f"/tabletops/{tabletop_id}/vtt/initiative/next", headers=auth_headers(dm_token))
    await client.post(f"/tabletops/{tabletop_id}/vtt/initiative/next", headers=auth_headers(dm_token))
    # current is now "C" (index 2, the last entry)

    listed = await client.get(f"/tabletops/{tabletop_id}/vtt/initiative", headers=auth_headers(dm_token))
    current_label = listed.json()["entries"][listed.json()["current_index"]]["label"]
    assert current_label == "C"
    c_entry_id = next(e["id"] for e in listed.json()["entries"] if e["label"] == "C")

    removed = await client.delete(
        f"/tabletops/{tabletop_id}/vtt/initiative/entries/{c_entry_id}", headers=auth_headers(dm_token)
    )
    assert removed.status_code == 200
    assert len(removed.json()["entries"]) == 2
    assert removed.json()["current_index"] == 1


@pytest.mark.asyncio
async def test_player_cannot_mutate_initiative(client, auth_headers):
    dm_token, _ = await _register(client, "init5")
    player_token, _ = await _register(client, "initplayer5")
    tabletop_id = await _create_tabletop(client, dm_token)
    await client.post(
        f"/tabletops/{tabletop_id}/members",
        json={"username_or_email": "initplayer5", "role": "player"},
        headers=auth_headers(dm_token),
    )

    resp = await client.post(
        f"/tabletops/{tabletop_id}/vtt/initiative/entries",
        json={"label": "Sneaky", "value": 5},
        headers=auth_headers(player_token),
    )
    assert resp.status_code == 403

    read = await client.get(f"/tabletops/{tabletop_id}/vtt/initiative", headers=auth_headers(player_token))
    assert read.status_code == 200
