import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import './register'; // every kai-* element used below
import type { KaiNavItem } from '../ui/nav';
import type { ConversationSummary } from '../types';

// Labs/Apps: a second dogfood — "T3 Code", a desktop control plane for coding
// agents (think an Electron shell). Built on kai-workspace + the kai-* elements
// exactly as a consumer would: projects rail, an agent thread, and a composer.
// The point is gap-finding — where the kit can't express something faithfully,
// there is a clearly LABELED placeholder naming the missing piece rather than a
// dressed-up div. Every such gap is listed in the worker report.

// kai-file-tree is used here as a JSX element without its own story facade, so
// declare its tag locally. The other kai-* tags are declared (identically) by
// sibling story files; redeclaring them here keeps the file self-documenting
// (TypeScript merges identical global augmentations — the types must match
// byte-for-byte across files or it errors TS2717).
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-workspace': JSX.HTMLAttributes<HTMLElement> & { 'sidebar-min-width'?: string | number; 'collapse-below'?: string | number };
      'kai-button': JSX.HTMLAttributes<HTMLElement> & { variant?: string; size?: string; icon?: string; 'icon-trailing'?: string; label?: string; disabled?: boolean; full?: boolean; align?: 'start' | 'center' | 'end' };
      'kai-nav': JSX.HTMLAttributes<HTMLElement> & { value?: string; 'default-value'?: string; theme?: string };
      'kai-menu': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'trigger-icon'?: string; 'trigger-label'?: string; 'trigger-icon-trailing'?: string; label?: string };
      'kai-badge': JSX.HTMLAttributes<HTMLElement> & { variant?: string };
      'kai-message': JSX.HTMLAttributes<HTMLElement>;
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement> & { theme?: string; placeholder?: string; loading?: boolean; disabled?: boolean; voice?: boolean; search?: boolean; attach?: boolean; submit?: string; 'suggestion-mode'?: string };
      'kai-model-switcher': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'current-model'?: string };
      'kai-separator': JSX.HTMLAttributes<HTMLElement> & { orientation?: string };
      'kai-file-tree': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

