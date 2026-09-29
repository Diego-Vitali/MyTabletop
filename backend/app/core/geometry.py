"""Minimal 2D geometry for dynamic lighting's line-of-sight check (see
app/services/vision_service.py). No external dependency — this is the
authoritative half of the shadow-casting logic; the frontend's VisionLayer
re-implements the same idea in JS purely for rendering the darkness mask,
never for authorization."""

import math

Point = tuple[float, float]
Segment = tuple[Point, Point]


def _cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def segments_intersect(p1: Point, p2: Point, p3: Point, p4: Point) -> bool:
    """Strict proper-crossing test between segments p1-p2 and p3-p4. Touching
    at an endpoint or being collinear doesn't count as blocking — a token
    sitting exactly on a wall's corner is a degenerate case not worth
    special-casing for gameplay geometry."""
    d1, d2 = _cross(p3, p4, p1), _cross(p3, p4, p2)
    d3, d4 = _cross(p1, p2, p3), _cross(p1, p2, p4)
    if d1 == 0 or d2 == 0 or d3 == 0 or d4 == 0:
        return False
    return (d1 > 0) != (d2 > 0) and (d3 > 0) != (d4 > 0)


def has_line_of_sight(a: Point, b: Point, walls: list[Segment]) -> bool:
    return not any(segments_intersect(a, b, w[0], w[1]) for w in walls)


def is_visible(point: Point, light: Point, light_radius: float, walls: list[Segment]) -> bool:
    """A point is visible from a light source if it's within the light's
    radius AND nothing blocks the straight line between them."""
    if light_radius <= 0:
        return False
    if math.hypot(point[0] - light[0], point[1] - light[1]) > light_radius:
        return False
    return has_line_of_sight(light, point, walls)
