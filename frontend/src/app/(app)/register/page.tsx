"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Card, FieldError, Input } from "@/components/ui";

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
    <Card className="mx-auto flex max-w-sm flex-col gap-5">
      <h1 className="text-xl font-bold tracking-tight">Criar conta</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={32}
          required
        />
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          placeholder="Senha (mín. 8 caracteres)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
        <FieldError>{error}</FieldError>
        <Button type="submit" disabled={submitting} className="w-full justify-center">
          {submitting ? "Criando..." : "Criar conta"}
        </Button>
      </form>
      <p className="text-sm text-text-muted">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
