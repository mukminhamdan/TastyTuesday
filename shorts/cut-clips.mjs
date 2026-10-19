// Cuts each spec's footage proxy out of the raw call recording.
//   node cut-clips.mjs /path/to/raw.mp4 [id]
// Keyframe every 15 frames so HyperFrames can seek the many jump cuts cheaply.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const [raw, only] = process.argv.slice(2);
if (!raw) throw new Error("usage: node cut-clips.mjs <raw.mp4> [id]");
const dir = path.join(ROOT, "specs");
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort()) {
  const spec = (await import(pathToFileURL(path.join(dir, f)).href)).default;
  if (only && spec.id !== only) continue;
  const out = path.join(ROOT, "videos", spec.id, "assets", "clip.mp4");
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const inputs = spec.proxy.flatMap(([a, b]) => ["-ss", String(a), "-t", String(b - a), "-i", raw]);
  const n = spec.proxy.length;
  const graph = spec.proxy.map((_, i) => `[${i}:v][${i}:a]`).join("") + `concat=n=${n}:v=1:a=1[v][a]`;
  execFileSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-g", "15", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", out], { stdio: "inherit" });
  console.log(`${spec.id}: ${spec.proxy.map(([a, b]) => `${a}-${b}s`).join(", ")} -> ${path.relative(ROOT, out)}`);
}
