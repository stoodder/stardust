// Dialogue validation (docs/tech/story-runtime.md § Validation; docs/story/style-guide.md § 3–5):
// the mechanical rules of the style guide over every map's scenes and barks, the shared bark
// pools, and Bricks's name tags. The registries are static, so validate.ts runs it once per
// process (`dialogueErrors`); tests pass fixtures to `validateDialogue`.
//
// Rules (each error reads `[rule] where: message`):
// - [dialogue-id]: scene ids are `<map_id>_<slot>` under their own map; bark ids are
//   `<speaker>_<trigger>_a<act>_<nn>` with their own speaker and (map barks) their map's act; all
//   unique.
// - [dialogue-speaker]: speakers are registered; an expression is one its speaker has (none for a
//   speaker without a portrait).
// - [dialogue-token]: tokens parse (known tokens and glyphs, well-formed `{v:…|…}`).
// - [dialogue-length]: after worst-case substitution: line 120, bark 80, choice option 60, reply
//   button 16, name tag 16.
// - [dialogue-name]: `{name}` only in `system` copy, or from `a3_m03` on (a shared bark's `when`
//   must imply it), and never from `sterling`.
// - [dialogue-policy]: a `quill` line uses `policy` iff it starts or ends with "(Per policy.)".
// - [dialogue-bang]: the "!" budget: never `bricks` or `vesthara`; in Act III only `sterling` and
//   `pebble`; `quill` never after A3M2; in the finale only `pebble`, `sterling`, and `system`.
//   Choice options and button labels are the player's.
// - [dialogue-emphasis]: at most one `*word*` per line.
// - [dialogue-silence]: a silence line (`text: ''`) has a `durationSec`; durations are > 0.
// - [dialogue-choice]: 2–3 options; `remember` only on C3 and C4 choices (door_choice,
//   quill_choice).
// - [dialogue-flag]: dialogue never sets a flag a run-end rule owns (C1 is never a choice).
// - [dialogue-jump]: labels are unique in a scene; `goto` and `else` name one.
// - [dialogue-reach]: every node is reachable from the first; no loop runs without a line or choice.
// - [dialogue-size]: lines on the longest play-through, by slot (`SCENE_LINES`; a pausing cue
//   `PAUSING_CUE_MAX_LINES`; a radio slot whose first line carries a reply button
//   `RADIO_REPLY_MAX_LINES`).
// - [dialogue-button]: reply buttons only on radio and cue lines; a reply names a registered scene.
// - [dialogue-cond]: `thisRun` names a flag with a run-end rule; `outcome` and `thisRun` only in
//   debriefs and full-screen scenes (a run must have just ended); `seen` names a scene or bark; a
//   `bank` or `runStat` test has a bound, each a non-negative integer, `gte` ≤ `lte`; a `runStat`
//   names a run story stat and never sits in a base topic (no run there); a `revokedTower` names a
//   registered tower.
// - [dialogue-plate]: a line's `plateAs` is 1–16 characters (the plate's width, as a name tag).
// - [dialogue-pause]: `pause: true` only on a cue scene (`cue_<name>`, D134; T501l): the briefing,
//   full-screen scenes, and base topics already hold input, and radio and debriefs never pause.
// - [dialogue-bark]: trigger waves and phases are positive integers; a `flag` trigger has a
//   `when`; a `tower_revoked` bark is a map's, never shared; `cooldownSec` > 0 and not with `once`.
// - [dialogue-tag]: name tags are on planned maps in campaign order.
import { CAMPAIGN_PLAN_IDS } from './campaign.ts';
import { FLAG_RULES, type FlagSet } from './dialogue/flags.ts';
import { MAP_DIALOGUE, SCENES, BARKS } from './dialogue/index.ts';
import { SHARED_BARKS } from './dialogue/barks/index.ts';
import {
  POLICY_TELL,
  PAUSING_CUE_MAX_LINES,
  RADIO_REPLY_MAX_LINES,
  SCENE_LINES,
  TEXT_LIMITS,
  mapAct,
  mapIndex,
  parseSceneId,
  tokenProblems,
  usesName,
  worstCaseLength,
} from './dialogue/rules.ts';
import { SPEAKER_DEFS } from './dialogue/speakers.ts';
import { FORCED_INPUTS } from './forcedInputs.ts';
import { NAME_TAGS, type NameTagDef } from './dialogue/tags.ts';
import {
  BARK_ID,
  BASE_EXPRESSIONS,
  EXPRESSION_EXTRAS,
  RUN_STORY_STATS,
  type Bark,
  type Condition,
  type DialogueMapId,
  type DialogueNode,
  type MapDialogue,
  type ReplyButton,
  type Scene,
  type SceneSlot,
  type StoryAct,
} from './dialogue/types.ts';
import { TOWERS } from './towers/index.ts';
import { validateEpilogue } from './validateEpilogue.ts';
import { Issues } from './validateHelpers.ts';

