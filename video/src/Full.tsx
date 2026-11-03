import React from 'react';
import {AbsoluteFill, Easing, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Footage, Voice} from './components/Footage';
import {PanelCaptions} from './components/Captions';
import {GRAPHICS} from './components/Graphics';
import {Music, SfxTrack} from './components/AudioBed';
import {C, F, MENUS, Timeline, loadFonts} from './theme';
import {PreviewBug} from './Short';

loadFonts();

const ORDER = ['roll', 'wrap', 'puff', 'sambal', 'pizza'];
const CARD = {x: 120, y: 40, h: 1000};
const SCALE = CARD.h / 1920;
const CARD_W = 1080 * SCALE;
const PANEL_X = CARD.x + CARD_W + 110;

const chapterAt = (data: Timeline, f: number) => {
  let cur: string | null = null;
  for (const c of data.chapters) if (f >= c.frm) cur = c.key;
  const outro = data.pieces.find((p) => p.tag === 'outro');
  if (outro && f >= outro.frm) return null;
  return cur;
};

export const Full: React.FC<{data: Timeline; preview?: boolean}> = ({data, preview}) => {
  const f = useCurrentFrame();
  const ch = chapterAt(data, f);
  const accent = ch ? MENUS[ch].accent : '#FF8A2A';
  const panelOverlays = data.overlays.filter((o) => GRAPHICS[o.type] && !['hook', 'title', 'cta'].includes(o.type));
  return (
    <AbsoluteFill style={{backgroundColor: C.ink, overflow: 'hidden'}}>
      <Backdrop accent={accent} ch={ch} />
      {/* video card */}
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD_W,
          height: CARD.h,
          borderRadius: 34,
          overflow: 'hidden',
          boxShadow: '0 40px 90px rgba(0,0,0,0.55), 0 0 0 1.5px rgba(255,243,226,0.16)',
        }}
      >
        <div style={{width: 1080, height: 1920, transform: `scale(${SCALE})`, transformOrigin: '0 0'}}>
          <Footage pieces={data.pieces} />
        </div>
      </div>
      {/* side panel */}
      <div style={{position: 'absolute', left: PANEL_X, top: 0, width: 1920 - PANEL_X - 100, height: 1080}}>
        <Brand />
        {ch ? <ChapterHead k={ch} data={data} /> : <ShowHead data={data} />}
        <div style={{position: 'absolute', left: 0, right: 0, top: 862, height: 170, display: 'flex', alignItems: 'flex-start'}}>
          <PanelCaptions caps={data.captions} accent={accent} />
        </div>
        {panelOverlays.map((o, i) => {
          const G = GRAPHICS[o.type];
          return (
            <Sequence key={i} from={o.frm} durationInFrames={o.dur} layout="none">
              <div style={{position: 'absolute', left: 0, top: 610, transform: 'scale(0.84)', transformOrigin: '0 0'}}>
                <G props={o.props} dur={o.dur} accent={accent} />
              </div>
            </Sequence>
          );
        })}
        <ChapterBar data={data} ch={ch} />
      </div>
      {data.overlays.map((o, i) => {
        const P = PANEL_SPECIAL[o.type];
        if (!P) return null;
        return (
          <Sequence key={`s${i}`} from={o.frm} durationInFrames={o.dur} layout="none">
            <P dur={o.dur} props={o.props} />
          </Sequence>
        );
      })}
      {preview && <PreviewBug />}
      <Voice pieces={data.pieces} />
      <Music src={data.music} speech={data.speech} total={data.total} under={0.14} open={0.4} />
      <SfxTrack sfx={data.sfx} gain={0.9} />
    </AbsoluteFill>
  );
};

/* ---------------------------------------------------------------- pieces */
const Backdrop: React.FC<{accent: string; ch: string | null}> = ({accent, ch}) => {
  const f = useCurrentFrame();
  const n = ch ? MENUS[ch].n : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 700px at ${70 + Math.sin(f / 90) * 4}% ${30 + Math.cos(f / 120) * 5}%, ${accent}38, transparent 70%), radial-gradient(800px 600px at 10% 100%, ${accent}22, transparent 70%), linear-gradient(160deg, #17110C, #0B0907)`,
        }}
      />
      {n > 0 && (
        <div
          style={{
            position: 'absolute',
            right: -40,
            bottom: -150,
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 640,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `2px ${accent}40`,
            letterSpacing: -30,
          }}
        >
          0{n}
        </div>
      )}
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('noise.png')})`, backgroundPosition: `${(f * 37) % 256}px ${(f * 91) % 256}px`, opacity: 0.06, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

const Brand: React.FC = () => (
  <div style={{position: 'absolute', top: 70, left: 0, display: 'flex', alignItems: 'center', gap: 16}}>
    <div style={{width: 14, height: 14, borderRadius: 7, background: '#FF8A2A'}} />
    <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 22, letterSpacing: 5, color: C.cream}}>TASTY TUESDAY</div>
    <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 30, color: C.muted}}>edisi Tuna & Sardin</div>
  </div>
);

const ChapterHead: React.FC<{k: string; data: Timeline}> = ({k, data}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const m = MENUS[k];
  const start = data.chapters.find((c) => c.key === k)!.frm;
  const s = spring({frame: f - start - 14, fps, config: {damping: 16}});
  const words = m.menu.toUpperCase().split(' ');
  return (
    <div style={{position: 'absolute', top: 150, left: 0, right: 0, opacity: s, transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`}}>
      <div style={{fontFamily: F.wide, fontWeight: 800, fontStretch: '125%', fontSize: 24, letterSpacing: 5, color: m.accent}}>
        MENU 0{m.n} / 05 · MODE {m.mode.toUpperCase()}
      </div>
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: words.length > 2 ? 84 : 104, lineHeight: 0.98, letterSpacing: -3, color: C.white, marginTop: 14}}>
        {words.map((w, i) => (
          <div key={i} style={{color: i === words.length - 1 ? m.accent : C.white}}>
            {w}
          </div>
        ))}
      </div>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 52, color: C.cream, marginTop: 10}}>oleh {m.chef}</div>
    </div>
  );
};

