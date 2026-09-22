"""Registry of supported rulebooks.

Each tabletop is tied to one rulebook key here. This is the extension point
for future phases (character/NPC sheets), which will register their own
sheet schemas per rulebook. For now it only validates the `rulebook` field
on tabletop creation.
"""

RULEBOOK_REGISTRY: dict[str, dict[str, str]] = {
    "ordem_paranormal_classico": {"label": "Ordem Paranormal RPG (Clássico)"},
}


def is_valid_rulebook(key: str) -> bool:
    return key in RULEBOOK_REGISTRY