/** What dialogue validation reads. */
export interface DialogueContent {
  readonly maps: readonly MapDialogue[];
  readonly shared: readonly Bark[];
  readonly tags: readonly NameTagDef[];
  /** Ids `reply` and `seen` may name; defaults to the content's own scenes and barks. */
  readonly known?: ReadonlySet<string>;
}

/**
 * The registered dialogue (every act's, once each has registered: app/actContent.ts; tests and the
 * Node tools register them all first). `known` is read when validation runs, never at import, so a
 * registration after this module loads still counts.
 */
export const LIVE_DIALOGUE: DialogueContent = {
  maps: MAP_DIALOGUE,
  shared: SHARED_BARKS,
  tags: NAME_TAGS,
  get known() {
    return new Set([...Object.keys(SCENES), ...Object.keys(BARKS)]);
  },
};

let cache: { readonly maps: number; readonly errors: readonly string[] } | null = null;

/**
 * The live dialogue's errors, with the epilogue cards' (validateEpilogue.ts), computed once per
 * process for each set of registered acts (an act registering later is validated then too).
 */
export function dialogueErrors(): readonly string[] {
  if (cache?.maps !== MAP_DIALOGUE.length) {
    cache = {
      maps: MAP_DIALOGUE.length,
      errors: [...validateDialogue(LIVE_DIALOGUE), ...validateEpilogue()],
    };
  }
  return cache.errors;
}

const RULE_FLAGS: ReadonlySet<string> = new Set(FLAG_RULES.map((r) => r.flag));
const A3M02 = mapIndex('a3_m02');
const A3M03 = mapIndex('a3_m03');

/** Where a text sits: who says it, and the act and map its budget is judged in. */
interface Place {
  readonly where: string;
  readonly speaker: string;
  readonly act: StoryAct;
  /** Null for a shared bark (its map is whatever its `when` allows). */
  readonly map: DialogueMapId | null;
  readonly when?: Condition;
}

/** Every dialogue validation problem; empty when the dialogue is valid. Never throws. */
export function validateDialogue(content: DialogueContent): string[] {
  const issues = new Issues();
  const known =
    content.known ??
    new Set([
      ...content.maps.flatMap((m) => m.scenes.map((s) => s.id)),
      ...content.maps.flatMap((m) => m.barks.map((b) => b.id)),
      ...content.shared.map((b) => b.id),
    ]);
  const sceneIds = new Set<string>();
  const barkIds = new Set<string>();
  for (const m of content.maps) {
    for (const s of m.scenes) {
      if (sceneIds.has(s.id)) issues.add('dialogue-id', `scenes.${s.id}`, 'id is used twice');
      sceneIds.add(s.id);
      validateScene(issues, m.map, s, known);
    }
    for (const b of m.barks) validateBark(issues, b, m.map, barkIds, known);
  }
  for (const b of content.shared) validateBark(issues, b, null, barkIds, known);
  validateTags(issues, content.tags);
  return issues.errors;
}

// ── Scenes ───────────────────────────────────────────────────────────────────────────────────

