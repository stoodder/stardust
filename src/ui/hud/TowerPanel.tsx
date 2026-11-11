// The selected tower's panel (T106, T202d), placed clear of its neighbours (T126): tier pips,
// stats and bonuses, upgrade, sell, targeting, fire control, and the tier-4 choice.
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
import { hudCorners, PANEL_W, placePanel, specCardHeight, towerPanelHeight } from './layout.ts';
import { alignPulse } from './pulse.ts';
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

/**
 * The selected tower's panel, beside the tower: its stats after every bonus and where the bonuses
 * come from, then upgrade (or, at tier 3, the tier-4 choice), sell, and targeting. Its height
 * follows its rows (layout.ts `towerPanelHeight`), so it's placed before it renders.
 */
export function TowerPanel({ t }: { t: SelectedTowerView }) {
  const others = hud.towerPoints.value.filter((p) => p.x !== t.x || p.y !== t.y);
  const h = towerPanelHeight(t);
  const corners = hudCorners(
    hud.objectives.value.length,
    hud.asset.value !== null,
    hud.escort.value === null ? false : hud.escort.value.holdout ? 'holdout' : true,
  );
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
      {t.statsLines.map((l, i) => (
        <p key={`s${i}`} class="hud-stats">
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
          t.priority === null
            ? 'Targeting: hits everything in range'
            : `Targeting: ${PRIORITY_LABEL[t.priority]}. Change`
        }
        onClick={cycleTargeting}
      >
        <span class="grow">
          Target{' '}
          <span class="accent">{t.priority === null ? 'All' : PRIORITY_LABEL[t.priority]}</span>
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
