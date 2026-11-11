import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {Shade, SafeZoneGuide, SeriesChrome} from './components/Chrome';
import {EndNext, Finale} from './components/EndCards';
import {CookTimer, KineticTitle, MarkerCircle, MarkerLabel, Sparkles, SpeedBadge, StepCard} from './components/Graphics';
import {ShotView} from './components/ShotView';
import {FPS} from './lib/theme';
import {layout, musicCurve, sec, type PlacedShot} from './lib/timeline';
import type {Episode, Overlay} from './lib/types';

export type EpisodeProps = {episode: Episode; showSafeZone?: boolean};

const OverlayView: React.FC<{o: Overlay; shot: PlacedShot}> = ({o, shot}) => {
  const rest = (at = 0, dur?: number) => (dur !== undefined ? sec(dur) : shot.frames - sec(at));
  switch (o.type) {
    case 'title':
      return <KineticTitle lines={o.lines} pos={o.pos} at={o.at} durFrames={rest(o.at, o.dur)} />;
    case 'step':
      return <StepCard n={o.n} text={o.text} at={o.at} durFrames={rest(o.at, o.dur)} />;
    case 'speed':
      return <SpeedBadge label={o.label} />;
    case 'label':
      return (
        <MarkerLabel
          text={o.text}
          x={o.x}
          y={o.y}
          rotate={o.rotate}
          size={o.size}
          at={o.at}
          durFrames={rest(o.at, o.dur)}
          arrowTo={o.arrowTo}
        />
      );
    case 'sparkles':
      return <Sparkles x={o.x} y={o.y} at={o.at} count={o.count} spread={o.spread} />;
    case 'circle':
      return <MarkerCircle x={o.x} y={o.y} rx={o.rx} ry={o.ry} at={o.at} durFrames={rest(o.at, o.dur)} />;
    case 'timer':
      return <CookTimer fromSec={o.fromSec} toSec={o.toSec} caption={o.caption} durFrames={shot.frames} />;
    case 'endNext':
      return <EndNext nextEp={o.nextEp} nextTitle={o.nextTitle} peek={o.peek} durFrames={shot.frames} />;
    case 'finale':
      return <Finale tiles={o.tiles} durFrames={shot.frames} />;
  }
};

const ENTER_SFX: Record<string, {src: string; vol: number} | null> = {
  zoom: {src: 'whoosh-fast', vol: 0.32},
  whip: {src: 'swish', vol: 0.34},
  glitch: {src: 'rev-whoosh', vol: 0.45},
  cut: null,
};

export const EpisodeVideo: React.FC<EpisodeProps> = ({episode, showSafeZone}) => {
  const {shots, total} = useMemo(() => layout(episode), [episode]);
  const music = useMemo(() => musicCurve(episode), [episode]);
  const endStart = shots.find((s) => s.overlays?.some((o) => o.type === 'endNext' || o.type === 'finale'))?.start;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {shots.map((s) => (
        <Sequence key={`v${s.index}`} from={s.start} durationInFrames={s.frames} premountFor={FPS}>
          <ShotView shot={s} />
        </Sequence>
      ))}

      <Shade />

      {shots.map((s) => (
        <Sequence key={`o${s.index}`} from={s.start} durationInFrames={s.frames} layout="none">
          <AbsoluteFill>
            {(s.overlays ?? []).map((o, i) => (
              <OverlayView key={i} o={o} shot={s} />
            ))}
          </AbsoluteFill>
        </Sequence>
      ))}

      <SeriesChrome ep={episode.ep} of={episode.of} total={total} hideAfter={endStart} />

      {/* ---------- audio ---------- */}
      <Audio
        src={staticFile(`music/${episode.music}`)}
        trimBefore={sec(episode.musicStart ?? 0)}
        volume={(f) => music[Math.min(music.length - 1, Math.max(0, f))]}
      />
      {shots.map((s) => {
        const enter = ENTER_SFX[s.enter ?? 'zoom'];
        return (
          <React.Fragment key={`a${s.index}`}>
            {enter && s.index > 0 ? (
              <Sequence from={Math.max(0, s.start - 3)} durationInFrames={sec(1.5)}>
                <Audio src={staticFile(`sfx/${enter.src}.wav`)} volume={enter.vol} />
              </Sequence>
            ) : null}
            {(s.sfx ?? []).map((x, i) => (
              <Sequence key={i} from={s.start + sec(x.at)} durationInFrames={sec(4)}>
                <Audio src={staticFile(`sfx/${x.src}.wav`)} volume={x.vol ?? 0.5} />
              </Sequence>
            ))}
            {(s.overlays ?? []).map((o, i) =>
              o.type === 'step' ? (
                <Sequence key={`st${i}`} from={s.start + sec(o.at ?? 0) + 1} durationInFrames={sec(1)}>
                  <Audio src={staticFile('sfx/pop.wav')} volume={0.4} />
                </Sequence>
              ) : o.type === 'title' ? (
                <Sequence key={`ti${i}`} from={s.start + sec(o.at ?? 0)} durationInFrames={sec(1)}>
                  <Audio src={staticFile('sfx/pop-large.wav')} volume={0.32} />
                </Sequence>
              ) : null,
            )}
          </React.Fragment>
        );
      })}

      {showSafeZone ? <SafeZoneGuide /> : null}
    </AbsoluteFill>
  );
};

export const episodeFrames = (e: Episode) => layout(e).total;
