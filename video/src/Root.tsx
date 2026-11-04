import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import {Full} from './Full';
import {Timeline} from './theme';
import roll from './data/roll.json';
import wrap from './data/wrap.json';
import puff from './data/puff.json';
import sambal from './data/sambal.json';
import pizza from './data/pizza.json';
import full from './data/full.json';
import reel from './data/reel.json';
import bloopers from './data/bloopers.json';
import t_roll from './data/t_roll.json';
import t_wrap from './data/t_wrap.json';
import t_puff from './data/t_puff.json';
import t_sambal from './data/t_sambal.json';
import t_pizza from './data/t_pizza.json';

const SHORTS: [string, string, Timeline][] = [
  ['Short-1-SardinRoll', 'roll', roll as unknown as Timeline],
  ['Short-2-TortillaTuna', 'wrap', wrap as unknown as Timeline],
  ['Short-3-SardinPuff', 'puff', puff as unknown as Timeline],
  ['Short-4-SambalSardin', 'sambal', sambal as unknown as Timeline],
  ['Short-5-PizzaTuna', 'pizza', pizza as unknown as Timeline],
  ['Reel-5Menu', 'reel', reel as unknown as Timeline],
  ['Bloopers', 'bloopers', bloopers as unknown as Timeline],
  ['Teaser-1-SardinRoll', 'roll', t_roll as unknown as Timeline],
  ['Teaser-2-TortillaTuna', 'wrap', t_wrap as unknown as Timeline],
  ['Teaser-3-SardinPuff', 'puff', t_puff as unknown as Timeline],
  ['Teaser-4-SambalSardin', 'sambal', t_sambal as unknown as Timeline],
  ['Teaser-5-PizzaTuna', 'pizza', t_pizza as unknown as Timeline],
];

export const RemotionRoot: React.FC = () => (
  <>
    {SHORTS.map(([id, key, data]) => (
      <Composition
        key={id}
        id={id}
        component={Short as any}
        durationInFrames={data.total}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{data, menuKey: key, preview: true}}
      />
    ))}
    <Composition
      id="Full-YouTube"
      component={Full as any}
      durationInFrames={(full as unknown as Timeline).total}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{data: full as unknown as Timeline, preview: true}}
    />
  </>
);
