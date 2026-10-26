"use client";

import { useEffect, useRef } from "react";
import { type Placement, type Point, clampPlacement, drag, pinch } from "@/lib/tryon/transform";
import { drawScene } from "@/lib/tryon/render";

type Props = {
  photo: HTMLCanvasElement;
  design: HTMLCanvasElement;
  placement: Placement;
  fade: number;
  onChange: (p: Placement) => void;
};

/** The live preview. One finger moves the design, two fingers resize and rotate it, the mouse wheel resizes. */
export function Stage({ photo, design, placement, fade, onChange }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{ start: Placement; points: Map<number, Point> } | null>(null);
  const latest = useRef(placement);
  latest.current = placement;

  useEffect(() => {
    const c = canvas.current!;
    if (c.width !== photo.width || c.height !== photo.height) {
      c.width = photo.width;
      c.height = photo.height;
    }
    const frame = requestAnimationFrame(() => drawScene(c.getContext("2d")!, photo, design, placement, fade));
    return () => cancelAnimationFrame(frame);
  }, [photo, design, placement, fade]);

  function toPhoto(e: { clientX: number; clientY: number }): Point {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * photo.width) / r.width, y: ((e.clientY - r.top) * photo.height) / r.height };
  }

  // Each time a finger is added or lifted, restart the gesture from where things are now.
  function restart() {
    gesture.current = pointers.current.size ? { start: latest.current, points: new Map(pointers.current) } : null;
  }

  function down(e: React.PointerEvent) {
    canvas.current!.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, toPhoto(e));
    restart();
  }

  function move(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, toPhoto(e));
    const g = gesture.current;
    if (!g) return;
    const ids = [...g.points.keys()].filter((id) => pointers.current.has(id));
    let next: Placement;
    if (ids.length >= 2) {
      const [a, b] = ids;
      next = pinch(g.start, g.points.get(a)!, g.points.get(b)!, pointers.current.get(a)!, pointers.current.get(b)!);
    } else if (ids.length === 1) {
      next = drag(g.start, g.points.get(ids[0])!, pointers.current.get(ids[0])!);
    } else return;
    latest.current = clampPlacement(next, photo.width, photo.height);
    onChange(latest.current);
  }

  function up(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    restart();
  }

  useEffect(() => {
    const c = canvas.current!;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = latest.current;
      latest.current = clampPlacement({ ...p, width: p.width * Math.exp(-e.deltaY / 500) }, photo.width, photo.height);
      onChange(latest.current);
    };
    c.addEventListener("wheel", wheel, { passive: false });
    return () => c.removeEventListener("wheel", wheel);
  }, [onChange, photo]);

  return (
    <canvas
      ref={canvas}
      className="to-stage"
      style={{ width: `min(100%, calc(68dvh * ${photo.width / photo.height}))` }}
      role="img"
      aria-label="Your photo with the design on it. Drag to move, pinch to resize and rotate."
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    />
  );
}
