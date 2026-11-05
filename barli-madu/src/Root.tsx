import React from 'react';
import {Composition} from 'remotion';
import {Main, MainProps} from './Main';
import {FPS, H, W} from './theme';
import timeline from './timeline.json';
import type {Timeline} from './types';

export const Root: React.FC = () => (
  <Composition
    id="BarliMadu"
    component={Main}
    width={W}
    height={H}
    fps={FPS}
    durationInFrames={Math.ceil((timeline as Timeline).duration * FPS)}
    defaultProps={{proxy: true, safeGuides: false, timeline: timeline as Timeline} satisfies MainProps}
  />
);
