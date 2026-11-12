// The finale's HUD signals (T832; design/maps.md § 5.5, core-loop.md § 2.10): what the phased map
// adds to the battle HUD, each shown only in the phase it belongs to. app/hudFinale.ts keeps them in
// sync with the sim; ui/hud/FinaleClock.tsx, StatusPanel.tsx, EscortMeter.tsx, WavePanel.tsx and
// Notices.tsx draw them. All quiet (null, 0, false) on every other map.
import { signal } from '@preact/signals';

/** The clock's width in game px: the boss bar's (render/vfx/bossBar.ts BOSS_BAR_W), under it. */
export const FINALE_CLOCK_W = 160;

/**
 * The top-centre clock, one slot through the finale's phases: the Deep Bore filling in Phase 1
 * (`bore`), then the countdown in Phase 2 (`counter`: the lifetime Pests Processed falling as the
 * song lays the Hollow to rest), landing on 0 at Dawn.
 */
export interface FinaleClockView {
  readonly kind: 'bore' | 'counter';
  /** Its words: "Deep Bore", or the counter's "Pests processed". */
  readonly label: string;
  /** Its number as shown: "62%", "Full", or the count ("12,345"). */
  readonly value: string;
  /** The bar's fill, in whole px of FINALE_CLOCK_W (the Bore's progress; the song's rest). */
  readonly fill: number;
  /** The Bore broke through (its bar burns), or the counter reached 0 (Dawn). */
  readonly full: boolean;
}

export const finaleClock = signal<FinaleClockView | null>(null);

/**
 * The map's script phase as the HUD scopes it (sim `state.phase`): 0 on a map without the
 * finale's song or timers, else 1 (the Descent), 2 (the Unsung), 3 (Dawn: the HUD steps back to the
 * name plate and the counter at 0).
 */
export const finalePhase = signal<number>(0);

/** The choir is halted for a Hollow unit close ahead of Pebble (the playfield's HALTED plate). */
export const choirHalted = signal<boolean>(false);

/** The next wave waits for its script phase (`inPhase`; the finale's W19 for the Halls). */
export const nextHeld = signal<boolean>(false);

/** A phase banner in the wave banner's place: a small kicker over the phase's name. */
export interface PhaseBanner {
  readonly id: number;
  readonly kicker: string;
  readonly title: string;
}

export const phaseBanner = signal<PhaseBanner | null>(null);
