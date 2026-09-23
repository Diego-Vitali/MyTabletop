"use client";

import { useEffect, useRef, useState, type FormEvent, type SyntheticEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, API_URL, WS_URL } from "@/lib/api";
import type { TabletopPublic } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Button, FieldError } from "@/components/ui";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.1;

type Transform = { x: number; y: number; scale: number };

function VttViewContent({ tabletopId }: { tabletopId: string }) {
  const { token, user } = useAuth();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const centeredRef = useRef(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token).then(
      (tt) => {
        if (!ignore) {
          setTabletop(tt);
          setBackgroundUrl(tt.background_image_url);
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

  // Real-time: the DM's background swap reaches every connected member here.
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
        }
      } catch {
        // ignore malformed messages
      }
    };
    return () => ws.close();
  }, [token, tabletopId]);

  const iAmDm =
    !!user && !!tabletop && tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    if (centeredRef.current || !containerRef.current) return;
    const img = e.currentTarget;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = Math.min(
      rect.width / img.naturalWidth,
      rect.height / img.naturalHeight,
      1,
    );
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
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof ApiError ? err.message : "Falha ao enviar imagem");
    } finally {
      setUploading(false);
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
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={backgroundUrl}
            src={`${API_URL}${backgroundUrl}`}
            alt="Cena"
            draggable={false}
            onLoad={onImageLoad}
            className="pointer-events-none absolute left-0 top-0 max-w-none select-none"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "0 0",
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-muted">
            Nenhuma cena definida ainda.
          </div>
        )}
      </div>

      <Link
        href={`/tabletops/${tabletopId}`}
        className="absolute left-4 top-4 rounded-sm border border-border bg-surface/80 px-3 py-1.5 text-xs font-semibold text-text-muted backdrop-blur transition hover:text-text"
      >
        ← Sair do VTT
      </Link>

      {iAmDm && (
        <form
          onSubmit={onUpload}
          className="absolute bottom-4 left-4 flex w-56 flex-col gap-2 rounded-md border border-border-soft bg-surface/90 p-4 backdrop-blur"
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
