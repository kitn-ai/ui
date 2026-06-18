import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kc-chat>, <kc-conversations>, <kc-prompt-input>
import type { ConversationGroup, ConversationSummary } from '../types';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-conversations': JSX.HTMLAttributes<HTMLElement>;
      'kc-conversation': JSX.HTMLAttributes<HTMLElement> & { id?: string; 'group-id'?: string };
    }
  }
}

const sampleGroups: ConversationGroup[] = [
  { id: 'g-work', name: 'Work', sortOrder: 0, createdAt: '2026-06-01T09:00:00.000Z' },
  { id: 'g-personal', name: 'Personal', sortOrder: 1, createdAt: '2026-06-02T09:00:00.000Z' },
];

const sampleConversations: ConversationSummary[] = [
  {
    id: 'c-1',
    title: 'Q2 launch plan',
    groupId: 'g-work',
    scope: { type: 'collection' },
    messageCount: 12,
    lastMessageAt: '2026-06-09T14:20:00.000Z',
    updatedAt: '2026-06-09T14:20:00.000Z',
  },
  {
    id: 'c-2',
    title: 'API migration notes',
    groupId: 'g-work',
    scope: { type: 'collection' },
    messageCount: 5,
    lastMessageAt: '2026-06-08T11:05:00.000Z',
    updatedAt: '2026-06-08T11:05:00.000Z',
  },
  {
    id: 'c-3',
    title: 'Weekend trip ideas',
    groupId: 'g-personal',
    scope: { type: 'collection' },
    messageCount: 8,
    lastMessageAt: '2026-06-07T19:42:00.000Z',
    updatedAt: '2026-06-07T19:42:00.000Z',
  },
  {
    id: 'c-4',
    title: 'Untitled chat',
    scope: { type: 'collection' },
    messageCount: 1,
    lastMessageAt: '2026-06-10T08:00:00.000Z',
    updatedAt: '2026-06-10T08:00:00.000Z',
  },
];

type ConversationListEl = HTMLElement & {
  groups?: ConversationGroup[];
  conversations?: ConversationSummary[];
  activeId?: string;
};

