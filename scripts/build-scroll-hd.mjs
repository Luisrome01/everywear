// Everywear video-scroll-test: reconstruct the original 97-frame 1080p
// sequence from versioned binary chunks, with no dependency on external URLs.
// Source: Everywear_video_1080p_sin_marca.mp4 (not the later v2/v3 edits).
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import sharp from "sharp";

const count = 97;
const sourceDir = resolve("assets/scroll-vino-source");
const mobileDir = resolve("public/scroll-frames");
const hdDir = resolve("public/scroll-frames-hd");
const parts = await Promise.all(
  Array.from({length: 16}, (_, i) =>
    readFile(join(sourceDir, "part_" + String(i).padStart(3, "0") + ".bin")))
);
const archive = Buffer.concat(parts);
const digest = createHash("sha256").update(archive).digest("hex");
const expected = "ece46a3218a0829a14a13ca9a8d1c69a139faac1bf75088bf64fa13e4d537399";
if (digest !== expected) throw Error("Source archive integrity check failed: " + digest);

function extractZip(buffer) {
  const entries = new Map();
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressed = buffer.readUInt32LE(offset + 18);
    const original = buffer.readUInt32LE(offset + 22);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    if (flags & 8) throw Error("Unsupported data descriptor in source ZIP");
    const start = offset + 30 + nameLength + extraLength;
    if (start + compressed > buffer.length) throw Error("Truncated ZIP entry");
    const filename = buffer.toString("utf8", offset + 30, offset + 30 + nameLength);
    const packed = buffer.subarray(start, start + compressed);
    const contents = method === 0 ? packed
      : method === 8 ? inflateRawSync(packed)
      : (() => {throw Error("Unsupported ZIP compression: " + method);})();
    if (contents.length !== original) throw Error("ZIP entry size mismatch: " + filename);
    entries.set(filename, contents);
    offset = start + compressed;
  }
  return entries;
}

function packSequence(buffers) {
  const header = Buffer.alloc(8 + buffers.length * 4);
  header.write("EWFR", 0, "ascii");
  header.writeUInt32LE(buffers.length, 4);
  buffers.forEach((buffer, i) => header.writeUInt32LE(buffer.length, 8 + i * 4));
  return Buffer.concat([header, ...buffers]);
}

const source = extractZip(archive);
if (source.size !== count + 1 || !source.has("manifest.json")) {
  throw Error("Expected 97 image frames plus manifest.json, got " + source.size);
}
const manifest = JSON.parse(source.get("manifest.json").toString("utf8"));
if (manifest.fotogramas !== count ||
    manifest.fuente !== "Everywear_video_1080p_sin_marca.mp4") {
  throw Error("Unexpected source manifest");
}

await Promise.all([rm(mobileDir, {recursive:true,force:true}), rm(hdDir, {recursive:true,force:true})]);
await Promise.all([mkdir(mobileDir,{recursive:true}), mkdir(hdDir,{recursive:true})]);
const hdImages = [], mobileImages = [], rows = [];
for (let i = 1; i <= count; i++) {
  const name = "frame_" + String(i).padStart(3, "0") + ".webp";
  const original = source.get(name);
  if (!original) throw Error("Missing source frame: " + name);
  const details = await sharp(original).metadata();
  if (details.format !== "webp" || details.width !== 1920 || details.height !== 1072) {
    throw Error("Wrong format/resolution in " + name);
  }
  const mobile = await sharp(original)
    .resize({width:1280,withoutEnlargement:true,kernel:sharp.kernel.lanczos3})
    .webp({quality:88,effort:4}).toBuffer();
  hdImages.push(original);
  mobileImages.push(mobile);
  await Promise.all([
    writeFile(join(hdDir,name),original),
    writeFile(join(mobileDir,name),mobile)
  ]);
  rows.push({file:name,hdBytes:original.length,mobileBytes:mobile.length});
}
await Promise.all([
  writeFile(join(hdDir,"sequence.pack"),packSequence(hdImages)),
  writeFile(join(mobileDir,"sequence.pack"),packSequence(mobileImages)),
  writeFile(join(hdDir,"manifest.json"),JSON.stringify({
    source:manifest.fuente,frameCount:count,resolution:[1920,1072],frames:rows
  },null,2))
]);
console.log("Everywear vino scroll: generated " + count +
  " frames at 1920x1072 plus lightweight mobile 1280px pack, from SHA256 " + digest.slice(0,12));
