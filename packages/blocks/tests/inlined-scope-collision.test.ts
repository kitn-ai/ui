/**
 * The CDN paste form puts the entry, the controller and the transport in ONE
 * scope: `src/registry.ts` inlines a relative import into its importer (one
 * level, by design), so the block's modules are not modules any more once a
 * reader pastes the form. Two top-level declarations of the same name therefore
 * stop being two private names and become `Identifier 'X' has already been
 * declared` - a syntax error that kills the whole script, so the page never
 * reaches ready and every element stays undefined.
 *
 * WHY IT IS CHECKED HERE AND NOWHERE ELSE. `tsc` sees one module per file, so
 * there is nothing to compare; the unit suite imports modules the same way; and
 * no gate loads the inlined form (the driver runs the html form, which keeps its
 * module boundaries). The only detector was the browser, once someone pasted the
 * generated file and read a `pageerror` that names the identifier but not the two
 * files that each declare it.
 *
 * WHAT THE SCOPE IS, EXACTLY: the value declarations - `const`, `let` and
 * `function`, since TypeScript is stripped before the inlining (`gen-blocks` runs
 * the block's source through esbuild), so an interface cannot collide, while a
 * shared function name silently replaces its twin. Imports are not declarations
 * either way: the inliner rewrites each one onto the pinned kit entry.
 *
 * ANTI-VACUITY, the rule this file's sibling insists on: an extractor that finds
 * nothing and compares nothing is worse than no extractor, so the real pair
 * asserts a count on each side, and the comparator is exercised against a
 * planted collision that it must name.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BLOCK_DIR = new URL('../blocks/assistant/', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(BLOCK_DIR, file), 'utf8');

/**
 * The names a module declares at its top level, in the order they appear.
 *
 * Column zero is the whole filter, and it is what keeps this off the names
 * INSIDE a declaration: an object's keys, a function's locals and the members of
 * an interface all sit indented. The block's own prose sits in string literals,
 * which are indented here too.
 */
function topLevelNames(source: string): string[] {
  return [...source.matchAll(/^(?:export )?(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map(
    (match) => match[1] as string,
  );
}

/** The names both sides declare: the exact set the inlined scope would refuse. */
function collidingNames(a: string, b: string): string[] {
  const declared = new Set(topLevelNames(a));
  return [...new Set(topLevelNames(b))].filter((name) => declared.has(name));
}

describe('the CDN form inlines the block into one scope', () => {
  const transport = read('assistant.transport.mock.ts');
  const controller = read('assistant.controller.ts');

  it('finds declarations on both sides, so a parse that matched nothing cannot pass', () => {
    // The two names the two files are known to carry, one each: a spot check
    // that the extractor is reading the files rather than an accidental slice.
    expect(topLevelNames(transport), 'the transport names').toContain('transport');
    expect(topLevelNames(controller), 'the controller names').toContain('GUIDES');
    expect(topLevelNames(transport).length, 'transport declarations').toBeGreaterThan(3);
    expect(topLevelNames(controller).length, 'controller declarations').toBeGreaterThan(3);
  });

  it('declares no name in both, which is a page that boots', () => {
    expect(collidingNames(transport, controller)).toEqual([]);
  });

  it('names a collision it is given, so a green above means something', () => {
    expect(collidingNames('const SHARED = 1;\n', 'export const SHARED = 2;\n')).toEqual(['SHARED']);
    expect(collidingNames('function run() {}\n', 'const run = () => 1;\n')).toEqual(['run']);
    // ...and a name that only LOOKS shared is not one: an import is not a
    // declaration, and neither is an indented local.
    expect(collidingNames('const transport = {};\n', "import { transport } from './x';\n")).toEqual([]);
    expect(collidingNames('const fold = 1;\n', 'function outer() {\n  const fold = 2;\n}\n')).toEqual([]);
  });
});
