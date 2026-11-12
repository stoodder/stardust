// The selected tower's panel (T106, T202d), placed clear of its neighbours (T126) and of the comms
// panel while a line is up (T803b): tier pips, stats and bonuses, upgrade, sell, targeting, fire
// control, and the tier-4 choice.
import {
  cancel,
  cycleTargeting,
  sellSelected,
  specializeSelected,
  toggleHoldFireSelected,
  toggleSpareRunnersSelected,
  upgradeSelected,
} from '../../app/commands.ts';
import { rampNow } from '../../app/hudText.ts';
import { PRIORITY_LABEL } from './words.ts';
import { hud, type SelectedTowerView, type SpecOptionView } from '../state.ts';
import { Icon } from './Icon.tsx';
import { dialogue } from '../dialogue/state.ts';
import { plainText } from '../dialogue/text.ts';
import { forcedInput, forcedInputAvoid } from './forcedInputState.ts';
import {
  COMMS_COST,
  commsRect,
  COMMS_W,
  EDGE,
  hudCorners,
  PANEL_W,
  type Rect,
  UI_W,
  placePanel,
  specCardHeight,
  towerPanelHeight,
} from './layout.ts';
import { alignPulse } from './pulse.ts';
import { finaleClock } from './finaleState.ts';
import { revokedHud } from './revokedState.ts';
import { Key, Credits, Glyph, HOLD_GLYPH, SPARE_GLYPH } from './parts.tsx';

/** Tier pips: filled up to the current tier (a specialized tower shows T4 with every pip lit). */
function Tier({ tier, max }: { tier: number; max: number }) {
  return (
    <span class="hud-tier" aria-label={`Tier ${tier}${tier > max ? '' : ` of ${max}`}`}>
      <span class="hud-label">T{tier}</span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} class={i < tier ? 'pip on' : 'pip'} />
      ))}
    </span>
  );
}

/**
 * One tier-4 specialization in the tower panel's choice (T202d): its name and price, and a short
 * description; the whole card is the Specialize button. A locked pair shows the padlock in place
 * of the price (the lock note sits under the cards).
 */
function SpecCard({ o, locked, credits }: { o: SpecOptionView; locked: boolean; credits: number }) {
  const poor = !locked && credits < o.cost;
  return (
    <button
      type="button"
      class={`hud-btn chamfer hud-spec${locked ? ' locked' : ''}${poor ? ' poor' : ''}`}
      style={{ height: `${specCardHeight(o.descLines.length)}px` }}
      aria-disabled={locked || poor}
      aria-label={`Specialize: ${o.name}, ${o.cost} credits${o.price === 'sale' ? ', on sale' : ''}${locked ? ', locked' : poor ? ', not enough credits' : ''}. ${o.description}`}
      onClick={() => specializeSelected(o.choice)}
    >
      <span class="hud-spec-row">
        <span class="hud-spec-name">{o.name}</span>
        {locked ? <Icon id="icon.lock" /> : <Credits value={o.cost} sale={o.price === 'sale'} />}
      </span>
      {o.descLines.map((l, i) => (
        <span key={i} class="hud-spec-desc">
          {l}
        </span>
      ))}
    </button>
  );
}

/**
 * A ramping beam's live ramp (T531; towers.md § Prism Spire): "Ramp ×2.4" and a bar that fills
 * from ×1 to the cap while a beam holds its target (`hud.beamRamp`: the strongest lit beam), and
 * empties when it retargets. Its own signal, so the panel isn't rebuilt as the ramp grows.
 */
function RampRow({ cap }: { cap: number }) {
  const ramp = hud.beamRamp.value ?? 1;
  const fill = Math.max(0, Math.min(1, (ramp - 1) / (cap - 1)));
  return (
    <p
      class="hud-ramp"
      role="meter"
      data-testid="beam-ramp"
      aria-label="Ramp"
      aria-valuemin={1}
      aria-valuemax={cap}
      aria-valuenow={ramp}
      aria-valuetext={`${rampNow(ramp)} of ×${cap}`}
    >
      <span class="hud-label">Ramp</span>
      <span class="hud-ramp-bar" aria-hidden="true">
        <span class="hud-ramp-fill" style={{ width: `${Math.round(fill * 100)}%` }} />
      </span>
      <span class={fill >= 1 ? 'num accent' : 'num'}>{rampNow(ramp)}</span>
    </p>
  );
}

