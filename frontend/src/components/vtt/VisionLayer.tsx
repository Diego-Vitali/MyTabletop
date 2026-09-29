import { useEffect, useRef } from "react";
import type { WallPublic } from "@/lib/types";

type Light = { x: number; y: number; radius: number };

function raySegmentT(
  ox: number,
  oy: number,
  dx: number,
  dy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number | null {
  const ex = bx - ax;
  const ey = by - ay;
  const denom = ex * dy - ey * dx;
  if (Math.abs(denom) < 1e-12) return null;
  const t = (ex * (ay - oy) - ey * (ax - ox)) / denom;
  const u = (dx * (ay - oy) - dy * (ax - ox)) / denom;
  if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9) return t;
  return null;
}

/** Same shadow-casting idea as app/core/geometry.py, ported to JS for
 * rendering only — this never decides what data a client receives (the
 * backend already withheld anything the player shouldn't have), it just
 * draws the darkness mask so walls visibly cast shadows. */
function visibilityPolygon(light: Light, walls: WallPublic[]): { x: number; y: number }[] {
  const angles = new Set<number>();
  const EPS = 0.0001;
  for (const w of walls) {
    for (const [x, y] of [
      [w.x1, w.y1],
      [w.x2, w.y2],
    ]) {
      const a = Math.atan2(y - light.y, x - light.x);
      angles.add(a);
      angles.add(a - EPS);
      angles.add(a + EPS);
    }
  }
  const STEPS = 48;
  for (let i = 0; i < STEPS; i++) angles.add((i / STEPS) * Math.PI * 2);

  const sorted = Array.from(angles).sort((a, b) => a - b);
  return sorted.map((angle) => {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let minT = light.radius;
    for (const w of walls) {
      if (!w.blocks_light) continue;
      const t = raySegmentT(light.x, light.y, dx, dy, w.x1, w.y1, w.x2, w.y2);
      if (t !== null && t < minT) minT = t;
    }
    return { x: light.x + dx * minT, y: light.y + dy * minT };
  });
}

export function VisionLayer({
  lights,
  walls,
  width,
  height,
}: {
  lights: Light[];
  walls: WallPublic[];
  width: number;
  height: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5, 4, 4, 0.7)";
    ctx.fillRect(0, 0, width, height);

    ctx.globalCompositeOperation = "destination-out";
    for (const light of lights) {
      if (light.radius <= 0) continue;
      const polygon = visibilityPolygon(light, walls);
      if (polygon.length < 3) continue;
      ctx.save();
      ctx.beginPath();
      polygon.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.clip();
      const gradient = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(0.85, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(light.x - light.radius, light.y - light.radius, light.radius * 2, light.radius * 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = "source-over";
  }, [lights, walls, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pointer-events-none absolute left-0 top-0"
    />
  );
}
