// Single entry that registers all kitn custom elements. Importing this file
// (or the built bundle) defines the elements as a side effect.
import './conversation-list';
import './prompt-input';
import './chat';
// Composable leaf elements (spike — see docs/handoff + examples/composable)
import './thinking-bar';
import './model-switcher';
import './attachments';

export type { ChatMessage, ChatMessageAction } from './chat-types';
export { configureCodeHighlighting, isCodeHighlightingEnabled } from '../primitives/highlighter';
export type { CodeHighlightingOptions } from '../primitives/highlighter';
