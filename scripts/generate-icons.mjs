import fs from 'fs';
import zlib from 'zlib';

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCRC32Table();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePNG(width, height, drawPixel, isMaskable = false) {
  const rowStride = 1 + width * 4;
  const rawData = Buffer.alloc(rowStride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawPixel(x, y, width, height, isMaskable);
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter none
  ihdrData[12] = 0; // No interlace

  const ihdr = makeChunk('IHDR', ihdrData);
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function drawMouseIcon(x, y, w, h, isMaskable) {
  // Normalize coords
  const nx = x / w;
  const ny = y / h;
  const cx = 0.5, cy = 0.5;

  // Background: Dark Slate 950 / 900 gradient with subtle radial glow
  const distFromCenter = Math.hypot(nx - cx, ny - cy);
  
  if (!isMaskable && distFromCenter > 0.48) {
    // Transparent outside circle for normal icon
    return [0, 0, 0, 0];
  }

  // Base background: Slate 900
  let r = 15, g = 23, b = 42, a = 255; // #0f172a
  
  // Outer subtle border
  if (!isMaskable && distFromCenter > 0.45) {
    return [245, 158, 11, 255]; // Amber border
  }

  // Radial amber aura
  if (distFromCenter < 0.42) {
    const aura = Math.max(0, 1 - (distFromCenter / 0.42));
    r = Math.min(255, r + Math.floor(aura * 40));
    g = Math.min(255, g + Math.floor(aura * 30));
    b = Math.min(255, b + Math.floor(aura * 15));
  }

  // Mouse Body / Face centered (scaled inside safe zone for maskable)
  const scale = isMaskable ? 0.72 : 0.85;
  const mx = (nx - cx) / scale + 0.5;
  const my = (ny - cy) / scale + 0.5;

  // Cheese wedge on the right/bottom
  const cdx = mx - 0.62;
  const cdy = my - 0.58;
  if (cdx > -0.15 && cdx < 0.15 && cdy > -0.15 && cdy < 0.15 && (cdy > -cdx * 0.8)) {
    // Cheese body: #f59e0b to #fbbf24
    return [251, 191, 36, 255];
  }

  // Mouse Body: Oval
  const bx = (mx - 0.45) / 0.22;
  const by = (my - 0.52) / 0.16;
  if (bx * bx + by * by <= 1.0) {
    // Slate 400 mouse body
    return [148, 163, 184, 255];
  }

  // Mouse Ear 1
  const e1x = (mx - 0.38) / 0.09;
  const e1y = (my - 0.35) / 0.09;
  if (e1x * e1x + e1y * e1y <= 1.0) {
    if (e1x * e1x + e1y * e1y <= 0.45) {
      return [244, 114, 182, 255]; // Pink inner ear
    }
    return [100, 116, 139, 255];
  }

  // Mouse Ear 2
  const e2x = (mx - 0.52) / 0.08;
  const e2y = (my - 0.36) / 0.08;
  if (e2x * e2x + e2y * e2y <= 1.0) {
    if (e2x * e2x + e2y * e2y <= 0.45) {
      return [244, 114, 182, 255]; // Pink inner ear
    }
    return [100, 116, 139, 255];
  }

  // Mouse Nose / Snout
  const snx = (mx - 0.65) / 0.04;
  const sny = (my - 0.54) / 0.04;
  if (snx * snx + sny * sny <= 1.0) {
    return [244, 114, 182, 255]; // Pink nose
  }

  // Mouse Eye
  const eyx = (mx - 0.55) / 0.025;
  const eyy = (my - 0.47) / 0.03;
  if (eyx * eyx + eyy * eyy <= 1.0) {
    return [15, 23, 42, 255]; // Dark eye
  }

  return [r, g, b, a];
}

console.log('Generating PNG icons...');
fs.writeFileSync('public/pwa-192x192.png', generatePNG(192, 192, drawMouseIcon, false));
fs.writeFileSync('public/pwa-512x512.png', generatePNG(512, 512, drawMouseIcon, false));
fs.writeFileSync('public/pwa-maskable-512x512.png', generatePNG(512, 512, drawMouseIcon, true));
fs.writeFileSync('public/apple-touch-icon.png', generatePNG(180, 180, drawMouseIcon, false));
fs.copyFileSync('public/pwa-192x192.png', 'public/favicon.ico');
console.log('PNG icons created successfully!');
