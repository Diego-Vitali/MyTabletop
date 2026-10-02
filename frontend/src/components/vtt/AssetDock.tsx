"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { Folder as FolderIcon, Plus, Search, Trash2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import type { FolderPublic } from "@/lib/types";
import { Button, FieldError, Input } from "@/components/ui";

const ALL = "__all__";
const ROOT = "__root__";
const CANVAS = "__canvas__";
const DRAG_THRESHOLD = 6;

interface DockItem {
  id: string;
  name: string;
  image_url: string;
  folder_id: string | null;
}

interface AssetDockProps<T extends DockItem> {
  title: string;
  items: T[];
  folders: FolderPublic[];
  canCreateFolder: boolean;
  canUpload: boolean;
  uploading: boolean;
  uploadError: string | null;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folder: FolderPublic) => void;
  canManageFolder: (folder: FolderPublic) => boolean;
  onUploadNew: (data: { name: string; folderId: string | null; file: File }) => Promise<void>;
  onMoveItemToFolder: (item: T, folderId: string | null) => void;
  canManageItem: (item: T) => boolean;
  onDeleteItem: (item: T) => void;
  /** Dropped on the map canvas, at this client (viewport) position. */
  onDropOnCanvas: (item: T, clientX: number, clientY: number) => void;
  /** Click shortcut — same effect as a drop, but centered/default. */
  onDefaultAction: (item: T) => void;
  isItemHighlighted?: (item: T) => boolean;
  renderBadge?: (item: T) => React.ReactNode;
  /** Rendered next to the title — the dock is a permanent bottom bar now,
   * so this is used for the Tokens/Cenas tab switcher rather than a close
   * button. */
  headerExtra?: React.ReactNode;
}

/** Owlbear Rodeo-style bottom asset dock: folder chips + a search box above
 * a grid of draggable thumbnails. Dragging a thumbnail onto the map places/
 * activates it there; dragging it onto a folder chip files it there. Uses
 * pointer events (not the HTML5 drag-and-drop API) for the same reason the
 * token/note dragging on the map itself does — simpler cross-device
 * handling via setPointerCapture. */
