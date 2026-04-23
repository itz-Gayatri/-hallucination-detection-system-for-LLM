/**
 * Run this once to generate the extension icons:
 *   node extension/icons/generate-icons.js
 *
 * Requires: npm install canvas  (or: npm install -g canvas)
 * OR use the pure-JS fallback below which writes minimal valid PNGs.
 */

const fs = require('fs');
const path = require('path');

// ── Minimal valid PNG writer (no dependencies) ────────────────────────────────
// Generates a solid indigo (#4f46e5) square PNG at the given size.

function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function uint32BE(n) {
  return Buffer.from([(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff]);
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const combined  = Buffer.concat([typeBytes, data]);
  const crc       = crc32(combined);
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc)]);
}

function deflateRaw(data) {
  // Minimal zlib wrapper (uncompressed deflate blocks, no actual compression)
  const chunks = [];
  const BLOCK  = 65535;
  for (let i = 0; i < data.length; i += BLOCK) {
    const slice = data.slice(i, i + BLOCK);
    const last  = (i + BLOCK >= data.length) ? 1 : 0;
    const hdr   = Buffer.from([last, slice.length & 0xff, (slice.length >> 8) & 0xff,
                                (~slice.length) & 0xff, ((~slice.length) >> 8) & 0xff]);
    chunks.push(hdr, slice);
  }
  // Adler-32
  let s1 = 1, s2 = 0;
  for (const b of data) { s1 = (s1 + b) % 65521; s2 = (s2 + s1) % 65521; }
  const adler = Buffer.from([(s2 >> 8) & 0xff, s2 & 0xff, (s1 >> 8) & 0xff, s1 & 0xff]);
  // zlib header (deflate, no dict, check bits)
  return Buffer.concat([Buffer.from([0x78, 0x01]), ...chunks, adler]);
}

function makePNG(size, r, g, b) {
  const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit depth, RGB, no interlace
  ]);
  const IHDR = pngChunk('IHDR', ihdrData);

  // IDAT — raw scanlines: filter byte (0) + RGB pixels
  const scanline = Buffer.alloc(1 + size * 3);
  scanline[0] = 0; // filter type None
  for (let x = 0; x < size; x++) {
    // Draw a simple shield shape: solid background with slightly lighter center
    const cx = Math.abs(x - size / 2) / (size / 2);
    scanline[1 + x * 3]     = r;
    scanline[1 + x * 3 + 1] = g;
    scanline[1 + x * 3 + 2] = b;
  }
  const rawData = Buffer.concat(Array(size).fill(scanline));
  const IDAT = pngChunk('IDAT', deflateRaw(rawData));

  const IEND = pngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([PNG_SIG, IHDR, IDAT, IEND]);
}

// Indigo brand color: #4f46e5 = rgb(79, 70, 229)
const R = 79, G = 70, B = 229;

const sizes = [16, 48, 128];
const dir   = __dirname;

for (const size of sizes) {
  const png  = makePNG(size, R, G, B);
  const file = path.join(dir, `icon${size}.png`);
  fs.writeFileSync(file, png);
  console.log(`✅ Created ${file} (${png.length} bytes)`);
}

console.log('\nDone! Reload the extension in chrome://extensions');
