"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { UserMinus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, API_URL, ApiError } from "@/lib/api";
import type { TabletopPublic, Role } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { LocalNav } from "@/components/LocalNav";
import { LaptopMockup } from "@/components/Mockups";
import {
  Avatar,
  Badge,
  Button,
  buttonClass,
  FieldError,
  SectionHeading,
  SegmentedControl,
  Spinner,
  TextField,
} from "@/components/ui";

export function tabletopNavLinks(tabletopId: string, current: "overview" | "sheets" | "members") {
  return [
    { href: `/tabletops/${tabletopId}`, label: "Visão geral", current: current === "overview" },
    { href: `/tabletops/${tabletopId}#membros`, label: "Membros", current: current === "members" },
    { href: `/tabletops/${tabletopId}/sheets`, label: "Fichas", current: current === "sheets" },
  ];
}

const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

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

  if (loading) return <Spinner />;
  if (loadError)
    return (
      <div className="page-container py-24 text-center">
        <p className="type-card">Não foi possível abrir esta mesa.</p>
        <p className="mt-2 text-text-muted">{loadError}</p>
      </div>
    );
  if (!tabletop) return null;

  const rulebookLabel =
    RULEBOOKS.find((r) => r.value === tabletop.rulebook)?.label ?? tabletop.rulebook;
  const dmCount = tabletop.members.filter((m) => m.role === "dm").length;
  const memberCount = tabletop.members.length;

  return (
    <>
      <LocalNav
        title={tabletop.name}
        titleHref={`/tabletops/${tabletopId}`}
        links={tabletopNavLinks(tabletopId, "overview")}
        cta={{ href: `/tabletops/${tabletopId}/vtt`, label: "Abrir VTT" }}
      />

      {/* Hero de produto */}
      <section className="overflow-hidden bg-bg pt-14 text-center md:pt-20">
        <div className="page-container flex flex-col items-center">
          <span className="type-eyebrow animate-rise text-text-muted">{rulebookLabel}</span>
          <h1 className="type-display mt-2 max-w-[14ch] animate-rise text-balance [animation-delay:60ms]">
            {tabletop.name}
          </h1>
          <p className="type-subhead mt-4 max-w-[32ch] animate-rise text-text-muted text-balance [animation-delay:120ms]">
            {iAmDm ? "Você conduz esta mesa." : "Você joga nesta mesa."}{" "}
            {memberCount} {memberCount === 1 ? "pessoa" : "pessoas"} na campanha.
          </p>
          <div className="mt-8 flex animate-rise flex-wrap justify-center gap-4 [animation-delay:180ms]">
            <Link href={`/tabletops/${tabletopId}/vtt`} className={buttonClass("primary", "lg")}>
              Abrir Virtual Tabletop
            </Link>
            <Link href={`/tabletops/${tabletopId}/sheets`} className={buttonClass("secondary", "lg")}>
              Ver fichas
            </Link>
          </div>
        </div>
        <div className="mt-14 px-4 md:mt-20">
          {tabletop.background_image_url ? (
            <figure className="mx-auto w-[min(92vw,980px)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}${tabletop.background_image_url}`}
                alt="Cena ativa da mesa"
                className="aspect-[16/9] w-full rounded-t-lg object-cover shadow-card"
              />
            </figure>
          ) : (
            <LaptopMockup />
          )}
        </div>
      </section>

      {/* Destaques em números */}
      <section className="border-t border-border-soft bg-bg py-14 md:py-20">
        <dl className="page-container grid grid-cols-1 gap-10 text-center sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border-soft">
          {[
            { value: String(memberCount), label: memberCount === 1 ? "membro" : "membros", big: true },
            { value: String(dmCount), label: dmCount === 1 ? "mestre" : "mestres", big: true },
            { value: dateFmt.format(new Date(tabletop.created_at)), label: "criada em", big: false },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col-reverse gap-1 px-4">
              <dt className="text-[17px] text-text-muted">{stat.label}</dt>
              <dd
                className={`flex h-12 items-end justify-center tabular-nums md:h-16 ${
                  stat.big ? "type-hero" : "type-card pb-1"
                }`}
              >
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Membros */}
      <section id="membros" className="scroll-mt-14 bg-bg-alt py-16 md:py-24">
        <div className="page-container flex flex-col gap-10">
          <SectionHeading title="Membros." tagline="Quem joga nesta mesa." />

          <div className="flex flex-col gap-3">
            <ul className="overflow-hidden rounded-md bg-surface shadow-card">
              {tabletop.members.map((m) => {
                const isMe = m.user_id === user?.id;
                return (
                  <li
                    key={m.user_id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border-soft px-5 py-4 last:border-b-0 md:px-7"
                  >
                    <Avatar name={m.username} size={44} />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-center gap-2 truncate font-semibold">
                        {m.username}
                        {isMe && <Badge>Você</Badge>}
                      </span>
                      <span className="text-sm text-text-muted">
                        {m.role === "dm" ? "Mestre" : "Jogador"} · desde{" "}
                        {dateFmt.format(new Date(m.joined_at))}
                      </span>
                    </div>
                    {iAmDm && (
                      <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                        <button
                          type="button"
                          onClick={() => changeRole(m.user_id, m.role === "dm" ? "player" : "dm")}
                          className="cursor-pointer rounded-full px-3 py-1.5 text-sm text-accent-strong transition hover:bg-accent-soft"
                        >
                          {m.role === "dm" ? "Tornar jogador" : "Tornar mestre"}
                        </button>
                        <button
                          type="button"
                          title="Remover da mesa"
                          aria-label={`Remover ${m.username}`}
                          onClick={() => removeMember(m.user_id)}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-text-faint transition hover:bg-danger-soft hover:text-danger"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <FieldError>{actionError}</FieldError>
          </div>

          {iAmDm && (
            <form
              onSubmit={onAddMember}
              className="grid gap-6 rounded-md bg-surface p-7 shadow-card md:grid-cols-[1fr_1.4fr] md:gap-10 md:p-10"
            >
              <div className="flex flex-col gap-2">
                <h3 className="type-card">Convidar alguém.</h3>
                <p className="text-text-muted">
                  Adicione pelo nome de usuário ou e-mail de uma conta já criada.
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <TextField
                  label="Usuário ou e-mail"
                  value={newMember}
                  onChange={(e) => setNewMember(e.target.value)}
                  required
                />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <SegmentedControl
                    value={newMemberRole}
                    onChange={setNewMemberRole}
                    options={[
                      { value: "player", label: "Jogador" },
                      { value: "dm", label: "Mestre" },
                    ]}
                  />
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function TabletopDetail({ tabletopId }: { tabletopId: string }) {
  return (
    <RequireAuth>
      <TabletopDetailContent tabletopId={tabletopId} />
    </RequireAuth>
  );
}
