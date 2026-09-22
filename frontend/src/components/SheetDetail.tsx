"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { SheetPublic, TabletopPublic } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, FieldError, Input } from "@/components/ui";
import { AttributesEditor } from "@/components/AttributesEditor";

function SheetDetailContent({ tabletopId, sheetId }: { tabletopId: string; sheetId: string }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [sheet, setSheet] = useState<SheetPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [attributes, setAttributes] = useState<Record<string, number>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    Promise.all([
      api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token),
      api.get<SheetPublic>(`/tabletops/${tabletopId}/sheets/${sheetId}`, token),
    ]).then(
      ([tt, sh]) => {
        if (!ignore) {
          setTabletop(tt);
          setSheet(sh);
          setName(sh.name);
          setAttributes(sh.attributes);
          setLoading(false);
        }
      },
      (err) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : "Falha ao carregar ficha");
          setLoading(false);
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [token, tabletopId, sheetId]);

  if (loading) return <p className="text-text-muted">Carregando...</p>;
  if (loadError) return <p className="text-danger">{loadError}</p>;
  if (!tabletop || !sheet || !user) return null;

  const iAmDm = tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");
  const canEdit = iAmDm || (sheet.kind === "character" && sheet.owner_id === user.id);

  const onSave = async () => {
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await api.patch<SheetPublic>(
        `/tabletops/${tabletopId}/sheets/${sheetId}`,
        { name, attributes },
        token,
      );
      setSheet(updated);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Falha ao salvar ficha");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    setDeleting(true);
    try {
      await api.del(`/tabletops/${tabletopId}/sheets/${sheetId}`, token);
      router.push(`/tabletops/${tabletopId}/sheets`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Falha ao remover ficha");
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          {canEdit ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-lg font-bold"
            />
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{sheet.name}</h1>
          )}
          <Badge variant={sheet.kind === "npc" ? "rare" : "accent"} className="w-fit">
            {sheet.kind === "npc" ? "NPC" : "Personagem"}
          </Badge>
        </div>
      </div>

      <AttributesEditor
        rulebook={sheet.rulebook}
        value={attributes}
        onChange={canEdit ? setAttributes : undefined}
        readOnly={!canEdit}
      />

      {canEdit && (
        <div className="flex flex-col gap-3">
          <FieldError>{saveError}</FieldError>
          <div className="flex gap-3">
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
            <Button variant="danger" onClick={onDelete} disabled={deleting}>
              {deleting ? "Removendo..." : "Remover ficha"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function SheetDetail({ tabletopId, sheetId }: { tabletopId: string; sheetId: string }) {
  return (
    <RequireAuth>
      <SheetDetailContent tabletopId={tabletopId} sheetId={sheetId} />
    </RequireAuth>
  );
}
