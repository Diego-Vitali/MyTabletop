"use client";

import { useEffect, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import Link from "next/link";
import { DoorOpen, History as HistoryIcon, ImagePlus, Shapes, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, API_URL, WS_URL } from "@/lib/api";
import type { MapHistoryEntryPublic, TabletopPublic, TokenPublic } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, FieldError, ToolbarIconButton } from "@/components/ui";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.1;
const TOKEN_SIZE = 64;

type Transform = { x: number; y: number; scale: number };
type PanelId = "members" | "history" | "scene" | "token";

function VttViewContent({ tabletopId }: { tabletopId: string }) {
  const { token, user } = useAuth();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const tokenDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const centeredRef = useRef(false);

  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [tokenUploadError, setTokenUploadError] = useState<string | null>(null);
  const [tokenUploading, setTokenUploading] = useState(false);
  const tokenFileRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<MapHistoryEntryPublic[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    Promise.all([
      api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token),
      api.get<TokenPublic[]>(`/tabletops/${tabletopId}/vtt/tokens`, token),
    ]).then(
      ([tt, tk]) => {
        if (!ignore) {
          setTabletop(tt);
          setBackgroundUrl(tt.background_image_url);
          setTokens(tk);
          setLoading(false);
        }
      },
      (err) => {
        if (!ignore) {
          setLoadError(err instanceof ApiError ? err.message : "Falha ao carregar a mesa");
          setLoading(false);
        }
      },
    );
    return () => {
      ignore = true;
    };
  }, [token, tabletopId]);

  // Real-time: background swaps and token changes from any member reach
  // everyone else here.
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(
      `${WS_URL}/ws/tabletops/${tabletopId}?token=${encodeURIComponent(token)}`,
    );
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "background_updated") {
          centeredRef.current = false;
          setBackgroundUrl(msg.background_image_url);
          setTokens([]);
        } else if (msg.type === "token_added") {
          setTokens((prev) => (prev.some((t) => t.id === msg.token.id) ? prev : [...prev, msg.token]));
        } else if (msg.type === "token_moved") {
          setTokens((prev) =>
            prev.map((t) => (t.id === msg.token_id ? { ...t, x: msg.x, y: msg.y } : t)),
          );
        } else if (msg.type === "token_deleted") {
          setTokens((prev) => prev.filter((t) => t.id !== msg.token_id));
        }
      } catch {
        // ignore malformed messages
      }
    };
    return () => ws.close();
  }, [token, tabletopId]);

  const iAmDm =
    !!user && !!tabletop && tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");

  const canMoveToken = (t: TokenPublic) => iAmDm || t.created_by === user?.id;

  const togglePanel = (panel: PanelId) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
    if (panel === "history" && history === null) {
      setHistoryLoading(true);
      api
        .get<MapHistoryEntryPublic[]>(`/tabletops/${tabletopId}/vtt/history`, token)
        .then(setHistory, () => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  };

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    if (centeredRef.current || !containerRef.current) return;
    const img = e.currentTarget;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight, 1);
    setTransform({
      x: (rect.width - img.naturalWidth * scale) / 2,
      y: (rect.height - img.naturalHeight * scale) / 2,
      scale,
    });
    centeredRef.current = true;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setTransform((prev) => {
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      return { scale: nextScale, x: px - (px - prev.x) * ratio, y: py - (py - prev.y) * ratio };
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    setOpenPanel(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: transform.x,
      originY: transform.y,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { startX, startY, originX, originY } = dragRef.current;
    setTransform((prev) => ({
      ...prev,
      x: originX + (e.clientX - startX),
      y: originY + (e.clientY - startY),
    }));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const onTokenPointerDown = (e: React.PointerEvent, t: TokenPublic) => {
    if (!canMoveToken(t)) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    tokenDragRef.current = { id: t.id, startX: e.clientX, startY: e.clientY, originX: t.x, originY: t.y };
  };

  const onTokenPointerMove = (e: React.PointerEvent) => {
    const drag = tokenDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    const dx = (e.clientX - drag.startX) / transform.scale;
    const dy = (e.clientY - drag.startY) / transform.scale;
    setTokens((prev) =>
      prev.map((t) => (t.id === drag.id ? { ...t, x: drag.originX + dx, y: drag.originY + dy } : t)),
    );
  };

  const onTokenPointerUp = async (e: React.PointerEvent) => {
    const drag = tokenDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    tokenDragRef.current = null;
    const moved = tokens.find((t) => t.id === drag.id);
    if (!moved) return;
    try {
      await api.patch<TokenPublic>(
        `/tabletops/${tabletopId}/vtt/tokens/${drag.id}`,
        { x: moved.x, y: moved.y },
        token,
      );
    } catch {
      // best effort — a future WS message will correct any drift
    }
  };

  const deleteToken = async (t: TokenPublic) => {
    setTokens((prev) => prev.filter((tok) => tok.id !== t.id));
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, token);
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

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
      formData.append("image", file);
      const updated = await api.upload<TabletopPublic>(
        `/tabletops/${tabletopId}/vtt/background`,
        formData,
        token,
        "PUT",
      );
      centeredRef.current = false;
      setBackgroundUrl(updated.background_image_url);
      setTokens([]);
      setHistory(null);
      if (fileRef.current) fileRef.current.value = "";
      setOpenPanel(null);
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const onAddToken = async (e: FormEvent) => {
    e.preventDefault();
    if (!backgroundUrl) {
      setTokenUploadError("Defina uma cena antes de adicionar tokens");
      return;
    }
    const file = tokenFileRef.current?.files?.[0];
    if (!file || !containerRef.current) {
      setTokenUploadError("Escolha uma imagem");
      return;
    }
    setTokenUploadError(null);
    setTokenUploading(true);
    try {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = (rect.width / 2 - transform.x) / transform.scale;
      const centerY = (rect.height / 2 - transform.y) / transform.scale;
      const formData = new FormData();
      formData.append("x", String(centerX));
      formData.append("y", String(centerY));
      formData.append("image", file);
      const created = await api.upload<TokenPublic>(
        `/tabletops/${tabletopId}/vtt/tokens`,
        formData,
        token,
      );
      setTokens((prev) => [...prev, created]);
      if (tokenFileRef.current) tokenFileRef.current.value = "";
      setOpenPanel(null);
    } catch (err) {
      setTokenUploadError(err instanceof ApiError ? err.message : "Falha ao adicionar token");
    } finally {
      setTokenUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center bg-bg text-text-muted">
        Carregando...
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="flex h-dvh w-dvw items-center justify-center bg-bg text-danger">
        {loadError}
      </div>
    );
  }
  if (!tabletop) return null;

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-bg">
      <div
        ref={containerRef}
        className="relative h-full w-full cursor-grab touch-none active:cursor-grabbing"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {backgroundUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={backgroundUrl}
              src={`${API_URL}${backgroundUrl}`}
              alt="Cena"
              draggable={false}
              onLoad={onImageLoad}
              className="pointer-events-none max-w-none select-none"
            />
          )}
          {tokens.map((t) => (
            <div
              key={t.id}
              onPointerDown={(e) => onTokenPointerDown(e, t)}
              onPointerMove={onTokenPointerMove}
              onPointerUp={onTokenPointerUp}
              className="group absolute"
              style={{
                left: t.x - TOKEN_SIZE / 2,
                top: t.y - TOKEN_SIZE / 2,
                width: TOKEN_SIZE,
                height: TOKEN_SIZE,
                touchAction: "none",
                cursor: canMoveToken(t) ? "grab" : "default",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}${t.image_url}`}
                alt="Token"
                draggable={false}
                className="h-full w-full select-none rounded-full border-2 border-border-soft object-cover shadow-lg"
              />
              {canMoveToken(t) && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => deleteToken(t)}
                  className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-on-accent group-hover:flex"
                  title="Remover token"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {!backgroundUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-text-muted">
            Nenhuma cena definida ainda.
          </div>
        )}
      </div>

      {/* Top-left toolbar: navigation + info panels */}
      <div className="absolute left-4 top-4 flex items-center gap-1 rounded-md border border-border-soft bg-surface/90 p-1 backdrop-blur">
        <Link
          href={`/tabletops/${tabletopId}`}
          title="Sair do VTT"
          className="flex h-9 w-9 items-center justify-center rounded-sm text-text-muted transition hover:bg-surface-2 hover:text-text"
        >
          <DoorOpen size={18} />
        </Link>
        <div className="mx-0.5 h-5 w-px bg-border-soft" />
        <ToolbarIconButton
          title="Membros"
          active={openPanel === "members"}
          onClick={() => togglePanel("members")}
        >
          <Users size={18} />
        </ToolbarIconButton>
        {iAmDm && (
          <ToolbarIconButton
            title="Histórico de mapas"
            active={openPanel === "history"}
            onClick={() => togglePanel("history")}
          >
            <HistoryIcon size={18} />
          </ToolbarIconButton>
        )}
      </div>

      {openPanel === "members" && (
        <div className="absolute left-4 top-16 w-64 rounded-md border border-border-soft bg-surface/95 p-3 backdrop-blur">
          <span className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Membros
          </span>
          <ul className="flex flex-col gap-1.5">
            {tabletop.members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between gap-2 text-sm">
                <span>{m.username}</span>
                <Badge variant={m.role === "dm" ? "accent" : "neutral"}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}

      {openPanel === "history" && (
        <div className="absolute left-4 top-16 flex max-h-[70vh] w-72 flex-col gap-3 overflow-y-auto rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Histórico de mapas
          </span>
          {historyLoading && <p className="text-xs text-text-muted">Carregando...</p>}
          {!historyLoading && history?.length === 0 && (
            <p className="text-xs text-text-muted">Nenhum mapa anterior ainda.</p>
          )}
          {history?.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-col gap-1.5 border-t border-border-soft pt-3 first:border-t-0 first:pt-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${API_URL}${entry.image_url}`}
                alt="Mapa anterior"
                className="h-24 w-full rounded-sm object-cover"
              />
              <span className="font-mono text-[10px] text-text-faint">
                {new Date(entry.created_at).toLocaleString("pt-BR")} · {entry.tokens.length}{" "}
                {entry.tokens.length === 1 ? "token" : "tokens"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Right toolbar: scene + token tools */}
      <div className="absolute right-4 top-4 flex flex-col items-center gap-1 rounded-md border border-border-soft bg-surface/90 p-1 backdrop-blur">
        {iAmDm && (
          <ToolbarIconButton
            title="Cena"
            active={openPanel === "scene"}
            onClick={() => togglePanel("scene")}
          >
            <ImagePlus size={18} />
          </ToolbarIconButton>
        )}
        <ToolbarIconButton
          title={backgroundUrl ? "Adicionar token" : "Defina uma cena antes de adicionar tokens"}
          active={openPanel === "token"}
          disabled={!backgroundUrl}
          onClick={() => togglePanel("token")}
        >
          <Shapes size={18} />
        </ToolbarIconButton>
      </div>

      {openPanel === "scene" && iAmDm && (
        <form
          onSubmit={onUpload}
          className="absolute right-16 top-4 flex w-56 flex-col gap-2 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur"
        >
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Cena
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="text-xs text-text-muted file:mr-2 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-text hover:file:bg-surface"
          />
          <FieldError>{uploadError}</FieldError>
          <Button type="submit" disabled={uploading} className="text-xs">
            {uploading ? "Enviando..." : backgroundUrl ? "Trocar imagem" : "Definir cena"}
          </Button>
        </form>
      )}

      {openPanel === "token" && (
        <form
          onSubmit={onAddToken}
          className="absolute right-16 top-4 flex w-56 flex-col gap-2 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur"
        >
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Token
          </span>
          <input
            ref={tokenFileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="text-xs text-text-muted file:mr-2 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-text hover:file:bg-surface"
          />
          <FieldError>{tokenUploadError}</FieldError>
          <Button type="submit" variant="secondary" disabled={tokenUploading} className="text-xs">
            {tokenUploading ? "Enviando..." : "Adicionar token"}
          </Button>
        </form>
      )}
    </div>
  );
}

export function VttView({ tabletopId }: { tabletopId: string }) {
  return (
    <RequireAuth>
      <VttViewContent tabletopId={tabletopId} />
    </RequireAuth>
  );
}
