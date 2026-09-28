/**
 * The svelte delivery form: a runes-mode `<script lang="ts">` component over the
 * custom elements plus a `create<Name>()` store in a `.svelte.ts` module holding
 * one `$state` over the controller's snapshot.
 *
 * THE SAME STRUCTURE AS vue.ts (which is the same as react.ts): a
 * `printNode(node, pad, scope, emit)` recursion over the root, a `bindingAttr`
 * switch over the five binding kinds, and a `literalAttr` for authored
 * attributes. What differs, and why, is documented at each function below.
 *
 * THE TEMPLATE IS GATED ON `ready`. Outside react, a generated form needs the
 * registration import AND the whenDefined await (spec 8b, amendment 7): an
 * element created before its definition lands discards a property set on it,
 * and custom-element upgrade does not put it back.
 */
import { fileTarget } from '../targets';
import { README_FILE, renderReadme } from './readme';
import { applyDataMode, DEFAULT_DATA_MODE } from './wiring';
import { carriedFiles, escapeAttr, elementInterface, isKai, parseBlock } from './emit';
import type { Block, DataMode } from '../registry';
import type { Binding, FormFile, TemplateNode } from '../contract/types';

/** The store binding the template reads state through. It is NOT a bare `state`
 *  like vue's: a svelte template expression is plain TypeScript, so
 *  `store.state.title` is what reaches the store's getter inside the reactive
 *  context. A destructured `const { state } = store` would invoke that getter
 *  once, outside it, and every later notification would be invisible. */
const STORE = 'store.state';
const STORE_READY = 'store.ready';
const STORE_ACTIONS = 'store.actions';

const read = (value: string, scope: string | undefined): string =>
  scope && value.startsWith(`${scope}.`) ? value : `${STORE}.${value}`;

/** A JS single-quoted string literal, for the store's own `setAttribute` calls
 *  (a JS context, not an HTML attribute -- `escapeAttr` is the wrong escaper). */
const jsString = (value: string): string => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Literal text in the markup.
 *
 * `&` first, or the ampersand of an entity this function itself introduced gets
 * escaped twice. `<` and `>` because Svelte's parser is an HTML parser: a bare
 * `<` opens a tag the way it would in any hand-authored component. EVERY `{` is
 * encoded, where vue.ts encodes only the second of a `{{` pair: a lone `{` opens
 * an expression in Svelte too. The entity still RENDERS as `{` -- Svelte builds
 * its text into an `innerHTML` template (measured on 5.56: the entity reaches the
 * emitted `from_html(…)` call verbatim) and the HTML parser decodes it there --
 * but it no longer opens an expression block for the parser reading this source.
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
 *  defensive in the same spirit as html.ts's binder escaping and vue.ts's own
 *  comment-closer guard: never trust that every path into a comment node went
 *  through that parser. */
function escapeComment(text: string): string {
  return text.replace(/-->/g, '--&gt;');
}

/** A literal attribute in the markup.
 *
 *  A bare boolean and a `="true"` / `="false"` on a KAI element become BOUND
 *  literals (spec 8b, amendment 8 (F-10)), exactly as vue.ts translates them:
 *  the element's declared prop is `boolean`, and the static-attribute form
 *  stringifies to `"false"`, which the element reads as true. The reason is not
 *  vue's (no compiler objection here) but the value's: `{false}` is a boolean,
 *  `"false"` is a string. On a plain element they stay attributes, because that
 *  is what they are in HTML. */
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
 *  THE NAME IS VERBATIM, where vue camelizes. Svelte resolves the write per
 *  ELEMENT at runtime instead of per binding: `set_custom_element_data`
 *  (svelte's attributes.js) assigns the PROPERTY when the element declares a
 *  setter of that name and falls back to `setAttribute` when it does not. So
 *  `.unread` reaches the kit's own `set unread`, and `:aria-label`, which no
 *  element declares, stays the attribute it was authored as -- camelizing
 *  here would break the second case rather than fix the first. */
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
      // true. Svelte reaches the property when the element declares one.
      return `${b.name}={${read(b.value, scope)}}`;
    case 'event':
      // No handler name to invent: `on` + the event name IS Svelte 5's
      // attribute form, and a hyphen survives it.
      return `on${b.name}={${STORE_ACTIONS}.${b.value}}`;
    case 'ref':
      return `bind:this={${b.name}}`;
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
  /** Synthetic ref name -> element interface, for an element with a
   *  colliding seed and no authored `#ref` to reuse. */
  extraRefs: Map<string, string>;
}

