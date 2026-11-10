// Binds the audio (src/audio/) to the game (architecture.md § Audio): drained sim events and the
// battle's state become sound effects, music layers, and cues; HUD signals (notices, spoken lines
// and their typewriter, the screen) and UI buttons get their sounds; the settings drive the volumes
// and mute. Audio is created on the first user gesture, and stays off under `?test=1` unless the
// URL adds `&audio=1`.
import { effect } from '@preact/signals';
import {
  ABILITY_SOUNDS,
  battleMusic,
  blipFor as speakerBlip,
  countdownTick,
  createAudioEngine,
  createEventSounds,
  createFieldSounds,
  createTypeTicker,
  crossedLowIntegrity,
  SOUND_EVENT_TYPES,
  RADIO_DUCK,
  SPEECH_SFX_DUCK,
  screenMusic,
  silentEngine,
  type AudioEngine,
  CUES,
  isCueId,
  isSfxId,
  isThemeId,
  SFX_IDS,
  THEMES,
  type AudioStatus,
  type MusicIntent,
  type SfxId,
  type SoundCall,
} from '../audio/index.ts';
import { HOLLOW_DUCK, TIDYBOT_SOUNDS } from '../audio/eventTablesAct2.ts';
import {
  isStormId,
  renderCue,
  renderSfx,
  renderStorm,
  renderTheme,
  STORMS,
} from '../audio/offline.ts';
import type { SpeakerId } from '../content/dialogue/types.ts';
import type { JingleVariant } from '../content/presentation.ts';
import type { IdSpace } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import { clearTicksFor, type SimEvent } from '../sim/index.ts';
import { setTypeTick } from '../ui/dialogue/LineText.tsx';
import { presentationOfMap } from '../story/presentation.ts';
import { speaking } from '../ui/dialogue/state.ts';
import { hud, screen } from '../ui/state.ts';
import type { Host } from './host.ts';
import { activeSave } from './save.ts';
import type { AudioHooks } from './testHookTypes.ts';
import { settings } from './settings.ts';
import { createTidyChimes } from './tidybotChimes.ts';

const NO_SCENES: readonly string[] = [];

/** The save's seen scenes now (the jingle's key; none without a save). */
function seenNow(): readonly string[] {
  return activeSave()?.story.seen ?? NO_SCENES;
}

/** The low-integrity klaxon waits for the leak's alarm to finish (s). */
export const LOW_ALARM_DELAY_SEC = 0.5;

let engine: AudioEngine = silentEngine();
let uninstall: (() => void) | null = null;

/** The audio's state (the `__sd.audio` hook). */
export function audioStatus(): AudioStatus {
  return engine.status();
}

/** Plays a sound effect now (UI code paths that aren't sim events). */
export function playSfx(id: SfxId): void {
  engine.play(id);
}

function playCalls(calls: SoundCall[]): void {
  for (const c of calls) {
    if (c.kind === 'sfx') engine.play(c.id, { pitch: c.pitch, delay: c.delay });
    else engine.cue(c.id);
  }
  calls.length = 0;
}

let lastMusic: MusicIntent | null = null;
function setMusic(m: MusicIntent): void {
  const l = lastMusic;
  if (
    l !== null &&
    l.theme === m.theme &&
    l.level === m.level &&
    l.layers.base === m.layers.base &&
    l.layers.drums === m.layers.drums &&
    l.layers.lead === m.layers.lead
  ) {
    return;
  }
  lastMusic = m;
  engine.setMusic(m.theme, m.layers, m.level);
}

/**
 * A speaker's voice blip as a line starts (`blip.<speaker>`, named in content/dialogue/speakers.ts;
 * audio/speech.ts). Null: the speaker types silently.
 */
export function blipFor(speaker: SpeakerId): SfxId | null {
  return speakerBlip(speaker);
}

/** The button a DOM event happened on, if it's an enabled one. */
function enabledButton(target: EventTarget | null): HTMLButtonElement | null {
  const b = target instanceof Element ? target.closest('button') : null;
  return b === null || b.disabled || b.getAttribute('aria-disabled') === 'true' ? null : b;
}

/**
 * Installs the audio for the session: `enabled` false (`?test=1` without `&audio=1`) keeps it
 * silent and creates no AudioContext. Returns the uninstall (tests).
 */
