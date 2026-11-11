// The catalog's item copy: one in-voice line per item, at most 100 characters. This file is the
// text's home; story/style-guide.md § 6.3 (Zibzab), § 6.4 (QUILL), and § 6.5 (Ves'thara) hold the
// rules.
//
// - Zibzab sells the shop's global upgrades, tune-ups, and Field Protocols. His lines are "price
//   first": the cost (the first rank's, then how it climbs), the pitch, the honest correction. He
//   never says "free" and never says "friend" (that word is A3M6's).
// - QUILL runs R&D Command: bright and precise, with "(Per policy.)" on a directive-driven line.
// - Ves'thara runs Xenotech (the Aelari attunements, after A2M5; her gift's row too): spare and
//   grave, formal, no contractions, images of light, glass, and memory; she never names a price
//   (the shelf does) and takes no stardust, which is why the Aelari tune-ups are Zibzab's.
// - The base shows this copy from Act I to the finale, so no line uses an exclamation point
//   (style-guide § 2's Act III budget) and none says a protected word early (§ 3). An item that
//   names an ally the player hasn't met is kept off the shelf until it's stocked (meta/purchase.ts
//   `shelf`), so its line can speak from after that map: the Aelari tune-ups from A2M5 on.

/**
 * Each catalog item's copy, by item id (UpgradeId or ProtocolId; a Vrell license is
 * `license_<tower>`, from access.ts's `how: 'license'` rows; an attunement `attune_<tower>`, from
 * its `how: 'attune'` rows, and an Aelari gift `gift_<tower>`, from its `how: 'gift'` row).
 */
