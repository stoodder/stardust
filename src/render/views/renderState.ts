// What the playfield draws now, as data (T332, T430a): BattleScene.renderState builds it from its
// views for the `__sd.render()` test hook, so smoke flows can assert render beats (a bar shown, an
// ally lowered, a hush ring up, a Revealed bracket) instead of only screenshotting them. Types only:
// the smoke specs (no DOM, no Phaser) import them through app/testHookTypes.ts.

/** One enemy's view. */
export interface EnemyRenderState {
  readonly uid: number;
  /** The anim family drawn (enemyPose.ts), or `under` for the burrow mound. */
  readonly pose: string;
  /** The body's alpha (1; a leaving unit's 60%; a cloak's shimmer). */
  readonly alpha: number;
  /** Its health bar shows. */
  readonly bar: boolean;
  /** Its tell glyph shows (its type's first 3 s, or hovered). */
  readonly tell: boolean;
  /** The rim it wears (EnemyDress.ts): none, heavy, hush, crystal, blink, or pulse. */
  readonly rim: string;
  /** Its shield bubble, a held runner's hush ring, a Revealed unit's target bracket. */
  readonly bubble: boolean;
  readonly hushRing: boolean;
  readonly bracket: boolean;
  /** A fleeing runner glancing back. */
  readonly glance: boolean;
}

/** One ally's view. */
export interface AllyRenderState {
  readonly uid: number;
  /** Its sprite, or null when its kind isn't drawn yet. */
  readonly sprite: string | null;
  /** Its weapon lowered (A1M5's Quiet Wave, allyPose.ts). */
  readonly lowered: boolean;
  /** Its @glow halo shows (T216). */
  readonly glow: boolean;
}

export interface RenderState {
  readonly enemies: readonly EnemyRenderState[];
  readonly allies: readonly AllyRenderState[];
  /** ShieldView's counts since the battle began, and the pulse tells up now. */
  readonly shields: {
    readonly ripples: number;
    readonly breaks: number;
    readonly pulseRings: number;
    readonly tells: number;
  };
  /** BlinkView's tells up now and afterimages since the battle began. */
  readonly blinks: { readonly tells: number; readonly afterimages: number };
  /** Debris pixels in flight (shards, motes, flecks). */
  readonly debris: number;
  /** The boss bar's fill (px of 160), or −1 while none shows. */
  readonly bossBar: number;
  /** Link tethers drawn. */
  readonly tethers: number;
  /**
   * SpecFx's (T407b): capacitor orbs and Flak Curtain puffs showing now, discharges and fizzles
   * since the battle began, and seekers in flight with their trails.
   */
  readonly specs: {
    readonly glows: number;
    readonly puffs: number;
    readonly discharges: number;
    readonly fizzles: number;
    readonly seekers: number;
  };
}
