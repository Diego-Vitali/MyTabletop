"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { TabletopPublic } from "@/lib/types";
import { ATTRIBUTE_DEFS, RULEBOOKS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { NewTabletopCard, TabletopCard } from "@/components/TabletopCard";
import { Shelf, ShelfItem } from "@/components/Shelf";
import { Button, FieldError, SectionHeading, Spinner, TextField } from "@/components/ui";

function TabletopsPageContent() {
  const { token, user, refreshUser } = useAuth();
  const [tabletops, setTabletops] = useState<TabletopPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [rulebook, setRulebook] = useState(RULEBOOKS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!token) return;
    const data = await api.get<TabletopPublic[]>("/tabletops", token);
    setTabletops(data);
  };

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    api
      .get<TabletopPublic[]>("/tabletops", token)
      .then((data) => {
        if (!ignore) setTabletops(data);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/tabletops", { name, rulebook }, token);
      setName("");
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar mesa");
    } finally {
      setSubmitting(false);
    }
  };

  const goToCreate = () => {
    document.getElementById("nova-mesa")?.scrollIntoView({ behavior: "smooth", block: "center" });
    nameRef.current?.focus({ preventScroll: true });
  };

  const roleOf = (t: TabletopPublic) =>
    user?.tabletops.find((ut) => ut.tabletop_id === t.id)?.role;
  const mastering = tabletops.filter((t) => roleOf(t) === "dm");
  const playing = tabletops.filter((t) => roleOf(t) !== "dm");

  return (
    <div className="flex flex-1 flex-col bg-bg-alt">
      {/* Cabeçalho no padrão "Store. A melhor maneira de..." */}
      <header className="page-container flex flex-col gap-6 pt-14 pb-10 md:flex-row md:items-end md:justify-between md:pt-20 md:pb-14">
        <SectionHeading
          as="h1"
          size="hero"
          title="Mesas."
          tagline="Todas as suas campanhas, num só lugar."
          className="max-w-[22ch] md:max-w-[26ch]"
        />
        <div className="flex shrink-0 flex-col gap-1 text-sm md:items-end md:pb-2 md:text-right">
          <span className="font-semibold">Vai começar uma campanha?</span>
          <button
            type="button"
            onClick={goToCreate}
            className="w-fit cursor-pointer text-accent-strong hover:underline"
          >
            Criar nova mesa ›
          </button>
        </div>
      </header>

      {loading ? (
        <Spinner />
      ) : tabletops.length === 0 ? (
        <div className="page-container pb-12">
          <div className="flex flex-col items-center gap-3 rounded-md bg-surface px-6 py-16 text-center shadow-card">
            <h2 className="type-card">Nenhuma mesa por aqui.</h2>
            <p className="max-w-[40ch] text-text-muted">
              Crie sua primeira mesa abaixo — ou peça para o mestre do seu grupo te adicionar.
            </p>
          </div>
        </div>
      ) : (
        <>
          {mastering.length > 0 && (
            <section className="pb-6">
              <div className="page-container mb-6">
                <SectionHeading size="title" title="Mestrando." tagline="As mesas que você conduz." />
              </div>
              <Shelf label="Mesas que você mestra">
                {mastering.map((t) => (
                  <ShelfItem key={t.id} className="w-[min(80vw,372px)]">
                    <TabletopCard tabletop={t} myRole="dm" />
                  </ShelfItem>
                ))}
                <ShelfItem className="w-[min(80vw,372px)]">
                  <NewTabletopCard onClick={goToCreate} />
                </ShelfItem>
              </Shelf>
            </section>
          )}
          {playing.length > 0 && (
            <section className="pb-6">
              <div className="page-container mb-6">
                <SectionHeading size="title" title="Jogando." tagline="As mesas em que você é jogador." />
              </div>
              <Shelf label="Mesas em que você joga">
                {playing.map((t) => (
                  <ShelfItem key={t.id} className="w-[min(80vw,372px)]">
                    <TabletopCard tabletop={t} myRole={roleOf(t)} />
                  </ShelfItem>
                ))}
              </Shelf>
            </section>
          )}
        </>
      )}

      {/* Nova mesa */}
      <section id="nova-mesa" className="scroll-mt-8 bg-bg py-16 md:py-24">
        <div className="page-container grid gap-10 md:grid-cols-[1fr_1.1fr] md:items-start md:gap-16">
          <SectionHeading
            size="title"
            title="Nova mesa."
            tagline="Dê um nome, escolha o sistema e convide o grupo depois."
          />
          <form onSubmit={onCreate} className="flex flex-col gap-4">
            <TextField
              ref={nameRef}
              label="Nome da mesa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-3 text-[17px] font-semibold">Sistema</legend>
              {RULEBOOKS.map((r) => (
                <label
                  key={r.value}
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-sm border px-5 py-4 transition ${
                    rulebook === r.value
                      ? "border-accent ring-1 ring-accent"
                      : "border-border hover:border-text-faint"
                  }`}
                >
                  <span className="flex flex-col">
                    <span className="font-semibold">{r.label}</span>
                    {ATTRIBUTE_DEFS[r.value] && (
                      <span className="text-sm text-text-muted">
                        Atributos {ATTRIBUTE_DEFS[r.value].map((d) => d.key).join(", ")}.
                      </span>
                    )}
                  </span>
                  <input
                    type="radio"
                    name="rulebook"
                    value={r.value}
                    checked={rulebook === r.value}
                    onChange={() => setRulebook(r.value)}
                    className="h-5 w-5 shrink-0"
                  />
                </label>
              ))}
            </fieldset>
            <FieldError>{error}</FieldError>
            <Button type="submit" size="lg" disabled={submitting} className="mt-2 w-full md:w-fit">
              {submitting ? "Criando..." : "Criar mesa"}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function TabletopsPage() {
  return (
    <RequireAuth>
      <TabletopsPageContent />
    </RequireAuth>
  );
}
