// Emits src/web-components/web-component-types.d.ts — typed web-component interfaces + an
// HTMLElementTagNameMap augmentation — from the extracted web-component metadata.
// Wired as the `./web-components` types entry so consumers get typed
// document.querySelector('kai-message') + prop autocomplete.

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { cleanEmittedType as clean } from './_ts-helpers.mjs';
import { resolve } from 'node:path';

// Self-contained inline type declarations for the runtime-adjacent exports of the
// `./web-components` subpath. These mirror the source types in ./chat-types,
// ../components/tool/tool-types, ../primitives/tool-classify, ../primitives/attachment-types, ../primitives/card-contract
// and ../primitives/highlighter, but are INLINED here so the shipped .d.ts has NO
// relative import that would resolve a library .ts SOURCE file into a consumer's
// type graph (tsc compiles a .ts reached from a .d.ts even under skipLibCheck —
// the root cause of LIB-2).
//
// ★ These are NOT free-form prose: `src/web-components/web-component/inline-web-component-types.test.ts` compiles
// this block against the real source types and fails on ANY structural drift in
// ChatMessage. Edit the source types, then re-run that test — do not hand-patch one
// side and assume the other followed.
export const INLINE_ELEMENT_TYPES = `// --- Inlined from src/web-components/chat/chat-types.ts + the types it references
//     (kept self-contained: no source imports) ---
export type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit' | 'speak';

/** A like/dislike feedback vote on an assistant message. */
export type FeedbackVote = 'like' | 'dislike';

/** A host-defined action button. \`icon\` is a curated registry name; unknown/absent
 *  icons render label-only. */
export interface CustomAction {
  id: string;
  label: string;
  icon?: string;
  tooltip?: string;
}

/** The speaker avatar for a message row. */
export interface AvatarData {
  src?: string;
  fallback?: string;
  alt?: string;
}

/** The untranslated provider payload a part was normalized from. Optional in the
 *  type but REQUIRED in practice for round-trip fidelity (Anthropic rejects
 *  reconstructed \`thinking\` blocks — send \`raw.payload\` back verbatim). */
export interface RawOrigin {
  /** Tagged origin, e.g. 'anthropic.content_block', 'openai.delta', \`custom.\${string}\`. */
  source: string;
  payload: unknown;
}

/** Semantic classification of a tool call, used to pick a rendering. */
export type ToolKind = 'command' | 'file-change' | 'search' | 'fetch' | 'mcp' | 'image' | 'generic';

/** A tool-call part rendered by <kai-tool>. */
export interface ToolPart {
  /** The tool name exactly as the provider reported it. */
  type: string;
  /** Semantic classification for rendering. Derive with \`classifyTool(type)\`. */
  kind?: ToolKind;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  /** Last VALID parsed snapshot, fingerprint-deduped. The primary channel. */
  input?: Record<string, unknown>;
  /** Raw accumulated argument fragments, for character-level streaming. */
  rawInput?: string;
  output?: Record<string, unknown>;
  toolCallId?: string;
  errorText?: string;
  raw?: RawOrigin;
}

/** A message attachment descriptor. */
export interface AttachmentData {
  id: string;
  type: 'file' | 'source-document';
  filename?: string;
  mediaType?: string;
  url?: string;
  title?: string;
}

/** A citation the model produced (the payload of a \`source\` part). */
export interface MessageSource {
  id?: string;
  url?: string;
  title?: string;
  snippet?: string;
  /** Citation marker number, when the model numbers its citations. */
  index?: number;
}

/** How a card was resolved by the user. */
export type CardResolution =
  | { kind: 'action'; action: string; payload?: unknown; at?: string }
  | { kind: 'submit'; data: unknown; at?: string }
  | { kind: 'dismissed'; at?: string }
  | { kind: 'expired'; reason?: string; at?: string };

/** A card the agent/server asks the chat to render. */
export interface CardEnvelope<TType extends string = string, TData = unknown> {
  type: TType;
  id: string;
  data: TData;
  title?: string;
  resolution?: CardResolution;
}

/** One ordered piece of message content. Closed union: extension happens at the
 *  CARD layer via the card registry, not by adding variants here. */
export type MessagePart =
  | { type: 'text'; text: string; raw?: RawOrigin }
  | {
      type: 'reasoning';
      text: string;
      label?: string;
      /** Provider block index. Keeps parallel reasoning blocks distinct. */
      index?: number;
      /** Informational only. \`raw\` is the round-trip channel, not this. */
      signature?: string;
      raw?: RawOrigin;
    }
  | { type: 'tool'; tool: ToolPart; raw?: RawOrigin }
  | { type: 'card'; envelope: CardEnvelope; raw?: RawOrigin }
  | { type: 'source'; source: MessageSource; raw?: RawOrigin }
  | { type: 'file'; attachment: AttachmentData; raw?: RawOrigin };

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** The ONLY content channel. Ordered. The \`content\` string was removed in 0.20.0. */
  parts: MessagePart[];
  /** Action buttons under the message. Chrome, not content. */
  actions?: (ChatMessageAction | CustomAction)[];
  /** Optional speaker avatar shown to the left of the message column. */
  avatar?: AvatarData;
  /** Controlled feedback vote; wins over the facade's optimistic state. */
  feedback?: FeedbackVote;
}

// --- Inlined from src/primitives/highlighter.ts ---
export interface CodeHighlightingOptions {
  enabled?: boolean;
  languages?: Record<string, () => Promise<unknown>>;
  themes?: Record<string, () => Promise<unknown>>;
  aliases?: Record<string, string>;
}

// Runtime values live in the compiled \`default\` (dist/kai.es.js); we only
// DECLARE their signatures here so the .d.ts pulls no source.
export declare function configureCodeHighlighting(options: CodeHighlightingOptions): void;
export declare function isCodeHighlightingEnabled(): boolean;

/** Classify a tool call by its provider-chosen NAME. Total, deterministic and
 *  side-effect free; ALWAYS terminates in \`'generic'\`, so an unrecognized tool
 *  still renders a panel instead of a blank. This is the same classifier
 *  \`upsertToolPart\` applies, so deriving \`ToolPart.kind\` with it cannot drift
 *  from the kit's own rendering. */
export declare function classifyTool(name: string): ToolKind;

/** Resolves once the kai-* elements are registered (browser); inert on the server. */
export declare const webComponentsReady: Promise<unknown>;`;

