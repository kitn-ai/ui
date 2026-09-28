/**
 * The solid delivery form: a `.tsx` component over the custom elements plus a
 * `create<Name>()` store holding one `createSignal` over the controller's
 * snapshot.
 *
 * THE SAME STRUCTURE AS vue.ts (which is the same as svelte.ts): a
 * `printNode(node, pad, scope, emit)` recursion over the root, a `bindingAttr`
 * switch over the five binding kinds, and a `literalAttr` for authored
 * attributes. What differs, and why, is documented at each function below.
 *
 * THE TEMPLATE IS GATED ON `ready`. Outside react, a generated form needs the
 * registration import AND the whenDefined await (spec 8b, amendment 7): an
 * element created before its definition lands discards a property set on it,
 * and custom-element upgrade does not put it back. Solid's gate is `<Show>`,
 * which is the structure this framework has for exactly that.
 *
 * THE KAI TAGS ARE TYPED, by a kit-side block this form does not own. Solid's
 * `IntrinsicElements` is `HTMLElementTags & SVGElementTags & MathMLElementTags &
 * ...` with NO index signature, so before that block existed an unknown tag was a
 * hard error rather than an `any`-typed one. MEASURED, solid-js 1.9.13 under the
 * stock consumer tsconfig this form's cell compiles with (`jsx: preserve`,
 * `jsxImportSource: solid-js`), over a file that imports the registration, that
 * error was `TS2339: Property 'kai-button' does not exist on type
 * 'JSX.IntrinsicElements'` — and the cell reported it for all nine emitted trees.
 *
 * It is CLOSED now: `scripts/gen-web-component-types.mjs` emits a per-element
 * `JSX.IntrinsicElements` block onto `solid-js/jsx-runtime` beside React's, Vue's
 * and Svelte's, so a kai-* tag and its attributes are checked here — the same
 * nine trees compile with zero diagnostics, and a wrong attribute on a kai-* tag
 * is a compile error in this form (the plant in scripts/lib/block-compile-cells.mjs
 * fails the day that stops being true). Nothing about this form's markup was
 * changed to get there.
 *
 * NO `prop:` NAMESPACE, deliberately. Solid's `prop:name` forces a property
 * assignment and `attr:name` forces an attribute one, which reads like the vue
 * `.prop` modifier -- but those namespaces exist for a tag Solid has NO type
 * for, and every binding here lands on a kai- element that the kit DOES
 * describe. A plain `name={expr}` on such an element is resolved by Solid at
 * runtime the way the svelte form's markup is: the property when the element
 * declares it, the attribute otherwise. Spelling it `prop:` would throw away
 * that per-element resolution and write a property for an authored `:aria-label`
 * that has none.
 */
import { fileTarget } from '../targets';
import { README_FILE, renderReadme } from './readme';
import { applyDataMode, DEFAULT_DATA_MODE } from './wiring';
import { carriedFiles, elementInterface, escapeAttr, isKai, parseBlock } from './emit';
import type { Block, DataMode } from '../registry';
import type { Binding, FormFile, TemplateNode } from '../contract/types';

/** The store binding the template reads state through. It is NOT a bare `state`
 *  like vue's: a Solid signal is a function, so every read is a CALL
 *  (`store.state().title`), and a destructured `const { state } = store` would
 *  evaluate it once, outside the reactive context, and never update. */
const STORE = 'store';

const read = (value: string, scope: string | undefined): string =>
  scope && value.startsWith(`${scope}.`) ? value : `${STORE}.state().${value}`;

/** A JS single-quoted string literal, for the store's own `setAttribute` calls
 *  (a JS context, not an HTML attribute -- `escapeAttr` is the wrong escaper). */
const jsString = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Literal text in the markup.
 *
 * A brace opens a JSX expression and `<` opens a tag, so both are emitted as an
 * expression holding the character -- the react renderer's rule, and it holds
 * here unchanged: Solid's JSX text has the same two openings. `&` needs
 * nothing: JSX text takes it literally, and escaping it would print `&amp;` on
 * the page.
 */
function jsxText(text: string): string {
  return text.replace(/[{}<>]/g, (c) => `{'${c}'}`);
}

/** A comment's text. `-->` cannot occur in an AUTHORED HTML comment (the parser
 *  that read the page would have already closed the comment on it), and a JS
 *  comment CLOSER inside the text would end this JSX comment early -- the react
 *  renderer replaces the same two-character sequence, with the same reasoning. */
