"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { ChevronLink, FieldError, TextField } from "@/components/ui";
import { AccountShell } from "@/components/AccountShell";

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

  const canSubmit = usernameOrEmail.trim() !== "" && password !== "" && !submitting;

  return (
    <AccountShell
      current="login"
      title="Inicie sessão no MyTabletop."
      subtitle="Use sua conta para entrar nas suas mesas, fichas e no Virtual Tabletop."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <TextField
            label="Usuário ou e-mail"
            position="top"
            autoComplete="username"
            value={usernameOrEmail}
            onChange={(e) => setUsernameOrEmail(e.target.value)}
            invalid={!!error}
            required
          />
          <TextField
            label="Senha"
            type="password"
            position="bottom"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={!!error}
            required
            trailing={
              <button
                type="submit"
                aria-label="Iniciar sessão"
                disabled={!canSubmit}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-text-faint text-text-muted transition enabled:hover:border-text enabled:hover:text-text disabled:cursor-default disabled:opacity-40"
              >
                {submitting ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              </button>
            }
          />
        </div>
        <FieldError>{error}</FieldError>
      </form>

      <div className="mt-12 flex flex-col items-center gap-2 border-t border-border-soft pt-8 text-center text-sm">
        <span className="text-text-muted">Ainda não tem uma conta?</span>
        <ChevronLink href="/register">Crie a sua agora</ChevronLink>
      </div>
    </AccountShell>
  );
}
