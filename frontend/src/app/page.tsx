"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Bem-vindo ao MyTabletop</h1>
      <p className="text-neutral-400">
        Seu Virtual Tabletop RPG self-hosted. Crie mesas, convide jogadores e
        gerencie suas campanhas.
      </p>
      {user ? (
        <Link
          href="/tabletops"
          className="w-fit rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
        >
          Ver minhas mesas
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="w-fit rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="w-fit rounded border border-neutral-700 px-4 py-2 text-sm font-medium"
          >
            Criar conta
          </Link>
        </div>
      )}
    </div>
  );
}
