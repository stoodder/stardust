// The finale's screens (T810): the campaign's close (Sterling's memo card, the epilogue, the
// credits, the final image) and the Dawn and C5 stages, registered as this chunk loads
// (app/finaleScreens.ts loads it; ui/screens/epilogueState.ts), so none of it is in the initial JS.
import { C5Stage } from '../../ui/screens/c5Stage.tsx';
import { DawnStage } from '../../ui/screens/dawnStage.tsx';
import { EndingLayer } from '../../ui/screens/epilogueLayer.tsx';
import { registerFinaleUi } from '../../ui/screens/epilogueState.ts';

registerFinaleUi({ EndingLayer, C5Stage, DawnStage });
