/**
 * The `@kitn.ai/ui` exports map, applied by hand — the rewriter every
 * run-the-emitted-code guard shares (`mcp/tests/emitted-*.live.test.ts`).
 *
 * WHY A SHARED REWRITER AND NOT FOUR COPIES
 * -----------------------------------------
 * Each guard takes an emitted `src/main.ts` VERBATIM, writes it to a real module
 * and executes it, so every bare `@kitn.ai/ui/...` specifier in that text has to
 * be pointed at the source file the published package resolves it to. The four
 * copies had drifted into four slightly different maps; in one place now, the
 * resolution rules are stated once and a guard cannot silently lose one.
 *
 * WHAT CHANGED, AND WHY THE OLD ANCHOR IS GONE
 * --------------------------------------------
 * The emitted apps used to import the register-all barrel
 * (`import '@kitn.ai/ui/web-components'`), so the guards anchored on that exact
 * string and pointed it at one source module. A scaffolded app now imports one
 * `@kitn.ai/ui/web-components/<entry>` per tag it PLACES, and the SSR-capable
 * shapes put those entries inside a `void import(...)` call — so there is no
 * line prefix and no single barrel string left to match. The specifier itself is
 * the only stable anchor, and what it resolves to is a per-tag module.
 *
 * RESOLVED BY BASENAME, NOT BY DIRECTORY
 * --------------------------------------
 * `@kitn.ai/ui/web-components/<entry>` is a self-registering module whose entry
 * basename comes from `web-component-manifest.json` `tags`. The source file with
 * that basename is NOT always at `src/web-components/<entry>/`: `conversation-list`
 * lives at `src/web-components/conversation/conversation-list.tsx`,
 * `chat-scope-picker` under `chat/`, `chat-workspace` under `workspace/`,
 * `setting-item` under `settings/`. Those are examples, not the list — the walk
 * below is the source of truth, and it is a walk because a restated list would
 * rot the first time a file moves.
 *
 * AMBIGUOUS, UNKNOWN AND REGRESSED ARE ALL LOUD
 * --------------------------------------------
 * An entry matching zero or more than one source file THROWS with the entry, the
 * line and the candidates, rather than falling through to the directory form and
 * surfacing later as an unresolvable import. A bare
 * `'@kitn.ai/ui/web-components'` specifier throws too: the emitted apps no longer
 * import the barrel, so one appearing here means the emit regressed, and quietly
 * rewriting it to the register-all source would hide exactly the change these
 * guards execute the emitted code to check.
 */
import { readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The `@kitn.ai/ui` package root. The guards' `TMP_DIR` sits under the same path. */
const PKG = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const WEB_COMPONENTS_SRC = resolve(PKG, 'src/web-components');

/** Which sources own which basename, built once per process — see `sourceModules`. */
let sources: Map<string, string[]> | null = null;

/**
 * Every `.ts`/`.tsx` module under `src/web-components/**`, keyed by basename.
 *
 * Cached for the process rather than per call: the four guards all live in one
 * vitest fork's module graph, and the walk re-run on every rewrite would be pure
 * repetition over the same tree that nothing in a test run mutates.
 */
function sourceModules(): Map<string, string[]> {
  if (sources) return sources;
  const found = new Map<string, string[]>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      const basename = /^(.*)\.tsx?$/.exec(entry.name)?.[1];
      if (!basename) continue;
      found.set(basename, [...(found.get(basename) ?? []), path]);
    }
  };
  walk(WEB_COMPONENTS_SRC);
  sources = found;
  return found;
}

/**
 * The subpaths whose published name IS their source directory. `web-components`
 * is the one that is not, so it is handled on its own below rather than here.
 */
const DIRECT_SUBPATHS: Record<string, string> = {
  state: 'src/state',
  wire: 'src/wire',
  schemas: 'src/schemas',
};

const SPECIFIER = /'@kitn\.ai\/ui(?:\/([^']*))?'/g;

