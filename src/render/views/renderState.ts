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
  /** The tell glyph it wears (`icon.tell.<tell>`: a runner's is `icon.tell.skittish`), or null. */
  readonly glyph: string | null;
  /** The rim it wears (EnemyDress.ts): none, heavy, hush, crystal, blink, or pulse. */
  readonly rim: string;
  /** Its shield bubble, a held runner's hush ring, a Revealed unit's target bracket. */
  readonly bubble: boolean;
  readonly hushRing: boolean;
  readonly bracket: boolean;
  /** A fleeing runner glancing back. */
  readonly glance: boolean;
  /** A flyer drawn faint over a spot kept clear (the armed rock; T501i). */
  readonly overClear: boolean;
}

/** The light as drawn (LightingView `look`, D135). */
export interface LightingLook {
  /** The grade's color (white: none shows). */
  readonly grade: number;
  /** The grade is the last thing in the ground layer (nothing on the ground draws over it). */
  readonly gradeOnTop: boolean;
  /** Scenery in `world`, how many of it are tinted, and how many of those are Sprites. */
  readonly scenery: number;
  readonly tinted: number;
  readonly tintedSprites: number;
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
  /**
   * ShieldView's counts since the battle began, the pulse tells up now, and the shield-aura rings
   * up now and the units glinting as the aura refills them (ShieldAuraView, T502, T530a).
   */
  readonly shields: {
    readonly ripples: number;
    readonly breaks: number;
    readonly pulseRings: number;
    readonly tells: number;
    readonly auras: number;
    readonly glints: number;
  };
  /** Wards kneeling now (T506, WardView), and the first one's body alpha (its fade-in; T530a). */
  readonly wards: number;
  readonly wardAlpha: number;
  /** BlinkView's tells up now and afterimages since the battle began. */
  readonly blinks: { readonly tells: number; readonly afterimages: number };
  /** PhaseView's rings up now (telling, Phased) and units seen phasing in since the battle began. */
  readonly phases: {
    readonly tells: number;
    readonly phased: number;
    readonly phasedIn: number;
    /** Units seen coming back solid (their white pop; T530a). */
    readonly phasedOut: number;
  };
  /** Refugees drawn now (on the field), and those frozen in a hush (T305c, RefugeeView). */
  readonly refugees: { readonly shown: number; readonly held: number };
  /** Pinned units roped to a stake now, and Skewer lines drawn so far (T408, HarpoonView). */
  readonly harpoon: { readonly pins: number; readonly skewered: number };
  /**
   * Beams drawn now, the brightest ramp step among them (−1: none; T504), the knots burning at
   * their ends now, and the threads thrown since the battle began (T530a; BeamView).
   */
  readonly beams: {
    readonly drawn: number;
    readonly topStep: number;
    readonly knots: number;
    readonly throws: number;
  };
  /**
   * Unnerved squiggles up now, and Echo Spike bursts and Stillness casts seen since the battle
   * began (T507, MindView).
   */
  readonly mind: { readonly unnerved: number; readonly echoes: number; readonly stills: number };
  /** Marked units wearing an eye now, and those of them under Truthlight (T508, MarkView). */
  readonly marks: { readonly marked: number; readonly truth: number };
  /** Debris pixels in flight (shards, motes, flecks). */
  readonly debris: number;
  /** The boss bar's fill (px of 160), or −1 while none shows. */
  readonly bossBar: number;
  /**
   * The boss bar's shield strip fill (px of 160; −1: none shows, or the boss has no shield) and
   * its end mark (px; −1: none), where the Penitent kneels (review R6).
   */
  readonly bossShield: number;
  readonly bossEnd: number;
  /** Link tethers drawn. */
  readonly tethers: number;
  /** Bricks's name-tag plate (T431): the tower it sits over and its text as drawn, or null. */
  readonly nameTag: { readonly uid: number; readonly text: string } | null;
  /** "Incoming" flags standing on the next wave's spawns (T326). */
  readonly spawnFlags: number;
  /**
   * Spots kept clear of floaters, the name plate and enemies' health bars and tell glyphs now
   * (D134 K2, D135: armed clickables, a lift).
   */
  readonly keepClear: number;
  /** The Peeker's rock sorts raised over the walkers round it (held or lifting, D135). */
  readonly peekerRaised: boolean;
  /**
   * The lighting grade (LightingView, D135): its color (white: none), whether it's the last thing
   * on the ground, and the world's scenery, how much of it is tinted, and how many of those are
   * Sprites (decor and wreckage props, rigs, cue props, the Peeker's rock).
   */
  readonly lighting: LightingLook;
  /**
   * Sundown's overlay (DarknessView, T505): the darkness it draws (the sim's `state.dark`; 0
   * without one), the light sources punched out of it, and whether the range ring shows dimmed
   * (its tower, or the ghost's tile, in the dark).
   */
  readonly darkness: {
    readonly dark: number;
    readonly lights: number;
    readonly ringDimmed: boolean;
    /**
     * The night's tones drawn now (T530b, vfx/darknessPixels.ts; 0xRRGGBB): the world's whole
     * multiply (the ground, the sky, the scenery out of the light) and the actors' veil.
     */
    readonly world: number;
    readonly veil: number;
    /** Scenery in `world` standing in the light now, and out of it (both 0 without darkness). */
    readonly litScenery: number;
    readonly darkScenery: number;
  };
  /**
   * The world's glow (WorldGlowView, T530b): props wearing their glow, pools of light in lit discs,
   * Prism crystals glowing, and whether the moons are lit over the night sky; and the ghosts of
   * light (LightGhostView, review R9): resting Prisms showing their disc's ghost, and whether the
   * armed Prism's placement preview shows its own.
   */
  readonly glow: {
    readonly props: number;
    readonly pools: number;
    readonly crystals: number;
    readonly moons: boolean;
    readonly ghosts: number;
    readonly ghostPreview: boolean;
  };
  /** Floating numbers and callouts up now. */
  readonly floats: number;
  /** Scanner Sweep's aim preview shows (T431: its own circle, not the strike's reticle). */
  readonly sweepAim: boolean;
  /** Stillness's aim preview shows (T531: its own blue circle, not the strike's reticle). */
  readonly stillAim: boolean;
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
  /**
   * The Tidybots (T410b): drones in the air now, stardust specks lying on the field, and sweeps
   * since the battle began (none on a map whose `tidybots` dial is off).
   */
  readonly tidybots: {
    readonly flying: number;
    readonly specks: number;
    readonly sweeps: number;
    /** Drones that have unloaded at the plant's hopper (A2M4's `unloading` dial; T530b). */
    readonly unloads: number;
    /** Each drone in the air: where (grid) and what it's doing (fly, vacuum, chime, unload). */
    readonly drones: readonly { readonly x: number; readonly y: number; readonly phase: string }[];
  };
}
