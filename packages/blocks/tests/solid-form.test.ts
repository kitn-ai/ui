/**
 * The solid form: a `.tsx` component over the custom elements, plus a
 * `create<Name>()` store holding one `createSignal` over the controller's
 * snapshot.
 *
 * THE FOUR THINGS THAT ARE NOT OBVIOUS, each pinned below:
 *
 * 1. The template is gated on `ready` (`<Show>`), and the store emits the
 *    registration import AND the whenDefined await (spec 8b, amendment 7).
 * 2. A kai binding is a plain expression whose NAME IS VERBATIM. Solid resolves
 *    property-vs-attribute per ELEMENT at runtime, so camelizing -- which vue.ts
 *    has to do for its `.prop` modifier -- would break an authored `:aria-label`
 *    while fixing nothing. An event, though, needs Solid's `on:` prefix: `kai-*`
 *    events are custom, not delegated DOM events.
 * 3. A `="false"` or bare-boolean literal on a kai element becomes `{false}` /
 *    `{true}` (spec 8b, amendment 8 (F-10)): the attribute form stringifies.
 * 4. A `*for` becomes `<For>`, not `.map`, and the ref `let` lives INSIDE the
 *    component function.
 *
 * THE KAI TAGS DO NOT COMPILE WITHOUT A KIT-SIDE AUGMENTATION, and this file
 * pins that too rather than leaving it to the compile cell: Solid's
 * `JSX.IntrinsicElements` is a closed set of DOM tag interfaces with no index
 * signature, so `Property 'kai-dock' does not exist on type 'JSX.IntrinsicElements'`
 * (TS2339) is every emitted tree's first error until web-component-types.d.ts
 * gains a solid block beside its react, vue and svelte ones. Measured on
 * solid-js 1.9.13 under the consumer project this form compiles with.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BLOCK_FORMS, renderBlockForm, renderSolidForm } from '../src/forms';
import type { Block } from '../src/registry';

const FIXTURES = resolve(__dirname, 'fixtures');
const PAGE = readFileSync(join(FIXTURES, 'fixture.html'), 'utf8');
const CONTROLLER = readFileSync(join(FIXTURES, 'fixture.controller.ts'), 'utf8');

const block = (): Block => ({
  name: 'fixture',
  manifest: {
    name: 'fixture', title: 'F', description: 'f', type: 'registry:block',
    files: [
      { path: 'fixture.html', type: 'registry:page' },
      { path: 'fixture.controller.ts', type: 'registry:file' },
      { path: 'fixture.css', type: 'registry:file' },
    ],
  },
  files: new Map([
    ['fixture.html', PAGE],
    ['fixture.controller.ts', CONTROLLER],
    ['fixture.css', readFileSync(join(FIXTURES, 'fixture.css'), 'utf8')],
  ]),
});

const byPath = (files: { path: string; content: string }[]) => new Map(files.map((f) => [f.path, f.content]));
const withPage = (html: string): Block => {
  const b = block();
  (b.files as Map<string, string>).set('fixture.html', html);
  return b;
};

describe('the solid form', () => {
  it('emits the component, the store, the controller, the css and a README', () => {
    expect([...byPath(renderSolidForm(block())).keys()].sort()).toEqual([
      'Fixture.tsx', 'README.md', 'fixture.controller.ts', 'fixture.css', 'fixture.store.ts',
    ]);
  });

  it('targets every file at src/components/<id>/', () => {
    for (const file of renderSolidForm(block())) expect(file.target).toBe(`src/components/fixture/${file.path}`);
  });

  it('gates the tree on registration, and awaits the tags the ROOT renders', () => {
    const files = byPath(renderSolidForm(block()));
    const component = files.get('Fixture.tsx')!;
    const store = files.get('fixture.store.ts')!;
    expect(store).toContain("import '@kitn.ai/ui/web-components';");
    expect(store).toContain('customElements.whenDefined');
    // Derived from the fixture, not typed: every kai tag inside the block root,
    // sorted. `kai-dock`, `kai-conversations`, `kai-conversation-item`.
    expect(store).toContain(`const TAGS = ['kai-conversation-item', 'kai-conversations', 'kai-dock'];`);
    expect(component).toContain('<Show when={store.ready()}>');
    expect(component).toContain('</Show>');
  });

  it('matches vue.ts on the recursion: one printNode, one binding switch, the same five kinds', () => {
    // Not a shape assertion for its own sake: this is the property that made the
    // fourth renderer mechanical, so it is the one worth failing on.
    const component = byPath(renderSolidForm(block())).get('Fixture.tsx')!;
    // prop binding
    expect(component).toContain('unread={store.state().hidden}');
    // attr binding on a kai element: the same expression form
    expect(component).toContain('unread={row.unread}');
    // event binding, which needs Solid's on: prefix for a custom event
    expect(component).toContain('on:kai-click={store.actions.open}');
    // ref binding
    expect(component).toContain('ref={dock}');
    // seed binding, which does not collide here
    expect(component).toContain('position="bottom-end"');
  });

  it('binds the name VERBATIM, so an authored kebab attribute stays the attribute it was', () => {
    const component = byPath(
      renderSolidForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations :aria-label="title">'))),
    ).get('Fixture.tsx')!;
    expect(component).toContain('aria-label={store.state().title}');
  });

  it('translates a ="false" literal and a bare boolean on a kai element', () => {
    const component = byPath(
      renderSolidForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations searchable="false" compact>'))),
    ).get('Fixture.tsx')!;
    expect(component).toContain('searchable={false}');
    expect(component).toContain('compact={true}');
    // The guard has to exclude the bound spelling, or it could never pass
    // alongside the assertion above.
    expect(component).not.toMatch(/[^={]searchable="false"/);
  });

  it('renders .textContent as children and a *for as a <For>, not a .map', () => {
    const component = byPath(renderSolidForm(block())).get('Fixture.tsx')!;
    expect(component).toContain('{store.state().title}');
    expect(component).toContain('<For each={store.state().rows}>{(row) => (');
    expect(component).toContain(')}</For>');
    expect(component).toContain('{row.title}');
    // The loop item is read through the item, never through the store.
    expect(component).not.toMatch(/store\.state\(\)\.row\./);
    // `.map` would re-create every row on every notification, which is the
    // opposite of what the kai- reactivity contract asks of a list prop.
    expect(component).not.toContain('.map(');
  });

  it('imports For only when a *for exists, because noUnusedLocals is live', () => {
    const component = byPath(renderSolidForm(block())).get('Fixture.tsx')!;
    expect(component).toContain("import { For, Show, onCleanup, onMount } from 'solid-js';");
    const without = byPath(
      renderSolidForm(withPage(PAGE.replace(/<kai-conversations>[\s\S]*?<\/kai-conversations>/, '<kai-conversations></kai-conversations>'))),
    ).get('Fixture.tsx')!;
    expect(without).toContain("import { Show, onCleanup, onMount } from 'solid-js';");
    expect(without).not.toContain('For');
  });

  it('escapes {, }, < and > in text as expressions holding the character', () => {
    const component = byPath(
      renderSolidForm(withPage(PAGE.replace('<span .textContent="title"></span>', '<span>a {{ b }} &lt; c</span>'))),
    ).get('Fixture.tsx')!;
    expect(component).toContain("a {'{'}{'{'} b {'}'}{'}'} {'<'}" + ' c');
    expect(component).not.toContain('a {{ b }} < c');
  });

  it('takes a ref through a component-local ref={}, typed by the element interface the tag names', () => {
    const component = byPath(renderSolidForm(block())).get('Fixture.tsx')!;
    expect(component).toContain("import type { KaiDockElement } from '@kitn.ai/ui/web-components';");
    expect(component).toContain('let dock: KaiDockElement | undefined;');
    expect(component).toContain('createFixture(() => ({ dock: dock ?? null }))');
    // INSIDE the component: a module-scope `let` would be one handle shared by
    // every instance of the block.
    const componentBodyAt = component.indexOf('export function Fixture()');
    expect(component.indexOf('let dock:')).toBeGreaterThan(componentBodyAt);
    expect(component).not.toMatch(/\bas\s+Kai\w+Element\b/);
    expect(component).not.toMatch(/\bas\s+HTMLElement\b/);
  });

  it('emits the store as ONE signal over the controller snapshot', () => {
    const store = byPath(renderSolidForm(block())).get('fixture.store.ts')!;
    expect(store).toContain('createSignal<FixtureState>(controller.state())');
    expect(store).toContain('createController({ refs })');
    expect(store).toContain('controller.subscribe(');
    expect(store).toContain('void controller.actions.boot();');
    expect(store).toContain("from './fixture.controller'");
    expect(store).toContain("import { createSignal, type Accessor } from 'solid-js';");
  });

  it('runs the ready gate, then a flush, then boot(), in that order', () => {
    const store = byPath(renderSolidForm(block())).get('fixture.store.ts')!;
    const readyAt = store.indexOf('setReady(true);');
    const flushAt = store.indexOf('await Promise.resolve();');
    const bootAt = store.indexOf('void controller.actions.boot();');
    expect(readyAt).toBeGreaterThan(-1);
    expect(flushAt).toBeGreaterThan(readyAt);
    expect(bootAt).toBeGreaterThan(flushAt);
  });

  it('never drops a seed colliding with a binding on the same element: it applies in mount() instead', () => {
    const colliding = withPage(
      PAGE.replace(
        'seed:position="bottom-end" .unread="hidden"',
        'seed:position="bottom-end" seed:unread="true" .unread="hidden"',
      ),
    );
    const files = byPath(renderSolidForm(colliding));
    const component = files.get('Fixture.tsx')!;
    const store = files.get('fixture.store.ts')!;
    // Not a static attribute: the binding stands.
    expect(component).not.toContain('unread="true"');
    expect(component).toContain('unread={store.state().hidden}');
    // The other seed on the same element, which does not collide, is unaffected.
    expect(component).toContain('position="bottom-end"');
    // dock already has a #ref, so the seed reuses it rather than inventing one.
    expect(store).toContain("setAttribute('unread', 'true')");
    const flushAt = store.indexOf('await Promise.resolve();');
    const seedAt = store.indexOf("setAttribute('unread', 'true')");
    const bootAt = store.indexOf('void controller.actions.boot();');
    expect(seedAt).toBeGreaterThan(flushAt);
    expect(bootAt).toBeGreaterThan(seedAt);
  });

  it('invents a synthetic ref for a colliding seed on an element with no #ref', () => {
    const files = byPath(
      renderSolidForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations label="orig" seed:label="seeded">'))),
    );
    const component = files.get('Fixture.tsx')!;
    const store = files.get('fixture.store.ts')!;
    expect(component).toContain('label="orig"');
    expect(component).not.toMatch(/label="seeded"/);
    expect(component).toMatch(/let seedRef\d+: KaiConversationsElement \| undefined;/);
    expect(component).toMatch(/ref=\{seedRef\d+\}/);
    expect(store).toContain("setAttribute('label', 'seeded')");
    expect(store).toContain('seedRefs: () => Record<string, Element | null>');
  });

  it('cross-checks the bindings against the controller, as every other form does', () => {
    expect(() => renderSolidForm(withPage(PAGE.replace('@kai-click="open"', '@kai-click="nope"')))).toThrow(/nope/);
  });

  it('refuses a block with no controller, by the file name it wanted', () => {
    const b = block();
    (b.files as Map<string, string>).delete('fixture.controller.ts');
    expect(() => renderSolidForm(b)).toThrow(/fixture\.controller\.ts/);
  });

  it('is on the form axis, and the dispatch reaches it with no default case to hide behind', () => {
    // The registration is what widens every consumer of BLOCK_FORMS: the site's
    // dropdown, the compile-cell axis and the CLI's landing form all read this
    // list. `renderBlockForm`'s switch has no `default`, so the row and its case
    // are both required for the package to typecheck.
    expect(BLOCK_FORMS.map((f) => f.id)).toContain('solid');
    expect(renderBlockForm(block(), 'solid', { cdn: { version: 'test' } }).map((f) => f.path)).toContain('Fixture.tsx');
  });
});
