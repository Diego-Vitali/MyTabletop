"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { SheetKind, SheetPublic, TabletopPublic } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, Card, FieldError, Input, Select } from "@/components/ui";
import { AttributesEditor } from "@/components/AttributesEditor";

function SheetsListContent({ tabletopId }: { tabletopId: string }) {
  const { token, user } = useAuth();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [sheets, setSheets] = useState<SheetPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<SheetKind>("character");
  const [attributes, setAttributes] = useState<Record<string, number>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    Promise.all([
      api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token),
      api.get<SheetPublic[]>(`/tabletops/${tabletopId}/sheets`, token),
    ]).then(
      ([tt, sh]) => {
        if (!ignore) {
          setTabletop(tt);
          setSheets(sh);
          setLoading(false);
        }
      },
      (err) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : "Falha ao carregar fichas");
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

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setSubmitting(true);
    try {
      const created = await api.post<SheetPublic>(
        `/tabletops/${tabletopId}/sheets`,
        { kind, name, attributes },
        token,
      );
      setSheets((prev) => [...prev, created]);
      setName("");
      setAttributes({});
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Falha ao criar ficha");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-text-muted">Carregando...</p>;
  if (loadError) return <p className="text-danger">{loadError}</p>;
  if (!tabletop) return null;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
          {tabletop.name}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Fichas</h1>
      </div>

      {sheets.length === 0 ? (
        <p className="text-text-muted">Nenhuma ficha criada nesta mesa ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {sheets.map((s) => (
            <Link key={s.id} href={`/tabletops/${tabletopId}/sheets/${s.id}`} className="block">
              <Card className="flex flex-col gap-3 transition hover:border-border">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{s.name}</span>
                  <Badge variant={s.kind === "npc" ? "rare" : "accent"}>
                    {s.kind === "npc" ? "NPC" : "Personagem"}
                  </Badge>
                </div>
                <AttributesEditor rulebook={s.rulebook} value={s.attributes} readOnly />
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card as="form" onSubmit={onCreate} className="flex max-w-sm flex-col gap-4">
        <h2 className="font-bold">Nova ficha</h2>
        <Select value={kind} onChange={(e) => setKind(e.target.value as SheetKind)}>
          <option value="character">Personagem</option>
          {iAmDm && <option value="npc">NPC</option>}
        </Select>
        <Input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} required />
        <AttributesEditor rulebook={tabletop.rulebook} value={attributes} onChange={setAttributes} />
        <FieldError>{createError}</FieldError>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Criando..." : "Criar ficha"}
        </Button>
      </Card>
    </div>
  );
}

export function SheetsList({ tabletopId }: { tabletopId: string }) {
  return (
    <RequireAuth>
      <SheetsListContent tabletopId={tabletopId} />
    </RequireAuth>
  );
}
