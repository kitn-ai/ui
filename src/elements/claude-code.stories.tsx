import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, Show } from 'solid-js';
import { Asterisk, Sparkles, Download } from 'lucide-solid';
import './register'; // every kai-* element used below
import type { KaiNavItem } from '../ui/nav';
import type { KaiTabItem } from '../ui/tabs';
import type { KaiCommandItem } from './command';
import type { ConversationSummary } from '../types';

// Labs: a working interactive prototype of the Claude desktop app, built on
// kai-workspace + the kai-* elements. Home/Code swap the main view via kai-tabs;
// Design opens the kai-screen takeover; the rail collapses; the user menu and
// Recents filter are real kai-menus. It showcases the kit composing a full
// desktop shell. Styling is Tailwind utilities (the storybook preview scans
// src/, so they generate).

// kai-tasks, kai-command, and kai-icon are used as JSX elements here without their
// stories' own facades, so declare their tags locally.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-tasks': JSX.HTMLAttributes<HTMLElement>;
      'kai-command': JSX.HTMLAttributes<HTMLElement> & { placeholder?: string; 'empty-label'?: string; theme?: string };
      'kai-icon': JSX.HTMLAttributes<HTMLElement> & { name?: string; size?: string };
      'kai-tooltip': JSX.HTMLAttributes<HTMLElement> & { content?: string; 'open-delay'?: number | string };
    }
  }
}

