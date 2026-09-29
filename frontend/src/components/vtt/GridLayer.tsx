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

/** Rounds x/y to the nearest grid cell center, if the grid is enabled and
 * snapping is on. Hex snapping uses the same nearest-cell-center logic via
 * axial rounding; square just rounds to the nearest cell. */
export function snapToGrid(x: number, y: number, grid: GridConfig): { x: number; y: number } {
  if (!grid.enabled || !grid.snap_enabled) return { x, y };

  if (grid.type === "square") {
    const cellX = Math.round((x - grid.offset_x) / grid.size);
    const cellY = Math.round((y - grid.offset_y) / grid.size);
    return {
      x: grid.offset_x + cellX * grid.size + grid.size / 2,
      y: grid.offset_y + cellY * grid.size + grid.size / 2,
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
