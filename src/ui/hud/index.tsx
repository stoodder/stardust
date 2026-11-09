// The in-map HUD (T106; art-direction §9, core-loop §4): status top-left, waves and speed
// top-right, build slots bottom-right, the selected tower's panel beside it, and notices top
// center. Components read the `hud` signals (kept in sync by app/hud.ts) and act only through
// app/commands.ts. Every control is a real <button> of at least 16×16 game px.
import { useEffect, useRef, useState } from 'preact/hooks';
import {
  callWave,
  cancel,
  cycleTargeting,
  pressBuildSlot,
  sellSelected,
  setSpeed,
  upgradeSelected,
} from '../../app/commands.ts';
import type { TargetPriority } from '../../content/types.ts';
import { hud, speed, type BuildSlotView, type SelectedTowerView } from '../state.ts';
import { Icon } from './Icon.tsx';
import { placePanel, tickToward } from './layout.ts';
import './hud.css';

/** Build slots shown, whatever the loadout size (the loadout limit, CLAUDE.md). */
const SLOT_COUNT = 4;
/** The tower panel's size in game px (fixed, so it can be placed before it renders). */
export const PANEL_W = 100;
export const PANEL_H = 78;

const PRIORITY_LABEL: Readonly<Record<TargetPriority, string>> = {
  first: 'First',
  last: 'Last',
  strong: 'Strong',
  close: 'Close',
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** A number that ticks toward `value` instead of jumping (art-direction § Look). */
function useTicker(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number): void => {
      const next = prefersReducedMotion() ? value : tickToward(shownRef.current, value, now - last);
      last = now;
      shownRef.current = next;
      setShown(next);
      if (next !== value) raf = requestAnimationFrame(step);
    };
    if (shownRef.current !== value) raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** A small key-hint badge. */
function Key({ k }: { k: string }) {
  return (
    <span class="hud-key" aria-hidden="true">
      {k}
    </span>
  );
}

/** A credits amount: the gold chip and the number. */
function Credits({ value, short = false }: { value: number; short?: boolean }) {
  return (
    <span class={short ? 'hud-cost short' : 'hud-cost'}>
      <Icon id="icon.credits" />
      <span class="num">{value}</span>
    </span>
  );
}

/** Top-left: the meter (core integrity) and credits. */
function StatusPanel() {
  const credits = useTicker(hud.credits.value);
  const integrity = hud.integrity.value;
  const label = hud.meterLabel.value;
  return (
    <section class="hud-status chamfer" aria-label="Status">
      <div class="hud-meter" role="status" aria-label={`${label} ${integrity}`}>
        <Icon id="icon.core" />
        <span class="hud-label">{label}</span>
        <span class={integrity <= 5 ? 'big num danger' : 'big num'}>{integrity}</span>
      </div>
      <div class="hud-credits" aria-label={`Credits ${hud.credits.value}`}>
        <Icon id="icon.credits" />
        <span class="hud-label">Credits</span>
        <span class="big num gold">{credits}</span>
      </div>
    </section>
  );
}

/** Top-right: speed and pause. */
function SpeedControls() {
  const s = speed.value;
  const btn = (value: 0 | 1 | 2, text: string, label: string, key: string) => (
    <button
      type="button"
      class="hud-btn chamfer square"
      aria-pressed={s === value}
      aria-label={label}
      title={`${label} (${key})`}
      onClick={() => setSpeed(value)}
    >
      {text}
    </button>
  );
  return (
    <div class="hud-speed" role="group" aria-label="Game speed">
      {btn(0, 'II', 'Pause', 'Space')}
      {btn(1, '1x', 'Normal speed', 'F')}
      {btn(2, '2x', 'Double speed', 'F')}
    </div>
  );
}

/** Top-right: the wave counter, the next wave's preview, and the call-wave button. */
function WavePanel() {
  const wave = hud.wave.value;
  const count = hud.waveCount.value;
  const next = hud.nextWave.value;
  const ended = hud.outcome.value !== 'playing';
  const callLabel =
    next === null
      ? null
      : wave === 0
        ? `Start wave ${next.number}`
        : `Call wave ${next.number} early`;
  return (
    <section class="hud-waves chamfer" aria-label="Waves">
      <div class="hud-wave-row">
        <span class="hud-label">Wave</span>
        <span class="big num" aria-label={`Wave ${wave} of ${count}`}>
          {wave}
          <span class="dim">/{count}</span>
        </span>
        {callLabel !== null && (
          <button
            type="button"
            class="hud-btn chamfer call"
            aria-label={callLabel}
            title={`${callLabel} (W)`}
            aria-disabled={ended}
            onClick={callWave}
          >
            {wave === 0 ? 'Start' : 'Call'}
            <Key k="W" />
          </button>
        )}
      </div>
      {next !== null && (
        <ul class="hud-preview" aria-label={`Next: wave ${next.number}`}>
          <li class="hud-label">Next</li>
          {next.groups.map((g) => (
            <li
              key={`${g.enemy}:${g.air ? 'air' : 'ground'}`}
              class="hud-preview-group"
              aria-label={`${g.count} ${g.label}${g.air ? ', air' : ''}`}
            >
              <Icon id={g.icon} />
              <span class="num">x{g.count}</span>
              {g.air && <span class="hud-air">Air</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** One build slot (bottom-right). */
function BuildSlot({ index, slot }: { index: number; slot: BuildSlotView | undefined }) {
  if (slot === undefined) {
    return <div class="hud-slot empty chamfer" aria-hidden="true" />;
  }
  const locked = hud.lockedTowers.value.includes(slot.tower);
  const poor = hud.credits.value < slot.cost;
  const armed = hud.armedTower.value === slot.tower;
  const state = locked ? 'locked' : poor ? 'poor' : '';
  const status = locked ? ', locked' : poor ? ', not enough credits' : '';
  return (
    <button
      type="button"
      class={`hud-btn hud-slot chamfer ${state}`}
      aria-pressed={armed}
      aria-disabled={locked || poor}
      aria-label={`Build ${slot.label}, ${slot.cost} credits${status}`}
      title={`${slot.label} (${index + 1})`}
      onClick={() => pressBuildSlot(index)}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <Key k={String(index + 1)} />
      <Icon id={slot.icon} class="slot-icon" />
      {locked ? (
        <span class="hud-locked">
          <Icon id="icon.lock" />
        </span>
      ) : (
        <Credits value={slot.cost} short />
      )}
    </button>
  );
}

function BuildBar() {
  const slots = hud.slots.value;
  return (
    <nav class="hud-build" aria-label="Build">
      {Array.from({ length: SLOT_COUNT }, (_, i) => (
        <BuildSlot key={i} index={i} slot={slots[i]} />
      ))}
    </nav>
  );
}

/** Tier pips: filled up to the current tier. */
function Tier({ tier, max }: { tier: number; max: number }) {
  return (
    <span class="hud-tier" aria-label={`Tier ${tier} of ${max}`}>
      <span class="hud-label">T{tier}</span>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} class={i < tier ? 'pip on' : 'pip'} />
      ))}
    </span>
  );
}

/** The selected tower's panel: upgrade, sell, and targeting, beside the tower. */
function TowerPanel({ t }: { t: SelectedTowerView }) {
  const { left, top } = placePanel(t.x, t.y, PANEL_W, PANEL_H);
  const credits = hud.credits.value;
  const max = t.upgradeCost === null;
  const poor = !max && credits < (t.upgradeCost ?? 0);
  return (
    <section
      class="hud-tower chamfer"
      style={{ left: `${left}px`, top: `${top}px`, width: `${PANEL_W}px`, height: `${PANEL_H}px` }}
      aria-label={`${t.label} tower`}
      onContextMenu={(e) => {
        e.preventDefault();
        cancel();
      }}
    >
      <header class="hud-tower-head">
        <Icon id={t.icon} />
        <span class="hud-name">{t.label}</span>
        <Tier tier={t.tier} max={t.maxTier} />
      </header>
      <button
        type="button"
        class={poor ? 'hud-btn chamfer wide poor' : 'hud-btn chamfer wide'}
        aria-disabled={max || poor}
        aria-label={
          max ? 'Max tier' : `Upgrade to tier ${t.tier + 1}, ${t.upgradeCost ?? 0} credits`
        }
        onClick={upgradeSelected}
      >
        <span class="grow">{max ? 'Max tier' : 'Upgrade'}</span>
        {!max && <Credits value={t.upgradeCost ?? 0} />}
        <Key k="U" />
      </button>
      <button
        type="button"
        class={t.fullRefund ? 'hud-btn chamfer wide full' : 'hud-btn chamfer wide'}
        aria-label={`Sell for ${t.sellValue} credits${t.fullRefund ? ', full refund' : ''}`}
        title={t.fullRefund ? 'Full refund: not fired yet' : 'Sell (70% back)'}
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
    </section>
  );
}

/** A short message (a rejected command), top center. */
function Notice() {
  const n = hud.notice.value;
  return (
    <div class="hud-notice-slot" role="status" aria-live="polite">
      {n !== null && (
        <div key={n.id} class="hud-notice chamfer">
          {n.text}
        </div>
      )}
    </div>
  );
}

/** The battle HUD. */
export function Hud() {
  const selected = hud.selected.value;
  return (
    <div class="hud" data-act={hud.act.value} data-testid="hud">
      <StatusPanel />
      <div class="hud-top-right">
        <SpeedControls />
        <WavePanel />
      </div>
      <BuildBar />
      {selected !== null && <TowerPanel t={selected} />}
      <Notice />
    </div>
  );
}
