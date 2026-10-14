"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { SheetKind, SheetPublic, TabletopPublic } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { LocalNav } from "@/components/LocalNav";
import { tabletopNavLinks } from "@/components/TabletopDetail";
import { AttributesEditor } from "@/components/AttributesEditor";
import { Button, FieldError, SectionHeading, SegmentedControl, Spinner, TextField } from "@/components/ui";

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
  const nameRef = useRef<HTMLInputElement>(null);

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

  const goToCreate = () => {
    document.getElementById("nova-ficha")?.scrollIntoView({ behavior: "smooth", block: "center" });
    nameRef.current?.focus({ preventScroll: true });
  };

  if (loading) return <Spinner />;
  if (loadError)
    return (
      <div className="page-container py-24 text-center">
        <p className="type-card">Não foi possível abrir as fichas.</p>
        <p className="mt-2 text-text-muted">{loadError}</p>
      </div>
    );
  if (!tabletop) return null;

  const ownerName = (id: string) => tabletop.members.find((m) => m.user_id === id)?.username;

  return (
    <>
      <LocalNav
        title={tabletop.name}
        titleHref={`/tabletops/${tabletopId}`}
        links={tabletopNavLinks(tabletopId, "sheets")}
        cta={{ href: `/tabletops/${tabletopId}/vtt`, label: "Abrir VTT" }}
      />

      <div className="flex flex-1 flex-col bg-bg-alt">
        <header className="page-container flex flex-col gap-6 pt-14 pb-10 md:flex-row md:items-end md:justify-between md:pt-20 md:pb-14">
          <SectionHeading
            as="h1"
            size="hero"
            title="Fichas."
            tagline={`Personagens e NPCs de ${tabletop.name}.`}
            className="max-w-[22ch] md:max-w-[26ch]"
          />
          <div className="flex shrink-0 flex-col gap-1 text-sm md:items-end md:pb-2 md:text-right">
            <span className="font-semibold">Personagem novo na campanha?</span>
            <button
              type="button"
              onClick={goToCreate}
              className="w-fit cursor-pointer text-accent-strong hover:underline"
            >
              Criar ficha ›
            </button>
          </div>
        </header>

        <div className="page-container pb-16 md:pb-24">
          {sheets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-md bg-surface px-6 py-16 text-center shadow-card">
              <h2 className="type-card">Nenhuma ficha ainda.</h2>
              <p className="max-w-[40ch] text-text-muted">
                Crie a primeira ficha desta mesa logo abaixo.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {sheets.map((s) => (
                <Link
                  key={s.id}
                  href={`/tabletops/${tabletopId}/sheets/${s.id}`}
                  className="flex flex-col gap-5 rounded-md bg-surface p-7 shadow-card transition duration-300 ease-out hover:scale-[1.01] hover:shadow-card-hover"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className={`type-caption ${s.kind === "npc" ? "text-rare" : "text-text-muted"}`}>
                      {s.kind === "npc" ? "NPC" : "Personagem"}
                    </span>
                    <h2 className="type-card truncate">{s.name}</h2>
                    <span className="text-sm text-text-muted">
                      {ownerName(s.owner_id) ? `de ${ownerName(s.owner_id)}` : " "}
                    </span>
                  </div>
                  <AttributesEditor rulebook={s.rulebook} value={s.attributes} readOnly size="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <section id="nova-ficha" className="scroll-mt-16 bg-bg py-16 md:py-24">
          <div className="page-container grid gap-10 md:grid-cols-[1fr_1.3fr] md:items-start md:gap-16">
            <SectionHeading
              size="title"
              title="Nova ficha."
              tagline="Nome e atributos agora — o resto da ficha vem com a campanha."
            />
            <form onSubmit={onCreate} className="flex flex-col gap-5">
              {iAmDm && (
                <SegmentedControl
                  value={kind}
                  onChange={setKind}
                  className="w-full"
                  options={[
                    { value: "character", label: "Personagem" },
                    { value: "npc", label: "NPC" },
                  ]}
                />
              )}
              <TextField
                ref={nameRef}
                label={kind === "npc" ? "Nome do NPC" : "Nome do personagem"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="flex flex-col gap-3">
                <span className="text-[17px] font-semibold">Atributos</span>
                <AttributesEditor rulebook={tabletop.rulebook} value={attributes} onChange={setAttributes} />
              </div>
              <FieldError>{createError}</FieldError>
              <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full md:w-fit">
                {submitting ? "Criando..." : "Criar ficha"}
              </Button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}

export function SheetsList({ tabletopId }: { tabletopId: string }) {
  return (
    <RequireAuth>
      <SheetsListContent tabletopId={tabletopId} />
    </RequireAuth>
  );
}
