// Pure HUD layout math, in game pixels (the #ui box is 640×360): where the tower panel goes, how
// tall it is, and how its text wraps (T202d), so it can be placed before it renders.
import type { SelectedTowerView } from '../state.ts';

export const UI_W = 640;
export const UI_H = 360;
/** Clear space between the HUD and the screen edge. */
export const EDGE = 4;
/** Horizontal gap between the selected box's edge and a panel beside it. */
const GAP_X = 2;
/** Vertical gap between the selected box and a panel above or below it. */
const GAP_Y = 4;

/** A screen rectangle in game pixels. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** A rectangle a panel should keep clear of, with its own cost (placePanel; T863). */
export interface CostedRect extends Rect {
  /** What covering it costs a placement (default: `placePanel`'s `blockedCost`). */
  readonly cost?: number;
}

/** The status panel's height with no objectives: the name plate, meter, credits, and medals. */
const STATUS_H = 72;
/** What each objective row adds to it (the first also adds the grid gap above the list). */
const OBJECTIVE_ROW_H = 10;
/** An objective's name past this many characters wraps to a second line (hud.css; T631). */
export const OBJECTIVE_LINE_CHARS = 15;

/**
 * The tracker's rows as the status panel's height counts them: one per objective, two for a name
 * that wraps (A3M1's "The Matriarch's Young").
 */
export function objectiveRows(objectives: readonly { readonly name: string }[]): number {
  let n = 0;
  for (const o of objectives) n += o.name.length > OBJECTIVE_LINE_CHARS ? 2 : 1;
  return n;
}

/**
 * The HUD's corner blocks (art-direction §9; their CSS in hud.css): the status panel (name plate,
 * meter, credits, medals) top-left, waves and speed top-right, the ability slots bottom-left, the
 * build slots bottom-right (with the NEW tags and Clearance Sale's tag over them). The tower panel
 * keeps clear of them when it can (T213).
 */
export const HUD_CORNERS: readonly Rect[] = [
  { x: 4, y: 4, w: 112, h: STATUS_H },
  // The wave panel grows a second preview row when a wave brings several kinds.
  { x: UI_W - 4 - 150, y: 4, w: 150, h: 92 },
  // Two ability slots (slot 2 with its companion's face) and Hold fire (all) (Spare runners (all),
  // from A2M1, adds 47 px), with Ready Room's FREE tag over them.
  { x: 4, y: UI_H - 4 - 44, w: 138, h: 44 },
  { x: UI_W - 4 - 129, y: UI_H - 4 - 50, w: 129, h: 50 },
];

/** What a Protect map's asset meter row adds to it (a 16 px meter row and the grid gap; T305a). */
const ASSET_ROW_H = 20;
/** What the bearers' "Home n / total" row adds under that (an 8 px row and a 2 px gap; T731). */
export const BEARER_ROW_H = 10;
/** What one locked ability slot adds to the bottom-left cluster (a 36 px slot and the gap; T731). */
export const LOCKED_SLOT_W = 39;

/** What an Escort's meter adds over the core's: its "of N" and lost rows (8 px and a 2 px gap each; T531). */
export const ESCORT_EXTRA_H = 20;
/** What QUILL's leak line adds to the wave panel under the lockout: up to five 9 px lines (T631). */
export const LEAK_EXTRA_H = 56;
/** What a Holdout's meter adds: its "of N" row only (no lost row; T631). */
export const HOLDOUT_EXTRA_H = 10;
/** What the finale's choir meter adds over an Escort's: the gate's row under it (T832). */
export const GATE_ROW_H = 12;

/**
 * The finale's clock (T832; ui/hud/FinaleClock.tsx): top centre under the boss bar, the boss
 * bar's 160 px and its padding, the countdown's 16 px figures tall.
 */
export const FINALE_CLOCK_RECT: Rect = { x: (UI_W - 168) / 2, y: 49, w: 168, h: 26 };

/**
 * The corner blocks with the status panel grown by `objectives` tracker rows (T312c), on a
 * Protect map the asset meter's row (T431), and while the map is an Escort its meter's two extra
 * rows (T531), on a Holdout its one (`'holdout'`, T631), on the finale's choir the Escort's two and
 * the gate's (`'choir'`, T832), and the wave panel grown by QUILL's leak line while one shows
 * (`leak`, T631); and the finale's clock while it shows (`clock`, T832).
 */
