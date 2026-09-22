"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(usernameOrEmail, password);
      router.push("/tabletops");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao entrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Entrar</h1>
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        placeholder="Usuário ou email"
        value={usernameOrEmail}
        onChange={(e) => setUsernameOrEmail(e.target.value)}
        required
      />
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        placeholder="Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
      >
        {submitting ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-sm text-neutral-400">
        Não tem conta?{" "}
        <Link href="/register" className="underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
