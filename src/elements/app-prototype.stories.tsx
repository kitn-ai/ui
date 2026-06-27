import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, Show } from 'solid-js';
import { PanelLeft, Search, Asterisk } from 'lucide-solid';
import './register'; // every kai-* element used below
import type { KaiNavItem } from '../ui/nav';
import type { KaiTabItem } from '../ui/tabs';
import type { ConversationSummary } from '../types';

// Labs: a working interactive prototype of the Claude desktop app, built on
// kai-workspace + the kai-* elements. Home/Code swap the main view via kai-tabs;
// Design opens the kai-screen takeover; the rail collapses; the user menu and
// Recents filter are real kai-menus. The purpose is to find gaps.

// kai-tasks is only used as a JSX element here (its story uses the TasksCard
// component), so declare its tag locally.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-tasks': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const meta = { title: 'Labs/App Prototype', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;
type El = HTMLElement & Record<string, unknown>;

const TABS: KaiTabItem[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'code', label: 'Code', icon: 'code' },
];
const NAV: KaiNavItem[] = [
  { id: 'new', label: 'New task', icon: 'plus', trailing: 'square-pen' },
  { id: 'projects', label: 'Projects', icon: 'box' },
  { id: 'artifacts', label: 'Artifacts', icon: 'workflow' },
  { id: 'scheduled', label: 'Scheduled', icon: 'clock' },
  { id: 'dispatch', label: 'Dispatch', icon: 'lock', badge: 'Beta' },
  { id: 'customize', label: 'Customize', icon: 'briefcase' },
];
const RECENTS: ConversationSummary[] = [
  'Platinum Eagle Coin Sale Value', 'Precious Metals Data Conversion', 'Markdown file conversion',
  'Fiddl app logo design concepts', 'Cloudflare Email Service pricing', 'TypeScript email provider emulator',
  'Restoring focus after dialog closure', 'Creating sandbox environments', 'Remote computer control request',
  'Claude desktop update not installing', 'Checking Claude version', 'How compound interest works',
].map((t, i) => ({ id: `r${i}`, title: t, scope: { type: 'document' }, messageCount: 3, lastMessageAt: '2026-06-26T10:00:00Z', updatedAt: '2026-06-26T10:00:00Z' }));
const IDEAS = [
  { label: 'Send me a daily briefing', icon: 'sparkles', value: 'brief' },
  { label: 'Organize my inbox', icon: 'folder', value: 'inbox' },
  { label: 'Customize Cowork for me', icon: 'file-text', value: 'customize' },
];
const MODELS = [{ id: 'opus', name: 'Opus 4.8' }, { id: 'sonnet', name: 'Sonnet 4.6' }];
const MENU_ITEMS = [
  { heading: true, label: 'roboncode@gmail.com' },
  { id: 'settings', label: 'Settings', icon: 'settings', shortcut: '⌘,' },
  { id: 'language', label: 'Language', icon: 'globe', items: [{ id: 'en', label: 'English' }, { id: 'es', label: 'Espanol' }] },
  { id: 'help', label: 'Get help', icon: 'message-circle' },
  { separator: true },
  { id: 'plans', label: 'View all plans', icon: 'sparkles' },
  { id: 'apps', label: 'Get apps and extensions', icon: 'monitor' },
  { id: 'gift', label: 'Gift Claude', icon: 'share' },
  { separator: true },
  { id: 'logout', label: 'Log out' },
];
const ONBOARDING = {
  mode: 'progress',
  heading: 'Get started with Claude',
  tasks: [
    { id: 'role', label: 'Customize Claude to your role', description: 'Add ready-made tools and workflows' },
    { id: 'sched', label: 'Schedule a recurring task', description: 'Great for reminders, reports, or regular check-ins' },
  ],
};
const STATS = [
  { label: 'Sessions', value: '408' }, { label: 'Messages', value: '363,676' },
  { label: 'Total tokens', value: '181.5M' }, { label: 'Active days', value: '79' },
  { label: 'Current streak', value: '17d' }, { label: 'Longest streak', value: '27d' },
  { label: 'Peak hour', value: '7 AM' }, { label: 'Favorite model', value: 'Opus 4.8' },
];

