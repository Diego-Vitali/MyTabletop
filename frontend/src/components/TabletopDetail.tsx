"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { TabletopPublic, Role } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, Card, FieldError, Input, Select } from "@/components/ui";

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

  if (loading) return <p className="text-text-muted">Carregando...</p>;
  if (loadError) return <p className="text-danger">{loadError}</p>;
  if (!tabletop) return null;

  const rulebookLabel =
    RULEBOOKS.find((r) => r.value === tabletop.rulebook)?.label ?? tabletop.rulebook;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{tabletop.name}</h1>
          <p className="text-text-muted">{rulebookLabel}</p>
        </div>
        <div className="flex gap-3">
          <Link href={`/tabletops/${tabletopId}/vtt`}>
            <Button variant="primary">Acessar VTT</Button>
          </Link>
          <Link href={`/tabletops/${tabletopId}/sheets`}>
            <Button variant="secondary">Fichas</Button>
          </Link>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-bold">Membros</h2>
        <ul className="flex flex-col gap-2">
          {tabletop.members.map((m) => (
            <li key={m.user_id}>
              <Card className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-2.5">
                  {m.username}
                  <Badge variant={m.role === "dm" ? "accent" : "neutral"}>{m.role}</Badge>
                </span>
                {iAmDm && (
                  <div className="flex gap-4 text-sm">
                    <button
                      className="text-text-muted transition hover:text-text"
                      onClick={() => changeRole(m.user_id, m.role === "dm" ? "player" : "dm")}
                    >
                      {m.role === "dm" ? "Rebaixar a player" : "Promover a DM"}
                    </button>
                    <button
                      className="text-danger transition hover:text-danger/80"
                      onClick={() => removeMember(m.user_id)}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <FieldError>{actionError}</FieldError>
        </div>
      </div>

      {iAmDm && (
        <Card as="form" onSubmit={onAddMember} className="flex max-w-sm flex-col gap-4">
          <h2 className="font-bold">Adicionar membro</h2>
          <Input
            placeholder="Usuário ou email"
            value={newMember}
            onChange={(e) => setNewMember(e.target.value)}
            required
          />
          <Select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value as Role)}>
            <option value="player">Player</option>
            <option value="dm">DM</option>
          </Select>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Adicionando..." : "Adicionar"}
          </Button>
        </Card>
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
