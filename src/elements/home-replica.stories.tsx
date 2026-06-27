import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import { PanelLeft, Search, SlidersHorizontal, Asterisk, ListChecks, Sparkles } from 'lucide-solid';
import './register'; // registers every kai-* element used below
import { TasksCard, type TasksCardData } from '../components/tasks-card';
import type { KaiNavItem } from '../ui/nav';

// Labs: a faithful replica of the Claude desktop Home screen, built entirely from
// kit components in a consumer-authored layout. The point is to see how close the
// kit gets to a real product shell.

const meta = { title: 'Labs/Home Replica', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;
type El = HTMLElement & Record<string, unknown>;

const TABS: KaiNavItem[] = [
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
const RECENT_TITLES = [
  'Platinum Eagle Coin Sale Value', 'Precious Metals Data Conversion', 'Markdown file conversion',
  'Fiddl app logo design concepts', 'Cloudflare Email Service pricing', 'TypeScript email provider emulator',
  'Restoring focus after dialog closure', 'Creating sandbox environments', 'Remote computer control request',
  'Claude desktop update not installing', 'Checking Claude version', 'How compound interest works', 'Untitled',
];
const RECENTS: KaiNavItem[] = RECENT_TITLES.map((t, i) => ({ id: `r${i}`, label: t, icon: 'message-square' }));
const IDEAS = [
  { label: 'Send me a daily briefing', icon: 'sparkles', value: 'brief' },
  { label: 'Organize my inbox', icon: 'folder', value: 'inbox' },
  { label: 'Customize Cowork for me', icon: 'file-text', value: 'customize' },
];
const MODELS = [{ id: 'opus', name: 'Opus 4.8' }, { id: 'sonnet', name: 'Sonnet 4.6' }];
const ONBOARDING: TasksCardData = {
  mode: 'progress',
  heading: 'Get started with Claude',
  tasks: [
    { id: 'role', label: 'Customize Claude to your role', description: 'Add ready-made tools and workflows' },
    { id: 'sched', label: 'Schedule a recurring task', description: 'Great for reminders, reports, or regular check-ins' },
  ],
};

const iconBtn = 'inline-flex size-7 items-center justify-center rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]';

export const Home: Story = {
  render: () => {
    let tabs!: El, nav!: El, recents!: El, sugg!: El, model!: El, effort!: El, plus!: El, notice!: El, coach!: El, input!: El;
    onMount(() => {
      tabs.items = TABS; tabs.value = 'home';
      nav.items = NAV; nav.defaultValue = 'new';
      recents.items = RECENTS;
      sugg.suggestions = IDEAS; sugg.layout = 'list';
      model.models = MODELS; model.currentModel = 'opus';
      effort.items = [{ id: 'high', label: 'High', checked: true }, { id: 'med', label: 'Medium' }];
      plus.items = [{ id: 'attach', label: 'Add files', icon: 'paperclip' }, { id: 'project', label: 'From a project', icon: 'box' }];
      notice.dismissible = true;
      input.attach = false;
      coach.tone = 'info';
    });
    return (
      <div style={{ display: 'flex', height: '840px', width: '100%', background: 'var(--color-background)', color: 'var(--color-foreground)' }}>
        {/* ── SIDEBAR ──────────────────────────────────────────────── */}
        <aside style={{ width: '288px', display: 'flex', 'flex-direction': 'column', 'border-right': '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', 'justify-content': 'flex-end', gap: '0.25rem', padding: '0.5rem 0.625rem' }}>
            <button class={iconBtn}><PanelLeft class="size-4" /></button>
            <button class={iconBtn}><Search class="size-4" /></button>
          </div>
          <div style={{ padding: '0 0.625rem' }}>
            <kai-tabs ref={tabs} variant="segmented"></kai-tabs>
          </div>
          <div style={{ padding: '0.5rem 0.375rem 0' }}>
            <kai-nav ref={nav}></kai-nav>
          </div>
          <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', padding: '0.75rem 0.75rem 0.25rem', color: 'var(--color-muted-foreground)' }}>
            <span style={{ 'font-size': '0.75rem' }}>Recents</span>
            <SlidersHorizontal class="size-3.5" />
          </div>
          <div style={{ flex: '1', 'overflow-y': 'auto', padding: '0 0.375rem', 'min-height': '0' }}>
            <kai-nav ref={recents}></kai-nav>
          </div>
          <div style={{ padding: '0.5rem 0.75rem' }}>
            <TasksCard data={ONBOARDING} cardId="onboarding" />
          </div>
          <div style={{ 'border-top': '1px solid var(--color-border)', padding: '0.5rem 0.75rem', display: 'flex', 'align-items': 'center', gap: '0.625rem', color: 'var(--color-muted-foreground)', 'font-size': '0.875rem' }}>
            <ListChecks class="size-4" /> Design
          </div>
          <div style={{ 'border-top': '1px solid var(--color-border)', padding: '0.625rem 0.75rem', display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <kai-avatar fallback="JD" size="sm"></kai-avatar>
              <kai-status status="new" pulse style={{ position: 'absolute', right: '-2px', bottom: '-2px' }}></kai-status>
            </span>
            <span style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>John</span>
            <span style={{ 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)' }}>Max</span>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────────── */}
        <main style={{ flex: '1', position: 'relative', display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'padding-top': '14vh', gap: '1.5rem' }}>
          <h1 style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'font-family': 'Georgia, "Times New Roman", serif', 'font-size': '2.25rem', 'font-weight': '400', color: 'var(--color-foreground)' }}>
            <Asterisk class="size-7" style={{ color: '#d97757' }} /> Good evening, John
          </h1>

          <div style={{ width: '100%', 'max-width': '660px', display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
            <kai-notice ref={notice}>
              Claude Fable 5 is currently unavailable.
              <a slot="action" href="#" style={{ color: 'var(--color-foreground)', 'text-decoration': 'underline' }}>Learn more</a>
            </kai-notice>

            <kai-prompt-input ref={input} placeholder="How can I help you today?">
              <div slot="toolbar-start" style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <kai-menu ref={plus} trigger-icon="plus" label="Add"></kai-menu>
                <kai-coachmark ref={coach} default-open headline="Cowork has a new home" badge="New" placement="bottom">
                  <button style={{ display: 'inline-flex', 'align-items': 'center', gap: '0.375rem', padding: '0.25rem 0.625rem', 'border-radius': '0.5rem', border: 'none', cursor: 'pointer', 'font-size': '0.8125rem', 'font-weight': '500', background: 'color-mix(in srgb, var(--color-tool-blue) 22%, transparent)', color: 'var(--color-tool-blue)' }}>
                    <ListChecks class="size-4" /> Cowork
                  </button>
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

          <kai-card appearance="filled" dismissible style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', width: '264px', display: 'block' }}>
            <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
              <div style={{ height: '88px', display: 'flex', 'align-items': 'center', 'justify-content': 'center', background: 'var(--color-muted)', 'border-radius': '0.5rem' }}><Sparkles class="size-7 text-primary" /></div>
              <div>
                <strong style={{ display: 'block', 'font-size': '0.9375rem', 'font-weight': 600 }}>2× usage for Cowork</strong>
                <p style={{ 'margin-top': '0.25rem', 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)' }}>Do more with a higher session limit, now through July 5.</p>
              </div>
              <kai-button full>Start task</kai-button>
            </div>
          </kai-card>
        </main>
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'html',
        code: `<!-- A consumer-authored shell (your own flex layout), composed from kai-* elements.
     There is no kai-workspace here; the kit just supplies the parts. -->
<div class="app">
  <!-- SIDEBAR -->
  <aside>
    <kai-tabs variant="segmented"></kai-tabs>
    <kai-nav></kai-nav>            <!-- primary nav -->
    <span>Recents</span>
    <kai-nav></kai-nav>            <!-- recent threads -->
    <!-- ...onboarding TasksCard... -->
    <span>
      <kai-avatar fallback="JD" size="sm"></kai-avatar>
      <kai-status status="new" pulse></kai-status>
    </span>
  </aside>

  <!-- MAIN -->
  <main>
    <h1>Good evening, John</h1>

    <kai-notice>
      Claude Fable 5 is currently unavailable.
      <a slot="action" href="#">Learn more</a>
    </kai-notice>

    <kai-prompt-input placeholder="How can I help you today?">
      <div slot="toolbar-start">
        <kai-menu trigger-icon="plus" label="Add"></kai-menu>
        <kai-coachmark default-open headline="Cowork has a new home" badge="New" placement="bottom">
          <button>Cowork</button>
          <span slot="content">Chat here, or switch to Cowork to build alongside it.</span>
        </kai-coachmark>
      </div>
      <div slot="toolbar-end">
        <kai-model-switcher></kai-model-switcher>
        <kai-menu trigger-label="High" trigger-icon-trailing="chevron-down"></kai-menu>
        <kai-button variant="subtle" size="icon-sm" icon="mic" label="Voice"></kai-button>
      </div>
    </kai-prompt-input>

    <kai-suggestions></kai-suggestions>

    <!-- a dismissible promo card, pinned bottom-right -->
    <kai-card appearance="filled" dismissible>/* illustration + title + CTA */</kai-card>
  </main>
</div>

<script type="module">
  // Array/object props are set as JS properties, never attributes.
  const tabs = document.querySelector('kai-tabs');
  tabs.items = [/* KaiNavItem[] */];
  tabs.value = 'home';

  const [nav, recents] = document.querySelectorAll('kai-nav');
  nav.items = [/* KaiNavItem[] */];
  nav.defaultValue = 'new';
  recents.items = [/* KaiNavItem[] */];

  const sugg = document.querySelector('kai-suggestions');
  sugg.suggestions = [/* { label, icon, value }[] */];
  sugg.layout = 'list';

  document.querySelector('kai-model-switcher').models = [/* { id, name }[] */];

  // Each kai-menu owns its list: menu.items = [/* { id, label, icon }[] */]
</script>`,
      },
    },
  },
};