/** Live demo of the actual `<kc-conversations>` custom element (Shadow DOM and all). */
function ConversationListElement(props: { args?: Record<string, unknown> }) {
  let el: ConversationListEl | undefined;
  onMount(() => {
    if (el) {
      // Fixed array data
      el.groups = sampleGroups;
      el.conversations = sampleConversations;
      el.activeId = 'c-1';
      // Scalar args from Controls
      const args = props.args;
      if (args) {
        const scalarNames = ['activeId'];
        for (const name of scalarNames) {
          if (name in args) (el as unknown as Record<string, unknown>)[name] = args[name];
        }
      }
    }
  });
  return (
    <kc-conversations
      ref={(e) => (el = e as ConversationListEl)}
      style={{ display: 'block', width: '300px', height: '560px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-conversations id="list" style="display:block; width:300px; height:100vh;"></kc-conversations>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const list = document.getElementById('list');
  list.groups = [
    { id: 'g-work', name: 'Work', sortOrder: 0, createdAt: '2026-06-01T09:00:00.000Z' },
  ];
  list.conversations = [
    {
      id: 'c-1', title: 'Q2 launch plan', groupId: 'g-work',
      scope: { type: 'collection' }, messageCount: 12,
      lastMessageAt: '2026-06-09T14:20:00.000Z', updatedAt: '2026-06-09T14:20:00.000Z',
    },
  ];
  list.activeId = 'c-1';

  // events are CustomEvents on the element (they do not bubble)
  list.addEventListener('kc-conversation-select', (e) => console.log('opened:', e.detail.id));
  list.addEventListener('kc-new-chat', () => console.log('new chat'));
  list.addEventListener('kc-toggle-sidebar', () => console.log('toggle sidebar'));
</script>`;

const SOLID_SNIPPET = `import '@kitn.ai/ui/elements'; // registers the custom elements
import { onMount } from 'solid-js';
import type { ConversationGroup, ConversationSummary } from '@kitn.ai/ui';

function Sidebar() {
  let el: HTMLElement & {
    groups?: ConversationGroup[];
    conversations?: ConversationSummary[];
    activeId?: string;
  };
  const groups: ConversationGroup[] = [
    { id: 'g-work', name: 'Work', sortOrder: 0, createdAt: '2026-06-01T09:00:00.000Z' },
  ];
  const conversations: ConversationSummary[] = [
    {
      id: 'c-1', title: 'Q2 launch plan', groupId: 'g-work',
      scope: { type: 'collection' }, messageCount: 12,
      lastMessageAt: '2026-06-09T14:20:00.000Z', updatedAt: '2026-06-09T14:20:00.000Z',
    },
  ];
  onMount(() => {
    el.groups = groups;
    el.conversations = conversations;
    el.activeId = 'c-1';
  });
  return (
    <kc-conversations
      ref={el}
      style={{ display: 'block', width: '300px', height: '100vh' }}
      on:kc-conversation-select={(e) => console.log('opened:', e.detail.id)}
      on:kc-new-chat={() => console.log('new chat')}
      on:kc-toggle-sidebar={() => console.log('toggle sidebar')}
    />
  );
}`;

const meta = {
  title: 'Components/Conversations',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-conversations'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-conversations', [
          '`<kc-conversations>` is the framework-agnostic **web component** version of the chat sidebar — a searchable, grouped list of conversations with a "new chat" button, isolated in **Shadow DOM** so the host page\'s CSS can\'t leak in and the kit\'s styles can\'t leak out. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** adding a conversation switcher to a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts. If you *are* in SolidJS and want fine-grained control, compose the `ConversationList` primitive instead.',
          '**How to use — data-driven:** register once with `import \'@kitn.ai/ui/elements\'`, then set rich data as JS **properties** (`el.groups = [...]`, `el.conversations = [...]`, `el.activeId = \'c-1\'`) and listen for **CustomEvents** (`kc-conversation-select`, `kc-new-chat`, `kc-toggle-sidebar`) directly on the element.',
          '**How to use — declarative:** alternatively, compose `<kc-conversation>` child elements directly in markup — each child carries its `id` as an attribute and its title as text content (`<kc-conversation id="c-1">Q2 plan</kc-conversation>`). No JS property wiring needed; the element reads them on mount and re-reads on DOM changes via MutationObserver. Events fire identically to the data-driven path.',
          '**Anatomy:** **header** (collapse/sidebar toggle button + "New chat" button) → **group headers** (one per `ConversationGroup`, labelled by `group.name`) → **conversation rows** (`<kc-conversation>` items or JS-property rows; active row is highlighted; each row is a button firing `kc-conversation-select`). Declarative `<kc-conversation id="…">title</kc-conversation>` children are invisible data carriers (no shadow slot) merged with the `conversations` property list.',
          '**Placement:** as a fixed-width side panel next to the chat surface. Give it an explicit width and height (e.g. `width: 300px; height: 100vh`).',
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
    activeId: 'c-1',
  },
  render: (args: Record<string, unknown>) => <ConversationListElement args={args} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref`, events via `on:`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <ConversationListElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};

const DECLARATIVE_HTML_SNIPPET = `<!-- Works in any framework or plain HTML — no JS property wiring needed -->
<kc-conversations id="list" style="display:block; width:300px; height:560px;">
  <kc-conversation id="c-1">Q2 launch plan</kc-conversation>
  <kc-conversation id="c-2">API migration notes</kc-conversation>
  <kc-conversation id="c-3">Weekend trip ideas</kc-conversation>
</kc-conversations>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  // Events fire exactly the same as the data-driven approach.
  document.getElementById('list')
    .addEventListener('kc-conversation-select', (e) => console.log('opened:', e.detail.id));
</script>`;

/** Declarative conversations — \`<kc-conversation>\` light-DOM children instead of
 *  a \`conversations\` property. Each child carries its \`id\` as an attribute and
 *  its title as text content. Great for plain HTML or server-rendered markup
 *  where JS property wiring is inconvenient. */
export const DeclarativeConversations: Story = {
  name: 'Declarative Conversations (kc-conversation)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.addEventListener('kc-conversation-select', (e: Event) => {
        console.log('selected:', (e as CustomEvent<{ id: string }>).detail.id);
      });
    });
    return (
      <kc-conversations
        ref={(e) => (el = e as HTMLElement)}
        style={{ display: 'block', width: '300px', height: '560px' }}
      >
        <kc-conversation id="c-1">Q2 launch plan</kc-conversation>
        <kc-conversation id="c-2">API migration notes</kc-conversation>
        <kc-conversation id="c-3">Weekend trip ideas</kc-conversation>
      </kc-conversations>
    );
  },
  parameters: {
    docs: {
      source: {
        code: DECLARATIVE_HTML_SNIPPET,
        language: 'html',
      },
    },
  },
};

