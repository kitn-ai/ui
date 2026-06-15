import type { ExampleUsage } from './types';
import messageActions from './message-actions';
import streamingResponse from './streaming-response';
import conversationWithReasoning from './conversation-with-reasoning';
import conversationWithSources from './conversation-with-sources';
import promptInputVariants from './prompt-input-variants';
import contextUsage from './context-usage';
import checkpointRestore from './checkpoint-restore';
import fullChatApp from './full-chat-app';
import emptyState from './empty-state';

export type { ExampleUsage, FrameworkKey } from './types';

/**
 * Every Example/Pattern that has hand-authored "how to build this" code.
 * Add a module here and it lights up its Code tab automatically.
 *
 * Element-centric examples only — layout/meta entries (Centered Conversation,
 * Chat Panel Layout, Docked Widget, Composed chat shell, Catalog) intentionally
 * have no Code tab; they don't reduce to a single-element recipe.
 */
export const exampleUsageList: ExampleUsage[] = [
  messageActions,
  streamingResponse,
  conversationWithReasoning,
  conversationWithSources,
  promptInputVariants,
  contextUsage,
  checkpointRestore,
  fullChatApp,
  emptyState,
];

/** Lookup by Storybook group title, e.g. `'Examples/Message Actions'`. */
export const exampleUsageByTitle = new Map(exampleUsageList.map((u) => [u.title, u]));

/**
 * Storybook's `sanitize` (from `@storybook/csf`), inlined so the manager addon
 * has no extra dependency. Turns a title into its story-id stem, e.g.
 * `'Examples/Message Actions'` → `'examples-message-actions'`.
 */
const sanitize = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

/**
 * Story-id prefixes (`<stem>--`) for entries that have a Code tab. `manager.ts`
 * uses these to show the tab only where we've authored code.
 */
export const exampleUsageStoryIdPrefixes: string[] = exampleUsageList.map(
  (u) => `${sanitize(u.title)}--`,
);
