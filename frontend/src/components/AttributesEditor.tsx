"use client";

import { ATTRIBUTE_DEFS } from "@/lib/types";

export function AttributesEditor({
  rulebook,
  value,
  onChange,
  readOnly = false,
}: {
  rulebook: string;
  value: Record<string, number>;
  onChange?: (next: Record<string, number>) => void;
  readOnly?: boolean;
}) {
  const defs = ATTRIBUTE_DEFS[rulebook] ?? [];

  return (
    <div className="grid grid-cols-5 gap-2">
      {defs.map((d) => (
        <div
          key={d.key}
          className="rounded-sm border border-border-soft bg-surface px-1 py-2 text-center"
          title={d.label}
        >
          <div className="font-mono text-[10px] tracking-wide text-text-faint">{d.key}</div>
          {readOnly ? (
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
              {value[d.key] ?? 0}
            </div>
          ) : (
            <input
              type="number"
              className="mt-1 w-full bg-transparent text-center font-mono text-lg font-semibold tabular-nums text-text outline-none"
              value={value[d.key] ?? 0}
              onChange={(e) => onChange?.({ ...value, [d.key]: Number(e.target.value) || 0 })}
            />
          )}
        </div>
      ))}
    </div>
  );
}
