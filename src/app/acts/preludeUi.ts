// The prelude's stage (T1001): its six stills (content/sprites/scenes/prelude/) and the component
// that draws them, registered as this chunk loads (app/prelude.ts loads it; ui/screens/
// preludeState.ts), so none of it is in the initial JS or the boot atlas.
import { PreludeStage } from '../../ui/screens/preludeStage.tsx';
import { registerPreludeUi } from '../../ui/screens/preludeState.ts';

registerPreludeUi({ PreludeStage });
