// Every content registry, gathered for compileContent() (compile.ts). Registries are explicit
// imports, never import.meta.glob, so the same files load in Vite, Vitest, and plain Node.
import { ABILITIES } from './abilities/index.ts';
import { CAMPAIGN } from './campaign.ts';
import { ENEMIES } from './enemies/index.ts';
import { LINKS } from './links/index.ts';
import { MAPS } from './maps/index.ts';
import { TOWERS } from './towers/index.ts';
import type { RawContent } from './types.ts';

export const RAW_CONTENT: RawContent = {
  towers: TOWERS,
  enemies: ENEMIES,
  abilities: ABILITIES,
  maps: MAPS,
  links: LINKS,
  campaign: CAMPAIGN,
};
