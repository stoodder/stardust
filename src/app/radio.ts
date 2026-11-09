// The M1/M2 radio tables (content/radio/) as dialogue, until T302c migrates them into the maps'
// scenes and barks (and deletes this adapter with content/radio/). app/dialogue.ts plays a map's
// adapted radio only while the map has no dialogue of its own, so nothing goes silent meanwhile.
// - A batch of lines one moment plays (a countdown's radio, W1's jingle and Bricks's answer, the
//   first Hauler down) becomes a non-pausing scene, keyed by its moment (`countdown:4`). Its lines
//   play in order on the comms panel; a reply shows under its cue (D028).
// - A single line on an event becomes a bark on the matching trigger (D070): `firstLeak` →
//   `first_leak`, `perfectWave` → `perfect_wave` (from its wave on), `enemyKilled` →
//   `enemy_killed`, `enemyLeaked` → `enemy_leaked`, `bankNudge` → `bank_nudge`, `issued` →
//   `tower_issued`. Barks keep the 6 s spacing and drop rather than queue.
// - A map's static briefing string (`MapDef.briefing`) becomes its briefing scene.
// - The debrief (`mapWon`, `mapLost`) stays the results card's (app/runResult.ts; T316).
// Adapted ids start `radio:`, so they never reach the save's `story.seen`.
import { radioLines, type RadioLine } from '../content/radio/index.ts';
import { POLICY_TELL } from '../content/dialogue/rules.ts';
import { SPEAKER_DEFS } from '../content/dialogue/speakers.ts';
import {
  SPEAKER_IDS,
  type Bark,
  type BarkTrigger,
  type LineNode,
  type Scene,
  type SpeakerId,
} from '../content/dialogue/types.ts';
import { ENEMIES } from '../content/enemies/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { EnemyId, TowerId } from '../content/types.ts';

/** A map's radio as dialogue. */
export interface AdaptedRadio {
  /** Non-pausing scenes by moment: `countdown:<wave>`, `unlock:<tower>`, `waveStart:<wave>`, `waveCleared:<wave>`, `enemyKilled:<enemy>`, `enemyLeaked:<enemy>`, `firstLeak`. */
  readonly scenes: ReadonlyMap<string, Scene>;
  readonly barks: readonly Bark[];
  /** A `perfect_wave` bark's first wave (A1M1's plays from W2). */
  readonly fromWave: ReadonlyMap<string, number>;
}

const isEnemy = (id: string): id is EnemyId => Object.hasOwn(ENEMIES, id);
const isTower = (id: string): id is TowerId => Object.hasOwn(TOWERS, id);

/** A radio line as a dialogue line: QUILL's "(Per policy.)" lines wear the `policy` tell. */
export function radioNode(l: RadioLine): LineNode {
  const point = l.point === undefined ? {} : { point: l.point };
  if (l.speaker === 'quill' && (l.text.startsWith(POLICY_TELL) || l.text.endsWith(POLICY_TELL))) {
    return { kind: 'line', speaker: 'quill', expression: 'policy', text: l.text, ...point };
  }
  return { kind: 'line', speaker: l.speaker, text: l.text, ...point };
}

/** The moment a line plays on, as a key; null for the debrief (the results card's). */
function momentOf(l: RadioLine): string | null {
  switch (l.on) {
    case 'countdown':
    case 'waveStart':
    case 'waveCleared':
      return `${l.on}:${l.wave ?? 0}`;
    case 'unlock':
    case 'issued':
      return `${l.on}:${l.tower ?? ''}`;
    case 'enemyKilled':
    case 'enemyLeaked':
      return `${l.on}:${l.enemy ?? ''}`;
    case 'firstLeak':
    case 'perfectWave':
    case 'bankNudge':
      return l.on;
    case 'mapWon':
    case 'mapLost':
      return null;
  }
}

