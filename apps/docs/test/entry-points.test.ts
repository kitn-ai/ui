// GUARD -- the Entry points table on the Installation page covers the WHOLE
// published surface, and recommends nothing the package does not export.
//
// WHY THIS EXISTS. The table is the only place a developer can find out what
// `@kitn.ai/ui/<something>` exists. Before this guard it named 11 of the 21
// importable keys, and the docs site named 14 anywhere: `/schemas`, `/stores`,
// `/define`, `/diagnostics`, `/construct`, `/construct/templates`,
// `/web-component-meta.json`, `/icon-names.json` and the per-module
// `/web-components/<name>` form were documented nowhere a human browses. The
// agent-facing half was covered (`llms.txt` is generated, and the acceptance
// pack asserts every exports key is named in its DELIVERY.md), which is exactly
// why the gap survived: the surface no machine reads was the surface nobody
// checked.
//
// DERIVED, NOT TYPED. The list comes from `@kitn.ai/ui`'s own `exports` map,
// resolved through the package the docs actually depend on rather than by a
// relative path into a sibling package, so a renamed or moved manifest fails
// here instead of silently checking a stale copy. Adding a subpath re-fires this
// file; the row it needs is the failure message.
//
// BOTH DIRECTIONS, because each one alone is a green check over a real defect:
// a missing row is a subpath nobody can find, and an extra row is a documented
// import that a consumer would get an ERR_PACKAGE_PATH_NOT_EXPORTED for. The
// FORWARD direction is the new one and is what this file exists for. The reverse
// already has a guard -- `verify:docs`'s prose scan reports a backticked
// `@kitn.ai/ui/...` token that no entry point exports (`staleEntries`) -- so keep
// it here for the cheap second opinion and the clearer message, not as the only
// line of defence.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

/** The manifest a consumer resolves, through the docs' own dependency. */
const uiManifestPath = require.resolve('@kitn.ai/ui/package.json');
const uiManifest = JSON.parse(readFileSync(uiManifestPath, 'utf8')) as { exports: Record<string, unknown> };

const PAGE = 'src/content/docs/guides/installation.mdx';
// `require.resolve` for the relative path, like the neighbouring suite: it is
// anchored to THIS file rather than to the runner's cwd, which is what the docs
// step does not guarantee.
const page = readFileSync(require.resolve(`../${PAGE}`), 'utf8');

/**
 * Keys that are deliberately NOT recommended to an application, each with the
 * reason. A declared exception whose key stops existing FAILS the run below, so
 * this table cannot rot open the way a comment would.
 */
const NOT_AN_IMPORT_TO_RECOMMEND: Record<string, string> = {
  './package.json': 'the manifest itself, which an application has no reason to import',
};

const specifierFor = (key: string) => (key === '.' ? '@kitn.ai/ui' : `@kitn.ai/ui/${key.slice(2)}`);

/**
 * Every specifier the page NAMES, `@kitn.ai/ui` and its subpaths.
 *
 * The lookbehind is load-bearing and it is not a nicety: the page's CDN section
 * writes `https://unpkg.com/@kitn.ai/ui/dist/kai.es.js`, which is an ASSET PATH
 * in a URL, not a package import, and no exports key reaches `./dist/*`. Without
 * it the reverse check below reports the CDN as an invented specifier and the
 * only way to green it would be to document a lie.
 */
function specifiersOnPage(): string[] {
  return [...new Set([...page.matchAll(/(?<![\w/@.-])@kitn\.ai\/ui(?:\/[A-Za-z0-9._-]+)*/g)].map((m) => m[0]))];
}