const meta = { title: 'Labs/Apps', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;
type El = HTMLElement & Record<string, unknown>;

// The projects rail. kai-nav is a FLAT list (id/label/icon + a text `badge` and
// a trailing icon) — it cannot nest threads under a project, so the per-project
// thread rows are a documented gap below.
const PROJECTS: KaiNavItem[] = [
  { id: 't3chat', label: 't3chat', icon: 'message-square' },
  { id: 'lawn', label: 'lawn', icon: 'box' },
  { id: 't3-gg', label: 't3.gg', icon: 'globe' },
  { id: 'quickpic', label: 'quickpic', icon: 'monitor' },
  { id: 'azure-bench', label: 'azure-bench', icon: 'briefcase' },
  { id: 'dumb-harness', label: 'dumb-harness', icon: 'workflow' },
  { id: 't3code-1', label: 't3code-1', icon: 'code' },
  { id: 'fishslop-gpt-5-4', label: 'fishslop-gpt-5-4', icon: 'sparkles' },
  { id: 'fishslop-opus-4-7', label: 'fishslop-opus-4-7', icon: 'smile' },
  { id: 't3code-2', label: 't3code-2', icon: 'code' },
];

// Recent threads, fed to the workspace's built-in conversation pane. Times are
// spread so the kit auto-derives varied relative labels off `updatedAt`. NOTE:
// ConversationSummary has no STATUS field (Completed/Working) — only an optional
// plain-text `trailing` — so the colored status dot from the reference can't be
// expressed here; that's a gap.
const THREADS: ConversationSummary[] = ([
  ['codebase-overview', 'Codebase overview', '2026-06-27T14:40:00Z'],
  ['add-sitemap', 'Add sitemap and robots.txt', '2026-06-27T14:39:00Z'],
  ['harness-retry', 'Harness retry backoff', '2026-06-27T14:30:00Z'],
  ['crop-preview', 'Crop preview regression', '2026-06-27T06:00:00Z'],
  ['lawn-schedule', 'Fix lawn watering schedule', '2026-06-26T22:00:00Z'],
  ['astro-5', 'Upgrade to Astro 5', '2026-06-26T10:00:00Z'],
  ['opus-eval', 'Opus eval run 47', '2026-06-25T10:00:00Z'],
  ['cold-starts', 'Benchmark azure cold starts', '2026-06-03T10:00:00Z'],
] as const).map(([id, title, ts]) => ({ id, title, scope: { type: 'document' }, messageCount: 4, lastMessageAt: ts, updatedAt: ts }));

// The agent turn: a markdown table + a prose line, rendered by the kit's own
// markdown (kai-message). GFM tables are supported, so this is real content,
// not a faked table.
const OVERVIEW_MD = `| Change | File | Notes |
| --- | --- | --- |
| robots.txt | public/robots.txt | allows all crawlers |
| Sitemap | astro.config.mjs | added @astrojs/sitemap |
| Shared socialLinks | src/lib/constants.ts | single source of truth |

Wired the sitemap integration and pulled the shared social links into one constants module, so every layout now reads them from a single place.`;

// The changed files. kai-file-tree builds a real collapsible folder/file tree
// from these `/`-delimited paths — but FileTreeFile is { path, url, code,
// language, type }: no per-file +/- counts and no change status. The diff
// decoration is the gap (named in the panel below the tree).
const CHANGED_FILES = [
  { path: 'public/robots.txt' },
  { path: 'src/layouts/BaseLayout.astro' },
  { path: 'src/lib/constants.ts' },
  { path: 'src/pages/index.astro' },
  { path: 'astro.config.mjs' },
  { path: 'bun.lock' },
  { path: 'package.json' },
];

// A labeled gap marker — an empty, informative box that NAMES a missing piece
// instead of faking it with content.
function Gap(props: { label: string; hint: string }) {
  return (
    <div class="rounded-lg border border-dashed border-border p-3 text-left">
      <div class="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">{props.label}</div>
      <div class="mt-1 text-xs leading-relaxed text-muted-foreground">{props.hint}</div>
    </div>
  );
}

export const T3Code: Story = {
  name: 'T3 Code',
  render: () => {
    const [activeThread, setActiveThread] = createSignal('codebase-overview');
    let ws: El | undefined;

    return (
      <kai-workspace
        ref={(el) => {
          ws = el as El;
          ws.conversations = THREADS;
          ws.compact = true;
          ws.activeId = activeThread();
          el.addEventListener('kai-conversation-select', (e) => {
            const id = (e as CustomEvent).detail.id as string;
            setActiveThread(id);
            if (ws) ws.activeId = id;
          });
        }}
        class="block h-screen"
        sidebar-min-width="280"
      >
        {/* sidebar-header: command search, the PROJECTS section, the flat nav */}
        <div slot="sidebar-header" class="flex flex-col gap-2 px-2.5 pt-2.5">
          <kai-button variant="ghost" size="sm" full align="start" icon="search">
            Search
            <span class="ml-auto rounded border border-border px-1 text-[0.6875rem] text-muted-foreground">⌘K</span>
          </kai-button>
          <div class="flex items-center justify-between pl-2.5">
            <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Projects</span>
            <div class="flex items-center">
              <kai-button variant="ghost" size="icon-sm" icon="sliders-horizontal" label="Sort projects"></kai-button>
              <kai-button variant="ghost" size="icon-sm" icon="plus" label="Add folder"></kai-button>
            </div>
          </div>
          <kai-nav ref={(el) => { const n = el as El; n.items = PROJECTS; n.defaultValue = 't3-gg'; }}></kai-nav>
          <Gap
            label="Gap — nested threads"
            hint="Each project should expand inline to its threads: title + STATUS badge (Completed/Working dot) + relative time. kai-nav is flat (no children) and ConversationSummary has no status field — only plain-text trailing. The thread pane below is the kit's closest fit (flat, relative time, no colored status)."
          />
        </div>

        {/* sidebar-footer: Settings pinned at the bottom */}
        <div slot="sidebar-footer">
          <kai-separator></kai-separator>
          <div class="px-2.5 py-1.5">
            <kai-button variant="ghost" full align="start" icon="settings">Settings</kai-button>
          </div>
        </div>

        {/* main-header: the thread action bar */}
        <div slot="main-header" class="flex items-center justify-between gap-3 px-4 py-2">
          <div class="flex min-w-0 items-center gap-2">
            <span class="truncate text-sm font-medium">Codebase overview</span>
            <kai-badge>t3.gg</kai-badge>
          </div>
          <div class="flex items-center gap-1.5">
            <kai-menu
              ref={(el) => { (el as El).items = [
                { id: 'rule', label: 'Add rule', icon: 'plus' },
                { id: 'hook', label: 'Add hook', icon: 'workflow' },
                { id: 'mcp', label: 'Add MCP server', icon: 'box' },
              ]; }}
              trigger-icon="plus"
              trigger-label="Add action"
            ></kai-menu>
            <kai-menu
              ref={(el) => { (el as El).items = [
                { id: 'editor', label: 'Open in editor', icon: 'code' },
                { id: 'terminal', label: 'Open in terminal', icon: 'square-pen' },
                { id: 'finder', label: 'Reveal in Finder', icon: 'folder' },
              ]; }}
              trigger-label="Open"
              trigger-icon-trailing="chevron-down"
            ></kai-menu>
            {/* GAP: no primary/split dropdown button. kai-menu triggers are muted
                ghost-only; a primary action + caret can't be one menu. Rendered as
                a primary kai-button with a decorative caret (no real dropdown). */}
            <kai-button variant="default" size="sm" icon-trailing="chevron-down">Commit &amp; push</kai-button>
            <kai-button variant="ghost" size="icon-sm" icon="panel-left" label="Toggle side panel"></kai-button>
            <kai-button variant="ghost" size="icon-sm" icon="monitor" label="Window"></kai-button>
          </div>
        </div>

        {/* main: the agent thread (scrolls) above the composer (pinned) */}
        <div slot="main" class="flex h-full flex-col">
          <div class="min-h-0 flex-1 overflow-y-auto">
            <div class="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-6">
              <kai-message
                ref={(el) => { const m = el as El; m.content = OVERVIEW_MD; m.avatar = 'none'; }}
                style={{ display: 'block' }}
              ></kai-message>

              {/* CHANGED FILES — header + real kai-file-tree + a labeled gap for
                  the diff decoration the kit can't render. */}
              <div class="overflow-hidden rounded-lg border border-border">
                <div class="flex items-center justify-between gap-2 px-3 py-2">
                  <div class="flex items-center gap-2 text-sm">
                    <span class="font-medium">Changed files (7)</span>
                    <span style={{ color: '#16a34a' }}>+31</span>
                    <span style={{ color: '#dc2626' }}>-17</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <kai-button variant="ghost" size="sm" icon="chevron-down">Collapse all</kai-button>
                    <kai-button variant="outline" size="sm" icon="file-text">View diff</kai-button>
                  </div>
                </div>
                <div class="h-60 border-t border-border">
                  <kai-file-tree ref={(el) => { (el as El).files = CHANGED_FILES; }}></kai-file-tree>
                </div>
                <div class="border-t border-border p-3">
                  <Gap
                    label="Gap — diff decoration"
                    hint="kai-file-tree renders the folder/file structure above, but FileTreeFile is { path, url, code, language, type } — no per-file +N / -N counts, no change status coloring, no +31 / -17 summary, and no Collapse-all / View-diff commands. The numbers and the green/red stats here are not expressible by the element."
                  />
                </div>
                <div class="px-3 pb-2 text-[0.6875rem] text-muted-foreground">2:40:02 PM · 10s</div>
              </div>
            </div>
          </div>

          {/* the composer */}
          <div class="shrink-0 border-t border-border p-3">
            <div class="mx-auto flex max-w-3xl flex-col gap-1.5">
              <kai-prompt-input
                ref={(el) => { (el as El).attach = false; }}
                placeholder="Ask for follow-up changes or attach images"
              >
                <div slot="toolbar-start" class="flex items-center gap-1.5">
                  <kai-model-switcher ref={(el) => { const m = el as El; m.models = [
                    { id: 'opus-4-5', name: 'Claude Opus 4.5' },
                    { id: 'sonnet-4-6', name: 'Claude Sonnet 4.6' },
                    { id: 'haiku-4-5', name: 'Claude Haiku 4.5' },
                  ]; m.currentModel = 'opus-4-5'; }}></kai-model-switcher>
                  <kai-menu
                    ref={(el) => { (el as El).items = [
                      { heading: true, label: 'Effort' },
                      { id: 'high', label: 'High', checked: true },
                      { id: 'medium', label: 'Medium' },
                      { id: 'low', label: 'Low' },
                    ]; }}
                    trigger-label="High · Normal"
                    trigger-icon-trailing="chevron-down"
                  ></kai-menu>
                  <kai-button variant="subtle" size="sm" icon="workflow">Build</kai-button>
                  <kai-menu
                    ref={(el) => { (el as El).items = [
                      { id: 'full', label: 'Full access', checked: true },
                      { id: 'read', label: 'Read only' },
                      { id: 'ask', label: 'Ask each time' },
                    ]; }}
                    trigger-icon="lock"
                    trigger-label="Full access"
                    trigger-icon-trailing="chevron-down"
                  ></kai-menu>
                </div>
                <div slot="toolbar-end" class="flex items-center gap-1.5">
                  {/* GAP: no token-count bubble element. The kit has kai-context
                      (a context-WINDOW meter: used/max tokens + breakdown), but no
                      bare running-token-count pill like this "85". Placeholdered. */}
                  <span
                    class="inline-flex items-center rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground"
                    title="Gap: no token-count bubble element"
                  >85</span>
                </div>
              </kai-prompt-input>
              <div class="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>Local checkout</span>
                <kai-menu
                  ref={(el) => { (el as El).items = [
                    { id: 'main', label: 'main', checked: true },
                    { id: 'develop', label: 'develop' },
                    { id: 'feat', label: 'feat/sitemap' },
                  ]; }}
                  trigger-label="main"
                  trigger-icon-trailing="chevron-down"
                ></kai-menu>
              </div>
            </div>
          </div>
        </div>
      </kai-workspace>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'html',
        // A representative skeleton of the composition (not the full interactive
        // render). The projects rail is kai-nav; threads use the workspace's
        // built-in conversation pane; the agent turn is kai-message; the changed
        // files use kai-file-tree. Labeled gaps mark what the kit can't express.
        code: `<kai-workspace sidebar-min-width="280">
  <!-- rail: command search, the projects section, the flat nav -->
  <div slot="sidebar-header">
    <kai-button variant="ghost" size="sm" icon="search">Search ⌘K</kai-button>
    <div>
      Projects
      <kai-button variant="ghost" size="icon-sm" icon="sliders-horizontal" label="Sort"></kai-button>
      <kai-button variant="ghost" size="icon-sm" icon="plus" label="Add folder"></kai-button>
    </div>
    <kai-nav></kai-nav>
    <!-- GAP: kai-nav is flat — no project->thread nesting, no per-row status dot -->
  </div>
  <div slot="sidebar-footer">
    <kai-button variant="ghost" icon="settings">Settings</kai-button>
  </div>

  <!-- action bar -->
  <div slot="main-header">
    Codebase overview <kai-badge>t3.gg</kai-badge>
    <kai-menu trigger-icon="plus" trigger-label="Add action"></kai-menu>
    <kai-menu trigger-label="Open" trigger-icon-trailing="chevron-down"></kai-menu>
    <!-- GAP: no primary/split dropdown — a primary button + caret can't be one menu -->
    <kai-button variant="default" icon-trailing="chevron-down">Commit &amp; push</kai-button>
  </div>

  <!-- thread + composer -->
  <div slot="main">
    <kai-message><!-- content set as a property: markdown table + prose --></kai-message>
    <div><!-- Changed files (7)  +31 / -17 -->
      <kai-button variant="ghost" icon="chevron-down">Collapse all</kai-button>
      <kai-button variant="outline" icon="file-text">View diff</kai-button>
      <kai-file-tree></kai-file-tree>
      <!-- GAP: FileTreeFile has no +/- counts or change status; the diff stats aren't expressible -->
    </div>
    <kai-prompt-input placeholder="Ask for follow-up changes or attach images">
      <div slot="toolbar-start">
        <kai-model-switcher></kai-model-switcher>
        <kai-menu trigger-label="High · Normal" trigger-icon-trailing="chevron-down"></kai-menu>
        <kai-button variant="subtle" icon="workflow">Build</kai-button>
        <kai-menu trigger-icon="lock" trigger-label="Full access" trigger-icon-trailing="chevron-down"></kai-menu>
      </div>
      <div slot="toolbar-end">
        <!-- GAP: no token-count bubble element (kai-context is a context-window meter, not a count) -->
        <span class="token-bubble">85</span>
      </div>
    </kai-prompt-input>
    <div>Local checkout <kai-menu trigger-label="main" trigger-icon-trailing="chevron-down"></kai-menu></div>
  </div>
</kai-workspace>

<script type="module">
  // Array/object props are JS properties (the kai- contract); scalars are attributes.
  document.querySelector('kai-workspace').conversations = [/* ConversationSummary[] */];
  document.querySelector('kai-workspace').compact = true;
  document.querySelector('kai-nav').items = [/* { id, label, icon } projects */];
  document.querySelector('kai-message').content = '| Change | File | Notes |\\n| --- | --- | --- |\\n...';
  document.querySelector('kai-file-tree').files = [{ path: 'public/robots.txt' }, /* ... */];
  document.querySelector('kai-model-switcher').models = [{ id: 'opus-4-5', name: 'Claude Opus 4.5' }, /* ... */];
</script>`,
      },
    },
  },
};
