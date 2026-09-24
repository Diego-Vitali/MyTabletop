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
  background_image_url: string | null;
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

export interface TokenPublic {
  id: string;
  tabletop_id: string;
  image_url: string;
  x: number;
  y: number;
  size: number | null;
  flipped_x: boolean;
  template_id: string | null;
  created_by: string;
  created_at: string;
}

export interface TokenSnapshot {
  image_url: string;
  x: number;
  y: number;
  size: number | null;
  flipped_x: boolean;
}

export interface MapHistoryEntryPublic {
  id: string;
  tabletop_id: string;
  image_url: string;
  tokens: TokenSnapshot[];
  replaced_by: string;
  created_at: string;
}

export type FolderKind = "scene" | "token";

export interface FolderPublic {
  id: string;
  tabletop_id: string;
  kind: FolderKind;
  name: string;
  created_by: string;
  created_at: string;
}

export interface ScenePublic {
  id: string;
  tabletop_id: string;
  folder_id: string | null;
  name: string;
  image_url: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface TokenTemplatePublic {
  id: string;
  tabletop_id: string;
  folder_id: string | null;
  name: string;
  image_url: string;
  created_by: string;
  created_at: string;
}

export interface MapNotePublic {
  id: string;
  tabletop_id: string;
  scene_id: string;
  x: number;
  y: number;
  text: string;
  created_by: string;
  created_at: string;
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
