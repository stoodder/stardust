// R&D Command (T204d; design/progression.md § 7.3): QUILL's Intel shelf. It opens after A1M1 with
// Orbital Strike Mk II and Bricks's Rapport (2 Intel each, so A1M1's 3 Intel buys one: D031); the
// Field Protocol slots wait for A1M3.
import type { BasePaneProps } from './BasePanes.tsx';
import { Shelf } from './Shelf.tsx';

export function ResearchPane({ view }: BasePaneProps) {
  return <Shelf pane="rnd" view={view} />;
}
