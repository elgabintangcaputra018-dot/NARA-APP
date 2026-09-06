const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Function to generate a basic solid color PNG with an inner badge using standard PNG chunks
function createPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(2, 9); // color type 2 (RGB)
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdr = makeChunk("IHDR", ihdrData);

  // Scanlines (raw pixel data: filter byte + RGB bytes per scanline)
  const rowStride = 1 + width * 3;
  const rawData = Buffer.alloc(rowStride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowStride;
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;

      // Distance from center
      const dx = x - width / 2;
      const dy = y - height / 2;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Circle mascot silhouette in center
      const isCircle = dist < width * 0.35;
      const isBorder = dist >= width * 0.35 && dist < width * 0.38;

      if (isCircle) {
        // White fox shape
        rawData[pxOffset] = 255;
        rawData[pxOffset + 1] = 255;
        rawData[pxOffset + 2] = 255;
      } else if (isBorder) {
        // Blue accent rim
        rawData[pxOffset] = 37;
        rawData[pxOffset + 1] = 99;
        rawData[pxOffset + 2] = 235;
      } else {
        // Dark brand background (#121212)
        rawData[pxOffset] = r;
        rawData[pxOffset + 1] = g;
        rawData[pxOffset + 2] = b;
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk("IDAT", compressed);
  const iend = makeChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 implementation
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

const iconsDir = path.join(__dirname, "..", "public", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, "icon-192x192.png"), createPng(192, 192, 18, 18, 18));
fs.writeFileSync(path.join(iconsDir, "icon-512x512.png"), createPng(512, 512, 18, 18, 18));
console.log("Successfully generated icon-192x192.png and icon-512x512.png!");
