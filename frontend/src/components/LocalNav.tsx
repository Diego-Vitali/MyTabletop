"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { buttonClass } from "@/components/ui";

export interface LocalNavLink {
  href: string;
  label: string;
  current?: boolean;
}

/** Barra de produto fixa (a "localnav" das páginas de produto da Apple):
 * título à esquerda, links à direita, um botão azul pequeno como ação
 * principal. No celular os links recolhem num menu de chevron. */
export function LocalNav({
  title,
  titleHref,
  links = [],
  cta,
}: {
  title: string;
  titleHref?: string;
  links?: LocalNavLink[];
  cta?: { href: string; label: string };
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  return (
    <nav aria-label={title} className="sticky top-0 z-40">
      <div className="glass border-b border-hairline">
        <div className="page-container flex h-[52px] items-center justify-between gap-4">
          {titleHref ? (
            <Link href={titleHref} className="min-w-0 truncate text-[19px] font-semibold tracking-[0.012em] md:text-[21px] md:tracking-[0.011em]">
              {title}
            </Link>
          ) : (
            <span className="min-w-0 truncate text-[19px] font-semibold tracking-[0.012em] md:text-[21px] md:tracking-[0.011em]">
              {title}
            </span>
          )}

          <div className="flex shrink-0 items-center gap-6">
            <ul className="hidden items-center gap-6 text-xs md:flex">
              {links.map((l) => (
                <li key={l.href + l.label}>
                  {l.current ? (
                    <span aria-current="page" className="text-text/55">
                      {l.label}
                    </span>
                  ) : (
                    <Link href={l.href} className="text-text/85 transition hover:text-accent-strong">
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {links.length > 0 && (
              <button
                type="button"
                aria-label="Mais opções"
                aria-expanded={open}
                onClick={() => setOpenPath(open ? null : pathname)}
                className="flex h-8 w-8 cursor-pointer items-center justify-center text-text/70 md:hidden"
              >
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
                />
              </button>
            )}
            {cta && (
              <Link href={cta.href} className={buttonClass("primary", "sm")}>
                {cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>

      {open && (
        <ul className="glass animate-flyout border-b border-hairline px-[6.25%] pt-2 pb-5 md:hidden">
          {links.map((l) => (
            <li key={l.href + l.label} className="border-b border-hairline last:border-b-0">
              {l.current ? (
                <span className="block py-3 text-[17px] text-text/55">{l.label}</span>
              ) : (
                <Link
                  href={l.href}
                  onClick={() => setOpenPath(null)}
                  className="block py-3 text-[17px] text-text"
                >
                  {l.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