function printNode(node: TemplateNode, pad: string, scope: string | undefined, emit: Emit): string {
  if (node.type === 'text') return `${pad}${escapeText(node.text.trim())}`;
  if (node.type === 'comment') return `${pad}<!--${escapeComment(node.text)}-->`;

  const tag = node.tag;
  const childScope = node.repeat ? node.repeat.item : scope;

  const boundNames = new Set(node.bindings.filter((b) => b.kind === 'prop' || b.kind === 'attr').map((b) => b.name));
  const literalAttrs = node.attrs
    .filter((a) => !boundNames.has(a.name))
    .map((a) => literalAttr(tag, a.name, a.value));

  // CONTROLLER RULING B2-T3-a, carried to svelte: a seed never disappears. A
  // seed sharing its target name with a prop/attr binding OR a literal
  // attribute on the SAME element cannot stay a static attribute -- that is a
  // second writer of one name, and which of the two wins would be Svelte's
  // ordering rather than the author's (vue's version of this hits a harder
  // wall: two keys of one props object, TS1117) -- so it is applied instead as
  // a one-time `setAttribute` on the element's `bind:this` target, from the
  // store's mount step, after the ready-gated tree has rendered and before
  // boot() (the order react's own mount effect gives it; html and react apply
  // every seed through their own mount step too, this is only "sometimes" here
  // because a non-colliding seed needs no ref at all).
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
    ...(syntheticRef ? [`bind:this={${syntheticRef}}`] : []),
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

  // The `*for` analogue: one `{#each}` block per repeated element, keyed by the
  // declared key expression, with the item name as the child scope.
  if (node.repeat) {
    return `${pad}{#each ${read(node.repeat.list, scope)} as ${node.repeat.item} (${read(node.repeat.key, childScope)})}\n${element}\n${pad}{/each}`;
  }
  return element;
}

export interface SvelteFormOptions {
  /** Which data mode this tree is for; the scripted mock is the default. */
  mode?: DataMode;
}

