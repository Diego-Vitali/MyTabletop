"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(username, email, password);
      router.push("/tabletops");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao cadastrar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto flex max-w-sm flex-col gap-4">
      <h1 className="text-xl font-semibold">Criar conta</h1>
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        placeholder="Usuário"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        minLength={3}
        maxLength={32}
        required
      />
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        placeholder="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
        placeholder="Senha (mín. 8 caracteres)"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 disabled:opacity-50"
      >
        {submitting ? "Criando..." : "Criar conta"}
      </button>
      <p className="text-sm text-neutral-400">
        Já tem conta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
