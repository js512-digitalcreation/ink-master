// Loads images for the try-on and draws the photo + design (+ tag) onto a canvas.
import type { Placement } from "./transform";
import { whitenPaper } from "./cleanup";

const MAX_PHOTO = 2048;
const MAX_DESIGN = 1600;

function canvasOf(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function loadImage(src: string, crossOrigin: boolean) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image failed to load"));
    img.src = src;
  });
}

function fitted(img: HTMLImageElement, max: number) {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const c = canvasOf(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

/** The client's photo, scaled down to at most 2048 px. Browsers apply the EXIF rotation when decoding. */
export async function loadPhoto(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return fitted(await loadImage(url, false), MAX_PHOTO);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The design with its paper turned pure white, ready for the multiply blend. */
export async function loadDesign(src: string) {
  const c = fitted(await loadImage(src, true), MAX_DESIGN);
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  whitenPaper(img.data, c.width, c.height);
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Photo with the design blended in. fade is the ink strength, 0–1. */
export function drawScene(ctx: CanvasRenderingContext2D, photo: HTMLCanvasElement, design: HTMLCanvasElement, p: Placement, fade: number) {
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.filter = "none";
  ctx.drawImage(photo, 0, 0);

  const h = (p.width * design.height) / design.width;
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = fade;
  // A touch of softness so the edges read as ink in skin rather than a sticker.
  ctx.filter = `blur(${Math.max(0.3, photo.width / 5000).toFixed(2)}px)`;
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rotation);
  ctx.scale(p.flip ? -1 : 1, 1);
  ctx.drawImage(design, -p.width / 2, -h / 2, p.width, h);
  ctx.restore();
}

function drawTag(ctx: CanvasRenderingContext2D, w: number, h: number, text: string) {
  const size = Math.max(14, Math.round(Math.min(w, h) * 0.028));
  const pad = Math.round(size * 0.6);
  ctx.save();
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const tw = ctx.measureText(text).width;
  const bw = tw + pad * 2;
  const bh = size + pad * 1.4;
  const x = w - bw - pad;
  const y = h - bh - pad;
  ctx.fillStyle = "rgba(12, 13, 17, 0.72)";
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#f1eee8";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + pad, y + bh / 2);
  ctx.restore();
}

/** The finished, tagged JPEG for saving, sharing or attaching to a booking. */
export function exportImage(photo: HTMLCanvasElement, design: HTMLCanvasElement, p: Placement, fade: number, tag: string) {
  const c = canvasOf(photo.width, photo.height);
  const ctx = c.getContext("2d")!;
  drawScene(ctx, photo, design, p, fade);
  drawTag(ctx, c.width, c.height, tag);
  return new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image"))), "image/jpeg", 0.9)
  );
}
