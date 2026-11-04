import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { COLORS, FONT_BODY, FONT_DISPLAY, SAFE } from "../theme";
import type { Graphic } from "../types";

const useIO = (s: number, e: number, outFrames = 7) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: frame - s, fps, config: { damping: 12, stiffness: 180, mass: 0.7 } });
  const out = interpolate(frame, [e - outFrames, e], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  return { inn, out, local: frame - s, frame };
};

const Hook: React.FC<Extract<Graphic, { kind: "hook" }>> = ({ s, e, lines, accent = 1 }) => {
  const { fps } = useVideoConfig();
  const { out, local } = useIO(s, e);
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE.right - SAFE.left, top: SAFE.top + 40, opacity: out, textAlign: "center" }}>
      {lines.map((l, i) => {
        const p = spring({ frame: local - i * 5, fps, config: { damping: 9, stiffness: 200, mass: 0.6 } });
        const isAccent = i === accent;
        return (
          <div key={i} style={{ transform: `translateY(${interpolate(p, [0, 1], [80, 0])}px) scale(${interpolate(p, [0, 1], [0.6, 1])}) rotate(${isAccent ? -3 : 0}deg)`, opacity: Math.min(1, p * 1.5), marginBottom: 10 }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: FONT_DISPLAY,
                fontSize: isAccent ? 132 : 92,
                lineHeight: 1.02,
                color: isAccent ? COLORS.ink : COLORS.cream,
                background: isAccent ? COLORS.kunyit : "transparent",
                padding: isAccent ? "6px 28px 0" : 0,
                borderRadius: 18,
                textTransform: "uppercase",
                WebkitTextStroke: isAccent ? "0" : "4px #140b07",
                paintOrder: "stroke fill",
                textShadow: isAccent ? "none" : "0 8px 0 rgba(0,0,0,0.55)",
                boxShadow: isAccent ? `0 10px 0 ${COLORS.sambal}` : "none",
              }}
            >
              {l}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Pill: React.FC<Extract<Graphic, { kind: "pill" }>> = ({ s, e, text, emoji, x, y, from = "left" }) => {
  const { inn, out } = useIO(s, e);
  const dx = interpolate(inn, [0, 1], [from === "left" ? -500 : 500, 0]);
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, transform: `translateX(${dx}px) rotate(-2deg)`, opacity: out,
        display: "flex", alignItems: "center", gap: 14, padding: "16px 30px 16px 20px", borderRadius: 999,
        background: COLORS.cream, color: COLORS.ink, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46,
        boxShadow: `0 8px 0 ${COLORS.sambal}, 0 18px 40px rgba(0,0,0,0.35)`, whiteSpace: "nowrap",
      }}
    >
      {emoji ? <span style={{ fontSize: 52 }}>{emoji}</span> : null}
      <span>{text}</span>
    </div>
  );
};