export const ITEM_COPY: Readonly<Record<string, string>> = {
  // Zibzab: Vrell tower licenses (access.ts). The Zapcoil sample's line is act1.md's (A1M3, *Base*).
  license_zapcoil: "Price first: your next visit. First one's on me. Zibzab is patient.",
  // M4's licenses (T400a; on the shelf since their towers play: T406 Lookout, T408 the others).
  license_lookout:
    'Price first: 150 stardust. A shack with a view. It spots what hides. The view is used. Still works.',
  license_harpoon:
    'Price first: 250 stardust. For rig security, the brochure says. It goes through armor. Rigs too.',
  license_crane:
    'Price first: 200 stardust. A crane that earns while it stands there. Like me. Mostly like me.',

  // Zibzab: global upgrades (shop.ts).
  reinforced_core:
    'Price first: 120 stardust, then 200, then 300. Your core takes one more hit. Not a big hit. One.',
  seed_money:
    'Price first: 80 stardust, and it goes up. Four percent more credits every shift. Honestly, four.',
  salvage_rights:
    'Price first: 60 stardust, then 120. More salvage from every wreck. Wrecks not included.',
  resale_value:
    'Price first: 100 stardust, then 200. Your turrets sell back for more. Not to me. No refunds.',
  ability_coolant:
    "Price first: 100 stardust, rising. Abilities recharge five percent faster. It's soup. Good soup.",
  bounty_hunter:
    "Price first: 150 stardust, then 250. More bounty per 'pest.' Everglow's word. Mine is 'customer.'",

  // Zibzab: tower tune-ups (tuneUps.ts).
  tune_rivet:
    "Price first: 40 stardust, rising. Tuning voids your Rivet's warranty. Your Rivet has no warranty.",
  tune_thumper:
    'Price first: 40 stardust, rising. Harder hits, cheaper tiers, longer reach. In that order.',
  tune_sprinkler:
    'Price first: 40 stardust, rising. A better Sprinkler. Same water. Zibzab does not sell water. Yet.',
  tune_skyhook:
    "Price first: 40 stardust, rising. Everglow flak, Vrell tuning. Don't tell Everglow. Or the flak.",
  tune_zapcoil:
    'Price first: 40 stardust, rising. My own coil, tuned by me. I charged myself. I paid. Honestly.',
  tune_lookout:
    'Price first: 40 stardust, rising. Stronger nudge, cheaper shack, wider eyes. Same view. Nicer.',
  tune_harpoon:
    'Price first: 40 stardust, rising. Sharper tip, cheaper winch, longer rope. The rope is mostly rope.',
  tune_crane:
    'Price first: 40 stardust, rising. More per shift, cheaper parts, a longer arm. My cut is small.',
  // The Aelari tune-ups (T509): Zibzab's, since Ves'thara takes no stardust. Shown from A2M5 on.
  tune_prism:
    'Price first: 40 stardust, rising. She takes no stardust. I do. So I tune her glass. She watches.',
  tune_mindspike:
    'Price first: 40 stardust, rising. It hums in my teeth. I tuned it anyway. Teeth are fine.',
  tune_lantern:
    'Price first: 40 stardust, rising. Rank three, it sees further. It looked at me. All of me.',
  // The Skitterkin tune-ups (T604, T607): Zibzab's too. Listed once each gift is given (the Den in
  // A3M1's briefing; the Hum Choir at A3M1's debrief or in A3M4), so they speak from Act III.
  tune_burrow:
    'Price first: 40 stardust, rising. Sharper bites, cheaper burrows, a wider yard. They tip in moss.',
  tune_choir:
    'Price first: 40 stardust, rising. Louder, cheaper, wider. I tuned the song. They tuned it back.',
  // The Stasis Bloom's (T608): listed once its attunement is stocked, after A3M1.
  tune_bloom:
    'Price first: 40 stardust, rising. Colder garden, cheaper seeds, a wider bed. I stood in it. Once.',
  // The Gloop Spitter's (T705): listed once the Gloop is given (A3M4 warren, A3M6 convoy).
  tune_gloop:
    'Price first: 40 stardust, rising. Stickier spit, cheaper slop, a longer lob. It drools. Not on me.',
  // The Sproing Pad's (T704; T709 reviews it): listed once the pad is given (A3M5's briefing).
  tune_sproing:
    'Price first: 40 stardust, rising. Harder bonk, cheaper pad, a longer boing. It bonked me. Twice.',
  // Granted, never sold: C2 Sell's (progression.md § 2.1; T510).
  tune_zibzab: 'Ten percent. Honestly, eight.',

  // Zibzab: Field Protocols (protocols.ts).
  head_start:
    'Price first: 100 stardust. Ten percent more credits at clock-in. Fair? No. Fair is another shop.',
  rapid_deploy:
    "Price first: 120 stardust. Your first turret each shift is on the house. My house. It's the shell.",
  emergency_bulkhead:
    "Price first: 150 stardust. Absorbs the first five integrity lost to leaks. Then it's just a door.",
  salvage_expert:
    'Price first: 100 stardust. Wreckage clears twice as fast. Pre-owned is a lifestyle.',
  linked_up:
    'Price first: 200 stardust. Linked turrets get half again the bonus. They like each other more.',
  specialist:
    'Price first: 150 stardust. Pick a favorite. Its tier 4 costs a quarter less. The others will cope.',
  early_bird:
    'Price first: 120 stardust. Call a wave early, get half again the bonus. Impatience, finally paid.',
  high_ground_training:
    "Price first: 150 stardust. Turrets up high reach further. It's a course. I wrote it. One page.",
  bounty_board:
    'Price first: 150 stardust. Ten percent more bounty per kill. Kip bought one. He calls it talent.',
  ready_room:
    'Price first: 180 stardust. One recharge skipped per ability, in wave one. The room is a closet.',

  // QUILL: R&D Command (rnd.ts).
  orbital_strike_mk2:
    'Mk II widens the Orbital Strike from radius 1.5 to 2.0. Uplink access is a privilege. (Per policy.)',
  rapport_bricks:
    "Suppressing Fire recharges 15% faster. Sergeant Okonkwo says he doesn't do rapport. Logged: maybe.",
  rapport_quill:
    'Time Dilation recharges 15% faster. Nobody has filed rapport with me before. I made a folder.',
  rapport_vesthara:
    'Stillness recharges 15% faster. She calls me the Machine. I have filed that under rapport.',
  // Bramble speaks through Ves'thara ("She says: ..."); QUILL has corrected her file (T609b).
  rapport_bramble:
    "Underfoot recharges 15% faster. Refiled: Bramble, not 'Chitterbloom.' She says rapport is earned.",
  protocol_slots:
    "One more Field Protocol slot. Protocols are policies you get to choose. I'd like to try that.",
  // QUILL: R&D Command's Technician abilities (access.ts `how: 'rnd'`; the id is `ability_<id>`).
  ability_scanner_sweep:
    'A 4-tile sweep reveals cloaked contacts for 10 s. Recharges in 30. I like seeing everyone.',

  // Ves'thara: Xenotech (access.ts `how: 'attune'`, and her gift's row; T509).
  gift_prism: 'I made it to break your rigs. Now it holds a light for you. Keep it lit.',
  attune_mindspike:
    'A thought, made sharp. It strikes the mind, not the shell. What has no mind, it barely touches.',
  // The Lantern earns its place where things hide (Act III's cloaks) or dig (Truthlight holds A3M3's
  // Undertows), so her line says when to bring it (T568). It holds in every act.
  attune_lantern:
    'The Watch kept this light for what hides. Its truest light holds what digs. Bring it when they do.',
  // The Stasis Bloom (T608): its field slows (the chill), then stops (the Stasis pulse).
  attune_bloom:
    'A garden of still glass. In it, time slows, then stops. What walks in waits, as memories wait.',
};

/** Item `id`'s copy, or null when it has none (copy.test.ts proves every catalog item has one). */
export function itemCopy(id: string): string | null {
  return Object.hasOwn(ITEM_COPY, id) ? (ITEM_COPY[id] ?? null) : null;
}