describe('the Installation page lists the whole published entry-point surface', () => {
  it('reads the real exports map, through the package the docs depend on', () => {
    // Anti-vacuity, first: an empty or unreadable map would make every
    // assertion below pass while checking nothing.
    const keys = Object.keys(uiManifest.exports ?? {});
    expect(keys.length, `${uiManifestPath} declares no exports keys`).toBeGreaterThan(15);
    expect(keys, 'the package root is not an exports key; the manifest looks wrong').toContain('.');
  });

  it('names every exports key a consumer may import, and no retired key', () => {
    const keys = Object.keys(uiManifest.exports);
    const documented = new Set(specifiersOnPage());

    const isDocumented = (key: string) => {
      // A wildcard key (`./schemas/*`) is documented by its BASE: a page names
      // the family (`@kitn.ai/ui/schemas`) and, in prose, the per-item form. Both
      // spellings are how a consumer writes it, and the base is what the
      // specifier extraction can see.
      const base = key.endsWith('/*') ? key.slice(0, -2) : key;
      return documented.has(specifierFor(base));
    };

    const missing = keys
      .filter((key) => !(key in NOT_AN_IMPORT_TO_RECOMMEND))
      .filter((key) => !isDocumented(key))
      .map((key) => `${specifierFor(key)}  (exports key ${key})`);

    expect(
      missing,
      `the Installation page does not name these published entry points, so a developer cannot ` +
        `discover them. Add a row to the "Entry points" table for each, or declare it in ` +
        `NOT_AN_IMPORT_TO_RECOMMEND with the reason:\n  - ${missing.join('\n  - ')}`,
    ).toEqual([]);
  });

  it('recommends nothing the package does not export', () => {
    // The other direction, and the more expensive mistake: a page naming a
    // subpath that does not exist sends a reader to ERR_PACKAGE_PATH_NOT_EXPORTED.
    // `verify:docs`'s prose scan covers this too and needs the tsc harness; this
    // one is cheap, runs in the fast docs test step, and names the row.
    const keys = Object.keys(uiManifest.exports);
    const isReal = (spec: string) => {
      if (spec === '@kitn.ai/ui') return keys.includes('.');
      const sub = `.${spec.slice('@kitn.ai/ui'.length)}`;
      return keys.includes(sub) || keys.some((k) => k.endsWith('/*') && sub.startsWith(k.slice(0, -1)));
    };

    // POSITIVE CONTROL for the URL filter above, and it is two-sided because a
    // filter is exactly where a real specifier gets swallowed. It must be
    // EXERCISED (the CDN section really does put a `@kitn.ai/ui/dist/...` path in
    // a URL) and it must drop NOTHING ELSE, or the reverse check has a blind spot.
    const unfiltered = [...new Set([...page.matchAll(/@kitn\.ai\/ui(?:\/[A-Za-z0-9._-]+)*/g)].map((m) => m[0]))];
    const dropped = unfiltered.filter((spec) => !specifiersOnPage().includes(spec));
    expect(
      dropped.length,
      'the specifier filter drops nothing now, so it is unexercised and could be hiding a real ' +
        'invented specifier. Re-check it, then drop the filter and this control together.',
    ).toBeGreaterThan(0);
    expect(
      dropped.filter((spec) => !spec.startsWith('@kitn.ai/ui/dist/')),
      'the filter is swallowing a specifier that is NOT a CDN asset path, so the check below is blind to it',
    ).toEqual([]);

    const invented = specifiersOnPage().filter((spec) => !isReal(spec));

    expect(
      invented,
      `the Installation page names specifiers the package does not export:\n  - ${invented.join('\n  - ')}`,
    ).toEqual([]);
  });

  it('keeps every declared exception pointing at a real exports key', () => {
    // An exception for a key that no longer exists is a waiver over nothing, and
    // it is how a carve-out outlives the thing it was carved for.
    const keys = Object.keys(uiManifest.exports);
    const stale = Object.keys(NOT_AN_IMPORT_TO_RECOMMEND).filter((key) => !keys.includes(key));
    expect(
      stale,
      `these exceptions name exports keys the package does not have any more, so they waive ` +
        `nothing: ${stale.join(', ')}. Drop them.`,
    ).toEqual([]);
    for (const [key, reason] of Object.entries(NOT_AN_IMPORT_TO_RECOMMEND)) {
      expect(reason.length, `${key} is excepted without a reason`).toBeGreaterThan(20);
    }
  });
});
