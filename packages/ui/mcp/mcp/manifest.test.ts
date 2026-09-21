/**
 * manifest.test.ts — that the MCP reads THIS package's Custom Elements Manifest.
 *
 * This is a test about a verification bug, so it is worth saying what it is for.
 * `resolveManifestPath()` used to walk up ten parent directories and take the first
 * `dist/custom-elements.json` it found. From an agent git worktree that climbed out
 * of the worktree and bound to the primary checkout's copy — six weeks stale, 78
 * tags, no `cardSchemas` — and the consequence was NOT an error. It was sixteen of
 * seventeen tests in reference.test.ts PASSING against a tree nobody was working in.
 *
 * A test that reads whatever artifact it can find proves nothing about the tree it
 * is running on, so the assertions below are chosen to be ones a search cannot
 * satisfy:
 *
 *   • the DECOY test puts a manifest exactly where a search would find it (beside the
 *     origin, and again above the package) and requires the resolution to ignore both
 *     and return the installed package's own file. That is the regression case for the
 *     sibling hop the bundled bin used to rely on.
 *   • the IMPOSTOR test resolves a directory NAMED `@kitn.ai/ui` whose package.json
 *     calls itself something else, and requires a throw — "found a file" and "found the
 *     right file" are different facts, and only an identity check separates them.
 *   • the live test pins the real answer INSIDE this package, proving its own anchor
 *     first so the comparison is not two copies of the same arithmetic.
 *
 * They also fail on an unbuilt tree, on purpose. That is the point: the old code
 * succeeded there, which is the one outcome that must never happen again.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveManifestPath } from './manifest';

/**
 * This package's root, derived independently of the code under test and then PROVEN
 * rather than assumed. If the `package.json` here is not ours the anchor assertion
 * below fails first, so a comparison against it always means something.
 */
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Build `<tmp>/<...segments>` and write `content` there, creating parents. */
function writeAt(root: string, relative: string, content: string): string {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
  return target;
}

/** A scratch tree, cleaned up whether the body throws or not.
 *
 * `realpathSync` because macOS hands out `/var/folders/...` while Node's resolver and
 * every path it returns use the `/private/var/...` realpath: comparing the two spellings
 * of one directory fails for a reason that has nothing to do with the code under test. */