export function installAudio(enabled: boolean): () => void {
  uninstall?.();
  if (!enabled) {
    engine = silentEngine(settings.value.audio.muted);
    uninstall = () => {};
    return uninstall;
  }
  engine = createAudioEngine();
  lastMusic = null;
  const unlock = (): void => engine.unlock();
  const onVisibility = (): void => engine.setSuspended(document.hidden);
  const onClick = (e: MouseEvent): void => {
    if (enabledButton(e.target) !== null) engine.play('ui_click');
  };
  const onHover = (e: PointerEvent): void => {
    if (e.pointerType !== 'mouse') return;
    const b = enabledButton(e.target);
    if (b !== null && !(e.relatedTarget instanceof Node && b.contains(e.relatedTarget))) {
      engine.play('ui_hover');
    }
  };
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('click', onClick, true);
  document.addEventListener('pointerover', onHover, true);
  let noticeId = 0;
  let lineId = 0;
  // The typewriter's tick: a soft, per-speaker patter as each line types (audio/speech.ts).
  const ticker = createTypeTicker();
  setTypeTick((speaker) => {
    const t = ticker.tick(speaker, performance.now());
    if (t !== null) engine.play(t.id, { pitch: t.pitch });
  });
  const offs = [
    effect(() => {
      const a = settings.value.audio;
      engine.setVolumes({ master: a.master, music: a.music, sfx: a.sfx, muted: a.muted });
    }),
    // Every notice explains a refusal (can't afford, can't build there, locked, recharging).
    effect(() => {
      const n = hud.notice.value;
      if (n !== null && n.id !== noticeId) {
        noticeId = n.id;
        engine.play('reject');
      }
    }),
    // A spoken line (the comms panel or a scene) ducks the music and the low-priority sound
    // effects, and blips as it starts.
    effect(() => {
      const l = speaking.value;
      engine.holdDuck('radio', l === null ? null : RADIO_DUCK);
      // Dialogue is never buried (R10, D134): shots, hits, and pops dip 6 dB under a line, and a
      // further 8 dB for a moment as each line starts, under its blip (D135).
      engine.holdSfxDuck('speech', l === null ? null : SPEECH_SFX_DUCK);
      if (l !== null && l.id !== lineId) {
        lineId = l.id;
        if (!l.silence) engine.dipUnderSpeech();
        const blip = l.silence ? null : blipFor(l.speaker);
        if (blip !== null && engine.play(blip)) ticker.blipped(performance.now());
      }
    }),
    // Screens without a battle; a battle's frames drive its own music (bindBattleAudio).
    effect(() => {
      const s = screen.value;
      // The menus over the backdrop (the intake, Shift board, Base, Settings, Loadout) keep the
      // title's music.
      const menu =
        s === 'intake' || s === 'campaign' || s === 'base' || s === 'settings' || s === 'loadout';
      if (s !== 'battle') setMusic(screenMusic(menu ? 'title' : s));
    }),
  ];
  uninstall = () => {
    for (const off of offs) off();
    setTypeTick(null);
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('pointerover', onHover, true);
    engine = silentEngine();
    uninstall = null;
  };
  return uninstall;
}

