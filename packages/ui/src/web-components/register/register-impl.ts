// Component registration implementation. Importing this file defines all kitn
// custom elements as a side effect. It is dynamically imported (browser-only)
// from ./register.ts so the web-components entry is SSR-import-safe — see the comment
// there. This file is hand-maintained (the generator gen-web-component-api.mjs SKIPs
// register.ts AND this file); keep the component import list here in sync.
import { installKaiDevtoolsHook } from '../../diagnostics/hook';
import { emitWebComponentRegistry } from '../web-component/web-component-diagnostics';
import '../conversation/conversation-list';
import '../conversation/conversation-item';
import '../prompt/prompt-input';
import '../chat/chat';
import '../workspace/chat-workspace';
// Message-list composable (the scrolling thread slice, sans composer/header)
import '../thread/thread';
// Composable leaf elements (spike — see docs/handoff + examples/composable)
import '../thinking-bar/thinking-bar';
import '../model-switcher/model-switcher';
import '../attachments/attachments';
// Phase 1 — message-rendering core
import '../message/message';
import '../markdown/markdown';
import '../code-block/code-block';
import '../reasoning/reasoning';
import '../tool/tool';
// Phase 2 — header / meta
import '../context-meter/context-meter';
import '../feedback-bar/feedback-bar';
import '../chat/chat-scope-picker';
// Phase 3 — input ecosystem
import '../prompt/prompt-suggestions';
import '../file-upload/file-upload';
import '../voice-input/voice-input';
import '../audio-visualizer/audio-visualizer';
// Phase 4 — indicators & leaves
import '../loader/loader';
import '../text-shimmer/text-shimmer';
import '../image/image';
import '../checkpoint/checkpoint';
import '../message/message-skills';
import '../source/source';
import '../response-stream/response-stream';
import '../empty/empty';
import '../status/status';
import '../nav/nav';
import '../progress-bar/progress-bar';
import '../coachmark/coachmark';
import '../tabs/tabs';
import '../voice-output/voice-output';
import '../screen/screen';
import '../chain-of-thought/chain-of-thought';
import '../resizable/resizable';
import '../file-tree/file-tree';
import '../artifact/artifact';
import '../scroll-button/scroll-button';
import '../popover/popover';
import '../switch/switch';
import '../checkbox/checkbox';
import '../checkbox/checkbox-group';
import '../radio/radio-group';
import '../slider/slider';
import '../select/select';
import '../button/button';
import '../avatar/avatar';
import '../badge/badge';
import '../tooltip/tooltip';
import '../notice/notice';
import '../icon/icon';
import '../separator/separator';
import '../scroll-area/scroll-area';
import '../hover-card/hover-card';
import '../skeleton/skeleton';
import '../toast/toast';
// Generative-UI cards (Card Contract)
import '../card/card';
import '../form/form';
import '../link-preview/link-preview';
import '../embed/embed';
import '../confirm-card/confirm-card';
import '../tasks/tasks';
import '../choice/choice';
import '../card/cards';
// Dual-response comparison (preference capture)
import '../compare/compare';
// Rich text composer with entity pills, trigger menus, and keyword highlighting
import '../composer/composer';
// W3 phase 2: cascading action menu from a JSON items-tree
import '../menu/menu';
// The same Dropdown surface with a consumer-owned body: you slot the rows
// instead of handing over an items tree (the shape a framework consumer needs
// when the rows are their own components).
import '../dropdown/dropdown';
// W4 phase 1: grouped filterable command/mention palette
import '../command/command';
// Prompt dock + settings building blocks (graduated from SolidJS prototypes)
import '../prompt/prompt-dock';
import '../segmented/segmented';
import '../settings/settings-group';
import '../settings/setting-item';
// Multi-agent workspace primitives (graduated from SolidJS prototypes)
import '../pane/pane';
import '../pane/pane-group';
import '../pane/pane-grid';
import '../agent-card/agent-card';
import '../dialog/dialog';
import '../dock/dock';
// Input & search field family
import '../input/input';
import '../search/search';
import '../kbd/kbd';
import '../kbd/kbd-group';
import '../editable-label/editable-label';
// Blocks & parts phase 1: widget chrome, drill navigation, tab bar, generic row
import '../panel/panel'; // kai-panel + kai-panel-header
import '../tabs/tab-bar';
import '../tabs/tab-bar-item';
import '../view-stack/view-stack';
import '../view/view';
import '../row/row';
import '../row/row-group';

// The devtools recorder hook, installed HERE because this file is already the
// browser-only half of the web-components entry (register.ts gates it behind a window
// check and a dynamic import). So an app that registers the kai-* elements gets
// the hook with no work, while an SSR import of the entry still touches no
// global.
//
// At the BOTTOM, and it makes no difference: `import` declarations are hoisted,
// so every web component module above has already evaluated by the time any statement
// in this file runs. Written here anyway so the order you read is the order that
// happens. Nothing above emits a diagnostic event, so there is nothing to miss.
//
// Idempotent and near-free: with no activation signal it allocates no buffer,
// makes no subscription, and leaves emission a guarded no-op. An app importing
// the SolidJS components directly never runs this file and must call
// `installKaiDevtoolsHook()` itself -- see the docblock in ../diagnostics/index.
installKaiDevtoolsHook();

// One registry snapshot, right after the hook installs and therefore after every
// element above has registered (import declarations are hoisted, so they all ran
// before this line).
//
// WHY HERE AND NOT INSIDE THE HOOK. The hook lives in ../diagnostics, which is
// its own rollup bundle and must stay free of any element import -- pulling the
// manifest in there would drag element bytes into a consumer who only parses
// streams. The dependency goes elements -> diagnostics, never back.
//
// WHY EMIT AT ALL WHEN A PANEL IS USUALLY NOT THERE YET. On the recording branch
// the hook has already subscribed by this point, so this snapshot lands in the
// history buffer and a panel attaching seconds later still sees the state at
// load -- which is the state that answers the hydration question. On the dormant
// branch `emitWebComponentRegistry()` short-circuits on the active check and costs a
// symbol read.
//
// A panel attaching mid-session with no history gets no snapshot from here and
// should ask for a fresh one: `emitWebComponentRegistry()` is exported from
// @kitn.ai/ui/web-components for exactly that.
emitWebComponentRegistry();
