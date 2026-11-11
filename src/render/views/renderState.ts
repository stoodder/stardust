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
  /** A Phased ghost's white rim outside its silhouette (review U10). */
  readonly ghostRim: boolean;
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
    /** Shed sparks thrown from a boss to its shards (D139 S4). */
    readonly sheds: number;
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
  /**
   * EverglowView (T603): haste rings up now, hasted units trailing speed lines now, shutdowns
   * playing now, and shutdowns played since the battle began.
   */
  readonly everglow: {
    readonly rings: number;
    readonly lines: number;
    readonly shutdowns: number;
    readonly shutdownsPlayed: number;
  };
  /**
   * HealAuraView (T703): healer rings and their pulses up now, units wearing the ✚ (being mended)
   * now, and C4 Purge's open panels shown now.
   */
  readonly heal: {
    readonly rings: number;
    readonly pulses: number;
    readonly pluses: number;
    readonly panels: number;
  };
  /** PhaseView's rings up now (telling, Phased) and units seen phasing in since the battle began. */
  readonly phases: {
    readonly tells: number;
    readonly phased: number;
    readonly phasedIn: number;
    /** Units seen coming back solid (their white pop; T530a). */
    readonly phasedOut: number;
  };
  /**
   * BlockerView (T605): blocker bars drawn now (Bricks at the Gap), the units drawn as held now,
   * the health the bar shows (NaN with none), and whether his x-ray shows over a tower in
   * front of him (review R3).
   */
  readonly blocker: {
    readonly shown: number;
    readonly holding: number;
    readonly health: number;
    readonly xray: boolean;
  };
  /** T606: LICENSE REVOKED stamps up now, and played this battle (RevokedView). */
  readonly revoked: { readonly shown: number; readonly played: number };
  /** Towers drawn jailbroken (T740b: their class in the save's `unlocks.jailbroken`). */
  readonly jailbroken: number;
  /**
   * ChoirView (T607): Hum Choir song rings and Lullaby rings drawn now, notes over Choirs, and
   * Lulled units wearing their note.
   */
  readonly choir: {
    readonly rings: number;
    readonly lullRings: number;
    readonly notes: number;
    readonly lulled: number;
  };
  /** BloomView (T608): Stasis Bloom fields drawn now, and those flashing for a pulse now. */
  readonly bloom: { readonly fields: number; readonly flashing: number };
  /**
   * JamView (T702): Silencer tendrils drawn now and Jammed towers showing their static now; tells
   * and jams seen, and System Reboots played, since the battle began.
   */
  readonly jams: {
    readonly tells: number;
    readonly jammed: number;
    /** System Reboot's power-on columns showing now (T730a). */
    readonly columns: number;
    /** Towers drawn in their steel `+jammed` variant now (T730a). */
    readonly drawnJammed: number;
    readonly tellsSeen: number;
    readonly jamsSeen: number;
    readonly reboots: number;
  };
  /**
   * JamRingView and TakeoverView (T707): Auditor rings drawn now and seen since the battle began;
   * Hostile Takeover lasers and hangar doors drawn now, lasers seen, and jettisons played; the
   * jettison's plates on their opened tiles, in the air or down (PlatformSiteView, T730b).
   */
  readonly everglowJams: {
    readonly rings: number;
    readonly ringsSeen: number;
    readonly lasers: number;
    readonly doors: number;
    readonly plates: number;
    readonly lasersSeen: number;
    readonly jettisons: number;
  };
  /**
   * GatheringMawView (T708): the Gathering Maw's parts on the field now, the tethers drawn between
   * them (and how many pulled taut in the merge's tell), split and merge bursts under way, and the
   * splits and merges seen since the battle began. The one boss bar's fill is `bossBar`.
   */
  readonly gmaw: {
    readonly parts: number;
    readonly tethers: number;
    readonly taut: number;
    readonly bursts: number;
    readonly splitsSeen: number;
    readonly mergesSeen: number;
  };
  /** Big Glorp's puddles showing now, and seen since the battle began (T705). */
  readonly gloop: {
    readonly puddles: number;
    readonly spawned: number;
    /** Green splats played since the battle began (T730a). */
    readonly splats: number;
  };
  /**
   * LeaperView (T704): the Sproing Pad's leapers in the air now and grounded flyers marked now,
   * and bonks and groundings seen since the battle began.
   */
  readonly sproing: {
    readonly out: number;
    readonly grounded: number;
    readonly bonks: number;
    readonly groundings: number;
    /** Sproing Pads showing their empty pad, all their leapers away (T730a). */
    readonly padsEmpty: number;
  };
  /**
   * HollowView (T602): Maw tendril tells up now and seen since the battle began, Maws wearing a
   * growth ring, ripples drawn behind burrowed Hollow units; and each rift lane's status as its
   * crack is drawn (RiftView, T630b).
   */
  readonly hollow: {
    readonly tells: number;
    readonly tellsSeen: number;
    readonly grown: number;
    readonly ripples: number;
    readonly rifts: readonly ('closed' | 'opening' | 'open')[];
  };
  /**
   * Act III's world (T630b): the rift cracks' `tile.rift` halves drawn and those open now
   * (RiftView); Sterling's shuttle, whether it has left its pad and is climbing now (ShuttleView);
   * and each blast door's marker and frame, and the SEAL's phase (BlastDoorView); M7's `site` and
   * `domes` below. The Long
   * Night's moons are `glow.moons` (vfx/nightGlow.ts).
   */
  readonly world: {
    readonly cracks: number;
    readonly openCracks: number;
    readonly shuttle: { readonly left: boolean; readonly lifting: boolean };
    readonly doors: readonly { readonly marker: string; readonly frame: string }[];
    readonly seal: 'none' | 'closing' | 'sealed';
    /**
     * M7's (T730b): the jettison's plates on opened tiles and those down, and the hangar's frame
     * ('none' without one) (PlatformSiteView); Dome 1's frame ('none' without one), refugees
     * turning in at its door now and since the battle began, and the apron's domes opened on the
     * win (DomeRowView).
     */
    readonly site: { readonly plates: number; readonly landed: number; readonly hangar: string };
    readonly domes: {
      readonly dome: string;
      readonly turningIn: number;
      readonly turnedIn: number;
      readonly opened: number;
    };
  };
  /**
   * The Scuttle Den and Underfoot (T604): swarmlings drawn dashing or running home now and latched
   * now (SwarmView), Underfoot's traps showing now and the springs seen since the battle began
   * (TrapView).
   */
  readonly swarm: {
    readonly out: number;
    readonly latched: number;
    readonly traps: number;
    readonly sprung: number;
  };
  /** Refugees drawn now (on the field), and those frozen in a hush (T305c, RefugeeView). */
  readonly refugees: { readonly shown: number; readonly held: number };
  /**
   * BearerViews (T706): bearers drawn now, those frozen in a hush, and those wearing their burden;
   * militia posts drawn now, and their shots (tracers) since the battle began.
   */
  readonly bearers: {
    readonly shown: number;
    readonly held: number;
    readonly burdens: number;
    readonly militia: number;
    readonly shots: number;
  };
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
  /** Underfoot's ghost snare: the path tile it lies on (column −1: none; T631). */
  readonly trapAim?: { readonly col: number; readonly row: number };
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