function validateScene(
  issues: Issues,
  map: DialogueMapId,
  scene: Scene,
  known: ReadonlySet<string>,
): void {
  const where = `scenes.${scene.id}`;
  const parsed = parseSceneId(scene.id);
  if (parsed === null) {
    issues.add('dialogue-id', where, 'must be <map_id>_<slot> (style-guide § 5.3)');
    return;
  }
  if (parsed.map !== map) issues.add('dialogue-id', where, `is filed under ${map}`);
  const slot = parsed.slot;
  const act = mapAct(map);
  if (scene.when !== undefined) validateCondition(issues, scene.when, `${where}.when`, slot, known);
  if (scene.pause === true && slot.kind !== 'cue') {
    issues.add(
      'dialogue-pause',
      where,
      `only a cue scene may pause the battle, not a ${slot.kind}`,
    );
  }
  const labels = new Map<string, number>();
  scene.nodes.forEach((n, i) => {
    if (n.label === undefined) return;
    if (labels.has(n.label))
      issues.add('dialogue-jump', `${where}.nodes[${i}]`, `label '${n.label}' is used twice`);
    else labels.set(n.label, i);
  });
  scene.nodes.forEach((n, i) => {
    const at = `${where}.nodes[${i}]`;
    for (const label of jumpsOf(n)) {
      if (!labels.has(label)) issues.add('dialogue-jump', at, `no label '${label}' in the scene`);
    }
    validateNode(issues, n, { where: at, speaker: 'player', act, map }, slot, known);
  });
  validateFlow(issues, scene, labels, slot, where);
}

function validateNode(
  issues: Issues,
  n: DialogueNode,
  place: Place,
  slot: SceneSlot,
  known: ReadonlySet<string>,
): void {
  switch (n.kind) {
    case 'line': {
      const p = { ...place, speaker: n.speaker };
      validateSpoken(issues, p, n.speaker, n.expression, n.text, n.durationSec, TEXT_LIMITS.line);
      if (
        n.plateAs !== undefined &&
        (n.plateAs.length === 0 || n.plateAs.length > TEXT_LIMITS.tag)
      ) {
        issues.add('dialogue-plate', p.where, `plateAs must be 1–${TEXT_LIMITS.tag} characters`);
      }
      if (n.button !== undefined) {
        if (slot.kind !== 'radio' && slot.kind !== 'cue') {
          issues.add('dialogue-button', p.where, 'reply buttons ride only on radio and cue lines');
        }
        validateButton(issues, n.button, place, known);
      }
      return;
    }
    case 'choice': {
      const n2 = n.options.length;
      if (n2 < 2 || n2 > 3) issues.add('dialogue-choice', place.where, `has ${n2} options (2–3)`);
      const sets = new Set(n.options.flatMap((o) => Object.keys(o.set ?? {})));
      const c3c4 = sets.has('door_choice') || sets.has('quill_choice');
      n.options.forEach((o, i) => {
        const at = `${place.where}.options[${i}]`;
        validateText(issues, { ...place, where: at }, o.text, TEXT_LIMITS.choice);
        if (o.set !== undefined) validateSets(issues, o.set, at);
        if (o.remember !== undefined && !c3c4) {
          issues.add('dialogue-choice', at, '"will remember that" is only for C3 and C4');
        }
      });
      return;
    }
    case 'branch':
      validateCondition(issues, n.cond, `${place.where}.cond`, slot, known);
      return;
    case 'set':
      if ('flag' in n) validateSets(issues, { [n.flag]: n.value }, place.where);
      return;
    case 'end':
      return;
  }
}

/** The labels a node jumps to. */
function jumpsOf(n: DialogueNode): string[] {
  if (n.kind === 'choice') return n.options.flatMap((o) => (o.goto === undefined ? [] : [o.goto]));
  if (n.kind === 'branch') return n.else === undefined ? [n.goto] : [n.goto, n.else];
  return [];
}

