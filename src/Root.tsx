import React from "react";
import { Composition } from "remotion";
import { TastyTuesday } from "./Video";
import timeline from "./data/timeline.json";
import { FPS, HEIGHT, WIDTH } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TastyTuesday" component={TastyTuesday} durationInFrames={timeline.durationInFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ showSafeZone: false }} />
    <Composition id="TastyTuesdaySafeZone" component={TastyTuesday} durationInFrames={timeline.durationInFrames} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{ showSafeZone: true }} />
  </>
);