export function hudCorners(
  objectives: number,
  asset: boolean | 'bearers' = false,
  escort: boolean | 'holdout' | 'choir' = false,
  leak = false,
  lockedSlots = 0,
  clock = false,
): readonly Rect[] {
  if (clock) {
    return [...hudCorners(objectives, asset, escort, leak, lockedSlots), FINALE_CLOCK_RECT];
  }
  if (objectives <= 0 && asset === false && escort === false && !leak && lockedSlots <= 0) {
    return HUD_CORNERS;
  }
  const [status, waves, abilities, ...rest] = HUD_CORNERS;
  if (status === undefined || waves === undefined || abilities === undefined) return HUD_CORNERS;
  // QUILL's leak line (A3M2's lockout, T631) hangs up to five lines under ACCESS RESTRICTED.
  const wavesNow = leak ? { ...waves, h: waves.h + LEAK_EXTRA_H } : waves;
  const rows = objectives > 0 ? objectives * OBJECTIVE_ROW_H + 2 : 0;
  const meter =
    escort === 'holdout'
      ? HOLDOUT_EXTRA_H
      : escort === 'choir'
        ? ESCORT_EXTRA_H + GATE_ROW_H
        : escort
          ? ESCORT_EXTRA_H
          : 0;
  // The bearers' meter (A3M5, T731) has its "Home n / total" row under the asset's.
  const assetH = asset === false ? 0 : ASSET_ROW_H + (asset === 'bearers' ? BEARER_ROW_H : 0);
  const extra = assetH + meter;
  // A locked ability (A3M5's System Reboot under Rewrite, T731) stands dark beside the slots.
  const abilitiesNow =
    lockedSlots > 0 ? { ...abilities, w: abilities.w + lockedSlots * LOCKED_SLOT_W } : abilities;
  return [{ ...status, h: status.h + rows + extra }, wavesNow, abilitiesNow, ...rest];
}
/** What covering a HUD corner costs a candidate, against 1 per covered tower. */
const CORNER_COST = 2;

/** A screen point in game pixels. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * A tower's footprint on screen, relative to its ground point (the tile center): the base and
 * the tallest head above it, a little inside the 32 px tile so a panel GAP px to the side clears.
 */
export const TOWER_BOX = { dx: -12, dy: -28, w: 24, h: 34 } as const;

