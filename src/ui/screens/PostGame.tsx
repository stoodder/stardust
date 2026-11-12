// The post-game shell's screens (T863; design/core-loop.md § 1.1 *After the finale*; design/maps.md
// § 8): the post-game plate on the Sector map at dawn, and the Endless score screen. Both are in the
// finale's screens chunk (app/acts/postGame.ts registers them, app/postGameHooks.ts holds the
// seams), so none of this reaches the initial JS.
//
// The plate leads with what's new (the owner's declutter ask, D153; T803c's one column): under the
// header, "After the dawn" and the selected entry's panel in the node panel's grammar, and under
// them the plate's rows by kind (Endless, then the challenges) and "Watch the epilogue". The column
// stands clear of the campaign's west nodes (The Long Walk, The Preserve) with Endless open. Endless's
// panel holds the seed (typed, or a new one), the seed's best and Start; a challenge's, its rule,
// threats and required counters, its medals and what they pay one press away. Esc in a panel
// returns to its row.
import { useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { watchEpilogue } from '../../app/ending.ts';
import { randomSeed } from '../../app/battleSetup.ts';
import { logError } from '../../app/log.ts';
import {
  endlessAgain,
  leaveResultsTo,
  playEndless,
  playMap,
  retryRun,
} from '../../app/navigation.ts';
import {
  endlessRun,
  type EndlessResultView,
  type PostGameLayerProps,
} from '../../app/postGameHooks.ts';
import {
  endlessPanel,
  parseSeed,
  postGameEntries,
  wavesText,
  type PostGameEntryView,
} from '../../app/postGameView.ts';
import { activeSave } from '../../app/save.ts';
import { campaignScreenName } from '../../app/starMap.ts';
import { endlessScores } from '../../meta/endless.ts';
import { POST_GAME_MAPS, POST_GAME_PLATE } from '../../content/postGame.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { Disclosure } from '../components/Disclosure.tsx';
import { Icon } from '../hud/Icon.tsx';
import { MedalPips } from './Banks.tsx';
import { StarMedals } from './StarMap.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { campaign } from './state.ts';
import './postGame.css';

/** The first post-game map registered (the Sector map's arrival selects it), or null. */
export function firstPostGameEntry(): string | null {
  return POST_GAME_MAPS.find((m) => Object.hasOwn(RAW_CONTENT.maps, m.id))?.id ?? null;
}

/** The plate's heading (story/style-guide.md § 2, *Finale*): QUILL's sim deck (D156). */
export const POST_GAME_HEADING = POST_GAME_PLATE.heading;

/** Endless's panel: the seed, the seed's best, and Start. */
function EndlessBody({
  entry,
  startRef,
}: {
  entry: PostGameEntryView;
  startRef: (el: HTMLButtonElement | null) => void;
}) {
  const [text, setText] = useState(() => String(endlessRun.peek()?.seed ?? randomSeed()));
  const seed = parseSeed(text);
  const save = activeSave();
  const facts = save === null || seed === null ? null : endlessPanel(save, seed);
  return (
    <>
      <div class="sd-pg-seed">
        <label for="sd-pg-seed-input">Seed</label>
        <input
          id="sd-pg-seed-input"
          class="sd-pg-seed-input"
          type="text"
          inputMode="numeric"
          maxLength={10}
          spellcheck={false}
          autoComplete="off"
          value={text}
          aria-invalid={seed === null}
          onInput={(e) => setText(e.currentTarget.value)}
          data-testid="endless-seed"
        />
        <button
          type="button"
          class="sd-button sd-button-small"
          onClick={() => setText(String(randomSeed()))}
        >
          New seed
        </button>
      </div>
      <div class="sd-star-actions sd-pg-go">
        <p class="sd-pg-best" data-testid="endless-best">
          {seed === null
            ? 'A seed is a whole number.'
            : facts?.best === null || facts === null
              ? 'No run on this seed yet.'
              : `Best on this seed: ${wavesText(facts.best)}.`}
        </p>
        <button
          type="button"
          class="sd-button sd-button-small sd-button-primary"
          aria-label={`Start ${entry.name}`}
          disabled={seed === null}
          ref={startRef}
          onClick={() => {
            if (seed !== null) playEndless(seed);
          }}
        >
          Start
        </button>
      </div>
    </>
  );
}

/**
 * A challenge's panel: its threats and its required counters in view; its medals by name and what
 * they pay one press away (T803c, D153), beside Start.
 */
function ChallengeBody({
  entry,
  startRef,
}: {
  entry: PostGameEntryView;
  startRef: (el: HTMLButtonElement | null) => void;
}) {
  const brief = entry.brief;
  const verb = entry.cleared ? 'Replay' : 'Start';
  return (
    <>
      {brief !== null && (
        <>
          <hr class="sd-star-rule" />
          <ul class="sd-star-threats" data-critical="threats" aria-label="Threat intel">
            {brief.threats.map((t) => (
              <li key={t.id} title={t.tip ?? undefined}>
                {t.glyph !== null && <Icon id={t.glyph} />}
                <span>{t.label}</span>
              </li>
            ))}
          </ul>
          {brief.required.length > 0 && (
            <p class="sd-star-required" data-critical="counters">
              Required: {brief.required.join(' · ')}
            </p>
          )}
        </>
      )}
      <div class="sd-star-actions">
        {brief !== null && (
          <Disclosure
            class="sd-star-more"
            label={entry.medals > 0 ? `Medals ${entry.medals}/3` : 'Medals'}
            about="by name, and what they pay"
          >
            <StarMedals medals={brief.medals} />
            <p class="sd-pg-note">{MEDALS_PAY}</p>
          </Disclosure>
        )}
        <button
          type="button"
          class="sd-button sd-button-small sd-button-primary"
          aria-label={`${verb} ${entry.name}`}
          ref={startRef}
          onClick={() => playMap(entry.id)}
        >
          {verb}
        </button>
      </div>
    </>
  );
}

/** What a challenge's medals pay (style-guide.md § 2, *Finale*), in its medals' "more". */
export const MEDALS_PAY = 'Medals here pay Intel.';

/**
 * The selected post-game map's panel, under the plate's heading: Endless's has no kicker (its
 * tagline names Dome Row), a challenge's names its ground.
 */
function EntryPanel({
  entry,
  focusStart,
  panelRef,
}: {
  entry: PostGameEntryView;
  focusStart: boolean;
  panelRef: { current: HTMLElement | null };
}) {
  const start = useRef<HTMLButtonElement | null>(null);
  useLayoutEffect(() => {
    if (focusStart) start.current?.focus();
  }, []);
  const ref = (el: HTMLButtonElement | null): void => {
    start.current = el;
  };
  return (
    <section
      id="sd-pg-panel"
      class={`sd-pg-panel sd-pg-panel-${entry.kind}`}
      role="region"
      aria-labelledby="sd-pg-panel-name"
      ref={(el) => {
        panelRef.current = el;
      }}
      data-testid="post-game-panel"
    >
      {entry.kind === 'challenge' && (
        <p class="sd-star-kicker">
          {entry.kindText} · {entry.place}
        </p>
      )}
      <h3 id="sd-pg-panel-name" class="sd-star-name">
        {entry.name}
        {entry.cleared && <span class="sd-pg-cleared"> · Cleared</span>}
      </h3>
      <p class="sd-star-tagline" data-voice="tagline">
        {entry.tagline}
      </p>
      {entry.kind === 'endless' ? (
        <EndlessBody entry={entry} startRef={ref} />
      ) : (
        <ChallengeBody entry={entry} startRef={ref} />
      )}
    </section>
  );
}

/** One entry's row on the plate: its name; Endless's best run, a cleared challenge's pips. */
function EntryRow({
  entry,
  best,
  on,
  rowRef,
  onPick,
}: {
  entry: PostGameEntryView;
  best: string | null;
  on: boolean;
  rowRef: (el: HTMLButtonElement | null) => void;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        class={`sd-pg-row${on ? ' sd-pg-row-on' : ''}`}
        aria-label={entry.label}
        aria-pressed={on}
        aria-controls={on ? 'sd-pg-panel' : undefined}
        ref={rowRef}
        onClick={onPick}
        data-entry={entry.id}
      >
        <span class="sd-pg-name">{entry.name}</span>
        {best !== null && <span class="sd-pg-row-best">{best}</span>}
        {entry.cleared && <MedalPips earned={entry.medals} />}
      </button>
    </li>
  );
}

/**
 * The post-game column over the Sector map at dawn (app/postGameHooks.ts `PostGameLayerProps`;
 * T803c, D153): one column under the header, clear of the campaign's west nodes. On top, "After the
 * dawn" and the selected entry's panel; under it, the plate's rows by kind (Endless, then the
 * challenges) and "Watch the epilogue".
 */
export function PostGameLayer({ selected, select, arrival }: PostGameLayerProps) {
  const camp = campaign.value;
  const entries = useMemo(() => {
    const save = activeSave();
    return save === null ? [] : postGameEntries(save);
  }, [camp]);
  const top = useMemo(() => {
    const save = activeSave();
    return save === null ? null : (endlessScores(save)[0]?.wave ?? null);
  }, [camp]);
  const rows = useRef<Record<string, HTMLButtonElement | null>>({});
  const panel = useRef<HTMLElement | null>(null);
  const [watching, setWatching] = useState(false);
  const [focusPanel, setFocusPanel] = useState(arrival);
  const answered = activeSave()?.story.flags.ending_choice !== undefined;

  // Esc in the panel returns to its row; elsewhere it falls through.
  useEscape(() => {
    const active = document.activeElement;
    if (selected === null || panel.current === null || active === null) return false;
    if (!panel.current.contains(active)) return false;
    rows.current[selected]?.focus();
    return true;
  });

  const entry = entries.find((e) => e.id === selected) ?? null;
  const watch = (): void => {
    setWatching(true);
    watchEpilogue()
      .catch((err: unknown) => logError('post-game: the epilogue failed', err))
      .finally(() => setWatching(false));
  };
  const row = (e: PostGameEntryView) => (
    <EntryRow
      key={e.id}
      entry={e}
      best={e.kind === 'endless' && top !== null ? `Best: ${wavesText(top)}` : null}
      on={e.id === selected}
      rowRef={(el) => {
        rows.current[e.id] = el;
      }}
      onPick={() => {
        setFocusPanel(true);
        select(e.id);
        requestAnimationFrame(() =>
          panel.current?.querySelector<HTMLElement>('.sd-star-actions .sd-button')?.focus(),
        );
      }}
    />
  );
  // The heading tops the column: over the open entry's panel, else over the rows.
  // Under it, the deck's own line: none of it is real, and nobody is counted (D156).
  const heading = (
    <>
      <h2 id="sd-pg-heading" class="sd-pg-heading" data-voice="heading">
        {POST_GAME_HEADING}
      </h2>
      <p class="sd-star-tagline sd-pg-tagline" data-voice="tagline">
        {POST_GAME_PLATE.tagline}
      </p>
    </>
  );
  const endless = entries.filter((e) => e.kind === 'endless');
  const challenges = entries.filter((e) => e.kind === 'challenge');
  return (
    <section class="sd-pg" aria-labelledby="sd-pg-heading" data-testid="post-game">
      {entry !== null && (
        <div class="sd-pg-box sd-pg-head">
          {heading}
          <EntryPanel key={entry.id} entry={entry} focusStart={focusPanel} panelRef={panel} />
        </div>
      )}
      <div class="sd-pg-box sd-pg-plate">
        {entry === null && heading}
        {endless.length > 0 && (
          <>
            <p class="sd-pg-kind">Endless</p>
            <ul class="sd-pg-list">{endless.map(row)}</ul>
          </>
        )}
        {challenges.length > 0 && (
          <>
            <p class="sd-pg-kind">Challenges</p>
            <ul class="sd-pg-list">{challenges.map(row)}</ul>
          </>
        )}
        {answered && (
          <button
            type="button"
            class="sd-button sd-button-small sd-pg-epilogue"
            disabled={watching}
            onClick={watch}
          >
            Watch the epilogue
          </button>
        )}
      </div>
    </section>
  );
}

/** "23 waves held.", or every wave of a run held. */
export function heldHeadline(held: number, waves: number | null): string {
  if (waves !== null && held >= waves) return 'Every wave held.';
  return `${wavesText(held)} held.`;
}

/**
 * The score card's seed line and whether it lists the records (T803e: each fact once). The seed is
 * always named, with "New best." when this run set it; the records show only when they hold
 * another seed to compare with (a list of this run alone would repeat the headline), and then this
 * seed's old best is its marked row, not a second line.
 */
export function scoreLines(
  result: Pick<EndlessResultView, 'seed' | 'held' | 'newBest' | 'bestBefore' | 'scores'>,
): { readonly seed: string; readonly records: boolean } {
  const best = result.newBest && result.held > (result.bestBefore ?? 0);
  const records = result.scores.some((r) => r.seed !== result.seed);
  const listed = records && result.scores.some((r) => r.seed === result.seed);
  const note = best
    ? ' · New best.'
    : result.bestBefore !== null && !listed
      ? ` · Best on this seed: ${wavesText(result.bestBefore)}.`
      : '';
  return { seed: `Seed ${result.seed}${note}`, records };
}

/**
 * The Endless score screen (in the results card's place after an Endless run): the waves held, the
 * seed and its best, the save's records when there are others (this seed's marked), and the way
 * on: the same seed again, a new seed, or the Sector map.
 */
export function EndlessScore({ result }: { result: EndlessResultView }) {
  const inCampaign = campaign.value !== null;
  const lines = scoreLines(result);
  const name = POST_GAME_MAPS.find((m) => m.id === result.map)?.name ?? result.map;
  return (
    <section
      class="sd-panel sd-results-panel sd-pg-score"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sd-results-heading"
      onKeyDown={trapTab}
      data-testid="endless-score"
    >
      <p class="sd-results-kicker">Endless · {name}</p>
      <h1 id="sd-results-heading" class="sd-results-heading" data-voice="stamp">
        {heldHeadline(result.held, null)}
      </h1>
      <p class="sd-pg-score-seed" data-testid="endless-score-seed">
        {lines.seed}
      </p>
      {lines.records && <p class="sd-pg-records-head">Best runs</p>}
      {lines.records && (
        <ol class="sd-pg-records" aria-label="Your records">
          {result.scores.map((r) => (
            <li key={r.seed} class={r.seed === result.seed ? 'sd-pg-this' : ''}>
              <span class="num">{wavesText(r.wave)}</span>
              <span class="sd-pg-record-seed">Seed {r.seed}</span>
            </li>
          ))}
        </ol>
      )}
      <div class="sd-results-buttons">
        <button
          type="button"
          class="sd-button sd-button-primary"
          ref={focusOnce}
          onClick={retryRun}
        >
          Run it again
        </button>
        <button type="button" class="sd-button" onClick={() => endlessAgain(randomSeed())}>
          New seed
        </button>
        <button
          type="button"
          class="sd-button"
          onClick={() => leaveResultsTo(inCampaign ? 'campaign' : 'title')}
        >
          {inCampaign ? campaignScreenName() : 'Title'}
        </button>
      </div>
    </section>
  );
}
