// The dev maps' Unsung (D156): the live boss with its forms' time floors (`notBeforeSec`: forms 3
// and 4 no sooner than 60 s and 120 s into Phase 2) lifted, since dev_phases's song is a minute
// long, not the finale's three. Everything else is the finale's own.
import type { EnemyDef } from '../../content/types.ts';

export function devUnsung<Id extends string>(def: EnemyDef<Id>): EnemyDef<Id> {
  const boss = def.boss;
  if (boss === undefined) return def;
  return {
    ...def,
    boss: {
      ...boss,
      phases: boss.phases.map(({ notBeforeSec: _floor, ...phase }) => phase),
    },
  };
}
