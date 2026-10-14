"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { Button, ChevronLink, FieldError, TextField } from "@/components/ui";
import { AccountShell } from "@/components/AccountShell";

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
    <AccountShell
      current="register"
      title="Crie sua conta MyTabletop."
      subtitle="Uma conta é tudo de que você precisa para mestrar ou jogar."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <TextField
          label="Nome de usuário"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          minLength={3}
          maxLength={32}
          required
        />
        <TextField
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="flex flex-col gap-2">
          <TextField
            label="Senha"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <p className="px-1 text-xs text-text-muted">Use no mínimo 8 caracteres.</p>
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" size="lg" disabled={submitting} className="mt-4 w-full">
          {submitting ? "Criando conta..." : "Continuar"}
        </Button>
      </form>

      <div className="mt-12 flex flex-col items-center gap-2 border-t border-border-soft pt-8 text-center text-sm">
        <span className="text-text-muted">Já tem uma conta?</span>
        <ChevronLink href="/login">Inicie sessão</ChevronLink>
      </div>
    </AccountShell>
  );
}
