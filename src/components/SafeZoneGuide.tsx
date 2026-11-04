import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE } from "../theme";

/** Debug overlay showing the combined TikTok + IG Reels safe zone. */
export const SafeZoneGuide: React.FC = () => {
  const shade = "rgba(255,0,80,0.28)";
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: SAFE.top, background: shade }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: SAFE.bottom, bottom: 0, background: shade }} />
      <div style={{ position: "absolute", left: 0, width: SAFE.left, top: SAFE.top, height: SAFE.bottom - SAFE.top, background: shade }} />
      <div style={{ position: "absolute", left: SAFE.right, right: 0, top: SAFE.top, height: SAFE.bottom - SAFE.top, background: shade }} />
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: SAFE.top,
          width: SAFE.right - SAFE.left,
          height: SAFE.bottom - SAFE.top,
          border: "4px dashed rgba(0,255,170,0.9)",
          boxSizing: "border-box",
        }}
      />
    </AbsoluteFill>
  );
};
