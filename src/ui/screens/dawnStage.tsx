// The First Dawn's stage (staging `dawn`; the rules are dawn.ts; T810): T843's `scene.dawn` still,
// full-bleed at 2×, its three frames stacked and crossfading as the lines turn them (dawn → mote →
// visor; cuts under reduced motion). While the still isn't painted, a placeholder: a sunrise
// gradient, Ishael's mote as a gold point, the silhouette's visor as a lit slit. The lines sit at
// the bottom on a dark panel. DOM at whole pixels, silent, aria-hidden under one label. Part of
// the finale's lazy chunk (app/acts/fin.ts registers it).
import { dialogue } from '../dialogue/state.ts';
import { prefersReducedMotion } from '../motion.ts';
import { DAWN_STILL, dawnFrame, dawnLabel, type DawnFrame } from './dawn.ts';
import { finaleStill, STILL_SCALE } from './epilogueStills.ts';
import './dawn.css';

const FRAMES: readonly DawnFrame[] = ['dawn', 'mote', 'visor'];

/** The stage, `from` its staging's start (the frame follows the lines, not the clock). */
export function DawnStage(_props: { readonly from: number }) {
  const still = prefersReducedMotion();
  const view = dialogue.scene.value;
  const frame = dawnFrame(view?.transcript ?? [], view?.line ?? null);
  const stills = FRAMES.map((f) => [f, finaleStill(DAWN_STILL, f)] as const);
  const painted = stills.some(([, s]) => s !== null);
  return (
    <div
      class={`dawn${still ? ' still' : ''}${painted ? '' : ' placeholder'}`}
      role="img"
      aria-label={dawnLabel(frame)}
      data-testid="stage-dawn"
      data-frame={frame}
    >
      {painted ? (
        stills.map(([f, s]) =>
          s === null ? null : (
            <img
              key={f}
              class={`dawn-still${f === frame ? ' on' : ''}`}
              src={s.url}
              width={s.w * STILL_SCALE}
              height={s.h * STILL_SCALE}
              alt=""
              aria-hidden="true"
            />
          ),
        )
      ) : (
        <div class="dawn-sky" aria-hidden="true">
          <span class="dawn-sun" />
          <span class="dawn-ridge" />
          <span class={`dawn-mote${frame === 'dawn' ? '' : ' on'}`} />
          <span class={`dawn-figure${frame === 'visor' ? ' on' : ''}`}>
            <span class="dawn-visor" />
          </span>
        </div>
      )}
    </div>
  );
}
