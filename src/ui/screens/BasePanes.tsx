// The base's panes (T204d): Base.tsx renders `BASE_PANES[tab]` for an open tab and a locked pane
// (with its unlock hint) otherwise. Each is a shelf of its system's items (Shelf.tsx): R&D Command
// (Research.tsx), Zibzab's shop (Shop.tsx), and R&D Engineering (Engineering.tsx).
import type { ComponentType } from 'preact';
import type { StorePane } from '../../meta/index.ts';
import { EngineeringPane } from './Engineering.tsx';
import { ResearchPane } from './Research.tsx';
import { ShopPane } from './Shop.tsx';
import type { CampaignView } from './state.ts';

export type BaseTab = StorePane;

export interface BasePaneProps {
  readonly view: CampaignView;
}

/** Each open tab's pane. */
export const BASE_PANES: Readonly<Record<BaseTab, ComponentType<BasePaneProps>>> = {
  rnd: ResearchPane,
  shop: ShopPane,
  engineering: EngineeringPane,
};
