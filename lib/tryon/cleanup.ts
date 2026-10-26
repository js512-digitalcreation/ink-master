// Turns a photographed or scanned design into clean ink on pure white, so the multiply blend
// leaves skin untouched wherever there's paper. Kept free of imports so `node --test` can load it.

/** Median colour of the outer border (about 3% of the image), which is almost always bare paper. */
export function paperColour(data: Uint8ClampedArray, w: number, h: number): [number, number, number] {
  const band = Math.max(1, Math.round(Math.min(w, h) * 0.03));
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let n = 0;
  for (let y = 0; y < h; y++) {
    const edgeRow = y < band || y >= h - band;
    for (let x = 0; x < w; x++) {
      if (!edgeRow && x >= band && x < w - band) continue;
      const i = (y * w + x) * 4;
      hist[0][data[i]]++;
      hist[1][data[i + 1]]++;
      hist[2][data[i + 2]]++;
      n++;
    }
  }
  const median = (hst: Uint32Array) => {
    let seen = 0;
    for (let v = 0; v < 256; v++) {
      seen += hst[v];
      if (seen * 2 >= n) return v;
    }
    return 255;
  };
  return [median(hist[0]), median(hist[1]), median(hist[2])];
}

/**
 * In place: flattens transparency onto white, then white-balances against the paper colour
 * and pushes near-white to pure white with a soft edge. Dark or unusual backgrounds
 * (paper darker than mid-grey) are left alone apart from the flattening.
 */
export function whitenPaper(data: Uint8ClampedArray, w: number, h: number) {
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3] / 255;
    if (a < 1) {
      data[i] = data[i] * a + 255 * (1 - a);
      data[i + 1] = data[i + 1] * a + 255 * (1 - a);
      data[i + 2] = data[i + 2] * a + 255 * (1 - a);
      data[i + 3] = 255;
    }
  }

  const paper = paperColour(data, w, h);
  if ((paper[0] + paper[1] + paper[2]) / 3 < 128) return;

  const LOW = 215; // brighter than this starts fading to white…
  const HIGH = 240; // …and from here up it's pure white
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.min(255, (data[i] * 255) / Math.max(paper[0], 1));
    const g = Math.min(255, (data[i + 1] * 255) / Math.max(paper[1], 1));
    const b = Math.min(255, (data[i + 2] * 255) / Math.max(paper[2], 1));
    // Judge by the darkest channel: only near-white (all channels high) is paper. Bright yellow
    // has a dark blue channel, so it stays ink.
    const low = Math.min(r, g, b);
    const t = low <= LOW ? 0 : low >= HIGH ? 1 : (low - LOW) / (HIGH - LOW);
    data[i] = r + (255 - r) * t;
    data[i + 1] = g + (255 - g) * t;
    data[i + 2] = b + (255 - b) * t;
  }
}