const Stamp: React.FC<Extract<Graphic, { kind: "stamp" }>> = ({ s, e, text, sub, x, y, rotate = -4 }) => {
  const { fps } = useVideoConfig();
  const { out, local } = useIO(s, e);
  const p = spring({ frame: local, fps, config: { damping: 8, stiffness: 260, mass: 0.6 } });
  const scale = interpolate(p, [0, 1], [2.2, 1]);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, 0) scale(${scale}) rotate(${rotate}deg)`, opacity: Math.min(1, p * 2) * out, textAlign: "center" }}>
      <div
        style={{
          fontFamily: FONT_DISPLAY, fontSize: 104, lineHeight: 1, color: COLORS.cream, background: COLORS.sambal,
          padding: "14px 34px 6px", borderRadius: 20, textTransform: "uppercase", whiteSpace: "nowrap",
          border: `6px solid ${COLORS.cream}`, boxShadow: "0 14px 0 rgba(0,0,0,0.35)",
        }}
      >
        {text}
      </div>
      {sub ? (
        <div style={{ marginTop: 18, display: "inline-block", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, color: COLORS.ink, background: COLORS.kunyit, padding: "8px 22px", borderRadius: 12, whiteSpace: "nowrap" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
};

const Ingredients: React.FC<Extract<Graphic, { kind: "ingredients" }>> = ({ s, e, items, y }) => {
  const { fps } = useVideoConfig();
  const { out, local } = useIO(s, e);
  const card = spring({ frame: local, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <div
      style={{
        position: "absolute", left: SAFE.left + 10, top: y, width: 500, opacity: out,
        transform: `translateX(${interpolate(card, [0, 1], [-600, 0])}px) rotate(-1.5deg)`,
        background: "rgba(255,246,229,0.94)", borderRadius: 28, padding: "24px 28px",
        boxShadow: `0 10px 0 ${COLORS.sambal}, 0 24px 50px rgba(0,0,0,0.35)`, fontFamily: FONT_BODY,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 54, color: COLORS.sambal, letterSpacing: 1, marginBottom: 6 }}>BAHAN</div>
      {items.map((it, i) => {
        const p = spring({ frame: local - 8 - i * 6, fps, config: { damping: 12, stiffness: 220 } });
        return (
          <div key={i} style={{ fontSize: 40, fontWeight: 800, color: COLORS.ink, lineHeight: 1.45, opacity: p, transform: `translateX(${interpolate(p, [0, 1], [-40, 0])}px)` }}>
            {it}
          </div>
        );
      })}
    </div>
  );
};

const Checklist: React.FC<Extract<Graphic, { kind: "checklist" }>> = ({ s, e, items, y }) => {
  const { fps } = useVideoConfig();
  const { out, frame } = useIO(s, e);
  const card = spring({ frame: frame - s, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <div
      style={{
        position: "absolute", left: SAFE.left + 10, top: y, width: 560, opacity: out,
        transform: `translateX(${interpolate(card, [0, 1], [-650, 0])}px) rotate(-1.5deg)`,
        background: "rgba(255,246,229,0.95)", borderRadius: 28, padding: "22px 28px",
        boxShadow: `0 10px 0 ${COLORS.leaf}, 0 24px 50px rgba(0,0,0,0.35)`, fontFamily: FONT_BODY,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 50, color: COLORS.ink, marginBottom: 4 }}>1 MESIN BOLEH:</div>
      {items.map((it, i) => {
        const p = spring({ frame: frame - it.at, fps, config: { damping: 10, stiffness: 240 } });
        if (frame < it.at) return null;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 40, fontWeight: 800, color: COLORS.ink, lineHeight: 1.5, transform: `scale(${interpolate(p, [0, 1], [0.6, 1])})`, transformOrigin: "left center", opacity: p }}>
            <span style={{ width: 46, height: 46, borderRadius: 12, background: COLORS.leaf, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>✓</span>
            {it.text}
          </div>
        );
      })}
    </div>
  );
};

const CTA: React.FC<Extract<Graphic, { kind: "cta" }>> = ({ s, e, text, sub, y }) => {
  const { fps } = useVideoConfig();
  const { out, local } = useIO(s, e, 1);
  const p = spring({ frame: local, fps, config: { damping: 11, stiffness: 170 } });
  const bob = Math.sin(local / 6) * 4;
  return (
    <div style={{ position: "absolute", left: SAFE.left, width: SAFE.right - SAFE.left, top: y, textAlign: "center", opacity: out, transform: `translateY(${interpolate(p, [0, 1], [-200, 0]) + bob}px)` }}>
      <div style={{ display: "inline-block", fontFamily: FONT_DISPLAY, fontSize: 96, lineHeight: 1.05, color: COLORS.ink, background: COLORS.kunyit, padding: "14px 34px 4px", borderRadius: 22, boxShadow: `0 12px 0 ${COLORS.sambal}`, textTransform: "uppercase" }}>
        {text}
      </div>
      <div style={{ marginTop: 26, fontFamily: FONT_BODY, fontWeight: 800, fontSize: 46, color: COLORS.cream, WebkitTextStroke: "3px #140b07", paintOrder: "stroke fill", textShadow: "0 6px 0 rgba(0,0,0,0.5)" }}>
        {sub}
      </div>
    </div>
  );
};

const Step: React.FC<Extract<Graphic, { kind: "step" }>> = ({ s, e, n, total, title, sub, y }) => {
  const { fps } = useVideoConfig();
  const { out, local } = useIO(s, e, 5);
  const card = spring({ frame: local, fps, config: { damping: 13, stiffness: 200, mass: 0.6 } });
  const badge = spring({ frame: local - 3, fps, config: { damping: 8, stiffness: 260, mass: 0.5 } });
  const subIn = spring({ frame: local - 8, fps, config: { damping: 14, stiffness: 200 } });
  return (
    <div style={{ position: "absolute", left: SAFE.left + 10, top: y, width: SAFE.right - SAFE.left - 20, opacity: out }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, transform: `translateX(${interpolate(card, [0, 1], [-700, 0])}px)` }}>
        <div
          style={{
            flex: "0 0 auto", width: 118, height: 118, borderRadius: 999, background: COLORS.kunyit, color: COLORS.ink,
            display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontSize: 76,
            boxShadow: `0 8px 0 ${COLORS.sambal}`, transform: `scale(${interpolate(badge, [0, 1], [0.3, 1])}) rotate(${interpolate(badge, [0, 1], [-90, 0])}deg)`,
          }}
        >
          {n}
        </div>
        <div
          style={{
            fontFamily: FONT_DISPLAY, fontSize: 84, lineHeight: 1.02, color: COLORS.cream, textTransform: "uppercase",
            WebkitTextStroke: "4px #140b07", paintOrder: "stroke fill", textShadow: "0 8px 0 rgba(0,0,0,0.55)",
          }}
        >
          {title}
        </div>
      </div>
      {sub ? (
        <div style={{ marginTop: 18, marginLeft: 140, opacity: subIn, transform: `translateY(${interpolate(subIn, [0, 1], [24, 0])}px)` }}>
          <span style={{ display: "inline-block", fontFamily: FONT_BODY, fontWeight: 800, fontSize: 40, lineHeight: 1.25, color: COLORS.ink, background: COLORS.cream, padding: "8px 20px", borderRadius: 14, boxShadow: "0 6px 0 rgba(0,0,0,0.3)" }}>
            {sub}
          </span>
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 10, marginTop: 22, marginLeft: 140 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ width: i + 1 === n ? 46 : 16, height: 16, borderRadius: 99, background: i + 1 <= n ? COLORS.kunyit : "rgba(255,246,229,0.5)", boxShadow: "0 3px 0 rgba(0,0,0,0.35)" }} />
        ))}
      </div>
    </div>
  );
};

const Flash: React.FC<{ s: number }> = ({ s }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [s, s + 1, s + 6], [0, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "white", opacity: o }} />;
};

export const Graphics: React.FC<{ items: Graphic[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {items.map((g, i) => {
        if (g.kind === "flash") return frame >= g.s && frame < g.s + 8 ? <Flash key={i} s={g.s} /> : null;
        if (frame < g.s || frame >= g.e) return null;
        switch (g.kind) {
          case "hook": return <Hook key={i} {...g} />;
          case "pill": return <Pill key={i} {...g} />;
          case "stamp": return <Stamp key={i} {...g} />;
          case "ingredients": return <Ingredients key={i} {...g} />;
          case "checklist": return <Checklist key={i} {...g} />;
          case "cta": return <CTA key={i} {...g} />;
          case "step": return <Step key={i} {...g} />;
          default: return null;
        }
      })}
    </AbsoluteFill>
  );
};
