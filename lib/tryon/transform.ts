// Where the design sits on the photo, and the gesture maths that moves it.
// Everything is in photo pixels. Kept free of imports so `node --test` can load it directly.

export type Point = { x: number; y: number };

/** x/y: centre of the design. width: drawn width (height follows the design's aspect ratio). rotation in radians. */
export type Placement = { x: number; y: number; width: number; rotation: number; flip: boolean };

export function initialPlacement(photoW: number, photoH: number): Placement {
  return { x: photoW / 2, y: photoH / 2, width: Math.min(photoW, photoH) * 0.45, rotation: 0, flip: false };
}

/** Keeps the centre on the photo and the size between 5% and 200% of the photo's longer side. */
export function clampPlacement(p: Placement, photoW: number, photoH: number): Placement {
  const long = Math.max(photoW, photoH);
  return {
    ...p,
    x: Math.min(Math.max(p.x, 0), photoW),
    y: Math.min(Math.max(p.y, 0), photoH),
    width: Math.min(Math.max(p.width, long * 0.05), long * 2),
  };
}

export function drag(start: Placement, from: Point, to: Point): Placement {
  return { ...start, x: start.x + to.x - from.x, y: start.y + to.y - from.y };
}

/**
 * Two-finger gesture: a0/b0 are where the fingers started, a1/b1 where they are now.
 * The design scales and turns with the fingers and keeps the same spot under them.
 */
export function pinch(start: Placement, a0: Point, b0: Point, a1: Point, b1: Point): Placement {
  const d0 = Math.hypot(b0.x - a0.x, b0.y - a0.y);
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y);
  const s = d0 > 0 ? d1 / d0 : 1;
  const turn = Math.atan2(b1.y - a1.y, b1.x - a1.x) - Math.atan2(b0.y - a0.y, b0.x - a0.x);
  const m0 = { x: (a0.x + b0.x) / 2, y: (a0.y + b0.y) / 2 };
  const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  const ox = start.x - m0.x;
  const oy = start.y - m0.y;
  const cos = Math.cos(turn);
  const sin = Math.sin(turn);
  return {
    ...start,
    x: m1.x + s * (ox * cos - oy * sin),
    y: m1.y + s * (ox * sin + oy * cos),
    width: start.width * s,
    rotation: start.rotation + turn,
  };
}
