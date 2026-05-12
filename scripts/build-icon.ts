#!/usr/bin/env tsx
// scripts/build-icon.ts
// Renders assets/icon.png — the 1024×1024 app icon devvit.json's marketingAssets.icon
// points at. Self-contained (no native image deps): builds an RGBA buffer with a
// few SDF-shaded shapes and encodes a PNG via node:zlib. Run: `npm run build:icon`.
//
// Design: a rounded teal square (vibe-mod brand), a white rounded "speech bubble"
// with a teal checkmark — "write a moderation rule in English; it works."
// It's intentionally simple; a designer can replace assets/icon.png anytime.

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const N = 1024;
type RGB = [number, number, number];
const TEAL: RGB = [13, 58, 58]; // #0d3a3a
const TEAL_BRIGHT: RGB = [21, 122, 122]; // #157a7a
const WHITE: RGB = [248, 250, 249];

// signed distance to a rounded rect centred at (cx,cy), half-extents (hx,hy), radius r
function sdRoundedRect(px: number, py: number, cx: number, cy: number, hx: number, hy: number, r: number): number {
  const qx = Math.abs(px - cx) - hx + r;
  const qy = Math.abs(py - cy) - hy + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}
// signed distance to the segment a→b
function sdSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax,
    dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
// alpha for "inside if d<0", with ~1px antialiasing
const cov = (d: number) => Math.max(0, Math.min(1, 0.5 - d));
const lerp = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const rgba = Buffer.alloc(N * N * 4);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    // vertical gradient background within the rounded square; transparent outside
    const dBg = sdRoundedRect(x, y, N / 2, N / 2, N / 2 - 8, N / 2 - 8, 200);
    const bgT = y / N;
    let c: RGB = lerp(TEAL, [TEAL[0] * 1.4, TEAL[1] * 1.4, TEAL[2] * 1.4], bgT);
    let a = cov(dBg);

    // speech bubble (rounded rect + a little tail), white
    const dBubble = Math.min(
      sdRoundedRect(x, y, 512, 470, 290, 230, 80),
      sdSegment(x, y, 360, 660, 470, 660) - 60, // tail-ish blob, clipped by the square below
    );
    const aB = cov(dBubble);
    if (aB > 0) {
      c = lerp(c, WHITE, aB);
      a = Math.max(a, cov(dBg)); // keep clipped to the square
    }

    // checkmark inside the bubble, teal-bright
    const dCheck = Math.min(sdSegment(x, y, 400, 480, 480, 560), sdSegment(x, y, 480, 560, 660, 360)) - 34;
    const aC = cov(dCheck) * cov(dBubble + 40); // only where the bubble is
    if (aC > 0) c = lerp(c, TEAL_BRIGHT, aC);

    const i = (y * N + x) * 4;
    rgba[i] = Math.round(c[0]);
    rgba[i + 1] = Math.round(c[1]);
    rgba[i + 2] = Math.round(c[2]);
    rgba[i + 3] = Math.round(255 * a);
  }
}

// --- minimal PNG encoder (RGBA, no filters) ---
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(N, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type RGBA
// raw = each scanline prefixed with filter byte 0
const raw = Buffer.alloc(N * (N * 4 + 1));
for (let y = 0; y < N; y++) {
  raw[y * (N * 4 + 1)] = 0;
  rgba.copy(raw, y * (N * 4 + 1) + 1, y * N * 4, (y + 1) * N * 4);
}
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(process.cwd(), 'assets', 'icon.png');
writeFileSync(out, png);
console.log(`wrote ${out} — ${N}×${N}, ${(png.length / 1024).toFixed(1)} KB`);
