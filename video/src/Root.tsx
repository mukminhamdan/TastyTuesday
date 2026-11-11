import React from 'react';
import {Composition, Series, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {EpisodeVideo, episodeFrames} from './EpisodeVideo';
import {ep1} from './episodes/ep1-pizza';
import {ep2} from './episodes/ep2-mee';
import {ep3} from './episodes/ep3-telur';
import {FONT_BOLD, FONT_MARKER, FPS, H, W} from './lib/theme';

loadFont({family: FONT_BOLD, url: staticFile('fonts/poppins-latin-800-normal.woff2'), weight: '800'});
loadFont({family: FONT_BOLD, url: staticFile('fonts/poppins-latin-900-normal.woff2'), weight: '900'});
loadFont({family: FONT_MARKER, url: staticFile('fonts/permanent-marker-latin-400-normal.woff2'), weight: '400'});

export const EPISODES = [ep1, ep2, ep3];

const AllEpisodes: React.FC<{showSafeZone?: boolean}> = ({showSafeZone}) => (
  <Series>
    {EPISODES.map((e) => (
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
      id="Siri-Penuh"
      component={AllEpisodes}
      durationInFrames={EPISODES.reduce((a, e) => a + episodeFrames(e), 0)}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{showSafeZone: false}}
    />
  </>
);