/** The bark trigger a lone event line plays on, or null (it plays as a scene). */
function barkTrigger(l: RadioLine): BarkTrigger | null {
  switch (l.on) {
    case 'firstLeak':
      return { on: 'first_leak' };
    case 'perfectWave':
      return { on: 'perfect_wave' };
    case 'bankNudge':
      return { on: 'bank_nudge' };
    case 'enemyKilled':
      return l.enemy !== undefined && isEnemy(l.enemy) ? { on: 'enemy_killed', enemy: l.enemy } : null;
    case 'enemyLeaked':
      return l.enemy !== undefined && isEnemy(l.enemy) ? { on: 'enemy_leaked', enemy: l.enemy } : null;
    case 'issued':
      return l.tower !== undefined && isTower(l.tower) ? { on: 'tower_issued', tower: l.tower } : null;
    case 'countdown':
    case 'waveStart':
    case 'waveCleared':
    case 'unlock':
    case 'mapWon':
    case 'mapLost':
      return null;
  }
}

/** The adapted radio of map `mapId`, or null when it has no radio table. */
export function adaptRadio(mapId: string): AdaptedRadio | null {
  const lines = radioLines(mapId);
  if (lines.length === 0) return null;
  const groups = new Map<string, RadioLine[]>();
  for (const l of lines) {
    const key = momentOf(l);
    if (key === null) continue;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [l]);
    else group.push(l);
  }
  const scenes = new Map<string, Scene>();
  const barks: Bark[] = [];
  const fromWave = new Map<string, number>();
  for (const [key, group] of groups) {
    const first = group[0];
    if (first === undefined) continue;
    const trigger = group.length === 1 ? barkTrigger(first) : null;
    const id = `radio:${mapId}:${key}`;
    if (trigger === null) {
      scenes.set(key, { id, nodes: group.map(radioNode) });
      continue;
    }
    const node = radioNode(first);
    const bark: Bark =
      node.speaker === 'quill'
        ? { id, speaker: 'quill', text: node.text, trigger, ...expressionOf(node) }
        : { id, speaker: node.speaker, text: node.text, trigger };
    barks.push(bark);
    if (first.on === 'perfectWave' && first.wave !== undefined) fromWave.set(id, first.wave);
  }
  return { scenes, barks, fromWave };
}

function expressionOf(node: LineNode): { expression?: 'policy' } {
  return node.speaker === 'quill' && node.expression === 'policy' ? { expression: 'policy' } : {};
}

/** The speaker whose name plate is `name` (case aside), or null. */
export function speakerNamed(name: string): SpeakerId | null {
  const want = name.toLowerCase();
  return SPEAKER_IDS.find((id) => SPEAKER_DEFS[id].name.toLowerCase() === want) ?? null;
}

/**
 * A map's static briefing (`MapDef.briefing`, one "Speaker: line" per row) as its briefing scene.
 * A row with no known speaker is `system` copy. Null when there's no briefing.
 */
export function staticBriefingScene(mapId: string, briefing: string | undefined): Scene | null {
  if (briefing === undefined) return null;
  const nodes: LineNode[] = [];
  for (const raw of briefing.split('\n')) {
    const row = raw.trim();
    if (row === '') continue;
    const m = /^([^:\s][^:]{0,15}): (.+)$/.exec(row);
    const speaker = m === null ? null : speakerNamed(m[1] ?? '');
    const text = speaker === null ? row : (m?.[2] ?? row);
    nodes.push(speaker === null ? lineFor('system', text) : lineFor(speaker, text));
  }
  return nodes.length === 0 ? null : { id: `radio:${mapId}:brief`, nodes };
}

/** A plain line for any speaker (`neutral`; QUILL's policy lines wear the tell). */
function lineFor(speaker: SpeakerId, text: string): LineNode {
  if (speaker === 'quill') return radioNode({ on: 'countdown', speaker, text });
  return { kind: 'line', speaker, text };
}
