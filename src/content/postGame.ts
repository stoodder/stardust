// The post-game's maps on the Sector map at dawn (design/core-loop.md § 1.1, *After the finale*;
// design/maps.md § 8; T863): Endless's map and the challenge maps, each with its name, its place in
// the valley, and its kind, in the order the post-game plate lists them. A map shows only once its
// content is registered (the finale's lazy chunk registers them, content/acts/fin.ts), so a
// challenge map still being built is simply not listed. A challenge's tagline is its own
// (`MapLayoutDef.challenge.tagline`); Endless's is here. Pure data, imported only from the
// finale's lazy side (app/postGameView.ts), never from the core.

/** What a post-game map is: Endless (a seed, waves held) or a challenge (medals for Intel). */
export type PostGameKind = 'endless' | 'challenge';

export interface PostGameMap {
  readonly id: string;
  readonly kind: PostGameKind;
  readonly name: string;
  /** Where in the valley, as the node panel's kicker names it ("The Preserve"). */
  readonly place: string;
  /** Endless's line under its name (a challenge's is its `ChallengeDef.tagline`). */
  readonly tagline?: string;
}

/** Endless first (what's new leads), then the challenges in their build order. */
export const POST_GAME_MAPS: readonly PostGameMap[] = [
  {
    id: 'end_m01',
    kind: 'endless',
    name: 'The Open Perimeter',
    place: 'Dome Row at dawn',
    tagline: 'Dome Row, where it started. The waves keep coming. Hold as many as you can.',
  },
  { id: 'ch_m01', kind: 'challenge', name: 'Skitterkin Only', place: 'The Preserve' },
  { id: 'ch_m02', kind: 'challenge', name: 'Lights Out', place: 'Colony perimeter' },
  { id: 'ch_m03', kind: 'challenge', name: 'Glass Core', place: 'Reclamation Facility 2' },
];
