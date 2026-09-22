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
