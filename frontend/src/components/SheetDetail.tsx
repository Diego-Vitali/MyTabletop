"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { SheetPublic, TabletopPublic } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { LocalNav } from "@/components/LocalNav";
import { tabletopNavLinks } from "@/components/TabletopDetail";
import { AttributesEditor } from "@/components/AttributesEditor";
import { Button, FieldError, Spinner } from "@/components/ui";

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

function sameAttributes(a: Record<string, number>, b: Record<string, number>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
  return true;
}

/** Linha da página de especificações: rótulo à esquerda, conteúdo à direita. */
function SpecRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 border-t border-border py-10 md:grid-cols-[220px_1fr] md:gap-10 md:py-14">
      <h2 className="type-eyebrow">{label}</h2>
      <div>{children}</div>
    </div>
  );
}

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
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  if (loading) return <Spinner />;
  if (loadError)
    return (
      <div className="page-container py-24 text-center">
        <p className="type-card">Não foi possível abrir esta ficha.</p>
        <p className="mt-2 text-text-muted">{loadError}</p>
      </div>
    );
  if (!tabletop || !sheet || !user) return null;

  const iAmDm = tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");
  const canEdit = iAmDm || (sheet.kind === "character" && sheet.owner_id === user.id);
  const dirty = name !== sheet.name || !sameAttributes(attributes, sheet.attributes);
  const owner = tabletop.members.find((m) => m.user_id === sheet.owner_id)?.username ?? "—";
  const rulebookLabel = RULEBOOKS.find((r) => r.value === sheet.rulebook)?.label ?? sheet.rulebook;

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
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await api.del(`/tabletops/${tabletopId}/sheets/${sheetId}`, token);
      router.push(`/tabletops/${tabletopId}/sheets`);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Falha ao remover ficha");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <LocalNav
        title={tabletop.name}
        titleHref={`/tabletops/${tabletopId}`}
        links={tabletopNavLinks(tabletopId, "sheets")}
        cta={{ href: `/tabletops/${tabletopId}/vtt`, label: "Abrir VTT" }}
      />

      <section className="bg-bg pt-8 pb-14 md:pb-20">
        <div className="page-container">
          <Link
            href={`/tabletops/${tabletopId}/sheets`}
            className="inline-flex items-center gap-0.5 text-sm text-accent-strong hover:underline"
          >
            <ChevronLeft size={16} />
            Todas as fichas
          </Link>
          <div className="mt-10 flex flex-col items-center text-center md:mt-14">
            <span className={`type-eyebrow ${sheet.kind === "npc" ? "text-rare" : "text-text-muted"}`}>
              {sheet.kind === "npc" ? "NPC" : "Personagem"}
            </span>
            {canEdit ? (
              <input
                aria-label="Nome da ficha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="type-display mt-2 w-full rounded-sm bg-transparent text-center outline-none transition hover:bg-surface-2 focus:bg-surface-2"
              />
            ) : (
              <h1 className="type-display mt-2 text-balance">{sheet.name}</h1>
            )}
            <p className="type-subhead mt-3 text-text-muted">
              {sheet.kind === "npc" ? "Controlado pelo mestre" : `Ficha de ${owner}`}
            </p>
          </div>
        </div>
      </section>

      <section className={`bg-bg ${canEdit ? "pb-32" : "pb-20"}`}>
        <div className="page-container">
          <SpecRow label="Atributos">
            <AttributesEditor
              rulebook={sheet.rulebook}
              value={attributes}
              onChange={canEdit ? setAttributes : undefined}
              readOnly={!canEdit}
              size="lg"
            />
          </SpecRow>
          <SpecRow label="Detalhes">
            <dl className="grid gap-x-10 gap-y-6 text-[17px] sm:grid-cols-2">
              {[
                ["Tipo", sheet.kind === "npc" ? "NPC" : "Personagem"],
                ["Dono", owner],
                ["Sistema", rulebookLabel],
                ["Mesa", tabletop.name],
                ["Criada em", dateFmt.format(new Date(sheet.created_at))],
                ["Atualizada em", dateFmt.format(new Date(sheet.updated_at))],
              ].map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5">
                  <dt className="text-sm text-text-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </SpecRow>
        </div>
      </section>

      {canEdit && (
        <div className="glass sticky bottom-0 z-30 border-t border-hairline">
          <div className="page-container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold">
                {saving ? "Salvando..." : dirty ? "Alterações não salvas." : "Tudo salvo."}
              </span>
              {saveError ? (
                <FieldError>{saveError}</FieldError>
              ) : (
                <span className="text-xs text-text-muted">
                  {confirmDelete ? "Esta ação não pode ser desfeita." : "Edite o nome e os atributos acima."}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {confirmDelete && (
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancelar
                </Button>
              )}
              <Button variant="danger" onClick={onDelete} disabled={deleting}>
                {deleting ? "Removendo..." : confirmDelete ? "Confirmar remoção" : "Remover"}
              </Button>
              {!confirmDelete && (
                <Button onClick={onSave} disabled={saving || !dirty}>
                  Salvar
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SheetDetail({ tabletopId, sheetId }: { tabletopId: string; sheetId: string }) {
  return (
    <RequireAuth>
      <SheetDetailContent tabletopId={tabletopId} sheetId={sheetId} />
    </RequireAuth>
  );
}
