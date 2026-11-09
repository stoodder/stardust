// The catalog's item copy: one in-voice line per item, at most 100 characters. This file is the
// text's home; story/style-guide.md § 6.3 (Zibzab) and § 6.4 (QUILL) hold the rules.
//
// - Zibzab sells the shop's global upgrades, tune-ups, and Field Protocols. His lines are "price
//   first": the cost (the first rank's, then how it climbs), the pitch, the honest correction. He
//   never says "free" and never says "friend" (that word is A3M6's).
// - QUILL runs R&D Command: bright and precise, with "(Per policy.)" on a directive-driven line.
// - The base shows this copy from Act I to the finale, so no line uses an exclamation point
//   (style-guide § 2's Act III budget) and none says a protected word early (§ 3).

/**
 * Each catalog item's copy, by item id (UpgradeId or ProtocolId; a Vrell license is
 * `license_<tower>`, from access.ts's `how: 'license'` rows).
 */
export const ITEM_COPY: Readonly<Record<string, string>> = {
  // Zibzab: Vrell tower licenses (access.ts). The Zapcoil sample's line is act1.md's (A1M3, *Base*).
  license_zapcoil: "Price first: your next visit. First one's on me. Zibzab is patient.",

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
  protocol_slots:
    "One more Field Protocol slot. Protocols are policies you get to choose. I'd like to try that.",
};

/** Item `id`'s copy, or null when it has none (copy.test.ts proves every catalog item has one). */
export function itemCopy(id: string): string | null {
  return Object.hasOwn(ITEM_COPY, id) ? (ITEM_COPY[id] ?? null) : null;
}
