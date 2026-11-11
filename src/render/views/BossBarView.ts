// The boss bar (art-direction §8, the `boss` tell; design/enemies.md § 6; T312b): while a boss is
// on the map, its name in the 3×5 font (`gold.4`) over a 160×4 bar at the top of the screen,
// between the notices and the wave banner, in `overlay` and fixed to the screen (the camera shake
// doesn't move it). The bar is a 1 px `ink.0` frame round an `ink.2` track; the HP is `gold.3`
// under a lit `gold.4` top row, with a `red.3` chip behind it that drains after each hit (the
// damage just dealt), and a
// `white.1` 1 px marker at each phase threshold standing 2 px proud of the bar (Chitterbloom's 60%
// and 25%; the next one is the stop no burst skips). A phase change flashes the whole bar white;
// while the boss is invulnerable after it, the fill shimmers `white.1` ↔ `gold.4` (steady white
// under reduced motion). Once its ending starts (`BossEnded`: driven off), the bar holds a moment
// and steps out; a pivot (the Penitent kneeling, T506) steps out at once, holding the HP it had
// rather than draining to empty as the boss's body fades away (T530a). A shield-broken phase has no
// marker (bossBar.ts). A shielded boss (the Glass Witch, the Penitent) has a 2 px shield strip
// under its HP, below a 1 px `ink.0` rule in the same frame: its shield against its own maximum
// in `blue.4` segments (3 on, 1 off, as the small bars draw it), flashing white as it breaks and
// as it re-forms; while a shield-broken boss's shards count the wall back, a `blue.2` ghost grows
// along the empty strip (review R6). A boss whose fight ends above 0 (`endAtPct`) has the end
// mark there: a `white.1` tick edged in `ink.0` through the whole bar, standing on a 3 px flag
// under it, the place the HP stops (the Witch's retreat, the Penitent's kneel), and under the
// kneel's flag a tiny "½" (D139). A split boss (the Gathering Maw, T708) keeps one bar across its
// parts and its merge (gmawLook.ts `bossBarKey`): from the split it measures their HP summed
// (the sim's `splitHp`) against what they split with (`splitMaxHp`), without the whole boss's
// marks, flashing as the parts and then the merged Maw come. While the parts walk (T731) the bar
// is cut into one cell per part, in the order they split, each filling with that part's own HP
// (its chip draining in its cell) and parted from the next by a 1 px `ink.0` gap, so a dead part
// reads as an empty cell; the merged Maw is one bar again. Allocation-free per frame: the Graphics
// redraws only when what it shows changes.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { splitHp, type Enemy } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { VIEW_W } from '../scale.ts';
import {
  BAR_HOLD_MS,
  barFadeAlpha,
  barFillPx,
  BOSS_BAR_H,
  BOSS_BAR_W,
  BOSS_BAR_Y,
  BOSS_LABEL_Y,
  BOSS_SHIELD_H,
  barBodyH,
  bossLabel,
  chipPx,
  END_FLAG_W,
  endGlyph,
  MAX_SEGMENTS,
  segmentEdgesPx,
  endMarkPx,
  MARK_OVERHANG_PX,
  PHASE_FLASH_MS,
  phaseMarksPx,
  reformPx,
  SHIELD_SEG_PERIOD,
  shieldSegLit,
  shieldStripPx,
} from '../vfx/bossBar.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import { floatTextTexture } from '../vfx/overlayTextures.ts';
import { SHIMMER_MS } from './EnemyView.ts';
import { bossBarKey } from './gmawLook.ts'; // T708
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the bar reads it. */
export interface BossPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

const C = {
  frame: hex('ink.0'),
  track: hex('ink.2'),
  fill: hex('gold.3'),
  lit: hex('gold.4'),
  chip: hex('red.3'),
  mark: hex('white.1'),
  flash: hex('white.1'),
  shield: hex('blue.4'),
  reform: hex('blue.2'),
};

