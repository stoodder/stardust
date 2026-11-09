// Pure HUD layout math, in game pixels (the #ui box is 640×360): where the tower panel goes, how
// tall it is, and how its text wraps (T202d), so it can be placed before it renders.
import type { SelectedTowerView } from '../state.ts';

export const UI_W = 640;
export const UI_H = 360;
/** Clear space between the HUD and the screen edge. */
export const EDGE = 4;
/** Horizontal gap between a tower's ground point and its panel (clears TOWER_BOX). */
const GAP = 14;
/** Vertical gap between a tower's box and a panel above or below it. */
const GAP_Y = 4;

/** A screen rectangle in game pixels. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** The status panel's height with no objectives: the name plate, meter, credits, and medals. */
const STATUS_H = 72;
/** What each objective row adds to it (the first also adds the grid gap above the list). */
const OBJECTIVE_ROW_H = 10;

/**
 * The HUD's corner blocks (art-direction §9; their CSS in hud.css): the status panel (name plate,
 * meter, credits, medals) top-left, waves and speed top-right, the ability slots bottom-left, the
 * build slots bottom-right (with the NEW tags and Clearance Sale's tag over them). The tower panel
 * keeps clear of them when it can (T213).
 */
export const HUD_CORNERS: readonly Rect[] = [
  { x: 4, y: 4, w: 100, h: STATUS_H },
  // The wave panel grows a second preview row when a wave brings several kinds.
  { x: UI_W - 4 - 150, y: 4, w: 150, h: 92 },
  // Two ability slots and Hold fire (all) (Spare runners (all), from A2M1, adds 47 px), with
  // Ready Room's FREE tag over them.
  { x: 4, y: UI_H - 4 - 44, w: 122, h: 44 },
  { x: UI_W - 4 - 129, y: UI_H - 4 - 50, w: 129, h: 50 },
];

/** The corner blocks with the status panel grown by `objectives` tracker rows (T312c). */
export function hudCorners(objectives: number): readonly Rect[] {
  if (objectives <= 0) return HUD_CORNERS;
  const [status, ...rest] = HUD_CORNERS;
  if (status === undefined) return HUD_CORNERS;
  return [{ ...status, h: status.h + objectives * OBJECTIVE_ROW_H + 2 }, ...rest];
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

/** Whether two rectangles overlap. */
function overlapsRect(left: number, top: number, w: number, h: number, r: Rect): boolean {
  return left < r.x + r.w && r.x < left + w && top < r.y + r.h && r.y < top + h;
}

/** Whether the w×h panel at (left, top) overlaps the box of the tower standing at `p`. */
function covers(left: number, top: number, w: number, h: number, p: Point): boolean {
  const bx = p.x + TOWER_BOX.dx;
  const by = p.y + TOWER_BOX.dy;
  return left < bx + TOWER_BOX.w && bx < left + w && top < by + TOWER_BOX.h && by < top + h;
}

/**
 * Where the selected tower's panel goes (T126; art-direction § Look). The candidates, in order of
 * preference: beside the tower on the side away from the screen center, then the other side
 * (each level with the tower, then raised, then lowered by half the panel), then above and below
 * it (centered, then shifted left, then right). Each is clamped onto the screen. The first one
 * that covers none of the `others` (the other towers' ground points) and none of the `blocked`
 * rectangles (the HUD corners, T213) wins; failing that, the cheapest (a tower costs 1, a corner
 * 2). A candidate that covers the selected tower itself only wins when every one does.
 */
export function placePanel(
  towerX: number,
  towerY: number,
  w: number,
  h: number,
  others: readonly Point[] = [],
  blocked: readonly Rect[] = [],
): { left: number; top: number } {
  const self: Point = { x: towerX, y: towerY };
  const level = Math.round(towerY - h / 2 - 8);
  const leftX = towerX - GAP - w;
  const rightX = towerX + GAP;
  const sides = towerX < UI_W / 2 ? [leftX, rightX] : [rightX, leftX];
  const shiftsY = [0, -Math.round(h / 2), Math.round(h / 2)];
  const aboveY = towerY + TOWER_BOX.dy - GAP_Y - h;
  const belowY = towerY + TOWER_BOX.dy + TOWER_BOX.h + GAP_Y;
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
    let score = covers(left, top, w, h, self) ? 1000 : 0;
    for (const p of others) if (covers(left, top, w, h, p)) score++;
    for (const r of blocked) if (overlapsRect(left, top, w, h, r)) score += CORNER_COST;
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
 * the stats lines, the bonus lines, the "Next:" lines, then either the tier-4 choice (a heading,
 * two cards, and the lock note) or the Upgrade button, and the Sell, Target, and Hold fire
 * buttons, plus Spare runners once it shows.
 */
export function towerPanelHeight(
  t: Pick<SelectedTowerView, 'statsLines' | 'bonuses' | 'deltaLines' | 'specs'> &
    Partial<Pick<SelectedTowerView, 'spareRunners'>>,
): number {
  const rows: number[] = [PANEL_HEAD_H];
  const lines = t.statsLines.length + t.bonuses.length + t.deltaLines.length;
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
