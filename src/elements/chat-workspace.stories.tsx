import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount, createSignal } from 'solid-js';
import './register'; // side effect: registers all kitn custom elements including <kai-workspace>
import type { ConversationGroup, ConversationSummary, ModelOption } from '../types';
import type { ChatMessage } from './chat-types';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-workspace': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const sampleGroups: ConversationGroup[] = [
  { id: 'today', name: 'Today', sortOrder: 0, createdAt: '2026-06-13T00:00:00.000Z' },
];

const sampleConversations: ConversationSummary[] = [
  {
    id: '1',
    title: 'Web component architecture',
    groupId: 'today',
    scope: { type: 'document' },
    messageCount: 12,
    lastMessageAt: '2026-06-13T15:30:00.000Z',
    updatedAt: '2026-06-13T15:30:00.000Z',
  },
  {
    id: '2',
    title: 'Theming & tokens',
    groupId: 'today',
    scope: { type: 'document' },
    messageCount: 5,
    lastMessageAt: '2026-06-13T11:20:00.000Z',
    updatedAt: '2026-06-13T11:20:00.000Z',
  },
];

const sampleModels: ModelOption[] = [
  { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
];

const sampleMessages: ChatMessage[] = [
  { id: 'm1', role: 'user', content: 'How do I drop the whole chat app in with one tag?' },
  {
    id: 'm2',
    role: 'assistant',
    content:
      'Use `<kai-workspace>` — set `conversations`, `messages`, and `models` as properties and listen for `kai-conversation-select` + `kai-submit`.',
    actions: ['copy', 'like'],
  },
];

type WorkspaceEl = HTMLElement & {
  groups?: ConversationGroup[];
  conversations?: ConversationSummary[];
  activeId?: string;
  messages?: ChatMessage[];
  models?: ModelOption[];
  currentModel?: string;
  chatTitle?: string;
  placeholder?: string;
  loading?: boolean;
  suggestionMode?: string;
  proseSize?: string;
  codeTheme?: string;
  codeHighlight?: boolean;
  scrollButton?: boolean;
  search?: boolean;
  voice?: boolean;
  slashCompact?: boolean;
  sidebarWidth?: number;
  sidebarMinWidth?: number;
  sidebarMaxWidth?: number;
  sidebarCollapsed?: boolean;
  defaultSidebarCollapsed?: boolean;
  value?: string;
};

/** Live demo of the actual `<kai-workspace>` custom element (Shadow DOM and all). */
function WorkspaceElement(props: { args?: Record<string, unknown> }) {
  let el: WorkspaceEl | undefined;
  onMount(() => {
    if (el) {
      // Fixed array/object data
      el.groups = sampleGroups;
      el.conversations = sampleConversations;
      el.activeId = '1';
      el.messages = sampleMessages;
      el.models = sampleModels;
      el.currentModel = 'claude-4';
      el.chatTitle = 'Web component architecture';
      // Scalar args from Controls (override defaults above for scalar props)
      const args = props.args;
      if (args) {
        const scalarNames = [
          'placeholder', 'loading', 'suggestionMode', 'proseSize', 'codeTheme',
          'codeHighlight', 'scrollButton', 'search', 'voice', 'slashCompact',
          'sidebarWidth', 'sidebarMinWidth', 'sidebarMaxWidth', 'defaultSidebarCollapsed', 'value',
        ];
        for (const name of scalarNames) {
          if (name in args) (el as unknown as Record<string, unknown>)[name] = args[name];
        }
      }
      el.addEventListener('kai-conversation-select', (e) => console.log('select', (e as CustomEvent).detail));
      el.addEventListener('kai-submit', (e) => console.log('submit', (e as unknown as CustomEvent).detail));
      el.addEventListener('kai-sidebar-toggle', (e) => console.log('kai-sidebar-toggle', (e as CustomEvent).detail));
    }
  });
  return (
    <div style={{ height: '720px', width: '100%' }}>
      <kai-workspace
        ref={(e) => (el = e as WorkspaceEl)}
        style={{ display: 'block', height: '100%' }}
      />
    </div>
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-workspace id="workspace" style="display:block; height:100vh;"></kai-workspace>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const workspace = document.getElementById('workspace');
  workspace.conversations = [
    {
      id: '1', title: 'Web component architecture',
      scope: { type: 'document' }, messageCount: 12,
      lastMessageAt: '2026-06-13T15:30:00Z', updatedAt: '2026-06-13T15:30:00Z',
    },
  ];
  workspace.messages = [
    { id: 'm1', role: 'user', content: 'How do I drop the whole chat app in with one tag?' },
    { id: 'm2', role: 'assistant', content: 'Use <kai-workspace> — set conversations, messages, and models as properties.' },
  ];
  workspace.models = [
    { id: 'claude-4', name: 'Claude 4 Opus', provider: 'Anthropic' },
  ];

  // events are CustomEvents on the element (they do not bubble)
  workspace.addEventListener('kai-conversation-select', (e) => console.log('selected conversation:', e.detail.id));
  workspace.addEventListener('kai-submit', (e) => console.log('user sent:', e.detail.value));
  workspace.addEventListener('kai-sidebar-toggle', (e) => console.log('sidebar collapsed:', e.detail.collapsed));
</script>`;

const SOLID_SNIPPET = `import '@kitn.ai/ui/elements'; // registers the custom elements
import { onMount } from 'solid-js';
import type { ConversationSummary, ModelOption } from '@kitn.ai/ui';
import type { ChatMessage } from '@kitn.ai/ui/elements';

function Workspace() {
  let el: HTMLElement & {
    conversations?: ConversationSummary[];
    messages?: ChatMessage[];
    models?: ModelOption[];
    activeId?: string;
  };
  const conversations: ConversationSummary[] = [
    {
      id: '1', title: 'Web component architecture',
      scope: { type: 'document' }, messageCount: 12,
      lastMessageAt: '2026-06-13T15:30:00Z', updatedAt: '2026-06-13T15:30:00Z',
    },
  ];
  const messages: ChatMessage[] = [
    { id: 'm1', role: 'user', content: 'How do I drop the whole chat app in with one tag?' },
    { id: 'm2', role: 'assistant', content: 'Use <kai-workspace> — set conversations, messages, and models as properties.' },
  ];
  onMount(() => {
    el.conversations = conversations;
    el.messages = messages;
    el.activeId = '1';
    el.addEventListener('kai-conversation-select', (e) => console.log('selected:', e.detail.id));
    el.addEventListener('kai-submit', (e) => console.log('user sent:', e.detail.value));
    el.addEventListener('kai-sidebar-toggle', (e) => console.log('sidebar collapsed:', e.detail.collapsed));
  });
  return (
    <kai-workspace
      ref={el}
      style={{ display: 'block', height: '100vh' }}
    />
  );
}`;

const meta = {
  title: 'Components/Workspace',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-workspace'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-workspace', [
          '`<kai-workspace>` is the full chat shell as a single **web component** — a resizable split layout with a collapsible conversation list on the left and a full message thread on the right, all isolated in **Shadow DOM**. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** dropping an entire chat application shell into a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts and a ready-made list+chat layout. If you *are* in SolidJS and want fine-grained control, compose the `ConversationList` and `ChatThread` primitives directly.',
          '**How to use:** register once with `import \'@kitn.ai/ui/elements\'`, set rich data as JS **properties** (`el.conversations = [...]`, `el.messages = [...]`, `el.models = [...]`), and listen for **CustomEvents** (`kai-conversation-select`, `kai-submit`, `kai-sidebar-toggle`, `kai-new-chat`) directly on the element.',
          '**Anatomy:** **sidebar panel** (a `<kai-conversations>` list with new-chat + collapse toggle, drag-resizable via an inner divider handle, collapses to a ghost reveal button) | **divider handle** (drag or click to resize; disappears when collapsed) | **chat panel** (the full `<ChatThread>`: header + message list + prompt composer; the thread node is stable across collapse/expand).',
          '**Placement:** as a full-page surface or large panel. Give it an explicit height (e.g. `height: 100vh`). The sidebar is drag-resizable and can be collapsed via the toggle button in its header.',
          'See the **Code** tab below for the HTML usage; the *SolidJS* story shows the same element inside a Solid component.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The element used the plain-HTML / any-framework way. */
export const Default: Story = {
  args: {
    placeholder: 'Send a message...',
    loading: false,
    suggestionMode: 'submit',
    proseSize: 'sm',
    codeTheme: 'github-dark-dimmed',
    codeHighlight: true,
    scrollButton: true,
    search: false,
    voice: false,
    slashCompact: false,
  },
  render: (args: Record<string, unknown>) => <WorkspaceElement args={args} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref` + `onMount`, events via `addEventListener`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <WorkspaceElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};

const CONTROLLED_SNIPPET = `const ws = document.getElementById('workspace');
let collapsed = false;
ws.sidebarCollapsed = collapsed;            // app owns the state

// react to the in-component toggle AND drive it from your own UI
ws.addEventListener('kai-sidebar-toggle', (e) => {
  collapsed = e.detail.collapsed;
  ws.sidebarCollapsed = collapsed;          // persist / restore as you like
});
document.getElementById('toggle').onclick = () => {
  collapsed = !collapsed;
  ws.sidebarCollapsed = collapsed;          // collapse from outside the header
};`;

/**
 * Controlled collapse: the app owns `sidebarCollapsed`, drives it as a property,
 * and updates it from `kai-sidebar-toggle`. An external button collapses the
 * sidebar from outside the workspace — only possible because the state is
 * controlled (uncontrolled mode keeps collapse internal to the element).
 */
export const ControlledSidebar: Story = {
  name: 'Controlled sidebar',
  render: () => {
    let el: WorkspaceEl | undefined;
    const [collapsed, setCollapsed] = createSignal(false);
    const drive = (next: boolean) => { setCollapsed(next); if (el) el.sidebarCollapsed = next; };
    onMount(() => {
      if (!el) return;
      el.groups = sampleGroups;
      el.conversations = sampleConversations;
      el.activeId = '1';
      el.messages = sampleMessages;
      el.models = sampleModels;
      el.currentModel = 'claude-4';
      el.chatTitle = 'Web component architecture';
      el.sidebarCollapsed = collapsed();
      el.addEventListener('kai-sidebar-toggle', (e) => drive((e as CustomEvent<{ collapsed: boolean }>).detail.collapsed));
    });
    return (
      <div style={{ height: '720px', width: '100%', display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <button type="button" onClick={() => drive(!collapsed())} style={{ 'align-self': 'flex-start', padding: '6px 12px', 'border-radius': '8px', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
          {collapsed() ? 'Expand' : 'Collapse'} sidebar (from the app)
        </button>
        <kai-workspace ref={(e) => (el = e as WorkspaceEl)} style={{ display: 'block', flex: '1', 'min-height': '0' }} />
      </div>
    );
  },
  parameters: { docs: { source: { code: CONTROLLED_SNIPPET, language: 'js' } } },
};

