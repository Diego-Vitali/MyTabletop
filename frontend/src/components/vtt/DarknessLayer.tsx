import { useEffect, useRef } from "react";
import type { FogShape, Point, WallPublic } from "@/lib/types";

type PendingFog = { kind: FogShape["kind"]; points: Point[]; radius: number; isErasing: boolean };
type Light = { x: number; y: number; radius: number };

/** Paints one DM-drawn fog shape onto the mask at full opacity:
 * `source-over` to hide, `destination-out` to reveal. */
function paintFogShape(ctx: CanvasRenderingContext2D, shape: { kind: FogShape["kind"]; points: Point[]; radius: number; is_erasing: boolean }) {
  if (shape.points.length === 0) return;
  ctx.globalCompositeOperation = shape.is_erasing ? "destination-out" : "source-over";
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";

  if (shape.kind === "rect" && shape.points.length >= 2) {
    const [a, b] = shape.points;
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    ctx.fillRect(x, y, Math.abs(b.x - a.x), Math.abs(b.y - a.y));
    return;
  }
  if (shape.kind === "circle") {
    const c = shape.points[0];
    ctx.beginPath();
    ctx.arc(c.x, c.y, shape.radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // brush: a round-capped polyline stroke, like a paintbrush.
  ctx.lineWidth = shape.radius * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(shape.points[0].x, shape.points[0].y);
  for (const p of shape.points.slice(1)) ctx.lineTo(p.x, p.y);
  if (shape.points.length === 1) ctx.lineTo(shape.points[0].x + 0.01, shape.points[0].y);
  ctx.stroke();
}

function raySegmentT(ox: number, oy: number, dx: number, dy: number, ax: number, ay: number, bx: number, by: number): number | null {
  const ex = bx - ax;
  const ey = by - ay;
  const denom = ex * dy - ey * dx;
  if (Math.abs(denom) < 1e-12) return null;
  const t = (ex * (ay - oy) - ey * (ax - ox)) / denom;
  const u = (dx * (ay - oy) - dy * (ax - ox)) / denom;
  if (t >= 0 && u >= -1e-9 && u <= 1 + 1e-9) return t;
  return null;
}

/** Shadow-casting: same idea as app/core/geometry.py, ported to JS for
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

/** Carves a light's visibility polygon out of the mask (destination-out),
 * with a soft radial falloff at the rim so the edge of a light isn't a hard
 * line. */
function carveLight(ctx: CanvasRenderingContext2D, light: Light, walls: WallPublic[]) {
  if (light.radius <= 0) return;
  const polygon = visibilityPolygon(light, walls);
  if (polygon.length < 3) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
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

/** Fog of war and dynamic-lighting shadow are the same concept rendered as
 * one layer: anywhere not lit (when dynamic lighting is on) is exactly as
 * dark as anywhere the DM manually fogged, and the two never stack into a
 * darker "double shadow" where they overlap — because they're painted into
 * a single alpha mask at full opacity first, and that mask is drawn onto
 * the visible canvas exactly once with the final opacity. Composition
 * order: start fully hidden, carve out each light's visibility polygon
 * (if dynamic lighting is on), then apply the DM's manual fog shapes on
 * top — so a manual "hide" can still blot out a lit secret room, and a
 * manual "reveal" can still show an unlit area the DM wants remembered. */
export function DarknessLayer({
  fog,
  pending,
  dynamicLightingEnabled,
  lights,
  walls,
  width,
  height,
  interactive,
  dmView,
}: {
  fog: FogShape[];
  pending: PendingFog | null;
  dynamicLightingEnabled: boolean;
  lights: Light[];
  walls: WallPublic[];
  width: number;
  height: number;
  interactive: boolean;
  /** DMs see darkened areas dimmed rather than fully opaque, so they can
   * still work with the map — purely a rendering choice, no data is hidden
   * from the DM either way. Players always get full opacity. */
  dmView: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement | null>(null);
  // Players get a fully opaque mask — zero visibility through fogged/unlit
  // areas. DMs still see a dimmed version so they can keep working the map.
  const opacity = dmView ? 0.55 : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!maskRef.current) maskRef.current = document.createElement("canvas");
    const mask = maskRef.current;
    mask.width = width;
    mask.height = height;
    const maskCtx = mask.getContext("2d");
    if (!maskCtx) return;

    maskCtx.clearRect(0, 0, width, height);
    maskCtx.globalCompositeOperation = "source-over";
    maskCtx.globalAlpha = 1;
    maskCtx.fillStyle = "#000";
    maskCtx.fillRect(0, 0, width, height);

    if (dynamicLightingEnabled) {
      for (const light of lights) carveLight(maskCtx, light, walls);
    }

    maskCtx.globalCompositeOperation = "source-over";
    for (const shape of fog) paintFogShape(maskCtx, shape);
    if (pending) {
      paintFogShape(maskCtx, {
        kind: pending.kind,
        points: pending.points,
        radius: pending.radius,
        is_erasing: pending.isErasing,
      });
    }
    maskCtx.globalCompositeOperation = "source-over";

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = opacity;
    ctx.drawImage(mask, 0, 0);
    ctx.globalAlpha = 1;
  }, [fog, pending, dynamicLightingEnabled, lights, walls, width, height, opacity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute left-0 top-0"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    />
  );
}