/** The nodes `i` flows to (`nodes.length` is the end). Dangling labels are dropped. */
function successors(scene: Scene, labels: ReadonlyMap<string, number>, i: number): number[] {
  const n = scene.nodes[i];
  if (n === undefined || n.kind === 'end') return [];
  const to = (label: string | undefined): number[] => {
    if (label === undefined) return [i + 1];
    const j = labels.get(label);
    return j === undefined ? [] : [j];
  };
  if (n.kind === 'choice') return n.options.flatMap((o) => to(o.goto));
  if (n.kind === 'branch') return [...to(n.goto), ...to(n.else)];
  return [i + 1];
}

function validateFlow(
  issues: Issues,
  scene: Scene,
  labels: ReadonlyMap<string, number>,
  slot: SceneSlot,
  where: string,
): void {
  const count = scene.nodes.length;
  const seen = new Set<number>([0]);
  const queue = [0];
  for (let q = queue.shift(); q !== undefined; q = queue.shift()) {
    for (const j of successors(scene, labels, q)) {
      if (!seen.has(j)) {
        seen.add(j);
        queue.push(j);
      }
    }
  }
  for (let i = 0; i < count; i++) {
    if (!seen.has(i)) issues.add('dialogue-reach', `${where}.nodes[${i}]`, 'is unreachable');
  }
  // A loop through branch and set nodes alone never rests: the runner would spin.
  const silent = (i: number): boolean => {
    const k = scene.nodes[i]?.kind;
    return k === 'branch' || k === 'set';
  };
  const state = new Map<number, 'open' | 'done'>();
  const loops = (i: number): boolean => {
    state.set(i, 'open');
    for (const j of successors(scene, labels, i)) {
      if (!silent(j)) continue;
      const s = state.get(j);
      if (s === 'open' || (s === undefined && loops(j))) return true;
    }
    state.set(i, 'done');
    return false;
  };
  for (let i = 0; i < count; i++) {
    if (silent(i) && !state.has(i) && loops(i)) {
      issues.add('dialogue-reach', `${where}.nodes[${i}]`, 'loops without a line or a choice');
      break;
    }
  }
  const lines = longestLines(scene, labels);
  const { min } = SCENE_LINES[slot.kind];
  const max =
    slot.kind === 'cue' && scene.pause === true
      ? PAUSING_CUE_MAX_LINES
      : slot.kind === 'radio' && opensWithButton(scene)
        ? RADIO_REPLY_MAX_LINES
        : SCENE_LINES[slot.kind].max;
  if (lines < min || lines > max) {
    issues.add(
      'dialogue-size',
      where,
      `a play-through shows ${lines} lines (${slot.kind}: ${min}–${max})`,
    );
  }
}

/** Whether the first line `scene` shows carries a reply button (the knock-knock's shape). */
function opensWithButton(scene: Scene): boolean {
  const first = scene.nodes.find((n) => n.kind === 'line');
  return first?.kind === 'line' && first.button !== undefined;
}

/** The most lines any play-through shows (simple paths; scenes are small). */
function longestLines(scene: Scene, labels: ReadonlyMap<string, number>): number {
  const onPath = new Set<number>();
  const walk = (i: number): number => {
    const n = scene.nodes[i];
    if (n === undefined || onPath.has(i)) return 0;
    onPath.add(i);
    let best = 0;
    for (const j of successors(scene, labels, i)) best = Math.max(best, walk(j));
    onPath.delete(i);
    return best + (n.kind === 'line' ? 1 : 0);
  };
  return walk(0);
}

// ── Barks ────────────────────────────────────────────────────────────────────────────────────

const BARK_ACT = /_a(1|2|3|fin)_\d\d$/;

function actOfBarkId(id: string): StoryAct | null {
  const a = BARK_ACT.exec(id)?.[1];
  if (a === undefined) return null;
  return a === 'fin' ? 'finale' : a === '2' ? 2 : a === '3' ? 3 : 1;
}

