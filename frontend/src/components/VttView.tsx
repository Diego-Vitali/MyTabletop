"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { DoorOpen, History as HistoryIcon, Map as MapIcon, Shapes, StickyNote, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, API_URL, WS_URL } from "@/lib/api";
import type {
  FolderPublic,
  MapHistoryEntryPublic,
  MapNotePublic,
  ScenePublic,
  TabletopPublic,
  TokenPublic,
  TokenTemplatePublic,
} from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, ToolbarIconButton } from "@/components/ui";
import { DirectoryPanel } from "@/components/vtt/DirectoryPanel";

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.1;
const TOKEN_SIZE = 64;
const MIN_TOKEN_SIZE = 16;
const MAX_TOKEN_SIZE = 512;
const NOTE_SIZE = 24;

type Transform = { x: number; y: number; scale: number };
type PanelId = "members" | "history" | "scenes" | "tokens" | "notes";

function VttViewContent({ tabletopId }: { tabletopId: string }) {
  const { token, user } = useAuth();
  const [tabletop, setTabletop] = useState<TabletopPublic | null>(null);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [tokens, setTokens] = useState<TokenPublic[]>([]);
  const [scenes, setScenes] = useState<ScenePublic[]>([]);
  const [templates, setTemplates] = useState<TokenTemplatePublic[]>([]);
  const [sceneFolders, setSceneFolders] = useState<FolderPublic[]>([]);
  const [tokenFolders, setTokenFolders] = useState<FolderPublic[]>([]);
  const [notes, setNotes] = useState<MapNotePublic[]>([]);
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
  const resizeRef = useRef<{ id: string; centerX: number; centerY: number } | null>(null);
  const noteDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const centeredRef = useRef(false);

  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [addNoteMode, setAddNoteMode] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  const [sceneUploadError, setSceneUploadError] = useState<string | null>(null);
  const [sceneUploading, setSceneUploading] = useState(false);
  const [templateUploadError, setTemplateUploadError] = useState<string | null>(null);
  const [templateUploading, setTemplateUploading] = useState(false);

  const [history, setHistory] = useState<MapHistoryEntryPublic[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    Promise.all([
      api.get<TabletopPublic>(`/tabletops/${tabletopId}`, token),
      api.get<TokenPublic[]>(`/tabletops/${tabletopId}/vtt/tokens`, token),
      api.get<ScenePublic[]>(`/tabletops/${tabletopId}/vtt/scenes`, token),
      api.get<TokenTemplatePublic[]>(`/tabletops/${tabletopId}/vtt/token-templates`, token),
      api.get<FolderPublic[]>(`/tabletops/${tabletopId}/vtt/folders?kind=scene`, token),
      api.get<FolderPublic[]>(`/tabletops/${tabletopId}/vtt/folders?kind=token`, token),
      api.get<MapNotePublic[]>(`/tabletops/${tabletopId}/vtt/notes`, token),
    ]).then(
      ([tt, tk, sc, tpl, sf, tf, nt]) => {
        if (!ignore) {
          setTabletop(tt);
          setBackgroundUrl(tt.background_image_url);
          setTokens(tk);
          setScenes(sc);
          setTemplates(tpl);
          setSceneFolders(sf);
          setTokenFolders(tf);
          setNotes(nt);
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

  // Real-time: scene/token/folder/note changes from any member reach everyone else here.
  useEffect(() => {
    if (!token) return;
    const ws = new WebSocket(
      `${WS_URL}/ws/tabletops/${tabletopId}?token=${encodeURIComponent(token)}`,
    );
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "background_updated") {
          centeredRef.current = false;
          setBackgroundUrl(msg.background_image_url);
          setTokens([]);
          setNotes([]);
          setHistory(null);
          api.get<MapNotePublic[]>(`/tabletops/${tabletopId}/vtt/notes`, token).then(setNotes, () => {});
        } else if (msg.type === "token_added") {
          setTokens((prev) => (prev.some((t) => t.id === msg.token.id) ? prev : [...prev, msg.token]));
        } else if (msg.type === "token_moved") {
          setTokens((prev) =>
            prev.map((t) => (t.id === msg.token_id ? { ...t, x: msg.x, y: msg.y } : t)),
          );
        } else if (msg.type === "token_updated") {
          setTokens((prev) => prev.map((t) => (t.id === msg.token.id ? msg.token : t)));
        } else if (msg.type === "token_deleted") {
          setTokens((prev) => prev.filter((t) => t.id !== msg.token_id));
        } else if (msg.type === "scene_created") {
          setScenes((prev) => (prev.some((s) => s.id === msg.scene.id) ? prev : [...prev, msg.scene]));
        } else if (msg.type === "scene_updated") {
          setScenes((prev) => prev.map((s) => (s.id === msg.scene.id ? msg.scene : s)));
        } else if (msg.type === "scene_deleted") {
          setScenes((prev) => prev.filter((s) => s.id !== msg.scene_id));
        } else if (msg.type === "template_created") {
          setTemplates((prev) =>
            prev.some((t) => t.id === msg.template.id) ? prev : [...prev, msg.template],
          );
        } else if (msg.type === "template_updated") {
          setTemplates((prev) => prev.map((t) => (t.id === msg.template.id ? msg.template : t)));
        } else if (msg.type === "template_deleted") {
          setTemplates((prev) => prev.filter((t) => t.id !== msg.template_id));
        } else if (msg.type === "folder_created") {
          const f: FolderPublic = msg.folder;
          const add = (prev: FolderPublic[]) => (prev.some((x) => x.id === f.id) ? prev : [...prev, f]);
          if (f.kind === "scene") setSceneFolders(add);
          else setTokenFolders(add);
        } else if (msg.type === "folder_updated") {
          const f: FolderPublic = msg.folder;
          const upd = (prev: FolderPublic[]) => prev.map((x) => (x.id === f.id ? f : x));
          if (f.kind === "scene") setSceneFolders(upd);
          else setTokenFolders(upd);
        } else if (msg.type === "folder_deleted") {
          setSceneFolders((prev) => prev.filter((f) => f.id !== msg.folder_id));
          setTokenFolders((prev) => prev.filter((f) => f.id !== msg.folder_id));
          setScenes((prev) =>
            prev.map((s) => (s.folder_id === msg.folder_id ? { ...s, folder_id: null } : s)),
          );
          setTemplates((prev) =>
            prev.map((t) => (t.folder_id === msg.folder_id ? { ...t, folder_id: null } : t)),
          );
        } else if (msg.type === "note_added") {
          setNotes((prev) => (prev.some((n) => n.id === msg.note.id) ? prev : [...prev, msg.note]));
        } else if (msg.type === "note_updated") {
          setNotes((prev) => prev.map((n) => (n.id === msg.note.id ? msg.note : n)));
        } else if (msg.type === "note_deleted") {
          setNotes((prev) => prev.filter((n) => n.id !== msg.note_id));
        }
      } catch {
        // ignore malformed messages
      }
    };
    return () => {
      ws.close();
      if (wsRef.current === ws) wsRef.current = null;
    };
  }, [token, tabletopId]);

  const iAmDm =
    !!user && !!tabletop && tabletop.members.some((m) => m.user_id === user.id && m.role === "dm");

  const canMoveToken = (t: TokenPublic) => iAmDm || t.created_by === user?.id;

  // Keyboard shortcut: F flips the selected token horizontally.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!selectedTokenId || e.key.toLowerCase() !== "f") return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }
      const t = tokens.find((tok) => tok.id === selectedTokenId);
      if (!t || !canMoveToken(t)) return;
      api
        .patch<TokenPublic>(
          `/tabletops/${tabletopId}/vtt/tokens/${t.id}`,
          { flipped_x: !t.flipped_x },
          token,
        )
        .then((updated) => setTokens((prev) => prev.map((tok) => (tok.id === updated.id ? updated : tok))))
        .catch(() => {});
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTokenId, tokens, tabletopId, token, iAmDm, user]);

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

  const placeNote = async (x: number, y: number) => {
    const text = window.prompt("Texto da anotação:");
    if (!text || !text.trim()) return;
    try {
      const created = await api.post<MapNotePublic>(
        `/tabletops/${tabletopId}/vtt/notes`,
        { x, y, text: text.trim() },
        token,
      );
      setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, created]));
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (addNoteMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      setAddNoteMode(false);
      placeNote(x, y);
      return;
    }
    setOpenPanel(null);
    setSelectedTokenId(null);
    setOpenNoteId(null);
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
    setSelectedTokenId(t.id);
    tokenDragRef.current = { id: t.id, startX: e.clientX, startY: e.clientY, originX: t.x, originY: t.y };
  };

  const onTokenPointerMove = (e: React.PointerEvent) => {
    const drag = tokenDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    const dx = (e.clientX - drag.startX) / transform.scale;
    const dy = (e.clientY - drag.startY) / transform.scale;
    const nextX = drag.originX + dx;
    const nextY = drag.originY + dy;
    setTokens((prev) =>
      prev.map((t) => (t.id === drag.id ? { ...t, x: nextX, y: nextY } : t)),
    );
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "token_move_live", token_id: drag.id, x: nextX, y: nextY }));
    }
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

  const onResizeHandlePointerDown = (e: React.PointerEvent, t: TokenPublic) => {
    if (!canMoveToken(t)) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeRef.current = { id: t.id, centerX: t.x, centerY: t.y };
  };

  const onResizeHandlePointerMove = (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r || !containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left - transform.x) / transform.scale;
    const py = (e.clientY - rect.top - transform.y) / transform.scale;
    const dist = Math.hypot(px - r.centerX, py - r.centerY);
    const nextSize = Math.min(MAX_TOKEN_SIZE, Math.max(MIN_TOKEN_SIZE, dist * Math.SQRT2));
    setTokens((prev) => prev.map((t) => (t.id === r.id ? { ...t, size: nextSize } : t)));
  };

  const onResizeHandlePointerUp = async (e: React.PointerEvent) => {
    const r = resizeRef.current;
    if (!r) return;
    e.stopPropagation();
    resizeRef.current = null;
    const t = tokens.find((tok) => tok.id === r.id);
    if (!t) return;
    try {
      await api.patch<TokenPublic>(
        `/tabletops/${tabletopId}/vtt/tokens/${r.id}`,
        { size: t.size },
        token,
      );
    } catch {
      // best effort — a future WS message will correct any drift
    }
  };

  const onNotePointerDown = (e: React.PointerEvent, n: MapNotePublic) => {
    if (!iAmDm) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    noteDragRef.current = { id: n.id, startX: e.clientX, startY: e.clientY, originX: n.x, originY: n.y };
  };

  const onNotePointerMove = (e: React.PointerEvent) => {
    const drag = noteDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    const dx = (e.clientX - drag.startX) / transform.scale;
    const dy = (e.clientY - drag.startY) / transform.scale;
    setNotes((prev) =>
      prev.map((n) => (n.id === drag.id ? { ...n, x: drag.originX + dx, y: drag.originY + dy } : n)),
    );
  };

  const onNotePointerUp = async (e: React.PointerEvent) => {
    const drag = noteDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    noteDragRef.current = null;
    const moved = notes.find((n) => n.id === drag.id);
    if (!moved) return;
    try {
      await api.patch<MapNotePublic>(
        `/tabletops/${tabletopId}/vtt/notes/${drag.id}`,
        { x: moved.x, y: moved.y },
        token,
      );
    } catch {
      // best effort
    }
  };

  const saveNoteDraft = async (note: MapNotePublic) => {
    if (!noteDraft.trim()) return;
    try {
      const updated = await api.patch<MapNotePublic>(
        `/tabletops/${tabletopId}/vtt/notes/${note.id}`,
        { text: noteDraft.trim() },
        token,
      );
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setOpenNoteId(null);
    } catch {
      // ignore
    }
  };

  const deleteNote = async (note: MapNotePublic) => {
    if (!window.confirm("Apagar esta anotação?")) return;
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/notes/${note.id}`, token);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      setOpenNoteId(null);
    } catch {
      // ignore
    }
  };

  const deleteToken = async (t: TokenPublic) => {
    setTokens((prev) => prev.filter((tok) => tok.id !== t.id));
    if (selectedTokenId === t.id) setSelectedTokenId(null);
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, token);
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  const createFolder = async (kind: "scene" | "token", name: string) => {
    try {
      const created = await api.post<FolderPublic>(
        `/tabletops/${tabletopId}/vtt/folders`,
        { kind, name },
        token,
      );
      const addDeduped = (prev: FolderPublic[]) =>
        prev.some((f) => f.id === created.id) ? prev : [...prev, created];
      if (kind === "scene") setSceneFolders(addDeduped);
      else setTokenFolders(addDeduped);
    } catch {
      // ignore
    }
  };

  const deleteFolderHandler = async (folder: FolderPublic) => {
    if (!window.confirm(`Apagar a pasta "${folder.name}"? Os itens dentro dela ficam sem pasta.`)) return;
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/folders/${folder.id}`, token);
      if (folder.kind === "scene") setSceneFolders((prev) => prev.filter((f) => f.id !== folder.id));
      else setTokenFolders((prev) => prev.filter((f) => f.id !== folder.id));
      setScenes((prev) => prev.map((s) => (s.folder_id === folder.id ? { ...s, folder_id: null } : s)));
      setTemplates((prev) => prev.map((t) => (t.folder_id === folder.id ? { ...t, folder_id: null } : t)));
    } catch {
      // ignore
    }
  };

  const uploadScene = async ({
    name,
    folderId,
    file,
  }: {
    name: string;
    folderId: string | null;
    file: File;
  }) => {
    setSceneUploadError(null);
    setSceneUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (folderId) formData.append("folder_id", folderId);
      formData.append("image", file);
      const created = await api.upload<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes`,
        formData,
        token,
      );
      setScenes((prev) => (prev.some((s) => s.id === created.id) ? prev : [...prev, created]));
      if (created.is_active) {
        centeredRef.current = false;
        setBackgroundUrl(created.image_url);
        setTokens([]);
        setNotes([]);
      }
    } catch (err) {
      setSceneUploadError(err instanceof ApiError ? err.message : "Falha ao enviar cena");
    } finally {
      setSceneUploading(false);
    }
  };

  const activateScene = async (scene: ScenePublic) => {
    const hasDifferentActive = scenes.some((s) => s.is_active && s.id !== scene.id);
    if (
      hasDifferentActive &&
      !window.confirm(`Trocar para "${scene.name}"? O mapa atual e seus tokens vão para o histórico.`)
    ) {
      return;
    }
    try {
      const updated = await api.post<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${scene.id}/activate`,
        {},
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : { ...s, is_active: false })));
      centeredRef.current = false;
      setBackgroundUrl(updated.image_url);
      setTokens([]);
      setNotes([]);
      setHistory(null);
    } catch {
      // ignore
    }
  };

  const deleteScene = async (scene: ScenePublic) => {
    if (!window.confirm(`Apagar a cena "${scene.name}"?`)) return;
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/scenes/${scene.id}`, token);
      setScenes((prev) => prev.filter((s) => s.id !== scene.id));
      if (scene.is_active) {
        setBackgroundUrl(null);
        setTokens([]);
        setNotes([]);
      }
    } catch {
      // ignore
    }
  };

  const moveSceneToFolder = async (scene: ScenePublic, folderId: string | null) => {
    try {
      const updated = await api.patch<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${scene.id}`,
        { folder_id: folderId },
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // ignore
    }
  };

  const uploadTemplate = async ({
    name,
    folderId,
    file,
  }: {
    name: string;
    folderId: string | null;
    file: File;
  }) => {
    setTemplateUploadError(null);
    setTemplateUploading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      if (folderId) formData.append("folder_id", folderId);
      formData.append("image", file);
      const created = await api.upload<TokenTemplatePublic>(
        `/tabletops/${tabletopId}/vtt/token-templates`,
        formData,
        token,
      );
      setTemplates((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
    } catch (err) {
      setTemplateUploadError(err instanceof ApiError ? err.message : "Falha ao enviar token");
    } finally {
      setTemplateUploading(false);
    }
  };

  const deleteTemplate = async (template: TokenTemplatePublic) => {
    if (!window.confirm(`Apagar o token "${template.name}" da biblioteca?`)) return;
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/token-templates/${template.id}`, token);
      setTemplates((prev) => prev.filter((t) => t.id !== template.id));
    } catch {
      // ignore
    }
  };

  const moveTemplateToFolder = async (template: TokenTemplatePublic, folderId: string | null) => {
    try {
      const updated = await api.patch<TokenTemplatePublic>(
        `/tabletops/${tabletopId}/vtt/token-templates/${template.id}`,
        { folder_id: folderId },
        token,
      );
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      // ignore
    }
  };

  const placeTokenFromTemplate = async (template: TokenTemplatePublic) => {
    if (!backgroundUrl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - transform.x) / transform.scale;
    const centerY = (rect.height / 2 - transform.y) / transform.scale;
    try {
      const created = await api.post<TokenPublic>(
        `/tabletops/${tabletopId}/vtt/tokens/from-template/${template.id}`,
        { x: centerX, y: centerY },
        token,
      );
      setTokens((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
    } catch {
      // ignore
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

  const openNote = openNoteId ? notes.find((n) => n.id === openNoteId) ?? null : null;

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-bg">
      <div
        ref={containerRef}
        className={`relative h-full w-full touch-none active:cursor-grabbing ${
          addNoteMode ? "cursor-crosshair" : "cursor-grab"
        }`}
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
          {tokens.map((t) => {
            const size = t.size ?? TOKEN_SIZE;
            const selected = t.id === selectedTokenId;
            return (
              <div
                key={t.id}
                onPointerDown={(e) => onTokenPointerDown(e, t)}
                onPointerMove={onTokenPointerMove}
                onPointerUp={onTokenPointerUp}
                className="group absolute"
                style={{
                  left: t.x - size / 2,
                  top: t.y - size / 2,
                  width: size,
                  height: size,
                  touchAction: "none",
                  cursor: canMoveToken(t) ? "grab" : "default",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_URL}${t.image_url}`}
                  alt="Token"
                  draggable={false}
                  style={{ transform: t.flipped_x ? "scaleX(-1)" : undefined }}
                  className={`h-full w-full select-none rounded-full border-2 object-cover shadow-lg ${
                    selected ? "border-accent" : "border-border-soft"
                  }`}
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
                {selected && canMoveToken(t) && (
                  <div
                    onPointerDown={(e) => onResizeHandlePointerDown(e, t)}
                    onPointerMove={onResizeHandlePointerMove}
                    onPointerUp={onResizeHandlePointerUp}
                    className="absolute -bottom-1 -right-1 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-bg bg-accent"
                    style={{ touchAction: "none" }}
                    title="Arraste para redimensionar · F para flipar"
                  />
                )}
              </div>
            );
          })}
          {notes.map((n) => (
            <div
              key={n.id}
              className="absolute"
              style={{
                left: n.x - NOTE_SIZE / 2,
                top: n.y - NOTE_SIZE / 2,
                width: NOTE_SIZE,
                height: NOTE_SIZE,
                touchAction: "none",
                cursor: iAmDm ? "grab" : "pointer",
              }}
              onPointerDown={(e) => onNotePointerDown(e, n)}
              onPointerMove={onNotePointerMove}
              onPointerUp={onNotePointerUp}
            >
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => {
                  setOpenNoteId(n.id);
                  setNoteDraft(n.text);
                  setOpenPanel(null);
                }}
                className="flex h-full w-full items-center justify-center rounded-full border-2 border-bg bg-accent text-on-accent shadow-lg"
                title={n.text}
              >
                <StickyNote size={13} />
              </button>
            </div>
          ))}
        </div>
        {!backgroundUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-text-muted">
            Nenhuma cena definida ainda.
          </div>
        )}
        {addNoteMode && (
          <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-border-soft bg-surface/90 px-3 py-1.5 text-xs text-text-muted backdrop-blur">
            Clique no mapa para posicionar a anotação
          </div>
        )}
      </div>

      {/* Top-left toolbar: navigation + directories */}
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
            title="Cenas"
            active={openPanel === "scenes"}
            onClick={() => togglePanel("scenes")}
          >
            <MapIcon size={18} />
          </ToolbarIconButton>
        )}
        <ToolbarIconButton
          title="Tokens"
          active={openPanel === "tokens"}
          onClick={() => togglePanel("tokens")}
        >
          <Shapes size={18} />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Anotações"
          active={openPanel === "notes"}
          onClick={() => togglePanel("notes")}
        >
          <StickyNote size={18} />
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

      {openPanel === "scenes" && iAmDm && (
        <div className="absolute left-4 top-16">
          <DirectoryPanel
            title="Cenas"
            items={scenes}
            folders={sceneFolders}
            itemShape="square"
            canCreateFolder={iAmDm}
            canUpload={iAmDm}
            uploading={sceneUploading}
            uploadError={sceneUploadError}
            onCreateFolder={(name) => createFolder("scene", name)}
            onDeleteFolder={deleteFolderHandler}
            canManageFolder={() => iAmDm}
            onUploadNew={uploadScene}
            onMoveItemToFolder={moveSceneToFolder}
            canManageItem={() => iAmDm}
            onDeleteItem={deleteScene}
            isItemHighlighted={(s) => s.is_active}
            renderItemAction={(s) =>
              s.is_active ? (
                <Badge variant="accent">Ativa</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => activateScene(s)}
                  className="shrink-0 text-[10px] font-bold uppercase text-accent hover:text-accent-strong"
                >
                  Ativar
                </button>
              )
            }
          />
        </div>
      )}

      {openPanel === "tokens" && (
        <div className="absolute left-4 top-16">
          <DirectoryPanel
            title="Tokens"
            items={templates}
            folders={tokenFolders}
            itemShape="circle"
            canCreateFolder={true}
            canUpload={true}
            uploading={templateUploading}
            uploadError={templateUploadError}
            onCreateFolder={(name) => createFolder("token", name)}
            onDeleteFolder={deleteFolderHandler}
            canManageFolder={(f) => iAmDm || f.created_by === user?.id}
            onUploadNew={uploadTemplate}
            onMoveItemToFolder={moveTemplateToFolder}
            canManageItem={(t) => iAmDm || t.created_by === user?.id}
            onDeleteItem={deleteTemplate}
            renderItemAction={(t) => (
              <button
                type="button"
                onClick={() => placeTokenFromTemplate(t)}
                disabled={!backgroundUrl}
                title={backgroundUrl ? "Colocar no mapa" : "Defina uma cena antes"}
                className="shrink-0 text-[10px] font-bold uppercase text-accent hover:text-accent-strong disabled:opacity-40"
              >
                Colocar
              </button>
            )}
          />
        </div>
      )}

      {openPanel === "notes" && (
        <div className="absolute left-4 top-16 flex max-h-[70vh] w-72 flex-col gap-3 overflow-y-auto rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Anotações
          </span>
          {iAmDm && (
            <Button
              type="button"
              variant="secondary"
              disabled={!backgroundUrl}
              onClick={() => {
                setAddNoteMode(true);
                setOpenPanel(null);
              }}
              className="text-xs"
            >
              {backgroundUrl ? "Nova anotação" : "Defina uma cena antes"}
            </Button>
          )}
          <ul className="flex flex-col gap-1">
            {notes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    setOpenNoteId(n.id);
                    setNoteDraft(n.text);
                    setOpenPanel(null);
                  }}
                  className="w-full truncate rounded-sm px-1.5 py-1 text-left text-sm text-text-muted hover:bg-surface-2 hover:text-text"
                >
                  {n.text}
                </button>
              </li>
            ))}
            {notes.length === 0 && <p className="text-xs text-text-muted">Nenhuma anotação nesta cena.</p>}
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

      {openNote && (
        <div className="absolute bottom-4 left-1/2 flex w-80 -translate-x-1/2 flex-col gap-2 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Anotação
          </span>
          {iAmDm ? (
            <>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                className="rounded-sm border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="danger" className="text-xs" onClick={() => deleteNote(openNote)}>
                  Apagar
                </Button>
                <Button type="button" variant="ghost" className="text-xs" onClick={() => setOpenNoteId(null)}>
                  Cancelar
                </Button>
                <Button type="button" className="text-xs" onClick={() => saveNoteDraft(openNote)}>
                  Salvar
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-sm">{openNote.text}</p>
              <div className="flex justify-end">
                <Button type="button" variant="ghost" className="text-xs" onClick={() => setOpenNoteId(null)}>
                  Fechar
                </Button>
              </div>
            </>
          )}
        </div>
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
