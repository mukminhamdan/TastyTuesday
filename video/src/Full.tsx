import React from 'react';
import {AbsoluteFill, Easing, Img, Sequence, getInputProps, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Footage, Voice} from './components/Footage';
import {PanelCaptions} from './components/Captions';
import {GRAPHICS} from './components/Graphics';
import {Music, SfxTrack} from './components/AudioBed';
import {C, F, MENUS, Timeline, loadFonts} from './theme';
import {PreviewBug} from './Short';

loadFonts();

// `--props='{"bg":"granite"}'` → white granite worktop with dark panel text
const LIGHT = (getInputProps() as {bg?: string}).bg === 'granite';
const T = LIGHT
  ? {text: '#1B1612', sub: '#4A3F36', muted: 'rgba(27,22,18,0.55)', bar: 'rgba(27,22,18,0.16)', capHl: '#B5530F'}
  : {text: C.white, sub: C.cream, muted: C.muted, bar: 'rgba(255,243,226,0.18)', capHl: C.gold};

const ORDER = ['roll', 'wrap', 'puff', 'sambal', 'pizza'];
const CARD = {x: 130, y: 96, h: 944};
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
      <LiveTag />
      {/* video card */}
      <div
        style={{
          position: 'absolute',
          left: CARD.x,
          top: CARD.y,
          width: CARD_W,
          height: CARD.h,
          borderRadius: 30,
          overflow: 'hidden',
          // dark glass bezel + thin brass line, like a monitor on set
          boxShadow:
            LIGHT
              ? '0 30px 70px rgba(40,30,20,0.35), 0 0 0 1px rgba(160,120,60,0.6), 0 0 0 10px rgba(255,255,255,0.9), 0 0 0 11px rgba(160,120,60,0.35)'
              : '0 40px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,110,0.55), 0 0 0 10px rgba(14,11,9,0.85), 0 0 0 11px rgba(212,175,110,0.22)',
        }}
      >
        <div style={{width: 1080, height: 1920, transform: `scale(${SCALE})`, transformOrigin: '0 0'}}>
          <Footage pieces={data.pieces} look="cinema" />
        </div>
      </div>
      {LIGHT && (
        // matte card behind the text column so small type stays legible on the granite
        <div
          style={{
            position: 'absolute',
            left: PANEL_X - 56,
            top: 36,
            right: 56,
            bottom: 36,
            borderRadius: 28,
            background: 'linear-gradient(160deg, rgba(252,250,246,0.94), rgba(246,242,236,0.9))',
            boxShadow: '0 24px 60px rgba(40,30,20,0.18), 0 0 0 1px rgba(160,120,60,0.25)',
          }}
        />
      )}
      {/* side panel */}
      <div style={{position: 'absolute', left: PANEL_X, top: 0, width: 1920 - PANEL_X - 100, height: 1080}}>
        <Brand />
        {ch ? <ChapterHead k={ch} data={data} /> : <ShowHead data={data} />}
        <div style={{position: 'absolute', left: 0, right: 0, top: 862, height: 170, display: 'flex', alignItems: 'flex-start'}}>
          <PanelCaptions caps={data.captions} accent={accent} color={T.text} hl={T.capHl} />
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
/* Thin-line ingredient doodles (24×24 grid), drawn very faintly over the worktop. */
const DOODLES: string[] = [
  'M2 12c4-5 12-5 16 0-4 5-12 5-16 0zM18 12l4-3v6zM7 11.2h.01', // sardine
  'M5 6h14v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM5 6c0-1.7 3-3 7-3s7 1.3 7 3M5 10h14M5 15h14', // tin
  'M15 4c1 2 0 3-1 4-3 3-6 8-10 11 5-1 10-5 12-10 .6-1.6.4-3.4-1-5zM15 4c1-1 2-1 3-2', // chilli
  'M12 4c-4 3-6 6-6 9a6 6 0 0 0 12 0c0-3-2-6-6-9zM12 4v17M9 8c-1 3-1 7 1 12M15 8c1 3 1 7-1 12', // garlic
  'M7 3a3 4 0 1 0 0 .01M7 11v10', // spoon
  'M12 21V11M12 11c-3 0-5-3-5-8M12 11c3 0 5-3 5-8M12 11c-1-3-1-6 0-8M12 11c1-3 1-6 0-8', // whisk
  'M4 20c10 0 16-6 16-16-10 0-16 6-16 16zM4 20 14 10', // leaf
  'M3 14h18M5 14a7 7 0 0 0 14 0M12 7v-3M9 8l-1-2M15 8l1-2', // bowl + steam
];

