"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Prateleira horizontal da Apple Store: cards alinhados à coluna de
 * conteúdo à esquerda e vazando até a borda direita da tela, com rolagem
 * por snap e os botões redondos de navegação ("paddles") embaixo. */
export function Shelf({ children, label }: { children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = () => {
    const el = ref.current;
    if (!el) return;
    const atStart = el.scrollLeft <= 4;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setEdges((prev) => (prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }));
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(el.clientWidth * 0.75, 300), behavior: "smooth" });
  };

  const scrollable = !(edges.atStart && edges.atEnd);

  return (
    <div role="region" aria-label={label}>
      <div
        ref={ref}
        onScroll={measure}
        className="no-scrollbar shelf-inset flex snap-x snap-mandatory gap-5 overflow-x-auto pt-2 pb-10"
      >
        {children}
      </div>
      {scrollable && (
        <div className="page-container flex justify-end gap-3.5">
          <button
            type="button"
            aria-label="Anterior"
            disabled={edges.atStart}
            onClick={() => scroll(-1)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-3/70 text-text/60 transition hover:bg-surface-3 hover:text-text disabled:cursor-default disabled:opacity-40"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            aria-label="Próximo"
            disabled={edges.atEnd}
            onClick={() => scroll(1)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-surface-3/70 text-text/60 transition hover:bg-surface-3 hover:text-text disabled:cursor-default disabled:opacity-40"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}

/** Item de prateleira: largura fixa, alinha no snap. */
export function ShelfItem({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`shrink-0 snap-start ${className}`}>{children}</div>;
}
