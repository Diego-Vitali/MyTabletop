"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout, loading } = useAuth();

  return (
    <header className="border-b border-neutral-800">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight">
          MyTabletop
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {!loading && user && (
            <>
              <Link href="/tabletops" className="hover:underline">
                Minhas mesas
              </Link>
              <span className="text-neutral-400">{user.username}</span>
              <button onClick={logout} className="hover:underline cursor-pointer">
                Sair
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/login" className="hover:underline">
                Entrar
              </Link>
              <Link href="/register" className="hover:underline">
                Cadastrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
