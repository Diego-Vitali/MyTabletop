export type Role = "dm" | "player";

export interface UserTabletopEntry {
  tabletop_id: string;
  role: Role;
  joined_at: string;
}

export interface UserPublic {
  id: string;
  username: string;
  email: string;
  created_at: string;
  tabletops: UserTabletopEntry[];
}

export interface TabletopMember {
  user_id: string;
  username: string;
  role: Role;
  joined_at: string;
}

export interface TabletopPublic {
  id: string;
  name: string;
  created_by: string;
  rulebook: string;
  members: TabletopMember[];
  created_at: string;
}

export const RULEBOOKS: { value: string; label: string }[] = [
  { value: "ordem_paranormal_classico", label: "Ordem Paranormal RPG (Clássico)" },
];

export type SheetKind = "character" | "npc";

export interface SheetPublic {
  id: string;
  tabletop_id: string;
  owner_id: string;
  kind: SheetKind;
  rulebook: string;
  name: string;
  attributes: Record<string, number>;
  created_at: string;
  updated_at: string;
}

/** Mirrors backend RULEBOOK_REGISTRY attribute definitions (app/models/rulebooks.py). */
export const ATTRIBUTE_DEFS: Record<string, { key: string; label: string }[]> = {
  ordem_paranormal_classico: [
    { key: "FOR", label: "Força" },
    { key: "AGI", label: "Agilidade" },
    { key: "INT", label: "Intelecto" },
    { key: "VIG", label: "Vigor" },
    { key: "PRE", label: "Presença" },
  ],
};
