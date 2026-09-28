/**
 * The angular delivery form: a standalone component over the custom elements
 * plus a `create<Name>()` store holding one Angular `signal` over the
 * controller's snapshot.
 *
 * THE SAME STRUCTURE AS vue.ts (which is the same as svelte.ts): a
 * `printNode(node, pad, scope, emit)` recursion over the root, a `bindingAttr`
 * switch over the five binding kinds, and a `literalAttr` for authored
 * attributes. What differs, and why, is documented at each function below.
 *
 * THE TEMPLATE IS GATED ON `ready`. Outside react, a generated form needs the
 * registration import AND the whenDefined await (spec 8b, amendment 7): an
 * element created before its definition lands discards a property set on it,
 * and custom-element upgrade does not put it back. Angular's gate is an `@if`
 * block around the root -- the svelte form's shape, because Angular has no
 * attribute for it either.
 *
 * THE TEMPLATE'S ATTRIBUTES ARE NOT TYPE-CHECKED, and that is Angular's
 * structure rather than a gap this form can close (measured with the real
 * compiler, `@angular/compiler-cli`'s `ngc`, on 22.0.5):
 *
 *   - WITHOUT `CUSTOM_ELEMENTS_SCHEMA`, every kai- tag is hard error NG8001
 *     ("'kai-button' is not a known element") and every binding NG8002
 *     ("Can't bind to 'notAKaiProp' since it isn't a known property of
 *     'kai-button'"), so the tag cannot appear at all.
 *   - WITH it, the same file compiles with ZERO diagnostics -- including
 *     `variant="solid"` and `[notAKaiProp]="1"`, the two literals the vue,
 *     react and svelte cells all reject.
 *   - A genuine type error in the class still reports (TS2322), so that green
 *     is not ngc sitting out.
 *
 * Angular resolves a template element name through its own
 * `ElementSchemaRegistry`, not through a global type namespace, so there is no
 * `declare global` / `declare module 'angular'` hook to add the way react has
 * `JSX.IntrinsicElements`, vue `GlobalComponents` and svelte
 * `svelteHTML.IntrinsicElements`. The schema that lets the tag in IS the switch
 * that turns the checking off. The scaffold gate's `angularStructureCheck`
 * covers the part this cannot, and says so at its own site.
 */
import { fileTarget } from '../targets';
import { README_FILE, renderReadme } from './readme';
import { applyDataMode, DEFAULT_DATA_MODE } from './wiring';
import { camel, carriedFiles, elementInterface, escapeAttr, isKai, parseBlock } from './emit';
import type { Block, DataMode } from '../registry';
import type { Binding, FormFile, TemplateNode } from '../contract/types';

/** The store binding the template reads state through. It is the STORE object,
 *  not a bare `state` like vue's: the state is an Angular signal, so every read
 *  is a CALL (`store.state().title`), and a template cannot reach a signal
 *  through an intermediate plain object without one. */
const STORE = 'store';

const read = (value: string, scope: string | undefined): string =>
  scope && value.startsWith(`${scope}.`) ? value : `${STORE}.state().${value}`;

/** A JS single-quoted string literal, for the store's own `setAttribute` calls
 *  (a JS context, not an HTML attribute -- `escapeAttr` is the wrong escaper). */
const jsString = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Literal text in the markup.
 *
 * `&` first, or the ampersand of an entity this function itself introduced
 * gets escaped twice. `<` and `>` because Angular's template parser is an HTML
 * parser: a bare `<` opens a tag the way it would in any hand-authored
 * template. EVERY `{` is encoded, where vue.ts encodes only the second of a
 * `{{` pair and react emits an expression holding the character: `{{` opens an
 * interpolation for Angular's parser, and a lone `{` inside a text node is how
 * you get there. Angular's tokenizer decodes a numeric entity in TEXT, so the
 * authored character is what renders (`_decodeEntity`, @angular/compiler's own
 * parser) -- the same route svelte's `&#123;` takes through its `from_html`
 * template.
 */
function escapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;');
}

/** A comment's text. `-->` cannot occur in an AUTHORED HTML comment (the parser
 *  that read the page would have already closed the comment on it), but this is
 *  defensive in the same spirit as html.ts's binder escaping and the other two
 *  component renderers' comment guards: never trust that every path into a
 *  comment node went through that parser. */
