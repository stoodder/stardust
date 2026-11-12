// The setup asks for an in-world "Form of address" (Mr., Ms., Tech.; D163), never for pronouns:
// no player-facing string in src/ui, src/app, src/content, or src/story says "pronoun(s)" or pairs
// pronouns with a slash ("she/her"). Player-facing means every string literal, template chunk, and
// JSX text in the shipped modules (tests and dev fixtures aside); a bare code id ("pronouns", a
// data key) may keep its name. Parsed with Vite's `parseAst` (Rolldown's), so comments and
// identifiers never count. Lives in tools/ because it reads files (Node types).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseAst } from 'vite';
import { describe, expect, it } from 'vitest';
import {
  ADDRESS_ORDER,
  DEFAULT_ADDRESS,
  PRONOUN_IDS,
  PRONOUN_SETS,
} from '../src/content/dialogue/profile.ts';

const SRC = new URL('../src/', import.meta.url).pathname;
const DIRS = ['ui', 'app', 'content', 'story'];

/** "pronoun", "Pronouns", … */
const PRONOUN_WORD = /pronoun/i;
/** "she/her", "he / him", "they/them", … */
const SLASH_PAIR = /\b(?:s?he|they|it|xe|ze)\s*\/\s*(?:her|hers|him|his|them|their|its|xem|zir)\b/i;
/** A code id, not copy: one lower-case token ("pronouns", "sd-file-address", "profile.pronouns"). */
const CODE_ID = /^[a-z][\w.:-]*$/;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return e.name === '__fixtures__' ? [] : sources(path);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [path] : [];
  });
}

/** Every string a module could show: literals, template chunks, and JSX text (not import paths). */
function strings(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const n of node) strings(n, out);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  const type: unknown = Reflect.get(node, 'type');
  const value: unknown = Reflect.get(node, 'value');
  if ((type === 'Literal' || type === 'JSXText') && typeof value === 'string') out.push(value);
  if (type === 'TemplateElement' && typeof value === 'object' && value !== null) {
    const cooked: unknown = Reflect.get(value, 'cooked');
    if (typeof cooked === 'string') out.push(cooked);
  }
  const moduleSource =
    type === 'ImportDeclaration' ||
    type === 'ImportExpression' ||
    type === 'ExportNamedDeclaration' ||
    type === 'ExportAllDeclaration';
  for (const [key, child] of Object.entries(node)) {
    if (moduleSource && key === 'source') continue;
    strings(child, out);
  }
}

/** Why `text` can't be player copy, or null. */
function copyProblem(text: string): string | null {
  const s = text.trim();
  if (SLASH_PAIR.test(s)) return 'pairs pronouns with a slash';
  if (PRONOUN_WORD.test(s) && !CODE_ID.test(s)) return 'says "pronoun"';
  return null;
}

describe('player copy never speaks of pronouns (D163)', () => {
  it('the rule catches the old field and spares code ids', () => {
    expect(copyProblem('Pronouns')).not.toBeNull();
    expect(copyProblem('Pick the pronouns the team should use!')).not.toBeNull();
    expect(copyProblem('she/her')).not.toBeNull();
    expect(copyProblem('They / them')).not.toBeNull();
    expect(copyProblem('pronouns')).toBeNull();
    expect(copyProblem('Form of address')).toBeNull();
    expect(copyProblem('Clean Exit 1/2')).toBeNull();
  });

  it('in every shipped string of src/ui, src/app, src/content, and src/story', () => {
    const problems: string[] = [];
    let checked = 0;
    for (const dir of DIRS) {
      for (const file of sources(join(SRC, dir))) {
        const found: string[] = [];
        const lang = file.endsWith('.tsx') ? 'tsx' : 'ts';
        strings(parseAst(readFileSync(file, 'utf8'), { lang }), found);
        checked += found.length;
        for (const s of found) {
          const why = copyProblem(s);
          if (why !== null) problems.push(`${relative(SRC, file)}: ${JSON.stringify(s)} ${why}`);
        }
      }
    }
    expect(problems).toEqual([]);
    expect(checked).toBeGreaterThan(10_000);
  });

  it('the form of address reads Mr., Ms., Tech., in that order, with Tech. by default', () => {
    expect(ADDRESS_ORDER.map((id) => PRONOUN_SETS[id].label)).toEqual(['Mr.', 'Ms.', 'Tech.']);
    expect([...ADDRESS_ORDER].sort()).toEqual([...PRONOUN_IDS].sort());
    expect(PRONOUN_SETS[DEFAULT_ADDRESS].label).toBe('Tech.');
  });
});
