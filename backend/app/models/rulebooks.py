"""Registry of supported rulebooks.

Each tabletop is tied to one rulebook key here. Attributes are the only
rulebook-specific piece of a Sheet modeled so far (see app/models/sheet.py) —
everything else about a rulebook (skills, derived-stat formulas, rituals...)
is added incrementally in later phases, not hardcoded onto the generic Sheet
model, so a future rulebook can plug in a different attribute set.
"""


RULEBOOK_REGISTRY: dict[str, dict] = {
    "ordem_paranormal_classico": {
        "label": "Ordem Paranormal RPG (Clássico)",
        "attributes": [
            {"key": "FOR", "label": "Força"},
            {"key": "AGI", "label": "Agilidade"},
            {"key": "INT", "label": "Intelecto"},
            {"key": "VIG", "label": "Vigor"},
            {"key": "PRE", "label": "Presença"},
        ],
    },
}


def is_valid_rulebook(key: str) -> bool:
    return key in RULEBOOK_REGISTRY


def attribute_keys(rulebook: str) -> set[str]:
    return {a["key"] for a in RULEBOOK_REGISTRY[rulebook]["attributes"]}
