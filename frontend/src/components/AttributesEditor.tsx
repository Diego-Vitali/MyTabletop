"use client";

import { Minus, Plus } from "lucide-react";
import { ATTRIBUTE_DEFS } from "@/lib/types";

/** Bloco de atributos — o formato padrão para qualquer bloco de números
 * da ficha (atributos hoje; recursos, perícias e NEX depois). Três escalas:
 * `sm` (miniatura nos cards), `md` (formulários) e `lg` (a ficha em si, no
 * estilo dos números grandes das páginas de especificações da Apple). */
export function AttributesEditor({
  rulebook,
  value,
  onChange,
  readOnly = false,
  size = "md",
}: {
  rulebook: string;
  value: Record<string, number>;
  onChange?: (next: Record<string, number>) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const defs = ATTRIBUTE_DEFS[rulebook] ?? [];
  const set = (key: string, n: number) => onChange?.({ ...value, [key]: n });

  if (size === "lg") {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-5 sm:gap-y-0">
        {defs.map((d) => {
          const v = value[d.key] ?? 0;
          return (
            <div key={d.key} className="flex flex-col items-center gap-2 text-center">
              {readOnly ? (
                <span className="type-display tabular-nums">{v}</span>
              ) : (
                <input
                  type="number"
                  aria-label={d.label}
                  className="type-display w-full rounded-sm bg-transparent text-center tabular-nums outline-none transition hover:bg-surface-2 focus:bg-surface-2 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  value={v}
                  onChange={(e) => set(d.key, Number(e.target.value) || 0)}
                />
              )}
              <span className="flex flex-col">
                <span className="text-[17px] font-semibold">{d.label}</span>
                <span className="text-xs text-text-muted">{d.key}</span>
              </span>
              {!readOnly && <Stepper label={d.label} onStep={(delta) => set(d.key, v + delta)} />}
            </div>
          );
        })}
      </div>
    );
  }

  const small = size === "sm";
  return (
    <div className={`grid grid-cols-5 ${small ? "gap-1.5" : "gap-2"}`}>
      {defs.map((d) => {
        const v = value[d.key] ?? 0;
        return (
          <div
            key={d.key}
            className={`flex flex-col items-center rounded-sm bg-surface-2 ${small ? "py-2.5" : "gap-1 px-1 pt-3 pb-2"}`}
            title={d.label}
          >
            <span className="text-[11px] font-semibold tracking-normal text-text-muted">{d.key}</span>
            {readOnly ? (
              <span className={`font-semibold tabular-nums ${small ? "text-xl leading-tight" : "text-[28px] leading-tight"}`}>
                {v}
              </span>
            ) : (
              <>
                <input
                  type="number"
                  aria-label={d.label}
                  className="w-full bg-transparent text-center text-[28px] leading-tight font-semibold tabular-nums text-text outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  value={v}
                  onChange={(e) => set(d.key, Number(e.target.value) || 0)}
                />
                <Stepper label={d.label} compact onStep={(delta) => set(d.key, v + delta)} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Stepper({
  label,
  onStep,
  compact = false,
}: {
  label: string;
  onStep: (delta: number) => void;
  compact?: boolean;
}) {
  const btn = `flex cursor-pointer items-center justify-center rounded-full bg-surface-3/70 text-text transition hover:bg-surface-3 ${
    compact ? "h-6 w-6" : "h-8 w-8"
  }`;
  return (
    <div className={`flex ${compact ? "gap-1" : "gap-2"}`}>
      <button type="button" aria-label={`Diminuir ${label}`} onClick={() => onStep(-1)} className={btn}>
        <Minus size={compact ? 12 : 14} />
      </button>
      <button type="button" aria-label={`Aumentar ${label}`} onClick={() => onStep(1)} className={btn}>
        <Plus size={compact ? 12 : 14} />
      </button>
    </div>
  );
}