const Backdrop: React.FC<{accent: string; ch: string | null}> = ({accent, ch}) => {
  const f = useCurrentFrame();
  const n = ch ? MENUS[ch].n : 0;
  const drift = (f * 0.15) % 160;
  const cells: React.ReactNode[] = [];
  for (let r = -1; r < 8; r++) {
    for (let c = 0; c < 13; c++) {
      const i = (r * 5 + c * 3 + 64) % DOODLES.length;
      const x = c * 160 + (r % 2 ? 80 : 0) - drift;
      const y = r * 150 + drift * 0.5;
      cells.push(
        <g key={`${r}-${c}`} transform={`translate(${x} ${y}) rotate(${((r * 37 + c * 53) % 50) - 25} 24 24) scale(2)`}>
          <path d={DOODLES[i]} fill="none" stroke={LIGHT ? "#2A221C" : "#FFF3E2"} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
        </g>,
      );
    }
  }
  return (
    <AbsoluteFill>
      <Img src={staticFile(LIGHT ? 'bg/granite.png' : 'bg/kitchen.png')} style={{width: '100%', height: '100%'}} />
      {/* per-menu colour wash, kept low so the slate stays the hero */}
      <AbsoluteFill style={{background: `radial-gradient(900px 640px at 78% 28%, ${accent}${LIGHT ? '14' : '22'}, transparent 70%)`, mixBlendMode: LIGHT ? 'multiply' : 'screen'}} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: LIGHT ? 0.07 : 0.045}}>
        {cells}
      </svg>
      {n > 0 && (
        <div
          style={{
            position: 'absolute',
            right: -30,
            bottom: -170,
            fontFamily: F.display,
            fontWeight: 900,
            fontSize: 600,
            lineHeight: 1,
            color: 'transparent',
            WebkitTextStroke: `1.5px ${accent}30`,
            letterSpacing: -30,
          }}
        >
          0{n}
        </div>
      )}
      <AbsoluteFill style={{backgroundImage: `url(${staticFile('noise.png')})`, backgroundPosition: `${(f * 37) % 256}px ${(f * 91) % 256}px`, opacity: LIGHT ? 0.02 : 0.05, mixBlendMode: 'overlay'}} />
    </AbsoluteFill>
  );
};

/** Small "live from the kitchen" tag above the video frame. */
const LiveTag: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <div style={{position: 'absolute', left: CARD.x + 4, top: 40, display: 'flex', alignItems: 'center', gap: 12, ...(LIGHT ? {padding: '6px 16px', borderRadius: 100, background: 'rgba(252,250,246,0.94)', boxShadow: '0 6px 18px rgba(40,30,20,0.15)'} : {})}}>
      <div style={{width: 12, height: 12, borderRadius: 6, background: '#FF3B30', boxShadow: '0 0 12px #FF3B30', opacity: 0.55 + 0.45 * Math.abs(Math.sin(f / 18))}} />
      <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 19, letterSpacing: 5, color: T.sub}}>LIVE DARI DAPUR</div>
      <div style={{height: 1, width: 120, background: 'linear-gradient(90deg, rgba(212,175,110,0.7), transparent)'}} />
    </div>
  );
};

const Brand: React.FC = () => (
  <div style={{position: 'absolute', top: 70, left: 0, display: 'flex', alignItems: 'center', gap: 16}}>
    <div style={{width: 14, height: 14, borderRadius: 7, background: '#FF8A2A'}} />
    <div style={{fontFamily: F.wide, fontWeight: 900, fontStretch: '125%', fontSize: 22, letterSpacing: 5, color: T.sub}}>TASTY TUESDAY</div>
    <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 30, color: T.muted}}>edisi Tuna & Sardin</div>
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
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: words.length > 2 ? 84 : 104, lineHeight: 0.98, letterSpacing: -3, color: T.text, marginTop: 14}}>
        {words.map((w, i) => (
          <div key={i} style={{color: i === words.length - 1 ? m.accent : T.text}}>
            {w}
          </div>
        ))}
      </div>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 52, color: T.sub, marginTop: 10}}>oleh {m.chef}</div>
    </div>
  );
};

const ShowHead: React.FC<{data: Timeline}> = () => {
  return (
    <div style={{position: 'absolute', top: 150, left: 0, right: 0}}>
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 118, lineHeight: 0.95, letterSpacing: -4, color: T.text}}>
        TASTY
        <br />
        <span style={{color: '#FF8A2A'}}>TUESDAY</span>
      </div>
      <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 56, color: T.sub, marginTop: 14}}>5 chef · 5 menu · 1 Cooven</div>
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
          <div style={{height: 5, borderRadius: 3, background: on ? m.accent : T.bar}} />
          <div style={{marginTop: 8, fontFamily: F.wide, fontWeight: 800, fontStretch: '110%', fontSize: 15, letterSpacing: 1.5, color: on ? T.text : T.muted, textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
            {m.menu}
          </div>
        </div>
      );
    })}
  </div>
);

type SP = {dur: number; props: Record<string, any>};

/** Cinematic chapter card: dip, serif kicker + title, then back to picture (~1.4 s). */
const ChapterSweep: React.FC<SP> = ({props}) => {
  const f = useCurrentFrame();
  const m = MENUS[props.key];
  if (f > 44) return null;
  const dim = interpolate(f, [0, 8, 30, 44], [0, 0.88, 0.88, 0], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
  const txt = interpolate(f, [6, 14, 28, 38], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rise = interpolate(f, [6, 20], [24, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const line = interpolate(f, [8, 22], [0, 220], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  return (
    <AbsoluteFill style={{background: `rgba(8,6,4,${dim})`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{textAlign: 'center', opacity: txt, transform: `translateY(${rise}px)`}}>
        <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 54, color: m.accent}}>Menu {m.n} daripada 5</div>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 120, letterSpacing: -4, lineHeight: 1.02, color: C.cream}}>{m.menu}</div>
        <div style={{height: 2, width: line, background: m.accent, margin: '22px auto 0'}} />
        <div style={{fontFamily: F.wide, fontWeight: 800, fontStretch: '125%', fontSize: 22, letterSpacing: 8, color: C.muted, marginTop: 18}}>{m.chef.toUpperCase()} · MODE {m.mode.toUpperCase()}</div>
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
      <div style={{fontFamily: F.display, fontWeight: 900, fontSize: 132, color: T.text, letterSpacing: -5, lineHeight: 1, transform: `scale(${interpolate(s, [0, 1], [1.4, 1])})`, transformOrigin: 'left center', opacity: s}}>
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
            <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 46, color: T.text, letterSpacing: -1}}>{m.menu}</div>
            <div style={{fontFamily: F.serif, fontStyle: 'italic', fontSize: 36, color: T.muted}}>{m.chef}</div>
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