/** The Jammed glyph (T740b): the panel's Jammed row wears it. */
export const JAMMED_ICON = 'icon.jammed';

/**
 * The Jammed row (T731; design/enemies.md § 4): while the tower is Jammed, the glyph, "Jammed" and
 * its whole seconds left in the act's alarm colour; after it (or after System Reboot), "Immune"
 * and the seconds no jam can land, in steady teal. A role="timer" whose text names both, read out
 * only when focused (a countdown never chatters at a screen reader).
 */
function JamRow({ jam, immune }: { jam: number; immune: number }) {
  const jammed = jam > 0;
  return (
    <p
      class={jammed ? 'hud-jam jammed' : 'hud-jam immune'}
      role="timer"
      data-testid="jam-row"
      data-critical="jam"
      aria-label={jammed ? `Jammed, ${jam} s left` : `Immune to jamming, ${immune} s left`}
    >
      {jammed ? <Icon id={JAMMED_ICON} /> : <span class="hud-jam-dot" aria-hidden="true" />}
      <span class="grow">{jammed ? 'Jammed' : 'Immune'}</span>
      <span class="num">{jammed ? jam : immune} s</span>
    </p>
  );
}

/**
 * The comms panel's box while a line is up (T803b), under a status panel `statusH` tall, or at the
 * top centre while a forced input moves it there (ui/hud/index.tsx); null with no line.
 */
function commsBox(statusH: number): Rect | null {
  const view = dialogue.comms.value;
  if (view === null) return null;
  const box = commsRect(statusH, {
    text: plainText(view.line.text),
    cue: view.cue === null ? null : plainText(view.cue.text),
    portrait: view.line.portrait !== null,
    button: view.button !== null,
  });
  const top = forcedInput.value !== null || forcedInputAvoid.value.length > 0;
  return top ? { ...box, x: Math.round((UI_W - COMMS_W) / 2), y: EDGE } : box;
}

/**
 * The selected tower's panel, beside the tower: its stats after every bonus and where the bonuses
 * come from, then upgrade (or, at tier 3, the tier-4 choice), sell, and targeting. Its height
 * follows its rows (layout.ts `towerPanelHeight`), so it's placed before it renders.
 */
