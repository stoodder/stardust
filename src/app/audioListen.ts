// The owner's listen list (T850; architecture.md § Audio): under `?test=1`, `&listen=<kind>:<id>`
// plays one theme, cue, or sound effect on the first gesture, and again on the L key, so a sound
// can be heard by URL. `theme:<id>` holds the theme over the screens with every layer up
// (`&voices=0.3` thins the finale's singers as the Voices would: director.ts); `cue:<id>` plays
// the cue over silence; `sfx:<id>` plays the sound. app/audio.ts loads this only for such a URL.
import {
  battleMusic,
  heldMusic,
  isCueId,
  isSfxId,
  isThemeId,
  type CueId,
  type MusicIntent,
  type SfxId,
} from '../audio/index.ts';

/** What the listen list drives (app/audio.ts's engine and held music). */
export interface ListenTarget {
  hold(music: MusicIntent): void;
  cue(id: CueId): void;
  play(id: SfxId): void;
}

const SILENT: MusicIntent = {
  theme: null,
  layers: { base: 0, drums: 0, lead: 0, choir: 0 },
  level: 0,
};

/** The music a listened theme holds: every layer, or the finale's singers at `voices`. */
export function listenMusic(id: string, voices: number): MusicIntent | null {
  if (!isThemeId(id)) return null;
  if (id !== 'fin_walk' && id !== 'choir_hymn') return heldMusic(id);
  return battleMusic({
    act: 'finale',
    wave: 1,
    waveCount: 26,
    waveActive: true,
    integrity: 30,
    outcome: 'playing',
    paused: false,
    choir: true,
    phase: id === 'choir_hymn' ? 2 : 1,
    voices: Number.isFinite(voices) ? voices : 1,
  });
}

/** Plays `what` (`<kind>:<id>`) on the first gesture and on L. Returns the unwiring. */
export function bindListen(what: string, to: ListenTarget): () => void {
  const [kind = '', id = ''] = what.split(':');
  const voicesRaw = new URLSearchParams(window.location.search).get('voices');
  const voices = voicesRaw === null ? 1 : Number(voicesRaw);
  const go = (): void => {
    const music = kind === 'theme' ? listenMusic(id, voices) : null;
    if (music !== null) to.hold(music);
    else if (kind === 'cue' && isCueId(id)) {
      to.hold(SILENT);
      to.cue(id);
    } else if (kind === 'sfx' && isSfxId(id)) to.play(id);
  };
  let first = true;
  const onGesture = (): void => {
    if (!first) return;
    first = false;
    // After the engine's own unlock listener on the same event.
    setTimeout(go, 0);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'l' || e.key === 'L') go();
  };
  window.addEventListener('pointerdown', onGesture, true);
  window.addEventListener('keydown', onGesture, true);
  window.addEventListener('keydown', onKey);
  return () => {
    window.removeEventListener('pointerdown', onGesture, true);
    window.removeEventListener('keydown', onGesture, true);
    window.removeEventListener('keydown', onKey);
  };
}
