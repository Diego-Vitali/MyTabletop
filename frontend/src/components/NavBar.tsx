"use client";

import Link from "next/link";
import { LayoutGrid, LogIn, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const iconLinkClass =
  "flex h-9 w-9 items-center justify-center rounded-sm text-text-muted transition hover:bg-surface-2 hover:text-text";

export function NavBar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-border-soft bg-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
          MyTabletop
        </Link>

        {!loading && user && (
          <div className="flex items-center gap-1 rounded-md border border-border-soft bg-surface/80 p-1">
            <Link href="/tabletops" title="Minhas mesas" className={iconLinkClass}>
              <LayoutGrid size={18} />
            </Link>
            <div className="mx-0.5 h-5 w-px bg-border-soft" />
            <span className="hidden px-1 font-mono text-xs text-text-muted sm:inline">
              {user.username}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-[10px] text-text-muted">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <button type="button" onClick={logout} title="Sair" className={`${iconLinkClass} cursor-pointer`}>
              <LogOut size={18} />
            </button>
          </div>
        )}

        {!loading && !user && (
          <div className="flex items-center gap-1 rounded-md border border-border-soft bg-surface/80 p-1">
            <Link href="/login" title="Entrar" className={iconLinkClass}>
              <LogIn size={18} />
            </Link>
            <Link
              href="/register"
              className="flex h-9 items-center gap-1.5 rounded-sm bg-accent px-3 text-xs font-bold text-on-accent transition hover:brightness-110"
            >
              <UserPlus size={16} />
              Cadastrar
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