function escapeComment(text: string): string {
  return text.replace(/\*\//g, '* /').replace(/-->/g, '--\\>');
}

/** A literal attribute in the markup.
 *
 *  A bare boolean and a `="true"` / `="false"` on a KAI element become BOUND
 *  literals (spec 8b, amendment 8 (F-10)), as they do in every other component
 *  form: the element's declared prop is `boolean`, and an attribute stringifies
 *  -- `"false"` is a non-empty string, which the element reads as true. On a
 *  plain element they stay attributes, because that is what they are in HTML. */
function literalAttr(tag: string, name: string, value: string): string {
  if (!isKai(tag)) return value === '' ? name : `${name}="${escapeAttr(value)}"`;
  if (value === '') return `${name}={true}`;
  if (value === 'true' || value === 'false') return `${name}={${value}}`;
  return `${name}="${escapeAttr(value)}"`;
}

/** One binding as a markup attribute. Seed lands here too, as a static
 *  attribute string, so it keeps its authored position among the element's
 *  other bindings instead of being sorted to a fixed slot.
 *
 *  THE EVENT IS `on:` PREFIXED, which is Solid's spelling for a listener that is
 *  NOT one of the delegated DOM events: `kai-click` is a custom event on a
 *  custom element, and `on:kai-click` is an `addEventListener` for exactly that
 *  name. The bare camelCase prop form React and the kit's own wrappers use
 *  (`onClick`) is a React convention and types as nothing here. */
function bindingAttr(b: Binding, scope: string | undefined): string | null {
  switch (b.kind) {
    case 'prop':
      // `.textContent` is emitted as CHILDREN, never as a binding: it is not an
      // element property and binding it is silently wrong (spec 8b, amendment 2).
      return b.name === 'textContent' ? null : `${b.name}={${read(b.value, scope)}}`;
    case 'attr':
      // THE SAME as a `.prop` on a kai element, deliberately, and the react
      // renderer decided this first: an attribute stringifies, so a bound
      // `false` would write `unread="false"` and the element would read it as
      // true. Solid reaches the property when the element declares one.
      return `${b.name}={${read(b.value, scope)}}`;
    case 'event':
      return `on:${b.name}={${STORE}.actions.${b.value}}`;
    case 'ref':
      return `ref={${b.name}}`;
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
 *  same element already claims its name. `ref` names the component-local
 *  binding (an existing `#ref`, or a synthetic one this renderer invents) the
 *  store's mount step writes through. */
interface CollidingSeed {
  ref: string;
  name: string;
  value: string;
}

interface Emit {
  collidingSeeds: CollidingSeed[];
  /** Whether any node was a `*for`, so the `For` import is emitted only when
   *  it is used -- `noUnusedLocals` is on in the consumer project this form
   *  compiles under, so an unused import is an error, not a smell. */
  usesFor: boolean;
  /** Synthetic ref name -> element interface, for an element with a
   *  colliding seed and no authored `#ref` to reuse. */
  extraRefs: Map<string, string>;
}

function printNode(node: TemplateNode, pad: string, scope: string | undefined, emit: Emit): string {
  if (node.type === 'text') return `${pad}${jsxText(node.text.trim())}`;
  if (node.type === 'comment') return `${pad}{/*${escapeComment(node.text)}*/}`;

  const tag = node.tag;
  const childScope = node.repeat ? node.repeat.item : scope;

  const boundNames = new Set(node.bindings.filter((b) => b.kind === 'prop' || b.kind === 'attr').map((b) => b.name));
  const literalAttrs = node.attrs
    .filter((a) => !boundNames.has(a.name))
    .map((a) => literalAttr(tag, a.name, a.value));

  // CONTROLLER RULING B2-T3-a, carried to solid: a seed never disappears. A seed
  // sharing its target name with a prop/attr binding OR a literal attribute on
  // the SAME element cannot stay a static attribute -- the two would be two
  // writers of one name whose winner is the framework's ordering rather than the
  // author's -- so it is applied instead as a one-time `setAttribute` on the
  // element's own `ref`, from the store's mount step, after the ready-gated tree
  // has rendered and before boot() (the order react's own mount effect gives it;
  // html and react apply every seed through their own mount step too).
  const claimedNames = new Set([...boundNames, ...node.attrs.map((a) => a.name)]);
  const refBinding = node.bindings.find((b) => b.kind === 'ref');
  const collidingSeeds = node.bindings.filter((b) => b.kind === 'seed' && claimedNames.has(b.name));
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
    .map((b) => bindingAttr(b, childScope))
    .filter((a): a is string => a !== null);

  const attrs = [
    ...(syntheticRef ? [`ref={${syntheticRef}}`] : []),
    ...literalAttrs,
    ...bindingAttrs,
  ];

  const textBinding = node.bindings.find((b) => b.kind === 'prop' && b.name === 'textContent');

  // No attrs and a single text expression: the fully inline form, matching what
  // a hand-authored component looks like for a leaf node.
  if (attrs.length === 0 && textBinding) {
    return `${pad}<${tag}>{${read(textBinding.value, childScope)}}</${tag}>`;
  }

  const childrenLines = textBinding
    ? [`${pad}  {${read(textBinding.value, childScope)}}`]
    : node.children.map((c) => printNode(c, `${pad}  `, childScope, emit)).filter(Boolean);

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

  // The `*for` analogue: `<For>`, WITH the callback's parameter as the child
  // scope, because the item name is a real binding here rather than a template
  // variable. `<For>` and not `.map`: a Solid `.map` re-creates every row on
  // every notification, which is the opposite of what the kai- reactivity
  // contract asks of a list prop. The authored `:key` is not restated -- Solid's
  // `<For>` keys by ITEM REFERENCE, and that reference is exactly what the
  // contract makes new when a row changes.
  if (node.repeat) {
    emit.usesFor = true;
    return `${pad}<For each={${read(node.repeat.list, scope)}}>{(${node.repeat.item}) => (\n${element}\n${pad})}</For>`;
  }
  return element;
}

export interface SolidFormOptions {
  /** Which data mode this tree is for; the scripted mock is the default. */
  mode?: DataMode;
}

export function renderSolidForm(block: Block, opts: SolidFormOptions = {}): FormFile[] {
  // The seam is resolved ONCE, at the top, exactly as vue.ts does it: from here
  // down the tree describes one mode, and the loop that carries the manifest's
  // files carries the right one.
  const source = applyDataMode(block, opts.mode ?? DEFAULT_DATA_MODE);
  const parsed = parseBlock(source, 'solid');
  const { name, root, tags, refTypes } = parsed;

  const emit: Emit = { collidingSeeds: [], extraRefs: new Map(), usesFor: false };
  const body = printNode(root, '  ', undefined, emit);

  const refEntries = [...refTypes.entries()];
  const extraRefEntries = [...emit.extraRefs.entries()];
  const refImports = [...new Set([...refTypes.values(), ...emit.extraRefs.values()].filter((t) => t !== 'HTMLElement'))].sort();
  // Every distinct ref a colliding seed applies through, whether that ref is
  // ALSO part of the controller's declared Refs (an authored `#ref`) or a
  // synthetic one this renderer invented for an element that had none. A second
  // getter, separate from the controller's own `refs()`: mixing a synthetic key
  // into that object would fail Refs' excess-property check, since it is typed
  // to exactly `${name}Refs`.
  const seedRefNames = [...new Set(emit.collidingSeeds.map((s) => s.ref))].sort();

  const component = [
    `// GENERATED by @kitn.ai/blocks from ${parsed.pagePath} and ${parsed.controllerPath}.`,
    `// It is your code now: edit freely, and regenerate to start over.`,
    `import { ${emit.usesFor ? 'For, ' : ''}Show, onCleanup, onMount } from 'solid-js';`,
    ...(refImports.length ? [`import type { ${refImports.join(', ')} } from '@kitn.ai/ui/web-components';`] : []),
    `import { create${name} } from './${source.name}.store';`,
    ...parsed.template.stylesheets.map((css) => `import './${css}';`),
    '',
    `export function ${name}() {`,
    `  // A \`ref\` target is a component-local \`let\`, never a signal: nothing reads`,
    `  // the handle reactively -- the controller reads it once, through the refs`,
    `  // getter, at boot. INSIDE the component, never at module scope: a module`,
    `  // \`let\` would be one handle shared by every instance of the block, so the`,
    `  // second one mounted would silently rewire the first. \`undefined\`, not`,
    `  // \`null\`: Solid assigns the element itself and holds \`undefined\` until`,
    `  // the gate renders, while the controller's Refs declares \`T | null\`, so`,
    `  // the getter below coalesces once.`,
    ...refEntries.map(([refName, type]) => `  let ${refName}: ${type} | undefined;`),
    ...extraRefEntries.map(([refName, type]) => `  let ${refName}: ${type} | undefined;`),
    `  const store = create${name}(` +
      `() => ({ ${refEntries.map(([r]) => `${r}: ${r} ?? null`).join(', ')} })` +
      (seedRefNames.length ? `, () => ({ ${seedRefNames.map((r) => `${r}: ${r} ?? null`).join(', ')} })` : '') +
      `);`,
    '',
    `  onMount(() => {`,
    `    void store.mount();`,
    `  });`,
    `  onCleanup(() => store.destroy());`,
    '',
    `  return (`,
    // The gate, the solid analogue of vue's `v-if="ready"` on the root and
    // svelte's `{#if}`: an element created before its definition lands discards
    // a property set on it, and the upgrade does not put it back (spec 8b,
    // amendment 7).
    `    <Show when={${STORE}.ready()}>`,
    body,
    `    </Show>`,
    `  );`,
    `}`,
    '',
  ].join('\n');

  const tagsLiteral = `[${tags.map((t) => `'${t}'`).join(', ')}]`;
  const store = [
    `// GENERATED by @kitn.ai/blocks: the solid adapter.`,
    `// One signal over the controller's snapshot: nothing is mirrored and no effect`,
    `// re-derives anything. A signal rather than a plain field so the template's`,
    `// read is reactive at all, and the deep cost is nothing here that the data`,
    `// does not already pay: the controller hands back a NEW state object per`,
    `// notification, which is what the kai- reactivity contract wants for a list`,
    `// prop anyway.`,
    `// boot() runs in a MICROTASK after the gate has rendered (\`await Promise`,
    `// .resolve()\` past \`ready = true\`), which is Solid's own flush: a signal`,
    `// write in a browser schedules a synchronous re-render at the end of the`,
    `// current task, so a boot() that touches a ref finds it populated.`,
    `import { createSignal, type Accessor } from 'solid-js';`,
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
    `  /** The controller's snapshot. A signal, so the template reads it as \`state()\`. */`,
    `  readonly state: Accessor<${name}State>;`,
    `  readonly ready: Accessor<boolean>;`,
    `  readonly actions: ${name}Actions;`,
    `  /** Everything the component's onMount has to do, in the order it must do it. */`,
    `  mount(): Promise<void>;`,
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
    `  const [state, setState] = createSignal<${name}State>(controller.state());`,
    `  const [ready, setReady] = createSignal(false);`,
    `  let unsubscribe: (() => void) | undefined;`,
    '',
    `  return {`,
    `    state,`,
    `    ready,`,
    `    actions: controller.actions,`,
    `    async mount() {`,
    `      unsubscribe = controller.subscribe(() => {`,
    `        setState(() => controller.state());`,
    `      });`,
    `      await Promise.all(TAGS.map((tag) => customElements.whenDefined(tag)));`,
    `      setReady(true);`,
    `      // The render the gate causes has to be DONE before boot() reads a ref:`,
    `      // a Solid signal write is flushed synchronously at the end of the`,
    `      // current task, so one microtask is past it.`,
    `      await Promise.resolve();`,
    ...(emit.collidingSeeds.length
      ? [
          `      // CONTROLLER RULING B2-T3-a: a seed colliding with a reactive`,
          `      // binding or a literal attribute of the same name (spec 8b,`,
          `      // amendment 5, as amended) cannot stay a static attribute -- that`,
          `      // is two writers of one name on one element -- so it applies here`,
          `      // instead, once, after the ready-gated tree has rendered and`,
          `      // before boot() (the order react's own mount effect gives it;`,
          `      // html and react apply every seed through their own mount step`,
          `      // too).`,
          `      const seedTargets = seedRefs!();`,
          ...emit.collidingSeeds.map(
            (s) => `      seedTargets.${s.ref}?.setAttribute(${jsString(s.name)}, ${jsString(s.value)});`,
          ),
        ]
      : []),
    `      void controller.actions.boot();`,
    `    },`,
    `    destroy() {`,
    `      unsubscribe?.();`,
    `    },`,
    `  };`,
    `}`,
    '',
  ].join('\n');

  const files: FormFile[] = [];
  const target = (path: string): string => fileTarget('solid', source.name, path);
  const put = (path: string, content: string): void => {
    files.push({ path, content, target: target(path) });
  };
  put(`${name}.tsx`, component);
  put(`${source.name}.store.ts`, store);
  put(
    README_FILE,
    renderReadme(source, [
      `Render it: \`<${name} />\`, from \`./${name}\`.`,
      '',
      `The store beside it, \`${source.name}.store.ts\`, already imports the element registration, so`,
      'there is nothing else to configure.',
    ]),
  );
  for (const file of carriedFiles(source, target)) files.push(file);
  return files;
}
