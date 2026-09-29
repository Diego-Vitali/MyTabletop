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

export type SizeCategory = "pequeno" | "medio" | "grande" | "enorme" | "descomunal";

export const SIZE_CATEGORY_LABELS: Record<SizeCategory, string> = {
  pequeno: "Pequeno",
  medio: "Médio",
  grande: "Grande",
  enorme: "Enorme",
  descomunal: "Descomunal",
};

export interface TokenPublic {
  id: string;
  tabletop_id: string;
  image_url: string;
  x: number;
  y: number;
  size: number | null;
  rotation: number;
  flipped_x: boolean;
  name: string | null;
  hp_current: number | null;
  hp_max: number | null;
  size_category: SizeCategory | null;
  emits_light: boolean;
  light_radius: number | null;
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

export interface GridConfig {
  enabled: boolean;
  type: "square" | "hex";
  size: number;
  offset_x: number;
  offset_y: number;
  opacity: number;
  snap_enabled: boolean;
  unit_label: string;
}

export const DEFAULT_GRID: GridConfig = {
  enabled: false,
  type: "square",
  size: 70,
  offset_x: 0,
  offset_y: 0,
  opacity: 0.5,
  snap_enabled: true,
  unit_label: "1,5m",
};

export interface TokenDisplaySettings {
  show_nameplates: boolean;
  show_hp_bars: boolean;
  show_instance_badges: boolean;
}

export const DEFAULT_TOKEN_SETTINGS: TokenDisplaySettings = {
  show_nameplates: true,
  show_hp_bars: true,
  show_instance_badges: true,
};

export interface FogStroke {
  id: string;
  points: Point[];
  radius: number;
  is_erasing: boolean;
}

export interface ScenePublic {
  id: string;
  tabletop_id: string;
  folder_id: string | null;
  name: string;
  image_url: string;
  is_active: boolean;
  grid: GridConfig;
  token_settings: TokenDisplaySettings;
  fog: FogStroke[];
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
  icon: string;
  created_by: string;
  created_at: string;
}

export type DrawingKind = "freehand" | "line" | "rect" | "circle" | "text";

export interface Point {
  x: number;
  y: number;
}

export interface DrawingPublic {
  id: string;
  tabletop_id: string;
  scene_id: string;
  kind: DrawingKind;
  points: Point[];
  color: string;
  stroke_width: number;
  text: string | null;
  created_by: string;
  created_at: string;
}

export const NOTE_ICON_CHOICES = ["StickyNote", "Skull", "Key", "DoorClosed", "Flame", "Swords"] as const;

export interface InitiativeEntry {
  id: string;
  token_id: string | null;
  label: string;
  value: number;
  hp_current: number | null;
  hp_max: number | null;
}

export interface EncounterMember {
  template_id: string;
  offset_x: number;
  offset_y: number;
}

export interface EncounterPublic {
  id: string;
  tabletop_id: string;
  name: string;
  members: EncounterMember[];
  created_by: string;
  created_at: string;
}

export interface InitiativePublic {
  id: string;
  tabletop_id: string;
  entries: InitiativeEntry[];
  current_index: number;
  round: number;
  is_active: boolean;
  auto_sort: boolean;
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
