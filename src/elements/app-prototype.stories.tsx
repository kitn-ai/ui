import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, Show } from 'solid-js';
import { Asterisk } from 'lucide-solid';
import './register'; // every kai-* element used below
import type { KaiNavItem } from '../ui/nav';
import type { KaiTabItem } from '../ui/tabs';
import type { ConversationSummary } from '../types';

// Labs: a working interactive prototype of the Claude desktop app, built on
// kai-workspace + the kai-* elements. Home/Code swap the main view via kai-tabs;
// Design opens the kai-screen takeover; the rail collapses; the user menu and
// Recents filter are real kai-menus. The purpose is to find gaps. Styling is
// Tailwind utilities (the storybook preview scans src/, so they generate).

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

// Repeated patterns, named for readability.
const greeting = 'flex items-center gap-2 font-serif font-normal';
const mainView = 'flex h-full flex-col items-center gap-6';
const footerRow = 'border-t border-border';

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
      <div class="relative h-screen w-full">
        <kai-workspace ref={ws} class="block h-full">
          {/* sidebar-header: chrome + full-width tabs + nav */}
          <div slot="sidebar-header" class="px-2.5 pt-2">
            <div class="flex justify-end gap-1 pb-2">
              <kai-button variant="ghost" size="icon-sm" icon="panel-left" label="Toggle sidebar"></kai-button>
              <kai-button variant="ghost" size="icon-sm" icon="search" label="Search"></kai-button>
            </div>
            <kai-tabs ref={tabs} variant="segmented"></kai-tabs>
            <div class="mt-2"><kai-nav ref={nav}></kai-nav></div>
          </div>

          {/* sidebar-footer: checklist + Design (-> kai-screen) + user menu */}
          <div slot="sidebar-footer">
            <div class="px-2.5 py-2"><kai-tasks ref={tasks}></kai-tasks></div>
            <kai-button ref={designBtn} variant="ghost" icon="workflow" class={`flex w-full justify-start rounded-none ${footerRow}`}>Design</kai-button>
            <div class={`${footerRow} px-2 py-1.5`}>
              <kai-menu ref={menu}>
                <button slot="trigger" class="flex w-full cursor-pointer items-center gap-2 rounded-lg border-0 bg-transparent px-2 py-1.5">
                  <span class="relative inline-flex">
                    <kai-avatar fallback="RT" size="sm"></kai-avatar>
                    <kai-status status="new" pulse class="absolute -right-0.5 -bottom-0.5"></kai-status>
                  </span>
                  <span class="text-sm font-medium">Rob</span>
                  <span class="mr-auto text-[0.8125rem] text-muted-foreground">Max</span>
                </button>
              </kai-menu>
            </div>
          </div>

          {/* main: swaps Home <-> Code */}
          <div slot="main" class="relative h-full">
            <Show when={view() === 'home'}>
              <div class={`${mainView} pt-[12vh]`}>
                <h1 class={`${greeting} text-4xl`}>
                  <Asterisk class="size-7 text-[#d97757]" /> Good evening, Rob
                </h1>
                <div class="flex w-full max-w-[660px] flex-col gap-3">
                  <kai-notice ref={notice}>Claude Fable 5 is currently unavailable.<a slot="action" href="#" class="text-foreground underline">Learn more</a></kai-notice>
                  <kai-prompt-input ref={input} placeholder="How can I help you today?">
                    <div slot="toolbar-start" class="flex items-center gap-2">
                      <kai-menu ref={plus} trigger-icon="plus" label="Add"></kai-menu>
                      <kai-coachmark ref={coach} default-open headline="Cowork has a new home" badge="New">
                        <kai-button variant="subtle" icon="workflow">Cowork</kai-button>
                        <span slot="content">Chat with Claude here, or switch to Cowork to build alongside it.</span>
                      </kai-coachmark>
                    </div>
                    <div slot="toolbar-end" class="flex items-center gap-1.5">
                      <kai-model-switcher ref={model}></kai-model-switcher>
                      <kai-menu ref={effort} trigger-label="High" trigger-icon-trailing="chevron-down"></kai-menu>
                      <kai-button variant="subtle" size="icon-sm" icon="mic" label="Voice"></kai-button>
                    </div>
                  </kai-prompt-input>
                  <div class="mt-22 text-[0.8125rem] text-muted-foreground">Ideas for you</div>
                  <kai-suggestions ref={sugg}></kai-suggestions>
                </div>
                <kai-card ref={promo} class="absolute right-5 bottom-5 block w-[264px]">
                  <div slot="media" class="flex h-20 items-center justify-center rounded-lg bg-muted text-4xl">🤞</div>
                  <kai-button slot="actions" class="w-full">Start task</kai-button>
                </kai-card>
              </div>
            </Show>

            <Show when={view() === 'code'}>
              <div class={`${mainView} pt-[8vh]`}>
                <h1 class={`${greeting} text-3xl`}>
                  <Asterisk class="size-6 text-[#d97757]" /> What's up next, Rob?
                </h1>
                <div class="grid w-full max-w-[680px] grid-cols-4 gap-2">
                  {STATS.map((s) => (<kai-stat label={s.label} value={s.value}></kai-stat>))}
                </div>
                <div class="mt-auto mb-6 w-full max-w-[680px]">
                  <kai-prompt-input placeholder="Describe a task or ask a question"></kai-prompt-input>
                </div>
              </div>
            </Show>
          </div>
        </kai-workspace>

        {/* Design takeover: a kai-screen peer that fills the app root when open */}
        <kai-screen ref={screen} open={designOpen()} headline="Design">
          <div class="h-full p-8">
            <h2 class="font-serif text-3xl font-normal">Claude Design</h2>
            <p class="mt-2 text-muted-foreground">A separate full-screen app, mounted into the kai-screen takeover. Press Back to return.</p>
          </div>
        </kai-screen>
      </div>
    );
  },
};
