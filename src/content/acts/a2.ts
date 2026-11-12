// Act II's story content, one lazy chunk with Act II's sounds (app/acts/a2.ts; content/acts/index.ts
// says what an act holds). A map task registers its dialogue here, one line in campaign order.
import { ACT2_CODEX, ACT2_CODEX_VERSIONS } from '../codex/act2.ts';
import { barks as a2m01Barks } from '../dialogue/a2/a2_m01/barks.ts';
import { scenes as a2m01Scenes } from '../dialogue/a2/a2_m01/scenes.ts';
import { barks as a2m02Barks } from '../dialogue/a2/a2_m02/barks.ts';
import { scenes as a2m02Scenes } from '../dialogue/a2/a2_m02/scenes.ts';
import { barks as a2m03Barks } from '../dialogue/a2/a2_m03/barks.ts';
import { scenes as a2m03Scenes } from '../dialogue/a2/a2_m03/scenes.ts';
import { barks as a2m04Barks } from '../dialogue/a2/a2_m04/barks.ts';
import { scenes as a2m04BaseScenes } from '../dialogue/a2/a2_m04/base.ts';
import { scenes as a2m04Scenes } from '../dialogue/a2/a2_m04/scenes.ts';
import { barks as a2m05Barks } from '../dialogue/a2/a2_m05/barks.ts';
import { scenes as a2m05Scenes } from '../dialogue/a2/a2_m05/scenes.ts';
import { barks as a2m06Barks } from '../dialogue/a2/a2_m06/barks.ts';
import { scenes as a2m06BaseScenes } from '../dialogue/a2/a2_m06/base.ts';
import { scenes as a2m06Scenes } from '../dialogue/a2/a2_m06/scenes.ts';
import { ACT2_MEMOS } from '../memos/act2.ts';
import type { ActStory } from './index.ts';

export const ACT2_STORY: ActStory = {
  act: 2,
  marker: 'lazy-act:2',
  dialogue: [
    { map: 'a2_m01', scenes: a2m01Scenes, barks: a2m01Barks },
    { map: 'a2_m02', scenes: a2m02Scenes, barks: a2m02Barks },
    { map: 'a2_m03', scenes: a2m03Scenes, barks: a2m03Barks },
    { map: 'a2_m04', scenes: [...a2m04Scenes, ...a2m04BaseScenes], barks: a2m04Barks },
    { map: 'a2_m05', scenes: a2m05Scenes, barks: a2m05Barks },
    { map: 'a2_m06', scenes: [...a2m06Scenes, ...a2m06BaseScenes], barks: a2m06Barks },
  ],
  codex: ACT2_CODEX,
  codexVersions: ACT2_CODEX_VERSIONS,
  memos: ACT2_MEMOS,
};