/** One line of the emitted module, with every bare specifier it really imports resolved. */
function resolveSpecifiers(line: string): string {
  return line.replace(SPECIFIER, (_match, subpath: string | undefined) => {
    if (subpath === undefined) {
      throw new Error(
        `emitted-source-specifiers: the emitted module imports the '@kitn.ai/ui' root — ` +
          `no emitted app does. Offending line:\n  ${line.trim()}`,
      );
    }
    if (subpath === 'web-components') {
      throw new Error(
        `emitted-source-specifiers: the emitted module imports the '@kitn.ai/ui/web-components' ` +
          `register-all barrel, which a scaffolded app no longer does — it imports one entry per ` +
          `tag it places. Offending line:\n  ${line.trim()}`,
      );
    }
    if (subpath.startsWith('web-components/')) {
      const entry = subpath.slice('web-components/'.length);
      const candidates = sourceModules().get(entry) ?? [];
      if (candidates.length !== 1) {
        throw new Error(
          `emitted-source-specifiers: '@kitn.ai/ui/web-components/${entry}' resolved to ` +
            `${candidates.length} source files under src/web-components/` +
            (candidates.length ? `:\n  ${candidates.join('\n  ')}` : '') +
            `\nA per-tag export needs exactly one src/web-components/**/${entry}.ts or .tsx. ` +
            `Offending line:\n  ${line.trim()}`,
        );
      }
      return `'${candidates[0]}'`;
    }
    const direct = DIRECT_SUBPATHS[subpath];
    if (!direct) {
      throw new Error(
        `emitted-source-specifiers: no source mapping for '@kitn.ai/ui/${subpath}' — add it to ` +
          `DIRECT_SUBPATHS, or resolve it by basename if it is a per-tag entry. ` +
          `Offending line:\n  ${line.trim()}`,
      );
    }
    return `'${resolve(PKG, direct)}'`;
  });
}

/**
 * Rewrite an emitted module's bare specifiers to the sources they resolve to.
 *
 * The first two filters are the ones every guard already used. The compiled-theme
 * CSS import is dropped (there is nothing to style in jsdom) and type-only imports
 * go with it: they erase anyway, and `KaiChatElement` lives in a `.d.ts` the
 * exports map does not surface as a runtime module. The type-import filter matches
 * after `trimStart`, not at column 0: the Svelte shape indents its type import, so
 * an anchored match would leave that line in place and it would reach the
 * bare-barrel check below and throw there. Latent today (every guard emits
 * framework `html`), but the promise this file makes has to hold for any shape.
 *
 * COMMENT LINES ARE LEFT ALONE, which is a decision rather than a shortcut. A
 * comment registers nothing, so nothing in one needs resolving, and specifiers do
 * appear in the emitted PROSE as examples (the LOADING OPTIONS block quotes
 * `'@kitn.ai/ui/web-components/<file>'` verbatim). Rewriting a sentence into a
 * path is one failure; letting the bare-barrel check below throw on a comment is
 * the worse one, because it blames the emit for a note about the emit.
 */
export function rewriteEmittedSpecifiers(code: string): string {
  return code
    .split('\n')
    .filter((l) => !l.includes("'@kitn.ai/ui/theme.tokens.css'"))
    .filter((l) => !l.trimStart().startsWith('import type '))
    .filter((l) => !l.trimStart().startsWith('//'))
    .map(resolveSpecifiers)
    // `KaiChatElement` — and on the wider surfaces `KaiSourcesElement`,
    // `KaiConversationsElement`, `KaiAttachmentsElement` — are `.d.ts` interfaces
    // with no runtime module to import, so the casts the emitted module makes on
    // its element lookups become `any`. That is what the emitted code is really
    // doing at runtime: the element is reached through `document.getElementById`.
    .map((l) => l.replace(/\bas Kai\w+Element\b/g, 'as any'))
    .join('\n');
}
