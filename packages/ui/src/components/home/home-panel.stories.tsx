import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal } from 'solid-js';
import { HomePanel, type HomePanelProps } from './home-panel';
import { WidgetTabBar } from '../widget-tab-bar/widget-tab-bar';
import type { ConversationSummary } from '../../types';

const recent: ConversationSummary = {
  id: 'c1',
  title: 'Order #42',
  messageCount: 3,
  updatedAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  lastMessageAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  trailing: "It's on the way — tracking says Thursday.",
};

const frame = (children: any) => (
  <div class="flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-background">
    {children}
  </div>
);

const meta = {
  title: 'Components/HomePanel',
  component: HomePanel,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  // `onSelectRecent` and `onNewChat` carry no doc comment on the props
  // interface in `home-panel.tsx`, so their entries name the action and carry
  // no invented sentence; `onLink`'s sentence is its own prop doc.
  argTypes: {
    onSelectRecent: {
      action: 'select-recent',
      description: 'A recent-conversation row was activated; carries that conversation\'s id.',
      table: { category: 'Events' },
    },
    onNewChat: {
      action: 'new-chat',
      description: 'The new-chat button was clicked.',
      table: { category: 'Events' },
    },
    onLink: {
      action: 'link',
      description: 'Fired only for href-less link entries: an entry with a safe `href` navigates as a real anchor instead.',
      table: { category: 'Events' },
    },
  },
  args: {
    onSelectRecent: fn(),
    onNewChat: fn(),
    onLink: fn(),
  },
} satisfies Meta<typeof HomePanel>;
export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { HomePanel, WidgetTabBar } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Full home: greeting, recent conversation, new-conversation CTA, links, and
 *  the tab bar chrome with an unread badge on Messages. */
export const FullHome: Story = {
  render: (args: HomePanelProps) => {
    const [tab, setTab] = createSignal<'home' | 'messages'>('home');
    return frame(
      <>
        <HomePanel
          greeting={{ title: 'Hi there 👋', subtitle: 'How can we help today?' }}
          recent={recent}
          links={[
            { label: 'Docs', href: 'https://ui.kitn.ai', description: 'Read the guides', icon: 'book-open' },
            { label: 'Talk to sales', description: 'Emits onLink, no href', icon: 'message-circle' },
          ]}
          onNewChat={args.onNewChat}
          onSelectRecent={args.onSelectRecent}
          onLink={args.onLink}
        />
        <WidgetTabBar active={tab()} onChange={setTab} unread />
      </>,
    );
  },
  ...src(`<HomePanel
  greeting={{ title: 'Hi there', subtitle: 'How can we help today?' }}
  recent={recentConversation}
  links={[
    { label: 'Docs', href: 'https://ui.kitn.ai', description: 'Read the guides', icon: 'book-open' },
    { label: 'Talk to sales', description: 'Emits onLink, no href', icon: 'message-circle' },
  ]}
  onNewChat={() => startNewChat()}
  onSelectRecent={(id) => openConversation(id)}
  onLink={(entry) => handleLink(entry)}
/>
<WidgetTabBar active={tab()} onChange={setTab} unread />`),
};

/** `home: {}` — defaults only, no config. */
export const MinimalDefaults: Story = {
  render: (args: HomePanelProps) => frame(
    <>
      <HomePanel onNewChat={args.onNewChat} />
      <WidgetTabBar active="home" onChange={() => {}} />
    </>,
  ),
  ...src(`<HomePanel onNewChat={() => startNewChat()} />
<WidgetTabBar active="home" onChange={setTab} />`),
};

/** First visit — no recent conversation to show. */
export const NoRecent: Story = {
  render: (args: HomePanelProps) => frame(
    <>
      <HomePanel
        greeting={{ title: 'Welcome to Acme' }}
        links={[{ label: 'Docs', href: 'https://ui.kitn.ai', icon: 'book-open' }]}
        onNewChat={args.onNewChat}
      />
      <WidgetTabBar active="home" onChange={() => {}} />
    </>,
  ),
  ...src(`<HomePanel
  greeting={{ title: 'Welcome to Acme' }}
  links={[{ label: 'Docs', href: 'https://ui.kitn.ai', icon: 'book-open' }]}
  onNewChat={() => startNewChat()}
/>
<WidgetTabBar active="home" onChange={setTab} />`),
};
