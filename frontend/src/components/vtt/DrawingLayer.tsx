import type { DrawingKind, DrawingPublic, Point } from "@/lib/types";

export type PendingDrawing = { kind: DrawingKind; points: Point[]; color: string; strokeWidth: number };

function pathFor(points: Point[]) {
  if (points.length === 0) return "";
  return `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
}

function Shape({
  kind,
  points,
  color,
  strokeWidth,
  text,
}: {
  kind: DrawingKind;
  points: Point[];
  color: string;
  strokeWidth: number;
  text?: string | null;
}) {
  if (kind === "freehand") {
    return <path d={pathFor(points)} stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (kind === "line") {
    const [a, b] = points;
    if (!a || !b) return null;
    return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
  }
  if (kind === "rect") {
    const [a, b] = points;
    if (!a || !b) return null;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    return (
      <rect
        x={x}
        y={y}
        width={Math.abs(b.x - a.x)}
        height={Math.abs(b.y - a.y)}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />
    );
  }
  if (kind === "circle") {
    const [a, b] = points;
    if (!a || !b) return null;
    const r = Math.hypot(b.x - a.x, b.y - a.y);
    return <circle cx={a.x} cy={a.y} r={r} stroke={color} strokeWidth={strokeWidth} fill="none" />;
  }
  // text
  const [a] = points;
  if (!a) return null;
  return (
    <text x={a.x} y={a.y} fill={color} fontSize={Math.max(12, strokeWidth * 6)} fontFamily="monospace">
      {text}
    </text>
  );
}

/** Renders committed drawings plus an optional in-progress preview, inside
 * the same transformed coordinate space as tokens/grid (see VttView). When
 * `eraseMode` is on, committed shapes become clickable for deletion. */
export function DrawingLayer({
  drawings,
  pending,
  eraseMode,
  onErase,
}: {
  drawings: DrawingPublic[];
  pending: PendingDrawing | null;
  eraseMode: boolean;
  onErase?: (d: DrawingPublic) => void;
}) {
  return (
    <svg className="absolute left-0 top-0 overflow-visible" style={{ pointerEvents: "none" }} width={1} height={1}>
      {drawings.map((d) => (
        <g
          key={d.id}
          style={{ pointerEvents: eraseMode ? "stroke" : "none", cursor: eraseMode ? "pointer" : undefined }}
          onPointerDown={(e) => {
            if (!eraseMode) return;
            e.stopPropagation();
            onErase?.(d);
          }}
        >
          <Shape kind={d.kind} points={d.points} color={d.color} strokeWidth={d.stroke_width} text={d.text} />
        </g>
      ))}
      {pending && (
        <g opacity={0.7}>
          <Shape kind={pending.kind} points={pending.points} color={pending.color} strokeWidth={pending.strokeWidth} />
        </g>
      )}
    </svg>
  );
}
