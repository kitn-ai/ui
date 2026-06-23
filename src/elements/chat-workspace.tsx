import { Show } from 'solid-js';
import { defineWebComponent } from './define';
import { createControllableSignal } from '../primitives/controllable';
import { ChatThread, type ChatThreadContextUsage } from '../components/chat-thread';
import { ConversationList } from '../components/conversation-list';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '../ui/resizable';
import { Button } from '../ui/button';
import { PanelLeftOpen } from 'lucide-solid';
import type { AttachmentData } from '../components/attachments';
import type { TriggerDef } from '../components/composer';
import type { ChatMessage } from './chat-types';
import type { ProseSize } from '../primitives/chat-config';
import type { ModelOption, ConversationGroup, ConversationSummary } from '../types';

interface Props extends Record<string, unknown> {
  /** Pre-bucketed conversation groups for the sidebar. Set as a JS property. */
  groups: ConversationGroup[];
  /** Flat conversation list (auto-bucketed if `groups` is empty). Set as a JS property. */
  conversations: ConversationSummary[];
  /** Id of the open conversation, highlighted in the sidebar. */
  activeId?: string;
  /** The active conversation's message thread, newest last. Set as a JS property. */
  messages: ChatMessage[];
  value?: string;
  placeholder?: string;
  loading?: boolean;
  suggestions?: string[];
  suggestionMode?: 'submit' | 'fill';
  proseSize?: ProseSize;
  codeTheme?: string;
  codeHighlight?: boolean;
  chatTitle?: string;
  models?: ModelOption[];
  currentModel?: string;
  context?: ChatThreadContextUsage;
  scrollButton?: boolean;
  search?: boolean;
  voice?: boolean;
  /** Rich entity triggers (`/` skills, `@` agents/plugins) forwarded to the input. */
  triggers?: TriggerDef[];
  /** Default icon per entity kind (kind → image src) forwarded to the input. */
  kindIcons?: Record<string, string>;
  /** Sidebar default width as a percent of the workspace (default 22). */
  sidebarWidth?: number;
  /** Sidebar min width in px (default 200). */
  sidebarMinWidth?: number;
  /** Sidebar max width in px (default 420). */
  sidebarMaxWidth?: number;
  /** Controlled collapsed state. Set this as a JS property (`el.sidebarCollapsed
   *  = true`) to drive the sidebar from your app, updating it in response to the
   *  `kai-sidebar-toggle` event. Omit for uncontrolled (the element manages it). */
  sidebarCollapsed?: boolean;
  /** Initial collapsed state when uncontrolled (default false). Use the
   *  `default-sidebar-collapsed` attribute to start collapsed in plain HTML. */
  defaultSidebarCollapsed?: boolean;
}

interface Events {
  /** A conversation was selected in the sidebar. */
  'kai-conversation-select': { id: string };
  /** The "New chat" button was clicked. */
  'kai-new-chat': Record<string, never>;
  /** The sidebar was collapsed or expanded. */
  'kai-sidebar-toggle': { collapsed: boolean };
  /** User submitted a message. */
  'kai-submit': { value: string; attachments: AttachmentData[] };
  /** Fired on every input change. */
  'kai-value-change': { value: string };
  /** The header model switcher changed. */
  'kai-model-change': { modelId: string };
  /** An action button on a message was clicked. `state` is present only for the
   *  toggleable feedback votes: `'on'` when a like/dislike is set, `'off'` when
   *  re-tapped to clear. */
  'kai-message-action': { messageId: string; action: string; state?: 'on' | 'off' };
  /** The Search button was clicked. */
  'kai-search': Record<string, never>;
  /** The Mic / voice button was clicked. */
  'kai-voice': Record<string, never>;
  /** A suggestion chip was clicked (only in `suggestion-mode="fill"`). */
  'kai-suggestion-click': { value: string };
}

