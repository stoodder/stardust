// The Escort's meter (T305c, T531; core-loop § 2.9–2.10): while the map is an Escort, it stands in
// for the core's meter. Three rows: the label the map gives it ("Evacuated", "Sheltered") with the
// refugees safe as the big number; "of 36", the map's total; and the lost row, one pip per loss the
// map allows (`maxLost`), filled `red.3` as refugees are lost, with the blinking alarm box once
// few are left (story/meters.ts `escortLow`, the bark's threshold). Without `maxLost`, or with too
// many to draw, the lost row reads in words ("3", "3/20"). Each refugee lost flashes the meter
// red (like the core's leak flash, D026), and when a map turns Escort mid-map (A2M5's pivot) the
// relabel moment plays: first the old meter whole, as it was (the core's glyph and label with its
// last integrity, or "—"; never "Core 0", D138; no "of 36", no pips; D139) for 0.5 s, then every
// row of the Escort's at once, the new label blinking its accent edge three times (1.5 s). Both
// wait while a scene or the pause menu holds the HUD (A2M5's pivot cue plays over the old meter).
// Under reduced motion nothing blinks: the old meter holds 2 s, then the new label shows in a
// steady accent for 2 s before it settles.
// On a Holdout (A3M3; T631) the meter is Evacuated "of 36" with no lost row: a Holdout has no
// defeat, so nothing counts down to one. Once its losses pass the low mark (`holdoutLow`) the
// blinking alarm box sits beside the label instead, and each refugee lost still flashes it.
// On the finale's choir (T832) it is **Voices**: the singers singing "of 16", and a **Hushed** row,
// one pip per hush the choir can take (its floor), filled as singers are hushed; each hush flashes
// it, and while the choir is halted a small HALTED tag sits at the end of its "of 16" row (the
// playfield's plate, echoed where the eye checks the choir). The finale's alarm box carries no "!" (its tone).
import { lostWords, relabelShown } from '../../app/hudEscort.ts';
import { hud, type MeterRelabel } from '../state.ts';
import { choirHalted } from './finaleState.ts';
import { baked, Icon } from './Icon.tsx';

/** The alarm box's mark: "!", or none in the finale (no system "!" there; D154's tone). */
export function alarmMark(act: string): string {
  return act === 'finale' ? '' : '!';
}

/** The halted choir's tag by the Voices label (the playfield's HALTED plate). */
export const HALTED_TAG = 'Halted';

/** The meter's glyph: the refugee's own once art draws one (`icon.refugee`), else the core orb. */
export function escortIcon(): string {
  return baked('icon.refugee', 'icon') === null ? 'icon.core' : 'icon.refugee';
}

/**
 * The relabel's first beat: the old meter whole, as it was before the change (the core's glyph,
 * its label and last number; D139). Its hold is a CSS animation, so it waits while the HUD is
 * inert; `onDone` swaps in the Escort's rows as it ends.
 */
function HeldMeter({ relabel, onDone }: { relabel: MeterRelabel; onDone: () => void }) {
  return (
    <div
      class="hud-meter hud-relabel-hold"
      data-testid="meter-relabel-held"
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) onDone();
      }}
    >
      <Icon id="icon.core" />
      <span class="hud-label">{relabel.from}</span>
      <span class="big num" data-testid="meter-relabel-from-value">
        {relabel.fromValue ?? '—'}
      </span>
    </div>
  );
}

export function EscortMeter() {
  const m = hud.escort.value;
  if (m === null) return null;
  const label = hud.meterLabel.value;
  const flash = hud.escortLost.value;
  const relabel = hud.relabel.value;
  const lost = lostWords(m.lost, m.maxLost);
  const last = m.maxLost !== null && m.lost >= m.maxLost;
  const held = relabel !== null && relabel.held;
  const choir = m.choir === true;
  const halted = choir && choirHalted.value;
  const lostLabel = choir ? 'Hushed' : 'Lost';
  const mark = alarmMark(hud.act.value);
  const name = m.holdout
    ? `${label} ${m.evacuated} of ${m.total}${m.low ? ', many lost' : ''}`
    : `${label} ${m.evacuated} of ${m.total}, ${lostLabel.toLowerCase()} ${lost}${m.low ? ', few left' : ''}${halted ? ', the choir is halted' : ''}`;
  return (
    <div
      class={m.holdout ? 'hud-escort holdout' : choir ? 'hud-escort choir' : 'hud-escort'}
      role="status"
      data-testid="escort-meter"
      data-low={m.low}
      data-holdout={m.holdout || undefined}
      data-choir={choir || undefined}
      data-halted={halted || undefined}
      aria-label={name}
    >
      {flash !== null && <span key={flash.id} class="hud-asset-flash" aria-hidden="true" />}
      {held ? (
        <HeldMeter key={relabel.id} relabel={relabel} onDone={() => relabelShown(relabel.id)} />
      ) : (
        <>
          <div class="hud-meter">
            <Icon id={escortIcon()} />
            {relabel === null ? (
              <span class={m.holdout && m.low ? 'hud-label danger' : 'hud-label'}>
                {label}
                {/* A Holdout's alarm sits by its label: it has no lost row (T631). */}
                {m.holdout && m.low && (
                  <span class="hud-alarm" aria-hidden="true">
                    {mark}
                  </span>
                )}
              </span>
            ) : (
              <span key={relabel.id} class="hud-label hud-relabel" data-testid="meter-relabel">
                {label}
              </span>
            )}
            <span class="big num">{m.evacuated}</span>
          </div>
          <span class="hud-escort-of num" data-testid="escort-total">
            of {m.total}
            {halted && (
              <span class="hud-halted-tag" data-testid="choir-halted" aria-hidden="true">
                {HALTED_TAG}
              </span>
            )}
          </span>
          {!m.holdout && (
            <div class="hud-escort-lost" data-testid="escort-lost">
              <span class={m.low ? 'hud-label danger' : 'hud-label'}>
                {lostLabel}
                {m.low && (
                  <span class="hud-alarm" aria-hidden="true">
                    {mark}
                  </span>
                )}
              </span>
              {m.pips === null ? (
                <span class={last ? 'num danger' : 'num'}>{lost}</span>
              ) : (
                <span class={m.pips.length <= 10 ? 'hud-pips wide' : 'hud-pips'} aria-hidden="true">
                  {m.pips.map((on, i) => (
                    <span key={i} class={on ? 'hud-pip on' : 'hud-pip'} />
                  ))}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
