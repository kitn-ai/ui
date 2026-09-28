/**
 * The svelte form: a runes-mode `<script lang="ts">` component over the custom
 * elements, plus a `create<Name>()` store in a `.svelte.ts` module holding one
 * `$state` over the controller's snapshot.
 *
 * THE FOUR THINGS THAT ARE NOT OBVIOUS, each pinned below:
 *
 * 1. The template is gated on `ready`. Outside react, a generated form emits
 *    the registration import AND the whenDefined await (spec 8b, amendment 7):
 *    an element created before its definition lands discards a property set on
 *    it, and the upgrade does not put it back. Svelte's gate is an `{#if}` block
 *    around the root, not an attribute on it.
 * 2. A kai prop is bound as a plain expression, and the NAME IS VERBATIM.
 *    Svelte resolves property-vs-attribute per ELEMENT at runtime
 *    (`set_custom_element_data`), so camelizing the name -- which vue.ts has to
 *    do for its `.prop` modifier -- would break an authored `:aria-label` while
 *    fixing nothing.
 * 3. A `="false"` or bare-boolean literal on a kai element becomes `{false}` /
 *    `{true}` (spec 8b, amendment 8 (F-10)): the attribute form stringifies, and
 *    the element has no `boolean` field to put that string into.
 * 4. The store is `<name>.store.svelte.ts`, NOT `<name>.svelte.ts`. runes are
 *    legal in either, but svelte-check resolved `import … from './fixture.svelte'`
 *    to `Fixture.svelte` on a case-insensitive filesystem and reported the
 *    store's own export as missing from the component -- measured, not
 *    theorized.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BLOCK_FORMS, renderBlockForm, renderSvelteForm } from '../src/forms';
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

describe('the svelte form', () => {
  it('emits the component, the store, the controller, the css and a README', () => {
    expect([...byPath(renderSvelteForm(block())).keys()].sort()).toEqual([
      'Fixture.svelte', 'README.md', 'fixture.controller.ts', 'fixture.css', 'fixture.store.svelte.ts',
    ]);
  });

  it('targets every file at src/lib/components/<id>/', () => {
    for (const file of renderSvelteForm(block())) expect(file.target).toBe(`src/lib/components/fixture/${file.path}`);
  });

  it('gates the tree on registration, and awaits the tags the ROOT renders', () => {
    const files = byPath(renderSvelteForm(block()));
    const component = files.get('Fixture.svelte')!;
    const store = files.get('fixture.store.svelte.ts')!;
    expect(store).toContain("import '@kitn.ai/ui/web-components';");
    expect(store).toContain('customElements.whenDefined');
    // Derived from the fixture, not typed: every kai tag inside the block root,
    // sorted. `kai-dock`, `kai-conversations`, `kai-conversation-item`.
    expect(store).toContain(`const TAGS = ['kai-conversation-item', 'kai-conversations', 'kai-dock'];`);
    // The gate is a block around the root, because svelte has no attribute for it.
    expect(component).toContain('{#if store.ready}');
    expect(component).toContain('{/if}');
  });

  it('matches vue.ts on the recursion: one printNode, one binding switch, the same five kinds', () => {
    // Not a shape assertion for its own sake: this is the property that made the
    // second renderer mechanical, so it is the one worth failing on.
    const files = byPath(renderSvelteForm(block()));
    const component = files.get('Fixture.svelte')!;
    // prop binding
    expect(component).toContain('unread={store.state.hidden}');
    // attr binding on a kai element: the same expression form
    expect(component).toContain('unread={row.unread}');
    // event binding
    expect(component).toContain('onkai-click={store.actions.open}');
    // ref binding
    expect(component).toContain('bind:this={dock}');
    // seed binding, which does not collide here
    expect(component).toContain('position="bottom-end"');
  });

  it('binds the name VERBATIM, so an authored kebab attribute stays the attribute it was', () => {
    const component = byPath(renderSvelteForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations aria-label="threads">')))).get(
      'Fixture.svelte',
    )!;
    expect(component).toContain('aria-label="threads"');
  });

  it('translates a ="false" literal and a bare boolean on a kai element', () => {
    const component = byPath(
      renderSvelteForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations searchable="false" compact>'))),
    ).get('Fixture.svelte')!;
    expect(component).toContain('searchable={false}');
    expect(component).toContain('compact={true}');
    // No UN-bound literal survives, with a word boundary: `searchable="false"` is
    // a substring of `searchable={false}`? No -- and the vue test's version of
    // this guard had to add the boundary precisely because a plain substring
    // check can be unsatisfiable. Here it can actually fire on the defect.
    expect(component).not.toMatch(/searchable="false"/);
  });

  it('renders .textContent as children and a *for as a keyed {#each}', () => {
    const component = byPath(renderSvelteForm(block())).get('Fixture.svelte')!;
    expect(component).toContain('{store.state.title}');
    expect(component).toContain('{#each store.state.rows as row (row.id)}');
    expect(component).toContain('{/each}');
    expect(component).toContain('{row.title}');
    // The loop item is read through the item, never through the store.
    expect(component).not.toMatch(/store\.state\.row\./);
  });

  it('escapes { in text, so a literal one does not open an expression', () => {
    const component = byPath(
      renderSvelteForm(withPage(PAGE.replace('<span .textContent="title"></span>', '<span>a {{ b }} &lt; c &amp; d &gt; e</span>'))),
    ).get('Fixture.svelte')!;
    // BOTH braces are encoded, which vue.ts does not do (it encodes only the
    // second of a pair): a LONE `{` opens an expression in Svelte just as well
    // as `{{` does, so every one is encoded. Svelte turns its text into an
    // `innerHTML` template, so the entity decodes back to `{` at render time and
    // the reader sees the authored characters -- measured on svelte 5.56, which
    // emits the text through `from_html`.
    expect(component).toContain('a &#123;&#123; b }} &lt; c &amp; d &gt; e');
    expect(component).not.toContain('a {{ b }} < c & d > e');
  });

  it('takes a ref through bind:this, typed by the element interface the tag names', () => {
    const component = byPath(renderSvelteForm(block())).get('Fixture.svelte')!;
    expect(component).toContain("import type { KaiDockElement } from '@kitn.ai/ui/web-components';");
    // `| null`, not `| undefined`: the controller's Refs declares `T | null`, and
    // svelte-check rejects `T | undefined` against it. Measured.
    expect(component).toContain('let dock: KaiDockElement | null = null;');
    expect(component).toContain('createFixture(() => ({ dock }))');
    // No cast anywhere: bind:this writes the element interface the tag names.
    expect(component).not.toMatch(/\bas\s+Kai\w+Element\b/);
    expect(component).not.toMatch(/\bas\s+HTMLElement\b/);
  });

  it('emits the store as ONE $state over the controller snapshot', () => {
    const store = byPath(renderSvelteForm(block())).get('fixture.store.svelte.ts')!;
    expect(store).toContain('let state = $state<FixtureState>(controller.state());');
    expect(store).toContain('createController({ refs })');
    expect(store).toContain('controller.subscribe(');
    expect(store).toContain('void controller.actions.boot();');
    expect(store).toContain("from './fixture.controller'");
    // The .svelte.ts extension is what makes the rune legal in a module at all.
    expect(store).toContain("import { tick } from 'svelte';");
  });

  it('runs the ready gate, then tick(), then boot(), in that order', () => {
    const store = byPath(renderSvelteForm(block())).get('fixture.store.svelte.ts')!;
    const readyAt = store.indexOf('ready = true;');
    const tickAt = store.indexOf('await tick();');
    const bootAt = store.indexOf('void controller.actions.boot();');
    expect(readyAt).toBeGreaterThan(-1);
    expect(tickAt).toBeGreaterThan(readyAt);
    expect(bootAt).toBeGreaterThan(tickAt);
  });

  it('never drops a seed colliding with a binding on the same element: it applies in mount() instead', () => {
    // Controller ruling B2-T3-a, carried here: two writers of one name on one
    // element is an ordering problem the author cannot see, and the ruling says
    // the seed applies once, after the tree is live and before boot().
    const colliding = withPage(
      PAGE.replace(
        'seed:position="bottom-end" .unread="hidden"',
        'seed:position="bottom-end" seed:unread="true" .unread="hidden"',
      ),
    );
    const files = byPath(renderSvelteForm(colliding));
    const component = files.get('Fixture.svelte')!;
    const store = files.get('fixture.store.svelte.ts')!;
    // Not a static attribute: the binding stands.
    expect(component).not.toContain('unread="true"');
    expect(component).toContain('unread={store.state.hidden}');
    // The other seed on the same element, which does not collide, is unaffected.
    expect(component).toContain('position="bottom-end"');
    // dock already has a #ref, so the seed reuses it rather than inventing one.
    expect(store).toContain("setAttribute('unread', 'true')");
    const tickAt = store.indexOf('await tick();');
    const seedAt = store.indexOf("setAttribute('unread', 'true')");
    const bootAt = store.indexOf('void controller.actions.boot();');
    expect(seedAt).toBeGreaterThan(tickAt);
    expect(bootAt).toBeGreaterThan(seedAt);
  });

  it('invents a synthetic ref for a colliding seed on an element with no #ref', () => {
    const files = byPath(
      renderSvelteForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations label="orig" seed:label="seeded">'))),
    );
    const component = files.get('Fixture.svelte')!;
    const store = files.get('fixture.store.svelte.ts')!;
    expect(component).toContain('label="orig"');
    expect(component).not.toMatch(/label="seeded"/);
    expect(component).toMatch(/let seedRef\d+: KaiConversationsElement \| null = null;/);
    expect(component).toMatch(/bind:this=\{seedRef\d+\}/);
    expect(store).toContain("setAttribute('label', 'seeded')");
    expect(store).toContain('seedRefs: () => Record<string, Element | null>');
  });

  it('cross-checks the bindings against the controller, as every other form does', () => {
    expect(() => renderSvelteForm(withPage(PAGE.replace('@kai-click="open"', '@kai-click="nope"')))).toThrow(/nope/);
  });

  it('refuses a block with no controller, by the file name it wanted', () => {
    const b = block();
    (b.files as Map<string, string>).delete('fixture.controller.ts');
    expect(() => renderSvelteForm(b)).toThrow(/fixture\.controller\.ts/);
  });

  it('is on the form axis, and the dispatch reaches it with no default case to hide behind', () => {
    // The registration is what widens every consumer of BLOCK_FORMS: the site's
    // dropdown, the compile-cell axis and the CLI's landing form all read this
    // list. `renderBlockForm`'s switch has no `default`, so the row and its case
    // are both required for the package to typecheck.
    expect(BLOCK_FORMS.map((f) => f.id)).toContain('svelte');
    expect(renderBlockForm(block(), 'svelte', { cdn: { version: 'test' } }).map((f) => f.path)).toContain('Fixture.svelte');
  });
});
