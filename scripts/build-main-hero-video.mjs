import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const source = "assets/hero-video-source";
const destination = "public/videos";
const filename = "everywear-bolsa-vino-2026.mp4";
const count = 16;
const chunks = await Promise.all(
  Array.from({ length: count }, (_, i) =>
    readFile(join(source, "part_" + String(i).padStart(3, "0") + ".bin")))
);
const content = Buffer.concat(chunks);
const expected = "311f66ea833f2d327be9bb7badcf91742bfc61ec843771abdaae3d113cd7e158";
const actual = createHash("sha256").update(content).digest("hex");
if (actual !== expected || content.length !== 2551143) {
  throw new Error("Everywear source video integrity mismatch (" + actual + ")");
}
await mkdir(destination, { recursive: true });
await writeFile(join(destination, filename), content);
console.log("Everywear Home: original 1920x1072 MP4 ready, " + content.length + " bytes.");
