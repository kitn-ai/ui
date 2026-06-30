// Emits src/elements/element-types.d.ts — typed element interfaces + an
// HTMLElementTagNameMap augmentation — from the extracted element metadata.
// Wired as the `./elements` types entry so consumers get typed
// document.querySelector('kai-message') + prop autocomplete.

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Self-contained inline type declarations for the three runtime-adjacent exports
// of the `./elements` subpath. These mirror the source types in ./chat-types and
// ../primitives/highlighter, but are INLINED here so the shipped .d.ts has NO
// relative import that would resolve a library .ts SOURCE file into a consumer's
// type graph (tsc compiles a .ts reached from a .d.ts even under skipLibCheck —
// the root cause of LIB-2). Keep these in sync with the source if those types
// change (they are stable, simple shapes).
const INLINE_ELEMENT_TYPES = `// --- Inlined from src/elements/chat-types.ts (kept self-contained: no source imports) ---
export type ChatMessageAction = 'copy' | 'like' | 'dislike' | 'regenerate' | 'edit';
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  reasoning?: { text: string; label?: string };
  tools?: { type: string; state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error'; input?: Record<string, unknown>; output?: Record<string, unknown>; toolCallId?: string; errorText?: string }[];
  attachments?: { id: string; type: 'file' | 'source-document'; filename?: string; mediaType?: string; url?: string; title?: string }[];
  actions?: (ChatMessageAction | { id: string; label: string; icon?: string; tooltip?: string })[];
  avatar?: { src?: string; fallback?: string; alt?: string };
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

/** Resolves once the kai-* elements are registered (browser); inert on the server. */
export declare const elementsReady: Promise<unknown>;`;

// Imperative toast API surface — mirrors src/primitives/toast-store.ts (the `toast`
// callable + `configureToasts` + the re-exported Toast* types from
// src/elements/register.ts). INLINED here (helper unions inlined, no source imports)
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

const clean = (type, optional) => {
  let t = type
    .replace(/\bUint8Array<ArrayBufferLike>/g, 'Uint8Array')
    .replace(/\bfalse \| true\b/g, 'boolean')
    .replace(/\btrue \| false\b/g, 'boolean');
  if (optional) t = t.replace(/undefined \| /g, '').replace(/ \| undefined/g, '');
  return t.trim();
};

export function writeTypes(root, elements, _toAttr, IMPORTS) {
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

  const interfaces = elements.map((el) => {
    const body = [
      `  /** Color mode (\`auto\` follows prefers-color-scheme). */`,
      `  theme?: 'light' | 'dark' | 'auto';`,
      ...el.props.flatMap((p) => [
        ...(p.description ? [`  /** ${p.description} */`] : []),
        `  ${p.name}${p.optional ? '?' : ''}: ${clean(p.type, p.optional)};`,
      ]),
    ].join('\n');
    return `export interface ${el.className} extends HTMLElement {\n${body}\n}`;
  }).join('\n\n');

  const tagMap = elements.map((el) => `    '${el.tag}': ${el.className};`).join('\n');

  const banner = `// AUTO-GENERATED by scripts/gen-element-api.mjs — do not edit by hand.
// Typed custom-element interfaces + HTMLElementTagNameMap augmentation, so
// \`document.querySelector('kai-message')\` is typed and gets prop autocomplete.`;

  const tagMapBlock = `declare global {
  interface HTMLElementTagNameMap {
${tagMap}
  }
}`;

  // SOURCE copy (src/elements/element-types.d.ts): used internally + by the
  // elements/provider builds. Keeps type-only relative re-exports (fine — the
  // library's own tsconfig resolves them; they are erased at emit). The value
  // re-export is replaced with a declaration so even this copy pulls no Solid
  // source at the value level.
  const srcOut = `${banner}
${importLines}

// Re-exports for \`import { … } from '@kitn.ai/ui/elements'\`.
export type { ChatMessage, ChatMessageAction } from './chat-types';
export type { CodeHighlightingOptions } from '../primitives/highlighter';
export declare function configureCodeHighlighting(options: CodeHighlightingOptions): void;
export declare function isCodeHighlightingEnabled(): boolean;

/** Resolves once the kai-* elements are registered (browser); inert on the server. */
export declare const elementsReady: Promise<unknown>;

${TOAST_TYPES}

${interfaces}

${tagMapBlock}
`;
  writeFileSync(resolve(root, 'src/elements/element-types.d.ts'), srcOut);
  console.log(`✓ src/elements/element-types.d.ts — ${elements.length} elements`);

  // SHIPPED copy (dist/elements.d.ts): the published \`./elements\` "types" entry.
  // FULLY SELF-CONTAINED — no relative imports, so a consumer's tsc never
  // resolves a library .ts SOURCE file through it (the LIB-2 fix). The element
  // interfaces are already inlined; only the chat-types/highlighter re-exports
  // needed inlining (INLINE_ELEMENT_TYPES above).
  const distOut = `${banner}
// SELF-CONTAINED — no relative imports (so no library source is ever resolved
// from a consumer's tsc). See scripts/gen-element-types.mjs.

${INLINE_ELEMENT_TYPES}

${TOAST_TYPES}

${interfaces}

${tagMapBlock}
`;
  const distDir = resolve(root, 'dist');
  if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
  writeFileSync(resolve(distDir, 'elements.d.ts'), distOut);
  console.log(`✓ dist/elements.d.ts — ${elements.length} elements (self-contained)`);
}
