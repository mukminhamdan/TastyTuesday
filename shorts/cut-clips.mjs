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
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(spec.proxyIn), "-i", raw, "-t", String(spec.proxyOut - spec.proxyIn),
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-g", "15", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", out], { stdio: "inherit" });
  console.log(`${spec.id}: ${spec.proxyIn}s-${spec.proxyOut}s -> ${path.relative(ROOT, out)}`);
}