defineWebComponent<Props, Events>('kai-workspace', {
  groups: [], conversations: [], activeId: undefined, messages: [],
  value: undefined, placeholder: 'Send a message...', loading: false,
  suggestions: undefined, suggestionMode: 'submit', proseSize: 'sm',
  codeTheme: 'github-dark-dimmed', codeHighlight: true, chatTitle: undefined,
  models: undefined, currentModel: undefined, context: undefined, scrollButton: true,
  search: false, voice: false, triggers: undefined, kindIcons: undefined,
  sidebarWidth: 22, sidebarMinWidth: 200, sidebarMaxWidth: 420,
  sidebarCollapsed: undefined, defaultSidebarCollapsed: undefined,
}, (props, { dispatch, flag }) => {
  // Controlled/uncontrolled collapse: `sidebarCollapsed` (when set) wins;
  // otherwise the element manages its own state, seeded from
  // `defaultSidebarCollapsed`. `toggle` always writes the internal value (a no-op
  // visually while controlled) and emits `kai-sidebar-toggle` so a controlling app
  // can update its own state.
  const [collapsed, setCollapsed] = createControllableSignal(
    () => props.sidebarCollapsed as boolean | undefined,
    flag('defaultSidebarCollapsed'),
  );
  const toggle = () => { const next = !collapsed(); setCollapsed(next); dispatch('kai-sidebar-toggle', { collapsed: next }); };

  // Create the thread ONCE and reference the same node in both <Show> branches.
  // It's owned by this component root (not by a Show branch), so toggling the
  // sidebar moves the node between branches without disposing it — the thread's
  // own state (e.g. an uncontrolled draft) survives the collapse/expand.
  const threadEl = (
    <ChatThread
      messages={props.messages} value={props.value as string | undefined} placeholder={props.placeholder as string}
      loading={flag('loading')} suggestions={props.suggestions as string[] | undefined}
      suggestionMode={props.suggestionMode as 'submit' | 'fill'} proseSize={props.proseSize as ProseSize}
      codeTheme={props.codeTheme as string} codeHighlight={flag('codeHighlight')}
      chatTitle={props.chatTitle as string | undefined} models={props.models as ModelOption[] | undefined}
      currentModel={props.currentModel as string | undefined} context={props.context as ChatThreadContextUsage | undefined}
      scrollButton={props.scrollButton !== false} search={flag('search')} voice={flag('voice')}
      triggers={props.triggers as TriggerDef[] | undefined}
      kindIcons={props.kindIcons as Record<string, string> | undefined}
      onValueChange={(value) => dispatch('kai-value-change', { value })}
      onSubmit={(detail) => dispatch('kai-submit', detail)}
      onSuggestionClick={(value) => dispatch('kai-suggestion-click', { value })}
      onModelChange={(modelId) => dispatch('kai-model-change', { modelId })}
      onMessageAction={(detail) => dispatch('kai-message-action', detail)}
      onSearch={() => dispatch('kai-search', {})}
      onVoice={() => dispatch('kai-voice', {})}
    />
  );

  return (
    <div class="h-full w-full overflow-hidden bg-background">
      <Show
        when={!collapsed()}
        fallback={
          <div class="relative h-full">
            <Button
              variant="ghost" size="icon-sm" aria-label="Open sidebar"
              class="absolute left-2 top-2 z-10 rounded-full bg-card/80 shadow-sm backdrop-blur"
              onClick={toggle}
            >
              <PanelLeftOpen class="size-4" />
            </Button>
            {threadEl}
          </div>
        }
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel defaultSize={props.sidebarWidth as number} data-min-size={String(props.sidebarMinWidth)} data-max-size={String(props.sidebarMaxWidth)}>
            <ConversationList
              groups={props.groups} conversations={props.conversations} activeId={props.activeId as string | undefined}
              onSelect={(id) => dispatch('kai-conversation-select', { id })}
              onNewChat={() => dispatch('kai-new-chat', {})}
              onToggleSidebar={toggle}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel>{threadEl}</ResizablePanel>
        </ResizablePanelGroup>
      </Show>
    </div>
  );
});
