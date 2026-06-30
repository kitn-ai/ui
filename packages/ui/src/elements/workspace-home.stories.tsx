import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // registers kai-workspace, kai-nav, kai-notice, kai-prompt-input, kai-suggestions, kai-card
import type { KaiNavItem } from '../ui/nav';
import type { ConversationSummary } from '../types';

// Labs: the home/dashboard assembly. The `main` slot replaces the built-in chat
// thread with a consumer-owned view, so the SAME kai-workspace shell hosts a
// non-thread Home screen. Nav fills sidebar-header, an upgrade card fills
// sidebar-footer, and the greeting + notice + composer + ideas fill `main`.

const meta = { title: 'Labs/Workspace Home', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;

type El = HTMLElement & Record<string, unknown>;

const NAV: KaiNavItem[] = [
  { id: 'new', label: 'New task', icon: 'plus', trailing: 'pencil' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'artifacts', label: 'Artifacts', icon: 'sparkles' },
  { id: 'customize', label: 'Customize', icon: 'settings' },
];
const RECENTS: ConversationSummary[] = [
  { id: 'c1', title: 'Dark-mode token audit', scope: { type: 'document' }, messageCount: 4, lastMessageAt: '2026-06-26T10:00:00Z', updatedAt: '2026-06-26T10:00:00Z' },
  { id: 'c2', title: 'Markdown file conversion', scope: { type: 'document' }, messageCount: 2, lastMessageAt: '2026-06-25T10:00:00Z', updatedAt: '2026-06-25T10:00:00Z' },
  { id: 'c3', title: 'How compound interest works', scope: { type: 'document' }, messageCount: 6, lastMessageAt: '2026-06-24T10:00:00Z', updatedAt: '2026-06-24T10:00:00Z' },
];
const IDEAS = [
  { label: 'Send me a daily briefing', icon: 'sparkles', value: 'brief' },
  { label: 'Organize my inbox', icon: 'folder', value: 'inbox' },
  { label: 'Customize Cowork for me', icon: 'settings', value: 'customize' },
];

export const Home: Story = {
  render: () => {
    let ws!: El, nav!: El, sugg!: El, notice!: El, input!: El, card!: El;
    onMount(() => {
      ws.conversations = RECENTS;
      nav.items = NAV;
      nav.defaultValue = 'new';
      sugg.suggestions = IDEAS;
      sugg.layout = 'list';
      notice.severity = 'neutral';
      input.placeholder = 'How can I help you today?';
    });
    return (
      <div style={{ height: '680px', width: '100%' }}>
        <kai-workspace ref={ws}>
          <div slot="sidebar-header" style={{ padding: '0.75rem 0.5rem 0.25rem' }}>
            <kai-nav ref={nav}></kai-nav>
          </div>
          <kai-card slot="sidebar-footer" ref={card} clickable style={{ display: 'block', margin: '0.75rem' }}>
            <h3 slot="header">Upgrade to Pro</h3>
            Unlock higher limits and Fable 5.
          </kai-card>
          <div
            slot="main"
            style={{
              display: 'flex',
              'flex-direction': 'column',
              'align-items': 'center',
              'justify-content': 'center',
              height: '100%',
              gap: '1.5rem',
              padding: '1.5rem',
            }}
          >
            <h1 style={{ 'font-size': '2rem', 'font-weight': '400', color: 'var(--color-foreground)' }}>Good evening, John</h1>
            <div style={{ width: '100%', 'max-width': '640px', display: 'flex', 'flex-direction': 'column', gap: '1rem' }}>
              <kai-notice ref={notice}>Claude Fable 5 is currently unavailable.</kai-notice>
              <kai-prompt-input ref={input}></kai-prompt-input>
              <kai-suggestions ref={sugg}></kai-suggestions>
            </div>
          </div>
        </kai-workspace>
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<kai-workspace>
  <!-- sidebar-header: the nav rail -->
  <div slot="sidebar-header">
    <kai-nav></kai-nav>
  </div>

  <!-- sidebar-footer: an upgrade card -->
  <kai-card slot="sidebar-footer" clickable>
    <h3 slot="header">Upgrade to Pro</h3>
    Unlock higher limits and Fable 5.
  </kai-card>

  <!-- main: replaces the built-in chat thread with a Home screen -->
  <div slot="main">
    <h1>Good evening, John</h1>
    <kai-notice severity="neutral">Claude Fable 5 is currently unavailable.</kai-notice>
    <kai-prompt-input placeholder="How can I help you today?"></kai-prompt-input>
    <kai-suggestions></kai-suggestions>
  </div>
</kai-workspace>

<script type="module">
  // Array/object props are set as JS properties, never attributes.
  document.querySelector('kai-workspace').conversations = [/* ConversationSummary[] */];

  const nav = document.querySelector('kai-nav');
  nav.items = [/* KaiNavItem[] */];
  nav.defaultValue = 'new';

  const sugg = document.querySelector('kai-suggestions');
  sugg.suggestions = [/* { label, icon, value }[] */];
  sugg.layout = 'list';

  // kai-card content is slotted, not set via JS properties.
</script>`,
      },
    },
  },
};
