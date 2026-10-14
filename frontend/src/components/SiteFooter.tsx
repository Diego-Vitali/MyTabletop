"use client";

import Link from "next/link";
import { Dices, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface FooterColumn {
  heading: string;
  links: { href: string; label: string; external?: boolean }[];
}

/** Rodapé no padrão apple.com: fundo cinza-claro, texto de 12px, notas,
 * diretório em colunas (acordeões no celular) e a linha de copyright. */
export function SiteFooter() {
  const { user, logout } = useAuth();

  const columns: FooterColumn[] = [
    {
      heading: "Explorar",
      links: [
        { href: "/", label: "Início" },
        { href: "/#recursos", label: "Recursos" },
        { href: "/tabletops", label: "Mesas" },
      ],
    },
    {
      heading: "Jogar",
      links: [
        { href: "/tabletops", label: "Minhas mesas" },
        { href: "/tabletops#nova-mesa", label: "Criar nova mesa" },
        { href: "/#recursos", label: "Fichas de personagem" },
        { href: "/#recursos", label: "Virtual Tabletop" },
      ],
    },
    {
      heading: "Conta",
      links: user
        ? [{ href: "/tabletops", label: `Conectado como ${user.username}` }]
        : [
            { href: "/login", label: "Iniciar sessão" },
            { href: "/register", label: "Criar conta" },
          ],
    },
    {
      heading: "Sobre o MyTabletop",
      links: [
        { href: "https://github.com/Diego-Vitali/MyTabletop", label: "Código-fonte", external: true },
        { href: "/#self-hosted", label: "Self-hosted" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border-soft bg-bg-alt text-xs text-text-muted">
      <div className="page-container pt-[17px] pb-5">
        <div className="flex flex-col gap-2.5 border-b border-border pb-[11px] text-text-muted">
          <p>
            MyTabletop é um Virtual Tabletop gratuito e self-hosted. Seus dados ficam no seu
            servidor — nenhuma mensalidade, nenhuma conta de terceiros.
          </p>
          <p>
            Ordem Paranormal é uma marca de seus respectivos detentores. O MyTabletop não é afiliado
            nem endossado por eles.
          </p>
        </div>

        <div className="flex items-center gap-2 border-b border-border py-3 text-text/80 md:border-b-0">
          <Link href="/" aria-label="Início" className="text-text/80 hover:text-text">
            <Dices size={14} strokeWidth={1.75} />
          </Link>
        </div>

        {/* Diretório: colunas no desktop */}
        <nav aria-label="Diretório" className="hidden grid-cols-4 gap-5 pt-1 pb-8 md:grid">
          {columns.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-2 font-semibold text-text/85">{col.heading}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink {...l} />
                  </li>
                ))}
                {col.heading === "Conta" && user && (
                  <li>
                    <button type="button" onClick={logout} className="cursor-pointer text-text/70 hover:underline">
                      Encerrar sessão
                    </button>
                  </li>
                )}
              </ul>
            </div>
          ))}
        </nav>

        {/* Diretório: acordeões no celular */}
        <nav aria-label="Diretório" className="md:hidden">
          {columns.map((col) => (
            <details key={col.heading} className="group border-b border-border">
              <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-text/85 [&::-webkit-details-marker]:hidden">
                {col.heading}
                <Plus size={14} className="text-text-muted transition-transform duration-300 group-open:rotate-45" />
              </summary>
              <ul className="flex flex-col gap-3 pb-4 pl-3">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink {...l} />
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>

        <div className="flex flex-col gap-2 pt-4 md:flex-row md:items-center md:justify-between md:border-t md:border-border">
          <p className="flex flex-col gap-1 md:flex-row md:gap-0">
            <span>Copyright © {new Date().getFullYear()} MyTabletop. Feito para mesas de RPG.</span>
            <span className="md:ml-3 md:border-l md:border-border md:pl-3">Self-hosted · Código aberto</span>
          </p>
          <span className="text-text/80">Brasil</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="text-text/70 hover:underline">
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className="text-text/70 hover:underline">
      {label}
    </Link>
  );
}
