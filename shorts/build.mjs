// Builds one standalone HyperFrames project per spec in ./specs into ./videos/<id>/.
// Each spec cuts a talking-head/cooking live recording into a <60s short:
// segments (raw times) -> jump-cut timeline, captions, tip cards, stat chips, SFX.
//
//   node build.mjs            # build all specs
//   node build.mjs kentang    # build one
//
// Output: videos/<id>/ is a standalone HyperFrames project (index.html + assets).
// The footage proxy videos/<id>/assets/clip.mp4 is cut from the raw recording by
// cut-clips.mjs: spec.proxy ranges [[in, out], ...] back to back.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const W = 1080;
const H = 1920;
// Source is a 640x1280 screen recording; the call's participant strip sits at x>=495.
const SRC_W = 640;
const SRC_H = 1280;
const SAFE_SRC_RIGHT = 492;

const SFX = {
  whoosh: { file: "assets/sfx/whoosh.mp3", dur: 0.9, vol: 0.32 },
  "whoosh-short": { file: "assets/sfx/whoosh-short.mp3", dur: 0.6, vol: 0.35 },
  pop: { file: "assets/sfx/pop.mp3", dur: 0.72, vol: 0.4 },
  impact: { file: "assets/sfx/impact-bass-1.mp3", dur: 2.12, vol: 0.45 },
  sparkle: { file: "assets/sfx/sparkle.mp3", dur: 1.8, vol: 0.35 },
  chime: { file: "assets/sfx/chime.mp3", dur: 2.5, vol: 0.35 },
  ping: { file: "assets/sfx/ping.mp3", dur: 1.32, vol: 0.3 },
  click: { file: "assets/sfx/click-soft.mp3", dur: 0.37, vol: 0.45 },
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r3 = (n) => Math.round(n * 1000) / 1000;

// Raw-recording time -> time inside the concatenated proxy clip.
export function proxyTime(spec, raw) {
  let off = 0;
  for (const [a, b] of spec.proxy) {
    if (raw >= a && raw <= b) return off + (raw - a);
    off += b - a;
  }
  throw new Error(`${spec.id}: raw ${raw}s is outside every proxy range`);
}

function buildTimeline(spec) {
  let t = 0;
  return spec.segments.map((s, i) => {
    const len = s.out - s.in;
    if (Math.abs(proxyTime(spec, s.out) - proxyTime(spec, s.in) - len) > 1e-6) throw new Error(`${spec.id}: segment ${i} spans two proxy ranges`);
    const seg = { ...s, i, start: t, len };
    t += len;
    return seg;
  });
}

// Map a raw-recording time onto the edited timeline. Times that fall in a removed
// gap snap forward (bias "start") or back (bias "end") to the nearest kept frame.
function mapRaw(segs, raw, bias = "start") {
  for (const s of segs) if (raw >= s.in && raw <= s.out) return s.start + (raw - s.in);
  if (bias === "start") {
    const next = segs.find((s) => s.in > raw);
    return next ? next.start : null;
  }
  const prev = [...segs].reverse().find((s) => s.out < raw);
  return prev ? prev.start + prev.len : null;
}

// Crop window for a segment: zoom past the participant strip, centred on the focus point.
function framing(seg) {
  const scale = seg.zoom ?? 2.25;
  const winW = W / scale;
  const winH = H / scale;
  const maxX0 = (seg.allowRight ? SRC_W : SAFE_SRC_RIGHT) - winW;
  const fx = (seg.fx ?? 0.38) * SRC_W;
  const fy = (seg.fy ?? 0.45) * SRC_H;
  const x0 = Math.max(0, Math.min(maxX0, fx - winW / 2));
  const y0 = Math.max(0, Math.min(SRC_H - winH, fy - winH / 2));
  return { scale, left: -x0 * scale, top: -y0 * scale, w: SRC_W * scale, h: SRC_H * scale };
}

// Caption groups straight from the word-level transcript: only words inside kept
// segments, max 3 words, broken at punctuation, cuts and pauses. spec.fix rewrites
// misheard words — key "word" (any occurrence, lowercase, no punctuation) or "@<start>"
// (one token); value "" drops it. spec.highlight words get the accent colour.
function captionGroups(spec, segs) {
  if (!spec.transcript) return [];
  const words = JSON.parse(fs.readFileSync(path.join(ROOT, spec.transcript), "utf8"));
  const fix = spec.fix ?? {};
  const hl = new Set((spec.highlight ?? []).map((w) => w.toLowerCase()));
  const groups = [];
  let g = null;
  for (const [ws, we, raw] of words) {
    const seg = segs.find((x) => ws >= x.in - 0.06 && ws < x.out - 0.05);
    if (!seg || seg.vol === 0) continue;
    const key = raw.toLowerCase().replace(/[.,!?]/g, "");
    let text = fix[`@${ws.toFixed(2)}`] ?? fix[key] ?? raw;
    if (fix[key] != null && /[.,!?]$/.test(raw) && text && !/[.,!?]$/.test(text)) text += raw.at(-1);
    if (!text) continue;
    const s = seg.start + Math.max(0, ws - seg.in);
    const e = seg.start + Math.min(seg.len, we - seg.in);
    const gap = g ? s - g.e : 0;
    if (!g || g.seg !== seg.i || g.words.length >= (spec.maxWords ?? 3) || gap > 0.45 || /[.,!?]$/.test(g.words.at(-1).text)) {
      g = { seg: seg.i, s, e, words: [] };
      groups.push(g);
    }
    for (const part of text.split(/\s+/)) g.words.push({ text: part, s, hl: hl.has(part.toLowerCase().replace(/[.,!?]/g, "")) });
    g.e = e;
  }
  groups.sort((a, b) => a.s - b.s);
  // Whisper sometimes stamps a quick run of words with one timestamp; fold such a
  // blink-length group into the next one in the same shot rather than lose it.
  for (let i = groups.length - 2; i >= 0; i--) {
    const [a, b] = [groups[i], groups[i + 1]];
    if (a.seg === b.seg && b.s - a.s < 0.3) {
      b.words = [...a.words, ...b.words];
      b.s = a.s;
      groups.splice(i, 1);
    }
  }
  groups.forEach((x, i) => {
    x.e = Math.min(x.e + 0.25, i + 1 < groups.length ? groups[i + 1].s : Infinity);
    x.words.forEach((w) => (w.text = w.text.replace(/[.,]$/, "")));
  });
  return groups.filter((x) => x.e - x.s > 0.12);
}

export function build(spec) {
  const segs = buildTimeline(spec);
  const total = r3(segs.at(-1).start + segs.at(-1).len + (spec.outro ? spec.outro.tail ?? 0 : 0));
  if (total >= 60) throw new Error(`${spec.id}: ${total}s is not under 60s`);
  const at = (o, bias) => (o.at != null ? o.at : mapRaw(segs, o.raw, bias));

  const videos = [];
  const sfx = [];
  const overlays = [];
  const tl = [];
  const addSfx = (name, t, vol) => {
    if (t == null || !SFX[name]) return;
    const s = SFX[name];
    const dur = Math.min(s.dur, total - t);
    if (dur <= 0.05) return;
    sfx.push(
      `<audio id="sfx-${sfx.length}" src="${s.file}" data-start="${r3(t)}" data-duration="${r3(dur)}" data-volume="${vol ?? s.vol}"></audio>`,
    );
  };

  // --- footage ---------------------------------------------------------------
  segs.forEach((s) => {
    const f = framing(s);
    const id = `v${s.i}`;
    videos.push(
      `<video id="${id}" class="clip src" src="assets/clip.mp4" data-start="${r3(s.start)}" data-duration="${r3(s.len)}" data-media-start="${r3(proxyTime(spec, s.in))}" data-has-audio="true" data-fade-in="0.03" data-fade-out="0.03" data-volume="${s.vol ?? 1}" playsinline style="left:${r3(f.left)}px;top:${r3(f.top)}px;width:${r3(f.w)}px;height:${r3(f.h)}px"></video>`,
    );
    // Slow push-in inside every shot hides the jump cut and keeps the frame alive.
    const ox = r3(-f.left + W / 2);
    const oy = r3(-f.top + H / 2);
    tl.push(
      `tl.fromTo("#${id}", { scale: 1, transformOrigin: "${ox}px ${oy}px" }, { scale: ${s.push ?? 1.04}, duration: ${r3(s.len)}, ease: "none" }, ${r3(s.start)});`,
    );
    if (s.cut === "whoosh" && s.i > 0) {
      addSfx("whoosh-short", Math.max(0, s.start - 0.15));
      overlays.push(
        `<div id="flash${s.i}" class="clip flash" data-start="${r3(s.start)}" data-duration="0.3"></div>`,
      );
      tl.push(`tl.fromTo("#flash${s.i}", { opacity: 0.85 }, { opacity: 0, duration: 0.28, ease: "power2.out" }, ${r3(s.start)});`);
    }
  });

  // --- hook --------------------------------------------------------------------
  const hook = spec.hook;
  if (hook) {
    const d = hook.dur ?? 3;
    overlays.push(`<div id="hook" class="clip hook" data-start="0" data-duration="${d}">
  <div class="hook-shade"></div>
  <div class="hook-kicker">${esc(hook.kicker ?? "TASTY TUESDAY")}</div>
  ${hook.lines.map((l, i) => `<div class="hook-line${i === hook.accent ? " accent" : ""}" id="hl${i}">${esc(l)}</div>`).join("\n  ")}
</div>`);
    tl.push(`tl.from("#hook .hook-shade", { opacity: 0, duration: 0.25 }, 0);`);
    tl.push(`tl.from("#hook .hook-kicker", { y: -40, opacity: 0, duration: 0.35, ease: "back.out(2)" }, 0.05);`);
    hook.lines.forEach((_, i) => {
      tl.push(
        `tl.from("#hl${i}", { scale: 2.2, opacity: 0, rotation: ${i % 2 ? 4 : -4}, duration: 0.32, ease: "power4.out" }, ${r3(0.12 + i * 0.28)});`,
      );
    });
    tl.push(`tl.to("#hook", { x: 10, duration: 0.05, yoyo: true, repeat: 3, ease: "none" }, ${r3(0.12 + (hook.lines.length - 1) * 0.28 + 0.3)});`);
    tl.push(`tl.to("#hook", { opacity: 0, y: -60, duration: 0.3, ease: "power2.in" }, ${r3(d - 0.3)});`);
    addSfx("whoosh", 0);
    addSfx("impact", r3(0.12 + (hook.lines.length - 1) * 0.28 + 0.2));
  }

  // --- persistent menu tag + progress bar ---------------------------------------
  const tagStart = hook ? hook.dur ?? 3 : 0;
  const tagEnd = spec.outro ? total - spec.outro.dur : total;
  overlays.push(`<div id="tag" class="clip tag" data-start="${r3(tagStart)}" data-duration="${r3(tagEnd - tagStart)}">
  <span class="tag-brand">TASTY TUESDAY</span><span class="tag-menu">${esc(spec.menu)}</span>
</div>`);
  tl.push(`tl.from("#tag", { x: -420, duration: 0.45, ease: "back.out(1.6)" }, ${r3(tagStart)});`);
  overlays.push(`<div id="progress" class="clip progress" data-start="0" data-duration="${total}"><div class="bar"></div></div>`);
  tl.push(`tl.fromTo("#progress .bar", { scaleX: 0 }, { scaleX: 1, duration: ${total}, ease: "none" }, 0);`);

  // --- captions -----------------------------------------------------------------
  const outroAt = spec.outro ? total - spec.outro.dur : total;
  const caps = captionGroups(spec, segs).filter((c) => c.s < outroAt - 0.2);
  caps.forEach((c) => (c.e = Math.min(c.e, outroAt)));
  caps.forEach((c, i) => {
    const id = `cap${i}`;
    const spans = c.words.map((w) => `<span class="w${w.hl ? " hl" : ""}">${esc(w.text)}</span>`).join(" ");
    overlays.push(
      `<div id="${id}" class="clip cap" data-start="${r3(c.s)}" data-duration="${r3(c.e - c.s)}"><div class="cap-inner">${spans}</div></div>`,
    );
    tl.push(`tl.from("#${id} .cap-inner", { scale: 0.7, opacity: 0, duration: 0.14, ease: "back.out(2.5)" }, ${r3(c.s)});`);
    // karaoke: each word brightens and pops on the frame it is spoken
    c.words.forEach((w, k) => {
      tl.push(`tl.fromTo("#${id} .w:nth-child(${k + 1})", { opacity: 0.5, scale: 1 }, { opacity: 1, scale: 1.12, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.out" }, ${r3(Math.max(c.s, w.s))});`);
      tl.push(`tl.set("#${id} .w:nth-child(${k + 1})", { opacity: 1 }, ${r3(Math.max(c.s, w.s) + 0.2)});`);
    });
  });

  // --- tip cards / stat chips / stickers ------------------------------------------
  (spec.cards ?? []).forEach((c, i) => {
    const t = at(c, "start");
    if (t == null) throw new Error(`${spec.id}: card ${i} lands in a removed gap`);
    const d = Math.min(c.dur ?? 3.5, total - t - 0.05);
    const id = `card${i}`;
    if (c.type === "tip") {
      overlays.push(`<div id="${id}" class="clip tip" data-start="${r3(t)}" data-duration="${r3(d)}"${c.y ? ` style="top:${c.y}px"` : ""}>
  <div class="tip-label"><svg viewBox="0 0 24 24" width="34" height="34"><path fill="currentColor" d="M12 2a7 7 0 0 0-4 12.7V17a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-2.3A7 7 0 0 0 12 2zm-2 18h4v1a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"/></svg>${esc(c.label ?? "TIP")}</div>
  <div class="tip-text">${esc(c.text)}</div>
</div>`);
      tl.push(`tl.from("#${id}", { x: -1100, rotation: -6, duration: 0.5, ease: "back.out(1.4)" }, ${r3(t)});`);
      tl.push(`tl.from("#${id} .tip-text", { opacity: 0, y: 20, duration: 0.3 }, ${r3(t + 0.25)});`);
      tl.push(`tl.to("#${id}", { x: 1100, rotation: 6, duration: 0.35, ease: "power3.in" }, ${r3(t + d - 0.35)});`);
      addSfx("whoosh-short", t);
      addSfx("pop", t + 0.3);
    } else if (c.type === "chips") {
      overlays.push(`<div id="${id}" class="clip chips" data-start="${r3(t)}" data-duration="${r3(d)}"${c.y ? ` style="top:${c.y}px"` : ""}>
  ${c.items.map((x) => `<div class="chip">${esc(x)}</div>`).join("\n  ")}
</div>`);
      // c.times: raw time each chip lands on (e.g. as the word is spoken); default stagger
      const times = c.items.map((_, k) => (c.times ? mapRaw(segs, c.times[k], "start") : t + k * 0.18));
      times.forEach((tk, k) => {
        tl.push(`tl.from("#${id} .chip:nth-child(${k + 1})", { scale: 0, opacity: 0, duration: 0.3, ease: "back.out(2.6)" }, ${r3(tk)});`);
        addSfx("click", tk);
      });
      tl.push(`tl.to("#${id} .chip", { scale: 0, opacity: 0, duration: 0.2, stagger: 0.05, ease: "power2.in" }, ${r3(t + d - 0.3)});`);
    } else if (c.type === "sticker") {
      overlays.push(`<div id="${id}" class="clip sticker" data-start="${r3(t)}" data-duration="${r3(d)}" style="top:${c.y ?? 300}px">
  <div class="rays"></div><div class="sticker-text">${esc(c.text)}</div>
</div>`);
      tl.push(`tl.from("#${id} .sticker-text", { scale: 3, opacity: 0, rotation: -20, duration: 0.4, ease: "back.out(2)" }, ${r3(t)});`);
      tl.push(`tl.from("#${id} .rays", { scale: 0, opacity: 0, duration: 0.5, ease: "power3.out" }, ${r3(t)});`);
      tl.push(`tl.to("#${id} .rays", { rotation: 90, duration: ${r3(d)}, ease: "none" }, ${r3(t)});`);
      tl.push(`tl.to("#${id}", { scale: 0, opacity: 0, duration: 0.25, ease: "power2.in" }, ${r3(t + d - 0.25)});`);
      addSfx(c.sfx ?? "sparkle", t);
    }
  });

  (spec.sfx ?? []).forEach((s) => addSfx(s.name, at(s, "start"), s.vol));

  // --- outro ----------------------------------------------------------------------
  if (spec.outro) {
    const d = spec.outro.dur;
    const t = total - d;
    overlays.push(`<div id="outro" class="clip outro" data-start="${r3(t)}" data-duration="${r3(d)}">
  <div class="outro-shade"></div>
  <div class="outro-kicker">TASTY TUESDAY</div>
  <div class="outro-title">${esc(spec.outro.title)}</div>
  <div class="outro-cta">${esc(spec.outro.cta)}</div>
</div>`);
    tl.push(`tl.from("#outro .outro-shade", { opacity: 0, duration: 0.4 }, ${r3(t)});`);
    tl.push(`tl.from("#outro .outro-kicker", { y: 40, opacity: 0, duration: 0.35 }, ${r3(t + 0.1)});`);
    tl.push(`tl.from("#outro .outro-title", { scale: 1.8, opacity: 0, duration: 0.4, ease: "power4.out" }, ${r3(t + 0.25)});`);
    tl.push(`tl.from("#outro .outro-cta", { y: 60, opacity: 0, duration: 0.4, ease: "back.out(2)" }, ${r3(t + 0.6)});`);
    tl.push(`tl.to("#outro .outro-cta", { scale: 1.06, duration: 0.4, yoyo: true, repeat: 3, ease: "sine.inOut" }, ${r3(t + 1.1)});`);
    addSfx("chime", t + 0.25);
  }

  const css = fs.readFileSync(path.join(ROOT, "shared/style.css"), "utf8");
  const html = `<!doctype html>
<html lang="ms" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <title>${esc(spec.title)}</title>
    <script src="assets/gsap.min.js"></script>
    <style>
${css}
    </style>
  </head>
  <body>
    <!-- generated by ../../build.mjs from specs/${spec.id}.mjs — edit the spec, not this file -->
    <div id="root" data-composition-id="${spec.id}" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
      ${videos.join("\n      ")}
      <div id="grade" class="clip grade" data-start="0" data-duration="${total}"></div>
      ${overlays.join("\n      ")}
      ${sfx.join("\n      ")}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      ${tl.join("\n      ")}
      window.__timelines["${spec.id}"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
  return { html, total, segs, caps };
}

async function main() {
  const only = process.argv[2];
  const dir = path.join(ROOT, "specs");
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".mjs")).sort()) {
    const spec = (await import(pathToFileURL(path.join(dir, f)).href)).default;
    if (only && spec.id !== only) continue;
    const { html, total, segs, caps } = build(spec);
    const proj = path.join(ROOT, "videos", spec.id);
    fs.mkdirSync(path.join(proj, "assets/sfx"), { recursive: true });
    for (const s of Object.values(SFX)) fs.copyFileSync(path.join(ROOT, "shared", s.file), path.join(proj, s.file));
    fs.copyFileSync(path.join(ROOT, "shared/assets/gsap.min.js"), path.join(proj, "assets/gsap.min.js"));
    fs.copyFileSync(path.join(ROOT, "hyperframes.json"), path.join(proj, "hyperframes.json"));
    fs.writeFileSync(path.join(proj, "meta.json"), JSON.stringify({ id: spec.id, name: spec.title }, null, 2) + "\n");
    const out = path.join(proj, "index.html");
    fs.writeFileSync(out, html);
    console.log(`${spec.id}: ${total}s, ${segs.length} cuts, ${caps.length} captions -> ${path.relative(ROOT, out)}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
