import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import timeline from "./data/timeline.json";
import { captions, graphics, montageBeats, sfx, voiceWindows } from "./data/edit";
import { Captions } from "./components/Captions";
import { Graphics } from "./components/Graphics";
import { SafeZoneGuide } from "./components/SafeZoneGuide";
import { COLORS, FONT_BODY, SAFE } from "./theme";

type TClip = { file: string; s: number; e: number; beat: string; sync: boolean; label: string | null };
const clips = timeline.clips as TClip[];

/** Face sits around x≈0.72, y≈0.42 on talking shots: zoom toward it so it never gets cropped. */
const ORIGIN_TALK = "72% 42%";

const Shot: React.FC<{ clip: TClip; index: number; hero: boolean }> = ({ clip, index, hero }) => {
  const frame = useCurrentFrame(); // local to the Sequence
  const dur = clip.e - clip.s;
  let scale: number;
  if (clip.sync) {
    // jump-cut punch: alternate framing between consecutive talking pieces
    const base = index % 2 === 0 ? 1.0 : 1.1;
    scale = base + interpolate(frame, [0, dur], [0, 0.03]);
  } else if (hero) {
    // hero plate sits low in frame: push in toward it
    scale = 1.22 + interpolate(frame, [0, dur], [0, 0.08]);
  } else {
    // b-roll: slow push-in plus a quick settle from the cut
    scale = 1.04 + interpolate(frame, [0, dur], [0, 0.06]) + interpolate(frame, [0, 6], [0.06, 0], { extrapolateRight: "clamp" });
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "black" }}>
      <OffthreadVideo src={staticFile(clip.file)} muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})`, transformOrigin: clip.sync ? ORIGIN_TALK : hero ? "50% 92%" : "50% 50%" }} />
      {clip.label ? <SpeedBadge text={clip.label} /> : null}
    </AbsoluteFill>
  );
};

const SpeedBadge: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 4], [0, 1], { extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", right: 1080 - SAFE.right + 10, top: SAFE.top + 300, opacity: o, fontFamily: FONT_BODY, fontWeight: 900, fontSize: 40, color: COLORS.ink, background: COLORS.kunyit, borderRadius: 14, padding: "6px 18px" }}>
      {text.includes("x") ? `⏩ ${text}` : text}
    </div>
  );
};

/** Music ducks hard under speech and lifts in the montages. */
const musicVolume = (f: number) => {
  const RAMP = 6;
  let speech = 0;
  for (const w of voiceWindows) {
    const v = interpolate(f, [w.s - RAMP, w.s, w.e, w.e + RAMP + 4], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    speech = Math.max(speech, v);
  }
  const inMontage = montageBeats.some((b) => f >= b.s && f < b.e);
  const open = inMontage ? 0.62 : 0.32;
  const ducked = 0.13;
  const fadeOut = interpolate(f, [timeline.durationInFrames - 25, timeline.durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (open + (ducked - open) * speech) * fadeOut;
};

export const TastyTuesday: React.FC<{ showSafeZone?: boolean }> = ({ showSafeZone = false }) => {
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: "black" }}>
      {clips.map((c, i) => (
        <Sequence key={c.file} from={c.s} durationInFrames={c.e - c.s} premountFor={30}>
          <Shot clip={c} index={clips.filter((x, j) => j < i && x.sync && x.beat === c.beat).length} hero={i === clips.length - 1} />
        </Sequence>
      ))}

      {/* subtle vignette keeps white text readable over bright kitchen walls */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.38) 100%)" }} />

      <Graphics items={graphics} />
      <Captions chunks={captions} />

      <Audio src={staticFile("media/voice.wav")} volume={1} />
      <Audio src={staticFile("music/bed.mp3")} volume={musicVolume} endAt={durationInFrames} />
      {sfx.map((s, i) => (
        <Sequence key={i} from={Math.max(0, s.at)} durationInFrames={150}>
          <Audio src={staticFile(s.file)} volume={s.vol ?? 0.4} />
        </Sequence>
      ))}

      {showSafeZone ? <SafeZoneGuide /> : null}
    </AbsoluteFill>
  );
};
