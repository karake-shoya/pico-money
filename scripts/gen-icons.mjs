// 依存なしで PWA アイコン(PNG)を生成する。
// ブランド色の角丸背景に、白い円＋「¥」マークを描く。
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
const appDir = join(__dirname, "..", "app");
mkdirSync(publicDir, { recursive: true });

const BRAND = [79, 70, 229]; // #4f46e5 indigo
const WHITE = [255, 255, 255];

function makeCanvas(size) {
  // RGBA バッファ（透明で初期化）
  return { size, buf: new Uint8Array(size * size * 4) };
}
function setPx(c, x, y, [r, g, b], a = 255) {
  if (x < 0 || y < 0 || x >= c.size || y >= c.size) return;
  const i = (y * c.size + x) * 4;
  c.buf[i] = r;
  c.buf[i + 1] = g;
  c.buf[i + 2] = b;
  c.buf[i + 3] = a;
}
// 角丸の塗りつぶし矩形（背景全面に角丸を付ける）
function fillRoundedRect(c, x0, y0, x1, y1, rad, color) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // 4隅の角丸判定
      let inside = true;
      const corners = [
        [x0 + rad, y0 + rad],
        [x1 - rad, y0 + rad],
        [x0 + rad, y1 - rad],
        [x1 - rad, y1 - rad],
      ];
      if (x < x0 + rad && y < y0 + rad)
        inside = dist(x, y, corners[0]) <= rad;
      else if (x >= x1 - rad && y < y0 + rad)
        inside = dist(x, y, corners[1]) <= rad;
      else if (x < x0 + rad && y >= y1 - rad)
        inside = dist(x, y, corners[2]) <= rad;
      else if (x >= x1 - rad && y >= y1 - rad)
        inside = dist(x, y, corners[3]) <= rad;
      if (inside) setPx(c, x, y, color);
    }
  }
}
function dist(x, y, [cx, cy]) {
  return Math.hypot(x - cx, y - cy);
}
function fillCircle(c, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (dist(x, y, [cx, cy]) <= r) setPx(c, x, y, color);
    }
  }
}
// 太さのある線分
function thickLine(c, x0, y0, x1, y1, w, color) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    fillCircle(c, x, y, w / 2, color);
  }
}

function drawIcon(size, { padScale }) {
  const c = makeCanvas(size);
  // 背景（角丸 or 全面）。maskable はセーフゾーン確保のため余白を取らず全面塗り。
  const m = size * padScale;
  fillRoundedRect(c, m, m, size - m, size - m, (size - 2 * m) * 0.22, BRAND);

  // 中央の白い円
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.3;
  fillCircle(c, cx, cy, r, WHITE);

  // 「¥」マーク（ブランド色）
  const w = size * 0.05; // 線幅
  const top = cy - r * 0.55;
  const mid = cy - r * 0.05;
  const bottom = cy + r * 0.55;
  const left = cx - r * 0.45;
  const right = cx + r * 0.45;
  // V字（上の2本の斜め線）
  thickLine(c, left, top, cx, mid, w, BRAND);
  thickLine(c, right, top, cx, mid, w, BRAND);
  // 縦棒
  thickLine(c, cx, mid, cx, bottom, w, BRAND);
  // 横棒2本
  thickLine(c, left, mid + r * 0.18, right, mid + r * 0.18, w * 0.8, BRAND);
  thickLine(c, left, mid + r * 0.42, right, mid + r * 0.42, w * 0.8, BRAND);

  return c;
}

// --- PNG エンコード ---
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}
function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(c) {
  const { size, buf } = c;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 各行先頭に filter byte(0) を付与
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    buf.subarray(y * size * 4, (y + 1) * size * 4).forEach((v, i) => {
      raw[y * (size * 4 + 1) + 1 + i] = v;
    });
  }
  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const targets = [
  { name: "icon-192.png", size: 192, padScale: 0, dir: publicDir },
  { name: "icon-512.png", size: 512, padScale: 0, dir: publicDir },
  { name: "icon-maskable-512.png", size: 512, padScale: 0, dir: publicDir },
  // apple-icon は Next の file convention に従い app/ に置く
  { name: "apple-icon.png", size: 180, padScale: 0, dir: appDir },
];
for (const t of targets) {
  const c = drawIcon(t.size, { padScale: t.padScale });
  writeFileSync(join(t.dir, t.name), encodePNG(c));
  console.log("wrote", t.name);
}
