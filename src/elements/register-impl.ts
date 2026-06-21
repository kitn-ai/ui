// Component registration implementation. Importing this file defines all kitn
// custom elements as a side effect. It is dynamically imported (browser-only)
// from ./register.ts so the elements entry is SSR-import-safe — see the comment
// there. This file is hand-maintained (the generator gen-element-api.mjs SKIPs
// register.ts AND this file); keep the component import list here in sync.
import './conversation-list';
import './prompt-input';
import './chat';
import './chat-workspace';
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
//  into <kai-prompt-input> as a `slash-commands` property in a later pass.)
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
import './resizable';
import './file-tree';
import './artifact';
import './scroll-button';
import './popover';
import './switch';
import './toast';
// Generative-UI cards (Card Contract)
import './card';
import './form';
import './link-preview';
import './embed';
import './confirm-card';
import './tasks';
import './choice';
import './cards';