// Imperative toast API surface — mirrors src/primitives/toast-store.ts (the `toast`
// callable + `configureToasts` + the re-exported Toast* types from
// src/web-components/register/register.ts). INLINED here (helper unions inlined, no source imports)
// so the shipped .d.ts pulls no Solid source. Keep in sync with toast-store.ts.
const TOAST_TYPES = `// --- Inlined from src/primitives/toast-store.ts (kept self-contained: no source imports) ---
export type ToastVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info';

export interface ToastConfig {
  stack?: 'expanded' | 'collapsed';
  position?: 'top-center' | 'top-right' | 'top-left' | 'bottom-center' | 'bottom-right' | 'bottom-left';
  max?: number;
  /** Default appearance for imperatively-raised toasts. Defaults to \`'pill'\`. */
  appearance?: 'pill' | 'card';
  /** Default high-contrast inverse treatment. Defaults to \`false\`. */
  inverse?: boolean;
}

/** An action button rendered inside the toast. Returning \`false\` from \`onAction\`
 *  keeps the toast open; any other return value dismisses it. */
export interface ToastAction {
  label: string;
  onAction: () => void | false;
}

export interface ToastItem {
  id: string;
  message: string;
  variant?: ToastVariant;
  /** Visual treatment: \`'pill'\` (default) or \`'card'\`. */
  appearance?: 'pill' | 'card';
  /** High-contrast inverse surface. Defaults to \`false\`. */
  inverse?: boolean;
  /** Secondary line shown below the message in the \`'card'\` appearance. */
  description?: string;
  action?: ToastAction;
  /** Auto-dismiss delay in ms. \`0\` = sticky. */
  duration?: number;
  /** Whether the close affordance is shown. Defaults to \`true\`. */
  dismissible?: boolean;
  /** Container to scope this toast within instead of the viewport. */
  target?: HTMLElement;
}

/** Options accepted by \`toast()\` — everything but the message. */
export interface ToastOptions {
  id?: string;
  variant?: ToastVariant;
  appearance?: 'pill' | 'card';
  inverse?: boolean;
  description?: string;
  action?: ToastAction;
  duration?: number;
  dismissible?: boolean;
  target?: HTMLElement;
}

/** Handle returned from \`toast()\` for imperative control. */
export interface ToastHandle {
  id: string;
  dismiss: () => void;
  update: (patch: Partial<Omit<ToastItem, 'id'>>) => void;
}

// Runtime values live in the compiled \`default\` (dist/kai.es.js); we only
// DECLARE their signatures here so the .d.ts pulls no source.
/** Raise a transient toast. \`toast('Saved')\`, \`toast.success('Copied')\`,
 *  \`toast.dismiss(id)\`. Returns a \`{ id, dismiss, update }\` handle. */
export declare const toast: {
  (message: string, opts?: ToastOptions): ToastHandle;
  /** Raise a success (green check) toast. */
  success: (message: string, opts?: ToastOptions) => ToastHandle;
  /** Raise a warning (amber) toast. */
  warning: (message: string, opts?: ToastOptions) => ToastHandle;
  /** Raise an error (destructive/red) toast. */
  error: (message: string, opts?: ToastOptions) => ToastHandle;
  /** Raise an info (blue) toast. */
  info: (message: string, opts?: ToastOptions) => ToastHandle;
  /** Dismiss a toast by id. */
  dismiss: (id: string) => void;
  /** Dismiss every active toast. */
  clear: () => void;
};
/** Configure the imperative \`toast()\` singleton — call once at app start. */
export declare function configureToasts(config: ToastConfig): void;`;