function validateBark(
  issues: Issues,
  b: Bark,
  map: DialogueMapId | null,
  ids: Set<string>,
  known: ReadonlySet<string>,
): void {
  const where = `barks.${b.id}`;
  if (ids.has(b.id)) issues.add('dialogue-id', where, 'id is used twice');
  ids.add(b.id);
  const idAct = actOfBarkId(b.id);
  if (!BARK_ID.test(b.id) || idAct === null) {
    issues.add('dialogue-id', where, 'must be <speaker>_<trigger>_a<act>_<nn> (style-guide § 5.3)');
  } else if (!b.id.startsWith(`${b.speaker}_`)) {
    issues.add('dialogue-id', where, `must start with its speaker '${b.speaker}_'`);
  } else if (map !== null && mapAct(map) !== idAct) {
    issues.add('dialogue-id', where, `names act ${idAct}, but ${map} is act ${mapAct(map)}`);
  }
  const act = map === null ? (idAct ?? 1) : mapAct(map);
  const place: Place = { where, speaker: b.speaker, act, map, ...(b.when ? { when: b.when } : {}) };
  validateSpoken(issues, place, b.speaker, b.expression, b.text, b.durationSec, TEXT_LIMITS.bark);
  // A bark plays outside a run's end; there is no debrief slot to judge `outcome` against.
  if (b.when !== undefined) validateCondition(issues, b.when, `${where}.when`, null, known);
  if (b.button !== undefined) validateButton(issues, b.button, place, known);
  const t = b.trigger;
  if ('wave' in t && t.wave !== undefined && !(Number.isInteger(t.wave) && t.wave >= 1)) {
    issues.add('dialogue-bark', `${where}.trigger`, 'wave must be a positive integer');
  }
  if ('phase' in t && t.phase !== undefined && !(Number.isInteger(t.phase) && t.phase >= 1)) {
    issues.add('dialogue-bark', `${where}.trigger`, 'phase must be a positive integer');
  }
  // Only a map with a Clean Exit revokes (A3M2): its line is that map's, never a shared pool's.
  if (t.on === 'tower_revoked' && map === null) {
    issues.add('dialogue-bark', `${where}.trigger`, "a 'tower_revoked' bark is a map bark");
  }
  if (t.on === 'flag' && b.when === undefined) {
    issues.add('dialogue-bark', `${where}.trigger`, "a 'flag' bark needs a `when` naming the flag");
  }
  if (b.cooldownSec !== undefined) {
    if (!(Number.isFinite(b.cooldownSec) && b.cooldownSec > 0)) {
      issues.add('dialogue-bark', where, 'cooldownSec must be > 0');
    }
    if (b.once !== undefined)
      issues.add('dialogue-bark', where, 'cooldownSec never applies with once');
  }
}

// ── Shared checks ────────────────────────────────────────────────────────────────────────────

/** Speaker, expression, silence, and the text rules for a line or bark. */
function validateSpoken(
  issues: Issues,
  place: Place,
  speaker: string,
  expression: string | undefined,
  text: string,
  durationSec: number | undefined,
  limit: number,
): void {
  const def = Object.hasOwn(SPEAKER_DEFS, speaker)
    ? Object.entries(SPEAKER_DEFS).find(([id]) => id === speaker)?.[1]
    : undefined;
  if (def === undefined) {
    issues.add('dialogue-speaker', place.where, `unknown speaker '${speaker}'`);
  } else if (expression !== undefined) {
    const extras: Readonly<Record<string, string>> =
      Object.entries(EXPRESSION_EXTRAS).find(([id]) => id === speaker)?.[1] ?? {};
    const ok =
      def.frame === 'portrait' &&
      (BASE_EXPRESSIONS.some((e) => e === expression) || Object.hasOwn(extras, expression));
    if (!ok)
      issues.add('dialogue-speaker', place.where, `'${speaker}' has no expression '${expression}'`);
  }
  if (speaker === 'quill') {
    const tell = text.startsWith(POLICY_TELL) || text.endsWith(POLICY_TELL);
    if (tell !== (expression === 'policy')) {
      issues.add(
        'dialogue-policy',
        place.where,
        `"${POLICY_TELL}" and the 'policy' expression go together (style-guide § 5.6)`,
      );
    }
  }
  if (durationSec !== undefined && !(Number.isFinite(durationSec) && durationSec > 0)) {
    issues.add('dialogue-silence', place.where, 'durationSec must be > 0');
  }
  if (text === '') {
    if (durationSec === undefined) {
      issues.add('dialogue-silence', place.where, 'a silence line needs a durationSec');
    }
    return;
  }
  validateText(issues, place, text, limit);
}

