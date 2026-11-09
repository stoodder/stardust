// The Act I *Pest Field Guide*: every entry the Act I maps list (docs/story/campaign/act1.md, each
// map's *Codex* line), in campaign order, with its `original` version (style-guide § 6.2: smug
// Everglow PR, bounty stars, the euphemism dictionary). This file is the home of their text; the
// docs quote it where they quote at all. The Brood Hauler's, the Elder's, and Chitterbloom's
// originals, Gerald's, Stardust's, the scarecrow's, Rig Nine's, and the Orbital Strike's small print
// are the docs' words, verbatim.
//
// An entry with a subject unlocks when the save meets it (an enemy seen, a tower or ability owned);
// one without unlocks once its map is won (`mapAtLeast`). The Act II annotations and the Act III
// corrections join these entries with their acts (D064 defers annotations to M4).
import type { CodexEntryDef } from './types.ts';

/** Every Act I entry, in codex order (by the map that introduces it). */
export const ACT1_CODEX: readonly CodexEntryDef[] = [
  // ── A1M1 · Orientation Day ────────────────────────────────────────────────────────────────
  {
    id: 'codex_nibbler',
    title: 'Nibbler',
    kind: 'enemy',
    subject: { enemy: 'nibbler' },
    versions: {
      original: {
        text:
          'The everyday garden pest! Round, fuzzy, and about the size of a head of lettuce ' +
          '(coincidence?). Nibblers arrive in clumps from the north and run south, for reasons ' +
          'that are not our department. Their chittering is non-linguistic (Survey 2346, ' +
          'Okonkwo). Handling tip: one Rivet, one squeak, one Tidybot. Bounty: ★',
      },
    },
  },
  {
    id: 'codex_zoomer',
    title: 'Zoomer',
    kind: 'enemy',
    subject: { enemy: 'zoomer' },
    versions: {
      original: {
        text:
          'A Nibbler in a hurry! Zoomers run twice as fast as other pests, and twice as fast as ' +
          'most technicians. Nobody knows what they are late for. Handling tip: upgrade your ' +
          'Rivets, then let the Rivets worry about it. Bounty: ★',
      },
    },
  },
  {
    id: 'codex_rivet',
    title: 'Rivet Autoturret',
    kind: 'tower',
    subject: { tower: 'rivet' },
    versions: {
      original: {
        text:
          "Everglow's dependable all-rounder, issued to every new hire at no charge! Fires two " +
          'rounds a second at anything on the path or above it. Self-aiming, self-cleaning, and ' +
          'it has never once asked for a raise. Tier 3 adds armor-piercing rounds. Warranty void ' +
          'if pointed at management.',
      },
    },
  },
  {
    id: 'codex_thumper',
    title: 'Thumper Mortar',
    kind: 'tower',
    subject: { tower: 'thumper' },
    versions: {
      original: {
        text:
          'For when one pest at a time is not enough! Lobs explosive shells that land where the ' +
          'pest is going, not where it was. Pairs beautifully with a Rivet (Crossfire: both fire ' +
          '10% faster). The confetti is a cosmetic effect. It does not mean the pest is ' +
          'celebrating.',
      },
    },
  },
  {
    id: 'codex_tidybot',
    title: 'Tidybot',
    kind: 'thing',
    versions: {
      original: {
        text:
          "Everglow's cheerful cleanup crew! After every wave, Tidybots vacuum the path spotless " +
          'and carry every processed pest to Reclamation Facility 2 for responsible reuse. A ' +
          'clean perimeter is a happy perimeter! Please do not pet the Tidybots. They are ' +
          'working. (The chime is trademarked.)',
        when: { mapAtLeast: 'a1_m01' },
      },
    },
  },
  {
    id: 'codex_everglow_gardens',
    title: 'Everglow Gardens',
    kind: 'place',
    sprite: { id: 'prop.dome', frame: 'v0' },
    versions: {
      original: {
        text:
          'Your new home! 340 happy colonists, rows of hydroponic domes, and the finest lettuce in ' +
          'the Kepler Fringe (Everglow Brightleaf). An Agricultural Frontier Charter colony, ' +
          'which is why we talk about lettuce so much. Pest losses: down 38%! Lettuce losses: ' +
          'please see Accounting.',
        when: { mapAtLeast: 'a1_m01' },
      },
    },
  },
  {
    id: 'codex_orbital_strike',
    title: 'Orbital Strike Uplink',
    kind: 'ability',
    subject: { ability: 'orbital_strike' },
    versions: {
      original: {
        text:
          'A gift to you from Director Sterling! Point, click, and a satellite you will never ' +
          'meet puts 200 damage on a patch of path one second later. Recharges in 45 seconds. ' +
          'Remember: the uplink is a privilege, not a right!',
        smallPrint: 'Uplink access contingent on Q2 extraction targets.',
      },
    },
  },

  // ── A1M2 · Hatching Season ────────────────────────────────────────────────────────────────
  {
    id: 'codex_chonk',
    title: 'Chonk',
    kind: 'enemy',
    subject: { enemy: 'chonk' },
    versions: {
      original: {
        text:
          'A big pest, and proud of it! Light armor plating makes early Rivets go "plink." Moves ' +
          'at a stately pace and refuses to be rushed. Handling tip: mortars. More mortars. Do ' +
          'not attempt to lift. Bounty: ★★',
      },
    },
  },
  {
    id: 'codex_brood_hauler',
    title: 'Brood Hauler',
    kind: 'enemy',
    subject: { enemy: 'hauler' },
    versions: {
      original: {
        text:
          'Big, slow, and greedy! Carries stolen stardust. High bounty! Do not inspect cargo. ' +
          'Handling tip: aim for the sack! ★★★',
      },
    },
  },
  {
    id: 'codex_sprinkler',
    title: 'Frostline Sprinkler',
    kind: 'tower',
    subject: { tower: 'sprinkler' },
    versions: {
      original: {
        text:
          'Keeps the lettuce crisp and the pests chilly! A fine mist slows anything it touches, ' +
          'so your mortars can take their time. Pairs with a Thumper (Sitting Ducks: +20% damage ' +
          'against Chilled pests). Originally an irrigation unit. Still is, technically. Please ' +
          'do not mention this to the KFA.',
      },
    },
  },
  {
    id: 'codex_bounty_board',
    title: 'Pest Bounty Board',
    kind: 'thing',
    versions: {
      original: {
        text:
          'Friendly competition makes a happy perimeter! Every pest you process scores points on ' +
          "the quarter's leaderboard. Current leader: K. Vandermeer, three quarters running. " +
          'Prizes are morale-based. Ties are settled by Kip.',
        when: { mapAtLeast: 'a1_m02' },
      },
    },
  },
  {
    id: 'codex_stardust',
    title: 'Stardust',
    kind: 'thing',
    versions: {
      original: {
        text:
          "Everglow's premium mineral! Responsibly sourced! Glitters pink-gold in the seam (and " +
          'a lovely violet after processing). Powers half the cells in human space, and the ' +
          'finest grades become luxury glitter. Where does it come from? The ground, mostly! ' +
          'Further questions: Reclamation.',
        when: { mapAtLeast: 'a1_m02' },
      },
    },
  },
  {
    id: 'codex_rig_3',
    title: 'Extraction Rig 3',
    kind: 'place',
    sprite: { id: 'prop.rig', frame: 'v0' },
    versions: {
      original: {
        text:
          "One of nine proud rigs in the Diggings, bringing up Tumble IV's riches! Rig 3 is our " +
          'friendliest: shallow, quiet, and right beside the housing block. A suggested build ' +
          'site! The rigs get deeper as the numbers go up. Rig Nine is the deepest. We are very ' +
          'proud of Rig Nine.',
        when: { mapAtLeast: 'a1_m02' },
      },
    },
  },
  {
    id: 'codex_scarecrow',
    title: 'The Terrace 2 Scarecrow',
    kind: 'person',
    sprite: { id: 'prop.scarecrow', frame: 'v0' },
    versions: {
      original: {
        text:
          'Employee of the Month, 144 months running! Never late, never sick, and has never ' +
          'filed a grievance. He has stood watch over Terrace 2 since 2349, through every season ' +
          'and every pest. Everglow thanks him for his service. His badge is laminated.',
        when: { mapAtLeast: 'a1_m02' },
      },
    },
  },

  // ── A1M3 · Special Delivery ───────────────────────────────────────────────────────────────
  {
    id: 'codex_puffwing',
    title: 'Puffwing',
    kind: 'enemy',
    subject: { enemy: 'puffwing' },
    versions: {
      original: {
        text:
          'A fluffy pest that glides right over your defenses! Puffwings ride the air lane, so ' +
          'ground turrets can only wave at them. Handling tip: Skyhook flak, or a Rivet that ' +
          'looks up. Cuteness is not a defensive trait. Bounty: ★',
      },
    },
  },
  {
    id: 'codex_skyhook',
    title: 'Skyhook Flak Battery',
    kind: 'tower',
    subject: { tower: 'skyhook' },
    versions: {
      original: {
        text:
          'Clear skies, guaranteed! The Skyhook fills the air lane with bursting flak that ' +
          'catches whole flocks at once. Ground pests are beneath its notice, literally. Issued ' +
          'at no charge to approved technicians. That is you. Congratulations!',
      },
    },
  },
  {
    id: 'codex_gerald',
    title: 'Gerald',
    kind: 'person',
    subject: { enemy: 'gerald' },
    versions: {
      original: {
        text:
          'Everglow Postal Drone G-1, on a route older than the perimeter. Gerald is the mail. ' +
          'Gerald has right of way. Do not target. Do not reroute without Form 88-B. Gerald has ' +
          'never missed a delivery. Several deliveries have missed Gerald. Bounty: none. Please ' +
          'stop checking.',
      },
    },
  },
  {
    id: 'codex_form_88b',
    title: 'Form 88-B',
    kind: 'thing',
    versions: {
      original: {
        text:
          'Request to Reroute a Postal Drone. Complete in triplicate and deliver by mail. Mail is ' +
          'delivered by Gerald. Gerald may not be rerouted without Form 88-B. Processing time: ' +
          'pending. Form 88-B is also used to report mail-drone incidents, and for nothing else, ' +
          'ever.',
        when: { mapAtLeast: 'a1_m03' },
      },
    },
  },
  {
    id: 'codex_zibzab',
    title: 'Zibzab',
    kind: 'person',
    sprite: { id: 'portrait.zibzab', frame: 'neutral' },
    versions: {
      original: {
        text:
          'Licensed vendor of Genuine Pre-Owned Defensive Solutions. Everglow welcomes all ' +
          'independent contractors! Zibzab trades in stardust, sells to anyone, and states the ' +
          'price first, which Legal finds unsettling. Please do not ask Zibzab where stardust ' +
          'comes from. He will tell you.',
        when: { mapAtLeast: 'a1_m03' },
      },
    },
  },
  {
    id: 'codex_vrell',
    title: 'Vrell',
    kind: 'person',
    versions: {
      original: {
        text:
          'A trading people found on every frontier, famous for their big shells and short ' +
          'negotiations. A Vrell never lies (they keep a "Fair Ledger") and never fights (bad for ' +
          'repeat business). They say the price before the product. Everglow prefers to say it ' +
          'after. Valued vendors!',
        when: { mapAtLeast: 'a1_m03' },
      },
    },
  },
  {
    id: 'codex_hold_fire',
    title: 'Hold Fire',
    kind: 'ability',
    versions: {
      original: {
        text:
          'Every turret has a switch that tells it to stop shooting (H for one, Shift+H for all). ' +
          'Use it for Gerald. A turret that is not firing is not processing, so please keep it ' +
          'brief! Hold Fire is always available, per regulation, though we cannot think why you ' +
          'would need it for anything else.',
        when: { mapAtLeast: 'a1_m03' },
      },
    },
  },

  // ── A1M4 · The Audit ──────────────────────────────────────────────────────────────────────
  {
    id: 'codex_elder',
    title: 'Elder',
    kind: 'enemy',
    subject: { enemy: 'elder' },
    versions: {
      original: {
        text:
          'Slow, old, and in the way. Slows the whole swarm! Clear it first for efficiency! ' +
          '(Vocalizations non-linguistic per Survey 2346, Okonkwo.)',
      },
    },
  },
  {
    id: 'codex_bunchling',
    title: 'Bunchling',
    kind: 'enemy',
    subject: { enemy: 'bunchling' },
    versions: {
      original: {
        text:
          'Three Nibblers for the price of one! Process a Bunchling and it pops into three ' +
          'smaller pests, which is either a bargain or a problem. Handling tip: splash damage, ' +
          'then more splash damage. Science does not know how they all fit in there. Science ' +
          'has stopped asking. Bounty: ★',
      },
    },
  },
  {
    id: 'codex_zapcoil',
    title: 'Zapcoil',
    kind: 'tower',
    subject: { tower: 'zapcoil' },
    versions: {
      original: {
        text:
          'A Vrell-licensed coil that arcs from pest to pest! Sold by Zibzab, who says it is ten ' +
          'percent better than new. Pairs with a Sprinkler (Conductive: +2 chain jumps). Not an ' +
          'Everglow product: Everglow accepts no responsibility, and Zibzab accepts no refunds.',
      },
    },
  },
  {
    id: 'codex_admin_plaza',
    title: 'Admin Plaza',
    kind: 'place',
    sprite: { id: 'prop.housing', frame: 'v0' },
    versions: {
      original: {
        text:
          'The beating heart of Everglow Gardens! Offices, a fountain, and three giant ' +
          'billboards of Evie, all made possible by your hard work. Audits are held at the ' +
          'podium. The billboards are always watching. (That is a joke! They are billboards.)',
        when: { mapAtLeast: 'a1_m04' },
      },
    },
  },
  {
    id: 'codex_evie',
    title: 'Evie',
    kind: 'person',
    sprite: { id: 'prop.billboard', frame: 'beaming' },
    versions: {
      original: {
        text:
          "Everglow's smiling sun! Evie beams down from every billboard to remind you that it is " +
          'always a bright day at Everglow. Evie never sets. (Tumble IV also has a regular sun, ' +
          'which sets every 38 days or so. Evie does not recommend getting attached to it.)',
        when: { mapAtLeast: 'a1_m04' },
      },
    },
  },
  {
    id: 'codex_prim',
    title: 'Compliance Officer Prim',
    kind: 'person',
    sprite: { id: 'portrait.prim', frame: 'neutral' },
    versions: {
      original: {
        text:
          'Auditor model, clipboard standard. Prim measures everything so you do not have to: ' +
          'accurate to 0.1 meters, 0.1 seconds, and 1% of mandated sincerity. Prim is not a ' +
          'pest. Prim is not quite a person. Prim is an audit. Please continue working.',
        when: { mapAtLeast: 'a1_m04' },
      },
    },
  },
  {
    id: 'codex_smile_audit',
    title: 'The Smile Audit',
    kind: 'thing',
    versions: {
      original: {
        text:
          'A routine check that every technician is radiating the Everglow spirit! Sincerity is ' +
          'measured at the mouth and at the eyes, separately. Passing score: 75%. Average ' +
          'score: 61%. Nobody has ever failed: scores under 75% are filed as "pending."',
        when: { mapAtLeast: 'a1_m04' },
      },
    },
  },

  // ── A1M5 · Record Quarter ─────────────────────────────────────────────────────────────────
  {
    id: 'codex_digger',
    title: 'Digger',
    kind: 'enemy',
    subject: { enemy: 'digger' },
    versions: {
      original: {
        text:
          'A pest with a shovel where its manners should be! Every few seconds a Digger burrows ' +
          'under the path and pops up further along, out of reach. Watch for the dirt spray. ' +
          'Handling tip: patience, then a Thumper. Not a hard problem. A soft, furry one. ' +
          'Bounty: ★★',
      },
    },
  },
  {
    id: 'codex_chitterbloom',
    title: 'Matriarch Chitterbloom',
    kind: 'enemy',
    subject: { enemy: 'chitterbloom' },
    versions: {
      original: { text: 'Codename CHITTERBLOOM. Big! Grumpy! Lays pests! ★★★★★' },
    },
  },
  {
    id: 'codex_northern_gate',
    title: 'Northern Gate',
    kind: 'place',
    sprite: { id: 'prop.core', frame: 'idle_0' },
    versions: {
      original: {
        text:
          'Where the Spires road and the warren track meet the colony! Two roads, one gate, zero ' +
          'pests: that is the target. Home of the Quarterly Results party (bunting by ' +
          'Facilities). The old survey maps mark a road here long before the gate. Everglow has ' +
          'since improved it.',
        when: { mapAtLeast: 'a1_m05' },
      },
    },
  },
  {
    id: 'codex_rig_nine',
    title: 'Rig Nine',
    kind: 'place',
    sprite: { id: 'prop.rig', frame: 'v0' },
    versions: {
      original: { text: 'Status: answering.', when: { mapAtLeast: 'a1_m05' } },
    },
  },
];
