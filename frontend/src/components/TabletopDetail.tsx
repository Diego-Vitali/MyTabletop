"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { TabletopPublic, Role } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";

function TabletopDetailContent({ tabletopId }: { tabletopId: string }) {
  const { token, user } = useAuth();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newMember, setNewMember] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<Role>("player");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token).then(
      (data) => {
        if (!ignore) {
          setTabletop(data);
          setLoadError(null);
          setLoading(false);
        }
      },
      (err) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : "Falha ao carregar mesa");
          setLoading(false);
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [token, tabletopId]);

  const iAmDm =
    !!user && !!tabletop && tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");

  const onAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSubmitting(true);
    try {
      const updated = await api.post<TabletopPublic>(
        `/tabletops/${tabletopId}/members`,
        { username_or_email: newMember, role: newMemberRole },
        token,
      );
      setTabletop(updated);
      setNewMember("");
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Falha ao adicionar membro");
    } finally {
      setSubmitting(false);
    }
  };

  const changeRole = async (userId: string, role: Role) => {
    setActionError(null);
    try {
      const updated = await api.patch<TabletopPublic>(
        `/tabletops/${tabletopId}/members/${userId}`,
        { role },
        token,
      );
      setTabletop(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Falha ao trocar papel");
    }
  };

  const removeMember = async (userId: string) => {
    setActionError(null);
    try {
      const updated = await api.del<TabletopPublic>(
        `/tabletops/${tabletopId}/members/${userId}`,
        token,
      );
      setTabletop(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Falha ao remover membro");
    }
  };

  if (loading) return <p className="text-neutral-400">Carregando...</p>;
  if (loadError) return <p className="text-red-400">{loadError}</p>;
  if (!tabletop) return null;

  const rulebookLabel =
    RULEBOOKS.find((r) => r.value === tabletop.rulebook)?.label ?? tabletop.rulebook;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{tabletop.name}</h1>
        <p className="text-neutral-400">{rulebookLabel}</p>
      </div>

      <div>
        <h2 className="mb-3 font-medium">Membros</h2>
        <ul className="flex flex-col gap-2">
          {tabletop.members.map((m) => (
            <li
              key={m.user_id}
              className="flex items-center justify-between rounded border border-neutral-800 px-3 py-2"
            >
              <span>
                {m.username}{" "}
                <span className="text-xs uppercase text-neutral-400">({m.role})</span>
              </span>
              {iAmDm && (
                <div className="flex gap-2 text-sm">
                  <button
                    className="underline"
                    onClick={() => changeRole(m.user_id, m.role === "dm" ? "player" : "dm")}
                  >
                    {m.role === "dm" ? "Rebaixar a player" : "Promover a DM"}
                  </button>
                  <button className="text-red-400 underline" onClick={() => removeMember(m.user_id)}>
                    Remover
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {actionError && <p className="mt-2 text-sm text-red-400">{actionError}</p>}
      </div>

      {iAmDm && (
        <form onSubmit={onAddMember} className="flex max-w-sm flex-col gap-3">
          <h2 className="font-medium">Adicionar membro</h2>
          <input
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            placeholder="Usuário ou email"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            required
          />
          <select
            className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
            value={newMemberRole}
            onChange={(e) => setNewMemberRole(e.target.value as Role)}
          >
            <option value="player">Player</option>
            <option value="dm">DM</option>
          </select>
          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
          >
            {submitting ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      )}
    </div>
  );
}

export function TabletopDetail({ tabletopId }: { tabletopId: string }) {
  return (
    <RequireAuth>
      <TabletopDetailContent tabletopId={tabletopId} />
    </RequireAuth>
  );
}