export function TowerPanel({ t }: { t: SelectedTowerView }) {
  const others = hud.towerPoints.value.filter((p) => p.x !== t.x || p.y !== t.y);
  const h = towerPanelHeight(t);
  const status = hudCorners(
    hud.asset.value === null ? false : hud.asset.value.bearers === undefined ? true : 'bearers',
    hud.escort.value === null
      ? false
      : hud.escort.value.holdout === true
        ? 'holdout'
        : hud.escort.value.choir === true
          ? 'choir'
          : true,
    revokedHud.value.previewHidden && revokedHud.value.leakLine !== null,
    hud.lockedAbilities.value.length,
    finaleClock.value !== null, // T832
  );
  // T803b: never over the comms panel while a line is up (D153: the story keeps its place).
  const comms = commsBox(status[0]?.h ?? 0);
  const corners = comms === null ? status : [...status, { ...comms, cost: COMMS_COST }];
  const { left, top } = placePanel(t.x, t.y, PANEL_W, h, others, corners);
  const credits = hud.credits.value;
  const max = t.upgradeCost === null;
  const poor = !max && credits < (t.upgradeCost ?? 0);
  // The upgrade teach (D028): the Upgrade button pulses while it's on.
  const teach = hud.upgradeHint.value && !max && !poor;
  const upgradeClass = `hud-btn chamfer wide${poor ? ' poor' : ''}${teach ? ' pulse' : ''}`;
  const specs = t.specs;
  return (
    <section
      class="hud-tower chamfer"
      style={{ left: `${left}px`, top: `${top}px`, width: `${PANEL_W}px`, height: `${h}px` }}
      aria-label={`${t.specName ?? t.label} tower`}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <header class="hud-tower-head">
        <Icon id={t.icon} />
        <span class="hud-name">{t.specName ?? t.label}</span>
        <Tier tier={t.tier} max={t.maxTier} />
      </header>
      {((t.jamSec ?? 0) > 0 || (t.jamImmuneSec ?? 0) > 0) && (
        <JamRow jam={t.jamSec ?? 0} immune={t.jamImmuneSec ?? 0} />
      )}
      {t.statsLines.map((l, i) => (
        <p key={`s${i}`} class="hud-stats" data-critical="tower-stats">
          {l}
        </p>
      ))}
      {t.rampCap !== null && <RampRow cap={t.rampCap} />}
      {t.bonuses.map((b, i) => (
        <p key={`b${i}`} class="hud-bonus-line">
          {b}
        </p>
      ))}
      {t.dark.map((l, i) => (
        <p
          key={`k${i}`}
          class={t.darkLit ? 'hud-dark-line lit' : 'hud-dark-line'}
          data-testid="dark-line"
        >
          {l}
        </p>
      ))}
      {t.deltaLines.map((l, i) => (
        <p key={`d${i}`} class="hud-delta">
          {l}
        </p>
      ))}
      {specs === null ? (
        <button
          type="button"
          class={upgradeClass}
          data-critical="upgrade"
          ref={(el) => alignPulse(el)}
          aria-disabled={max || poor}
          aria-label={
            max
              ? 'Max tier'
              : `Upgrade to tier ${t.tier + 1}, ${t.upgradeCost ?? 0} credits${t.upgradePrice === 'sale' ? ', on sale' : ''}${t.upgradeDelta === null ? '' : `: ${t.upgradeDelta}`}`
          }
          onClick={upgradeSelected}
        >
          <span class="grow">{max ? 'Max tier' : 'Upgrade'}</span>
          {!max && <Credits value={t.upgradeCost ?? 0} sale={t.upgradePrice === 'sale'} />}
          <Key k="U" />
        </button>
      ) : (
        <>
          <p class="hud-spec-head">Specialize: pick one</p>
          {specs.options.map((o) => (
            <SpecCard key={o.choice} o={o} locked={specs.locked} credits={credits} />
          ))}
          {specs.lockLines.map((l, i) => (
            <p key={`l${i}`} class="hud-spec-lock">
              {l}
            </p>
          ))}
        </>
      )}
      <button
        type="button"
        class={t.fullRefund ? 'hud-btn chamfer wide full' : 'hud-btn chamfer wide'}
        aria-label={`Sell for ${t.sellValue} credits${t.fullRefund ? ', full refund' : ''}`}
        title={t.fullRefund ? 'Full refund: not fired yet' : `Sell (${t.refundPct}% back)`}
        onClick={sellSelected}
      >
        <span class="grow">Sell</span>
        <Credits value={t.sellValue} />
        <Key k="S" />
      </button>
      <button
        type="button"
        class="hud-btn chamfer wide"
        aria-disabled={t.priority === null}
        aria-label={
          t.priority !== null
            ? `Targeting: ${PRIORITY_LABEL[t.priority]}. Change`
            : (t.fixedTarget ?? null) !== null
              ? `Targeting: ${t.fixedTarget}, fixed. Its leapers pick a flyer, then a Marked foe, then the first`
              : 'Targeting: hits everything in range'
        }
        title={
          (t.fixedTarget ?? null) !== null ? 'Leapers pick: flyer, Marked, then first' : undefined
        }
        data-testid="targeting"
        onClick={cycleTargeting}
      >
        <span class="grow">
          Target{' '}
          <span class="accent">
            {t.priority !== null ? PRIORITY_LABEL[t.priority] : (t.fixedTarget ?? 'All')}
          </span>
        </span>
        <Key k="T" />
      </button>
      {/* Hold fire is always here (core-loop §2.7): the word changes with it, not only the color. */}
      <button
        type="button"
        class="hud-btn chamfer wide"
        data-testid="hold-fire"
        aria-pressed={t.holdFire}
        aria-label={t.holdFire ? 'Holding fire. Fire again' : 'Hold fire'}
        onClick={toggleHoldFireSelected}
      >
        <Glyph rects={HOLD_GLYPH} />
        <span class="grow">{t.holdFire ? 'Holding fire' : 'Hold fire'}</span>
        <Key k="H" />
      </button>
      {t.spareRunners !== null && (
        <button
          type="button"
          class="hud-btn chamfer wide"
          data-testid="spare-runners"
          aria-pressed={t.spareRunners}
          aria-label={t.spareRunners ? 'Sparing runners. Stop' : 'Spare runners'}
          onClick={toggleSpareRunnersSelected}
        >
          <Glyph rects={SPARE_GLYPH} />
          <span class="grow">{t.spareRunners ? 'Sparing runners' : 'Spare runners'}</span>
        </button>
      )}
    </section>
  );
}
