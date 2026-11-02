// Build-time image enhancement for the isolated Everywear scroll experiment.
// The original 720p files remain untouched in /public/scroll-frames.
// The published files in /scroll-frames-hd have 1920x1080 resolution.
// This is traditional resampling, not generative super-resolution.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const inputDir = resolve("public/scroll-frames");
const outputDir = resolve("public/scroll-frames-hd");
await mkdir(outputDir, { recursive: true });

const rows = [];
const hdFrames = [];
const originalFrames = [];
let totalBytes = 0;
for (let frameNumber = 1; frameNumber <= 60; frameNumber++) {
  const filename = `frame_${String(frameNumber).padStart(3, "0")}.webp`;
  const source = await readFile(join(inputDir, filename));
  originalFrames.push(source);
  const original = await sharp(source).metadata();

  if (original.width !== 1280 || original.height !== 720) {
    throw new Error(`Frame ${filename}: expected 1280x720, received ${original.width}x${original.height}`);
  }

  // Lanczos enlargement with subtle contrast and sharpening; preserve the
  // original 16:9 framing and avoid aggressive halo artifacts around fabric.
  const enhanced = await sharp(source)
    .resize(1920, 1080, { kernel: sharp.kernel.lanczos3, fit: "fill" })
    .linear(1.025, -3)
    .sharpen({ sigma: 0.8, m1: 0.65, m2: 1.5 })
    .webp({ quality: 87, effort: 5 })
    .toBuffer();

  await writeFile(join(outputDir, filename), enhanced);
  hdFrames.push(enhanced);
  totalBytes += enhanced.length;
  rows.push({ file: filename, width: 1920, height: 1080, size: enhanced.length });
}

// One HTTP request for the complete frame set, rather than 60 requests.
// E W F R + uint32 number of frames + uint32 size per frame + WebP bytes.
function packSequence(buffers) {
  const header = Buffer.alloc(8 + buffers.length * 4);
  header.write("EWFR", 0, "ascii");
  header.writeUInt32LE(buffers.length, 4);
  buffers.forEach((buffer, i) => header.writeUInt32LE(buffer.length, 8 + i * 4));
  return Buffer.concat([header, ...buffers]);
}
await Promise.all([
  writeFile(join(outputDir, "sequence.pack"), packSequence(hdFrames)),
  writeFile(join(inputDir, "sequence.pack"), packSequence(originalFrames))
]);

await writeFile(join(outputDir, "manifest.json"), JSON.stringify({
  origin: "Everywear scroll video, sampled from original 720p frames",
  processing: "Lanczos3 1.5x upscale, mild contrast and sharpening",
  count: rows.length,
  resolution: [1920, 1080],
  totalBytes,
  frames: rows,
}, null, 2));

console.log(`Everywear scroll HD: generated ${rows.length} WebP frames at 1920x1080 (${(totalBytes/1024/1024).toFixed(2)} MiB)`);