function escapeComment(text: string): string {
  return text.replace(/-->/g, '--&gt;');
}

/**
 * The whole template is emitted as a single-quoted JS template literal, so the
 * three character sequences that would end it early are escaped: a backslash,
 * a backtick, and the `${` that opens an interpolation. ANGULAR'S `template:`
 * IS THE FIRST TIME a renderer here puts authored markup inside a JS string
 * (vue and svelte write it at file scope), so the text escape above is not
 * enough on its own -- a block whose copy contains a backtick would otherwise
 * emit a file that does not parse.
 */
function escapeTemplateLiteral(template: string): string {
  return template.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

/** The template NAME a binding lands on. Camel for a kai element: a property
 *  binding matches the element's own JS property, and that is camelCase. A
 *  kebab `[aria-label]` would set the JS property literally named `aria-label`,
 *  which no element declares, and the write would be a silent no-op. */
function propName(tag: string, name: string): string {
  return isKai(tag) ? camel(name) : name;
}

/** A literal attribute in the template.
 *
 * A bare boolean and a `="true"` / `="false"` on a KAI element become property
 * BINDINGS (spec 8b, amendment 8 (F-10)): the element's declared prop is
 * `boolean`, and an attribute stringifies -- `"false"` is a non-empty string,
 * which the element reads as true. On a plain element they stay attributes,
 * because that is what they are in HTML. */
function literalAttr(tag: string, name: string, value: string): string {
  if (!isKai(tag)) return value === '' ? name : `${name}="${escapeAttr(value)}"`;
  if (value === '') return `[${propName(tag, name)}]="true"`;
  if (value === 'true' || value === 'false') return `[${propName(tag, name)}]="${value}"`;
  return `${name}="${escapeAttr(value)}"`;
}

/** One binding as a template attribute. Seed lands here too, as a static
 *  attribute string, so it keeps its authored position among the element's
 *  other bindings instead of being sorted to a fixed slot.
 *
 *  AN EVENT IS A STATEMENT, so the action is CALLED. Where vue's `@kai-click=
 *  "actions.open"` and svelte's `onkai-click={store.actions.open}` hand the
 *  function over, an Angular event binding is a template statement and a bare
 *  reference there evaluates and discards it -- the click would do nothing. */
function bindingAttr(
  tag: string,
  b: Binding,
  scope: string | undefined,
  eventArg: (action: string) => string,
): string | null {
  switch (b.kind) {
    case 'prop':
      // `.textContent` is emitted as CHILDREN, never as a binding: it is not
      // an element property the template can bind, and it is silently wrong
      // (spec 8b, amendment 2).
      return b.name === 'textContent' ? null : `[${propName(tag, b.name)}]="${read(b.value, scope)}"`;
    case 'attr':
      // THE SAME as a `.prop` on a kai element, deliberately, and the react
      // renderer decided this first: an attribute stringifies, so a bound
      // `false` would write `unread="false"` and the element would read it as
      // true. On a plain element it is a real attribute binding -- `[attr.x]`
      // is Angular's own spelling for "write the ATTRIBUTE", which is what
      // `[x]` cannot do for a name lib.dom has no property for.
      return isKai(tag)
        ? `[${propName(tag, b.name)}]="${read(b.value, scope)}"`
        : `[attr.${b.name}]="${read(b.value, scope)}"`;
    case 'event':
      // THE EVENT IS PASSED WHEN THE ACTION DECLARES A PARAMETER, and only
      // then: this binding is a template STATEMENT, so the generated template is
      // the caller. The kit's blocks ship both shapes -- `submit(event:
      // CustomEvent)` needs `$event` (TS2554 without it) and `close(): void`
      // needs none (TS2554 WITH it) -- so the count comes from the controller,
      // through `shape.actionParams`, rather than from a guess at the
      // convention. The html binder passes the event to every action for the
      // same reason it can: it calls a JS function, where extra arguments are
      // legal.
      return `(${b.name})="${STORE}.actions.${b.value}(${eventArg(b.value)})"`;
    case 'ref':
      return `#${b.name}`;
    case 'seed':
      // A NON-colliding seed only: a seed whose target name is also claimed
      // by a prop/attr binding or a literal attribute on the same element is
      // filtered out of `node.bindings` before this runs (see `printNode`)
      // and applied through the store's mount step instead. A seed is written
      // once, and when nothing else on the element claims its name it stays a
      // plain static attribute, because nothing re-applies it (spec 8b,
      // amendment 5).
      return `${b.name}="${escapeAttr(b.value)}"`;
  }
}

/** A seed the markup cannot carry as a static attribute: something else on the
 *  same element already claims its name. `ref` names the template `#ref` (an
 *  existing one, or a synthetic one this renderer invents) the store's mount
 *  step writes through. */
interface CollidingSeed {
  ref: string;
  name: string;
  value: string;
}

interface Emit {
  collidingSeeds: CollidingSeed[];
  /** Synthetic ref name -> element interface, for an element with a
   *  colliding seed and no authored `#ref` to reuse. */
  extraRefs: Map<string, string>;
}

function printNode(
  node: TemplateNode,
  pad: string,
  scope: string | undefined,
  emit: Emit,
  eventArg: (action: string) => string,
): string {
  if (node.type === 'text') return `${pad}${escapeText(node.text.trim())}`;
  if (node.type === 'comment') return `${pad}<!--${escapeComment(node.text)}-->`;

  const tag = node.tag;
  const childScope = node.repeat ? node.repeat.item : scope;

  const boundNames = new Set(
    node.bindings.filter((b) => b.kind === 'prop' || b.kind === 'attr').map((b) => propName(tag, b.name)),
  );
  const literalAttrs = node.attrs
    .filter((a) => !boundNames.has(propName(tag, a.name)))
    .map((a) => literalAttr(tag, a.name, a.value));

  // CONTROLLER RULING B2-T3-a, carried to angular: a seed never disappears. A
  // seed sharing its target name with a prop/attr binding OR a literal
  // attribute on the SAME element cannot stay a static attribute -- that is a
  // second writer of one name whose winner is Angular's ordering rather than
  // the author's (vue's version of this is TS1117, two keys of one props
  // object) -- so it is applied instead as a one-time `setAttribute` on the
  // element's own view child, from the store's mount step, after the
  // ready-gated tree has rendered and before boot() (the order react's own
  // mount effect gives it; html and react apply every seed through their own
  // mount step too).
  const claimedNames = new Set([...boundNames, ...node.attrs.map((a) => propName(tag, a.name))]);
  const refBinding = node.bindings.find((b) => b.kind === 'ref');
  const collidingSeeds = node.bindings.filter((b) => b.kind === 'seed' && claimedNames.has(propName(tag, b.name)));
  let syntheticRef: string | undefined;
  if (collidingSeeds.length && !refBinding) {
    syntheticRef = `seedRef${node.marker}`;
    emit.extraRefs.set(syntheticRef, elementInterface(tag));
  }
  const seedRef = refBinding?.name ?? syntheticRef;
  for (const b of collidingSeeds) {
    emit.collidingSeeds.push({ ref: seedRef as string, name: b.name, value: b.value });
  }

  const bindingAttrs = node.bindings
    .filter((b) => !collidingSeeds.includes(b))
    .map((b) => bindingAttr(tag, b, childScope, eventArg))
    .filter((a): a is string => a !== null);

  const attrs = [
    ...(syntheticRef ? [`#${syntheticRef}`] : []),
    ...literalAttrs,
    ...bindingAttrs,
  ];

  const textBinding = node.bindings.find((b) => b.kind === 'prop' && b.name === 'textContent');

  // No attrs and a single text expression: the fully inline form, matching what
  // a hand-authored template looks like for a leaf node.
  if (attrs.length === 0 && textBinding) {
    return `${pad}<${tag}>{{ ${read(textBinding.value, childScope)} }}</${tag}>`;
  }

  const childrenLines = textBinding
    ? [`${pad}  {{ ${read(textBinding.value, childScope)} }}`]
    : node.children.map((c) => printNode(c, `${pad}  `, childScope, emit, eventArg)).filter(Boolean);

  let element: string;
  if (attrs.length === 0) {
    element =
      childrenLines.length === 0
        ? `${pad}<${tag}></${tag}>`
        : `${pad}<${tag}>\n${childrenLines.join('\n')}\n${pad}</${tag}>`;
  } else {
    const open = `${pad}<${tag}\n${attrs.map((a) => `${pad}  ${a}`).join('\n')}\n${pad}>`;
    element = childrenLines.length === 0 ? `${open}\n${pad}</${tag}>` : `${open}\n${childrenLines.join('\n')}\n${pad}</${tag}>`;
  }

  // The `*for` analogue: one `@for` block per repeated element, tracked by the
  // declared key expression -- Angular 17+ REQUIRES a `track`, and the authored
  // `:key` is exactly the identity the block declared, so it is the only honest
  // answer. The loop item is the block's own scope, so a node inside it reads
  // `row.title` while everything else still reads the store.
  if (node.repeat) {
    return `${pad}@for (${node.repeat.item} of ${read(node.repeat.list, scope)}; track ${read(node.repeat.key, childScope)}) {\n${element}\n${pad}}`;
  }
  return element;
}

export interface AngularFormOptions {
  /** Which data mode this tree is for; the scripted mock is the default. */
  mode?: DataMode;
}

export function renderAngularForm(block: Block, opts: AngularFormOptions = {}): FormFile[] {
  // The seam is resolved ONCE, at the top, exactly as vue.ts does it: from here
  // down the tree describes one mode, and the loop that carries the manifest's
  // files carries the right one.
  const source = applyDataMode(block, opts.mode ?? DEFAULT_DATA_MODE);
  const parsed = parseBlock(source, 'angular');
  const { name, root, tags, refTypes } = parsed;

  const emit: Emit = { collidingSeeds: [], extraRefs: new Map() };
  // `$event` is Angular's spelling for the event object a template binding is
  // handed, and WHETHER the action gets one is per-action: the count comes from
  // the controller through `shape.actionParams`, because both shapes ship in the
  // kit's own blocks (`submit(event): void` and `close(): void`) and the
  // generated template is the caller of both.
  const eventArg = (action: string): string => ((parsed.shape.actionParams[action] ?? 0) > 0 ? '$event' : '');
  const body = printNode(root, '  ', undefined, emit, eventArg);

  const refEntries = [...refTypes.entries()];
  const extraRefEntries = [...emit.extraRefs.entries()];
  const allRefEntries = [...refEntries, ...extraRefEntries];
  const refImports = [...new Set(allRefEntries.map(([, type]) => type).filter((t) => t !== 'HTMLElement'))].sort();
  // Every distinct ref a colliding seed applies through, whether that ref is
  // ALSO part of the controller's declared Refs (an authored `#ref`) or a
  // synthetic one this renderer invented for an element that had none. A
  // separate object literal from the controller's own `refs()` call: mixing a
  // synthetic key into that one would fail Refs' excess-property check, since
  // it is typed to exactly `${name}Refs`.
  const seedRefNames = [...new Set(emit.collidingSeeds.map((s) => s.ref))].sort();

  // `viewChild`, not `viewChild.required`: the tree it queries is behind the
  // ready gate, so the signal is legitimately `undefined` until the gate opens.
  // `ElementRef<T>` -- a `.nativeElement` typed by the element interface the tag
  // names, from the SAME derivation as the other three forms.
  const component = [
    `// GENERATED by @kitn.ai/blocks from ${parsed.pagePath} and ${parsed.controllerPath}.`,
    `// It is your code now: edit freely, and regenerate to start over.`,
    `import {`,
    `  ApplicationRef,`,
    `  ChangeDetectionStrategy,`,
    `  Component,`,
    `  CUSTOM_ELEMENTS_SCHEMA,`,
    `  inject,`,
    ...(allRefEntries.length ? [`  viewChild,`, `  type ElementRef,`] : []),
    `  type OnDestroy,`,
    `} from '@angular/core';`,
    ...(refImports.length ? [`import type { ${refImports.join(', ')} } from '@kitn.ai/ui/web-components';`] : []),
    `import { create${name} } from './${source.name}.store';`,
    '',
    `// THE STYLESHEETS ARE NOT IMPORTED. Angular's own mechanism is the`,
    `// decorator's \`styleUrls\`, and a bare \`import './x.css'\` is a side-effect`,
    `// import of a file no .d.ts describes -- ngc reports TS2882 on it, because a`,
    `// real Angular project has no Vite ambient types to declare it (measured: it`,
    `// is the first error every emitted angular tree produced). Angular also never`,
    `// asks for one: a component's styles are a compiler input, not a module.`,
    `@Component({`,
    `  selector: 'app-${source.name}',`,
    `  schemas: [CUSTOM_ELEMENTS_SCHEMA],`,
    `  changeDetection: ChangeDetectionStrategy.OnPush,`,
    ...(parsed.template.stylesheets.length
      ? [`  styleUrls: [${parsed.template.stylesheets.map((css) => `'./${css}'`).join(', ')}],`]
      : []),
    // The template is a string literal in THIS file rather than a separate
    // .html: it is generated together with the class that reads its refs, and
    // a second artifact would be a second thing the two callers (the CLI and
    // gen-blocks) could drift on. ngc still parses and checks it -- see this
    // module's header for exactly how little that checks on a kai- tag.
    `  template: \``,
    // The gate, the angular analogue of vue's `v-if="ready"` on the root and
    // svelte's `{#if}`: an element created before its definition lands discards
    // a property set on it, and the upgrade does not put it back (spec 8b,
    // amendment 7).
    `    @if (${STORE}.ready()) {`,
    ...escapeTemplateLiteral(body).split('\n').map((line) => (line.length ? `  ${line}` : line)),
    `    }`,
    `\`,`,
    `})`,
    `export class ${name} implements OnDestroy {`,
    `  private readonly appRef = inject(ApplicationRef);`,
    '',
    ...allRefEntries.map(([refName, type]) => `  readonly ${refName} = viewChild<ElementRef<${type}>>('${refName}');`),
    '',
    `  readonly store = create${name}(` +
      `() => ({ ${refEntries.map(([r]) => `${r}: this.${r}()?.nativeElement ?? null`).join(', ')} })` +
      (seedRefNames.length
        ? `, () => ({ ${seedRefNames.map((r) => `${r}: this.${r}()?.nativeElement ?? null`).join(', ')} })`
        : '') +
      `);`,
    '',
    `  ngOnDestroy(): void {`,
    `    this.store.destroy();`,
    `  }`,
    '',
    `  constructor() {`,
    `    void this.start();`,
    `  }`,
    '',
    `  /**`,
    `   * THE ONE PIECE OF ORDERING ANGULAR OWNS THAT THE OTHER THREE FORMS DO NOT`,
    `   * HAVE TO STATE. The store subscribes and awaits every kai- tag's`,
    `   * definition (spec 8b, amendment 7), then flips \`ready\`; this runs`,
    `   * AFTER that, because a boot() that touches a ref finds one only once the`,
    `   * gate has rendered. \`appRef.tick()\` is that render, SYNCHRONOUSLY:`,
    `   * zoneless Angular normally schedules one, and \`afterNextRender\` would`,
    `   * wait for a render that this very code is the cause of -- registering`,
    `   * after the write can out-run the callback. \`tick()\` renders the tree`,
    `   * before the next line reads a view child, which is what makes the order`,
    `   * a fact rather than a race.`,
    `   */`,
    `  private async start(): Promise<void> {`,
    `    await this.store.mount();`,
    `    this.appRef.tick();`,
    ...(emit.collidingSeeds.length ? [`    this.store.applySeeds();`] : []),
    `    void this.store.actions.boot();`,
    `  }`,
    `}`,
    '',
  ].join('\n');

  const tagsLiteral = `[${tags.map((t) => `'${t}'`).join(', ')}]`;
  const store = [
    `// GENERATED by @kitn.ai/blocks: the angular adapter.`,
    `// One signal over the controller's snapshot: nothing is mirrored and no`,
    `// effect re-derives anything. A signal because that is what an OnPush`,
    `// component's template tracks in zoneless Angular -- a plain field would`,
    `// update and never be rendered.`,
    `//`,
    `// \`mount()\` is subscribe + wait for the tags; the RENDER that the ready`,
    `// gate causes is the component's (\`appRef.tick()\` in its \`start()\`), and`,
    `// boot() follows it there. See the component's own comment for why that`,
    `// split is the only ordering that cannot race.`,
    `import { signal, type Signal } from '@angular/core';`,
    `// The add form's registration, not the autoloader's: the autoloader resolves`,
    `// element modules relative to its own URL and 404s every one of them through a`,
    `// bundler.`,
    `import '@kitn.ai/ui/web-components';`,
    `import {`,
    `  createController,`,
    `  type ${name}Actions,`,
    `  type ${name}Refs,`,
    `  type ${name}State,`,
    `} from './${source.name}.controller';`,
    '',
    `// Every kai- tag the block root renders. The template is gated on these being`,
    `// DEFINED: an element created before its definition lands discards a property`,
    `// set on it, and the upgrade does not put it back (spec 8b, amendment 7).`,
    `const TAGS = ${tagsLiteral};`,
    '',
    `export interface ${name}Store {`,
    `  /** The controller's snapshot, as the template reads it: \`store.state()\`. */`,
    `  readonly state: Signal<${name}State>;`,
    `  readonly ready: Signal<boolean>;`,
    `  readonly actions: ${name}Actions;`,
    `  /** Subscribes, then waits for every kai- tag to be defined, then opens the gate. */`,
    `  mount(): Promise<void>;`,
    ...(emit.collidingSeeds.length
      ? [
          `  /** Applies the seeds the markup cannot carry (B2-T3-a). After the ready-gated render. */`,
          `  applySeeds(): void;`,
        ]
      : []),
    `  destroy(): void;`,
    `}`,
    '',
    `export function create${name}(`,
    `  refs: () => ${name}Refs,`,
    ...(emit.collidingSeeds.length
      ? [
          `  // A colliding seed's target ref(s), separate from \`refs\` above:`,
          `  // \`refs\` is typed to exactly ${name}Refs, and a synthetic ref this`,
          `  // renderer invented for an un-\`#ref\`'d element is not one of its`,
          `  // members.`,
          `  seedRefs: () => Record<string, Element | null>,`,
        ]
      : []),
    `): ${name}Store {`,
    `  const controller = createController({ refs });`,
    `  const state = signal<${name}State>(controller.state());`,
    `  const ready = signal(false);`,
    `  let unsubscribe: (() => void) | undefined;`,
    '',
    `  return {`,
    `    state: state.asReadonly(),`,
    `    ready: ready.asReadonly(),`,
    `    actions: controller.actions,`,
    `    async mount() {`,
    `      unsubscribe = controller.subscribe(() => {`,
    `        state.set(controller.state());`,
    `      });`,
    `      await Promise.all(TAGS.map((tag) => customElements.whenDefined(tag)));`,
    `      ready.set(true);`,
    `    },`,
    ...(emit.collidingSeeds.length
      ? [
          `    // CONTROLLER RULING B2-T3-a: a seed colliding with a reactive`,
          `    // binding or a literal attribute of the same name (spec 8b,`,
          `    // amendment 5, as amended) cannot stay a static attribute -- that`,
          `    // is two writers of one name on one element -- so it applies here`,
          `    // instead, once, after the ready-gated tree has rendered and`,
          `    // before boot() (the order react's own mount effect gives it;`,
          `    // html and react apply every seed through their own mount step`,
          `    // too).`,
          `    applySeeds() {`,
          `      const seedTargets = seedRefs!();`,
          ...emit.collidingSeeds.map(
            (s) => `      seedTargets[${jsString(s.ref)}]?.setAttribute(${jsString(s.name)}, ${jsString(s.value)});`,
          ),
          `    },`,
        ]
      : []),
    `    destroy() {`,
    `      unsubscribe?.();`,
    `    },`,
    `  };`,
    `}`,
    '',
  ].join('\n');

  const files: FormFile[] = [];
  const target = (path: string): string => fileTarget('angular', source.name, path);
  const put = (path: string, content: string): void => {
    files.push({ path, content, target: target(path) });
  };
  put(`${name}.ts`, component);
  put(`${source.name}.store.ts`, store);
  put(
    README_FILE,
    renderReadme(source, [
      `Render it: \`<app-${source.name}></app-${source.name}>\`, from \`./${name}\`.`,
      '',
      'The component declares `CUSTOM_ELEMENTS_SCHEMA` itself, so `kai-*` tags pass the template',
      'compiler -- and, for the same reason, their attributes are NOT type-checked in an Angular',
      'template. That is Angular\'s structure: the schema that admits the tag is the switch that',
      'turns the checking off.',
    ]),
  );
  for (const file of carriedFiles(source, target)) files.push(file);
  return files;
}