const iconBtn = 'inline-flex size-7 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]';

export const Prototype: Story = {
  render: () => {
    const [view, setView] = createSignal<'home' | 'code'>('home');
    const [designOpen, setDesignOpen] = createSignal(false);

    let ws!: El, tabs!: El, nav!: El, sugg!: El, model!: El, effort!: El, plus!: El, promo!: El, notice!: El, coach!: El, input!: El, menu!: El, designBtn!: El, screen!: El, tasks!: El;

    onMount(() => {
      ws.conversations = RECENTS; ws.compact = true;
      nav.items = NAV; nav.defaultValue = 'new';
      sugg.suggestions = IDEAS; sugg.layout = 'list';
      model.models = MODELS; model.currentModel = 'opus';
      effort.items = [{ id: 'high', label: 'High', checked: true }, { id: 'med', label: 'Medium' }];
      plus.items = [{ id: 'attach', label: 'Add files', icon: 'paperclip' }, { id: 'project', label: 'From a project', icon: 'box' }];
      notice.dismissible = true;
      input.attach = false;
      coach.tone = 'info';
      promo.heading = '2× usage for Cowork'; promo.description = 'Do more with a higher session limit, now through July 5.'; promo.dismissible = true;
      menu.items = MENU_ITEMS;
      tasks.data = ONBOARDING;

      // interactions
      tabs.items = TABS; tabs.defaultValue = 'home'; tabs.block = true;
      tabs.addEventListener('kai-tab-change', (e) => setView((e as CustomEvent).detail.value));
      designBtn.addEventListener('kai-click', () => setDesignOpen(true));
      screen.addEventListener('kai-back', () => setDesignOpen(false));
      screen.addEventListener('kai-open-change', (e) => setDesignOpen((e as CustomEvent).detail.open));
    });

    return (
      <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
        <kai-workspace ref={ws} style={{ height: '100%', display: 'block' }}>
          {/* sidebar-header: chrome + full-width tabs + nav */}
          <div slot="sidebar-header" style={{ padding: '0.5rem 0.625rem 0' }}>
            <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.25rem', 'padding-bottom': '0.5rem' }}>
              <button class={iconBtn} aria-label="Toggle sidebar"><PanelLeft class="size-4" /></button>
              <button class={iconBtn} aria-label="Search"><Search class="size-4" /></button>
            </div>
            <kai-tabs ref={tabs} variant="segmented"></kai-tabs>
            <div style={{ 'margin-top': '0.5rem' }}><kai-nav ref={nav}></kai-nav></div>
          </div>

          {/* sidebar-footer: checklist + Design (-> kai-screen) + user menu */}
          <div slot="sidebar-footer">
            <div style={{ padding: '0.5rem 0.625rem' }}><kai-tasks ref={tasks}></kai-tasks></div>
            <kai-button ref={designBtn} variant="ghost" icon="workflow" style={{ display: 'flex', width: '100%', 'justify-content': 'flex-start', 'border-top': '1px solid var(--color-border)', 'border-radius': '0' }}>Design</kai-button>
            <div style={{ 'border-top': '1px solid var(--color-border)', padding: '0.375rem 0.5rem' }}>
              <kai-menu ref={menu}>
                <button slot="trigger" style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', width: '100%', padding: '0.375rem 0.5rem', 'border-radius': '0.5rem', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <kai-avatar fallback="RT" size="sm"></kai-avatar>
                    <kai-status status="new" pulse style={{ position: 'absolute', right: '-2px', bottom: '-2px' }}></kai-status>
                  </span>
                  <span style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>Rob</span>
                  <span style={{ 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)', 'margin-right': 'auto' }}>Max</span>
                </button>
              </kai-menu>
            </div>
          </div>

          {/* main: swaps Home <-> Code */}
          <div slot="main" style={{ position: 'relative', height: '100%' }}>
            <Show when={view() === 'home'}>
              <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'padding-top': '12vh', gap: '1.5rem', height: '100%' }}>
                <h1 style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'font-family': 'Georgia, serif', 'font-size': '2.25rem', 'font-weight': '400' }}>
                  <Asterisk class="size-7" style={{ color: '#d97757' }} /> Good evening, Rob
                </h1>
                <div style={{ width: '100%', 'max-width': '660px', display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
                  <kai-notice ref={notice}>Claude Fable 5 is currently unavailable.<a slot="action" href="#" style={{ color: 'var(--color-foreground)', 'text-decoration': 'underline' }}>Learn more</a></kai-notice>
                  <kai-prompt-input ref={input} placeholder="How can I help you today?">
                    <div slot="toolbar-start" style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                      <kai-menu ref={plus} trigger-icon="plus" label="Add"></kai-menu>
                      <kai-coachmark ref={coach} default-open headline="Cowork has a new home" badge="New">
                        <kai-button variant="subtle" icon="workflow">Cowork</kai-button>
                        <span slot="content">Chat with Claude here, or switch to Cowork to build alongside it.</span>
                      </kai-coachmark>
                    </div>
                    <div slot="toolbar-end" style={{ display: 'flex', 'align-items': 'center', gap: '0.375rem' }}>
                      <kai-model-switcher ref={model}></kai-model-switcher>
                      <kai-menu ref={effort} trigger-label="High" trigger-icon-trailing="chevron-down"></kai-menu>
                      <kai-button variant="subtle" size="icon-sm" icon="mic" label="Voice"></kai-button>
                    </div>
                  </kai-prompt-input>
                  <div style={{ 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)', 'margin-top': '5.5rem' }}>Ideas for you</div>
                  <kai-suggestions ref={sugg}></kai-suggestions>
                </div>
                <kai-card ref={promo} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', width: '264px', display: 'block' }}>
                  <div slot="media" style={{ height: '80px', display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'font-size': '2.25rem', background: 'var(--color-muted)', 'border-radius': '0.5rem' }}>🤞</div>
                  <kai-button slot="actions" style={{ width: '100%' }}>Start task</kai-button>
                </kai-card>
              </div>
            </Show>

            <Show when={view() === 'code'}>
              <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'padding-top': '8vh', gap: '1.5rem', height: '100%' }}>
                <h1 style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'font-family': 'Georgia, serif', 'font-size': '1.875rem', 'font-weight': '400' }}>
                  <Asterisk class="size-6" style={{ color: '#d97757' }} /> What's up next, Rob?
                </h1>
                <div style={{ width: '100%', 'max-width': '680px', display: 'grid', 'grid-template-columns': 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {STATS.map((s) => (<kai-stat label={s.label} value={s.value}></kai-stat>))}
                </div>
                <div style={{ width: '100%', 'max-width': '680px', 'margin-top': 'auto', 'margin-bottom': '1.5rem' }}>
                  <kai-prompt-input placeholder="Describe a task or ask a question"></kai-prompt-input>
                </div>
              </div>
            </Show>
          </div>
        </kai-workspace>

        {/* Design takeover: a kai-screen peer that fills the app root when open */}
        <kai-screen ref={screen} open={designOpen()} headline="Design">
          <div style={{ padding: '2rem', height: '100%' }}>
            <h2 style={{ 'font-family': 'Georgia, serif', 'font-size': '1.75rem', 'font-weight': '400' }}>Claude Design</h2>
            <p style={{ color: 'var(--color-muted-foreground)', 'margin-top': '0.5rem' }}>A separate full-screen app, mounted into the kai-screen takeover. Press Back to return.</p>
          </div>
        </kai-screen>
      </div>
    );
  },
};
