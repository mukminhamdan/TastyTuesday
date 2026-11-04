import React from "react";
import { Composition } from "remotion";
import { Edit } from "./Video";
import { mainEdit } from "./data/edit";
import { bloopersEdit } from "./data/bloopers";
import { FPS, HEIGHT, WIDTH } from "./theme";

const common = { fps: FPS, width: WIDTH, height: HEIGHT, component: Edit } as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="TastyTuesday" {...common} durationInFrames={mainEdit.timeline.durationInFrames} defaultProps={{ data: mainEdit, showSafeZone: false }} />
    <Composition id="TastyTuesdaySafeZone" {...common} durationInFrames={mainEdit.timeline.durationInFrames} defaultProps={{ data: mainEdit, showSafeZone: true }} />
    <Composition id="Bloopers" {...common} durationInFrames={bloopersEdit.timeline.durationInFrames} defaultProps={{ data: bloopersEdit, showSafeZone: false }} />
    <Composition id="BloopersSafeZone" {...common} durationInFrames={bloopersEdit.timeline.durationInFrames} defaultProps={{ data: bloopersEdit, showSafeZone: true }} />
  </>
);
