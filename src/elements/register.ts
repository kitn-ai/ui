// Single entry that registers all kitn custom elements. Importing this file
// (or the built bundle) defines the elements as a side effect — but ONLY in a
// browser/DOM context.
//
// SSR-safe: the kai-* elements bundle Solid's client runtime, which touches
// `window` at module-eval (delegateEvents(events, doc = window.document)). With
// no `window`, a static import would throw. So the actual component registration
// lives in ./register-impl and is loaded behind a browser check + dynamic
// import() — static ESM imports hoist + evaluate unconditionally, so a bare `if`
// cannot gate them; a dynamic import() can. On the server this module is inert
// (no DOM → no registration → no throw); in the browser it registers as before.
//
// Registration is async (a microtask after this module loads). Consumers that
// need the upgraded element (e.g. the React runtime) guard with
// customElements.whenDefined(), which resolves once the impl chunk has run.
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  void import('./register-impl');
}

export type { ChatMessage, ChatMessageAction } from './chat-types';
export { configureCodeHighlighting, isCodeHighlightingEnabled } from '../primitives/highlighter';
export type { CodeHighlightingOptions } from '../primitives/highlighter';

// Imperative toast API — usable directly from the elements entry so consumers
// who only import the web-components bundle still get `toast()`. The store is
// SSR-safe (no DOM touched until the first toast is raised on the client).
export { toast } from '../primitives/toast-store';
export type {
  ToastItem, ToastVariant, ToastAction, ToastOptions, ToastHandle,
} from '../primitives/toast-store';
