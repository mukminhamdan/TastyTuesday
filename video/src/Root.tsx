import React from 'react';
import {Composition, Series, Still, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {EpisodeVideo, episodeFrames} from './EpisodeVideo';
import {Thumbnail} from './Thumbnail';
import {resepiDohPizza} from './episodes/resepi-doh-pizza';
import {ROTI_MANIS} from './episodes/roti-manis';
import {AYAM_PERCIK} from './episodes/ayam-percik';
import {IKAN_BAWAL} from './episodes/ikan-bawal';
import {PES_GULAI} from './episodes/pes-gulai';
import {pizzaEp1} from './episodes/pizza-ep1';
import {pizzaEp2} from './episodes/pizza-ep2';
import {meeGoreng} from './episodes/mee-goreng';
import {telurDadar} from './episodes/telur-dadar';
import {BRAND, FONT_BOLD, FONT_MARKER, FPS, H, W} from './lib/theme';

loadFont({family: FONT_BOLD, url: staticFile('fonts/poppins-latin-800-normal.woff2'), weight: '800'});
loadFont({family: FONT_BOLD, url: staticFile('fonts/poppins-latin-900-normal.woff2'), weight: '900'});
loadFont({family: FONT_MARKER, url: staticFile('fonts/permanent-marker-latin-400-normal.woff2'), weight: '400'});

const ROTI_THUMBS = [
  {id: 'Thumb-Roti-P1', props: {bg: 'thumbs/roti-p1.jpg', kicker: 'Roti Manis', title: 'BUAT\nDOH', sticker: 'PART 1', zoom: {s: 2, x: 0.22, y: 0.62}}},
  {id: 'Thumb-Roti-P2', props: {bg: 'thumbs/roti-p2.jpg', kicker: 'Roti Manis', title: 'BENTUK\nROTI', sticker: 'PART 2', zoom: {s: 1.08, x: 0.5, y: 0.75}}},
  {id: 'Thumb-Roti-P3', props: {bg: 'thumbs/roti-p3.jpg', kicker: 'Roti Manis', title: 'BAKAR\nCOOVEN', sticker: 'PART 3', zoom: {s: 1.08, x: 0.5, y: 0.6}}},
  {id: 'Thumb-Roti-Bonus', props: {bg: 'thumbs/roti-bonus.jpg', kicker: 'Bonus', title: 'LEBIHAN\nDOH?', sticker: 'JANGAN BUANG!', zoom: {s: 1.1, x: 0.5, y: 0.8}}},
  {id: 'Thumb-Roti-Resipi', props: {bg: 'thumbs/roti-resipi.jpg', kicker: 'Resipi', title: 'ROTI\nMANIS', sticker: 'GEBU GILA!', chips: ['7 bahan je', 'Cooven 150°C'], zoom: {s: 1.08, x: 0.5, y: 0.6}}},
];

/** ayam percik: cooler grade (cook found the kitchen too orange); zoom keeps the live PiP windows (x > 0.785) out */
const AYAM_FILTER = 'contrast(1.14) saturate(1.0) brightness(1.03) hue-rotate(-4deg)';
const AYAM_THUMBS = [
  {id: 'Thumb-AyamPercik', props: {bg: 'thumbs/ayam-siap.jpg', kicker: 'Smart Cook', title: 'AYAM\nPERCIK', sticker: 'TANPA ARANG!', chips: ['Braise + Broil'], zoom: {s: 1.06, x: 0.5, y: 0.6}, titleTop: 330, chipsTop: 1400, filter: AYAM_FILTER}},
  {id: 'Thumb-AyamPercik-BA', props: {bg: 'thumbs/ayam-ba.jpg', kicker: 'Ayam Percik', title: 'DARI NI…\nJADI NI!', sticker: '1 PERIUK JE!', zoom: {s: 1, x: 0.5, y: 0.5}, titleTop: 700, filter: AYAM_FILTER}},
];

/** ikan bawal stim tofu: premium food look, same as the videos */
const IKAN_FILTER = 'contrast(1.1) saturate(1.12) brightness(1.06)';
const IKAN_THUMBS = [
  {id: 'Thumb-IkanBawal', props: {bg: 'thumbs/ikan-202844.jpg', kicker: 'Mode Steam', title: 'IKAN\nBAWAL', sticker: 'STIM TOFU', chips: ['4 sos je', 'Food Engine Cooven'], zoom: {s: 1.04, x: 0.5, y: 0.5}, titleTop: 380, chipsTop: 1330, filter: IKAN_FILTER}},
  {id: 'Thumb-IkanBawal-Quote1', props: {bg: 'thumbs/ikan-stim.jpg', kicker: 'Ikan Stim', title: 'TAK PERLU\nKE RESTORAN', titleSize: 116, sticker: 'MASAK SENDIRI!', zoom: {s: 1.04, x: 0.5, y: 0.55}, titleTop: 380, filter: IKAN_FILTER}},
  {id: 'Thumb-IkanBawal-Quote2', props: {bg: 'thumbs/ikan-202847.jpg', kicker: 'Masak dengan', title: 'SEPENUH\nHATI', sticker: 'IKAN BAWAL STIM', zoom: {s: 1.55, x: 0.5, y: 0.3}, titleTop: 380, filter: IKAN_FILTER}},
];

/** pes gulai kawah: same premium look as the videos */
const GULAI_THUMBS = [
  {id: 'Thumb-PesGulai', props: {bg: 'thumbs/gulai-pot.jpg', kicker: 'Resipi', title: 'PES GULAI\nKAWAH', titleSize: 130, sticker: 'PECAH MINYAK!', chips: ['Rempah 4 sekawan', 'Cili boh'], zoom: {s: 1.25, x: 0.5, y: 0.5}, titleTop: 380, chipsTop: 1330, filter: IKAN_FILTER}},
  {id: 'Thumb-PesGulai-Quote', props: {bg: 'thumbs/gulai-macro.jpg', kicker: 'Gulai Kawah', title: 'JANGAN\nTERGESA-GESA', titleSize: 108, sticker: 'PECAH MINYAK', zoom: {s: 1.04, x: 0.5, y: 0.5}, titleTop: 380, filter: IKAN_FILTER}},
];

export const EPISODES = [pizzaEp1, pizzaEp2, meeGoreng, telurDadar, resepiDohPizza, ...ROTI_MANIS, ...AYAM_PERCIK, ...IKAN_BAWAL, ...PES_GULAI];

const PIZZA_SERIES = [pizzaEp1, pizzaEp2];

const AllEpisodes: React.FC<{showSafeZone?: boolean; only?: 'pizza'}> = ({showSafeZone, only}) => (
  <Series>
    {(only === 'pizza' ? PIZZA_SERIES : EPISODES).map((e) => (
      <Series.Sequence key={e.id} durationInFrames={episodeFrames(e)}>
        <EpisodeVideo episode={e} showSafeZone={showSafeZone} />
      </Series.Sequence>
    ))}
  </Series>
);

export const RemotionRoot: React.FC = () => (
  <>
    {EPISODES.map((e) => (
      <Composition
        key={e.id}
        id={e.id}
        component={EpisodeVideo}
        durationInFrames={episodeFrames(e)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{episode: e, showSafeZone: false}}
      />
    ))}
    {/* thumbnails / covers */}
    {[...ROTI_THUMBS, ...AYAM_THUMBS, ...IKAN_THUMBS, ...GULAI_THUMBS].map((t) => (
      <Still key={t.id} id={t.id} component={Thumbnail} width={W} height={H} defaultProps={{...t.props, brand: BRAND}} />
    ))}
    <Still
      id="Thumb-DohPizza-A"
      component={Thumbnail}
      width={W}
      height={H}
      defaultProps={{
        bg: 'thumbs/doh-866.jpg',
        kicker: 'Resipi',
        title: 'DOH\nPIZZA',
        sticker: '4 BAHAN JE!',
        brand: BRAND,
        zoom: {s: 1.12, x: 0.5, y: 0.72},
      }}
    />
    <Still
      id="Thumb-DohPizza-B"
      component={Thumbnail}
      width={W}
      height={H}
      defaultProps={{
        bg: 'thumbs/doh-866.jpg',
        kicker: 'Resipi',
        title: 'DOH\nPIZZA',
        sticker: '4 BAHAN JE!',
        brand: BRAND,
        chips: ['300g tepung roti', '180g air', '1 tsp garam', '1 tsp yis'],
        zoom: {s: 1.12, x: 0.5, y: 0.72},
      }}
    />
    <Composition
      id="Siri-Pizza-Penuh"
      component={AllEpisodes}
      durationInFrames={PIZZA_SERIES.reduce((a, e) => a + episodeFrames(e), 0)}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{showSafeZone: false, only: 'pizza' as const}}
    />
    <Composition
      id="Semua-Video"
      component={AllEpisodes}
      durationInFrames={EPISODES.reduce((a, e) => a + episodeFrames(e), 0)}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{showSafeZone: false}}
    />
  </>
);
