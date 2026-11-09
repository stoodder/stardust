// Field Protocols (design/progression.md § 5): unlocked once with Stardust in Zibzab's shop, which
// opens after A1M3, and equipped before a map (slot 1 with the shop; slots 2 and 3 in R&D). The
// picker is M3 (D031); the sim applies Head Start, Emergency Bulkhead, and Linked Up first (the
// full-catalog check equips those three; design/progression.md § 10).
import { defineProtocol } from './define.ts';

const SHOP_OPENS = 'a1_m03';

export const head_start = defineProtocol({
  id: 'head_start',
  name: 'Head Start',
  copy: null,
  currency: 'stardust',
  price: 100,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'economy', stat: 'startCredits', pct: 0.1 }],
});

export const rapid_deploy = defineProtocol({
  id: 'rapid_deploy',
  name: 'Rapid Deploy',
  copy: null,
  currency: 'stardust',
  price: 120,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'firstBuildFree' }],
});

export const emergency_bulkhead = defineProtocol({
  id: 'emergency_bulkhead',
  name: 'Emergency Bulkhead',
  copy: null,
  currency: 'stardust',
  price: 150,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'leakAbsorb', flat: 5 }],
});

/** Wreckage clears 2× faster: clearing speed +100%. */
export const salvage_expert = defineProtocol({
  id: 'salvage_expert',
  name: 'Salvage Expert',
  copy: null,
  currency: 'stardust',
  price: 100,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'economy', stat: 'clearSpeed', pct: 1 }],
});

export const linked_up = defineProtocol({
  id: 'linked_up',
  name: 'Linked Up',
  copy: null,
  currency: 'stardust',
  price: 200,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'linkBonus', pct: 0.5 }],
});

/** One tower type, picked when equipped: its tier-4 cost −25%. */
export const specialist = defineProtocol({
  id: 'specialist',
  name: 'Specialist',
  copy: null,
  currency: 'stardust',
  price: 150,
  availableAfter: SHOP_OPENS,
  choice: 'tower',
  grants: [{ kind: 'towerCost', tower: '*', tiers: 'spec', pct: -0.25 }],
});

export const early_bird = defineProtocol({
  id: 'early_bird',
  name: 'Early Bird',
  copy: null,
  currency: 'stardust',
  price: 120,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'economy', stat: 'earlyCallBonus', pct: 0.5 }],
});

/** High ground's range bonus 25% → 40%. */
export const high_ground_training = defineProtocol({
  id: 'high_ground_training',
  name: 'High Ground Training',
  copy: null,
  currency: 'stardust',
  price: 150,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'tileBonus', tile: 'highGround', flat: 0.15 }],
});

export const bounty_board = defineProtocol({
  id: 'bounty_board',
  name: 'Bounty Board',
  copy: null,
  currency: 'stardust',
  price: 150,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'economy', stat: 'bounty', pct: 0.1 }],
});

/** The first use of each commander ability during wave 1 doesn't start its cooldown. */
export const ready_room = defineProtocol({
  id: 'ready_room',
  name: 'Ready Room',
  copy: null,
  currency: 'stardust',
  price: 180,
  availableAfter: SHOP_OPENS,
  grants: [{ kind: 'freeCast', wave: 1 }],
});
