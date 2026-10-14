"use client";

import { useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Play, Square, Trash2 } from "lucide-react";
import type { InitiativePublic, TokenPublic } from "@/lib/types";
import { Badge, Button, Input } from "@/components/ui";

export function InitiativeTracker({
  initiative,
  iAmDm,
  selectedToken,
  onAddEntry,
  onRemoveEntry,
  onStart,
  onNext,
  onPrevious,
  onEnd,
}: {
  initiative: InitiativePublic;
  iAmDm: boolean;
  selectedToken: TokenPublic | null;
  onAddEntry: (data: { token_id: string | null; label: string; value: number; hp_current: number | null; hp_max: number | null }) => void;
  onRemoveEntry: (entryId: string) => void;
  onStart: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onEnd: () => void;
}) {
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = Number(value);
    if (!label.trim() || Number.isNaN(v)) return;
    onAddEntry({
      token_id: selectedToken?.id ?? null,
      label: label.trim(),
      value: v,
      hp_current: selectedToken?.hp_current ?? null,
      hp_max: selectedToken?.hp_max ?? null,
    });
    setLabel("");
    setValue("");
  };

  return (
    <div className="absolute left-4 top-16 flex w-72 flex-col gap-3 rounded-md panel-float p-4">
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-text">
          Iniciativa
        </span>
        {initiative.is_active && <Badge variant="accent">Rodada {initiative.round}</Badge>}
      </div>

      <ul className="flex flex-col gap-1">
        {initiative.entries.map((entry, i) => (
          <li
            key={entry.id}
            className={`flex items-center gap-2 rounded-sm px-2.5 py-1.5 text-sm ${
              initiative.is_active && i === initiative.current_index ? "bg-accent text-on-accent" : ""
            }`}
          >
            <span className="w-8 shrink-0 text-xs tabular-nums opacity-60">{entry.value}</span>
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            {entry.hp_max != null && (
              <span className="shrink-0 text-xs tabular-nums opacity-60">
                {entry.hp_current ?? entry.hp_max}/{entry.hp_max}
              </span>
            )}
            {iAmDm && (
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                className="shrink-0 cursor-pointer opacity-50 transition hover:text-danger hover:opacity-100"
              >
                <Trash2 size={13} />
              </button>
            )}
          </li>
        ))}
        {initiative.entries.length === 0 && (
          <p className="text-xs text-text-muted">Nenhum participante ainda.</p>
        )}
      </ul>

      {iAmDm && (
        <>
          <form onSubmit={submit} className="flex gap-1.5 border-t border-border-soft pt-3">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={selectedToken ? `Nome (token selecionado)` : "Nome"}
              dense
              className="min-w-0 flex-1"
            />
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Val."
              dense
              className="w-14"
            />
            <Button type="submit" variant="tertiary" size="sm">
              +
            </Button>
          </form>
          <div className="flex gap-1.5">
            {!initiative.is_active ? (
              <Button type="button" size="sm" className="flex-1" onClick={onStart}>
                <Play size={13} /> Iniciar
              </Button>
            ) : (
              <>
                <Button type="button" variant="tertiary" size="sm" onClick={onPrevious}>
                  <ChevronLeft size={14} />
                </Button>
                <Button type="button" size="sm" className="flex-1" onClick={onNext}>
                  Próximo <ChevronRight size={14} />
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={onEnd}>
                  <Square size={13} />
                </Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