/** A selected thing's box on screen, relative to its point (TOWER_BOX, or a star map node's). */
export interface AnchorBox {
  readonly dx: number;
  readonly dy: number;
  readonly w: number;
  readonly h: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Whether two rectangles overlap. */
function overlapsRect(left: number, top: number, w: number, h: number, r: Rect): boolean {
  return left < r.x + r.w && r.x < left + w && top < r.y + r.h && r.y < top + h;
}

/** Whether the w×h panel at (left, top) overlaps `box` around the point `p`. */
function covers(
  left: number,
  top: number,
  w: number,
  h: number,
  p: Point,
  box: AnchorBox = TOWER_BOX,
): boolean {
  const bx = p.x + box.dx;
  const by = p.y + box.dy;
  return left < bx + box.w && bx < left + w && top < by + box.h && by < top + h;
}

/**
 * Where the selected tower's panel goes (T126; art-direction § Look), or any panel beside a
 * selected box (`box`: the star map's node panel passes a node's 16×16 box, T301b). The
 * candidates, in order of preference: beside the box on the side away from the screen center,
 * then the other side (each level with it, then raised, then lowered by half the panel), then
 * above and below it (centered, then shifted left, then right). Each is clamped onto the screen.
 * The first one that covers none of the `others` (the other towers' ground points, or nodes'
 * centres, with `othersBox`, by default the same box) and none of the `blocked` rectangles (the HUD corners, T213) wins;
 * failing that, the cheapest (another box costs 1, a blocked rectangle `blockedCost`, by default
 * 2, or the rectangle's own `cost`; the star map's chrome costs more, T631: its buttons under a
 * panel can't be reached, and its text-only plates less, T863). A
 * candidate that covers the selected box itself only wins when every one does.
 */
export function placePanel(
  towerX: number,
  towerY: number,
  w: number,
  h: number,
  others: readonly Point[] = [],
  blocked: readonly CostedRect[] = [],
  box: AnchorBox = TOWER_BOX,
  othersBox: AnchorBox = box,
  blockedCost: number = CORNER_COST,
): { left: number; top: number } {
  const self: Point = { x: towerX, y: towerY };
  // Level with the box's middle, 3 px low (a tower's panel sits 8 px above its ground point).
  const level = Math.round(towerY + box.dy + box.h / 2 + 3 - h / 2);
  const leftX = towerX + box.dx - GAP_X - w;
  const rightX = towerX + box.dx + box.w + GAP_X;
  const sides = towerX < UI_W / 2 ? [leftX, rightX] : [rightX, leftX];
  const shiftsY = [0, -Math.round(h / 2), Math.round(h / 2)];
  const aboveY = towerY + box.dy - GAP_Y - h;
  const belowY = towerY + box.dy + box.h + GAP_Y;
  const centerX = Math.round(towerX - w / 2);
  const shiftsX = [0, -Math.round(w / 2), Math.round(w / 2)];
  const candidates: [number, number][] = [];
  for (const x of sides) for (const dy of shiftsY) candidates.push([x, level + dy]);
  for (const y of [aboveY, belowY]) for (const dx of shiftsX) candidates.push([centerX + dx, y]);

  let best = { left: 0, top: 0 };
  let bestScore = Infinity;
  for (const [x, y] of candidates) {
    const left = clamp(x, EDGE, UI_W - EDGE - w);
    const top = clamp(y, EDGE, UI_H - EDGE - h);
    let score = covers(left, top, w, h, self, box) ? 1000 : 0;
    for (const p of others) if (covers(left, top, w, h, p, othersBox)) score++;
    for (const r of blocked) if (overlapsRect(left, top, w, h, r)) score += r.cost ?? blockedCost;
    if (score < bestScore) {
      best = { left, top };
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best;
}

/**
 * One step of a counter that ticks toward its target instead of jumping (art-direction § Look):
 * it covers any gap in about `durationMs`, at least 1 per step.
 */
export function tickToward(shown: number, target: number, dtMs: number, durationMs = 250): number {
  const diff = target - shown;
  if (diff === 0) return shown;
  const step = Math.max(1, Math.ceil((Math.abs(diff) * Math.max(dtMs, 0)) / durationMs));
  return Math.abs(diff) <= step ? target : shown + Math.sign(diff) * step;
}

// ── The tower panel's size (T202d) ──────────────────────────────────────────────────────────

/** The tower panel's width, and its padding and row gap (hud.css `.hud-tower`). */
export const PANEL_W = 152;
export const PANEL_PAD = 4;
export const PANEL_GAP = 2;
/** Row heights: the header, a line of 8 px text, a button. */
export const PANEL_HEAD_H = 18;
export const LINE_H = 8;
export const BUTTON_H = 16;
/** A spec card's vertical padding and the gap between its lines (hud.css `.hud-spec`). */
export const CARD_PAD_Y = 3;
export const CARD_LINE_GAP = 2;
/** A spec card's horizontal padding. */
const CARD_PAD_X = 3;
/** Silkscreen's advance at 8 px in capitals, rounded up (it renders up to 5.6 px): wrapping budgets. */
export const CHAR_PX = 6;
/** Characters on one line of the panel, and of a spec card. */
export const PANEL_CHARS = Math.floor((PANEL_W - 2 * PANEL_PAD) / CHAR_PX);
export const CARD_CHARS = Math.floor((PANEL_W - 2 * PANEL_PAD - 2 * CARD_PAD_X) / CHAR_PX);

/**
 * Packs `parts` into lines of at most `maxChars`, joined by `sep`; a part longer than a line is
 * split at its spaces (a single word longer than that stays whole on its own line).
 */
export function wrapParts(parts: readonly string[], maxChars: number, sep = ' · '): string[] {
  const words: string[] = [];
  const lines: string[] = [];
  let line = '';
  const push = (piece: string, joiner: string): void => {
    if (line === '') line = piece;
    else if (line.length + joiner.length + piece.length <= maxChars) line += joiner + piece;
    else {
      lines.push(line);
      line = piece;
    }
  };
  for (const part of parts) {
    if (part.length <= maxChars) {
      push(part, sep);
      continue;
    }
    words.length = 0;
    words.push(...part.split(' '));
    words.forEach((w, i) => push(w, i === 0 ? sep : ' '));
  }
  if (line !== '') lines.push(line);
  return lines;
}

/** A spec card's height: its name line and its description lines. */
export function specCardHeight(descLines: number): number {
  return 2 * CARD_PAD_Y + LINE_H + descLines * (LINE_H + CARD_LINE_GAP);
}

/**
 * The tower panel's height for a view (its rows in hud/TowerPanel.tsx's order): the header,
 * the stats lines, a beam's ramp row, the bonus lines, Sundown's line, the "Next:" lines, then either the tier-4 choice (a heading,
 * two cards, and the lock note) or the Upgrade button, and the Sell, Target, and Hold fire
 * buttons, plus Spare runners once it shows.
 */
export function towerPanelHeight(
  t: Pick<SelectedTowerView, 'statsLines' | 'bonuses' | 'deltaLines' | 'specs'> &
    Partial<
      Pick<SelectedTowerView, 'spareRunners' | 'dark' | 'rampCap' | 'jamSec' | 'jamImmuneSec'>
    >,
): number {
  const rows: number[] = [PANEL_HEAD_H];
  // A ramping beam's live ramp row (T531) sits under the stats; Sundown's line under the bonuses.
  const ramp = t.rampCap !== undefined && t.rampCap !== null ? 1 : 0;
  // The Jammed (or Immune) row (T731) sits under the head.
  const jam = (t.jamSec ?? 0) > 0 || (t.jamImmuneSec ?? 0) > 0 ? 1 : 0;
  const lines =
    jam +
    t.statsLines.length +
    ramp +
    t.bonuses.length +
    (t.dark?.length ?? 0) +
    t.deltaLines.length;
  for (let i = 0; i < lines; i++) rows.push(LINE_H);
  if (t.specs === null) rows.push(BUTTON_H);
  else {
    rows.push(LINE_H);
    for (const o of t.specs.options) rows.push(specCardHeight(o.descLines.length));
    for (let i = 0; i < t.specs.lockLines.length; i++) rows.push(LINE_H);
  }
  rows.push(BUTTON_H, BUTTON_H, BUTTON_H);
  if (t.spareRunners !== undefined && t.spareRunners !== null) rows.push(BUTTON_H);
  const sum = rows.reduce((a, b) => a + b, 0);
  return 2 * PANEL_PAD + sum + PANEL_GAP * (rows.length - 1);
}

// ─── The forced input's screen (A3M3's SEAL; D143 R3) ─────────────────────────────────────────

/** The SEAL button's box: centred, SEAL_BOTTOM above the bottom edge (forcedInput.css). */
export const SEAL_W = 128;
export const SEAL_H = 32;
export const SEAL_BOTTOM = 40;
/** The clear space kept around a door the screen must not cover. */
export const AVOID_MARGIN = 4;
/**
 * The SEAL button's top when lifting it clear of the doors would leave no room (D144 S8): the top
 * band, under the comms panel (which sits at the top centre while a forced input waits: 4 px down
 * and up to 86 px tall, a cue line over a portrait line, as A3M3's permission shows it), with a
 * 6 px gap. smoke/a3m3.spec.ts pins it: the button in this band clears the panel (T664).
 */
export const SEAL_TOP_BAND = 96;

/** Whether two boxes overlap (touching edges don't). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** `r` grown by `m` on every side. */
export function grow(r: Rect, m: number): Rect {
  return { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
}

/**
 * The SEAL button's distance from the bottom edge (game px): SEAL_BOTTOM, or lifted just above
 * every box in `avoid` (plus AVOID_MARGIN) it would cover, so the doors stay in sight (D143 R3:
 * the east door sits right under the button's usual place; D144 S8: both doors, open or shut).
 * Lifted past SEAL_TOP_BAND, it goes to that band instead.
 */
export function sealButtonBottom(avoid: readonly Rect[]): number {
  const band = UI_H - SEAL_TOP_BAND - SEAL_H;
  let bottom = SEAL_BOTTOM;
  for (let pass = 0; pass < avoid.length + 1; pass++) {
    const box: Rect = { x: (UI_W - SEAL_W) / 2, y: UI_H - bottom - SEAL_H, w: SEAL_W, h: SEAL_H };
    if (box.y < SEAL_TOP_BAND) return band;
    const hit = avoid.map((a) => grow(a, AVOID_MARGIN)).find((a) => overlaps(box, a));
    if (hit === undefined) return bottom;
    bottom = UI_H - hit.y;
  }
  return band;
}
