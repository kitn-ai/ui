// @vitest-environment node
//
// Regression guard: Svelte resolves a markup tag against `svelteHTML.IntrinsicElements`
// — the namespace svelte's own svelte-html.d.ts declares globally — and that
// interface's LAST member is `[name: string]: { [name: string]: any }`. So an
// unregistered kai-* tag and every attribute on it is `any`, and svelte-check
// checked NOTHING about a kai markup: vue has GlobalComponents, react has
// JSX.IntrinsicElements, svelte had neither. MEASURED by the block compile cell
// that owns the svelte delivery form (scripts/lib/block-compile-cells.mjs): a
// `<kai-button variant="solid">` — a value kai-button's own prop union does not
// contain — was a hard error in the vue and react cells and passed silently in the
// svelte one.
//
// The fix lives in scripts/gen-web-component-types.mjs's writeTypes(), which appends a
// `declare global { namespace svelteHTML { interface IntrinsicElements {…} } }`
// block plus one events interface per element to BOTH the tracked
// src/web-components/web-component-types.d.ts and the shipped dist/web-components.d.ts,
// generated from the same `elements` registry as every other block (no hand-copied
// tag list), and reusing the SAME per-element props interfaces the element and Vue
// blocks use.
//
// This test reads the TRACKED, checked-in src/web-components/web-component-types.d.ts (no
// build required). It cannot type-check a Svelte markup — that needs svelte-check
// against a real install, which is how the shape was established and what the
// compile cell does. What it CAN do is fail when the generated surface drifts from
// the web-component registry.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

function readWebComponentTypes(): string {
  return readFileSync(resolve(HERE, '../web-component-types.d.ts'), 'utf8');
}

interface WebComponentMeta {
  tag: string;
  className: string;
  props: { name: string }[];
  events: { name: string }[];
}

function readElements(): WebComponentMeta[] {
  return JSON.parse(readFileSync(resolve(HERE, '../web-component-meta.json'), 'utf8')) as WebComponentMeta[];
}

/** The `declare global { namespace svelteHTML { … } }` block to the end of the file. */
function svelteBlock(src: string): string {
  const i = src.indexOf('declare global {\n  namespace svelteHTML {');
  expect(i, `no "declare global { namespace svelteHTML" block in web-component-types.d.ts`).toBeGreaterThan(-1);
  return src.slice(i);
}

describe('svelte svelteHTML.IntrinsicElements augmentation for kai-* tags', () => {
  it('augments the global svelteHTML namespace from inside `declare global`', () => {
    // Load-bearing, and the reason this block does not look like the vue one:
    // `svelteHTML` is a GLOBAL namespace and web-component-types.d.ts is a MODULE
    // (it exports), so a bare `declare namespace svelteHTML` at file scope would be
    // module-scoped, merge with nothing, and type no tag. Measured both ways with
    // svelte-check: inside `declare global` a wrong attribute is an error; at file
    // scope it silently passes, which is the gap this block closes.
    const src = readWebComponentTypes();
    expect(src).toContain('declare global {\n  namespace svelteHTML {');
    expect(svelteBlock(src)).toContain('interface IntrinsicElements {');
  });

  it('every registered element tag has an entry, under the kebab name only', () => {
    // Svelte reads a capitalised tag as an imported COMPONENT rather than an
    // intrinsic element, so the PascalCase twin Volar needs for vue has no svelte
    // meaning: a `KaiChat` key here would be a key nothing can look up.
    const block = svelteBlock(readWebComponentTypes());
    const elements = readElements();
    expect(elements.length).toBeGreaterThan(0);

    for (const el of elements) {
      expect(block, `missing svelte IntrinsicElements entry for ${el.tag}`).toContain(`\n      '${el.tag}': KaiSvelteElement<`);
    }
  });

  it('each tag is typed by the SHARED props interface, not a second prop list', () => {
    // The same `propBody()` feeds the element interfaces and the Vue props
    // interfaces; svelte must read those, or a prop added to a facade would type in
    // two frameworks and not the third.
    const block = svelteBlock(readWebComponentTypes());
    for (const el of readElements()) {
      expect(block, `${el.tag} does not use ${el.className}Props`).toContain(
        `'${el.tag}': KaiSvelteElement<${el.className}Props, ${el.className}SvelteEvents>;`,
      );
    }
  });

  it('every web component has an events interface keyed by svelte handler attribute names', () => {
    // Measured against svelte-check: svelte's attribute form is `on` + the event
    // name VERBATIM — `onkai-submit`, which is what the svelte form emits
    // (`on${b.name}`, packages/blocks/src/forms/svelte.ts) and what the starter
    // writes by hand. Vue camelizes to `onKaiSubmit` and the React wrappers strip
    // the prefix, so the three transforms must not be conflated. The declared key
    // wins over `KaiElementSvelteProps`'s index signature, which is why a handler
    // with the wrong CustomEvent detail is an error rather than merely accepted.
    const src = readWebComponentTypes();
    for (const el of readElements()) {
      const start = src.indexOf(`export interface ${el.className}SvelteEvents {`);
      expect(start, `no svelte events interface for ${el.tag}`).toBeGreaterThan(-1);
      const body = src.slice(start, src.indexOf('\n}', start));
      for (const e of el.events) {
        expect(body, `${el.className}SvelteEvents is missing handler for "${e.name}"`).toContain(
          `\n  'on${e.name}'?: (event: CustomEvent`,
        );
      }
    }
  });

  it('the shared svelte types are declared locally, with no svelte-only identifier', () => {
    // No relative import may appear (that would drag library source into a
    // consumer's type graph), and no identifier may come from the real 'svelte'
    // module: this file loads for EVERY framework via
    // `import '@kitn.ai/ui/web-components'`, so it must stay inert for a consumer
    // with svelte uninstalled. Declaring a global namespace is legal there; naming
    // a type svelte owns is not.
    const src = readWebComponentTypes();
    expect(src).toContain('export interface KaiElementSvelteProps {');
    expect(src).toContain('export type KaiSvelteElement<Props, Events> = Partial<Props> & Events & KaiElementSvelteProps;');
    const block = svelteBlock(src);
    for (const forbidden of ['SvelteHTMLElements', 'HTMLAttributes<', 'import(']) {
      expect(block, `svelte block references svelte-only identifier "${forbidden}"`).not.toContain(forbidden);
    }
  });
});
