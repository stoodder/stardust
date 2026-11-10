// The base's panes (T204d, T303): Base.tsx renders `BASE_PANES[tab]` for an open tab and a locked
// pane (with its unlock hint) otherwise. The story panes are the Everglow Inbox (Inbox.tsx) and the
// codex (Codex.tsx), open whenever the base is; the others are shelves of their system's items
// (Shelf.tsx): R&D Command (Research.tsx), Zibzab's shop (Shop.tsx), and R&D Engineering
// (Engineering.tsx). The Pest Bounty Board (BountyBoard.tsx, Acts I–II) is a story pane too.
import type { ComponentType } from 'preact';
import type { StorePane } from '../../meta/index.ts';
import { BountyBoardPane } from './BountyBoard.tsx';
import { CodexPane } from './Codex.tsx';
import { EngineeringPane } from './Engineering.tsx';
import { InboxPane } from './Inbox.tsx';
import { ResearchPane } from './Research.tsx';
import { ShopPane } from './Shop.tsx';
import type { CampaignView } from './state.ts';

/** The base's story panes: open whenever the base is (no system gates them). */
export type StoryTab = 'inbox' | 'codex' | 'bounty';
export type BaseTab = StoryTab | StorePane;

/** Whether `tab` is a story pane (no shelf, no lock). */
export function isStoryTab(tab: BaseTab): tab is StoryTab {
  return tab === 'inbox' || tab === 'codex' || tab === 'bounty';
}

export interface BasePaneProps {
  readonly view: CampaignView;
}

/** Each open tab's pane. */
export const BASE_PANES: Readonly<Record<BaseTab, ComponentType<BasePaneProps>>> = {
  inbox: InboxPane,
  codex: CodexPane,
  bounty: BountyBoardPane,
  rnd: ResearchPane,
  shop: ShopPane,
  engineering: EngineeringPane,
};
