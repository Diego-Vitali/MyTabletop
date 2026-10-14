"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Dices, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { TabletopPublic } from "@/lib/types";

type MenuId = "mesas" | "fichas" | "vtt" | "conta";

interface FlyoutLink {
  href: string;
  label: string;
}

interface FlyoutColumn {
  heading: string;
  /** Coluna principal: links grandes (24px), como "Explorar Mac". */
  primary?: boolean;
  links: FlyoutLink[];
  empty?: string;
}

/** Barra de navegação global no padrão apple.com: vidro translúcido de 44px,
 * itens distribuídos de ponta a ponta, flyouts que expandem a barra para
 * baixo e desfocam a página, e menu em tela cheia no celular. */
export function GlobalNav() {
  const { user, loading, logout, token } = useAuth();
  const pathname = usePathname();

  // Menus guardam o pathname em que foram abertos: trocar de rota fecha
  // tudo sem precisar de setState dentro de um effect.
  const [desktopMenu, setDesktopMenu] = useState<{ id: MenuId; path: string } | null>(null);
  const [mobile, setMobile] = useState<{ sub: MenuId | null; path: string } | null>(null);
  const [tabletops, setTabletops] = useState<TabletopPublic[] | null>(null);

  const openId = desktopMenu && desktopMenu.path === pathname ? desktopMenu.id : null;
  const mobileOpen = !!mobile && mobile.path === pathname;
  const mobileSub = mobileOpen ? mobile.sub : null;

  const loadTabletops = () => {
    if (!token) return;
    api.get<TabletopPublic[]>("/tabletops", token).then(setTabletops, () => {});
  };

  const openDesktop = (id: MenuId) => {
    if (openId === id) return;
    if (id !== "conta" && openId === null) loadTabletops();
    setDesktopMenu({ id, path: pathname });
  };

  const closeDesktop = () => setDesktopMenu(null);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDesktopMenu(null);
        setMobile(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const myRole = (t: TabletopPublic) =>
    user?.tabletops.find((ut) => ut.tabletop_id === t.id)?.role;
  const dmTables = (tabletops ?? []).filter((t) => myRole(t) === "dm");
  const playerTables = (tabletops ?? []).filter((t) => myRole(t) !== "dm");
  const listOrLoading = tabletops === null ? "Carregando..." : "Nenhuma mesa ainda.";

  const columns: Record<MenuId, FlyoutColumn[]> = {
    mesas: [
      {
        heading: "Explorar mesas",
        primary: true,
        links: [
          { href: "/tabletops", label: "Todas as mesas" },
          { href: "/tabletops#nova-mesa", label: "Criar nova mesa" },
        ],
      },
      {
        heading: "Mestrando",
        links: dmTables.map((t) => ({ href: `/tabletops/${t.id}`, label: t.name })),
        empty: listOrLoading,
      },
      {
        heading: "Jogando",
        links: playerTables.map((t) => ({ href: `/tabletops/${t.id}`, label: t.name })),
        empty: listOrLoading,
      },
    ],
    fichas: [
      {
        heading: "Abrir fichas de",
        primary: true,
        links: (tabletops ?? []).slice(0, 6).map((t) => ({
          href: `/tabletops/${t.id}/sheets`,
          label: t.name,
        })),
        empty: listOrLoading,
      },
      {
        heading: "Mais sobre fichas",
        links: [{ href: "/#recursos", label: "Atributos de Ordem Paranormal" }],
      },
    ],
    vtt: [
      {
        heading: "Entrar no Virtual Tabletop",
        primary: true,
        links: (tabletops ?? []).slice(0, 6).map((t) => ({
          href: `/tabletops/${t.id}/vtt`,
          label: t.name,
        })),
        empty: listOrLoading,
      },
      {
        heading: "Mais sobre o VTT",
        links: [
          { href: "/#recursos", label: "Mapas, tokens e névoa" },
          { href: "/tabletops", label: "Escolher uma mesa" },
        ],
      },
    ],
    conta: user
      ? [
          {
            heading: `Conectado como ${user.username}`,
            primary: true,
            links: [{ href: "/tabletops", label: "Minhas mesas" }],
          },
        ]
      : [
          {
            heading: "Sua conta",
            primary: true,
            links: [
              { href: "/login", label: "Iniciar sessão" },
              { href: "/register", label: "Criar conta" },
            ],
          },
        ],
  };

  const items: { id?: MenuId; href: string; label: string }[] = user
    ? [
        { href: "/", label: "Início" },
        { id: "mesas", href: "/tabletops", label: "Mesas" },
        { id: "fichas", href: "/tabletops", label: "Fichas" },
        { id: "vtt", href: "/tabletops", label: "Virtual Tabletop" },
        { href: "/#recursos", label: "Recursos" },
      ]
    : [
        { href: "/", label: "Início" },
        { href: "/#recursos", label: "Recursos" },
        { href: "/login", label: "Iniciar sessão" },
        { href: "/register", label: "Criar conta" },
      ];

  const overlayOpen = openId !== null;

  return (
    <>
      <header
        className="relative z-50"
        onMouseLeave={closeDesktop}
      >
        <nav
          aria-label="Global"
          className={`h-12 transition-colors duration-300 md:h-11 ${
            overlayOpen || mobileOpen ? "bg-surface" : "glass"
          }`}
        >
          <ul className="mx-auto flex h-full max-w-[1024px] items-center justify-between px-4 text-xs md:px-[22px]">
            <li className="flex-1 md:flex-none">
              <Link
                href="/"
                aria-label="MyTabletop"
                className="flex h-11 w-9 items-center text-text/80 transition hover:text-text"
                onMouseEnter={closeDesktop}
              >
                <Dices size={18} strokeWidth={1.75} />
              </Link>
            </li>
            {!loading &&
              items.map((item) => (
                <li key={item.label} className="hidden md:block">
                  <Link
                    href={item.href}
                    onMouseEnter={() => (item.id ? openDesktop(item.id) : closeDesktop())}
                    onFocus={() => item.id && openDesktop(item.id)}
                    className={`block px-2 leading-11 transition ${
                      openId && openId === item.id ? "text-text" : "text-text/80 hover:text-text"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            <li className="flex items-center">
              {!loading && (
                <Link
                  href={user ? "/tabletops" : "/login"}
                  aria-label="Conta"
                  onMouseEnter={() => openDesktop("conta")}
                  onFocus={() => openDesktop("conta")}
                  className="flex h-11 w-9 items-center justify-center text-text/80 transition hover:text-text"
                >
                  <UserRound size={17} strokeWidth={1.75} />
                </Link>
              )}
              <button
                type="button"
                aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
                aria-expanded={mobileOpen}
                onClick={() => {
                  if (mobileOpen) {
                    setMobile(null);
                  } else {
                    loadTabletops();
                    setMobile({ sub: null, path: pathname });
                  }
                }}
                className="relative flex h-12 w-9 cursor-pointer items-center justify-center md:hidden"
              >
                <span
                  className={`absolute h-[1.5px] w-[17px] rounded-full bg-text transition-transform duration-300 ${
                    mobileOpen ? "rotate-45" : "-translate-y-[3.5px]"
                  }`}
                />
                <span
                  className={`absolute h-[1.5px] w-[17px] rounded-full bg-text transition-transform duration-300 ${
                    mobileOpen ? "-rotate-45" : "translate-y-[3.5px]"
                  }`}
                />
              </button>
            </li>
          </ul>
        </nav>

        {/* Flyout (desktop) */}
        {openId && (
          <div className="absolute inset-x-0 top-11 hidden bg-surface md:block">
            <div className="mx-auto flex max-w-[1024px] animate-flyout gap-20 px-[22px] pt-10 pb-20">
              {columns[openId].map((col) => (
                <FlyoutColumnView key={col.heading} column={col} onNavigate={closeDesktop} />
              ))}
              {openId === "conta" && user && (
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-text-muted">Sessão</span>
                  <button
                    type="button"
                    onClick={() => {
                      closeDesktop();
                      logout();
                    }}
                    className="cursor-pointer text-left text-xs font-semibold text-text/85 hover:text-accent-strong hover:underline"
                  >
                    Encerrar sessão
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Menu em tela cheia (celular) */}
        {mobileOpen && (
          <div className="fixed inset-x-0 top-12 bottom-0 overflow-y-auto bg-surface px-12 pt-6 pb-16 md:hidden">
            {mobileSub ? (
              <div className="flex animate-flyout flex-col gap-8">
                <button
                  type="button"
                  aria-label="Voltar"
                  onClick={() => setMobile({ sub: null, path: pathname })}
                  className="-ml-1 flex h-8 w-8 cursor-pointer items-center text-text-muted"
                >
                  <ChevronLeft size={22} />
                </button>
                {columns[mobileSub].map((col) => (
                  <FlyoutColumnView key={col.heading} column={col} mobile onNavigate={() => setMobile(null)} />
                ))}
              </div>
            ) : (
              <ul className="flex animate-flyout flex-col gap-2">
                {!loading &&
                  items.map((item) => (
                    <li key={item.label}>
                      {item.id ? (
                        <button
                          type="button"
                          onClick={() => setMobile({ sub: item.id!, path: pathname })}
                          className="group flex w-full cursor-pointer items-center justify-between py-1 text-[28px] font-semibold leading-tight tracking-[0.007em] text-text/90"
                        >
                          {item.label}
                          <ChevronRight size={20} className="text-text-faint" />
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={() => setMobile(null)}
                          className="block py-1 text-[28px] font-semibold leading-tight tracking-[0.007em] text-text/90"
                        >
                          {item.label}
                        </Link>
                      )}
                    </li>
                  ))}
                {user && (
                  <li className="mt-6 flex flex-col gap-3 border-t border-border-soft pt-6">
                    <span className="text-xs text-text-muted">Conectado como {user.username}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setMobile(null);
                        logout();
                      }}
                      className="w-fit cursor-pointer text-[17px] font-semibold text-text/90"
                    >
                      Encerrar sessão
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </header>

      {/* Cortina que desfoca a página sob o flyout */}
      {overlayOpen && (
        <div
          aria-hidden
          onMouseEnter={closeDesktop}
          className="fixed inset-0 z-40 hidden bg-bg/50 backdrop-blur-[20px] md:block"
        />
      )}
    </>
  );
}

function FlyoutColumnView({
  column,
  mobile = false,
  onNavigate,
}: {
  column: FlyoutColumn;
  mobile?: boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className={`text-xs text-text-muted ${column.primary || mobile ? "mb-3.5" : "mb-3"}`}>
        {column.heading}
      </span>
      {column.links.length === 0 && column.empty ? (
        <span className="text-xs text-text-faint">{column.empty}</span>
      ) : (
        <ul className={`flex flex-col ${column.primary ? "gap-2" : "gap-2.5"}`}>
          {column.links.map((l) => (
            <li key={l.href + l.label}>
              <Link
                href={l.href}
                onClick={onNavigate}
                className={`block max-w-[22ch] truncate transition hover:text-accent-strong ${
                  column.primary
                    ? "text-2xl leading-[1.17] font-semibold tracking-[0.009em] text-text"
                    : mobile
                      ? "text-[17px] font-semibold text-text/85"
                      : "text-xs font-semibold text-text/85"
                }`}
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
