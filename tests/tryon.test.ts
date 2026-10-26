import { test } from "node:test";
import assert from "node:assert/strict";
import { clampPlacement, drag, initialPlacement, pinch } from "../lib/tryon/transform.ts";
import { paperColour, whitenPaper } from "../lib/tryon/cleanup.ts";

const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("design starts centred at 45% of the shorter side", () => {
  const p = initialPlacement(1000, 2000);
  assert.deepEqual(p, { x: 500, y: 1000, width: 450, rotation: 0, flip: false });
});

test("drag moves the centre by the finger's movement", () => {
  const p = drag(initialPlacement(1000, 1000), { x: 10, y: 10 }, { x: 60, y: -20 });
  assert.equal(p.x, 550);
  assert.equal(p.y, 470);
});

test("spreading two fingers to double distance doubles the size around their midpoint", () => {
  const start = { x: 500, y: 500, width: 200, rotation: 0, flip: false };
  const p = pinch(start, { x: 400, y: 500 }, { x: 600, y: 500 }, { x: 300, y: 500 }, { x: 700, y: 500 });
  close(p.width, 400);
  close(p.x, 500);
  close(p.y, 500);
  close(p.rotation, 0);
});

test("twisting fingers a quarter turn rotates the design and swings an off-centre design with them", () => {
  const start = { x: 600, y: 500, width: 200, rotation: 0, flip: false };
  // fingers centred on (500,500), turned 90° clockwise on screen (y down)
  const p = pinch(start, { x: 400, y: 500 }, { x: 600, y: 500 }, { x: 500, y: 400 }, { x: 500, y: 600 });
  close(p.rotation, Math.PI / 2);
  close(p.width, 200);
  close(p.x, 500);
  close(p.y, 600);
});

test("moving both fingers together just moves the design", () => {
  const start = { x: 500, y: 500, width: 200, rotation: 0.3, flip: true };
  const p = pinch(start, { x: 400, y: 500 }, { x: 600, y: 500 }, { x: 450, y: 550 }, { x: 650, y: 550 });
  close(p.x, 550);
  close(p.y, 550);
  close(p.width, 200);
  close(p.rotation, 0.3);
  assert.equal(p.flip, true);
});

test("clamp keeps the centre on the photo and the size sensible", () => {
  const p = clampPlacement({ x: -50, y: 5000, width: 1, rotation: 0, flip: false }, 1000, 800);
  assert.equal(p.x, 0);
  assert.equal(p.y, 800);
  assert.equal(p.width, 50);
  assert.equal(clampPlacement({ ...p, width: 99999 }, 1000, 800).width, 2000);
});

function image(w: number, h: number, fill: [number, number, number, number]) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < d.length; i += 4) d.set(fill, i);
  return d;
}
const px = (d: Uint8ClampedArray, w: number, x: number, y: number) => Array.from(d.slice((y * w + x) * 4, (y * w + x) * 4 + 4));

test("paper colour is read from the border, ignoring the ink in the middle", () => {
  const w = 100, h = 100;
  const d = image(w, h, [230, 220, 200, 255]);
  for (let y = 30; y < 70; y++) for (let x = 30; x < 70; x++) d.set([0, 0, 0, 255], (y * w + x) * 4);
  assert.deepEqual(paperColour(d, w, h), [230, 220, 200]);
});

test("cream paper turns pure white while black ink stays black", () => {
  const w = 100, h = 100;
  const d = image(w, h, [230, 220, 200, 255]);
  d.set([20, 20, 20, 255], (50 * w + 50) * 4);
  whitenPaper(d, w, h);
  assert.deepEqual(px(d, w, 5, 5), [255, 255, 255, 255]);
  const ink = px(d, w, 50, 50);
  assert.ok(ink[0] < 40 && ink[1] < 40 && ink[2] < 40, `ink became ${ink}`);
});

test("coloured ink keeps its colour", () => {
  const w = 100, h = 100;
  const d = image(w, h, [255, 255, 255, 255]);
  d.set([200, 40, 40, 255], (50 * w + 50) * 4);
  whitenPaper(d, w, h);
  assert.deepEqual(px(d, w, 50, 50), [200, 40, 40, 255]);
});

test("transparent pixels are flattened onto white", () => {
  const w = 10, h = 10;
  const d = image(w, h, [0, 0, 0, 0]);
  whitenPaper(d, w, h);
  assert.deepEqual(px(d, w, 5, 5), [255, 255, 255, 255]);
});

test("a dark background is left alone", () => {
  const w = 20, h = 20;
  const d = image(w, h, [30, 30, 30, 255]);
  whitenPaper(d, w, h);
  assert.deepEqual(px(d, w, 0, 0), [30, 30, 30, 255]);
});