function inTempTree(body: (root: string) => void): void {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'kai-manifest-')));
  try {
    body(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const MANIFEST_JSON = JSON.stringify({ modules: [] });

/**
 * An installed `@kitn.ai/ui` under `root/node_modules`, the way a consumer has it:
 * its own package.json (with the `exports` key the address goes through) and a built
 * `dist/custom-elements.json`.
 */
function installPackage(
  root: string,
  over: { name?: string } = {},
): { packageRoot: string; manifest: string } {
  const packageRoot = join(root, 'node_modules', '@kitn.ai', 'ui');
  writeAt(
    packageRoot,
    'package.json',
    JSON.stringify({ name: over.name ?? '@kitn.ai/ui', exports: { './package.json': './package.json' } }),
  );
  const manifest = writeAt(packageRoot, join('dist', 'custom-elements.json'), MANIFEST_JSON);
  return { packageRoot, manifest };
}

/** A directory to resolve FROM: inside `root`, so Node's walk finds `root/node_modules`. */
function originIn(root: string): string {
  const origin = join(root, 'mine', 'mcp', 'mcp');
  mkdirSync(origin, { recursive: true });
  return origin;
}

describe('resolveManifestPath — the manifest is addressed, not searched for', () => {
  it('is anchored to a directory that really is the @kitn.ai/ui package root', () => {
    const pkg = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf-8')) as {
      name?: string;
    };
    expect(pkg.name, 'this test file is not three levels below the package root').toBe(
      '@kitn.ai/ui',
    );
  });

  // ── THE REGRESSION TEST ────────────────────────────────────────────────────
  // Two decoys, both where a search looks: beside the origin (the bundled-bin sibling
  // the resolution used to prefer) and above the package (the ten-deep walk-up). A
  // resolver that reintroduces either returns a decoy here; the only way to pass is to
  // address the installed package.
  it('ignores a decoy manifest beside the origin and above the package', () => {
    inTempTree((root) => {
      const { manifest } = installPackage(root);
      const origin = originIn(root);

      const siblingDecoy = writeAt(origin, 'custom-elements.json', MANIFEST_JSON);
      const aboveDecoy = writeAt(root, join('dist', 'custom-elements.json'), MANIFEST_JSON);
      // Anti-vacuity: both decoys exist on disk, so "returned the real one" cannot be
      // satisfied by the files simply being absent.
      expect(existsSync(siblingDecoy) && existsSync(aboveDecoy)).toBe(true);

      expect(resolveManifestPath(origin)).toBe(manifest);
    });
  });

  // ── "FOUND A FILE" IS NOT "FOUND THE RIGHT FILE" ───────────────────────────
  // Right directory name, real manifest on disk, wrong package. Node resolves the
  // specifier by DIRECTORY, so this resolves; only the package.json identity rejects it.
  it('THROWS when the resolved directory is some other package, even with a manifest present', () => {
    inTempTree((root) => {
      const { packageRoot: impostorRoot } = installPackage(root, { name: 'not-our-package' });
      writeAt(impostorRoot, join('dist', 'custom-elements.json'), MANIFEST_JSON);

      expect(() => resolveManifestPath(originIn(root))).toThrowError(
        new RegExp(`resolved to ${escapeRegExp(impostorRoot)}`),
      );
      let message = '';
      try {
        resolveManifestPath(originIn(root));
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message, 'the message must say why that directory is not this package').toMatch(
        /not @kitn\.ai\/ui/,
      );
    });
  });

  // The unbuilt tree, which is the case the old code got WRONG rather than missed.
  it('THROWS naming the missing artifact when the package is installed but not built', () => {
    inTempTree((root) => {
      const packageRoot_ = join(root, 'node_modules', '@kitn.ai', 'ui');
      writeAt(
        packageRoot_,
        'package.json',
        JSON.stringify({ name: '@kitn.ai/ui', exports: { './package.json': './package.json' } }),
      );
      const expected = join(packageRoot_, 'dist', 'custom-elements.json');

      expect(() => resolveManifestPath(originIn(root))).toThrowError(
        new RegExp(`Missing build artifact: ${escapeRegExp(expected)}`),
      );
      let message = '';
      try {
        resolveManifestPath(originIn(root));
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message, 'must say how to fix it').toMatch(/nx build ui|build:api/);
      expect(message, 'must not point anyone at a searched path').not.toContain('node_modules walk');
    });
  });

  // Nothing to address at all. ASSUMES the temp dir has no `@kitn.ai/ui` ancestor, which
  // is what makes the fixture hermetic: if that ever stops being true, this fails and
  // the message names the specifier, so the reader sees which assumption broke.
  it('THROWS naming the specifier when no such package is installed', () => {
    inTempTree((root) => {
      const origin = originIn(root);
      let message = '';
      try {
        resolveManifestPath(origin);
        throw new Error('resolveManifestPath returned a path with no package installed');
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain('@kitn.ai/ui/package.json');
      expect(message, 'must say the package has to be installed').toMatch(/INSTALLED/);
      expect(message, 'must state that nothing is searched').toMatch(/NOT search/);
    });
  });

  // The positive control. Without this the throws above would also pass if
  // resolveManifestPath threw unconditionally.
  it('resolves the manifest of a correctly shaped installed package', () => {
    inTempTree((root) => {
      const { manifest } = installPackage(root);
      expect(resolveManifestPath(originIn(root))).toBe(manifest);
    });
  });

  // ── THE LAYOUT THIS CHANGE EXISTS FOR ───────────────────────────────────────
  // The server bundle lives in `@kitn.ai/kai` and the manifest stays in `@kitn.ai/ui`,
  // so the resolving anchor is inside a DIFFERENT package's dist/. A resolution that
  // derived "my package root" or looked beside itself cannot pass this: the kit is
  // reachable only as an installed dependency.
  it("resolves the kit's manifest from another package's dist, the bundled-bin layout", () => {
    inTempTree((root) => {
      const { manifest } = installPackage(root);
      const kai = join(root, 'node_modules', '@kitn.ai', 'kai');
      writeAt(kai, 'package.json', JSON.stringify({ name: '@kitn.ai/kai' }));
      const bundleDir = join(kai, 'dist');
      mkdirSync(bundleDir, { recursive: true });

      expect(resolveManifestPath(bundleDir)).toBe(manifest);
    });
  });
});

describe('resolveManifestPath — the live tree', () => {
  // The structural claim, and the one that cannot be wrong: whatever this run read,
  // it came from inside this package. No artifact belonging to another checkout can
  // satisfy it, regardless of what is on disk anywhere else.
  //
  // It also throws on an unbuilt tree instead of quietly reading a neighbour's copy,
  // which is the behaviour the whole file exists to guarantee.
  it('reads this package own dist/, and fails loudly when it has not been built', () => {
    expect(resolveManifestPath()).toBe(join(packageRoot, 'dist', 'custom-elements.json'));
  });
});

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
