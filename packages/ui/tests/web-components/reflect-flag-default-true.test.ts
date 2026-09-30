/**
 * A `reflectFlag` prop must not default to `true`.
 *
 * `reflectFlag` writes the prop to its attribute, and `prop = false` REMOVES the
 * attribute. Attribute removal resets the prop to its declared default
 * (`installAttributeRemovalReset` in define.tsx), so with a default of `true` the
 * `false` would be undone straight away and the flag could never be turned off.
 *
 * Derived, not listed: the reflected names are read from the facade sources
 * (`reflectFlag('name'`), the tags from each file's `defineWebComponent(...)` call, the
 * defaults from `web-component-meta.json`. A shared helper that reflects on behalf of
 * facades (wireDisclosure) is attributed to every facade file that imports it.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import meta from '../../src/web-components/web-component-meta.json';

interface Source { path: string; text: string }
interface MetaEntry { tag: string; props: Array<{ name: string; default?: string }> }

export function reflectedTrueDefaults(sources: Source[], entries: MetaEntry[]): string[] {
  const reflected = (text: string) =>
    [...text.matchAll(/reflectFlag\(\s*['"]([A-Za-z0-9_]+)['"]/g)].map((m) => m[1]!);
  const tagsOf = (text: string) =>
    [...text.matchAll(/defineWebComponent(?:<[^(]*?>)?\(\s*['"]([a-z0-9-]+)['"]/g)].map((m) => m[1]!);
  const bad: string[] = [];
  const check = (tag: string, name: string, path: string) => {
    const prop = entries.find((e) => e.tag === tag)?.props.find((p) => p.name === name);
    if (prop && prop.default?.trim() === 'true') bad.push(`${tag}.${name} (reflectFlag in ${path})`);
  };
  for (const src of sources) {
    const names = reflected(src.text);
    if (names.length === 0) continue;
    const own = tagsOf(src.text);
    if (own.length > 0) {
      for (const tag of own) for (const n of names) check(tag, n, src.path);
    } else {
      // A helper: the importer's tags carry the prop.
      const stem = basename(src.path).replace(/\.[tj]sx?$/, '');
      for (const user of sources) {
        if (user === src || !new RegExp(`from\\s+['"][^'"]*/${stem}['"]`).test(user.text)) continue;
        for (const tag of tagsOf(user.text)) for (const n of names) check(tag, n, `${src.path} via ${user.path}`);
      }
    }
  }
  return bad;
}

function walk(dir: string, out: Source[] = []): Source[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(f) && !/\.(test|stories)\./.test(f)) out.push({ path: p, text: readFileSync(p, 'utf8') });
  }
  return out;
}

describe('reflectFlag props never default to true', () => {
  it('no shipped facade does', () => {
    const sources = walk(join(__dirname, '../../src/web-components')).filter((s) => !s.path.endsWith('define/define.tsx'));
    // Sanity: the scan actually sees reflectFlag call sites and tags.
    expect(sources.filter((s) => /reflectFlag\(\s*['"]/.test(s.text)).length).toBeGreaterThan(3);
    expect(reflectedTrueDefaults(sources, meta as unknown as MetaEntry[])).toEqual([]);
  });

  it('CATCHES a synthetic facade that reflects a prop defaulting to true', () => {
    const facade: Source = {
      path: 'fake.tsx',
      text: `defineWebComponent<{ open?: boolean }>('kai-fake', { open: true }, (p, { reflectFlag }) => { reflectFlag('open'); return null; });`,
    };
    const entries: MetaEntry[] = [{ tag: 'kai-fake', props: [{ name: 'open', default: 'true' }] }];
    expect(reflectedTrueDefaults([facade], entries)).toEqual(['kai-fake.open (reflectFlag in fake.tsx)']);
  });

  it('CATCHES it through a shared helper, and stays quiet for a false default', () => {
    const helper: Source = { path: 'x/disclosure.ts', text: `ctx.reflectFlag('open', src)` };
    const user: Source = {
      path: 'x/tool.tsx',
      text: `import { wireDisclosure } from './disclosure';\ndefineWebComponent('kai-fake2', {}, () => null)`,
    };
    const entries = (d: string): MetaEntry[] => [{ tag: 'kai-fake2', props: [{ name: 'open', default: d }] }];
    expect(reflectedTrueDefaults([helper, user], entries('true'))).toHaveLength(1);
    expect(reflectedTrueDefaults([helper, user], entries('false'))).toEqual([]);
  });
});
