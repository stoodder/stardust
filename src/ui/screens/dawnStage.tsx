// The First Dawn's stage (staging `dawn`; the rules are dawn.ts; T810): T843's `scene.dawn` still,
// full-bleed at 2× (pixelated, from (0, 0)), its three frames stacked and crossfading as the lines
// turn them (dawn → mote → visor; cuts under reduced motion). The lines sit at the bottom on a dark
// panel, over the still's dark ledge. Silent, aria-hidden under one label. Part of the finale's
// lazy chunk (app/acts/finUi.ts registers it).
import { DAWN_FRAMES } from '../../content/sprites/scenes/finale.ts';
import { dialogue } from '../dialogue/state.ts';
import { finaleSceneSprite } from '../dialogue/finaleSceneArt.ts';
import { prefersReducedMotion } from '../motion.ts';
import { DAWN_STILL, dawnFrame, dawnLabel, STILL_SCALE } from './dawn.ts';
import './dawn.css';

/** The stage, `from` its staging's start (the frame follows the lines, not the clock). */
export function DawnStage(_props: { readonly from: number }) {
  const still = prefersReducedMotion();
  const view = dialogue.scene.value;
  const frame = dawnFrame(view?.transcript ?? [], view?.line ?? null);
  return (
    <div
      class={`dawn${still ? ' still' : ''}`}
      role="img"
      aria-label={dawnLabel(frame)}
      data-testid="stage-dawn"
      data-frame={frame}
    >
      {DAWN_FRAMES.map((f) => {
        const art = finaleSceneSprite(DAWN_STILL, f);
        return art === null ? null : (
          <img
            key={f}
            class={`dawn-still${f === frame ? ' on' : ''}`}
            src={art.url}
            width={art.w * STILL_SCALE}
            height={art.h * STILL_SCALE}
            alt=""
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
