"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-border-soft bg-surface/60 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
          MyTabletop
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          {!loading && user && (
            <>
              <Link href="/tabletops" className="text-text-muted transition hover:text-text">
                Minhas mesas
              </Link>
              <span className="hidden text-text-muted sm:inline">{user.username}</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-[10px] text-text-muted">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="cursor-pointer rounded-sm border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition hover:border-border-soft hover:text-text"
              >
                Sair
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="text-text-muted transition hover:text-text">
                Entrar
              </Link>
              <Link
                href="/register"
                className="rounded-sm bg-accent px-3.5 py-1.5 text-xs font-bold text-on-accent transition hover:brightness-110"
              >
                Cadastrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
