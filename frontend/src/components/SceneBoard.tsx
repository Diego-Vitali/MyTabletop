"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, API_URL } from "@/lib/api";
import type { ScenePublic, TabletopPublic } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, Card, FieldError, Input } from "@/components/ui";

function SceneBoardContent({ tabletopId }: { tabletopId: string }) {
  const { token, user } = useAuth();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [scenes, setScenes] = useState<ScenePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = () => {
    if (!token) return;
    let ignore = false;
    Promise.all([
      api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token),
      api.get<ScenePublic[]>(`/tabletops/${tabletopId}/scenes`, token),
    ]).then(
      ([tt, sc]) => {
        if (!ignore) {
          setTabletop(tt);
          setScenes(sc);
          setLoading(false);
        }
      },
      (err) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : "Falha ao carregar a cena");
          setLoading(false);
        }
      },
    );
    return () => {
      ignore = true;
    };
  };

  useEffect(load, [token, tabletopId]);

  const iAmDm =
    !!user && !!tabletop && tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");

  const onUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setUploadError("Escolha uma imagem");
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("image", file);
      const scene = await api.upload<ScenePublic>(
        `/tabletops/${tabletopId}/scenes`,
        formData,
        token,
      );
      setScenes((prev) => [...prev, scene]);
      setTabletop((prev) => (prev ? { ...prev, active_scene_id: scene.id } : prev));
      setName("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const activateScene = async (sceneId: string) => {
    setActionError(null);
    try {
      const updated = await api.patch<TabletopPublic>(
        `/tabletops/${tabletopId}/scenes/${sceneId}/activate`,
        {},
        token,
      );
      setTabletop(updated);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Falha ao ativar cena");
    }
  };

  const deleteScene = async (sceneId: string) => {
    setActionError(null);
    try {
      const updated = await api.del<TabletopPublic>(
        `/tabletops/${tabletopId}/scenes/${sceneId}`,
        token,
      );
      setTabletop(updated);
      setScenes((prev) => prev.filter((s) => s.id !== sceneId));
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Falha ao remover cena");
    }
  };

  if (loading) return <p className="text-text-muted">Carregando...</p>;
  if (loadError) return <p className="text-danger">{loadError}</p>;
  if (!tabletop) return null;

  const activeScene = scenes.find((s) => s.id === tabletop.active_scene_id) ?? null;

  return (
    <div className="flex flex-col gap-10">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint">
          {tabletop.name}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">Cena</h1>
      </div>

      <div className="flex items-center justify-center overflow-hidden rounded-lg border border-border-soft bg-surface">
        {activeScene ? (
          <img
            src={`${API_URL}${activeScene.image_url}`}
            alt={activeScene.name}
            className="max-h-[70vh] w-full object-contain"
          />
        ) : (
          <p className="py-24 text-text-muted">Nenhuma cena ativa ainda.</p>
        )}
      </div>
      {activeScene && (
        <p className="-mt-6 font-mono text-xs text-text-faint">Exibindo: {activeScene.name}</p>
      )}

      {iAmDm && (
        <>
          {scenes.length > 0 && (
            <div>
              <h2 className="mb-3 font-bold">Cenas salvas</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {scenes.map((s) => (
                  <Card key={s.id} className="flex flex-col gap-3">
                    <img
                      src={`${API_URL}${s.image_url}`}
                      alt={s.name}
                      className="h-32 w-full rounded-sm object-cover"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        {s.name}
                        {s.id === tabletop.active_scene_id && <Badge variant="accent">Ativa</Badge>}
                      </span>
                      <div className="flex gap-3 text-sm">
                        {s.id !== tabletop.active_scene_id && (
                          <button
                            className="text-text-muted transition hover:text-text"
                            onClick={() => activateScene(s.id)}
                          >
                            Ativar
                          </button>
                        )}
                        <button
                          className="text-danger transition hover:text-danger/80"
                          onClick={() => deleteScene(s.id)}
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <div className="mt-2">
                <FieldError>{actionError}</FieldError>
              </div>
            </div>
          )}

          <Card as="form" onSubmit={onUpload} className="flex max-w-sm flex-col gap-4">
            <h2 className="font-bold">Nova cena</h2>
            <Input placeholder="Nome da cena" value={name} onChange={(e) => setName(e.target.value)} required />
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="text-sm text-text-muted file:mr-3 file:rounded-sm file:border-0 file:bg-surface-2 file:px-3.5 file:py-2 file:text-sm file:font-semibold file:text-text hover:file:bg-surface"
            />
            <FieldError>{uploadError}</FieldError>
            <Button type="submit" disabled={uploading}>
              {uploading ? "Enviando..." : "Enviar e ativar"}
            </Button>
          </Card>
        </>
      )}
    </div>
  );
}

export function SceneBoard({ tabletopId }: { tabletopId: string }) {
  return (
    <RequireAuth>
      <SceneBoardContent tabletopId={tabletopId} />
    </RequireAuth>
  );
}
