/**
 * `@kitn.ai/ui/stores` — the built-in `ConversationStore` implementations
 * (`localStorageStore`, `fetchStore`), the contract and the headless helpers that read its
 * fields, as a SELF-CONTAINED entry (dist/stores.js, zero bare imports).
 *
 * WHY THIS ENTRY EXISTS: the stores are plain solid-free glue, but they shipped only through
 * the package root, whose bundle bare-imports `solid-js`, so a no-bundler CDN page loading
 * dist/index.js by raw URL failed to resolve `solid-js`. The `<kai-chat>` `store` prop
 * promises two built-ins, and both were unreachable on exactly the no-build path.
 *
 * WHY NOT `@kitn.ai/ui/state`: that entry is the I/O-free pure-fold layer (functions over
 * ChatMessage[], no side effects). Stores are I/O by definition, so they get their own
 * subpath, built the way state and wire are (solid-js external and absent, verified by
 * verify:cdn-entries).
 *
 * The package root re-exports everything here unchanged, so bundler consumers are untouched;
 * this is the same module surfaced where a raw-URL consumer can reach it:
 *
 *   import { localStorageStore } from 'https://cdn.jsdelivr.net/npm/@kitn.ai/ui/dist/stores.js';
 */
export {
  localStorageStore,
  fetchStore,
  byRecency,
  isConversationUnread,
  LEGACY_THREAD_MIGRATED_TITLE,
} from '../primitives/conversation-store';
export type { ConversationStore } from '../primitives/conversation-store';
// The headless conversation controller: the
// mint/save/restore/markRead policy as one framework-free factory, shipped on
// this same self-contained entry so CDN pages and the facade share ONE policy.
export { createConversationController } from './conversation-controller';
export type {
  ConversationController,
  ConversationControllerHooks,
  ConversationControllerOp,
} from './conversation-controller';
// The type `ConversationStore.list()` returns and `onSummariesChange` hands
// you. It shipped only through the package ROOT, whose bundle bare-imports
// solid-js, so a framework-neutral controller consuming this self-contained
// entry had to import @kitn.ai/ui for a type its own dependency already gives
// it. Type-only, so dist/stores.js is byte-equal
// and the entry stays solid-free.
export type { ConversationSummary } from '../types';