export function AssetDock<T extends DockItem>({
  title,
  items,
  folders,
  canCreateFolder,
  canUpload,
  uploading,
  uploadError,
  onCreateFolder,
  onDeleteFolder,
  canManageFolder,
  onUploadNew,
  onMoveItemToFolder,
  canManageItem,
  onDeleteItem,
  onDropOnCanvas,
  onDefaultAction,
  isItemHighlighted,
  renderBadge,
  headerExtra,
}: AssetDockProps<T>) {
  const [activeFolderId, setActiveFolderId] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const dragRef = useRef<{ item: T; startX: number; startY: number; dragging: boolean } | null>(null);
  const [draggingItem, setDraggingItem] = useState<T | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    let list = items;
    if (activeFolderId === ROOT) list = list.filter((i) => i.folder_id === null);
    else if (activeFolderId !== ALL) list = list.filter((i) => i.folder_id === activeFolderId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    return list;
  }, [items, activeFolderId, search]);

  const submitFolder = (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    onCreateFolder(newFolderName.trim());
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const submitUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const folderId = activeFolderId === ALL || activeFolderId === ROOT ? null : activeFolderId;
    // Name is optional — default to the filename (without extension) so
    // uploading isn't blocked on typing a name.
    const name = uploadName.trim() || file.name.replace(/\.[^./\\]+$/, "");
    await onUploadNew({ name, folderId, file });
    setUploadName("");
    if (fileRef.current) fileRef.current.value = "";
    setUploadOpen(false);
  };

  const onItemPointerDown = (e: React.PointerEvent, item: T) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { item, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  const onItemPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.dragging) {
      const dist = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
      if (dist < DRAG_THRESHOLD) return;
      d.dragging = true;
      setDraggingItem(d.item);
    }
    setDragPos({ x: e.clientX, y: e.clientY });
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const dropEl = el?.closest<HTMLElement>("[data-drop-target]");
    setDropTarget(dropEl?.dataset.dropTarget ?? null);
  };

  const onItemPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.dragging && dropTarget !== null) {
      if (dropTarget === CANVAS) {
        onDropOnCanvas(d.item, e.clientX, e.clientY);
      } else if (canManageItem(d.item)) {
        const targetFolderId = dropTarget === ROOT ? null : dropTarget;
        if (targetFolderId !== d.item.folder_id) onMoveItemToFolder(d.item, targetFolderId);
      }
    } else if (!d?.dragging) {
      onDefaultAction(d!.item);
    }
    setDraggingItem(null);
    setDragPos(null);
    setDropTarget(null);
  };

  return (
    <div className="absolute inset-x-0 bottom-0 flex max-h-[45vh] flex-col gap-2 border-t border-border-soft bg-surface/95 backdrop-blur">
      <div className="flex items-center gap-2 px-4 pt-3">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
          {title}
        </span>
        <div className="relative ml-2 flex-1 max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="w-full py-1.5 pl-7 text-xs"
          />
        </div>
        {canUpload && (
          <Button
            type="button"
            variant="secondary"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => setUploadOpen((v) => !v)}
          >
            <Plus size={13} className="inline -mt-0.5 mr-1" />
            Adicionar
          </Button>
        )}
        {headerExtra}
      </div>

      {uploadOpen && canUpload && (
        <form onSubmit={submitUpload} className="flex items-end gap-2 px-4 pb-1">
          <label className="flex flex-1 flex-col gap-1 text-xs text-text-muted">
            Nome (opcional)
            <Input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="usa o nome do arquivo"
              className="py-1.5 text-xs"
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="max-w-[12rem] text-xs text-text-muted file:mr-2 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-text hover:file:bg-surface"
          />
          <Button type="submit" disabled={uploading} className="px-3 py-1.5 text-xs">
            {uploading ? "Enviando..." : "Enviar"}
          </Button>
          <FieldError>{uploadError}</FieldError>
        </form>
      )}

      <div
        data-drop-target={ROOT}
        className={`flex items-center gap-1.5 overflow-x-auto px-4 pb-2 ${
          draggingItem && dropTarget === ROOT ? "bg-accent-soft/40" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveFolderId(ALL)}
          className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
            activeFolderId === ALL ? "bg-accent text-on-accent" : "bg-surface-2 text-text-muted hover:text-text"
          }`}
        >
          Tudo
        </button>
        {folders.map((folder) => (
          <button
            key={folder.id}
            type="button"
            data-drop-target={folder.id}
            onClick={() => setActiveFolderId(folder.id)}
            title={canManageFolder(folder) ? "Clique para filtrar · arraste um item aqui para mover" : undefined}
            className={`group flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold transition ${
              activeFolderId === folder.id || (draggingItem && dropTarget === folder.id)
                ? "bg-accent text-on-accent"
                : "bg-surface-2 text-text-muted hover:text-text"
            }`}
          >
            <FolderIcon size={11} />
            {folder.name}
            {canManageFolder(folder) && (
              <Trash2
                size={11}
                className="opacity-0 transition hover:text-danger group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder);
                }}
              />
            )}
          </button>
        ))}
        {canCreateFolder &&
          (creatingFolder ? (
            <form onSubmit={submitFolder} className="flex shrink-0 gap-1">
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => {
                  if (!newFolderName.trim()) setCreatingFolder(false);
                }}
                placeholder="Nome da pasta"
                className="w-32 py-1 text-xs"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              title="Nova pasta"
              className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 p-1.5 text-text-muted transition hover:text-text"
            >
              <Plus size={13} />
            </button>
          ))}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2.5 overflow-y-auto px-4 pb-4">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            onPointerDown={(e) => onItemPointerDown(e, item)}
            onPointerMove={onItemPointerMove}
            onPointerUp={onItemPointerUp}
            style={{ touchAction: "none" }}
            title={item.name}
            className={`group relative flex cursor-grab flex-col items-center gap-1 rounded-md border p-1.5 transition active:cursor-grabbing ${
              draggingItem?.id === item.id ? "opacity-40" : ""
            } ${
              isItemHighlighted?.(item)
                ? "border-accent bg-accent-soft"
                : "border-transparent hover:bg-surface-2"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${API_URL}${item.image_url}`}
              alt={item.name}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              className="h-14 w-14 rounded-sm border border-border-soft object-cover [-webkit-user-drag:none]"
            />
            <span className="w-full truncate text-center text-[10px] text-text-muted">{item.name}</span>
            {renderBadge?.(item)}
            {canManageItem(item) && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => onDeleteItem(item)}
                title="Apagar"
                className="absolute -right-1 -top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-danger text-on-accent group-hover:flex"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>
        ))}
        {visibleItems.length === 0 && (
          <p className="col-span-full py-4 text-center text-xs text-text-muted">Nada por aqui ainda.</p>
        )}
      </div>

      {draggingItem && dragPos && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-sm border border-border-soft bg-surface px-2 py-1 text-xs shadow-lg"
          style={{ left: dragPos.x + 12, top: dragPos.y - 36 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${API_URL}${draggingItem.image_url}`} alt="" className="h-5 w-5 rounded-sm object-cover" />
          {draggingItem.name}
        </div>
      )}
    </div>
  );
}
