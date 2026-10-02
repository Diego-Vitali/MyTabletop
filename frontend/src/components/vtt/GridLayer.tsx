import type { GridConfig } from "@/lib/types";

/** Renders the square/hex grid overlay as SVG, inside the same transformed
 * coordinate space as the background image and tokens (see VttView). Purely
 * decorative — snapping math lives in VttView's own drag handlers. */
export function GridLayer({
  grid,
  width,
  height,
}: {
  grid: GridConfig;
  width: number;
  height: number;
}) {
  if (!grid.enabled || width <= 0 || height <= 0) return null;

  const stroke = "var(--color-accent)";

  if (grid.type === "square") {
    const lines: React.ReactNode[] = [];
    for (let x = grid.offset_x % grid.size; x <= width; x += grid.size) {
      lines.push(<line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} />);
    }
    for (let y = grid.offset_y % grid.size; y <= height; y += grid.size) {
      lines.push(<line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} />);
    }
    return (
      <svg
        className="pointer-events-none absolute left-0 top-0"
        width={width}
        height={height}
        style={{ opacity: grid.opacity }}
      >
        <g stroke={stroke} strokeWidth={1}>
          {lines}
        </g>
      </svg>
    );
  }

  // Flat-top hex grid: cell "size" is the hex's radius (center to corner).
  const hexW = grid.size * 2;
  const hexH = Math.sqrt(3) * grid.size;
  const hexPoints = (cx: number, cy: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 180) * (60 * i);
      return `${cx + grid.size * Math.cos(angle)},${cy + grid.size * Math.sin(angle)}`;
    }).join(" ");

  const hexes: React.ReactNode[] = [];
  const colStep = hexW * 0.75;
  for (let col = 0, cx = grid.offset_x; cx < width + hexW; col++, cx += colStep) {
    const rowOffset = col % 2 === 0 ? 0 : hexH / 2;
    for (let cy = grid.offset_y + rowOffset; cy < height + hexH; cy += hexH) {
      hexes.push(<polygon key={`${col}-${cy}`} points={hexPoints(cx, cy)} />);
    }
  }

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={width}
      height={height}
      style={{ opacity: grid.opacity }}
    >
      <g stroke={stroke} strokeWidth={1} fill="none">
        {hexes}
      </g>
    </svg>
  );
}

/** Rounds x/y to the nearest grid snap point, if the grid is enabled and
 * snapping is on. `sizePx` is the token's own on-map size: a token that
 * spans an even number of cells (2×2, 4×4, a "grande"+ token) is centered
 * on a grid-line INTERSECTION rather than a cell center, so its edges land
 * on cell boundaries instead of being offset by half a cell — otherwise a
 * big token visibly straddles its 2×2 block off-center every time it's
 * dropped. An odd span (1×1, 3×3) still snaps to a cell center as before.
 * Hex snapping is unaffected (always nearest hex center via axial
 * rounding) — hex has no well-defined "intersection" equivalent here. */
export function snapToGrid(
  x: number,
  y: number,
  grid: GridConfig,
  sizePx: number = grid.size,
): { x: number; y: number } {
  if (!grid.enabled || !grid.snap_enabled) return { x, y };

  if (grid.type === "square") {
    const cellsSpan = Math.max(1, Math.round(sizePx / grid.size));
    const centerOffset = cellsSpan % 2 === 0 ? 0 : grid.size / 2;
    const cellX = Math.round((x - grid.offset_x - centerOffset) / grid.size);
    const cellY = Math.round((y - grid.offset_y - centerOffset) / grid.size);
    return {
      x: grid.offset_x + cellX * grid.size + centerOffset,
      y: grid.offset_y + cellY * grid.size + centerOffset,
    };
  }

  // Hex: snap by finding the nearest hex center on a flat-top layout.
  const hexW = grid.size * 2;
  const hexH = Math.sqrt(3) * grid.size;
  const colStep = hexW * 0.75;
  const col = Math.round((x - grid.offset_x) / colStep);
  const cx = grid.offset_x + col * colStep;
  const rowOffset = col % 2 === 0 ? 0 : hexH / 2;
  const row = Math.round((y - grid.offset_y - rowOffset) / hexH);
  const cy = grid.offset_y + rowOffset + row * hexH;
  return { x: cx, y: cy };
}
