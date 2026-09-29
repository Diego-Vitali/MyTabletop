import { useEffect, useRef } from "react";
import type { FogStroke, Point } from "@/lib/types";

/** Paints the DM's fog-of-war brush strokes onto a canvas the size of the
 * background image, inside the same transformed coordinate space as tokens
 * (see VttView) — so it pans/zooms with the map for free via CSS transform.
 * `pending` is the in-progress stroke being drawn right now, if any. */
export function FogLayer({
  fog,
  pending,
  width,
  height,
  interactive,
  dmView,
}: {
  fog: FogStroke[];
  pending: { points: Point[]; radius: number; isErasing: boolean } | null;
  width: number;
  height: number;
  interactive: boolean;
  /** DMs see fogged areas dimmed rather than fully opaque, so they can still
   * work with the map — purely a rendering choice, no data is hidden from
   * the DM either way. Players always get full opacity. */
  dmView: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fillStyle = dmView ? "rgba(10, 8, 7, 0.55)" : "rgba(10, 8, 7, 0.94)";

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = fillStyle;
    ctx.fillRect(0, 0, width, height);

    const strokeAll = [...fog, ...(pending ? [{ id: "__pending__", points: pending.points, radius: pending.radius, is_erasing: pending.isErasing }] : [])];
    for (const stroke of strokeAll) {
      if (stroke.points.length === 0) continue;
      ctx.globalCompositeOperation = stroke.is_erasing ? "destination-out" : "source-over";
      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = fillStyle;
      ctx.lineWidth = stroke.radius * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      if (stroke.points.length === 1) ctx.lineTo(stroke.points[0].x + 0.01, stroke.points[0].y);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }, [fog, pending, width, height, fillStyle]);

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
