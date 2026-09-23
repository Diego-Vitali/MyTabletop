"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="flex flex-col gap-5">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
        Virtual Tabletop RPG
      </span>
      <h1 className="text-3xl font-bold tracking-tight text-balance">
        Sua mesa, sua noite, sem custo de hospedagem.
      </h1>
      <p className="max-w-[60ch] text-text-muted">
        Crie mesas, convide jogadores e gerencie suas campanhas de Ordem
        Paranormal — self-hosted, do jeito que você controla.
      </p>
      {user ? (
        <Link
          href="/tabletops"
          className="w-fit rounded-sm bg-accent px-4 py-2.5 text-sm font-bold text-on-accent transition hover:brightness-110"
        >
          Ver minhas mesas
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="w-fit rounded-sm bg-accent px-4 py-2.5 text-sm font-bold text-on-accent transition hover:brightness-110"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="w-fit rounded-sm border border-border px-4 py-2.5 text-sm font-semibold text-text transition hover:border-border-soft hover:bg-surface"
          >
            Criar conta
          </Link>
        </div>
      )}
    </div>
  );
}
