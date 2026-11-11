import React from 'react';
import {Composition, Series, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {EpisodeVideo, episodeFrames} from './EpisodeVideo';
import {pizzaEp1} from './episodes/pizza-ep1';
import {pizzaEp2} from './episodes/pizza-ep2';
import {meeGoreng} from './episodes/mee-goreng';
import {telurDadar} from './episodes/telur-dadar';
import {FONT_BOLD, FONT_MARKER, FPS, H, W} from './lib/theme';

loadFont({family: FONT_BOLD, url: staticFile('fonts/poppins-latin-800-normal.woff2'), weight: '800'});
loadFont({family: FONT_BOLD, url: staticFile('fonts/poppins-latin-900-normal.woff2'), weight: '900'});
loadFont({family: FONT_MARKER, url: staticFile('fonts/permanent-marker-latin-400-normal.woff2'), weight: '400'});

export const EPISODES = [pizzaEp1, pizzaEp2, meeGoreng, telurDadar];

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