/** Tokens, length, `{name}`, the "!" budget, and emphasis for one text. */
function validateText(issues: Issues, place: Place, text: string, limit: number): void {
  for (const p of tokenProblems(text)) issues.add('dialogue-token', place.where, p);
  const len = worstCaseLength(text);
  if (len > limit) {
    issues.add('dialogue-length', place.where, `${len} characters at worst case (limit ${limit})`);
  }
  if (usesName(text) && !nameAllowed(place)) {
    issues.add(
      'dialogue-name',
      place.where,
      `'${place.speaker}' may not say {name} here (only system copy, or from a3_m03 on; never Sterling)`,
    );
  }
  if (text.includes('!') && !bangAllowed(place)) {
    issues.add(
      'dialogue-bang',
      place.where,
      `'${place.speaker}' has no "!" budget here (style-guide § 2)`,
    );
  }
  const stars = text.split('*').length - 1;
  if (stars !== 0 && stars !== 2) {
    issues.add('dialogue-emphasis', place.where, 'at most one *emphasis* per line');
  }
}

function nameAllowed(place: Place): boolean {
  if (place.speaker === 'system') return true;
  if (place.speaker === 'sterling') return false;
  if (place.map !== null) return mapIndex(place.map) >= A3M03;
  return place.when !== undefined && impliesMapAtLeast(place.when, A3M03);
}

/** Whether `cond` holding means the map is at or after campaign index `idx`. */
export function impliesMapAtLeast(cond: Condition, idx: number): boolean {
  if ('all' in cond) return cond.all.some((c) => impliesMapAtLeast(c, idx));
  if ('any' in cond) return cond.any.length > 0 && cond.any.every((c) => impliesMapAtLeast(c, idx));
  if ('mapAtLeast' in cond) return mapIndex(cond.mapAtLeast) >= idx;
  if ('mapIs' in cond) return mapIndex(cond.mapIs) >= idx;
  if ('act' in cond) {
    const first = CAMPAIGN_PLAN_IDS.findIndex((m) => mapAct(m) === cond.act);
    return first >= idx;
  }
  return false;
}

function bangAllowed(place: Place): boolean {
  const s = place.speaker;
  if (s === 'bricks' || s === 'vesthara') return false;
  if (s === 'quill' && place.map !== null && mapIndex(place.map) > A3M02) return false;
  if (place.act === 3) return s === 'sterling' || s === 'pebble';
  if (place.act === 'finale') return s === 'pebble' || s === 'sterling' || s === 'system';
  return true;
}

function validateButton(
  issues: Issues,
  button: ReplyButton,
  place: Place,
  known: ReadonlySet<string>,
): void {
  const at = `${place.where}.button`;
  validateText(
    issues,
    { ...place, where: at, speaker: 'player' },
    button.label,
    TEXT_LIMITS.button,
  );
  if (button.set !== undefined) validateSets(issues, button.set, at);
  if (button.reply !== undefined && !known.has(button.reply)) {
    issues.add('dialogue-button', at, `reply '${button.reply}' is not a registered scene`);
  }
}

function validateSets(issues: Issues, set: FlagSet, where: string): void {
  for (const flag of Object.keys(set)) {
    if (RULE_FLAGS.has(flag)) {
      issues.add('dialogue-flag', where, `'${flag}' is set by its run-end rule, never by dialogue`);
    }
  }
}

