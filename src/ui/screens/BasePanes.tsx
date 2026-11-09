// The base's open panes, until their buy screens land (T204d: R&D and Shop; Engineering with the
// tier-4 unlocks). Each is the seam T204d replaces: Base.tsx renders `BASE_PANES[tab]` for an open
// tab and a locked pane (with its unlock hint) otherwise. The intro lines are placeholders in the
// Act I voice; the catalog copy belongs to T210c.
import type { ComponentType } from 'preact';
import { formatCount } from './format.ts';
import type { CampaignView } from './state.ts';

export type BaseTab = 'rnd' | 'shop' | 'engineering';

export interface BasePaneProps {
  readonly view: CampaignView;
}

function Placeholder({ who, line, bank }: { who: string; line: string; bank: string }) {
  return (
    <div class="sd-pane-body">
      <p class="sd-pane-who">{who}</p>
      <p class="sd-pane-line">{line}</p>
      <p class="sd-pane-bank">{bank}</p>
    </div>
  );
}

function ResearchPane({ view }: BasePaneProps) {
  return (
    <Placeholder
      who="R&D Command · QUILL"
      line="The lab is still being unpacked. Orbital Strike Mk II and Bricks's Rapport are on the way!"
      bank={`${formatCount(view.intel)} Intel to spend`}
    />
  );
}

function ShopPane({ view }: BasePaneProps) {
  return (
    <Placeholder
      who="Zibzab's Emporium"
      line="Price first: patience. The shelves are being stocked."
      bank={`${formatCount(view.stardust)} Stardust to spend`}
    />
  );
}

function EngineeringPane({ view }: BasePaneProps) {
  return (
    <Placeholder
      who="R&D Engineering"
      line="Tier approvals are signed. Specializations unlock here."
      bank={`${formatCount(view.intel)} Intel to spend`}
    />
  );
}

/** Each open tab's pane (T204d replaces these). */
export const BASE_PANES: Readonly<Record<BaseTab, ComponentType<BasePaneProps>>> = {
  rnd: ResearchPane,
  shop: ShopPane,
  engineering: EngineeringPane,
};
