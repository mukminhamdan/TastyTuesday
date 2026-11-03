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

const SHORTS: [string, string, Timeline][] = [
  ['Short-1-SardinRoll', 'roll', roll as unknown as Timeline],
  ['Short-2-TortillaTuna', 'wrap', wrap as unknown as Timeline],
  ['Short-3-SardinPuff', 'puff', puff as unknown as Timeline],
  ['Short-4-SambalSardin', 'sambal', sambal as unknown as Timeline],
  ['Short-5-PizzaTuna', 'pizza', pizza as unknown as Timeline],
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