export function renderSvelteForm(block: Block, opts: SvelteFormOptions = {}): FormFile[] {
  // The seam is resolved ONCE, at the top, exactly as vue.ts does it: from here
  // down the tree describes one mode, and the loop that carries the manifest's
  // files carries the right one.
  const source = applyDataMode(block, opts.mode ?? DEFAULT_DATA_MODE);
  const parsed = parseBlock(source, 'svelte');
  const { name, root, tags, refTypes } = parsed;

  const emit: Emit = { collidingSeeds: [], extraRefs: new Map() };
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
  // `.store.svelte.ts`, NOT `<name>.svelte.ts`. The runes-legal extension is
  // `.svelte.ts` either way, but a stem that differs from the component's only
  // by CASE is the same file to a case-insensitive filesystem (macOS, and every
  // CI runner here): svelte-check resolved `./assistant.svelte` to
  // `Assistant.svelte` and reported the store's export as missing from the SFC.
  const storeFile = `${block.name}.store.svelte.ts`;
  const storeSpecifier = `./${block.name}.store.svelte`;

  const component = [
    '<script lang="ts">',
    `// GENERATED by @kitn.ai/blocks from ${parsed.pagePath} and ${parsed.controllerPath}.`,
    `// It is your code now: edit freely, and regenerate to start over.`,
    `import { onDestroy, onMount } from 'svelte';`,
    ...(refImports.length ? [`import type { ${refImports.join(', ')} } from '@kitn.ai/ui/web-components';`] : []),
    `import { create${name} } from '${storeSpecifier}';`,
    ...parsed.template.stylesheets.map((css) => `import './${css}';`),
    '',
    `// A bind:this target is a component-local \`let\`, never $state: nothing reads`,
    `// the handle reactively -- the controller reads it once, through the refs`,
    `// getter, at boot. \`null\`, not \`undefined\`: the controller's Refs declares`,
    `// \`T | null\` (vue's useTemplateRef and react's useRef both hand back null),`,
    `// and svelte-check rejects \`T | undefined\` against it.`,
    ...refEntries.map(([refName, type]) => `let ${refName}: ${type} | null = null;`),
    ...extraRefEntries.map(([refName, type]) => `let ${refName}: ${type} | null = null;`),
    `const store = create${name}(` +
      `() => ({ ${refEntries.map(([r]) => r).join(', ')} })` +
      (seedRefNames.length ? `, () => ({ ${seedRefNames.join(', ')} })` : '') +
      `);`,
    `onMount(() => {`,
    `  void store.mount();`,
    `});`,
    `onDestroy(() => store.destroy());`,
    '</script>',
    '',
    // The gate, the svelte analogue of vue's `v-if="ready"` on the root: an
    // element created before its definition lands discards a property set on
    // it, and the upgrade does not put it back (spec 8b, amendment 7).
    `{#if ${STORE_READY}}`,
    body,
    '{/if}',
    '',
  ].join('\n');

  const tagsLiteral = `[${tags.map((t) => `'${t}'`).join(', ')}]`;
  const store = [
    `// GENERATED by @kitn.ai/blocks: the svelte adapter.`,
    `// One $state over the controller's snapshot: nothing is mirrored and no effect`,
    `// re-derives anything. A rune rather than a plain let so a template read is`,
    `// reactive at all, and the deep proxy costs nothing here that the data does not`,
    `// already pay: the controller hands back a NEW state object per notification,`,
    `// which is what the kai- reactivity contract wants for a list prop anyway.`,
    `// boot() runs AFTER the ready-gated tree has rendered (an \`await tick()\` past`,
    `// \`ready = true\`), matching the shipped vue adapter's nextTick and the react`,
    `// adapter's useEffect ordering, so a boot() that touches a ref finds it`,
    `// populated on every host.`,
    `//`,
    `// \`${storeFile}\` IS THE ONLY FILE THAT ENDS IN \`.svelte.ts\`: runes are legal`,
    `// in a module only with that file name, and it is the extension`,
    `// examples/starters/svelte's tsconfig.app.json includes.`,
    `import { tick } from 'svelte';`,
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
    `  /** The controller's snapshot. A getter, so each read is the live object. */`,
    `  readonly state: ${name}State;`,
    `  readonly ready: boolean;`,
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
    `  let state = $state<${name}State>(controller.state());`,
    `  let ready = $state(false);`,
    `  let unsubscribe: (() => void) | undefined;`,
    '',
    `  return {`,
    `    get state() {`,
    `      return state;`,
    `    },`,
    `    get ready() {`,
    `      return ready;`,
    `    },`,
    `    actions: controller.actions,`,
    `    async mount() {`,
    `      unsubscribe = controller.subscribe(() => {`,
    `        state = controller.state();`,
    `      });`,
    `      await Promise.all(TAGS.map((tag) => customElements.whenDefined(tag)));`,
    `      ready = true;`,
    `      await tick();`,
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
          `      const seedTargets = seedRefs();`,
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
  const target = (path: string): string => fileTarget('svelte', source.name, path);
  const put = (path: string, content: string): void => {
    files.push({ path, content, target: target(path) });
  };
  put(`${name}.svelte`, component);
  put(storeFile, store);
  put(
    README_FILE,
    renderReadme(source, [
      `Render it: \`<${name} />\`, from \`./${name}.svelte\`.`,
      '',
      `The store beside it, \`${storeFile}\`, already imports the element registration, so there is`,
      'nothing else to configure.',
    ]),
  );
  for (const file of carriedFiles(source, target)) files.push(file);
  return files;
}
