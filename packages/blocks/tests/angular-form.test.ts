/**
 * The angular form: a standalone component whose template is a string in the
 * class file, plus a `create<Name>()` store holding one Angular `signal` over
 * the controller's snapshot.
 *
 * THE FOUR THINGS THAT ARE NOT OBVIOUS, each pinned below:
 *
 * 1. The template is gated on `ready` (`@if`), and the store emits the
 *    registration import AND the whenDefined await (spec 8b, amendment 7): an
 *    element created before its definition lands discards a property set on it,
 *    and the upgrade does not put it back.
 * 2. Every binding is a PROPERTY binding on a kai element (`[unread]=`), even
 *    for an authored `:attr`, because an attribute stringifies and the
 *    element's declared prop is boolean (spec 8b, amendment 8 (F-10)). The name
 *    is CAMELIZED, since a property binding matches the element's JS property.
 * 3. `appRef.tick()` sits BETWEEN the gate and boot(): Angular's render is
 *    synchronous and explicit here, so the refs exist before boot() reads them.
 * 4. A colliding seed applies from the store's mount step (controller ruling
 *    B2-T3-a).
 *
 * WHAT THIS FORM CANNOT PIN, and says so rather than implying otherwise: the
 * kai- tag's ATTRIBUTES are not type-checked in an Angular template at all. The
 * `CUSTOM_ELEMENTS_SCHEMA` that admits the tag is the switch that turns the
 * checking off -- measured with the real `ngc` on 22.0.5, and documented at
 * `angularCell` in packages/ui/scripts/lib/block-compile-cells.mjs.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BLOCK_FORMS, renderAngularForm, renderBlockForm } from '../src/forms';
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

describe('the angular form', () => {
  it('emits the component, the store, the controller, the css and a README', () => {
    expect([...byPath(renderAngularForm(block())).keys()].sort()).toEqual([
      'Fixture.ts', 'README.md', 'fixture.controller.ts', 'fixture.css', 'fixture.store.ts',
    ]);
  });

  it('targets every file at src/app/components/<id>/', () => {
    for (const file of renderAngularForm(block())) expect(file.target).toBe(`src/app/components/fixture/${file.path}`);
  });

  it('gates the template on registration, and awaits the tags the ROOT renders', () => {
    const files = byPath(renderAngularForm(block()));
    const component = files.get('Fixture.ts')!;
    const store = files.get('fixture.store.ts')!;
    expect(store).toContain("import '@kitn.ai/ui/web-components';");
    expect(store).toContain('customElements.whenDefined');
    // Derived from the fixture, not typed: every kai tag inside the block root,
    // sorted. `kai-dock`, `kai-conversations`, `kai-conversation-item`.
    expect(store).toContain(`const TAGS = ['kai-conversation-item', 'kai-conversations', 'kai-dock'];`);
    expect(component).toContain('@if (store.ready()) {');
  });

  it('carries the stylesheets as styleUrls, never as side-effect imports', () => {
    // Measured with ngc: `import './fixture.css'` is TS2882 in a real Angular
    // project -- no ambient types declare *.css there, and Angular's mechanism
    // for a component's own styles is the decorator's styleUrls.
    const component = byPath(renderAngularForm(block())).get('Fixture.ts')!;
    expect(component).toContain("styleUrls: ['./fixture.css'],");
    expect(component).not.toContain("import './fixture.css';");
  });

  it('declares CUSTOM_ELEMENTS_SCHEMA, without which no kai- tag passes the template compiler', () => {
    const component = byPath(renderAngularForm(block())).get('Fixture.ts')!;
    expect(component).toContain('schemas: [CUSTOM_ELEMENTS_SCHEMA],');
    expect(component).toContain('CUSTOM_ELEMENTS_SCHEMA,');
  });

  it('matches vue.ts on the recursion: one printNode, one binding switch, the same five kinds', () => {
    // Not a shape assertion for its own sake: this is the property that made the
    // third and fourth renderers mechanical, so it is the one worth failing on.
    const component = byPath(renderAngularForm(block())).get('Fixture.ts')!;
    // prop binding
    expect(component).toContain('[unread]="store.state().hidden"');
    // attr binding on a kai element: the same expression form
    expect(component).toContain('[unread]="row.unread"');
    // event binding: a STATEMENT, so the action is called
    expect(component).toContain('(kai-click)="store.actions.open()"');
    // ref binding
    expect(component).toContain('#dock');
    // seed binding, which does not collide here
    expect(component).toContain('position="bottom-end"');
  });

  it('passes $event to an action that declares a parameter, and nothing to one that does not', () => {
    // Found by the real cell, not by reading: the kit's own blocks ship both
    // shapes, and a template binding is a STATEMENT, so the generated template is
    // the caller. `(kai-submit)="...submit()"` is TS2554 on a one-parameter
    // action; `(kai-click)="...close($event)"` is TS2554 on a no-parameter one.
    // The dock keeps the no-parameter `open()`; the conversations element gets
    // the one that takes the event.
    const withParam = withPage(PAGE.replace('@kai-click="open"', '@kai-submit="submit"').replace('<kai-conversations>', '<kai-conversations @kai-click="open">'));
    const b = withParam;
    (b.files as Map<string, string>).set(
      'fixture.controller.ts',
      CONTROLLER.replace('open(): void;', 'open(): void;\n  submit(event: CustomEvent): void;'),
    );
    const component = byPath(renderAngularForm(b)).get('Fixture.ts')!;
    expect(component).toContain('(kai-click)="store.actions.open()"');
    expect(component).toContain('(kai-submit)="store.actions.submit($event)"');
  });

  it('camelizes a kai binding name, so the property binding matches the element member', () => {
    // A kebab name would bind the JS property literally named `aria-label`,
    // which no element declares, and the write would be a silent no-op --
    // while a plain element keeps its authored spelling.
    const component = byPath(
      renderAngularForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations :aria-label="title">'))),
    ).get('Fixture.ts')!;
    expect(component).toContain('[ariaLabel]="store.state().title"');
    expect(component).not.toContain('[aria-label]=');
  });

  it('binds a plain element attribute through [attr.], which is how Angular writes an attribute', () => {
    const component = byPath(
      renderAngularForm(withPage(PAGE.replace('<span .textContent="title"></span>', '<span :title="title"></span>'))),
    ).get('Fixture.ts')!;
    expect(component).toContain('[attr.title]="store.state().title"');
  });

  it('translates a ="false" literal and a bare boolean on a kai element into property bindings', () => {
    const component = byPath(
      renderAngularForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations searchable="false" compact>'))),
    ).get('Fixture.ts')!;
    expect(component).toContain('[searchable]="false"');
    expect(component).toContain('[compact]="true"');
    // No UN-bound literal survives, with the word boundary that makes the check
    // able to fire: `searchable="false"` is a substring of `[searchable]="false"`
    // only after the dropped bracket, so the guard has to exclude that spelling.
    expect(component).not.toMatch(/[^]]searchable="false"/);
  });

  it('renders .textContent as an interpolation and a *for as a tracked @for', () => {
    const component = byPath(renderAngularForm(block())).get('Fixture.ts')!;
    expect(component).toContain('{{ store.state().title }}');
    expect(component).toContain('@for (row of store.state().rows; track row.id) {');
    expect(component).toContain('{{ row.title }}');
    // The loop item is read through the item, never through the store.
    expect(component).not.toMatch(/store\.state\(\)\.row\./);
    // Angular 17+ REQUIRES the track expression; without it the template is a
    // hard compiler error and the form is a wall of diagnostics.
    expect(component).toContain('; track row.id) {');
  });

  it('escapes every { in text, so a literal one does not open an interpolation', () => {
    const component = byPath(
      renderAngularForm(withPage(PAGE.replace('<span .textContent="title"></span>', '<span>a {{ b }} &lt; c &amp; d &gt; e</span>'))),
    ).get('Fixture.ts')!;
    // EVERY brace is encoded, where vue.ts encodes only the second of a pair: a
    // LONE `{` is how a text node reaches Angular's interpolation parser too.
    // Angular's tokenizer decodes the numeric entity in text, so the reader sees
    // the authored characters.
    expect(component).toContain('a &#123;&#123; b }} &lt; c &amp; d &gt; e');
    expect(component).not.toContain('a {{ b }} < c & d > e');
  });

  it('escapes a backtick and a ${ in the markup, which is a JS template literal in this form alone', () => {
    // Angular's `template:` is the one place here that authored markup sits
    // inside a JS string, so a block whose copy carries a backtick would
    // otherwise emit a file that does not parse.
    const component = byPath(
      renderAngularForm(withPage(PAGE.replace('<span .textContent="title"></span>', '<span>a ` b ${ c</span>'))),
    ).get('Fixture.ts')!;
    // The backtick gets the template-literal escape; the `{` of the `${` is
    // already encoded by the text escaper, which is what keeps it from opening
    // an interpolation AND from ending the literal.
    expect(component).toContain('a \\` b $&#123; c');
  });

  it('takes a ref through viewChild, typed by the element interface the tag names', () => {
    const component = byPath(renderAngularForm(block())).get('Fixture.ts')!;
    expect(component).toContain("import type { KaiDockElement } from '@kitn.ai/ui/web-components';");
    expect(component).toContain("readonly dock = viewChild<ElementRef<KaiDockElement>>('dock');");
    expect(component).toContain('dock: this.dock()?.nativeElement ?? null');
    // No cast anywhere: viewChild's ElementRef carries the element interface.
    expect(component).not.toMatch(/\bas\s+Kai\w+Element\b/);
    expect(component).not.toMatch(/\bas\s+HTMLElement\b/);
  });

  it('emits the store as ONE signal over the controller snapshot', () => {
    const store = byPath(renderAngularForm(block())).get('fixture.store.ts')!;
    expect(store).toContain('const state = signal<FixtureState>(controller.state());');
    expect(store).toContain('createController({ refs })');
    expect(store).toContain('controller.subscribe(');
    expect(store).toContain('state: state.asReadonly(),');
    expect(store).toContain("from './fixture.controller'");
  });

  it('runs mount(), then a synchronous render, then boot(), in that order', () => {
    // The one ordering Angular owns that the other three forms do not have to
    // state: the refs only exist after the gate has rendered, and `tick()` is
    // that render.
    const component = byPath(renderAngularForm(block())).get('Fixture.ts')!;
    const mountAt = component.indexOf('await this.store.mount();');
    const tickAt = component.indexOf('this.appRef.tick();');
    const bootAt = component.indexOf('void this.store.actions.boot();');
    expect(mountAt).toBeGreaterThan(-1);
    expect(tickAt).toBeGreaterThan(mountAt);
    expect(bootAt).toBeGreaterThan(tickAt);
  });

  it('never drops a seed colliding with a binding on the same element: it applies after the render, before boot()', () => {
    // Controller ruling B2-T3-a, carried here: two writers of one name on one
    // element is an ordering problem the author cannot see, and the ruling says
    // the seed applies once, after the tree is live and before boot().
    const colliding = withPage(
      PAGE.replace(
        'seed:position="bottom-end" .unread="hidden"',
        'seed:position="bottom-end" seed:unread="true" .unread="hidden"',
      ),
    );
    const files = byPath(renderAngularForm(colliding));
    const component = files.get('Fixture.ts')!;
    const store = files.get('fixture.store.ts')!;
    expect(component).not.toContain('unread="true"');
    expect(component).toContain('[unread]="store.state().hidden"');
    // The other seed on the same element, which does not collide, is unaffected.
    expect(component).toContain('position="bottom-end"');
    // dock already has a #ref, so the seed reuses it rather than inventing one.
    expect(store).toContain("setAttribute('unread', 'true')");
    expect(store).toContain('applySeeds()');
    const tickAt = component.indexOf('this.appRef.tick();');
    const seedAt = component.indexOf('this.store.applySeeds();');
    const bootAt = component.indexOf('void this.store.actions.boot();');
    expect(seedAt).toBeGreaterThan(tickAt);
    expect(bootAt).toBeGreaterThan(seedAt);
  });

  it('invents a synthetic ref for a colliding seed on an element with no #ref', () => {
    const files = byPath(
      renderAngularForm(withPage(PAGE.replace('<kai-conversations>', '<kai-conversations label="orig" seed:label="seeded">'))),
    );
    const component = files.get('Fixture.ts')!;
    const store = files.get('fixture.store.ts')!;
    expect(component).toContain('label="orig"');
    expect(component).not.toMatch(/label="seeded"/);
    expect(component).toMatch(/readonly seedRef\d+ = viewChild<ElementRef<KaiConversationsElement>>\('seedRef\d+'\);/);
    // Bracket access: `seedRefs` is a Record, and a real `ng new` turns on
    // noPropertyAccessFromIndexSignature, where a dotted read is TS4111.
    expect(store).toMatch(/seedTargets\['seedRef\d+'\]/);
    expect(component).toMatch(/#seedRef\d+/);
    expect(store).toContain("setAttribute('label', 'seeded')");
    expect(store).toContain('seedRefs: () => Record<string, Element | null>');
  });

  it('cross-checks the bindings against the controller, as every other form does', () => {
    expect(() => renderAngularForm(withPage(PAGE.replace('@kai-click="open"', '@kai-click="nope"')))).toThrow(/nope/);
  });

  it('refuses a block with no controller, by the file name it wanted', () => {
    const b = block();
    (b.files as Map<string, string>).delete('fixture.controller.ts');
    expect(() => renderAngularForm(b)).toThrow(/fixture\.controller\.ts/);
  });

  it('names the schema, and what it costs, in the README', () => {
    const readme = byPath(renderAngularForm(block())).get('README.md')!;
    expect(readme).toContain('CUSTOM_ELEMENTS_SCHEMA');
    expect(readme).toContain('<app-fixture></app-fixture>');
  });

  it('is on the form axis, and the dispatch reaches it with no default case to hide behind', () => {
    // The registration is what widens every consumer of BLOCK_FORMS: the site's
    // dropdown, the compile-cell axis and the CLI's landing form all read this
    // list. `renderBlockForm`'s switch has no `default`, so the row and its case
    // are both required for the package to typecheck.
    expect(BLOCK_FORMS.map((f) => f.id)).toContain('angular');
    expect(renderBlockForm(block(), 'angular', { cdn: { version: 'test' } }).map((f) => f.path)).toContain('Fixture.ts');
  });
});