/** `slot` null: a bark (no run has just ended). */
function validateCondition(
  issues: Issues,
  cond: Condition,
  where: string,
  slot: SceneSlot | null,
  known: ReadonlySet<string>,
): void {
  if ('all' in cond || 'any' in cond) {
    for (const c of 'all' in cond ? cond.all : cond.any)
      validateCondition(issues, c, where, slot, known);
    return;
  }
  if ('not' in cond) {
    validateCondition(issues, cond.not, where, slot, known);
    return;
  }
  if ('thisRun' in cond && !RULE_FLAGS.has(cond.thisRun)) {
    issues.add('dialogue-cond', where, `thisRun '${cond.thisRun}' has no run-end rule`);
  }
  if (('thisRun' in cond || 'outcome' in cond) && slot !== null) {
    if (slot.kind !== 'debrief' && slot.kind !== 'scene') {
      issues.add(
        'dialogue-cond',
        where,
        `outcome and thisRun read a run's end; a ${slot.kind} has none`,
      );
    }
  }
  if ('bank' in cond) validateBounds(issues, where, 'bank', cond);
  if ('runStat' in cond) {
    if (!(RUN_STORY_STATS as readonly string[]).includes(cond.runStat)) {
      issues.add('dialogue-cond', where, `runStat '${cond.runStat}' is not a run story stat`);
    }
    validateBounds(issues, where, 'runStat', cond);
    if (slot?.kind === 'base') {
      issues.add('dialogue-cond', where, 'runStat reads a run; a base topic has none');
    }
  }
  // The run's script state (T809): a phase is a whole number from 1; an input one the content names.
  if ('phaseAtLeast' in cond && !(Number.isInteger(cond.phaseAtLeast) && cond.phaseAtLeast >= 1)) {
    issues.add('dialogue-cond', where, `phaseAtLeast ${cond.phaseAtLeast} is not a phase (1 on)`);
  }
  if ('inputResolved' in cond && !Object.hasOwn(FORCED_INPUTS, cond.inputResolved)) {
    issues.add(
      'dialogue-cond',
      where,
      `inputResolved '${cond.inputResolved}' is not a forced input`,
    );
  }
  if (('phaseAtLeast' in cond || 'inputResolved' in cond) && slot?.kind === 'base') {
    issues.add('dialogue-cond', where, 'a script test reads a run; a base topic has none');
  }
  if ('revokedTower' in cond && !Object.hasOwn(TOWERS, cond.revokedTower)) {
    issues.add('dialogue-cond', where, `revokedTower '${cond.revokedTower}' is not a tower`);
  }
  if ('seen' in cond && !known.has(cond.seen)) {
    issues.add('dialogue-cond', where, `seen '${cond.seen}' is not a registered scene or bark`);
  }
}

/** A `bank` or `runStat` test's bounds: at least one, each a non-negative integer, `gte` ≤ `lte`. */
function validateBounds(
  issues: Issues,
  where: string,
  what: 'bank' | 'runStat',
  cond: { readonly gte?: number; readonly lte?: number },
): void {
  const bounds = [cond.gte, cond.lte].filter((b) => b !== undefined);
  if (bounds.length === 0) issues.add('dialogue-cond', where, `a ${what} test needs gte or lte`);
  if (bounds.some((b) => !(Number.isInteger(b) && b >= 0))) {
    issues.add('dialogue-cond', where, `${what} bounds must be non-negative integers`);
  }
  if (cond.gte !== undefined && cond.lte !== undefined && cond.gte > cond.lte) {
    issues.add('dialogue-cond', where, `${what} gte is above its lte: it never holds`);
  }
}

// ── Name tags ────────────────────────────────────────────────────────────────────────────────

function validateTags(issues: Issues, tags: readonly NameTagDef[]): void {
  let last = -1;
  tags.forEach((t, i) => {
    const where = `nameTags[${i}]`;
    const at = mapIndex(t.map);
    if (at <= last)
      issues.add('dialogue-tag', where, `${t.map} is out of campaign order or repeated`);
    last = Math.max(last, at);
    validateText(
      issues,
      { where, speaker: 'system', act: mapAct(t.map), map: t.map },
      t.name,
      TEXT_LIMITS.tag,
    );
  });
}