// `clean` now has ONE owner, in _ts-helpers.mjs (imported above as `clean`).

export function writeTypes(root, elements, _toAttr, IMPORTS, { domMembers = new Set() } = {}) {
  // which exported kit types are actually referenced → import only those
  const used = new Set();
  const scan = (s) => { for (const n of Object.keys(IMPORTS)) if (new RegExp(`\\b${n}\\b`).test(s)) used.add(n); };
  for (const el of elements) {
    for (const p of el.props) scan(p.type);
    for (const e of el.events) if (e.detail) scan(e.detail);
  }
  const bySource = {};
  for (const n of used) (bySource[IMPORTS[n]] ??= []).push(n);
  const importLines = Object.entries(bySource)
    .map(([src, names]) => `import type { ${names.sort().join(', ')} } from '${src}';`)
    .join('\n');

  // The declared (non-DOM) member list for one web component. Shared by the
  // HTMLElement interfaces below and the Vue GlobalComponents / Svelte
  // svelteHTML props interfaces, so the three can never disagree about WHICH
  // props a kai-* web component accepts.
  //
  // `domSafe` is the one axis on which the two copies differ, and only for a prop
  // whose NAME re-declares a member HTMLElement already has (today: kai-confirm's
  // `autofocus`, kai-message's `role`, kai-resizable-item's `hidden` — the set is
  // computed from the checker in gen-web-component-api.mjs, never hand-listed). An
  // interface that `extends HTMLElement` may only narrow such a member, and
  // `foo?: T` widens it to `T | undefined`:
  //   - `autofocus?: boolean`   vs HTMLElement's `autofocus: boolean`   → TS2430
  //   - `hidden?: boolean`      vs HTMLElement's `hidden: boolean`      → TS2430
  //   - `role?: 'user'|…`       vs Element's    `role: string | null`   → TS2430,
  //     and because `role` is declared by *Element*, lib.dom's own
  //     `HTMLElementTagNameMap[K] extends Element` constraint then fails too
  //     (2 × TS2344 raised inside lib.dom.d.ts).
  // Those 5 errors are invisible under `skipLibCheck: true` and land on any
  // consumer who turns it off. So in the ELEMENT interfaces a colliding prop is
  // emitted required, with `undefined` stripped — which is also what the runtime
  // does: `defineWebComponent` registers every prop with a default, so the
  // property always exists on an upgraded element. The Vue GlobalComponents and
  // Svelte svelteHTML props interfaces below don't extend HTMLElement and keep the
  // prop optional (a template legitimately omits it). Guarded by
  // tests/web-components/types-lib-check.test.ts, which
  // compiles this file with `skipLibCheck: false`.
  //
  // `defaulted` generalises that same runtime fact to a second case. PASSING a
  // prop and READING one back are different contracts, and only the element
  // interfaces are the read side:
  //   - KaiChatElementProps (Vue, Svelte, and the React wrapper in
  //     gen-web-component-react.mjs) is what a consumer CONSTRUCTS with. `messages` there is optional, because
  //     the element supplies `[]` — that is the whole point of the widening.
  //   - KaiChatElement is what `document.querySelector` hands back. The element
  //     registered a non-`undefined` default, and the React wrapper skips
  //     undefined props (frameworks/react/runtime.tsx: `p[name] !== undefined`),
  //     so nothing in the supported surface ever puts `undefined` there. Typing
  //     the READ as possibly-undefined taxes every consumer who reads a property
  //     back — `chat.messages = fn(chat.messages)`, `[...chat.toasts, next]`,
  //     `KaiChatElement['messages'][number]` — which is precisely the vanilla-TS
  //     pattern the MCP scaffolder emits (54 of its cells stopped compiling when
  //     these went optional on both sides).
  // Scoped to NON-scalar props so it only covers the array/object properties that
  // get read back and spread; scalars are attributes and read as strings anyway.
  // A prop whose registered default IS `undefined` (e.g. kai-thread's `messages`)
  // is untouched and stays optional on both sides, which is correct: there the
  // read really can yield undefined.
  // Guarded by tests/web-components/prop-read-write-split.test.ts.
  //
  // `theme` used to be hand-written here as the first two lines. It now arrives in
  // el.props like every other prop, read off define.tsx's injected defaults by
  // gen-web-component-api.mjs, so there is one declaration instead of three copies.
  const propBody = (el, domSafe = false) => [
    ...el.props.flatMap((p) => {
      const collides = domSafe && domMembers.has(p.name);
      const defaulted = domSafe && p.default !== undefined && !p.scalar;
      const forceRequired = collides || defaulted;
      // One JSDoc block per member — a second one would shadow the first.
      const note = collides
        ? `Re-declares the DOM member \`HTMLElement.${p.name}\`, so it is NOT optional here: an interface extending HTMLElement may only narrow it, and the element always carries a value for it.`
        : '';
      const doc = [p.description, note].filter(Boolean).join(' ');
      return [
        ...(doc ? [`  /** ${doc} */`] : []),
        `  ${p.name}${p.optional && !forceRequired ? '?' : ''}: ${clean(p.type, p.optional)};`,
      ];
    }),
  ].join('\n');

  // The imperative methods `defineWebComponent`'s `ctx.expose` attaches to the host
  // (`el.show()`, `chat.scrollToBottom()`, `panel.maximize(0)`, …). They belong on the
  // ELEMENT interfaces only — the read side, what `document.querySelector` hands back
  // — never on the Vue/React props interfaces, which are the CONSTRUCT side and have
  // no way to call a method.
  //
  // They were collected into web-component-meta.json and custom-elements.json from the
  // start and emitted into NO type declaration, so the entire interaction API — 37 of
  // 80 web components — was uncallable through the shipped types: `TS2339 Property 'show'
  // does not exist on type 'KaiDialogElement'`. The workaround downstream was a cast
  // (`element as unknown as { maximize(i: number): void }` in resizable.tsx), and the
  // attempted fix was a hand-written global interface of the same name, which loses
  // to the generated one declared here (TS2717). Guarded by
  // tests/web-components/methods-typed.test.ts.
  //
  // `m.dts` is the self-contained signature (gen-web-component-api.mjs); the `params`/
  // `returns` fallback keeps this working for a caller that re-reads the model from
  // web-component-meta.json, where `dts` is deliberately absent.
  const methodBody = (el) =>
    (el.methods ?? [])
      .flatMap((m) => [
        ...(m.description ? [`  /** ${m.description} */`] : []),
        // `clean(…, false)` for the same normalization the props get — the checker
        // renders a `boolean` parameter as `false | true`.
        `  ${m.name}${clean(m.dts ?? `(${m.params ?? ''}): ${m.returns ?? 'void'}`, false)};`,
      ])
      .join('\n');

  // ---- event maps --------------------------------------------------------------
  // `el.addEventListener('kai-…', e => e.detail.…)` is the pattern every guide in this
  // repo teaches, and it was TS2339 on `Event` for EVERY kai-* event: the .d.ts declared
  // the payload types (`KaiChatElementEvents`, `KaiVoiceInputElementEvents`) for the Vue
  // template layer and nothing `addEventListener` resolves against. Consumer code that
  // followed the docs needed a cast, which is the one thing the docs said it did not need.
  //
  // TWO shapes, because one cannot be correct alone:
  //
  //   • a per-element `<ClassName>EventMap extends HTMLElementEventMap` carrying the
  //     events THAT element declares, plus the four add/removeEventListener overloads
  //     lib.dom gives HTMLVideoElement for the same reason (HTMLVideoElementEventMap).
  //     Per element is what lets one event name carry a different payload on different
  //     elements: `kai-change` is `{ checked: boolean }` on kai-checkbox and
  //     `{ sizes: number[] }` on kai-resizable, and a single key in a single global
  //     interface cannot be both (TS2717). Extending HTMLElementEventMap rather than
  //     fresh-declaring is what keeps the DOM's own events (`click`, `input`) typed on an
  //     upgraded element instead of shadowed by the listener overloads.
  //
  //   • a global HTMLElementEventMap augmentation for the event names whose payload type
  //     is identical everywhere it is DECLARED — most of them. That half is what reaches
  //     `document.getElementById('voice')`, still a plain HTMLElement, and it is the shape
  //     the hand-authored src/web-components/resizable/resizable.globals.d.ts used for the
  //     cross-element maximize pair before this generator covered them.
  //
  // A name declared on more than one element with DIFFERENT payloads is emitted per
  // element only and left out of the global block: a global entry would have to pick one
  // element's payload and be wrong for the rest (`kai-submit` is `{ value, attachments }`
  // on kai-chat, `{ value }` on kai-search), or print a union no consumer can read through.
  // The generator prints what it left out, so the gap is visible in the build log rather
  // than a silent hole in the types.
  //
  // `detail === 'unknown'` is not a declaration: the name was inferred from a file-scoped
  // `dispatch(…)` literal (kai-resizable-item inherits its parent's that way), so it is not
  // emitted onto that element and the element that DID declare it is the source.
  const declares = (el) => el.events.filter((e) => e.detail !== 'unknown');
  const detailOf = (e) => clean(e.detail, false);
  const eventMember = (e) =>
    `  '${e.name}': CustomEvent${e.detail ? `<${detailOf(e)}>` : ''};`;

  const listenerOverloads = (el) =>
    declares(el).length
      ? [
          `  addEventListener<K extends keyof ${el.className}EventMap>(type: K, listener: (this: ${el.className}, ev: ${el.className}EventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;`,
          `  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;`,
          `  removeEventListener<K extends keyof ${el.className}EventMap>(type: K, listener: (this: ${el.className}, ev: ${el.className}EventMap[K]) => any, options?: boolean | EventListenerOptions): void;`,
          `  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;`,
        ].join('\n')
      : '';

  const interfaces = elements
    .map((el) => {
      const body = [propBody(el, true), methodBody(el), listenerOverloads(el)].filter(Boolean).join('\n');
      return `export interface ${el.className} extends HTMLElement {\n${body}\n}`;
    })
    .join('\n\n');

  const eventMapInterfaces = elements
    .filter((el) => declares(el).length)
    .map((el) => {
      const body = declares(el)
        .flatMap((e) => [...(e.description ? [`  /** ${e.description} */`] : []), eventMember(e)])
        .join('\n');
      return `export interface ${el.className}EventMap extends HTMLElementEventMap {\n${body}\n}`;
    })
    .join('\n\n');

  // name -> the set of distinct declared payloads for it ('' for a detail-less event).
  // More than one means the name means something different on different elements.
  const byEventName = new Map();
  for (const el of elements) {
    for (const e of declares(el)) {
      if (!byEventName.has(e.name)) byEventName.set(e.name, new Set());
      byEventName.get(e.name).add(e.detail ? detailOf(e) : '');
    }
  }
  const globalEventNames = [...byEventName.keys()].filter((n) => byEventName.get(n).size === 1).sort();
  const perElementOnly = [...byEventName.keys()].filter((n) => byEventName.get(n).size > 1).sort();

  const tagMap = elements.map((el) => `    '${el.tag}': ${el.className};`).join('\n');

  const banner = `// AUTO-GENERATED by scripts/gen-web-component-api.mjs — do not edit by hand.
// Typed custom-element interfaces + HTMLElementTagNameMap augmentation, so
// \`document.querySelector('kai-message')\` is typed and gets prop autocomplete.
// Plus the event maps \`el.addEventListener('kai-…', e => e.detail.…)\` resolves against:
// a per-element \`<ClassName>EventMap\` on the element, and an HTMLElementEventMap
// entry for every event name whose payload is the same on every element that declares it.
// Also augments React's JSX.IntrinsicElements (see below) so a raw <kai-chat>
// written directly in TSX type-checks, vue's GlobalComponents so a <kai-chat> in a
// Vue template is checked, and svelte's svelteHTML.IntrinsicElements so a <kai-chat>
// in a Svelte markup is too. The svelte block's registry drift is guarded by
// src/web-components/web-component/svelte-html-elements.test.ts.`;

  const tagMapBlock = `declare global {
  interface HTMLElementTagNameMap {
${tagMap}
  }
}`;

  // The single declared payload for a name, or '' when the event carries no detail
  // (`CustomEvent`).
  const solePayload = (name) => [...byEventName.get(name)][0];

  const globalEventBlock = `declare global {
  interface HTMLElementEventMap {
${globalEventNames
    .map((n) => {
      const payload = solePayload(n);
      return `    '${n}': CustomEvent${payload ? `<${payload}>` : ''};`;
    })
    .join('\n')}
  }
}`;

  // A raw `<kai-chat>` (or any other kai-*) written directly in TSX, bypassing the
  // @kitn.ai/ui/react wrappers, is documented usage (see the React framework guide's
  // "Raw web component usage" section) but without this, tsc rejects the tag with
  // "Property 'kai-chat' does not exist on type 'JSX.IntrinsicElements'". This
  // augmentation is deliberately GENERIC, not per-web-component: array/object props
  // (messages, suggestions, ...) are set as JS properties via a ref, never as JSX
  // attributes (the kai- contract — see CLAUDE.md), so typing them here would invite
  // `<kai-chat messages={messages} />`, which React serializes to a stringified
  // attribute instead of setting the property (unless the element defines that
  // property at construction time) — silently wrong. Only scalar props (theme,
  // placeholder, loading, ...) reflect safely as attributes, and the index signature
  // below already accepts those, so nothing per-web-component is generated — only the tag
  // list, mechanically derived from the same `elements` registry as the
  // HTMLElementTagNameMap block above.
  //
  // No reference to React's own types (HTMLAttributes, DetailedHTMLProps, ...): this
  // file loads for every framework via `import '@kitn.ai/ui/web-components'`, so referencing
  // an identifier that only exists when 'react' is installed would break non-React
  // consumers. Verified empirically: `declare module 'react' { ... }` merges cleanly
  // when 'react' IS present, and is inert (no error) when it is not.
  const jsxTagMap = elements.map((el) => `      '${el.tag}': KaiElementJsxProps;`).join('\n');

  const jsxIntrinsicBlock = `interface KaiElementJsxProps {
  id?: string;
  class?: string;
  className?: string;
  style?: Record<string, string | number> | string;
  slot?: string;
  part?: string;
  children?: unknown;
  ref?: unknown;
  [attr: string]: unknown;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
${jsxTagMap}
    }
  }
}`;

  // Vue resolves a template tag against `GlobalComponents` FIRST and only then
  // falls through to @vue/runtime-dom's JSX IntrinsicElements — which carries a
  // `[name: string]: any` index signature. So an unregistered `<kai-chat>` types
  // as `any` and vue-tsc silently checks NOTHING: a consumer-regression round
  // proved a `boolean`-prop-bound-to-`string` positive control compiling with zero
  // errors, and the removed 0.19 `ChatMessage.content` shape passing straight
  // through to the runtime messages guard, which drops it. React consumers got a
  // real error for the same mistake (the JSX block above); Vue consumers got
  // nothing. This block closes that gap.
  //
  // Shape notes, all established empirically against vue-tsc (see
  // src/web-components/web-component/vue-global-components.test.ts for the drift guard):
  //  - Volar looks the tag up under BOTH the raw kebab name and its PascalCase
  //    form, depending on `vueCompilerOptions.strictTemplates`, so both keys are
  //    emitted.
  //  - Event handlers land on a camelized, prefix-KEEPING key: `@kai-submit` →
  //    `onKaiSubmit` (unlike the React wrappers, which strip the `kai-` prefix).
  //  - Props are wrapped in `Partial<>`: the kai- contract lets a consumer set any
  //    prop imperatively through a ref, so flagging an "absent required prop" in a
  //    template would be a false positive.
  //  - `KaiElementVueProps`'s index signature keeps arbitrary attributes and
  //    handlers legal (id, data-*, aria-*, v-*), which matters under
  //    strictTemplates. An explicitly declared prop still wins over the index
  //    signature, so the type check above is unaffected — that is exactly what the
  //    positive control pins down.
  //
  // Declared locally, with no reference to any identifier that only exists inside
  // the real 'vue' module — same constraint as the React block, since this file
  // loads for every framework via `import '@kitn.ai/ui/web-components'`.
  const pascal = (s) => s.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join('');
  const vueEventKey = (ev) => `on${pascal(ev)}`;

  const vuePropsInterfaces = elements
    .map((el) => `export interface ${el.className}Props {\n${propBody(el)}\n}`)
    .join('\n\n');

  const vueEventInterfaces = elements
    .map((el) => {
      const body = el.events.flatMap((e) => [
        ...(e.description ? [`  /** ${e.description} */`] : []),
        `  ${vueEventKey(e.name)}?: (event: CustomEvent${e.detail ? `<${clean(e.detail, false)}>` : ''}) => void;`,
      ]);
      return `export interface ${el.className}Events {\n${body.join('\n')}\n}`;
    })
    .join('\n\n');

  const vueTagMap = elements
    .flatMap((el) => {
      const t = `KaiVueElement<${el.className}Props, ${el.className}Events>`;
      return [`    '${el.tag}': ${t};`, `    ${pascal(el.tag)}: ${t};`];
    })
    .join('\n');
  const vueBlock = `/** Attributes every kai-* element tolerates in a Vue template on top of its own
 *  props: \`id\`, \`data-*\`, \`aria-*\`, directives. The index signature keeps those
 *  legal under \`strictTemplates\` WITHOUT weakening the declared props — an
 *  explicit member always wins over an index signature. */
export interface KaiElementVueProps {
  [attr: string]: unknown;
}

/** A kai-* custom element as Vue's template type-checker sees it. Props are
 *  \`Partial\` because the kai- contract allows setting any of them imperatively
 *  through a ref instead of in the template. */
export type KaiVueElement<Props, Events> = new () => {
  $props: Partial<Props> & Events & KaiElementVueProps;
};

declare module 'vue' {
  interface GlobalComponents {
${vueTagMap}
  }
}`;

  // Svelte resolves a markup tag against `svelteHTML.IntrinsicElements` — the
  // namespace svelte's own svelte-html.d.ts declares globally and svelte-check
  // loads — and WHOSE LAST MEMBER is an index signature,
  // `[name: string]: { [name: string]: any }`. So an unregistered kai-* tag and
  // every attribute on it is `any`, and svelte-check checks NOTHING about a kai
  // markup: vue has the GlobalComponents block above, react the JSX one above
  // that, and svelte had nothing. MEASURED, by the block compile cell that owns
  // the svelte form (scripts/lib/block-compile-cells.mjs): `<kai-button
  // variant="solid">` — a value kai-button's own prop union does not contain — is
  // a hard error in the vue and react cells and passed silently in the svelte one
  // until this block. This closes that gap from the same `elements` model as the
  // two blocks above, so a prop reaches all three template type spaces or none.
  //
  // Shape notes, each established against svelte-check on the svelte starter's own
  // pinned svelte (the cell runs the real `svelte-check`, not tsc):
  //  - AUGMENTED INSIDE `declare global`, unlike the vue and react blocks, because
  //    `svelteHTML` is a GLOBAL namespace and THIS FILE IS A MODULE (it exports,
  //    so every top-level declaration in it is module-scoped). A bare
  //    `declare namespace svelteHTML` here would merge with nothing and type no
  //    tag. Measured both ways: inside `declare global` the wrong attribute is an
  //    error; at file scope it passes exactly as before.
  //  - KEBAB KEYS ONLY. Svelte reads a capitalised tag as an imported component
  //    rather than an intrinsic element, so the PascalCase twin Volar wants has no
  //    svelte meaning and is not emitted.
  //  - Event handlers are keyed `on` + the event name VERBATIM (`onkai-submit`),
  //    which is what the svelte form emits (`on${b.name}`, the same literal the
  //    starter writes by hand) and what svelte-check looks up — where vue
  //    camelizes to `onKaiSubmit` and the React wrappers strip the prefix. Keyed
  //    per element for vue's reason: one attribute name means a different payload
  //    on different elements (`kai-change`), and a single shared key could only be
  //    one of them. Measured: a handler whose CustomEvent detail disagrees with
  //    the declared one is an error, so these are checked and not merely accepted.
  //  - Props are `Partial<>` for vue's reason: the kai- contract lets a consumer
  //    set any prop imperatively through a ref, so flagging an absent prop in a
  //    template would be a false positive.
  //  - `KaiElementSvelteProps`'s index signature keeps arbitrary attributes and
  //    svelte's own directive-generated attributes legal (id, data-*, aria-*,
  //    `class:`/`style:`/`use:`/`bind:this`) on an explicitly typed tag, and an
  //    explicitly declared member still WINS over it — which is what makes the
  //    wrong-attribute error above a real error rather than a signature that
  //    swallowed it. It is a second name for what `KaiElementVueProps` is, not a
  //    second constraint: both are exported per framework, and the body is the
  //    same because the tolerance is the same.
  //
  // Declared locally, with no reference to any identifier that only exists inside
  // the real 'svelte' module — same constraint as the vue and react blocks, since
  // this file loads for every framework via `import '@kitn.ai/ui/web-components'`.
  const svelteEventKey = (name) => `on${name}`;

  const svelteEventInterfaces = elements
    .map((el) => {
      const body = el.events.flatMap((e) => [
        ...(e.description ? [`  /** ${e.description} */`] : []),
        `  '${svelteEventKey(e.name)}'?: (event: CustomEvent${e.detail ? `<${clean(e.detail, false)}>` : ''}) => void;`,
      ]);
      return `export interface ${el.className}SvelteEvents {\n${body.join('\n')}\n}`;
    })
    .join('\n\n');

  const svelteTagMap = elements
    .map((el) => `      '${el.tag}': KaiSvelteElement<${el.className}Props, ${el.className}SvelteEvents>;`)
    .join('\n');

  const svelteBlock = `/** Attributes every kai-* element tolerates in a Svelte markup on top of its own
 *  props: \`id\`, \`data-*\`, \`aria-*\`, and the attributes Svelte's own directives
 *  compile to. The index signature keeps those legal on a tag this file types
 *  WITHOUT weakening the declared props — an explicit member always wins over an
 *  index signature. */
export interface KaiElementSvelteProps {
  [attr: string]: unknown;
}

/** A kai-* custom element as Svelte's markup type-checker sees it. Props are
 *  \`Partial\` because the kai- contract allows setting any of them imperatively
 *  through a ref instead of in the markup. */
export type KaiSvelteElement<Props, Events> = Partial<Props> & Events & KaiElementSvelteProps;

declare global {
  namespace svelteHTML {
    interface IntrinsicElements {
${svelteTagMap}
    }
  }
}`;

  // SOURCE copy (src/web-components/web-component-types.d.ts): used internally + by the
  // web-components/provider builds. Keeps type-only relative re-exports (fine — the
  // library's own tsconfig resolves them; they are erased at emit). The value
  // re-export is replaced with a declaration so even this copy pulls no Solid
  // source at the value level.
  const srcOut = `${banner}
${importLines}

// Local bindings for the two names the DECLARATIONS below reference
// (\`configureCodeHighlighting(options: CodeHighlightingOptions)\`, \`classifyTool(): ToolKind\`).
// \`export type { X } from '…'\` re-exports X without binding it in this file's scope,
// so without these imports both signatures are TS2304 — invisible under
// \`skipLibCheck: true\`, which is exactly why this file is now compiled with it off
// (tests/web-components/types-lib-check.test.ts).
import type { CodeHighlightingOptions } from '../primitives/highlighter';
import type { ToolKind } from '../primitives/tool-classify';

// Re-exports for \`import { … } from '@kitn.ai/ui/web-components'\`. Mirrors the names the
// shipped dist/web-components.d.ts inlines, so both copies expose the same surface.
export type {
  AvatarData,
  ChatMessage,
  ChatMessageAction,
  CustomAction,
  FeedbackVote,
  MessagePart,
  MessageSource,
  RawOrigin,
} from './chat/chat-types';
export type { ToolPart } from '../components/tool/tool-types';
export type { ToolKind } from '../primitives/tool-classify';
export type { AttachmentData } from '../primitives/attachment-types';
export type { CardEnvelope, CardResolution } from '../primitives/card-contract';
export type { CodeHighlightingOptions } from '../primitives/highlighter';
export declare function configureCodeHighlighting(options: CodeHighlightingOptions): void;
export declare function isCodeHighlightingEnabled(): boolean;

/** Classify a tool call by its provider-chosen NAME. Total, deterministic and
 *  side-effect free; ALWAYS terminates in \`'generic'\`. Named by ToolPart.kind's
 *  doc comment, so it must stay reachable from this entry. */
export declare function classifyTool(name: string): ToolKind;

/** Resolves once the kai-* elements are registered (browser); inert on the server. */
export declare const webComponentsReady: Promise<unknown>;

${TOAST_TYPES}

${interfaces}

${eventMapInterfaces}

${tagMapBlock}

${globalEventBlock}

${jsxIntrinsicBlock}

${vuePropsInterfaces}

${vueEventInterfaces}

${vueBlock}

${svelteEventInterfaces}

${svelteBlock}
`;
  writeFileSync(resolve(root, 'src/web-components/web-component-types.d.ts'), srcOut);
  console.log(`✓ src/web-components/web-component-types.d.ts — ${elements.length} web components`);

  // SHIPPED copy (dist/web-components.d.ts): the published \`./web-components\` "types" entry.
  // FULLY SELF-CONTAINED — no relative imports, so a consumer's tsc never
  // resolves a library .ts SOURCE file through it (the LIB-2 fix). The web-component
  // interfaces are already inlined; only the chat-types/highlighter re-exports
  // needed inlining (INLINE_ELEMENT_TYPES above).
  const distOut = `${banner}
// SELF-CONTAINED — no relative imports (so no library source is ever resolved
// from a consumer's tsc). See scripts/gen-web-component-types.mjs.

${INLINE_ELEMENT_TYPES}

${TOAST_TYPES}

${interfaces}

${eventMapInterfaces}

${tagMapBlock}

${globalEventBlock}

${jsxIntrinsicBlock}

${vuePropsInterfaces}

${vueEventInterfaces}

${vueBlock}

${svelteEventInterfaces}

${svelteBlock}
`;
  const distDir = resolve(root, 'dist');
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(resolve(distDir, 'web-components.d.ts'), distOut);
  console.log(`✓ dist/web-components.d.ts — ${elements.length} web components (self-contained)`);
  console.log(
    `  · event maps: ${elements.filter((el) => declares(el).length).length} elements, ` +
      `${globalEventNames.length} names on HTMLElementEventMap`,
  );
  if (perElementOnly.length) {
    console.log(
      `  · ${perElementOnly.length} name(s) per-element only, because their payload differs by element: ` +
        `${perElementOnly.join(', ')}`,
    );
  }
}