/** The bar's left edge (inside the frame), centered on the 640 px view. */
const BAR_X = Math.round((VIEW_W - BOSS_BAR_W) / 2);

/** How many parts a split boss's def splits into (its split phase's `count`), or 0. */
function splitCount(def: DeepReadonly<Enemy>['splitFrom']): number {
  for (const p of def?.boss?.phases ?? []) if (p.split !== null) return p.split.count;
  return 0;
}

export class BossBarView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #label: Phaser.GameObjects.Image;
  /** The boss shown (0: none), its phase marks, and its max HP. */
  #uid = 0;
  #marks: number[] = [];
  #maxHp = 0;
  /** Its end mark (px; −1: none), its shield's maximum (0: no strip), and the shards' re-form. */
  #end = -1;
  /** The tiny fraction under the end mark's flag (the kneel's "½"), or null. */
  #endGlyph: readonly string[] | null = null;
  #maxShield = 0;
  #shield = 0;
  #reform = 0;
  #shieldFlashMs = 0;
  /** The shield as of the last frame (−1: not read yet), to catch its break and its re-form. */
  #lastShield = -1;
  #fill = -1;
  #chip = 0;
  #flashMs = 0;
  /** ms since its ending began (−1: still fighting), and how long it holds before stepping out. */
  #endedMs = -1;
  #holdMs = BAR_HOLD_MS;
  /** What the Graphics shows (its values packed in a number), so it redraws only on a change. */
  #key = -1;
  #key2 = -1;
  #shimmer = false;
  #alpha = 1;
  /** The phase shown (T708: a split boss's parts and merge flash the bar as they come). */
  #phase = 0;
  /**
   * The split's parts (T731), one cell each: their uids in split order (`#parts` of them; 0 while
   * the boss isn't split, or once it merged), the cell edges, and each cell's fill and chip (px).
   */
  #parts = 0;
  /** The split whose cells are cut (its owner's uid; 0: none yet). */
  #partsOf = 0;
  readonly #partUids: number[] = Array.from({ length: MAX_SEGMENTS }, () => 0);
  #edges: number[] = [];
  readonly #segFill: number[] = Array.from({ length: MAX_SEGMENTS }, () => 0);
  readonly #segChip: number[] = Array.from({ length: MAX_SEGMENTS }, () => 0);

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const { scene, layers } = ctx;
    this.#gfx = scene.make.graphics({}, false).setScrollFactor(0).setVisible(false);
    layers.overlay.add(this.#gfx);
    this.#label = scene.make
      .image({}, false)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setPosition(Math.round(VIEW_W / 2), BOSS_LABEL_Y)
      .setVisible(false);
    layers.overlay.add(this.#label);
  }

  /** Whether the bar shows (the smoke flow's check), and the fill it shows (px). */
  get showing(): boolean {
    return this.#gfx.visible;
  }

  get fillPx(): number {
    return this.#fill;
  }

  /** The shield strip's fill (px; −1: the boss has no strip) and the end mark (px; −1: none). */
  get shieldPx(): number {
    return this.#maxShield > 0 && this.#gfx.visible ? this.#shield : -1;
  }

  get endPx(): number {
    return this.#gfx.visible ? this.#end : -1;
  }

  /** The split's cells shown (T731; 0: one bar), for the smoke flow. */
  get segments(): number {
    return this.#gfx.visible ? this.#parts : 0;
  }

  /** A boss entered a phase after its first: the bar flashes white. */
  phase(uid: number, phase: number): void {
    if (uid === this.#uid && phase > 1) this.#flashMs = PHASE_FLASH_MS;
  }

  /**
   * A boss's ending began: the bar holds, then steps out (driven off); a `pivot` steps out at once,
   * keeping the HP it shows.
   */
  ended(uid: number, pivot = false): void {
    if (uid !== this.#uid || this.#endedMs >= 0) return;
    this.#endedMs = 0;
    this.#holdMs = pivot ? 0 : BAR_HOLD_MS;
  }

  /** One frame: finds the boss on the map, and draws its bar. */
  update(dt: number, enemies: BossPool): void {
    const boss = this.#find(enemies);
    // Gone without an ending (killed): it steps out from empty; after one, it keeps its fill.
    const gone = boss === null && this.#uid !== 0 && this.#endedMs < 0;
    if (gone) this.#endedMs = 0;
    if (boss !== null && bossBarKey(boss) !== this.#uid) this.#open(boss);
    if (this.#uid === 0) return;
    if (boss !== null && boss.splitMaxHp > 0) this.#readSplit(boss, enemies); // T708
    if (this.#endedMs >= 0) {
      this.#endedMs += dt;
      const a = barFadeAlpha(this.#endedMs, this.#holdMs);
      if (a <= 0) {
        this.#close();
        return;
      }
      if (a !== this.#alpha) {
        this.#alpha = a;
        this.#gfx.setAlpha(a);
        this.#label.setAlpha(a);
      }
    }
    const max = this.#maxHp;
    const hp = boss === null ? 0 : boss.splitMaxHp > 0 ? splitHp(enemies, boss.ownerUid) : boss.hp;
    const fill = boss !== null ? barFillPx(hp, max) : gone || this.#fill < 0 ? 0 : this.#fill;
    if (fill !== this.#fill) this.#fill = fill;
    this.#chip = chipPx(this.#chip, fill, dt);
    if (this.#parts > 0) this.#readParts(enemies, boss === null, dt);
    if (this.#flashMs > 0) this.#flashMs = Math.max(0, this.#flashMs - dt);
    if (this.#shieldFlashMs > 0) this.#shieldFlashMs = Math.max(0, this.#shieldFlashMs - dt);
    if (boss !== null && this.#maxShield > 0) this.#readShield(boss);
    const invulnerable = boss !== null && boss.invulnerableTicks > 0;
    this.#shimmer =
      invulnerable &&
      (this.#reducedMotion() || Math.floor(performance.now() / SHIMMER_MS) % 2 === 0);
    this.#draw(invulnerable);
  }

  /** Hides the bar (the scene is shutting down). */
  reset(): void {
    this.#close();
  }

  /** The live boss to show: the one shown, else the first on the map. */
  #find(enemies: BossPool): DeepReadonly<Enemy> | null {
    let first: DeepReadonly<Enemy> | null = null;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.def.boss === null) continue;
      if (bossBarKey(e) === this.#uid) return e; // T708: a split boss's parts are its bar
      first ??= e;
    }
    return first;
  }

  /**
   * The shield strip from the boss's state (SIM: `shieldHp` against `def.shield.hp`): its fill, a
   * flash as it breaks (to 0) or re-forms (back from 0), and the shards' re-form ghost.
   */
  #readShield(boss: DeepReadonly<Enemy>): void {
    const hp = boss.leaving ? this.#lastShield : boss.shieldHp;
    const last = this.#lastShield;
    if (last >= 0 && ((last > 0 && hp <= 0) || (last <= 0 && hp > 0))) {
      this.#shieldFlashMs = PHASE_FLASH_MS;
    }
    this.#lastShield = hp;
    this.#shield = shieldStripPx(hp, this.#maxShield);
    const phase = boss.def?.boss?.phases[boss.bossPhase - 1];
    const total = phase?.shards?.reformTicks ?? 0;
    this.#reform = hp > 0 ? 0 : reformPx(boss.reformTicks, total);
  }

  /**
   * A split boss (T708): the bar goes on across its parts and its merge against their summed HP
   * (`splitMaxHp`), losing the whole boss's marks, and flashes as each comes (its phase rises).
   */
  #readSplit(boss: DeepReadonly<Enemy>, enemies: BossPool): void {
    if (this.#maxHp !== boss.splitMaxHp) {
      this.#maxHp = boss.splitMaxHp;
      this.#marks = [];
      this.#end = -1;
      this.#endGlyph = null;
      this.#chip = barFillPx(splitHp(enemies, boss.ownerUid), boss.splitMaxHp); // no drain across
    }
    if (boss.splitFrom === null) {
      // The merged boss (T708) is one bar again.
      if (this.#parts > 0) {
        this.#parts = 0;
        this.#key = -1;
      }
    } else if (this.#partsOf !== boss.ownerUid) {
      // The first frame that sees the parts (the split, or a bar opened on them) cuts the cells.
      this.#partsOf = boss.ownerUid;
      this.#takeParts(boss.ownerUid, splitCount(boss.splitFrom), enemies);
    }
    if (boss.bossPhase > this.#phase) {
      if (this.#phase > 0) this.#flashMs = PHASE_FLASH_MS;
      this.#phase = boss.bossPhase;
    }
  }

  /**
   * The split's parts (T731): `count` cells (the split's), the live parts of `ownerUid` in uid
   * order (the order they split) in the first of them; a part already dead when the bar first saw
   * the split is an empty cell at the end. None past MAX_SEGMENTS (the bar stays one summed fill).
   */
  #takeParts(ownerUid: number, count: number, enemies: BossPool): void {
    this.#partUids.fill(0);
    let n = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.splitFrom === null || e.ownerUid !== ownerUid) continue;
      if (n >= MAX_SEGMENTS) {
        n = 0;
        break;
      }
      // Insertion by uid (a handful of parts): the cells keep the split's order.
      let j = n++;
      while (j > 0 && this.#partUids[j - 1]! > e.uid) {
        this.#partUids[j] = this.#partUids[j - 1]!; // j - 1 < n ≤ MAX_SEGMENTS
        j--;
      }
      this.#partUids[j] = e.uid;
    }
    const cells = Math.max(n, count);
    this.#parts = n > 0 && cells > 1 && cells <= MAX_SEGMENTS ? cells : 0;
    if (this.#parts === 0) return;
    this.#edges = segmentEdgesPx(this.#parts);
    for (let i = 0; i < this.#parts; i++) {
      this.#segFill[i] = this.#edges[i + 1]! - this.#edges[i]!; // i + 1 ≤ parts
      this.#segChip[i] = this.#segFill[i]!;
    }
    this.#key = -1;
  }

  /** Each part's cell (T731): its fill from its own HP (a split share of `#maxHp`), and its chip. */
  #readParts(enemies: BossPool, gone: boolean, dt: number): void {
    const share = this.#maxHp / this.#parts;
    for (let i = 0; i < this.#parts; i++) {
      const uid = this.#partUids[i]!; // i < parts ≤ MAX_SEGMENTS
      let hp = 0;
      if (!gone && uid !== 0) {
        for (let k = 0; k < enemies.used; k++) {
          const e = enemies.items[k]!; // k < used ≤ items.length
          if (e.alive && e.uid === uid) {
            hp = e.hp;
            break;
          }
        }
      }
      const cell = this.#edges[i + 1]! - this.#edges[i]!; // i + 1 ≤ parts
      const fill = barFillPx(hp, share, cell);
      const was = this.#segChip[i]!;
      const chip = chipPx(was, fill, dt);
      // A cell that changes redraws the bar (the change key holds the summed fill only).
      if (fill !== this.#segFill[i] || Math.round(chip) !== Math.round(was)) this.#key = -1;
      this.#segFill[i] = fill;
      this.#segChip[i] = chip;
    }
  }

  #open(boss: DeepReadonly<Enemy>): void {
    const def = boss.def!; // #find only returns bosses with a def
    this.#uid = bossBarKey(boss);
    this.#phase = boss.bossPhase;
    this.#maxHp = boss.splitMaxHp > 0 ? boss.splitMaxHp : def.hp;
    this.#marks = phaseMarksPx(def.boss?.phases ?? []);
    this.#end = endMarkPx(def.boss?.endAtPct ?? 0);
    this.#endGlyph = this.#end >= 0 ? endGlyph(def.boss?.endAtPct ?? 0) : null;
    this.#maxShield = def.shield?.hp ?? 0;
    this.#parts = 0;
    this.#partsOf = 0;
    this.#lastShield = -1;
    this.#shieldFlashMs = 0;
    this.#shield = 0;
    this.#reform = 0;
    if (this.#maxShield > 0) this.#readShield(boss);
    this.#fill = barFillPx(boss.hp, this.#maxHp);
    this.#chip = this.#fill;
    this.#flashMs = 0;
    this.#endedMs = boss.leaving ? 0 : -1;
    this.#holdMs = BAR_HOLD_MS;
    this.#key = -1;
    this.#key2 = -1;
    this.#alpha = 1;
    this.#gfx.setAlpha(1).setVisible(true);
    const text = bossLabel(def.name);
    if (canDraw(text)) {
      this.#label
        .setTexture(floatTextTexture(this.#ctx.scene, text, 'gold.4'))
        .setAlpha(1)
        .setVisible(true);
    } else {
      this.#label.setVisible(false);
    }
  }

  #close(): void {
    this.#uid = 0;
    this.#endedMs = -1;
    this.#holdMs = BAR_HOLD_MS;
    this.#fill = -1;
    this.#key = -1;
    this.#key2 = -1;
    this.#maxShield = 0;
    this.#end = -1;
    this.#parts = 0;
    this.#partsOf = 0;
    this.#gfx.clear().setVisible(false);
    this.#label.setVisible(false);
  }

  #draw(invulnerable: boolean): void {
    const chip = Math.round(this.#chip);
    const flash = this.#flashMs > 0;
    const shieldFlash = this.#shieldFlashMs > 0;
    // A cheap change key: the drawn values (ints and flags), no string building unless it changed.
    const k =
      this.#fill * 1e6 +
      chip * 1e3 +
      (flash ? 4 : 0) +
      (invulnerable ? 2 : 0) +
      (this.#shimmer ? 1 : 0);
    const k2 = this.#shield * 1e3 + this.#reform + (shieldFlash ? 0.5 : 0);
    if (k === this.#key && k2 === this.#key2) return;
    this.#key = k;
    this.#key2 = k2;
    const g = this.#gfx;
    g.clear();
    const x = BAR_X;
    const y = BOSS_BAR_Y;
    const w = BOSS_BAR_W;
    const h = BOSS_BAR_H;
    const shielded = this.#maxShield > 0;
    const bodyH = barBodyH(shielded);
    g.fillStyle(flash ? C.flash : C.frame, 1);
    g.fillRect(x - 1, y - 1, w + 2, bodyH + 2);
    g.fillStyle(C.track, 1);
    g.fillRect(x, y, w, h);
    if (this.#parts > 0) {
      this.#drawParts(x, y, h, invulnerable, flash);
    } else if (chip > this.#fill) {
      g.fillStyle(C.chip, 1);
      g.fillRect(x + this.#fill, y, chip - this.#fill, h);
    }
    if (this.#parts === 0 && this.#fill > 0) {
      const body = invulnerable ? (this.#shimmer ? C.flash : C.lit) : flash ? C.flash : C.fill;
      g.fillStyle(body, 1);
      g.fillRect(x, y, this.#fill, h);
      g.fillStyle(invulnerable || flash ? C.flash : C.lit, 1);
      g.fillRect(x, y, this.#fill, 1);
    }
    if (shielded) this.#drawShield(x, y + h + 1, w, shieldFlash);
    // Phase markers: a white tick through the HP, standing proud of it, edged in ink.
    for (const m of this.#marks) this.#tick(x + m, y, h);
    // The end mark: a tick through the whole bar (the strip too), standing on a flag under it.
    if (this.#end >= 0) {
      const mx = x + this.#end;
      const half = (END_FLAG_W - 1) / 2;
      const top = y - MARK_OVERHANG_PX;
      const foot = y + bodyH + MARK_OVERHANG_PX; // the flag's row, under the frame
      g.fillStyle(C.frame, 1);
      g.fillRect(mx - 1, top - 1, 3, foot - top + 1);
      g.fillRect(mx - half - 1, foot - 1, END_FLAG_W + 2, 3);
      g.fillStyle(C.mark, 1);
      g.fillRect(mx, top, 1, foot - top);
      g.fillRect(mx - half, foot, END_FLAG_W, 1);
      if (this.#endGlyph !== null) this.#glyph(this.#endGlyph, mx, foot + 2);
    }
  }

  /**
   * The split's cells (T731): in each, the chip then the part's fill under its lit top row; then a
   * 1 px `ink.0` gap at every inner edge, through the HP.
   */
  #drawParts(x: number, y: number, h: number, invulnerable: boolean, flash: boolean): void {
    const g = this.#gfx;
    const body = invulnerable ? (this.#shimmer ? C.flash : C.lit) : flash ? C.flash : C.fill;
    const top = invulnerable || flash ? C.flash : C.lit;
    for (let i = 0; i < this.#parts; i++) {
      const left = x + this.#edges[i]!; // i < parts < edges.length
      const fill = this.#segFill[i]!;
      const chip = Math.round(this.#segChip[i]!);
      if (chip > fill) {
        g.fillStyle(C.chip, 1);
        g.fillRect(left + fill, y, chip - fill, h);
      }
      if (fill > 0) {
        g.fillStyle(body, 1);
        g.fillRect(left, y, fill, h);
        g.fillStyle(top, 1);
        g.fillRect(left, y, fill, 1);
      }
    }
    g.fillStyle(C.frame, 1);
    for (let i = 1; i < this.#parts; i++) g.fillRect(x + this.#edges[i]!, y, 1, h); // i < edges
  }

  /** A tiny glyph (`#` lit) centred on column `mx` from row `top`: `white.1` over an `ink.0` rim. */
  #glyph(rows: readonly string[], mx: number, top: number): void {
    const g = this.#gfx;
    const left = mx - (rows[0]!.length - 1) / 2; // the glyph has rows
    for (const pass of [C.frame, C.mark]) {
      g.fillStyle(pass, 1);
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== '#') continue;
          if (pass === C.frame) g.fillRect(left + x - 1, top + y - 1, 3, 3);
          else g.fillRect(left + x, top + y, 1, 1);
        }
      });
    }
  }

  /** The shield strip at (x, y): segments up to the shield, then the re-forming ghost. */
  #drawShield(x: number, y: number, w: number, flash: boolean): void {
    const g = this.#gfx;
    g.fillStyle(C.track, 1);
    g.fillRect(x, y, w, BOSS_SHIELD_H);
    const fill = this.#shield;
    const ghost = fill > 0 ? 0 : this.#reform;
    const to = Math.max(fill, ghost);
    if (to <= 0 && !flash) return;
    g.fillStyle(flash ? C.flash : fill > 0 ? C.shield : C.reform, 1);
    if (flash) {
      g.fillRect(x, y, w, BOSS_SHIELD_H);
      return;
    }
    for (let i = 0; i < to; i += SHIELD_SEG_PERIOD) {
      let run = 0;
      while (run < SHIELD_SEG_PERIOD && i + run < to && shieldSegLit(i + run)) run++;
      if (run > 0) g.fillRect(x + i, y, run, BOSS_SHIELD_H);
    }
  }

  /** A 1 px `white.1` tick through the HP at x, standing proud of it, edged in `ink.0`. */
  #tick(mx: number, y: number, h: number): void {
    const g = this.#gfx;
    g.fillStyle(C.frame, 1);
    g.fillRect(mx - 1, y - MARK_OVERHANG_PX - 1, 3, h + 2 * MARK_OVERHANG_PX + 2);
    g.fillStyle(C.mark, 1);
    g.fillRect(mx, y - MARK_OVERHANG_PX, 1, h + 2 * MARK_OVERHANG_PX);
  }
}
