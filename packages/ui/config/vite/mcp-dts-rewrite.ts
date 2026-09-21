/**
 * The declaration emit's `mcp/` boundary rewrite, as a pure function so it can be
 * tested without running a build.
 *
 * WHY IT EXISTS. A few SHIPPED declarations under `dist/components/` import the
 * construct schema and the template registry across the boundary by a RELATIVE
 * path. While that source lived at `src/agent-tooling/`, `src/components -> ../agent-tooling`
 * and `dist/components -> ../agent-tooling` were the same string, so the emit was
 * right for free. The source is at `mcp/` now and its declarations are emitted at
 * `dist/agent-tooling/` by the `construct` / `construct-templates` targets, so the
 * specifier has to be rewritten onto that path.
 *
 * WHY THE PREFIX IS DERIVED, NOT DEPTH-BAKED. The first version matched the
 * literal `'../../mcp/` and threw when the emitted file was not exactly one
 * directory under `dist/`. That prefix is a function of the file's DEPTH, so
 * moving a component one level deeper (the 2026-09-19 `src/components/<file>` ->
 * `src/components/<family>/<file>` reorg) stopped the regex matching AT ALL: the
 * hook returned early, the throw inside it never ran, and three declarations
 * shipped pointing at raw `../../../mcp/construct/*` — outside `dist/`.
 * `verify:dts` caught that at postbuild, one whole build later, naming the file
 * rather than the depth. So the upward prefix is computed from the emitted path,
 * and the invariant is asserted rather than assumed: a specifier this emit failed
 * to rewrite throws HERE, naming the file, instead of shipping.
 *
 * OUT OF SCOPE: triple-slash `<reference path=…>`. It carries no quoting an
 * emit-time scan can rely on, and `scripts/verify-dts-boundaries.mjs` checks it
 * across the whole tree at postbuild.
 */

/** The emitted declarations for the construct engine, relative to `dist/`. */
const EMITTED_CONSTRUCT_DIR = 'agent-tooling/';

/** Module specifiers carrying a relative target, with the token + opening quote kept for the rewrite. */
const CROSSING_MCP = /((?:from|import\(|import|require\()\s*['"])(?:\.\.\/)+mcp\//g;
const ANY_RELATIVE = /(?:from|import\(|import|require\()\s*['"]([^'"]+)['"]/g;

export interface McpDtsRewriteInput {
  /** The emitted declaration's text. */
  content: string;
  /** That file's path relative to `dist/`, in either separator style. */
  distRelPath: string;
}

/**
 * Rewrite every relative specifier crossing into `mcp/` onto its emitted home under
 * `dist/`, and throw if the result still leaves `dist/`.
 */
export function rewriteMcpDtsSpecifiers({ content, distRelPath }: McpDtsRewriteInput): string {
  const dirs = distRelPath.split(/[\\/]/).slice(0, -1);
  // './' for a declaration emitted at dist/ root, '../' per directory below it.
  const up = dirs.length === 0 ? './' : '../'.repeat(dirs.length);

  const rewritten = content.replace(CROSSING_MCP, (_all, prefix: string) => `${prefix}${up}${EMITTED_CONSTRUCT_DIR}`);

  // The failure this guards: a specifier crossing into mcp/ that the rewrite did not
  // reach. It would resolve against `<pkg>/mcp/` — raw source, outside dist/, which
  // `files` does not ship — and only verify:dts would say so, after the whole emit.
  const missed = [...rewritten.matchAll(CROSSING_MCP)].map((m) => m[0]);
  if (missed.length > 0) {
    throw new Error(
      `config/vite/mcp-dts-rewrite.ts: ${distRelPath} still imports across the mcp/ boundary ` +
        `after the rewrite: ${missed.join(', ')}. Every such specifier must be rewritten to ` +
        `'${up}${EMITTED_CONSTRUCT_DIR}'.`,
    );
  }

  for (const [, spec] of rewritten.matchAll(ANY_RELATIVE)) {
    if (!spec.startsWith('.')) continue;
    let depth = dirs.length;
    for (const seg of spec.split('/')) {
      if (seg === '..') depth--;
      else if (seg !== '' && seg !== '.') break;
    }
    if (depth < 0) {
      throw new Error(
        `config/vite/mcp-dts-rewrite.ts: ${distRelPath} imports '${spec}', which resolves outside ` +
          `dist/. Emitted declarations may only point at dist/ output or at a public package ` +
          `subpath listed in the exports map.`,
      );
    }
  }

  return rewritten;
}