/** Wires a battle's events and state to the audio. Returns the unwiring. */
export function bindBattleAudio(host: Host<IdSpace>): () => void {
  const { sim } = host;
  const enemies = sim.config.content.enemies;
  const enemy = (id: string) => (Object.hasOwn(enemies, id) ? (enemies[id] ?? null) : null);
  // The wave-clear jingle and the Skitterkin's death are the map's presentation dials (core-loop.md
  // § 6.7). The jingle follows the save's seen scenes live (A2M4's truth scene turns it minor
  // mid-battle), re-resolved only when the seen list changes.
  let seenAt = seenNow();
  const dials = presentationOfMap(sim.map, seenAt);
  let jingle = dials.jingle;
  const liveDials = {
    get jingle(): JingleVariant {
      const seen = seenNow();
      if (seen !== seenAt) {
        seenAt = seen;
        jingle = presentationOfMap(sim.map, seen).jingle;
      }
      return jingle;
    },
    skitterkinDeath: dials.skitterkinDeath,
  };
  // What no event announces (digs, a sneeze's tell, a flock, the drone, a cloak's footsteps, a
  // charge's hum), from the state; and where the Hollow units stand, for their quiet.
  const field = createFieldSounds(clearTicksFor(sim.config.modifiers));
  const sounds = createEventSounds(liveDials, {
    splits: (id) => (enemy(id)?.split ?? null) !== null,
    faction: (id) => enemy(id)?.faction ?? null,
    quietAt: (x, y) => field.quietAt(x, y),
  });
  // The Tidybots' chime as each drone finishes its sweep (render draws the sweep).
  const tidy = createTidyChimes(dials.tidybots !== 'off', sim.map.waves.length);
  const chimes: number[] = [];
  const calls: SoundCall[] = [];
  /** Ability zones waiting to land, with the sounds they land with. */
  let zones: { uid: number; land: readonly SfxId[] }[] = [];
  let countdown: number | null = null;
  let integrity = sim.state.integrity;
  /** Whether the Hollow's steady duck is held (HOLLOW_DUCK). */
  let hollowDuck = false;
  const setHollowDuck = (on: boolean): void => {
    if (on === hollowDuck) return;
    hollowDuck = on;
    engine.holdDuck(HOLLOW_DUCK.key, on ? HOLLOW_DUCK.level : null, HOLLOW_DUCK.fadeSec);
  };
  const onEvent = (e: SimEvent<IdSpace>): void => {
    sounds.sounds(e, calls);
    if (e.type === 'AbilityUsed' && e.uid !== 0) {
      const s = ABILITY_SOUNDS[e.ability];
      if (s !== undefined) zones.push({ uid: e.uid, land: s.land });
    } else if (e.type === 'EnemyDied') {
      if (enemy(e.enemy)?.faction === 'skitterkin') tidy.died();
    } else if (e.type === 'WaveCleared') {
      tidy.cleared(e.wave, sim.state.tick);
    } else if (e.type === 'MapWon' || e.type === 'MapLost') {
      tidy.ended();
    }
    playCalls(calls);
  };
  const zoneAlive = (uid: number): boolean => {
    const z = sim.state.zones;
    for (let i = 0; i < z.used; i++) {
      const it = z.items[i]!; // i < used ≤ items.length
      if (it.uid === uid) return it.alive;
    }
    return false;
  };
  const afterFrame = (): void => {
    const s = sim.state;
    sounds.endFrame(calls);
    field.frame(s, calls);
    playCalls(calls);
    // The music sits steadily ducked while any Hollow walks (one long dip, not one per hum), and
    // comes back as the map ends, whoever is still on the field (D135).
    setHollowDuck(s.outcome === 'playing' && field.hollowLive());
    tidy.due(s.tick, chimes);
    for (const bot of chimes) {
      engine.play(TIDYBOT_SOUNDS.chime, { pitch: bot * TIDYBOT_SOUNDS.pitchPerBot });
    }
    chimes.length = 0;
    if (zones.length > 0) {
      const landed = zones.filter((z) => !zoneAlive(z.uid));
      if (landed.length > 0) {
        zones = zones.filter((z) => !landed.includes(z));
        for (const z of landed) for (const id of z.land) engine.play(id);
      }
    }
    const secs =
      s.schedule.phase === 'countdown' && s.schedule.countdownTicks > 0
        ? Math.ceil(s.schedule.countdownTicks / TICK_HZ)
        : null;
    const tick = countdownTick(countdown, secs);
    countdown = secs;
    if (tick !== null) engine.play('countdown_tick', { pitch: tick.pitch });
    if (crossedLowIntegrity(integrity, s.integrity)) {
      engine.play('low_integrity', { delay: LOW_ALARM_DELAY_SEC });
    }
    integrity = s.integrity;
    if (screen.value === 'battle') {
      setMusic(
        battleMusic({
          act: sim.map.act,
          wave: s.wave,
          waveCount: sim.map.waves.length,
          waveActive: s.enemies.live > 0 || s.schedule.phase === 'spawning',
          integrity: s.integrity,
          outcome: s.outcome,
          paused: host.speed === 0,
        }),
      );
    }
  };
  const offs = [
    ...SOUND_EVENT_TYPES.map((t) => host.bus.on(t, onEvent)),
    host.onAfterFrame(afterFrame),
  ];
  return () => {
    for (const off of offs) off();
    setHollowDuck(false);
  };
}

/** The `__sd.audio` hooks: live state, and offline renders for the level checks (offline.ts). */
export function audioTestHooks(): AudioHooks {
  return {
    status: audioStatus,
    ids: () => ({
      sfx: SFX_IDS,
      cues: Object.keys(CUES),
      themes: Object.keys(THEMES),
      storms: Object.keys(STORMS),
    }),
    render(what) {
      const [kind, id = '', variant = ''] = what.split(':');
      if (kind === 'storm' && id === '') return renderStorm();
      if (kind === 'storm' && isStormId(id) && (variant === '' || variant === 'ducked')) {
        return renderStorm(id, { ducked: variant === 'ducked' });
      }
      if (kind === 'sfx' && isSfxId(id)) return renderSfx(id);
      if (kind === 'cue' && isCueId(id)) return renderCue(id);
      if (kind === 'theme' && isThemeId(id)) return renderTheme(id);
      return Promise.reject(new Error(`__sd.audio.render: unknown sound '${what}'`));
    },
  };
}
