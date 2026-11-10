// A debrief's story choice offered at the base (D138: C2 is never lost). C2 waits on A2M4's first
// Results card; a player who closed the tab there reaches the base with A2M4 won and
// `stardust_choice` unset. The base then offers it before anything else, as a panel over the base
// (ui/screens/BaseChoice.tsx): the offerer's lines up to the choice, the choice priced at the
// bank as it is now, and once taken what it did and the debrief's lines after it. The same
// offer and transaction as the card's (app/resultsFlow.ts `openChoice`, `takeChoice`,
// `RESULTS_CHOICES`), written at once. A debrief that decides without a choice (C2's `none`, an
// empty bank) is made quietly: nobody hears "No refunds" who wasn't asked. Plays only while
// dialogue does (`?test=1` turns it off unless `&dialogue=1`, the radio's rule), like the visit
// scenes, which wait for it (app/baseScenes.ts).
import { CAMPAIGN_PLAN_IDS } from '../content/campaign.ts';
import { SCENES } from '../content/dialogue/index.ts';
import type { LineNode } from '../content/dialogue/types.ts';
import { isMapWon } from '../meta/index.ts';
import { baseChoice } from '../ui/screens/state.ts';
import { dialogueEnabled } from './dialogue.ts';
import {
  commitChoice,
  madeView,
  openChoice,
  takeChoice,
  type PendingChoice,
} from './resultsFlow.ts';
import { debriefStoryOf, runStoryContext, spoken } from './runResult.ts';
import { activeSave } from './save.ts';

let pending: PendingChoice | null = null;
let onClose: (() => void) | null = null;

/** The offerer's own lines just before the choice (the trailing run by its last speaker). */
function offerLines(lines: readonly LineNode[]): LineNode[] {
  const by = lines.at(-1)?.speaker;
  let i = lines.length;
  while (i > 0 && lines[i - 1]?.speaker === by) i--;
  return lines.slice(i);
}

/**
 * Offers the first won map's unanswered debrief choice as a panel over the base. `done` runs once
 * the panel closes (the base's visit scenes). Returns whether it opened; when it didn't, `done`
 * never runs (the caller plays on at once).
 */
export function offerChoiceAtBase(done: () => void): boolean {
  pending = null;
  onClose = null;
  baseChoice.value = null;
  const save = activeSave();
  if (save === null || !dialogueEnabled()) return false;
  for (const map of CAMPAIGN_PLAN_IDS) {
    const scene = SCENES[`${map}_debrief`];
    if (scene === undefined || !isMapWon(save, map)) continue;
    const { story } = debriefStoryOf(save);
    if (story === undefined) continue;
    const opening = openChoice(scene, runStoryContext(map, { story }, 'won'), story, save, true);
    if (opening.kind === 'decided') {
      commitChoice(opening.t.save, true);
      return offerChoiceAtBase(done);
    }
    if (opening.kind !== 'offer') continue;
    pending = opening.pending;
    onClose = done;
    baseChoice.value = {
      lines: offerLines(opening.lines).map((l) => spoken(l.speaker, l.text, story)),
      choice: opening.pending.view,
      made: null,
      notice: null,
    };
    return true;
  }
  return false;
}

/**
 * Takes option `index` of the choice on the panel: makes its transaction on the save in play
 * (written at once) and shows what it did and the lines after it. A no-op once taken.
 */
export function pickBaseChoice(index: number): void {
  const p = pending;
  const view = baseChoice.value;
  if (p === null || view === null || view.choice !== p.view) return;
  const taken = takeChoice(p, index, activeSave() ?? p.save);
  if (taken === null) return;
  pending = null;
  baseChoice.value = {
    lines: [...view.lines, ...taken.lines],
    choice: { ...p.view, picked: index },
    made: madeView(taken.t),
    notice: commitChoice(taken.save, true),
  };
}

/** Closes the panel once its choice is taken, then plays on (`done`). Returns whether it closed. */
export function closeBaseChoice(): boolean {
  const view = baseChoice.value;
  if (view === null || view.choice.picked === null) return false;
  baseChoice.value = null;
  const done = onClose;
  onClose = null;
  done?.();
  return true;
}

/** Leaving the base with the panel up: it goes, unanswered (offered again on the next visit). */
export function dropBaseChoice(): void {
  pending = null;
  onClose = null;
  baseChoice.value = null;
}
