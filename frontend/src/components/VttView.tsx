"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import {
  BrickWall,
  Circle as CircleIcon,
  CloudFog,
  DoorClosed,
  DoorOpen,
  Eraser,
  Flame,
  Grid3x3,
  History as HistoryIcon,
  Key,
  ListOrdered,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  Shapes,
  Skull,
  StickyNote,
  Square as SquareIcon,
  Swords,
  Trash2,
  Type as TypeIcon,
  Users,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, API_URL, WS_URL } from "@/lib/api";
import type {
  DrawingKind,
  DrawingPublic,
  EncounterPublic,
  FogShape,
  FogShapeKind,
  FolderPublic,
  GridConfig,
  InitiativePublic,
  MapHistoryEntryPublic,
  MapNotePublic,
  Point,
  ScenePublic,
  SizeCategory,
  TabletopPublic,
  TokenPublic,
  TokenTemplatePublic,
  WallPublic,
} from "@/lib/types";
import { DEFAULT_GRID, DEFAULT_TOKEN_SETTINGS, NOTE_ICON_CHOICES, SIZE_CATEGORY_LABELS } from "@/lib/types";
import { RequireAuth } from "@/components/RequireAuth";
import { Badge, Button, Input, Select, ToolbarIconButton } from "@/components/ui";
import { AssetDock } from "@/components/vtt/AssetDock";
import { DrawingLayer, type PendingDrawing } from "@/components/vtt/DrawingLayer";
import { DarknessLayer } from "@/components/vtt/DarknessLayer";
import { GridLayer, snapToGrid } from "@/components/vtt/GridLayer";
import { InitiativeTracker } from "@/components/vtt/InitiativeTracker";

const NOTE_ICON_COMPONENTS: Record<string, React.ComponentType<{ size?: number }>> = {
  StickyNote,
  Skull,
  Key,
  DoorClosed,
  Flame,
  Swords,
};

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.1;
const TOKEN_SIZE = 64;
const MIN_TOKEN_SIZE = 16;
const MAX_TOKEN_SIZE = 512;
const NOTE_SIZE = 24;
const SIZE_CATEGORY_MULTIPLIER: Record<SizeCategory, number> = {
  pequeno: 0.75,
  medio: 1,
  grande: 2,
  enorme: 3,
  descomunal: 4,
};

type Transform = { x: number; y: number; scale: number };
type PanelId =
  | "members"
  | "history"
  | "scenes"
  | "tokens"
  | "notes"
  | "grid"
  | "draw"
  | "fog"
  | "initiative"
  | "walls";
