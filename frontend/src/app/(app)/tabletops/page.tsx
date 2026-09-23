"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { TabletopPublic } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { TabletopCard } from "@/components/TabletopCard";
import { Button, Card, FieldError, Input, Select } from "@/components/ui";

function TabletopsPageContent() {
  const { token, user, refreshUser } = useAuth();
  const [tabletops, setTabletops] = useState<TabletopPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [rulebook, setRulebook] = useState(RULEBOOKS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get<TabletopPublic[]>("/tabletops", token);
      setTabletops(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    api
      .get<TabletopPublic[]>("/tabletops", token)
      .then((data) => {
        if (!ignore) setTabletops(data);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/tabletops", { name, rulebook }, token);
      setName("");
      await Promise.all([load(), refreshUser()]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar mesa");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-4 text-xl font-bold tracking-tight">Minhas mesas</h1>
        {loading ? (
          <p className="text-text-muted">Carregando...</p>
        ) : tabletops.length === 0 ? (
          <p className="text-text-muted">Você ainda não participa de nenhuma mesa.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {tabletops.map((t) => {
              const myRole = user?.tabletops.find((ut) => ut.tabletop_id === t.id)?.role;
              return <TabletopCard key={t.id} tabletop={t} myRole={myRole} />;
            })}
          </div>
        )}
      </div>

      <Card as="form" onSubmit={onCreate} className="flex max-w-sm flex-col gap-4">
        <h2 className="font-bold">Criar nova mesa</h2>
        <Input
          placeholder="Nome da mesa"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Select value={rulebook} onChange={(e) => setRulebook(e.target.value)}>
          {RULEBOOKS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
        <FieldError>{error}</FieldError>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Criando..." : "Criar mesa"}
        </Button>
      </Card>
    </div>
  );
}

export default function TabletopsPage() {
  return (
    <RequireAuth>
      <TabletopsPageContent />
    </RequireAuth>
  );
}
