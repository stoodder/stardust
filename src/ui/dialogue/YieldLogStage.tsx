// The Asset Yield Log's stage (act3.md § A3M2, `a3_m02_scene_confession`; T614; the rules and
// numbers are yieldLog.ts): the header pinned at the top, then the log scrolling up under it,
// gathering pace, the others' entries dim and yours lighting as they cross the reading line. It
// leads the scene's lines in and keeps scrolling under them until the log runs out. Reduced motion
// holds one still page with your entries lit. Silent; the scroll is aria-hidden, with one label.
import { useMemo } from 'preact/hooks';
import { prefersReducedMotion } from '../motion.ts';
import { campaign, runResult } from '../screens/state.ts';
import { useStageClock } from './Staging.tsx';
import {
  litAt,
  READ_LINE,
  maxScroll,
  rowsOnScreen,
  scrolledRows,
  stillScroll,
  yieldLogHeader,
  yieldLogLabel,
} from './yieldLog.ts';
import './yieldLog.css';

/** Rows on screen, and each row's height (game px; yieldLog.css's `--yl-row`). */
export const YIELD_ROWS_VISIBLE = 34;
export const YIELD_ROW_PX = 9;

/** The player's entries: the lifetime Pests Processed, as Results left it (`{pests_processed}`). */
function yourEntries(): number {
  return runResult.value?.rewards?.lifetimePests ?? campaign.value?.pestsProcessed ?? 0;
}

/** The scroll, `from` its staging's start (performance.now()). */
export function YieldLogStage({ from }: { from: number }) {
  const still = prefersReducedMotion();
  const yours = useMemo(yourEntries, []);
  const max = maxScroll(yours, YIELD_ROWS_VISIBLE);
  const ms = useStageClock(from, (t) => !still && scrolledRows(t, max) < max);
  const scrolled = still ? stillScroll(yours, YIELD_ROWS_VISIBLE) : scrolledRows(ms, max);
  const rows = rowsOnScreen(scrolled, YIELD_ROWS_VISIBLE, yours);
  // Whole pixels only (art-direction rule 7): the list slides up by the fraction of a row.
  const shift = Math.round((scrolled - Math.floor(scrolled)) * YIELD_ROW_PX);
  const height = YIELD_ROWS_VISIBLE * YIELD_ROW_PX;
  return (
    <div class="yl" role="img" aria-label={yieldLogLabel(yours)} data-testid="stage-yield-log">
      <p class="yl-header" aria-hidden="true" data-testid="yield-log-header">
        {yieldLogHeader(yours)}
      </p>
      <div class="yl-window" aria-hidden="true" style={{ height: `${height}px` }}>
        {!still && <div class="yl-read-line" style={{ top: `${Math.round(height * READ_LINE)}px` }} />}
        <ol class="yl-rows" style={{ transform: `translateY(${-shift}px)` }}>
          {rows.map((r, i) => {
            const lit = r.yours && (still || litAt(i * YIELD_ROW_PX - shift, height));
            return (
              <li
                key={r.n}
                class={lit ? 'yl-row yours lit' : r.yours ? 'yl-row yours' : 'yl-row'}
                data-entry={r.n}
              >
                <span class="yl-n">{r.number}</span>
                <span class="yl-time">{r.time}</span>
                <span class="yl-tile">TILE {r.tile}</span>
                <span class="yl-yield">YIELD {r.yieldText}</span>
                <span class="yl-tech">{r.tech}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
