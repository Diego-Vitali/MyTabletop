"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Folder as FolderIcon, Plus, Trash2 } from "lucide-react";
import { API_URL } from "@/lib/api";
import type { FolderPublic } from "@/lib/types";
import { Button, FieldError, Input } from "@/components/ui";

const ROOT = "__root__";
const DRAG_THRESHOLD = 6;

interface DirectoryItem {
  id: string;
  name: string;
  image_url: string;
  folder_id: string | null;
}

interface DirectoryPanelProps<T extends DirectoryItem> {
  title: string;
  items: T[];
  folders: FolderPublic[];
  itemShape: "circle" | "square";
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
  renderItemAction: (item: T) => React.ReactNode;
  isItemHighlighted?: (item: T) => boolean;
}

export function DirectoryPanel<T extends DirectoryItem>({
  title,
  items,
  folders,
  itemShape,
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
  renderItemAction,
  isItemHighlighted,
}: DirectoryPanelProps<T>) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Pointer-based drag-and-drop, matching the same mechanics used to drag
  // tokens/notes on the map (pointerdown/move/up + setPointerCapture),
  // rather than the HTML5 drag-and-drop API.
  const dragRef = useRef<{ item: T; startX: number; startY: number; dragging: boolean } | null>(null);
  const [draggingItem, setDraggingItem] = useState<T | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const currentFolder = currentFolderId ? folders.find((f) => f.id === currentFolderId) ?? null : null;

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
    if (!uploadName.trim() || !file) return;
    await onUploadNew({ name: uploadName.trim(), folderId: currentFolderId, file });
    setUploadName("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const visibleItems = items.filter((i) => i.folder_id === currentFolderId);
  const imgClass =
    itemShape === "circle"
      ? "h-9 w-9 shrink-0 rounded-full border border-border-soft object-cover"
      : "h-9 w-14 shrink-0 rounded-sm border border-border-soft object-cover";

  const onItemPointerDown = (e: React.PointerEvent, item: T) => {
    if (!canManageItem(item)) return;
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

  const onItemPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.dragging && dropTarget !== null) {
      const targetFolderId = dropTarget === ROOT ? null : dropTarget;
      if (targetFolderId !== d.item.folder_id) {
        onMoveItemToFolder(d.item, targetFolderId);
      }
    }
    setDraggingItem(null);
    setDragPos(null);
    setDropTarget(null);
  };

  const renderItem = (item: T) => (
    <li
      key={item.id}
      onPointerDown={(e) => onItemPointerDown(e, item)}
      onPointerMove={onItemPointerMove}
      onPointerUp={onItemPointerUp}
      style={{ touchAction: canManageItem(item) ? "none" : undefined }}
      className={`flex items-center gap-2 rounded-sm px-1.5 py-1.5 ${
        draggingItem?.id === item.id ? "opacity-40" : ""
      } ${isItemHighlighted?.(item) ? "bg-accent-soft" : ""} ${canManageItem(item) ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${API_URL}${item.image_url}`} alt={item.name} className={imgClass} draggable={false} />
      <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
      {renderItemAction(item)}
      {canManageItem(item) && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDeleteItem(item)}
          title="Apagar"
          className="shrink-0 text-text-faint transition hover:text-danger"
        >
          <Trash2 size={14} />
        </button>
      )}
    </li>
  );

  return (
    <div className="flex max-h-[70vh] w-80 flex-col gap-3 overflow-y-auto rounded-md border border-border-soft bg-surface/95 p-4 backdrop-blur">
      <div className="flex items-center gap-1.5">
        {currentFolder ? (
          <button
            type="button"
            data-drop-target={ROOT}
            onClick={() => setCurrentFolderId(null)}
            className={`flex items-center gap-1 rounded-sm px-1 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide transition ${
              draggingItem && dropTarget === ROOT
                ? "bg-accent-soft text-accent-strong"
                : "text-text-muted hover:text-text"
            }`}
            title="Voltar"
          >
            <ArrowLeft size={12} />
            {title}
          </button>
        ) : (
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-text-muted">
            {title}
          </span>
        )}
        {currentFolder && (
          <>
            <span className="text-text-faint">/</span>
            <span className="truncate text-xs font-semibold text-text">{currentFolder.name}</span>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-0.5">
        {!currentFolder &&
          folders.map((folder) => (
            <li
              key={folder.id}
              data-drop-target={folder.id}
              onDoubleClick={() => setCurrentFolderId(folder.id)}
              className={`flex items-center gap-2 rounded-sm px-1.5 py-1.5 text-sm transition select-none ${
                draggingItem && dropTarget === folder.id
                  ? "bg-accent-soft text-accent-strong"
                  : "hover:bg-surface-2"
              }`}
              title="Clique duas vezes para abrir · arraste um item aqui para mover"
            >
              <FolderIcon size={16} className="shrink-0 text-text-muted" />
              <span className="min-w-0 flex-1 truncate">{folder.name}</span>
              <span className="shrink-0 text-[10px] text-text-faint">
                {items.filter((i) => i.folder_id === folder.id).length}
              </span>
              {canManageFolder(folder) && (
                <button
                  type="button"
                  onClick={() => onDeleteFolder(folder)}
                  title="Apagar pasta"
                  className="shrink-0 text-text-faint transition hover:text-danger"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          ))}
        {visibleItems.map(renderItem)}
        {!currentFolder && folders.length === 0 && visibleItems.length === 0 && (
          <p className="text-xs text-text-muted">Nada por aqui ainda.</p>
        )}
        {currentFolder && visibleItems.length === 0 && (
          <p className="text-xs text-text-muted">Pasta vazia. Arraste um item até &ldquo;{title}&rdquo; acima para tirá-lo daqui.</p>
        )}
      </ul>

      {canCreateFolder && !currentFolder && (
        <div className="border-t border-border-soft pt-3">
          {creatingFolder ? (
            <form onSubmit={submitFolder} className="flex gap-1.5">
              <Input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => {
                  if (!newFolderName.trim()) setCreatingFolder(false);
                }}
                placeholder="Nome da pasta"
                className="flex-1 py-1.5 text-xs"
              />
              <Button type="submit" variant="secondary" className="px-2.5 py-1.5 text-xs">
                Criar
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-text-muted transition hover:text-text"
            >
              <Plus size={14} />
              Nova pasta
            </button>
          )}
        </div>
      )}

      {canUpload && (
        <form onSubmit={submitUpload} className="flex flex-col gap-2 border-t border-border-soft pt-3">
          <Input
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            placeholder="Nome"
            className="py-1.5 text-xs"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="text-xs text-text-muted file:mr-2 file:rounded-sm file:border-0 file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:font-semibold file:text-text hover:file:bg-surface"
          />
          <FieldError>{uploadError}</FieldError>
          <Button type="submit" disabled={uploading} className="text-xs">
            {uploading ? "Enviando..." : currentFolder ? `Adicionar em "${currentFolder.name}"` : "Adicionar"}
          </Button>
        </form>
      )}

      {draggingItem && dragPos && (
        <div
          className="pointer-events-none fixed z-50 flex items-center gap-1.5 rounded-sm border border-border-soft bg-surface px-2 py-1 text-xs shadow-lg"
          style={{ left: dragPos.x + 12, top: dragPos.y + 12 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${API_URL}${draggingItem.image_url}`} alt="" className="h-5 w-5 rounded-sm object-cover" />
          {draggingItem.name}
        </div>
      )}
    </div>
  );
}
