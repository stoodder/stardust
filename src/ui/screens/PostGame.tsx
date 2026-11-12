// The post-game shell's screens (T863; design/core-loop.md § 1.1 *After the finale*; design/maps.md
// § 8): the post-game plate on the Sector map at dawn, and the Endless score screen. Both are in the
// finale's screens chunk (app/acts/postGame.ts registers them, app/postGameHooks.ts holds the
// seams), so none of this reaches the initial JS.
//
// The plate leads with what's new (the owner's declutter ask, D153): under the header, "After the
// dawn" lists Endless and each challenge map as one button a row, and "Watch the epilogue" under
// them. Selecting a row opens its panel beside the plate in the node panel's grammar (the chart's
// nodes keep theirs). Endless's panel holds the seed (typed, or a new one) and the seed's best;
// a challenge's, its rule, threats, and medals. Esc in a panel returns to its row.
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
import { POST_GAME_MAPS } from '../../content/postGame.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { Icon } from '../hud/Icon.tsx';
import { useEscape } from './escape.ts';
import { focusOnce } from './focus.ts';
import { campaign } from './state.ts';
import './postGame.css';

/** The first post-game map registered (the Sector map's arrival selects it), or null. */
export function firstPostGameEntry(): string | null {
  return POST_GAME_MAPS.find((m) => Object.hasOwn(RAW_CONTENT.maps, m.id))?.id ?? null;
}

/** The plate's heading (story/style-guide.md § 2, *Finale*). */
export const POST_GAME_HEADING = 'After the dawn';

/** Endless's panel: the seed, its best, and Start. */
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
      <p class="sd-pg-best" data-testid="endless-best">
        {seed === null
          ? 'A seed is a whole number.'
          : facts?.best === null || facts === null
            ? 'No run on this seed yet.'
            : `Best on this seed: ${wavesText(facts.best)}.`}
      </p>
      {facts?.top !== null && facts?.top !== undefined && facts.top.seed !== seed && (
        <p class="sd-pg-top">
          Your best: {wavesText(facts.top.wave)}, seed {facts.top.seed}.
        </p>
      )}
      <div class="sd-star-actions">
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

/** A challenge's panel: its threats, its required counters, and its medals by name. */
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
          <ul class="sd-star-threats" data-critical="threats" aria-label="Threat intel">
            {brief.threats.map((t) => (
              <li key={t.id} title={t.tip ?? undefined}>
                {t.glyph !== null && <Icon id={t.glyph} />}
                <span>{t.label}</span>
              </li>
            ))}
          </ul>
          {brief.required.map((r) => (
            <p key={r} class="sd-star-required" data-critical="counters">
              Required: {r}
            </p>
          ))}
          <ul class="sd-star-medals" aria-label="Medals">
            {brief.medals.map((m) => (
              <li key={m.id} class={m.earned ? 'sd-star-earned' : ''}>
                <span class="sd-star-diamond" aria-hidden="true" />
                <span class="sd-star-medal-name">{m.name}</span>
                {m.earned && <span class="sd-star-onfile">On file</span>}
              </li>
            ))}
          </ul>
          <p class="sd-pg-note">Medals here pay Intel.</p>
        </>
      )}
      <div class="sd-star-actions">
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

/** The selected post-game map's panel, beside the plate. */
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
      class={`sd-star-panel sd-pg-panel sd-pg-panel-${entry.kind}`}
      role="region"
      aria-labelledby="sd-pg-panel-name"
      ref={(el) => {
        panelRef.current = el;
      }}
      data-testid="post-game-panel"
    >
      <p class="sd-star-kicker">
        {entry.kindText} · {entry.place}
      </p>
      <h2 id="sd-pg-panel-name" class="sd-star-name">
        {entry.name}
      </h2>
      {entry.kind === 'challenge' && (
        <p class={`sd-star-state${entry.cleared ? ' sd-pg-cleared' : ''}`}>
          {entry.cleared ? 'Cleared' : 'New'}
        </p>
      )}
      <p class="sd-star-tagline" data-voice="tagline">
        {entry.tagline}
      </p>
      <hr class="sd-star-rule" />
      {entry.kind === 'endless' ? (
        <EndlessBody entry={entry} startRef={ref} />
      ) : (
        <ChallengeBody entry={entry} startRef={ref} />
      )}
    </section>
  );
}

/**
 * The post-game plate over the Sector map at dawn (app/postGameHooks.ts `PostGameLayerProps`): the
 * rows, "Watch the epilogue", and the selected row's panel.
 */
export function PostGameLayer({ selected, select, arrival }: PostGameLayerProps) {
  const camp = campaign.value;
  const entries = useMemo(() => {
    const save = activeSave();
    return save === null ? [] : postGameEntries(save);
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
  return (
    <div class="sd-pg" data-testid="post-game">
      <section class="sd-pg-plate" aria-labelledby="sd-pg-heading">
        <h2 id="sd-pg-heading" class="sd-pg-heading" data-voice="heading">
          {POST_GAME_HEADING}
        </h2>
        <ul class="sd-pg-list">
          {entries.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                class={`sd-pg-row${e.id === selected ? ' sd-pg-row-on' : ''}`}
                aria-label={e.label}
                aria-pressed={e.id === selected}
                aria-controls={e.id === selected ? 'sd-pg-panel' : undefined}
                ref={(el) => {
                  rows.current[e.id] = el;
                }}
                onClick={() => {
                  setFocusPanel(true);
                  select(e.id);
                  requestAnimationFrame(() =>
                    panel.current?.querySelector<HTMLElement>('.sd-star-actions button')?.focus(),
                  );
                }}
                data-entry={e.id}
              >
                <span class="sd-pg-kind">{e.kindText}</span>
                <span class="sd-pg-name">{e.name}</span>
                {e.cleared && <span class="sd-pg-diamond" aria-hidden="true" />}
              </button>
            </li>
          ))}
        </ul>
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
      </section>
      {entry !== null && (
        <EntryPanel key={entry.id} entry={entry} focusStart={focusPanel} panelRef={panel} />
      )}
    </div>
  );
}

/** "23 waves held.", or every wave of a run held. */
export function heldHeadline(held: number, waves: number | null): string {
  if (waves !== null && held >= waves) return 'Every wave held.';
  return `${wavesText(held)} held.`;
}

/**
 * The Endless score screen (in the results card's place after an Endless run): the waves held, the
 * seed and its best, the save's records (this seed's marked), and the way on: the same seed again,
 * a new seed, or the Sector map.
 */
export function EndlessScore({ result }: { result: EndlessResultView }) {
  const inCampaign = campaign.value !== null;
  const best = result.newBest && result.held > (result.bestBefore ?? 0);
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
        Seed {result.seed}
        {best
          ? ' · New best for this seed.'
          : result.bestBefore !== null
            ? ` · Best on this seed: ${wavesText(result.bestBefore)}.`
            : ''}
      </p>
      {result.scores.length > 0 && <p class="sd-pg-records-head">Best runs</p>}
      {result.scores.length > 0 && (
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
