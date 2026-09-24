"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, Card, FieldError, Input } from "@/components/ui";

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
    <Card className="mx-auto flex max-w-sm flex-col gap-5">
      <h1 className="text-xl font-bold tracking-tight">Entrar</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          placeholder="Usuário ou email"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          required
        />
        <Input
          placeholder="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <FieldError>{error}</FieldError>
        <Button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-1.5"
        >
          <LogIn size={16} />
          {submitting ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <p className="text-sm text-text-muted">
        Não tem conta?{" "}
        <Link href="/register" className="font-semibold text-accent hover:underline">
          Cadastre-se
        </Link>
      </p>
    </Card>
  );
}
