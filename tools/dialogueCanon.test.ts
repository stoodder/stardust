// Dialogue is canon (D026, D048): every line, choice option, and bark in a map's dialogue must
// appear word for word in its map's section of its act file (`a1_m02` → story/campaign/act1.md
// § A1M2, `a2_m01` → act2.md § A2M1, `fin_m01` → finale.md § FIN, `ch_m01` → finale.md § CH1), and a shared bark in its act's file (by its id's act). The
// other way round, every quoted line in a migrated map's *Story delivery* (from *Briefing* to
// *Codex*) must be in its dialogue, so none is dropped. Reads the docs from disk, so it lives with
// the other node-side checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../src/content/campaign.ts';
import { SHARED_BARKS } from '../src/content/dialogue/barks/index.ts';
import { MAP_DIALOGUE } from '../src/content/dialogue/index.ts';
import { CHALLENGE_MAPS } from '../src/content/maps/challenge.ts';
import type { Bark, Scene } from '../src/content/dialogue/types.ts';

const ROOT = join(import.meta.dirname, '..');

/** The maps whose every *Story delivery* line is dialogue (the rest still have lines to land). */
const COMPLETE = [
  'a1_m01',
  'a1_m02',
  'a1_m03',
  'a1_m04',
  'a1_m05',
  'a2_m01',
  'a2_m02',
  'a2_m03',
  'a2_m04',
  'a2_m05',
  'a2_m06',
  'a3_m01',
  'a3_m02',
  'a3_m03',
  'a3_m04',
  'a3_m05',
  'a3_m06',
  'fin_m01', // T821 (no pending checks: its alts and cells pass)
];

function actFile(act: string): string {
  const name = act === 'fin' ? 'finale' : `act${act}`;
  return readFileSync(join(ROOT, `docs/story/campaign/${name}.md`), 'utf8');
}

/** Maps whose section isn't `a<act>_m<NN>` → act<act>.md § A<act>M<n>: its file and heading label. */
const SECTIONS: Readonly<Record<string, { readonly act: string; readonly label: string }>> = {
  fin_m01: { act: 'fin', label: 'FIN' },
  // The challenge maps' briefings (T862): finale.md § CH1–CH3, after the dawn.
  ch_m01: { act: 'fin', label: 'CH1' },
  ch_m02: { act: 'fin', label: 'CH2' },
  ch_m03: { act: 'fin', label: 'CH3' },
};

/** A map's display name: its campaign name, or a challenge map's own (`MapDef.challenge.name`). */
function mapName(mapId: string): string {
  const campaign = CAMPAIGN_PLAN.find((m) => m.id === mapId)?.name;
  if (campaign !== undefined) return campaign;
  const maps: Readonly<Record<string, { readonly challenge?: { readonly name: string } }>> =
    CHALLENGE_MAPS;
  return maps[mapId]?.challenge?.name ?? '';
}

/** Map `mapId`'s act file and section label (`a2_m01` → act 2, `A2M1`; `fin_m01` → finale, `FIN`). */
function sectionKey(mapId: string): { readonly act: string; readonly label: string } {
  const own = SECTIONS[mapId];
  if (own !== undefined) return own;
  const m = /^a(\d)_m(\d\d)$/.exec(mapId);
  if (m === null) throw new Error(`${mapId}: not a campaign map id`);
  const [, act = '', num = ''] = m;
  return { act, label: `A${act}M${Number(num)}` };
}

/** Map `mapId`'s section of its act file: from its `## <label>` heading to the next. */
function section(mapId: string): string {
  const { act, label } = sectionKey(mapId);
  const doc = actFile(act);
  const heading = `\n## ${label} `;
  const start = doc.indexOf(heading);
  if (start < 0) throw new Error(`${mapId}: no "${heading.trim()}" section in its act file`);
  const end = doc.indexOf('\n## ', start + heading.length);
  return doc.slice(start, end < 0 ? undefined : end);
}

/** Every text a scene or bark can show: lines (silences aside) and choice options. */
function texts(scenes: readonly Scene[], barks: readonly Bark[]): string[] {
  const out: string[] = [];
  for (const scene of scenes) {
    for (const n of scene.nodes) {
      if (n.kind === 'line' && n.text !== '') out.push(n.text);
      if (n.kind === 'choice') out.push(...n.options.map((o) => o.text));
    }
  }
  for (const b of barks) if (b.text !== '') out.push(b.text);
  return out;
}

describe('dialogue is verbatim from its map section of the act file', () => {
  it('every registered map has its section, headed with its campaign name', () => {
    for (const { map } of MAP_DIALOGUE) {
      expect(section(map).split('\n')[1], map).toBe(
        `## ${sectionKey(map).label} · ${mapName(map)}`,
      );
    }
  });

  it("finds each act's sections, the finale's included", () => {
    expect(section('a2_m01').split('\n')[1]).toBe('## A2M1 · Rig Nine');
    expect(section('fin_m01').split('\n')[1]).toBe('## FIN · Clearing the Way');
    expect(section('fin_m01')).toContain('fin_m01_scene_dawn');
  });

  for (const { map, scenes, barks } of MAP_DIALOGUE) {
    const all = texts(scenes, barks);
    if (all.length === 0) continue;
    it(map, () => {
      const doc = section(map);
      for (const t of all) expect(doc, `${map}: ${t}`).toContain(t);
    });
  }

  it('shared barks are verbatim from their act file', () => {
    for (const b of SHARED_BARKS) {
      const act = /_a(1|2|3|fin)_\d\d$/.exec(b.id)?.[1];
      expect(act, `${b.id}: no act in its id`).toBeDefined();
      if (b.text !== '') expect(actFile(act ?? ''), b.id).toContain(b.text);
    }
  });
});

describe('every story-delivery line of a migrated map is in its dialogue', () => {
  for (const map of COMPLETE) {
    it(map, () => {
      const doc = section(map);
      const from = doc.indexOf('- *Briefing');
      const to = doc.indexOf('- *Codex', from);
      expect(from, `${map}: no *Briefing*`).toBeGreaterThan(0);
      const quoted = [...doc.slice(from, to).matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? '');
      expect(quoted.length).toBeGreaterThan(0);
      const own = MAP_DIALOGUE.find((d) => d.map === map);
      const all = texts(own?.scenes ?? [], own?.barks ?? []);
      for (const q of quoted) expect(all, `${map}: "${q}"`).toContain(q);
    });
  }
});
