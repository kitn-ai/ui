// Single entry that registers all kitn custom elements. Importing this file
// (or the built bundle) defines the elements as a side effect.
import './conversation-list';
import './prompt-input';
import './chat';
// Composable leaf elements (spike — see docs/handoff + examples/composable)
import './thinking-bar';
import './model-switcher';
import './attachments';
// Phase 1 — message-rendering core
import './message';
import './markdown';
import './code-block';
import './reasoning';
import './tool';
// Phase 2 — header / meta
import './context-meter';
import './feedback-bar';
import './chat-scope-picker';
// Phase 3 — input ecosystem
// (NB: SlashCommand is context-bound to PromptInput — it observes the input
//  value via usePromptInput() — so it is NOT a standalone element. It will fold
//  into <kitn-prompt-input> as a `slash-commands` property in a later pass.)
import './prompt-suggestions';
import './file-upload';
import './voice-input';
// Phase 4 — indicators & leaves
import './loader';
import './text-shimmer';
import './image';
import './checkpoint';
import './message-skills';
import './source';
import './response-stream';
import './empty';
import './chain-of-thought';

export type { ChatMessage, ChatMessageAction } from './chat-types';
export { configureCodeHighlighting, isCodeHighlightingEnabled } from '../primitives/highlighter';
export type { CodeHighlightingOptions } from '../primitives/highlighter';