const ShowHead: React.FC<{data: Timeline}> = () => {
  return (
    <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 118, lineHeight: 0.95, letterSpacing: -4, color: C.white}}>
        TASTY
        <br />
        <span style={{color: '#FF8A2A'}}>TUESDAY</span>
      </div>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 56, color: C.cream, marginTop: 14}}>5 chef · 5 menu · 1 Cooven</div>
    </div>
  );
};

const ChapterBar: React.FC<{data: Timeline; ch: string | null}> = ({ch}) => (
  <div style={{position: 'absolute', left: 0, right: 0, bottom: 44, display: 'flex', gap: 10}}>
    {ORDER.map((k) => {
      const m = MENUS[k];
      const on = k === ch;
      return (
        <div key={k} style={{flex: 1}}>
          <div style={{height: 5, borderRadius: 3, background: on ? m.accent : 'rgba(255,243,226,0.18)'}} />
          <div style={{marginTop: 8, fontFamily: F.wide, fontWeight: 800, fontStretch: '110%', fontSize: 15, letterSpacing: 1.5, color: on ? C.white : 'rgba(255,243,226,0.4)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {m.menu}
          </div>
        </div>
      );
    })}
  </div>
);

type SP = {dur: number; props: Record<string, any>};

/** Full-screen chapter sweep (~1 s), clears before the cook speaks. */
const ChapterSweep: React.FC<SP> = ({dur, props}) => {
  const f = useCurrentFrame();
  const m = MENUS[props.key];
  const inX = interpolate(f, [0, 9], [-110, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const outX = interpolate(f, [24, 34], [0, 110], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
  if (f > 36) return null;
  return (
    <AbsoluteFill style={{transform: `translateX(${inX + outX}%) skewX(-8deg)`, background: m.accent, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{transform: 'skewX(8deg)', textAlign: 'center', color: C.ink}}>
        <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 34, letterSpacing: 10}}>MENU 0{m.n}</div>
        <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 150, letterSpacing: -5, lineHeight: 1}}>{m.menu.toUpperCase()}</div>
      </div>
    </AbsoluteFill>
  );
};

const BigTitle: React.FC<SP> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 11, stiffness: 140}});
  const out = interpolate(f, [dur - 10, dur], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <div style={{position: 'absolute', left: PANEL_X, top: 470, opacity: out}}>
      <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 28, letterSpacing: 6, color: '#FF8A2A', transform: `translateX(${interpolate(s, [0, 1], [-60, 0])}px)`}}>HANYA TUNA & SARDIN</div>
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 132, color: C.white, letterSpacing: -5, lineHeight: 1, transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, transformOrigin: 'left center', opacity: s}}>
        5 MENU.
      </div>
    </div>
  );
};

const LIST = ORDER.map((k) => MENUS[k]);

const Lineup: React.FC<SP> = ({dur}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const out = interpolate(f, [dur - 10, dur], [1, 0], {extrapolateLeft: 'clamp'});
  return (
    <div style={{position: 'absolute', left: PANEL_X, top: 480, opacity: out}}>
      {LIST.map((m, i) => {
        const s = spring({frame: f - 12 - i * 9, fps, config: {damping: 14}});
        return (
          <div key={i} style={{display: 'flex', alignItems: 'baseline', gap: 22, height: 74, opacity: s, transform: `translateX(${interpolate(s, [0, 1], [50, 0])}px)`}}>
            <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 30, color: m.accent, width: 50}}>0{m.n}</div>
            <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 46, color: C.white, letterSpacing: -1}}>{m.menu}</div>
            <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 36, color: C.muted}}>{m.chef}</div>
          </div>
        );
      })}
    </div>
  );
};

const Recap: React.FC<SP> = (p) => <Lineup {...p} />;

const EndCard: React.FC<SP> = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 13}});
  return (
    <AbsoluteFill style={{background: `rgba(11,9,7,${interpolate(f, [0, 12], [0, 0.82], {extrapolateRight: 'clamp'})})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center', transform: `scale(${interpolate(s, [0, 1], [0.9, 1])})`, opacity: s}}>
        <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 80, color: C.cream}}>Terima kasih sebab tengok!</div>
        <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 120, letterSpacing: -4, color: C.white, lineHeight: 1}}>
          JUMPA <span style={{color: '#FF8A2A'}}>SELASA</span> DEPAN
        </div>
        <div style={{marginTop: 34, display: 'flex', gap: 18, justifyContent: 'center'}}>
          <div style={{padding: '20px 44px', borderRadius: 100, background: '#FF3B30', color: C.white, fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 30, letterSpacing: 3}}>SUBSCRIBE</div>
          <div style={{padding: '20px 40px', borderRadius: 100, border: '2px solid rgba(255,243,226,0.3)', color: C.cream, fontFamily: F.wide, fontWeight: 800, fontStretch: '115%', fontSize: 28, letterSpacing: 2}}>KOMEN MENU MINGGU DEPAN</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const PANEL_SPECIAL: Record<string, React.FC<SP>> = {
  chapter: ChapterSweep,
  bigtitle: BigTitle,
  lineup: Lineup,
  recap: Recap,
  endcard: EndCard,
};