type FogTool = "reveal" | "hide" | null;
type RulerLine = { startX: number; startY: number; endX: number; endY: number };
type DrawTool = DrawingKind | "erase" | null;
type WallTool = "draw" | "erase" | null;
type UndoAction =
  | { kind: "moveToken"; tokenId: string; from: { x: number; y: number } }
  | { kind: "createToken"; tokenId: string }
  | { kind: "deleteToken"; snapshot: TokenPublic }
  | { kind: "createDrawing"; drawingId: string }
  | { kind: "deleteDrawing"; snapshot: DrawingPublic };

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
  const [drawings, setDrawings] = useState<DrawingPublic[]>([]);
  const [initiative, setInitiative] = useState<InitiativePublic | null>(null);
  const [encounters, setEncounters] = useState<EncounterPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [bgSize, setBgSize] = useState<{ width: number; height: number } | null>(null);
  const [ruler, setRuler] = useState<RulerLine | null>(null);
  const rulerRef = useRef<{ startX: number; startY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const tokenDragRef = useRef<{
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  const resizeRef = useRef<{ id: string; centerX: number; centerY: number } | null>(null);
  const rotateRef = useRef<{ id: string; centerX: number; centerY: number } | null>(null);
  const noteDragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const centeredRef = useRef(false);

  const [openPanel, setOpenPanel] = useState<PanelId | null>(null);
  // The token/scene dock is a permanent bottom bar (not a toggled panel like
  // the others) — this only tracks which of its two tabs is showing.
  const [assetTab, setAssetTab] = useState<"tokens" | "scenes">("tokens");
  const [selectedTokenIds, setSelectedTokenIds] = useState<Set<string>>(new Set());
  const [selectedWallIds, setSelectedWallIds] = useState<Set<string>>(new Set());
  const [addNoteMode, setAddNoteMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const marqueeRef = useRef<{ x1: number; y1: number } | null>(null);
  const [pendingNotePos, setPendingNotePos] = useState<{ x: number; y: number } | null>(null);
  const [pendingNoteText, setPendingNoteText] = useState("");
  const [pendingNoteIcon, setPendingNoteIcon] = useState("StickyNote");
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteDraftIcon, setNoteDraftIcon] = useState("StickyNote");

  const [drawTool, setDrawTool] = useState<DrawTool>(null);
  const [drawColor, setDrawColor] = useState("#c1454e");
  const [drawWidth, setDrawWidth] = useState(3);
  const [pendingDrawing, setPendingDrawing] = useState<PendingDrawing | null>(null);
  const drawingPtsRef = useRef<Point[] | null>(null);

  const [fogTool, setFogTool] = useState<FogTool>(null);
  const [fogShape, setFogShape] = useState<FogShapeKind>("brush");
  const [fogRadius, setFogRadius] = useState(50);
  const [pendingFog, setPendingFog] = useState<
    { kind: FogShapeKind; points: Point[]; radius: number; isErasing: boolean } | null
  >(null);
  const fogPtsRef = useRef<Point[] | null>(null);
  const fogStrokeCounterRef = useRef(0);
  const undoStackRef = useRef<UndoAction[]>([]);

  const [walls, setWalls] = useState<WallPublic[]>([]);
  const [wallTool, setWallTool] = useState<WallTool>(null);
  const [wallShape, setWallShape] = useState<"line" | "rect" | "circle">("line");
  const [pendingWall, setPendingWall] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(
    null,
  );
  const wallStartRef = useRef<{ x: number; y: number; shape: "line" | "rect" | "circle" } | null>(null);

  const [sceneUploadError, setSceneUploadError] = useState<string | null>(null);
  const [sceneUploading, setSceneUploading] = useState(false);
  const [templateUploadError, setTemplateUploadError] = useState<string | null>(null);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [showEncounterForm, setShowEncounterForm] = useState(false);
  const [encounterName, setEncounterName] = useState("");
  const [encounterTemplateIds, setEncounterTemplateIds] = useState<Set<string>>(new Set());

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
      api.get<DrawingPublic[]>(`/tabletops/${tabletopId}/vtt/drawings`, token),
      api.get<InitiativePublic>(`/tabletops/${tabletopId}/vtt/initiative`, token),
      api.get<EncounterPublic[]>(`/tabletops/${tabletopId}/vtt/encounters`, token),
      api.get<WallPublic[]>(`/tabletops/${tabletopId}/vtt/walls`, token),
    ]).then(
      ([tt, tk, sc, tpl, sf, tf, nt, dr, ini, enc, wl]) => {
        if (!ignore) {
          setTabletop(tt);
          setBackgroundUrl(tt.background_image_url);
          setTokens(tk);
          setScenes(sc);
          setTemplates(tpl);
          setSceneFolders(sf);
          setTokenFolders(tf);
          setNotes(nt);
          setDrawings(dr);
          setInitiative(ini);
          setEncounters(enc);
          setWalls(wl);
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
          setDrawings([]);
          setWalls([]);
          setHistory(null);
          api.get<MapNotePublic[]>(`/tabletops/${tabletopId}/vtt/notes`, token).then(setNotes, () => {});
          api.get<DrawingPublic[]>(`/tabletops/${tabletopId}/vtt/drawings`, token).then(setDrawings, () => {});
          api.get<WallPublic[]>(`/tabletops/${tabletopId}/vtt/walls`, token).then(setWalls, () => {});
        } else if (msg.type === "token_added") {
          setTokens((prev) => (prev.some((t) => t.id === msg.token.id) ? prev : [...prev, msg.token]));
        } else if (msg.type === "token_entered_view") {
          setTokens((prev) =>
            prev.some((t) => t.id === msg.token.id)
              ? prev.map((t) => (t.id === msg.token.id ? msg.token : t))
              : [...prev, msg.token],
          );
        } else if (msg.type === "token_left_view") {
          setTokens((prev) => prev.filter((t) => t.id !== msg.token_id));
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
        } else if (msg.type === "fog_updated") {
          setScenes((prev) => prev.map((s) => (s.id === msg.scene_id ? { ...s, fog: msg.fog } : s)));
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
        } else if (msg.type === "drawing_added") {
          setDrawings((prev) => (prev.some((d) => d.id === msg.drawing.id) ? prev : [...prev, msg.drawing]));
        } else if (msg.type === "drawing_deleted") {
          setDrawings((prev) => prev.filter((d) => d.id !== msg.drawing_id));
        } else if (msg.type === "wall_added") {
          setWalls((prev) => (prev.some((w) => w.id === msg.wall.id) ? prev : [...prev, msg.wall]));
        } else if (msg.type === "wall_deleted") {
          setWalls((prev) => prev.filter((w) => w.id !== msg.wall_id));
        } else if (msg.type === "initiative_updated") {
          setInitiative(msg.initiative);
        } else if (msg.type === "encounter_created") {
          setEncounters((prev) =>
            prev.some((e) => e.id === msg.encounter.id) ? prev : [...prev, msg.encounter],
          );
        } else if (msg.type === "encounter_deleted") {
          setEncounters((prev) => prev.filter((e) => e.id !== msg.encounter_id));
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

  /** Dragging a token's position is open to any member by default — the DM
   * opts specific tokens out via `restricted_to_dm` (blocks players only)
   * or `locked` (blocks everyone, DM included). See require_token_mover in
   * the backend for the matching server-side check. */
  const canMoveToken = (t: TokenPublic) => !t.locked && (iAmDm || !t.restricted_to_dm);
  /** Editing anything other than position (rename, HP, flip, lock flags,
   * delete, duplicate...) stays restricted to the DM or the token's own
   * creator — see require_token_editor in the backend. */
  const canEditToken = (t: TokenPublic) => iAmDm || t.created_by === user?.id;

  const activeScene = scenes.find((s) => s.is_active) ?? null;
  const grid = activeScene?.grid ?? DEFAULT_GRID;
  const tokenSettings = activeScene?.token_settings ?? DEFAULT_TOKEN_SETTINGS;
  const fog = activeScene?.fog ?? [];
  const dynamicLightingOn = activeScene?.dynamic_lighting_enabled ?? false;
  // Any token with "emits light" on is a vision source, regardless of who
  // placed it on the map — see vision_service.py's _compute_visible for the
  // matching server-side fix (gating on `created_by` silently dropped
  // tokens the DM placed on a player's behalf, which is the common case).
  const lights = tokens
    .filter((t) => t.emits_light)
    .map((t) => ({ x: t.x, y: t.y, radius: t.light_radius ?? 0 }));
  const selectedToken =
    selectedTokenIds.size === 1 ? tokens.find((t) => selectedTokenIds.has(t.id)) ?? null : null;
  const selectedTokensEditable =
    selectedTokenIds.size > 1 ? tokens.filter((t) => selectedTokenIds.has(t.id) && canEditToken(t)) : [];
  const instanceLabel = (t: TokenPublic): string | null => {
    if (!tokenSettings.show_instance_badges || !t.template_id) return null;
    const siblings = tokens.filter((tok) => tok.template_id === t.template_id);
    if (siblings.length < 2) return null;
    return String(siblings.findIndex((tok) => tok.id === t.id) + 1);
  };
  const pxToDistanceLabel = (px: number) => {
    if (!grid.size) return `${Math.round(px)}px`;
    const units = px / grid.size;
    return `${units.toFixed(1)} × ${grid.unit_label}`;
  };

  const pushUndo = (action: UndoAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > 25) undoStackRef.current.shift();
  };

  // Undo is deliberately scoped to token create/move/delete and drawing
  // create/delete — the most common "oops" actions during a session.
  // Restoring a deleted raw-uploaded token isn't supported (its image
  // file isn't kept client-side); only template-sourced tokens can be
  // recreated via the from-template endpoint.
  const undo = async () => {
    const action = undoStackRef.current.pop();
    if (!action) return;
    if (action.kind === "moveToken") {
      try {
        const updated = await api.patch<TokenPublic>(
          `/tabletops/${tabletopId}/vtt/tokens/${action.tokenId}`,
          { x: action.from.x, y: action.from.y },
          token,
        );
        setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } catch {
        // ignore
      }
    } else if (action.kind === "createToken") {
      try {
        await api.del(`/tabletops/${tabletopId}/vtt/tokens/${action.tokenId}`, token);
        setTokens((prev) => prev.filter((t) => t.id !== action.tokenId));
      } catch {
        // ignore
      }
    } else if (action.kind === "deleteToken") {
      if (!action.snapshot.template_id) return;
      try {
        const created = await api.post<TokenPublic>(
          `/tabletops/${tabletopId}/vtt/tokens/from-template/${action.snapshot.template_id}`,
          { x: action.snapshot.x, y: action.snapshot.y },
          token,
        );
        const restored = await api.patch<TokenPublic>(
          `/tabletops/${tabletopId}/vtt/tokens/${created.id}`,
          {
            rotation: action.snapshot.rotation,
            flipped_x: action.snapshot.flipped_x,
            size: action.snapshot.size,
            name: action.snapshot.name,
            hp_current: action.snapshot.hp_current,
            hp_max: action.snapshot.hp_max,
            size_category: action.snapshot.size_category,
            emits_light: action.snapshot.emits_light,
            light_radius: action.snapshot.light_radius,
          },
          token,
        );
        setTokens((prev) => [...prev, restored]);
      } catch {
        // ignore
      }
    } else if (action.kind === "createDrawing") {
      try {
        await api.del(`/tabletops/${tabletopId}/vtt/drawings/${action.drawingId}`, token);
        setDrawings((prev) => prev.filter((d) => d.id !== action.drawingId));
      } catch {
        // ignore
      }
    } else if (action.kind === "deleteDrawing") {
      try {
        const created = await api.post<DrawingPublic>(
          `/tabletops/${tabletopId}/vtt/drawings`,
          {
            kind: action.snapshot.kind,
            points: action.snapshot.points,
            color: action.snapshot.color,
            stroke_width: action.snapshot.stroke_width,
            text: action.snapshot.text,
          },
          token,
        );
        setDrawings((prev) => [...prev, created]);
      } catch {
        // ignore
      }
    }
  };

  const createWall = async (x1: number, y1: number, x2: number, y2: number) => {
    try {
      const created = await api.post<WallPublic>(
        `/tabletops/${tabletopId}/vtt/walls`,
        { x1, y1, x2, y2 },
        token,
      );
      setWalls((prev) => (prev.some((w) => w.id === created.id) ? prev : [...prev, created]));
    } catch {
      // ignore
    }
  };

  const WALL_CIRCLE_SEGMENTS = 24;

  const createWallShape = async (shape: "line" | "rect" | "circle", start: Point, end: Point) => {
    if (shape === "line") {
      await createWall(start.x, start.y, end.x, end.y);
      return;
    }
    if (shape === "rect") {
      const x1 = Math.min(start.x, end.x);
      const y1 = Math.min(start.y, end.y);
      const x2 = Math.max(start.x, end.x);
      const y2 = Math.max(start.y, end.y);
      const corners: Point[] = [
        { x: x1, y: y1 },
        { x: x2, y: y1 },
        { x: x2, y: y2 },
        { x: x1, y: y2 },
      ];
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        await createWall(a.x, a.y, b.x, b.y);
      }
      return;
    }
    // circle: start is the center, end is a point on the rim.
    const radius = Math.hypot(end.x - start.x, end.y - start.y);
    const pts: Point[] = Array.from({ length: WALL_CIRCLE_SEGMENTS }, (_, i) => {
      const angle = (i / WALL_CIRCLE_SEGMENTS) * Math.PI * 2;
      return { x: start.x + radius * Math.cos(angle), y: start.y + radius * Math.sin(angle) };
    });
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      await createWall(a.x, a.y, b.x, b.y);
    }
  };

  const deleteWall = async (w: WallPublic) => {
    setWalls((prev) => prev.filter((wl) => wl.id !== w.id));
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/walls/${w.id}`, token);
    } catch {
      // ignore
    }
  };

  // Holding M is the universal "pan" override (see onPointerDown) — tracked
  // via plain window listeners into a ref, not state, since it's read only
  // at pointer-event time and shouldn't trigger renders on every keystroke.
  useEffect(() => {
    const isTypingTarget = () => {
      const active = document.activeElement as HTMLElement | null;
      return !!active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m" && !isTypingTarget()) panKeyRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "m") panKeyRef.current = false;
    };
    const onBlur = () => {
      panKeyRef.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // Keyboard shortcuts for the current token selection: F flip, Delete/Backspace
  // remove, Escape clear, Ctrl/Cmd+D duplicate.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "Escape" && (selectedTokenIds.size > 0 || selectedWallIds.size > 0)) {
        setSelectedTokenIds(new Set());
        setSelectedWallIds(new Set());
        return;
      }
      if (selectedWallIds.size > 0 && iAmDm && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        for (const w of walls) {
          if (selectedWallIds.has(w.id)) deleteWall(w);
        }
        setSelectedWallIds(new Set());
        return;
      }
      if (selectedTokenIds.size === 0) return;
      const selectedAll = tokens.filter((t) => selectedTokenIds.has(t.id));
      // Flip/delete/duplicate are property edits (creator or DM only);
      // nudging is just a position move (open to anyone, same as dragging).
      const editSelected = selectedAll.filter(canEditToken);
      const moveSelected = selectedAll.filter(canMoveToken);
      if (editSelected.length === 0 && moveSelected.length === 0) return;

      const NUDGE_KEYS: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };

      if (e.key.toLowerCase() === "f") {
        for (const t of selected) {
          api
            .patch<TokenPublic>(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, { flipped_x: !t.flipped_x }, token)
            .then((updated) => setTokens((prev) => prev.map((tok) => (tok.id === updated.id ? updated : tok))))
            .catch(() => {});
        }
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const ids = new Set(selected.map((t) => t.id));
        setTokens((prev) => prev.filter((t) => !ids.has(t.id)));
        setSelectedTokenIds(new Set());
        for (const t of selected) {
          pushUndo({ kind: "deleteToken", snapshot: t });
          api.del(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, token).catch(() => {});
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        for (const t of selected) {
          api
            .post<TokenPublic>(`/tabletops/${tabletopId}/vtt/tokens/${t.id}/duplicate`, {}, token)
            .then((created) => {
              setTokens((prev) => (prev.some((tok) => tok.id === created.id) ? prev : [...prev, created]));
              pushUndo({ kind: "createToken", tokenId: created.id });
            })
            .catch(() => {});
        }
      } else if (e.key in NUDGE_KEYS) {
        e.preventDefault();
        const [dx, dy] = NUDGE_KEYS[e.key];
        const step = e.shiftKey && grid.enabled ? grid.size : 1;
        for (const t of selected) {
          const nextX = t.x + dx * step;
          const nextY = t.y + dy * step;
          setTokens((prev) => prev.map((tok) => (tok.id === t.id ? { ...tok, x: nextX, y: nextY } : tok)));
          api
            .patch<TokenPublic>(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, { x: nextX, y: nextY }, token)
            .catch(() => {});
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTokenIds, selectedWallIds, tokens, walls, tabletopId, token, iAmDm, user]);

  /** Sets the open panel and, if we're leaving fog/draw/walls, disarms that
   * panel's drawing tool too — otherwise switching to, say, Grade while
   * "Desenhar parede" was active left wall-drawing silently armed on the
   * canvas, with no visible panel left to show it or turn it off. Replaces
   * every direct `setOpenPanel` call in this component so that invariant
   * always holds (a plain useEffect can't do this — see the project's
   * no-sync-setState-in-effect lint rule in CLAUDE.md). */
  const setPanel = (next: PanelId | null) => {
    setOpenPanel(next);
    setSelectMode(false);
    if (next !== "fog") {
      setFogTool(null);
      setPendingFog(null);
      fogPtsRef.current = null;
    }
    if (next !== "draw") {
      setDrawTool(null);
      setPendingDrawing(null);
      drawingPtsRef.current = null;
    }
    if (next !== "walls") {
      setWallTool(null);
      setPendingWall(null);
      wallStartRef.current = null;
    }
  };

  const togglePanel = (panel: PanelId) => {
    setPanel(openPanel === panel ? null : panel);
    if (panel === "history" && history === null) {
      setHistoryLoading(true);
      api
        .get<MapHistoryEntryPublic[]>(`/tabletops/${tabletopId}/vtt/history`, token)
        .then(setHistory, () => setHistory([]))
        .finally(() => setHistoryLoading(false));
    }
  };

  const toggleSelectMode = () => {
    const next = !selectMode;
    if (next) setPanel(null);
    setSelectMode(next);
  };

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setBgSize({ width: img.naturalWidth, height: img.naturalHeight });
    if (centeredRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight, 1);
    setTransform({
      x: (rect.width - img.naturalWidth * scale) / 2,
      y: (rect.height - img.naturalHeight * scale) / 2,
      scale,
    });
    centeredRef.current = true;
  };

  const updateGrid = async (patch: Partial<GridConfig>) => {
    if (!activeScene) return;
    const nextGrid: GridConfig = { ...activeScene.grid, ...patch };
    try {
      const updated = await api.patch<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${activeScene.id}`,
        { grid: nextGrid },
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // ignore
    }
  };

  const toggleDynamicLighting = async (enabled: boolean) => {
    if (!activeScene) return;
    try {
      const updated = await api.patch<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${activeScene.id}`,
        { dynamic_lighting_enabled: enabled },
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // ignore
    }
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

  const addInitiativeEntry = async (data: {
    token_id: string | null;
    label: string;
    value: number;
    hp_current: number | null;
    hp_max: number | null;
  }) => {
    try {
      const updated = await api.post<InitiativePublic>(
        `/tabletops/${tabletopId}/vtt/initiative/entries`,
        data,
        token,
      );
      setInitiative(updated);
    } catch {
      // ignore
    }
  };

  const removeInitiativeEntry = async (entryId: string) => {
    try {
      const updated = await api.del<InitiativePublic>(
        `/tabletops/${tabletopId}/vtt/initiative/entries/${entryId}`,
        token,
      );
      setInitiative(updated);
    } catch {
      // ignore
    }
  };

  const postInitiativeAction = async (action: "start" | "next" | "previous" | "end") => {
    try {
      const updated = await api.post<InitiativePublic>(
        `/tabletops/${tabletopId}/vtt/initiative/${action}`,
        {},
        token,
      );
      setInitiative(updated);
    } catch {
      // ignore
    }
  };

  const createDrawing = async (kind: DrawingKind, points: Point[]) => {
    try {
      const created = await api.post<DrawingPublic>(
        `/tabletops/${tabletopId}/vtt/drawings`,
        { kind, points, color: drawColor, stroke_width: drawWidth },
        token,
      );
      setDrawings((prev) => (prev.some((d) => d.id === created.id) ? prev : [...prev, created]));
      pushUndo({ kind: "createDrawing", drawingId: created.id });
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  const createTextDrawing = async (x: number, y: number) => {
    const text = window.prompt("Texto:");
    if (!text || !text.trim()) return;
    try {
      const created = await api.post<DrawingPublic>(
        `/tabletops/${tabletopId}/vtt/drawings`,
        { kind: "text", points: [{ x, y }], color: drawColor, stroke_width: drawWidth, text: text.trim() },
        token,
      );
      setDrawings((prev) => (prev.some((d) => d.id === created.id) ? prev : [...prev, created]));
      pushUndo({ kind: "createDrawing", drawingId: created.id });
    } catch {
      // ignore
    }
  };

  const deleteDrawing = async (d: DrawingPublic) => {
    setDrawings((prev) => prev.filter((dr) => dr.id !== d.id));
    pushUndo({ kind: "deleteDrawing", snapshot: d });
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/drawings/${d.id}`, token);
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  /** Turns the raw [first, current] drag points into what gets stored, per
   * fog shape: "rect" keeps both corners, "circle" keeps only the center
   * plus a radius derived from the drag distance, "brush" keeps the whole
   * accumulated polyline as-is. */
  const buildFogShapePayload = (kind: FogShapeKind, pts: Point[]): { points: Point[]; radius: number } => {
    if (kind === "circle" && pts.length >= 2) {
      return { points: [pts[0]], radius: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) };
    }
    return { points: pts, radius: fogRadius };
  };

  const commitFogStroke = async (kind: FogShapeKind, pts: Point[], isErasing: boolean) => {
    if (!activeScene || pts.length < 1) return;
    const { points, radius } = buildFogShapePayload(kind, pts);
    fogStrokeCounterRef.current += 1;
    const stroke: FogShape = {
      id: `fog_${user?.id ?? "anon"}_${fogStrokeCounterRef.current}`,
      kind,
      points,
      radius,
      is_erasing: isErasing,
    };
    const nextFog = [...activeScene.fog, stroke];
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? { ...s, fog: nextFog } : s)));
    try {
      const updated = await api.patch<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${activeScene.id}/fog`,
        { fog: nextFog },
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  const clearFog = async () => {
    if (!activeScene || !window.confirm("Limpar toda a névoa desta cena?")) return;
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? { ...s, fog: [] } : s)));
    try {
      const updated = await api.patch<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${activeScene.id}/fog`,
        { fog: [] },
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // ignore
    }
  };

  const deleteFogShape = async (shapeId: string) => {
    if (!activeScene) return;
    const nextFog = activeScene.fog.filter((f) => f.id !== shapeId);
    setScenes((prev) => prev.map((s) => (s.id === activeScene.id ? { ...s, fog: nextFog } : s)));
    try {
      const updated = await api.patch<ScenePublic>(
        `/tabletops/${tabletopId}/vtt/scenes/${activeScene.id}/fog`,
        { fog: nextFog },
        token,
      );
      setScenes((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Holding M is a universal "pan" override: drag the camera no matter
    // which tool (fog, walls, drawing, ruler...) is currently armed,
    // without having to deselect that tool first.
    if (panKeyRef.current) {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: transform.x,
        originY: transform.y,
      };
      return;
    }
    if (wallTool === "draw" && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      e.currentTarget.setPointerCapture(e.pointerId);
      wallStartRef.current = { x, y, shape: wallShape };
      setPendingWall({ x1: x, y1: y, x2: x, y2: y });
      return;
    }
    if (fogTool && fogTool !== "erase" && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      e.currentTarget.setPointerCapture(e.pointerId);
      fogPtsRef.current = [{ x, y }];
      setPendingFog({ kind: fogShape, points: [{ x, y }], radius: fogRadius, isErasing: fogTool === "reveal" });
      return;
    }
    if (drawTool && drawTool !== "erase" && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      if (drawTool === "text") {
        createTextDrawing(x, y);
        return;
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      drawingPtsRef.current = [{ x, y }];
      setPendingDrawing({ kind: drawTool, points: [{ x, y }], color: drawColor, strokeWidth: drawWidth });
      return;
    }
    if (addNoteMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      setAddNoteMode(false);
      setPendingNoteText("");
      setPendingNoteIcon("StickyNote");
      setPendingNotePos({ x, y });
      return;
    }
    if (selectMode && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      e.currentTarget.setPointerCapture(e.pointerId);
      marqueeRef.current = { x1: x, y1: y };
      setMarquee({ x1: x, y1: y, x2: x, y2: y });
      return;
    }
    if (e.shiftKey && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      e.currentTarget.setPointerCapture(e.pointerId);
      rulerRef.current = { startX: x, startY: y };
      setRuler({ startX: x, startY: y, endX: x, endY: y });
      return;
    }
    setOpenPanel(null);
    setSelectedTokenIds(new Set());
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
    if (wallStartRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      setPendingWall({ x1: wallStartRef.current.x, y1: wallStartRef.current.y, x2: x, y2: y });
      return;
    }
    if (fogPtsRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      if (fogShape === "brush") {
        fogPtsRef.current.push({ x, y });
      } else {
        fogPtsRef.current = [fogPtsRef.current[0], { x, y }];
      }
      const { points, radius } = buildFogShapePayload(fogShape, fogPtsRef.current);
      setPendingFog({ kind: fogShape, points, radius, isErasing: fogTool === "reveal" });
      return;
    }
    if (drawingPtsRef.current && containerRef.current && drawTool && drawTool !== "erase" && drawTool !== "text") {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      if (drawTool === "freehand") {
        drawingPtsRef.current.push({ x, y });
      } else {
        drawingPtsRef.current = [drawingPtsRef.current[0], { x, y }];
      }
      setPendingDrawing({ kind: drawTool, points: [...drawingPtsRef.current], color: drawColor, strokeWidth: drawWidth });
      return;
    }
    if (rulerRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      setRuler({ startX: rulerRef.current.startX, startY: rulerRef.current.startY, endX: x, endY: y });
      return;
    }
    if (marqueeRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      setMarquee({ x1: marqueeRef.current.x1, y1: marqueeRef.current.y1, x2: x, y2: y });
      return;
    }
    if (!dragRef.current) return;
    const { startX, startY, originX, originY } = dragRef.current;
    setTransform((prev) => ({
      ...prev,
      x: originX + (e.clientX - startX),
      y: originY + (e.clientY - startY),
    }));
  };

  const onPointerUp = () => {
    if (wallStartRef.current) {
      const start = wallStartRef.current;
      wallStartRef.current = null;
      const end = pendingWall ? { x: pendingWall.x2, y: pendingWall.y2 } : start;
      setPendingWall(null);
      if (Math.hypot(end.x - start.x, end.y - start.y) > 2) {
        createWallShape(start.shape, { x: start.x, y: start.y }, end);
      }
      return;
    }
    if (fogPtsRef.current) {
      const pts = fogPtsRef.current;
      const isErasing = fogTool === "reveal";
      const kind = fogShape;
      fogPtsRef.current = null;
      setPendingFog(null);
      commitFogStroke(kind, pts, isErasing);
      return;
    }
    if (drawingPtsRef.current) {
      const pts = drawingPtsRef.current;
      const kind = drawTool as DrawingKind;
      drawingPtsRef.current = null;
      setPendingDrawing(null);
      if (pts.length >= 2) createDrawing(kind, pts);
      return;
    }
    if (marqueeRef.current) {
      const start = marqueeRef.current;
      marqueeRef.current = null;
      const rect = marquee ?? { x1: start.x1, y1: start.y1, x2: start.x1, y2: start.y1 };
      setMarquee(null);
      const left = Math.min(rect.x1, rect.x2);
      const right = Math.max(rect.x1, rect.x2);
      const top = Math.min(rect.y1, rect.y2);
      const bottom = Math.max(rect.y1, rect.y2);
      const inside = tokens.filter((t) => t.x >= left && t.x <= right && t.y >= top && t.y <= bottom);
      setSelectedTokenIds(new Set(inside.map((t) => t.id)));
      if (iAmDm) {
        const wallsInside = walls.filter(
          (w) =>
            w.x1 >= left && w.x1 <= right && w.y1 >= top && w.y1 <= bottom &&
            w.x2 >= left && w.x2 <= right && w.y2 >= top && w.y2 <= bottom,
        );
        setSelectedWallIds(new Set(wallsInside.map((w) => w.id)));
      }
      return;
    }
    dragRef.current = null;
    if (rulerRef.current) {
      rulerRef.current = null;
      setRuler(null);
    }
  };

  const onTokenPointerDown = (e: React.PointerEvent, t: TokenPublic) => {
    // A locked token is still selectable by whoever can edit it (so a DM
    // can open its panel and uncheck "Travar token") — it just never starts
    // a drag. Someone who can neither move nor edit it gets no interaction
    // at all.
    const movable = canMoveToken(t);
    if (!movable && !canEditToken(t)) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    if (e.shiftKey) {
      const next = new Set(selectedTokenIds);
      if (next.has(t.id)) next.delete(t.id);
      else next.add(t.id);
      setSelectedTokenIds(next);
      return;
    }
    const ids = selectedTokenIds.has(t.id) && selectedTokenIds.size > 1 ? Array.from(selectedTokenIds) : [t.id];
    setSelectedTokenIds(new Set(ids));
    const origins = new Map<string, { x: number; y: number }>();
    for (const id of ids) {
      const tok = tokens.find((tk) => tk.id === id);
      if (tok && canMoveToken(tok)) origins.set(id, { x: tok.x, y: tok.y });
    }
    tokenDragRef.current = { startX: e.clientX, startY: e.clientY, origins };
  };

  const onTokenPointerMove = (e: React.PointerEvent) => {
    const drag = tokenDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    const dx = (e.clientX - drag.startX) / transform.scale;
    const dy = (e.clientY - drag.startY) / transform.scale;
    setTokens((prev) =>
      prev.map((t) => {
        const origin = drag.origins.get(t.id);
        if (!origin) return t;
        return { ...t, x: origin.x + dx, y: origin.y + dy };
      }),
    );
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      for (const [id, origin] of drag.origins) {
        wsRef.current.send(
          JSON.stringify({ type: "token_move_live", token_id: id, x: origin.x + dx, y: origin.y + dy }),
        );
      }
    }
  };

  const onTokenPointerUp = async (e: React.PointerEvent) => {
    const drag = tokenDragRef.current;
    if (!drag) return;
    e.stopPropagation();
    tokenDragRef.current = null;
    const ids = Array.from(drag.origins.keys());
    const snapped = ids
      .map((id) => tokens.find((t) => t.id === id))
      .filter((t): t is TokenPublic => !!t)
      .map((t) => ({ id: t.id, ...snapToGrid(t.x, t.y, grid) }));
    setTokens((prev) =>
      prev.map((t) => {
        const s = snapped.find((sp) => sp.id === t.id);
        return s ? { ...t, x: s.x, y: s.y } : t;
      }),
    );
    for (const s of snapped) {
      const origin = drag.origins.get(s.id);
      if (origin && (origin.x !== s.x || origin.y !== s.y)) {
        pushUndo({ kind: "moveToken", tokenId: s.id, from: origin });
      }
      try {
        await api.patch<TokenPublic>(`/tabletops/${tabletopId}/vtt/tokens/${s.id}`, { x: s.x, y: s.y }, token);
      } catch {
        // best effort — a future WS message will correct any drift
      }
    }
  };

  const onResizeHandlePointerDown = (e: React.PointerEvent, t: TokenPublic) => {
    if (!canEditToken(t)) return;
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

  const onRotateHandlePointerDown = (e: React.PointerEvent, t: TokenPublic) => {
    if (!canEditToken(t)) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    rotateRef.current = { id: t.id, centerX: t.x, centerY: t.y };
  };

  const onRotateHandlePointerMove = (e: React.PointerEvent) => {
    const r = rotateRef.current;
    if (!r || !containerRef.current) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left - transform.x) / transform.scale;
    const py = (e.clientY - rect.top - transform.y) / transform.scale;
    const angle = (Math.atan2(py - r.centerY, px - r.centerX) * 180) / Math.PI + 90;
    setTokens((prev) => prev.map((t) => (t.id === r.id ? { ...t, rotation: angle } : t)));
  };

  const onRotateHandlePointerUp = async (e: React.PointerEvent) => {
    const r = rotateRef.current;
    if (!r) return;
    e.stopPropagation();
    rotateRef.current = null;
    const t = tokens.find((tok) => tok.id === r.id);
    if (!t) return;
    try {
      await api.patch<TokenPublic>(`/tabletops/${tabletopId}/vtt/tokens/${r.id}`, { rotation: t.rotation }, token);
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
        { text: noteDraft.trim(), icon: noteDraftIcon },
        token,
      );
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      setOpenNoteId(null);
    } catch {
      // ignore
    }
  };

  const confirmPendingNote = async () => {
    if (!pendingNotePos || !pendingNoteText.trim()) return;
    try {
      const created = await api.post<MapNotePublic>(
        `/tabletops/${tabletopId}/vtt/notes`,
        { x: pendingNotePos.x, y: pendingNotePos.y, text: pendingNoteText.trim(), icon: pendingNoteIcon },
        token,
      );
      setNotes((prev) => (prev.some((n) => n.id === created.id) ? prev : [...prev, created]));
      setPendingNotePos(null);
    } catch {
      // ignore — WS/reload will reconcile
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
    setSelectedTokenIds((prev) => {
      if (!prev.has(t.id)) return prev;
      const next = new Set(prev);
      next.delete(t.id);
      return next;
    });
    pushUndo({ kind: "deleteToken", snapshot: t });
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, token);
    } catch {
      // ignore — WS/reload will reconcile
    }
  };

  const updateSelectedToken = async (patch: Partial<TokenPublic>) => {
    if (!selectedToken) return;
    try {
      const updated = await api.patch<TokenPublic>(
        `/tabletops/${tabletopId}/vtt/tokens/${selectedToken.id}`,
        patch,
        token,
      );
      setTokens((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch {
      // ignore
    }
  };

  /** Applies the same patch to every editable token in the current
   * multi-selection — the "apply to all" half of the select tool. Tokens
   * the user can't edit are silently skipped rather than failing the whole
   * batch. */
  const updateSelectedTokens = async (patch: Partial<TokenPublic>) => {
    const results = await Promise.all(
      selectedTokensEditable.map((t) =>
        api.patch<TokenPublic>(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, patch, token).catch(() => null),
      ),
    );
    const updated = results.filter((t): t is TokenPublic => !!t);
    if (updated.length === 0) return;
    setTokens((prev) => prev.map((t) => updated.find((u) => u.id === t.id) ?? t));
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
        setDrawings([]);
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
      setDrawings([]);
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
        setDrawings([]);
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

  /** Places a token from its template. With no explicit screen position
   * (click shortcut), it lands centered in the current viewport; a drag-drop
   * from the asset dock passes the drop's client coordinates instead. */
  const placeTokenFromTemplate = async (template: TokenTemplatePublic, clientPos?: { x: number; y: number }) => {
    if (!backgroundUrl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mapX = ((clientPos ? clientPos.x - rect.left : rect.width / 2) - transform.x) / transform.scale;
    const mapY = ((clientPos ? clientPos.y - rect.top : rect.height / 2) - transform.y) / transform.scale;
    try {
      const created = await api.post<TokenPublic>(
        `/tabletops/${tabletopId}/vtt/tokens/from-template/${template.id}`,
        { x: mapX, y: mapY },
        token,
      );
      setTokens((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
      pushUndo({ kind: "createToken", tokenId: created.id });
    } catch {
      // ignore
    }
  };

  const createEncounter = async () => {
    if (!encounterName.trim() || encounterTemplateIds.size === 0) return;
    try {
      const created = await api.post<EncounterPublic>(
        `/tabletops/${tabletopId}/vtt/encounters`,
        { name: encounterName.trim(), template_ids: Array.from(encounterTemplateIds) },
        token,
      );
      setEncounters((prev) => (prev.some((e) => e.id === created.id) ? prev : [...prev, created]));
      setEncounterName("");
      setEncounterTemplateIds(new Set());
      setShowEncounterForm(false);
    } catch {
      // ignore
    }
  };

  const deleteEncounterHandler = async (encounter: EncounterPublic) => {
    if (!window.confirm(`Apagar o encontro "${encounter.name}"?`)) return;
    try {
      await api.del(`/tabletops/${tabletopId}/vtt/encounters/${encounter.id}`, token);
      setEncounters((prev) => prev.filter((e) => e.id !== encounter.id));
    } catch {
      // ignore
    }
  };

  const spawnEncounter = async (encounter: EncounterPublic) => {
    if (!backgroundUrl || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (rect.width / 2 - transform.x) / transform.scale;
    const centerY = (rect.height / 2 - transform.y) / transform.scale;
    try {
      const created = await api.post<TokenPublic[]>(
        `/tabletops/${tabletopId}/vtt/encounters/${encounter.id}/spawn`,
        { x: centerX, y: centerY },
        token,
      );
      setTokens((prev) => [...prev, ...created.filter((t) => !prev.some((p) => p.id === t.id))]);
      for (const t of created) pushUndo({ kind: "createToken", tokenId: t.id });
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

  const assetTabSwitch = iAmDm ? (
    <div className="flex shrink-0 overflow-hidden rounded-sm border border-border-soft">
      {(["tokens", "scenes"] as const).map((tabValue) => (
        <button
          key={tabValue}
          type="button"
          onClick={() => setAssetTab(tabValue)}
          className={`px-2.5 py-1.5 text-xs font-bold uppercase transition ${
            assetTab === tabValue ? "bg-accent text-on-accent" : "bg-surface-2 text-text-muted hover:text-text"
          }`}
        >
          {tabValue === "tokens" ? "Tokens" : "Cenas"}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-bg">
      <div
        ref={containerRef}
        data-drop-target="__canvas__"
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
          {bgSize && <GridLayer grid={grid} width={bgSize.width} height={bgSize.height} />}
          <DrawingLayer
            drawings={drawings}
            pending={pendingDrawing}
            eraseMode={drawTool === "erase"}
            onErase={deleteDrawing}
          />
          {iAmDm && (walls.length > 0 || pendingWall) && (
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
              {walls.map((w) => {
                const wallSelected = selectedWallIds.has(w.id);
                const clickable = wallTool === "erase" || selectMode;
                return (
                  <g key={w.id}>
                    {/* Thin visible line */}
                    <line
                      x1={w.x1}
                      y1={w.y1}
                      x2={w.x2}
                      y2={w.y2}
                      stroke={wallSelected ? "var(--color-accent)" : "#f2c14e"}
                      strokeWidth={wallSelected ? 4 : 3}
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                    {/* Fat invisible stroke — a much easier click/select target
                        than the 3px visible line (see the project feedback
                        that erasing walls was "terrivelmente difícil"). Only
                        hit-testable while erase or the select tool is armed,
                        so it never steals clicks meant for the camera. */}
                    {clickable && (
                      <line
                        x1={w.x1}
                        y1={w.y1}
                        x2={w.x2}
                        y2={w.y2}
                        stroke="transparent"
                        strokeWidth={18}
                        strokeLinecap="round"
                        style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          if (wallTool === "erase") {
                            deleteWall(w);
                            return;
                          }
                          setSelectedTokenIds(new Set());
                          setSelectedWallIds(new Set([w.id]));
                        }}
                      />
                    )}
                  </g>
                );
              })}
              {pendingWall &&
                (() => {
                  const shape = wallShape;
                  if (shape === "rect") {
                    const x = Math.min(pendingWall.x1, pendingWall.x2);
                    const y = Math.min(pendingWall.y1, pendingWall.y2);
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={Math.abs(pendingWall.x2 - pendingWall.x1)}
                        height={Math.abs(pendingWall.y2 - pendingWall.y1)}
                        fill="none"
                        stroke="#f2c14e"
                        strokeWidth={3}
                        strokeDasharray="6 4"
                        opacity={0.7}
                      />
                    );
                  }
                  if (shape === "circle") {
                    const radius = Math.hypot(
                      pendingWall.x2 - pendingWall.x1,
                      pendingWall.y2 - pendingWall.y1,
                    );
                    return (
                      <circle
                        cx={pendingWall.x1}
                        cy={pendingWall.y1}
                        r={radius}
                        fill="none"
                        stroke="#f2c14e"
                        strokeWidth={3}
                        strokeDasharray="6 4"
                        opacity={0.7}
                      />
                    );
                  }
                  return (
                    <line
                      x1={pendingWall.x1}
                      y1={pendingWall.y1}
                      x2={pendingWall.x2}
                      y2={pendingWall.y2}
                      stroke="#f2c14e"
                      strokeWidth={3}
                      strokeDasharray="6 4"
                      opacity={0.7}
                    />
                  );
                })()}
            </svg>
          )}
          {ruler && (
            <svg
              className="pointer-events-none absolute"
              style={{
                left: Math.min(ruler.startX, ruler.endX),
                top: Math.min(ruler.startY, ruler.endY),
                width: Math.abs(ruler.endX - ruler.startX) || 1,
                height: Math.abs(ruler.endY - ruler.startY) || 1,
                overflow: "visible",
              }}
            >
              <line
                x1={ruler.startX - Math.min(ruler.startX, ruler.endX)}
                y1={ruler.startY - Math.min(ruler.startY, ruler.endY)}
                x2={ruler.endX - Math.min(ruler.startX, ruler.endX)}
                y2={ruler.endY - Math.min(ruler.startY, ruler.endY)}
                stroke="var(--color-accent)"
                strokeWidth={2 / transform.scale}
                strokeDasharray={`${6 / transform.scale} ${4 / transform.scale}`}
              />
            </svg>
          )}
          {marquee && (
            <div
              className="pointer-events-none absolute border border-accent bg-accent-soft"
              style={{
                left: Math.min(marquee.x1, marquee.x2),
                top: Math.min(marquee.y1, marquee.y2),
                width: Math.abs(marquee.x2 - marquee.x1),
                height: Math.abs(marquee.y2 - marquee.y1),
              }}
            />
          )}
          {tokens.map((t) => {
            const size = t.size ?? TOKEN_SIZE;
            const selected = selectedTokenIds.has(t.id);
            const soleSelected = selected && selectedTokenIds.size === 1;
            const badge = instanceLabel(t);
            const hpPct =
              tokenSettings.show_hp_bars && t.hp_max
                ? Math.max(0, Math.min(100, ((t.hp_current ?? t.hp_max) / t.hp_max) * 100))
                : null;
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
                  // Hidden tokens render dimmed for the DM only — a visual
                  // reminder of which tokens players can't see, never
                  // applied for players (they never receive hidden tokens
                  // at all, see app/services/token_service.list_tokens).
                  opacity: t.hidden_from_players && iAmDm ? 0.45 : 1,
                  outline: t.hidden_from_players && iAmDm ? "2px dashed var(--color-text-faint)" : undefined,
                  outlineOffset: 2,
                  cursor: canMoveToken(t) ? "grab" : "default",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_URL}${t.image_url}`}
                  alt="Token"
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  style={{
                    transform: `${t.flipped_x ? "scaleX(-1) " : ""}rotate(${t.rotation}deg)`,
                  }}
                  className={`h-full w-full select-none shadow-lg [-webkit-user-drag:none] ${
                    t.circle_crop ? "rounded-full object-cover" : "rounded-sm object-contain"
                  } ${t.hp_max && t.hp_current === 0 ? "grayscale" : ""} ${
                    selected ? "border-2 border-accent" : ""
                  }`}
                />
                {badge && (
                  <span className="pointer-events-none absolute -left-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface px-1 font-mono text-[9px] font-bold text-text shadow">
                    {badge}
                  </span>
                )}
                {hpPct !== null && (
                  <div className="absolute -bottom-1.5 left-0 h-1.5 w-full overflow-hidden rounded-full bg-surface/80">
                    <div
                      className={`h-full ${hpPct > 50 ? "bg-accent" : hpPct > 20 ? "bg-rare" : "bg-danger"}`}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                )}
                {tokenSettings.show_nameplates && t.name && (
                  <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-surface/90 px-1.5 py-0.5 font-mono text-[9px] text-text-muted">
                    {t.name}
                  </span>
                )}
                {canEditToken(t) && (
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
                {soleSelected && canEditToken(t) && (
                  <div
                    onPointerDown={(e) => onRotateHandlePointerDown(e, t)}
                    onPointerMove={onRotateHandlePointerMove}
                    onPointerUp={onRotateHandlePointerUp}
                    className="absolute left-1/2 -top-4 h-3 w-3 -translate-x-1/2 cursor-grab rounded-full border-2 border-bg bg-accent-strong"
                    style={{ touchAction: "none" }}
                    title="Arraste para rotacionar"
                  />
                )}
                {selected && canEditToken(t) && (
                  <div
                    onPointerDown={(e) => onResizeHandlePointerDown(e, t)}
                    onPointerMove={onResizeHandlePointerMove}
                    onPointerUp={onResizeHandlePointerUp}
                    className="absolute -bottom-1 -right-1 h-3.5 w-3.5 cursor-nwse-resize rounded-full border-2 border-bg bg-accent"
                    style={{ touchAction: "none" }}
                    title="Arraste para redimensionar · F para flipar · Ctrl+D duplica · Del remove"
                  />
                )}
              </div>
            );
          })}
          {notes.map((n) => {
            const NoteIcon = NOTE_ICON_COMPONENTS[n.icon] ?? StickyNote;
            return (
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
                    setNoteDraftIcon(n.icon);
                    setOpenPanel(null);
                  }}
                  className="flex h-full w-full items-center justify-center rounded-full border-2 border-bg bg-accent text-on-accent shadow-lg"
                  title={n.text}
                >
                  <NoteIcon size={13} />
                </button>
              </div>
            );
          })}
          {bgSize && (fog.length > 0 || fogTool || dynamicLightingOn) && (
            <DarknessLayer
              fog={fog}
              pending={pendingFog}
              dynamicLightingEnabled={dynamicLightingOn}
              lights={lights}
              walls={walls}
              width={bgSize.width}
              height={bgSize.height}
              interactive={fogTool === "hide" || fogTool === "reveal"}
              dmView={iAmDm}
            />
          )}
          {iAmDm && fogTool === "erase" && (
            <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
              {fog.map((f) => {
                const common = {
                  fill: "var(--color-accent)",
                  fillOpacity: 0.25,
                  stroke: "var(--color-accent)",
                  strokeWidth: 2,
                  style: { pointerEvents: "all" as const, cursor: "pointer" },
                  onPointerDown: (e: React.PointerEvent) => {
                    e.stopPropagation();
                    deleteFogShape(f.id);
                  },
                };
                if (f.kind === "rect" && f.points.length >= 2) {
                  const [a, b] = f.points;
                  const x = Math.min(a.x, b.x);
                  const y = Math.min(a.y, b.y);
                  return (
                    <rect
                      key={f.id}
                      {...common}
                      x={x}
                      y={y}
                      width={Math.abs(b.x - a.x)}
                      height={Math.abs(b.y - a.y)}
                    />
                  );
                }
                if (f.kind === "circle") {
                  return <circle key={f.id} {...common} cx={f.points[0].x} cy={f.points[0].y} r={f.radius} />;
                }
                return (
                  <polyline
                    key={f.id}
                    {...common}
                    points={f.points.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    strokeWidth={f.radius * 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}
            </svg>
          )}
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
        {ruler && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border-soft bg-surface/95 px-2 py-1 font-mono text-[10px] text-text backdrop-blur"
            style={{
              left: transform.x + ((ruler.startX + ruler.endX) / 2) * transform.scale,
              top: transform.y + ((ruler.startY + ruler.endY) / 2) * transform.scale - 16,
            }}
          >
            {pxToDistanceLabel(Math.hypot(ruler.endX - ruler.startX, ruler.endY - ruler.startY))}
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
        {iAmDm && (
          <ToolbarIconButton
            title="Grade"
            active={openPanel === "grid"}
            disabled={!activeScene}
            onClick={() => togglePanel("grid")}
          >
            <Grid3x3 size={18} />
          </ToolbarIconButton>
        )}
        {iAmDm && (
          <ToolbarIconButton
            title="Desenho"
            active={openPanel === "draw"}
            disabled={!activeScene}
            onClick={() => togglePanel("draw")}
          >
            <PenLine size={18} />
          </ToolbarIconButton>
        )}
        {iAmDm && (
          <ToolbarIconButton
            title="Névoa de guerra"
            active={openPanel === "fog"}
            disabled={!activeScene}
            onClick={() => togglePanel("fog")}
          >
            <CloudFog size={18} />
          </ToolbarIconButton>
        )}
        {iAmDm && (
          <ToolbarIconButton
            title="Paredes e iluminação dinâmica"
            active={openPanel === "walls"}
            disabled={!activeScene}
            onClick={() => togglePanel("walls")}
          >
            <BrickWall size={18} />
          </ToolbarIconButton>
        )}
        <ToolbarIconButton
          title="Selecionar vários tokens"
          active={selectMode}
          disabled={!activeScene}
          onClick={toggleSelectMode}
        >
          <MousePointer2 size={18} />
        </ToolbarIconButton>
        <ToolbarIconButton
          title="Iniciativa"
          active={openPanel === "initiative"}
          onClick={() => togglePanel("initiative")}
        >
          <ListOrdered size={18} />
        </ToolbarIconButton>
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

      {openPanel === "grid" && activeScene && (
        <div className="absolute left-4 top-16 flex w-72 flex-col gap-3 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Grade
          </span>
          <label className="flex items-center justify-between text-sm">
            Ativada
            <input
              type="checkbox"
              checked={grid.enabled}
              onChange={(e) => updateGrid({ enabled: e.target.checked })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Tipo
            <Select
              value={grid.type}
              onChange={(e) => updateGrid({ type: e.target.value as GridConfig["type"] })}
              className="py-1.5 text-xs"
            >
              <option value="square">Quadrada</option>
              <option value="hex">Hexagonal</option>
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Tamanho da célula (px)
            <Input
              type="number"
              min={8}
              value={grid.size}
              onChange={(e) => updateGrid({ size: Number(e.target.value) || grid.size })}
              className="py-1.5 text-xs"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
              Offset X
              <Input
                type="number"
                value={grid.offset_x}
                onChange={(e) => updateGrid({ offset_x: Number(e.target.value) || 0 })}
                className="py-1.5 text-xs"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
              Offset Y
              <Input
                type="number"
                value={grid.offset_y}
                onChange={(e) => updateGrid({ offset_y: Number(e.target.value) || 0 })}
                className="py-1.5 text-xs"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Opacidade
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={grid.opacity}
              onChange={(e) => updateGrid({ opacity: Number(e.target.value) })}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            Encaixar tokens na grade
            <input
              type="checkbox"
              checked={grid.snap_enabled}
              onChange={(e) => updateGrid({ snap_enabled: e.target.checked })}
            />
          </label>
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-text-muted">
              Unidade de medida
              <Input
                value={grid.unit_label}
                onChange={(e) => updateGrid({ unit_label: e.target.value })}
                placeholder="ex.: 1,5m"
                className="min-w-0 py-1.5 text-xs"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-text-muted">
              Metros por quadrado
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={grid.unit_meters}
                onChange={(e) => updateGrid({ unit_meters: Number(e.target.value) || grid.unit_meters })}
                className="min-w-0 py-1.5 text-xs"
              />
            </label>
          </div>
          <p className="text-[10px] text-text-faint">
            Shift + arraste no mapa para medir distância · usado também para converter o raio de luz dos
            tokens (em metros) para o mapa.
          </p>
        </div>
      )}

      {openPanel === "draw" && activeScene && (
        <div className="absolute left-4 top-16 flex w-72 flex-col gap-3 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Desenho
          </span>
          <div className="grid grid-cols-6 gap-1">
            {(
              [
                ["freehand", PenLine, "Livre"],
                ["line", Minus, "Linha"],
                ["rect", SquareIcon, "Retângulo"],
                ["circle", CircleIcon, "Círculo"],
                ["text", TypeIcon, "Texto"],
                ["erase", Eraser, "Apagar"],
              ] as [DrawTool, React.ComponentType<{ size?: number }>, string][]
            ).map(([toolValue, Icon, label]) => (
              <button
                key={label}
                type="button"
                title={label}
                onClick={() => {
                  setFogTool(null);
                  setWallTool(null);
                  setDrawTool((prev) => (prev === toolValue ? null : toolValue));
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-sm border transition ${
                  drawTool === toolValue
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-border-soft text-text-muted hover:text-text"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between text-xs text-text-muted">
            Cor
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              className="h-7 w-12 rounded-sm border border-border-soft bg-transparent"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-muted">
            Espessura
            <input
              type="range"
              min={1}
              max={12}
              value={drawWidth}
              onChange={(e) => setDrawWidth(Number(e.target.value))}
            />
          </label>
          {drawTool && (
            <p className="text-[10px] text-text-faint">
              {drawTool === "erase"
                ? "Clique num desenho no mapa para apagá-lo."
                : "Desenhe no mapa. Clique na ferramenta de novo para desativar."}
            </p>
          )}
        </div>
      )}

      {openPanel === "fog" && activeScene && (
        <div className="absolute left-4 top-16 flex w-72 flex-col gap-3 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Névoa de guerra
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setDrawTool(null);
                setWallTool(null);
                setFogTool((prev) => (prev === "hide" ? null : "hide"));
              }}
              className={`flex-1 rounded-sm border px-2 py-1.5 text-xs font-bold uppercase transition ${
                fogTool === "hide"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border-soft text-text-muted hover:text-text"
              }`}
            >
              Esconder
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawTool(null);
                setWallTool(null);
                setFogTool((prev) => (prev === "reveal" ? null : "reveal"));
              }}
              className={`flex-1 rounded-sm border px-2 py-1.5 text-xs font-bold uppercase transition ${
                fogTool === "reveal"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border-soft text-text-muted hover:text-text"
              }`}
            >
              Revelar
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawTool(null);
                setWallTool(null);
                setFogTool((prev) => (prev === "erase" ? null : "erase"));
              }}
              className={`flex-1 rounded-sm border px-2 py-1.5 text-xs font-bold uppercase transition ${
                fogTool === "erase"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border-soft text-text-muted hover:text-text"
              }`}
            >
              Apagar forma
            </button>
          </div>
          {fogTool !== "erase" && (
          <>
          <div className="flex gap-1.5">
            {(
              [
                ["brush", PenLine, "Pincel"],
                ["rect", SquareIcon, "Caixa"],
                ["circle", CircleIcon, "Círculo"],
              ] as [FogShapeKind, React.ComponentType<{ size?: number }>, string][]
            ).map(([shapeValue, Icon, label]) => (
              <button
                key={shapeValue}
                type="button"
                title={label}
                onClick={() => setFogShape(shapeValue)}
                className={`flex h-8 flex-1 items-center justify-center rounded-sm border transition ${
                  fogShape === shapeValue
                    ? "border-accent bg-accent-soft text-accent-strong"
                    : "border-border-soft text-text-muted hover:text-text"
                }`}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          {fogShape === "brush" && (
            <label className="flex flex-col gap-1 text-xs text-text-muted">
              Raio do pincel
              <input
                type="range"
                min={10}
                max={200}
                value={fogRadius}
                onChange={(e) => setFogRadius(Number(e.target.value))}
              />
            </label>
          )}
          </>
          )}
          <Button type="button" variant="secondary" className="text-xs" onClick={clearFog}>
            Limpar toda a névoa
          </Button>
          {fogTool && fogTool !== "erase" && (
            <p className="text-[10px] text-text-faint">
              {fogShape === "brush"
                ? "Arraste no mapa para pintar."
                : "Arraste no mapa para desenhar a forma."}
            </p>
          )}
          {fogTool === "erase" && (
            <p className="text-[10px] text-text-faint">
              Clique numa forma de névoa no mapa para apagar só ela.
            </p>
          )}
        </div>
      )}

      {openPanel === "walls" && activeScene && (
        <div className="absolute left-4 top-16 flex w-72 flex-col gap-3 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Iluminação dinâmica
          </span>
          <label className="flex items-center justify-between text-sm">
            Ativada nesta cena
            <input
              type="checkbox"
              checked={activeScene.dynamic_lighting_enabled}
              onChange={(e) => toggleDynamicLighting(e.target.checked)}
            />
          </label>
          <p className="text-[10px] text-text-faint">
            Quando ativa, jogadores só recebem tokens dentro da luz de um token de jogador que emite luz
            (aba &ldquo;Token&rdquo; ao selecionar um token) e com linha de visão livre de paredes.
          </p>
          <div className="flex gap-2 border-t border-border-soft pt-3">
            <button
              type="button"
              onClick={() => {
                setDrawTool(null);
                setFogTool(null);
                setWallTool((prev) => (prev === "draw" ? null : "draw"));
              }}
              className={`flex-1 rounded-sm border px-2 py-1.5 text-xs font-bold uppercase transition ${
                wallTool === "draw"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border-soft text-text-muted hover:text-text"
              }`}
            >
              Desenhar parede
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawTool(null);
                setFogTool(null);
                setWallTool((prev) => (prev === "erase" ? null : "erase"));
              }}
              className={`flex-1 rounded-sm border px-2 py-1.5 text-xs font-bold uppercase transition ${
                wallTool === "erase"
                  ? "border-accent bg-accent-soft text-accent-strong"
                  : "border-border-soft text-text-muted hover:text-text"
              }`}
            >
              Apagar
            </button>
          </div>
          {wallTool === "draw" && (
            <div className="flex gap-1.5">
              {(
                [
                  ["line", Minus, "Linha"],
                  ["rect", SquareIcon, "Caixa"],
                  ["circle", CircleIcon, "Círculo"],
                ] as [typeof wallShape, React.ComponentType<{ size?: number }>, string][]
              ).map(([shapeValue, Icon, label]) => (
                <button
                  key={shapeValue}
                  type="button"
                  title={label}
                  onClick={() => setWallShape(shapeValue)}
                  className={`flex h-8 flex-1 items-center justify-center rounded-sm border transition ${
                    wallShape === shapeValue
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-border-soft text-text-muted hover:text-text"
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
          )}
          {wallTool && (
            <p className="text-[10px] text-text-faint">
              {wallTool === "draw"
                ? wallShape === "circle"
                  ? "Clique no centro e arraste até o raio desejado."
                  : "Arraste no mapa para desenhar a forma."
                : "Clique numa parede no mapa para apagá-la."}
            </p>
          )}
        </div>
      )}

      {openPanel === "initiative" && initiative && (
        <InitiativeTracker
          initiative={initiative}
          iAmDm={iAmDm}
          selectedToken={selectedToken}
          onAddEntry={addInitiativeEntry}
          onRemoveEntry={removeInitiativeEntry}
          onStart={() => postInitiativeAction("start")}
          onNext={() => postInitiativeAction("next")}
          onPrevious={() => postInitiativeAction("previous")}
          onEnd={() => postInitiativeAction("end")}
        />
      )}

      {openPanel === "encounters" && (
        <div className="absolute left-4 top-16 flex max-h-[40vh] w-80 flex-col gap-2 overflow-y-auto rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Encontros
            </span>
            <ul className="flex flex-col gap-1">
              {encounters.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{e.name}</span>
                  <span className="shrink-0 text-[10px] text-text-faint">{e.members.length}</span>
                  <button
                    type="button"
                    onClick={() => spawnEncounter(e)}
                    disabled={!backgroundUrl}
                    className="shrink-0 text-[10px] font-bold uppercase text-accent hover:text-accent-strong disabled:opacity-40"
                  >
                    Spawn
                  </button>
                  {(iAmDm || e.created_by === user?.id) && (
                    <button
                      type="button"
                      onClick={() => deleteEncounterHandler(e)}
                      className="shrink-0 text-text-faint transition hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </li>
              ))}
              {encounters.length === 0 && !showEncounterForm && (
                <p className="text-xs text-text-muted">Nenhum encontro salvo ainda.</p>
              )}
            </ul>

            {showEncounterForm ? (
              <div className="flex flex-col gap-2 border-t border-border-soft pt-2">
                <Input
                  value={encounterName}
                  onChange={(e) => setEncounterName(e.target.value)}
                  placeholder="Nome do encontro"
                  className="py-1.5 text-xs"
                />
                <div className="flex max-h-32 flex-col gap-1 overflow-y-auto">
                  {templates.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={encounterTemplateIds.has(t.id)}
                        onChange={(e) => {
                          const next = new Set(encounterTemplateIds);
                          if (e.target.checked) next.add(t.id);
                          else next.delete(t.id);
                          setEncounterTemplateIds(next);
                        }}
                      />
                      {t.name}
                    </label>
                  ))}
                  {templates.length === 0 && (
                    <p className="text-xs text-text-muted">Adicione tokens à biblioteca primeiro.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => setShowEncounterForm(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" className="text-xs" onClick={createEncounter}>
                    Salvar
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowEncounterForm(true)}
                className="flex items-center gap-1.5 text-xs font-semibold text-text-muted transition hover:text-text"
              >
                <Plus size={14} />
                Novo encontro
              </button>
            )}
          </div>
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
                    setNoteDraftIcon(n.icon);
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

      {selectedToken && canEditToken(selectedToken) && (
        <div className="absolute right-4 top-16 flex max-h-[70vh] w-80 flex-col gap-2 overflow-x-hidden overflow-y-auto rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
              Token
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[10px] font-bold uppercase text-accent hover:text-accent-strong"
                onClick={async () => {
                  try {
                    const created = await api.post<TokenPublic>(
                      `/tabletops/${tabletopId}/vtt/tokens/${selectedToken.id}/duplicate`,
                      {},
                      token,
                    );
                    setTokens((prev) => [...prev, created]);
                    pushUndo({ kind: "createToken", tokenId: created.id });
                  } catch {
                    // ignore
                  }
                }}
              >
                Duplicar
              </button>
              <button
                type="button"
                className="text-[10px] font-bold uppercase text-danger hover:text-danger/80"
                onClick={() => deleteToken(selectedToken)}
              >
                Remover
              </button>
            </div>
          </div>
          <Input
            value={selectedToken.name ?? ""}
            onChange={(e) => updateSelectedToken({ name: e.target.value || null })}
            placeholder="Nome (nameplate)"
            className="py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <Input
              type="number"
              value={selectedToken.hp_current ?? ""}
              onChange={(e) =>
                updateSelectedToken({ hp_current: e.target.value === "" ? null : Number(e.target.value) })
              }
              placeholder="PV atual"
              className="flex-1 py-1.5 text-xs"
            />
            <Input
              type="number"
              value={selectedToken.hp_max ?? ""}
              onChange={(e) =>
                updateSelectedToken({ hp_max: e.target.value === "" ? null : Number(e.target.value) })
              }
              placeholder="PV máximo"
              className="flex-1 py-1.5 text-xs"
            />
          </div>
          <Select
            value={selectedToken.size_category ?? ""}
            onChange={(e) => {
              const cat = (e.target.value || null) as SizeCategory | null;
              const patch: Partial<TokenPublic> = { size_category: cat };
              if (cat) patch.size = grid.size * SIZE_CATEGORY_MULTIPLIER[cat];
              updateSelectedToken(patch);
            }}
            className="py-1.5 text-xs"
          >
            <option value="">Tamanho livre</option>
            {(Object.keys(SIZE_CATEGORY_LABELS) as SizeCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {SIZE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </Select>
          <label className="flex items-center justify-between text-xs text-text-muted">
            Corte circular
            <input
              type="checkbox"
              checked={selectedToken.circle_crop}
              onChange={(e) => updateSelectedToken({ circle_crop: e.target.checked })}
            />
          </label>
          <label className="flex items-center justify-between text-xs text-text-muted">
            Emite luz
            <input
              type="checkbox"
              checked={selectedToken.emits_light}
              onChange={(e) => updateSelectedToken({ emits_light: e.target.checked })}
            />
          </label>
          {selectedToken.emits_light && (
            <Input
              type="number"
              step={0.5}
              min={0}
              value={
                selectedToken.light_radius == null
                  ? ""
                  : Number(((selectedToken.light_radius / grid.size) * grid.unit_meters).toFixed(2))
              }
              onChange={(e) => {
                const meters = e.target.value === "" ? null : Number(e.target.value);
                updateSelectedToken({
                  light_radius: meters === null ? null : (meters / grid.unit_meters) * grid.size,
                });
              }}
              placeholder="Raio de luz (metros)"
              className="py-1.5 text-xs"
            />
          )}
          <div className="flex flex-col gap-2 border-t border-border-soft pt-2">
            {iAmDm && (
              <label className="flex items-center justify-between text-xs text-text-muted">
                Esconder dos jogadores
                <input
                  type="checkbox"
                  checked={selectedToken.hidden_from_players}
                  onChange={(e) => updateSelectedToken({ hidden_from_players: e.target.checked })}
                />
              </label>
            )}
            <label className="flex items-center justify-between text-xs text-text-muted">
              Bloquear para jogadores
              <input
                type="checkbox"
                checked={selectedToken.restricted_to_dm}
                onChange={(e) => updateSelectedToken({ restricted_to_dm: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between text-xs text-text-muted">
              Travar token (ninguém move, nem o mestre)
              <input
                type="checkbox"
                checked={selectedToken.locked}
                onChange={(e) => updateSelectedToken({ locked: e.target.checked })}
              />
            </label>
          </div>
        </div>
      )}

      {selectedTokensEditable.length > 0 && (
        <div className="absolute right-4 top-16 flex w-80 flex-col gap-3 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
              {selectedTokensEditable.length} tokens selecionados
            </span>
            <button
              type="button"
              className="text-[10px] font-bold uppercase text-danger hover:text-danger/80"
              onClick={() => {
                const ids = new Set(selectedTokensEditable.map((t) => t.id));
                setTokens((prev) => prev.filter((t) => !ids.has(t.id)));
                setSelectedTokenIds(new Set());
                for (const t of selectedTokensEditable) {
                  pushUndo({ kind: "deleteToken", snapshot: t });
                  api.del(`/tabletops/${tabletopId}/vtt/tokens/${t.id}`, token).catch(() => {});
                }
              }}
            >
              Remover todos
            </button>
          </div>
          <p className="text-[10px] text-text-faint">
            Aplica a propriedade escolhida a todos os tokens selecionados que você pode editar.
          </p>
          <Select
            defaultValue=""
            onChange={(e) => {
              const cat = (e.target.value || null) as SizeCategory | null;
              const patch: Partial<TokenPublic> = { size_category: cat };
              if (cat) patch.size = grid.size * SIZE_CATEGORY_MULTIPLIER[cat];
              updateSelectedTokens(patch);
            }}
            className="py-1.5 text-xs"
          >
            <option value="" disabled>
              Definir tamanho...
            </option>
            <option value="">Tamanho livre</option>
            {(Object.keys(SIZE_CATEGORY_LABELS) as SizeCategory[]).map((cat) => (
              <option key={cat} value={cat}>
                {SIZE_CATEGORY_LABELS[cat]}
              </option>
            ))}
          </Select>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => updateSelectedTokens({ circle_crop: true })}
              className="rounded-sm border border-border-soft px-2.5 py-1.5 text-left text-xs text-text-muted transition hover:text-text"
            >
              Ativar corte circular
            </button>
            <button
              type="button"
              onClick={() => updateSelectedTokens({ circle_crop: false })}
              className="rounded-sm border border-border-soft px-2.5 py-1.5 text-left text-xs text-text-muted transition hover:text-text"
            >
              Desativar corte circular
            </button>
            <button
              type="button"
              onClick={() => updateSelectedTokens({ restricted_to_dm: true })}
              className="rounded-sm border border-border-soft px-2.5 py-1.5 text-left text-xs text-text-muted transition hover:text-text"
            >
              Bloquear para jogadores
            </button>
            <button
              type="button"
              onClick={() => updateSelectedTokens({ restricted_to_dm: false })}
              className="rounded-sm border border-border-soft px-2.5 py-1.5 text-left text-xs text-text-muted transition hover:text-text"
            >
              Desbloquear para jogadores
            </button>
            <button
              type="button"
              onClick={() => updateSelectedTokens({ locked: true })}
              className="rounded-sm border border-border-soft px-2.5 py-1.5 text-left text-xs text-text-muted transition hover:text-text"
            >
              Travar tokens
            </button>
            <button
              type="button"
              onClick={() => updateSelectedTokens({ locked: false })}
              className="rounded-sm border border-border-soft px-2.5 py-1.5 text-left text-xs text-text-muted transition hover:text-text"
            >
              Destravar tokens
            </button>
          </div>
        </div>
      )}

      {iAmDm && selectedWallIds.size > 0 && (
        <div className="absolute left-4 bottom-20 flex items-center gap-3 rounded-md border border-border-soft bg-surface/95 px-4 py-2.5 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {selectedWallIds.size} {selectedWallIds.size === 1 ? "parede selecionada" : "paredes selecionadas"}
          </span>
          <button
            type="button"
            className="text-[10px] font-bold uppercase text-danger hover:text-danger/80"
            onClick={() => {
              for (const w of walls) {
                if (selectedWallIds.has(w.id)) deleteWall(w);
              }
              setSelectedWallIds(new Set());
            }}
          >
            Remover
          </button>
        </div>
      )}

      {pendingNotePos && (
        <div className="absolute left-1/2 top-16 flex w-80 -translate-x-1/2 flex-col gap-2 rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            Nova anotação
          </span>
          <textarea
            autoFocus
            value={pendingNoteText}
            onChange={(e) => setPendingNoteText(e.target.value)}
            rows={3}
            placeholder="Texto da anotação"
            className="rounded-sm border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-text outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-1">
            {NOTE_ICON_CHOICES.map((icon) => {
              const Icon = NOTE_ICON_COMPONENTS[icon];
              return (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setPendingNoteIcon(icon)}
                  className={`flex h-7 w-7 items-center justify-center rounded-sm border transition ${
                    pendingNoteIcon === icon
                      ? "border-accent bg-accent-soft text-accent-strong"
                      : "border-border-soft text-text-muted hover:text-text"
                  }`}
                >
                  <Icon size={14} />
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="text-xs" onClick={() => setPendingNotePos(null)}>
              Cancelar
            </Button>
            <Button type="button" className="text-xs" onClick={confirmPendingNote}>
              Criar
            </Button>
          </div>
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
              <div className="flex gap-1">
                {NOTE_ICON_CHOICES.map((icon) => {
                  const Icon = NOTE_ICON_COMPONENTS[icon];
                  return (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNoteDraftIcon(icon)}
                      className={`flex h-7 w-7 items-center justify-center rounded-sm border transition ${
                        noteDraftIcon === icon
                          ? "border-accent bg-accent-soft text-accent-strong"
                          : "border-border-soft text-text-muted hover:text-text"
                      }`}
                    >
                      <Icon size={14} />
                    </button>
                  );
                })}
              </div>
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

      {/* Permanent bottom dock: tokens are visible to every member (anyone
          can place their own character's tokens); the "Cenas" tab only
          exists for the DM. */}
      {assetTab === "tokens" ? (
        <AssetDock
          title="Tokens — arraste um token para o mapa para colocá-lo"
          items={templates}
          folders={tokenFolders}
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
          onDropOnCanvas={(t, clientX, clientY) =>
            backgroundUrl && placeTokenFromTemplate(t, { x: clientX, y: clientY })
          }
          onDefaultAction={(t) => backgroundUrl && placeTokenFromTemplate(t)}
          headerExtra={assetTabSwitch}
        />
      ) : (
        iAmDm && (
          <AssetDock
            title="Cenas — arraste uma cena para o mapa para trocar"
            items={scenes}
            folders={sceneFolders}
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
            renderBadge={(s) => (s.is_active ? <Badge variant="accent">Ativa</Badge> : null)}
            onDropOnCanvas={(s) => activateScene(s)}
            onDefaultAction={(s) => activateScene(s)}
            headerExtra={assetTabSwitch}
          />
        )
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
