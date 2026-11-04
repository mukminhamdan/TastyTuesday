import React from 'react';
import {Composition} from 'remotion';
import {Clip} from './Clip';
import {CLIPS} from './clips';
import {FPS, H, W} from './lib/theme';

export const Root: React.FC = () => (
  <>
    {CLIPS.map((c) => (
      <Composition key={c.id} id={c.id} component={Clip} durationInFrames={c.durationInFrames} fps={FPS} width={W} height={H} defaultProps={{data: c}} />
    ))}
  </>
);