const meta = { title: 'Labs/Apps', parameters: { layout: 'fullscreen' } } satisfies Meta;
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
// [title, updatedAt]. Times are spread so the kai-conversations trailing
// auto-derives varied relative labels (a few hours ago through ~four weeks),
// instead of every row reading "1d ago" off one shared timestamp.
const RECENTS: ConversationSummary[] = ([
  ['Postgres index tuning', '2026-06-27T07:30:00Z'],
  ['Dark-mode token audit', '2026-06-27T01:15:00Z'],
  ['Markdown file conversion', '2026-06-26T16:00:00Z'],
  ['Webhook retry backoff', '2026-06-25T09:00:00Z'],
  ['Cloudflare Email Service pricing', '2026-06-24T14:00:00Z'],
  ['TypeScript email provider emulator', '2026-06-22T11:00:00Z'],
  ['Restoring focus after dialog closure', '2026-06-20T10:00:00Z'],
  ['Creating sandbox environments', '2026-06-18T10:00:00Z'],
  ['Remote computer control request', '2026-06-15T10:00:00Z'],
  ['Claude desktop update not installing', '2026-06-12T10:00:00Z'],
  ['Checking Claude version', '2026-06-06T10:00:00Z'],
  ['How compound interest works', '2026-05-30T10:00:00Z'],
] as const).map(([title, ts], i) => ({ id: `r${i}`, title, scope: { type: 'document' }, messageCount: 3, lastMessageAt: ts, updatedAt: ts }));
const IDEAS = [
  { label: 'Send me a daily briefing', icon: 'sparkles', value: 'brief' },
  { label: 'Organize my inbox', icon: 'folder', value: 'inbox' },
  { label: 'Customize Cowork for me', icon: 'file-text', value: 'customize' },
];
const MODELS = [{ id: 'opus', name: 'Opus 4.8' }, { id: 'sonnet', name: 'Sonnet 4.6' }];
// Command center contents. A flat KaiCommandItem[] (the kai-command `items` prop);
// the element buckets them into sections by `group`.
const COMMANDS: KaiCommandItem[] = [
  { id: 'new-chat', label: 'New chat', icon: 'square-pen', group: 'Quick actions' },
  { id: 'new-project', label: 'New project', icon: 'box', group: 'Quick actions' },
  { id: 'upload', label: 'Upload files', icon: 'paperclip', group: 'Quick actions' },
  { id: 'rc-postgres', label: 'Postgres index tuning', icon: 'message-square', group: 'Recents' },
  { id: 'rc-tokens', label: 'Dark-mode token audit', icon: 'message-square', group: 'Recents' },
  { id: 'rc-markdown', label: 'Markdown file conversion', icon: 'message-square', group: 'Recents' },
  { id: 'go-projects', label: 'Projects', icon: 'box', group: 'Go to' },
  { id: 'go-artifacts', label: 'Artifacts', icon: 'workflow', group: 'Go to' },
  { id: 'go-scheduled', label: 'Scheduled', icon: 'clock', group: 'Go to' },
  { id: 'go-customize', label: 'Customize', icon: 'briefcase', group: 'Go to' },
  { id: 'settings', label: 'Settings', icon: 'settings', group: 'Settings' },
  { id: 'help', label: 'Get help', icon: 'message-circle', group: 'Settings' },
];
const MENU_ITEMS = [
  { heading: true, label: 'john@example.com' },
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
// Repeated patterns, named for readability.
const greeting = 'flex items-center gap-2 font-serif font-normal';
const mainView = 'flex h-full flex-col items-center gap-6';
const footerRow = 'border-t border-border';

// A labeled placeholder for a region the consumer owns. It names the slot it
// fills so the prototype documents the shell instead of faking app content. An
// optional `icon` paints a large muted glyph above the label.
function SlotPlaceholder(props: { label: string; hint: string; icon?: string }) {
  return (
    <div class="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-10 text-center">
      <Show when={props.icon}>
        <kai-icon name={props.icon} class="slot-placeholder-icon text-muted-foreground"></kai-icon>
      </Show>
      <div class="text-sm font-medium text-foreground">{props.label}</div>
      <div class="max-w-sm text-[0.8125rem] leading-relaxed text-muted-foreground">{props.hint}</div>
    </div>
  );
}

export const ClaudeCode: Story = {
  name: 'Claude Code',
  render: () => {
    const [view, setView] = createSignal<'home' | 'code'>('home');
    const [designOpen, setDesignOpen] = createSignal(false);
    const [cmdOpen, setCmdOpen] = createSignal(false);
    // Captured in the workspace ref so the sidebar-header toggle can drive its
    // exposed imperative API (toggleSidebar) from a sibling element's ref.
    let ws: El | undefined;

    // Array/object props (and event wiring) are applied in each element's ref
    // callback, NOT a one-shot onMount. The Home view lives inside <Show>, so it
    // unmounts/remounts on tab switch; a ref runs on every (re)mount, so the
    // remounted elements keep their data + styling. onMount would run only once.
    return (
      <div class="relative h-screen w-full">
        {/* Size the placeholder glyphs large: a class-qualified ::part selector
            outranks kai-icon's own fixed-size class on the part. */}
        <style>{`.slot-placeholder-icon::part(icon) { width: 2.25rem; height: 2.25rem }`}</style>
        <kai-workspace ref={(el) => { ws = el as El; ws.conversations = RECENTS; ws.compact = true; }} class="block h-full" sidebar-min-width="240" collapse-below="720">
          {/* sidebar-header: chrome + full-width tabs + nav */}
          <div slot="sidebar-header" class="px-2.5 pt-2">
            <div class="flex justify-between gap-1 pb-2">
              <kai-tooltip content="Toggle sidebar">
                <kai-button
                  ref={(el) => { el.addEventListener('kai-click', () => (ws?.toggleSidebar as (() => void) | undefined)?.()); }}
                  variant="ghost"
                  size="icon-sm"
                  icon="panel-left"
                  label="Toggle sidebar"
                ></kai-button>
              </kai-tooltip>
              <kai-tooltip content="Search">
                <kai-button
                  ref={(el) => { el.addEventListener('kai-click', () => setCmdOpen(true)); }}
                  variant="ghost"
                  size="icon-sm"
                  icon="search"
                  label="Search"
                ></kai-button>
              </kai-tooltip>
            </div>
            <kai-tabs
              ref={(el) => {
                const t = el as El;
                t.items = TABS; t.defaultValue = 'home'; t.block = true;
                el.addEventListener('kai-tab-change', (e) => setView((e as CustomEvent).detail.value));
              }}
              variant="segmented"
            ></kai-tabs>
            <div class="mt-2"><kai-nav ref={(el) => { const n = el as El; n.items = NAV; n.defaultValue = 'new'; }}></kai-nav></div>
          </div>

          {/* sidebar-footer: checklist + Design (-> kai-screen) + user menu */}
          <div slot="sidebar-footer">
            <div class="px-2.5 py-2"><kai-tasks ref={(el) => { (el as El).data = ONBOARDING; }}></kai-tasks></div>
            <kai-separator></kai-separator>
            <div class="px-2.5 py-1.5">
              <kai-button
                ref={(el) => { el.addEventListener('kai-click', () => setDesignOpen(true)); }}
                full
                align="start"
                variant="ghost"
                icon="workflow"
              >Design</kai-button>
            </div>
            <div class={`${footerRow} flex items-center px-2 py-1.5`}>
              <kai-menu ref={(el) => { (el as El).items = MENU_ITEMS; }} label="Account menu">
                {/* The trigger content is NON-interactive: kai-menu wraps it in its
                    own <button>, so a button/kai-button here would double-nest. */}
                <div slot="trigger" class="flex items-center gap-2 text-left">
                  <kai-avatar fallback="JD" size="sm"></kai-avatar>
                  <span class="text-sm font-medium">John</span>
                  <span class="text-[0.8125rem] text-muted-foreground">Max</span>
                </div>
              </kai-menu>
              <span class="relative ml-auto inline-flex">
                <kai-tooltip content="Sync">
                  <kai-button variant="ghost" size="icon-sm" label="Sync"><Download slot="icon" class="size-4" /></kai-button>
                </kai-tooltip>
                <kai-status status="new" pulse class="pointer-events-none absolute -top-0.5 -right-0.5"></kai-status>
              </span>
            </div>
          </div>

          {/* main: swaps Home <-> Code */}
          <div slot="main" class="relative h-full">
            <Show when={view() === 'home'}>
              <div class={`${mainView} justify-center`}>
                <h1 class={`${greeting} text-4xl`}>
                  <Asterisk class="size-7 text-[#d97757]" /> Good day, mate
                </h1>
                <div class="flex w-full max-w-[660px] flex-col gap-3">
                  <kai-notice ref={(el) => { (el as El).dismissible = true; }}>Claude Fable 5 is currently unavailable.<a slot="action" href="#" class="text-foreground underline">Learn more</a></kai-notice>
                  <kai-prompt-input ref={(el) => { (el as El).attach = false; }} placeholder="How can I help you today?">
                    <div slot="toolbar-start" class="flex items-center gap-2">
                      <kai-menu ref={(el) => { (el as El).items = [{ id: 'attach', label: 'Add files', icon: 'paperclip' }, { id: 'project', label: 'From a project', icon: 'box' }]; }} trigger-icon="plus" label="Add"></kai-menu>
                      <kai-coachmark
                        default-open
                        headline="Cowork has a new home"
                        badge="New"
                        style={{ '--kai-coachmark-bg': 'var(--color-tool-blue)', '--kai-coachmark-fg': 'var(--color-background)' }}
                      >
                        <kai-button variant="subtle" size="sm" icon="workflow">Cowork</kai-button>
                        <span slot="content">Chat with Claude here, or switch to Cowork to build alongside it.</span>
                      </kai-coachmark>
                    </div>
                    <div slot="toolbar-end" class="flex items-center gap-1.5">
                      <kai-model-switcher ref={(el) => { const m = el as El; m.models = MODELS; m.currentModel = 'opus'; }}></kai-model-switcher>
                      <kai-menu ref={(el) => { (el as El).items = [{ id: 'high', label: 'High', checked: true }, { id: 'med', label: 'Medium' }]; }} trigger-label="High" trigger-icon-trailing="chevron-down"></kai-menu>
                      <kai-tooltip content="Voice">
                        <kai-button variant="subtle" size="icon-sm" icon="mic" label="Voice"></kai-button>
                      </kai-tooltip>
                    </div>
                  </kai-prompt-input>
                  <div class="mt-2 text-[0.8125rem] text-muted-foreground">Ideas for you</div>
                  <kai-suggestions ref={(el) => { const s = el as El; s.suggestions = IDEAS; s.layout = 'list'; }} variant="ghost" size="lg"></kai-suggestions>
                </div>
                <kai-card appearance="filled" dismissible class="absolute right-5 bottom-5 block w-[264px]">
                  <div class="flex flex-col gap-3">
                    <div class="flex h-20 items-center justify-center rounded-lg bg-muted">
                      <Sparkles class="size-7 text-primary" />
                    </div>
                    <div>
                      <strong class="block text-[0.9375rem] font-semibold">2× usage for Cowork</strong>
                      <p class="mt-1 text-[0.8125rem] text-muted-foreground">Do more with a higher session limit, now through July 5.</p>
                    </div>
                    <kai-button full>Start task</kai-button>
                  </div>
                </kai-card>
              </div>
            </Show>

            <Show when={view() === 'code'}>
              <div class="h-full p-6">
                <SlotPlaceholder
                  icon="code"
                  label="Code view"
                  hint="Rendered into the kai-workspace main slot. The consumer owns this view and swaps it per tab. Drop your own screen here."
                />
              </div>
            </Show>
          </div>
        </kai-workspace>

        {/* Design takeover: a kai-screen peer that fills the app root when open */}
        <kai-screen
          ref={(el) => {
            el.addEventListener('kai-back', () => setDesignOpen(false));
            el.addEventListener('kai-open-change', (e) => setDesignOpen((e as CustomEvent).detail.open));
          }}
          open={designOpen()}
          headline="Design"
        >
          <div class="h-full p-6">
            <SlotPlaceholder
              icon="workflow"
              label="Design takeover"
              hint="The kai-screen content slot, a full-bleed overlay you mount your own app into. Press Back to return."
            />
          </div>
        </kai-screen>

        {/* Command center: a light-DOM overlay hosting kai-command. Opened by the
            sidebar-header search button; closes on backdrop click, Escape, or a
            selection. The inner panel stops click/keydown from reaching the scrim. */}
        <Show when={cmdOpen()}>
          <div
            class="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[14vh]"
            onClick={() => setCmdOpen(false)}
            onKeyDown={(e) => { if (e.key === 'Escape') setCmdOpen(false); }}
          >
            <div
              class="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <kai-command
                ref={(el) => {
                  (el as El).items = COMMANDS;
                  el.addEventListener('kai-select', () => setCmdOpen(false));
                  queueMicrotask(() => (el as El).focus?.());
                }}
                placeholder="Search commands, recents, settings..."
              ></kai-command>
            </div>
          </div>
        </Show>
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'html',
        // A representative skeleton of the composition (not the full interactive
        // render). Home/Code swap the main view via kai-tabs; Design opens the
        // kai-screen takeover; the account + filter are kai-menus.
        code: `<kai-workspace compact>
  <!-- sidebar chrome: toggle/search, full-width tabs, nav -->
  <div slot="sidebar-header">
    <kai-tooltip content="Toggle sidebar">
      <kai-button variant="ghost" size="icon-sm" icon="panel-left" label="Toggle sidebar"></kai-button>
    </kai-tooltip>
    <kai-tooltip content="Search">
      <kai-button variant="ghost" size="icon-sm" icon="search" label="Search"></kai-button>
    </kai-tooltip>
    <kai-tabs variant="segmented"></kai-tabs>
    <kai-nav></kai-nav>
  </div>

  <!-- footer: onboarding checklist, Design trigger, account menu -->
  <div slot="sidebar-footer">
    <kai-tasks></kai-tasks>
    <kai-button variant="ghost" icon="workflow">Design</kai-button>
    <kai-menu label="Account menu">
      <!-- Trigger content is NON-interactive: kai-menu supplies the button. -->
      <div slot="trigger" class="flex items-center gap-2">
        <kai-avatar fallback="JD"></kai-avatar> John
      </div>
    </kai-menu>
  </div>

  <!-- main: the consumer-owned view, swapped per tab -->
  <div slot="main">
    <h1>Good day, mate</h1>
    <kai-notice>Claude Fable 5 is currently unavailable.</kai-notice>
    <kai-prompt-input placeholder="How can I help you today?">
      <div slot="toolbar-start">
        <kai-menu trigger-icon="plus" label="Add"></kai-menu>
        <!-- Color the coachmark with CSS tokens, so it survives remounts (no JS) -->
        <kai-coachmark default-open headline="Cowork has a new home" badge="New"
          style="--kai-coachmark-bg: var(--color-tool-blue); --kai-coachmark-fg: var(--color-background)">
          <kai-button variant="subtle" size="sm" icon="workflow">Cowork</kai-button>
          <span slot="content">Chat here, or switch to Cowork to build alongside it.</span>
        </kai-coachmark>
      </div>
      <div slot="toolbar-end">
        <kai-model-switcher></kai-model-switcher>
        <kai-menu trigger-label="High" trigger-icon-trailing="chevron-down"></kai-menu>
        <kai-tooltip content="Voice">
          <kai-button variant="subtle" size="icon-sm" icon="mic" label="Voice"></kai-button>
        </kai-tooltip>
      </div>
    </kai-prompt-input>
    <kai-suggestions></kai-suggestions>
  </div>
</kai-workspace>

<!-- the Design takeover: a full-bleed kai-screen peer, toggled open -->
<kai-screen headline="Design"><!-- your full-screen app --></kai-screen>

<style>
  /* Alternative to the CSS vars above: recolor via the exposed parts. */
  kai-coachmark::part(bubble),
  kai-coachmark::part(arrow) { background: var(--color-tool-blue); color: var(--color-background) }
</style>

<script type="module">
  // Array/object props are JS properties (the kai- contract); scalars are attributes.
  // Re-apply them on every (re)mount: a view that unmounts (e.g. a hidden tab)
  // would otherwise lose its data + styling when it comes back.
  const tabs = document.querySelector('kai-tabs');
  tabs.items = [{ id: 'home', label: 'Home', icon: 'home' }, { id: 'code', label: 'Code', icon: 'code' }];
  tabs.defaultValue = 'home'; tabs.block = true;
  document.querySelector('kai-nav').items = [/* { id, label, icon, badge } ... */];
  document.querySelector('kai-workspace').conversations = [/* ConversationSummary[] */];
  document.querySelector('kai-suggestions').suggestions = [/* { label, icon, value } ... */];

  // Interactions: swap the main view per tab; open the Design takeover.
  tabs.addEventListener('kai-tab-change', (e) => showView(e.detail.value));
  designButton.addEventListener('kai-click', () => (screen.open = true));
  screen.addEventListener('kai-back', () => (screen.open = false));
</script>`,
      },
    },
  },
};
