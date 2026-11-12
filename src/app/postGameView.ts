// The post-game plate's view (T863; design/core-loop.md § 1.1 *After the finale*; design/maps.md
// § 8): what the Sector map at dawn lists beside the cleared valley. Endless first, then each
// registered challenge map, each with its name, place, tagline, and (a challenge) its briefing
// facts and medals; Endless's records; and the score screen's rows. Pure over a SaveData and the
// live registry (read at call time). In the finale's lazy chunk with the screens that read it.
import { POST_GAME_MAPS, type PostGameKind } from '../content/postGame.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { endlessBest, endlessScores } from '../meta/endless.ts';
import { isMapWon, type SaveData } from '../meta/index.ts';
import { campaignMedalCount } from '../meta/veteran.ts';
import { silkText } from '../ui/silk.ts';
import { briefOf, compiledMaps, type StarBriefView } from './starMap.ts';

export interface PostGameEntryView {
  readonly id: string;
  readonly kind: PostGameKind;
  /** "Endless" or "Challenge": the plate's small word before the name. */
  readonly kindText: string;
  readonly name: string;
  readonly place: string;
  readonly tagline: string;
  /** A challenge won at least once (Endless is never "won"). */
  readonly cleared: boolean;
  /** Medals on file, of 3 (a challenge). */
  readonly medals: number;
  /** A challenge's briefing facts (threats, required, medals by name); null for Endless. */
  readonly brief: StarBriefView | null;
  /** The plate entry's accessible name: "Endless: The Long Shift. Best: 23 waves." */
  readonly label: string;
}

const KIND_TEXT: Readonly<Record<PostGameKind, string>> = {
  endless: 'Endless',
  challenge: 'Challenge',
};

/** A registered map's raw challenge tagline, or ''. */
function challengeTagline(id: string): string {
  const maps: Readonly<Record<string, { readonly challenge?: { readonly tagline: string } }>> =
    RAW_CONTENT.maps;
  return Object.hasOwn(maps, id) ? (maps[id]?.challenge?.tagline ?? '') : '';
}

/** "23 waves", "1 wave". */
export function wavesText(n: number): string {
  return `${n} wave${n === 1 ? '' : 's'}`;
}

/** The post-game maps the save can play: those registered, in POST_GAME_MAPS's order. */
export function postGameEntries(save: SaveData): PostGameEntryView[] {
  const shown = POST_GAME_MAPS.filter((m) => Object.hasOwn(RAW_CONTENT.maps, m.id));
  const challenges = shown.filter((m) => m.kind === 'challenge').map((m) => m.id);
  const compiled = challenges.length === 0 ? null : compiledMaps(challenges, save);
  const records: Readonly<Record<string, { readonly medals: readonly string[] } | undefined>> =
    save.campaign.maps;
  const best = endlessScores(save)[0]?.wave ?? null;
  return shown.map((m): PostGameEntryView => {
    const name = silkText(m.name);
    const place = silkText(m.place);
    if (m.kind === 'endless') {
      return {
        id: m.id,
        kind: m.kind,
        kindText: KIND_TEXT.endless,
        name,
        place,
        tagline: silkText(m.tagline ?? ''),
        cleared: false,
        medals: 0,
        brief: null,
        label: `Endless: ${name}. ${best === null ? 'No run yet.' : `Best: ${wavesText(best)}.`}`,
      };
    }
    const held = Object.hasOwn(records, m.id) ? (records[m.id]?.medals ?? []) : [];
    const medals = campaignMedalCount(held);
    const cleared = isMapWon(save, m.id);
    const map = compiled !== null && Object.hasOwn(compiled, m.id) ? compiled[m.id] : undefined;
    return {
      id: m.id,
      kind: m.kind,
      kindText: KIND_TEXT.challenge,
      name,
      place,
      tagline: silkText(challengeTagline(m.id) || (m.tagline ?? '')),
      cleared,
      medals,
      brief: map === undefined ? null : briefOf(map, save),
      label: `Challenge: ${name}. ${cleared ? `Cleared. ${medals} of 3 medals.` : 'Not yet cleared.'}`,
    };
  });
}

/** Endless's panel facts for a seed: its best, and the save's best run overall. */
export interface EndlessPanelView {
  readonly seed: number;
  /** The best waves held on this seed, or null before a run on it. */
  readonly best: number | null;
  /** The save's best record (any seed), or null. */
  readonly top: { readonly seed: number; readonly wave: number } | null;
}

export function endlessPanel(save: SaveData, seed: number): EndlessPanelView {
  return { seed, best: endlessBest(save, seed), top: endlessScores(save)[0] ?? null };
}

/** A seed as typed into the panel, or null when it isn't a whole number in 32 bits. */
export function parseSeed(text: string): number | null {
  const t = text.trim();
  if (!/^\d{1,10}$/.test(t)) return null;
  const n = Number(t);
  return n < 2 ** 32 ? n : null;
}
