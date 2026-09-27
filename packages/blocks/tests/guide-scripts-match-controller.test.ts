/**
 * The mock's scripts and the controller's key sets are the SAME strings, and
 * neither file can read the other's copy.
 *
 * The transport is a LEAF on purpose: the CDN paste form inlines it, the
 * controller and the entry, and refuses anything deeper by name, so it may not
 * carry a relative import. And the controller imports the transport, so a shared
 * module between them would be a cycle. Two copies of one key set that must agree
 * is the exact shape this repo bans everywhere else, so the agreement is checked
 * here rather than hoped for. There are two such pairs, because a conversation
 * starts two ways: a GUIDE by the question its card asks, an ARC by the one-line
 * label a reader clicks.
 *
 * WHAT BREAKS WITHOUT THIS. The key is how a thread finds its script. Rename a
 * guide's question (or a suggestion label) in one file and not the other and the
 * transport stops matching it: the fallback script answers instead, so a reader
 * who clicks the label gets a different conversation's text - or, for an arc, a
 * generic reply that promises nothing. Every unit test stays green, because
 * neither file knows the other's spelling, and nothing on screen says "this is
 * the wrong script".
 *
 * ANTI-VACUITY, the rule this file's sibling insists on: a parser that finds
 * nothing and compares nothing is worse than no parser, so both sides of each
 * pair assert a COUNT before comparing, and every count is the number of
 * conversations a reader can start. A moved declaration fails loudly rather than
 * silently matching nothing.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BLOCK_DIR = new URL('../blocks/assistant/', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(BLOCK_DIR, file), 'utf8');

/** Case and spacing cannot make two spellings of one question miss each other.
 *  Spelled here as both files spell it, for the same reason they carry their own
 *  copy: none of the three may import another. */
const fold = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, ' ');

/** The top-level keys of an object literal, from its declaration to the `};` that
 *  closes it: two-space indent, a quoted key, an opening bracket. Narrowing to
 *  that slice keeps a later literal from being counted by accident. */
const scriptKeys = (source: string, declaration: string): string[] => {
  const at = source.indexOf(declaration);
  expect(at, `${declaration} not found — did the declaration move?`).toBeGreaterThan(-1);
  const scope = source.slice(at, source.indexOf('\n};', at));
  return [...scope.matchAll(/^ {2}'([^']+)': \[/gm)].map((match) => match[1] as string);
};

/** The `question` of every card in the controller's GUIDES array. */
const cardQuestions = (source: string): string[] => {
  const at = source.indexOf('const GUIDES: readonly Guide[] = [');
  expect(at, 'the GUIDES array not found — did it move?').toBeGreaterThan(-1);
  const scope = source.slice(at, source.indexOf('\n];', at));
  return [...scope.matchAll(/^ {4}question: '([^']+)',$/gm)].map((match) => match[1] as string);
};

/** The four suggestion labels the controller offers on an empty thread. */
const suggestionLabels = (source: string): string[] => {
  const at = source.indexOf('const SUGGESTIONS = [');
  expect(at, 'the SUGGESTIONS array not found — did it move?').toBeGreaterThan(-1);
  const scope = source.slice(at, source.indexOf('];', at));
  return [...scope.matchAll(/'([^']+)'/g)].map((match) => match[1] as string);
};

describe('the mock scripts the guides a card can open', () => {
  const mock = read('assistant.transport.mock.ts');
  const controller = read('assistant.controller.ts');

  const scripted = scriptKeys(mock, 'const GUIDE_SCRIPTS: Record<string, Script> = {');
  const cards = cardQuestions(controller);

  it('finds four on each side, so a parse that matched nothing cannot pass', () => {
    expect(scripted.length, 'scripts found in the mock').toBe(4);
    expect(cards.length, 'cards found in the controller').toBe(4);
  });

  it('keys every card question to a script', () => {
    expect([...scripted].sort()).toEqual(cards.map(fold).sort());
  });
});

describe('the mock scripts the arcs a suggestion can start', () => {
  const mock = read('assistant.transport.mock.ts');
  const controller = read('assistant.controller.ts');

  const scripted = scriptKeys(mock, 'const ARC_SCRIPTS: Record<string, Script> = {');
  const labels = suggestionLabels(controller);

  it('finds four on each side, so a parse that matched nothing cannot pass', () => {
    expect(scripted.length, 'arcs found in the mock').toBe(4);
    expect(labels.length, 'labels found in the controller').toBe(4);
  });

  it('keys every suggestion label to an arc', () => {
    expect([...scripted].sort()).toEqual(labels.map(fold).sort());
  });
});
