import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import { PanelLeft, Search, SlidersHorizontal, Asterisk, ListChecks } from 'lucide-solid';
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
const RECENTS: KaiNavItem[] = RECENT_TITLES.map((t, i) => ({ id: `r${i}`, label: t, icon: 'circle' }));
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
    let tabs!: El, nav!: El, recents!: El, sugg!: El, model!: El, effort!: El, plus!: El, promo!: El, notice!: El;
    onMount(() => {
      tabs.items = TABS; tabs.value = 'home';
      nav.items = NAV; nav.defaultValue = 'new';
      recents.items = RECENTS;
      sugg.suggestions = IDEAS; sugg.layout = 'list';
      model.models = MODELS; model.currentModel = 'opus';
      effort.items = [{ id: 'high', label: 'High', checked: true }, { id: 'med', label: 'Medium' }];
      plus.items = [{ id: 'attach', label: 'Add files', icon: 'paperclip' }, { id: 'project', label: 'From a project', icon: 'box' }];
      notice.dismissible = true;
      promo.heading = '2x usage for Cowork'; promo.description = 'Do more with a higher session limit, now through July 5.'; promo.dismissible = true;
    });
    return (
      <div style={{ display: 'flex', height: '840px', width: '100%', background: 'var(--color-background)', color: 'var(--color-foreground)' }}>
        {/* recolor the coachmark bubble blue (the Claude tint) from outside via ::part */}
        <style>{`kai-coachmark::part(bubble){background:var(--color-tool-blue);color:#fff} kai-coachmark::part(arrow){background:var(--color-tool-blue)} kai-coachmark::part(title){color:#fff} kai-coachmark::part(dismiss){color:#fff}`}</style>

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
              <kai-avatar fallback="RT" size="sm"></kai-avatar>
              <kai-status status="new" pulse style={{ position: 'absolute', right: '-2px', bottom: '-2px' }}></kai-status>
            </span>
            <span style={{ 'font-weight': '500', 'font-size': '0.875rem' }}>Rob</span>
            <span style={{ 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)' }}>Max</span>
          </div>
        </aside>

        {/* ── MAIN ─────────────────────────────────────────────────── */}
        <main style={{ flex: '1', position: 'relative', display: 'flex', 'flex-direction': 'column', 'align-items': 'center', 'padding-top': '14vh', gap: '1.5rem' }}>
          <h1 style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem', 'font-family': 'Georgia, "Times New Roman", serif', 'font-size': '2.25rem', 'font-weight': '400', color: 'var(--color-foreground)' }}>
            <Asterisk class="size-7" style={{ color: '#d97757' }} /> Good evening, Rob
          </h1>

          <div style={{ width: '100%', 'max-width': '660px', display: 'flex', 'flex-direction': 'column', gap: '0.75rem' }}>
            <kai-notice ref={notice}>
              Claude Fable 5 is currently unavailable.
              <a slot="action" href="#" style={{ color: 'var(--color-foreground)', 'text-decoration': 'underline' }}>Learn more</a>
            </kai-notice>

            <kai-prompt-input placeholder="How can I help you today?">
              <div slot="toolbar-start" style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
                <kai-menu ref={plus} trigger-icon="plus" label="Add"></kai-menu>
                <kai-coachmark default-open headline="Cowork has a new home" badge="New" placement="bottom">
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

            <div style={{ 'font-size': '0.8125rem', color: 'var(--color-muted-foreground)', 'margin-top': '0.5rem' }}>Ideas for you</div>
            <kai-suggestions ref={sugg}></kai-suggestions>
          </div>

          <kai-card ref={promo} style={{ position: 'absolute', bottom: '1.25rem', right: '1.25rem', width: '264px', display: 'block' }}>
            <div slot="media" style={{ height: '88px', display: 'flex', 'align-items': 'center', 'justify-content': 'center', 'font-size': '2.5rem', background: 'var(--color-muted)', 'border-radius': '0.5rem' }}>🫰</div>
            <button slot="actions" style={{ width: '100%', padding: '0.5rem', 'border-radius': '0.5rem', border: 'none', cursor: 'pointer', 'font-weight': '500', background: 'var(--color-foreground)', color: 'var(--color-background)' }}>Start task</button>
          </kai-card>
        </main>
      </div>
    );
  },
};
