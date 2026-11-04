import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_BODY, SAFE } from "../theme";
import type { CaptionChunk } from "../types";

const DEFAULT_Y = 1350; // single-line captions sit below the chin line on talking shots, above the TikTok/IG caption area

export const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chunk = chunks.find((c) => frame >= c.s && frame < c.e);
  if (!chunk) return null;

  const enter = spring({ frame: frame - chunk.s, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const y = Math.min(chunk.y ?? DEFAULT_Y, SAFE.bottom - 60);
  const chars = chunk.words.reduce((n, w) => n + w.t.length + 1, 0);
  const fontSize = Math.min(78, Math.floor(820 / (chars * 0.66)));

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: SAFE.left + 10,
          width: SAFE.right - SAFE.left - 20,
          top: y,
          transform: `translateY(-50%) scale(${interpolate(enter, [0, 1], [0.82, 1])})`,
          opacity: enter,
          display: "flex",
          flexWrap: "nowrap",
          justifyContent: "center",
          gap: "6px 18px",
          fontFamily: FONT_BODY,
          fontWeight: 900,
          fontSize,
          lineHeight: 1.12,
          textTransform: "uppercase",
          letterSpacing: -0.5,
          textAlign: "center",
        }}
      >
        {chunk.words.map((w, i) => {
          const active = frame >= w.s && frame < Math.max(w.e, w.s + 4);
          const said = frame >= w.s;
          const pop = spring({ frame: frame - w.s, fps, config: { damping: 10, stiffness: 300, mass: 0.5 } });
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color: active ? COLORS.ink : said ? COLORS.cream : "rgba(255,246,229,0.55)",
                background: active ? COLORS.kunyit : "transparent",
                borderRadius: 14,
                padding: "0 12px",
                transform: `scale(${active ? interpolate(pop, [0, 1], [0.9, 1.08]) : 1}) rotate(${active ? -2 : 0}deg)`,
                WebkitTextStroke: active ? "0px" : "3px #120a06",
                paintOrder: "stroke fill",
                textShadow: active ? "none" : "0 6px 0 rgba(0,0,0,0.45), 0 0 24px rgba(0,0,0,0.5)",
                boxShadow: active ? "0 8px 0 #B5831C" : "none",
              }}
            >
              {w.t}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
