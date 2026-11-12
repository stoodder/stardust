// The finale's screens (T810): the campaign's close (Sterling's memo card, the epilogue, the
// credits, the final image, and app/endingPlay.ts that plays it) and the Dawn and C5 stages,
// registered as this chunk loads
// (app/finaleScreens.ts loads it; ui/screens/epilogueState.ts), so none of it is in the initial JS.
import { C5Stage } from '../../ui/screens/c5Stage.tsx';
import { DawnStage } from '../../ui/screens/dawnStage.tsx';
import { EndingLayer } from '../../ui/screens/epilogueLayer.tsx';
import { registerFinaleUi } from '../../ui/screens/epilogueState.ts';
import { c5LeadInMs } from '../../ui/screens/c5.ts';
import { dawnLeadInMs } from '../../ui/screens/dawn.ts';
import { registerEnding } from '../ending.ts';
import { ENDING_PLAYER } from '../endingPlay.ts';
import { registerPostGameUi } from './postGame.ts'; // T863

registerFinaleUi({
  EndingLayer,
  C5Stage,
  DawnStage,
  leadInMs: (kind, still) => (kind === 'dawn' ? dawnLeadInMs(still) : c5LeadInMs(still)),
});
registerEnding(ENDING_PLAYER);
registerPostGameUi(); // T863: the post-game shell
