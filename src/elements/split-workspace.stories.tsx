import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, Show, For, Switch, Match, onMount, onCleanup, type JSX } from 'solid-js';
import {
  Bot, Terminal, FlaskConical, BookText, Boxes, Sparkles, ShieldCheck, Database,
  Megaphone, Bell, LayoutGrid, Focus, List, PanelRight, CheckCircle2, type LucideProps,
} from 'lucide-solid';
import './register'; // every kai-* element used below
import { Pane } from '../ui/pane';
import { AgentCard, type AgentStatus } from '../ui/agent-card';
import { PaneGrid } from '../ui/pane-grid';
import { Segmented, type SegmentedOption } from '../ui/segmented';
import type { KaiNavItem } from '../ui/nav';
import type { KaiTabItem } from '../ui/tabs';
import type { FileTreeFile } from '../components/file-tree';
import { toast, configureToasts } from '../primitives/toast-store';

// Labs/Apps: the full MULTI-AGENT WORKSPACE, composed from the new workspace
// primitives instead of the old hand-rolled grid. A desktop shell with a LEFT
// workspace rail (kai-nav), a CENTER view-mode area that the operator switches
// between three tiers, and a RIGHT dockable utility panel (kai-tabs → kai-artifact
// Browser / kai-file-tree Editor).
//
// The center is driven by a `Segmented` view switcher over a `view` signal:
//   • GRID  — a `PaneGrid` of `Pane`s (one per agent); per-pane maximize drives
//             `PaneGrid maximizedIndex`, per-pane close removes the agent.
//   • FOCUS — one large `Pane` (the focused agent) beside a vertical RAIL of
//             `AgentCard`s; clicking a card promotes it to focus.
//   • LIST  — a full-width column of `AgentCard`s for scanning many agents.
// Attention routing surfaces "who needs you": a header count pill, an amber edge
// on the agents awaiting input (the `AgentCard`/`Pane` attention treatment), and a
// "Needs you first" sort toggle. A broadcast composer ("Message all agents") sits
// in the center footer. The top-level rail | center | utility split is a real
// kai-resizable (it fits the <= 3-item cap), and the N-pane tiling that
// kai-resizable couldn't express now lives in `PaneGrid`.

// kai-resizable / kai-resizable-item / kai-artifact are used here as JSX elements;
// the other kai-* tags are declared (identically) by sibling story files.
// TypeScript MERGES identical global augmentations, so each shared declaration is
// copied byte-for-byte from its canonical sibling (chatgpt.stories.tsx /
// codex.stories.tsx / t3code.stories.tsx) or it errors TS2717.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-resizable': JSX.HTMLAttributes<HTMLElement> & { orientation?: string };
      'kai-resizable-item': JSX.HTMLAttributes<HTMLElement> & {
        size?: string;
        min?: string;
        max?: string;
        locked?: boolean | string;
        hidden?: boolean | string;
        collapsed?: boolean | string;
      };
      'kai-artifact': JSX.HTMLAttributes<HTMLElement> & { expandable?: boolean; standalone?: boolean };
      'kai-button': JSX.HTMLAttributes<HTMLElement> & { variant?: string; size?: string; icon?: string; 'icon-trailing'?: string; label?: string; disabled?: boolean; full?: boolean; align?: 'start' | 'center' | 'end' };
      'kai-nav': JSX.HTMLAttributes<HTMLElement> & { value?: string; 'default-value'?: string; theme?: string };
      'kai-badge': JSX.HTMLAttributes<HTMLElement> & { variant?: string };
      'kai-status': JSX.HTMLAttributes<HTMLElement> & { status?: string; pulse?: boolean; label?: string; size?: string; theme?: string };
      'kai-message': JSX.HTMLAttributes<HTMLElement>;
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement> & { theme?: string; placeholder?: string; loading?: boolean; disabled?: boolean; voice?: boolean; search?: boolean; attach?: boolean; submit?: string; 'suggestion-mode'?: string };
      'kai-file-tree': JSX.HTMLAttributes<HTMLElement>;
      'kai-tabs': JSX.HTMLAttributes<HTMLElement> & { variant?: string; value?: string; 'default-value'?: string; disabled?: boolean; theme?: string };
      'kai-tooltip': JSX.HTMLAttributes<HTMLElement> & { content?: string; 'open-delay'?: number | string };
      'kai-separator': JSX.HTMLAttributes<HTMLElement> & { orientation?: string };
    }
  }
}

const meta = { title: 'Labs/Apps', parameters: { layout: 'fullscreen' } } satisfies Meta;
export default meta;
type Story = StoryObj;
type El = HTMLElement & Record<string, unknown>;

// ── Left rail: workspaces with counts ───────────────────────────────────────
// kai-nav is a flat list; `meta` renders the right-aligned muted count. A
// `warning`-tone `status` dot (amber, pulsing) flags a workspace whose agents are
// waiting on you — the same attention vocabulary the Pane/AgentCard treatment uses
// — so you can spot which workspace needs you without opening it. The amber dot
// sits beside the neutral count, not in place of it. The current workspace ("Acme
// App") holds Cleo + Nova (both needsAttention); "Mobile App" carries one too to
// show the indicator on more than one row.
const ATTENTION_STATUS = { tone: 'warning', pulse: true } as const;
const WORKSPACES: KaiNavItem[] = [
  { id: 'acme', label: 'Acme App', icon: 'box', status: ATTENTION_STATUS, meta: '8' },
  { id: 'side', label: 'Side Project', icon: 'sparkles', meta: '8' },
  { id: 'marketing', label: 'Marketing Site', icon: 'globe', meta: '3' },
  { id: 'docs', label: 'Docs Portal', icon: 'book-open', meta: '5' },
  { id: 'mobile', label: 'Mobile App', icon: 'monitor', status: ATTENTION_STATUS, meta: '2' },
  { id: 'playground', label: 'Playground', icon: 'workflow', meta: '4' },
];
const WORKSPACE_LABEL = new Map(WORKSPACES.map((w) => [w.id, w.label ?? w.id]));

// ── The agent fleet ─────────────────────────────────────────────────────────
// One model shared by every view: the same status vocabulary the `Pane` and
// `AgentCard` primitives consume (working | idle | done | error | blocked).
type ViewMode = 'grid' | 'focus' | 'list';
interface Agent {
  id: string;
  name: string;
  role: string;
  glyph: (p: LucideProps) => JSX.Element;
  status: AgentStatus;
  lastLine: string;
  /** Awaiting the operator — raises the attention treatment everywhere. */
  needsAttention?: boolean;
  /** Terminal-style markdown shown in the pane body. */
  body: string;
}

const AGENTS: Agent[] = [
  {
    id: 'atlas', name: 'Atlas', role: 'Orchestrator', glyph: Bot,
    status: { tone: 'working', label: 'Running', pulse: true },
    lastLine: 'Dispatched 5 agents on the checkout refactor',
    body: 'Fanning the checkout refactor out to the fleet and watching every diff.\n\n```bash\n$ atlas dispatch --plan checkout\n→ otto · ivy · cleo · cy · rex\n5 agents running\n```',
  },
  {
    id: 'otto', name: 'Otto', role: 'Backend', glyph: Terminal,
    status: { tone: 'working', label: 'Migrating', pulse: true },
    lastLine: 'Applied 3 migrations cleanly',
    body: 'Applying the schema migration for the split orders table.\n\n```bash\n$ npm run db:migrate\n✓ 0003_orders_split.sql\n✓ 0004_payment_intents.sql\n✓ 0005_drop_legacy.sql\n```',
  },
  {
    id: 'ivy', name: 'Ivy', role: 'Tests', glyph: FlaskConical,
    status: { tone: 'done', label: 'Green' },
    lastLine: '142 tests passing after the change',
    body: 'Suite is green after the change.\n\n```bash\n$ vitest run\n✓ 142 passed (2.1s)\n```',
  },
  {
    id: 'cleo', name: 'Cleo', role: 'Docs', glyph: BookText,
    status: { tone: 'blocked', label: 'Needs input' },
    needsAttention: true,
    lastLine: 'Which provider should the guide target?',
    body: 'The checkout guide needs a provider example before I can finish.\n\n> Which provider should the auth section target — Stripe or the in-house gateway?\n\nWaiting on your call.',
  },
  {
    id: 'dara', name: 'Dara', role: 'Infra', glyph: Boxes,
    status: { tone: 'idle', label: 'Idle' },
    lastLine: 'Holding for a green build',
    body: 'Holding for a green build before I touch the staging deploy.\n\n```bash\n$ # standing by for ivy\n```',
  },
  {
    id: 'cy', name: 'Cy', role: 'Frontend', glyph: Sparkles,
    status: { tone: 'working', label: 'Building', pulse: true },
    lastLine: 'Wired the cart to the new endpoint',
    body: 'Cart UI is wired to the new endpoint.\n\n```tsx\nconst { mutate } = useCheckout();\nawait mutate(cartId);\n```',
  },
  {
    id: 'rex', name: 'Rex', role: 'Security', glyph: ShieldCheck,
    status: { tone: 'error', label: '2 findings' },
    lastLine: '2 high-severity findings block merge',
    body: 'Security scan found issues that block the merge.\n\n```bash\n$ npm audit --production\n2 high severity findings\n```',
  },
  {
    id: 'nova', name: 'Nova', role: 'Data', glyph: Database,
    status: { tone: 'blocked', label: 'Awaiting approval' },
    needsAttention: true,
    lastLine: 'Approve the production backfill?',
    body: 'The production backfill is staged and ready.\n\n> Approve running the backfill against prod? It rewrites ~120k rows.\n\nAwaiting approval.',
  },
];

// ── Right utility panel ─────────────────────────────────────────────────────
const UTIL_TABS: KaiTabItem[] = [
  { id: 'browser', label: 'Browser', icon: 'globe' },
  { id: 'editor', label: 'Editor', icon: 'code' },
];

// A small staging page the Browser tab frames. The artifact frames a `data:` blob,
// so `displayUrl` shows a clean read-only address instead of leaking the blob. The
// previewed app is itself DARK — dark surfaces + light text — so it reads as a real
// dark product, not a light page dropped into the dark shell.
const PREVIEW_HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; background: #0b0b0e; color: #fafafa; }
  header { display: flex; align-items: center; gap: 8px; padding: 14px 20px; border-bottom: 1px solid #27272a; font-weight: 600; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e80; }
  main { padding: 28px 20px; max-width: 520px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p { color: #a1a1aa; line-height: 1.55; }
  .card { margin-top: 18px; padding: 16px; border: 1px solid #27272a; border-radius: 12px; background: #18181b; }
  .btn { display: inline-block; margin-top: 12px; padding: 9px 16px; border-radius: 8px; background: #fafafa; color: #18181b; text-decoration: none; font-size: 14px; font-weight: 600; }
</style></head><body>
  <header><span class="dot"></span> Acme App — staging</header>
  <main>
    <h1>Checkout v2</h1>
    <p>The refactored flow is live on the staging preview. Atlas is coordinating the rollout while the fleet finishes its tasks.</p>
    <div class="card"><strong>Cart</strong><p style="margin:6px 0 0">2 items · $84.00</p><a class="btn" href="#">Continue to payment</a></div>
  </main>
</body></html>`;
const dataUrl = (html: string) => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
const PREVIEW_URL = dataUrl(PREVIEW_HTML);

// The Editor tab tree. kai-file-tree builds the folder structure from the paths
// and decorates each row with its diff status + per-file +/-; `summary` (set in
// the ref) draws the count + summed totals header.
const EDITOR_FILES: FileTreeFile[] = [
  { path: 'src/checkout/index.ts', status: 'modified', additions: 24, deletions: 9 },
  { path: 'src/checkout/cart.ts', status: 'modified', additions: 12, deletions: 4 },
  { path: 'src/checkout/payment.ts', status: 'added', additions: 88, deletions: 0 },
  { path: 'src/checkout/legacy.ts', status: 'deleted', additions: 0, deletions: 61 },
  { path: 'src/api/orders.ts', status: 'modified', additions: 7, deletions: 2 },
  { path: 'docs/checkout.md', status: 'modified', additions: 15, deletions: 5 },
];

export const SplitWorkspace: Story = {
  name: 'Multi-Agent Workspace',
  render: () => {
    const [workspace, setWorkspace] = createSignal('acme');
    const [view, setView] = createSignal<ViewMode>('grid');
    const [focusedId, setFocusedId] = createSignal<string>(AGENTS[0].id);
    // Grid maximize is driven through PaneGrid's `maximizedIndex` (the index of the
    // maximized agent within the live, ordered list).
    const [maxPaneId, setMaxPaneId] = createSignal<string | null>(null);
    const [closed, setClosed] = createSignal<Set<string>>(new Set());
    const [attentionFirst, setAttentionFirst] = createSignal(false);
    const [utilTab, setUtilTab] = createSignal('browser');
    // The right utility dock starts COLLAPSED; the chrome toggle flips it open.
    const [panelOpen, setPanelOpen] = createSignal(false);
    // Broadcast composer now lives behind a header button → mock modal.
    const [broadcastOpen, setBroadcastOpen] = createSignal(false);

    const live = () => AGENTS.filter((a) => !closed().has(a.id));
    // Stable sort: agents awaiting input float to the top when the toggle is on.
    const ordered = (list: Agent[]) =>
      attentionFirst()
        ? [...list].sort((a, b) => Number(!!b.needsAttention) - Number(!!a.needsAttention))
        : list;
    const attentionCount = () => live().filter((a) => a.needsAttention).length;
    const focusedAgent = () => live().find((a) => a.id === focusedId()) ?? live()[0];

    const gridAgents = () => ordered(live());
    const maxIndex = () => {
      const id = maxPaneId();
      if (!id) return null;
      const i = gridAgents().findIndex((a) => a.id === id);
      return i >= 0 ? i : null;
    };

    const closeAgent = (id: string) => {
      setClosed((s) => { const n = new Set<string>(s); n.add(id); return n; });
      if (maxPaneId() === id) setMaxPaneId(null);
    };
    const resetAll = () => { setClosed(new Set<string>()); setMaxPaneId(null); };

    // Route the operator to whatever wants them first.
    const jumpToAttention = () => {
      const first = ordered(live()).find((a) => a.needsAttention);
      if (first) { setFocusedId(first.id); setView('focus'); }
    };

    // Focus a single agent (the toast actions land here): promote it + Focus view.
    const focusAgent = (id: string) => { setFocusedId(id); setView('focus'); };

    // ── Toasts: dogfood the kit's toast() store for agent notifications ───────────
    // The imperative toast() singleton lazily mounts ONE <kai-toast-region>; point
    // it bottom-right. (No manual region: a second region bound to the same store
    // would double every toast. The Storybook decorator themes the body-mounted
    // region to match the light/dark toggle.)
    onMount(() => {
      configureToasts({ position: 'bottom-right' });
      // "An agent needs you": one PERSISTENT, actionable toast per waiting agent,
      // raised ONCE. Stable ids upsert, so HMR/re-render never stacks duplicates.
      for (const a of live().filter((x) => x.needsAttention)) {
        toast(`${a.name} needs your input`, {
          id: `needs-${a.id}`,
          duration: 0,
          action: { label: 'Respond', onAction: () => focusAgent(a.id) },
        });
      }
    });

    // "An agent finished": a success toast whose action opens that agent. Wired to
    // the header "Simulate completion" control so it's clearly triggerable.
    const simulateCompletion = () => {
      const done = live().find((a) => a.status.tone === 'working') ?? live()[0];
      if (!done) return;
      toast.success(`${done.name} finished its ${done.role.toLowerCase()} task`, {
        action: { label: 'Open', onAction: () => focusAgent(done.id) },
      });
    };

    const VIEW_OPTIONS: SegmentedOption[] = [
      { value: 'grid', label: 'Grid', icon: <LayoutGrid class="size-3.5" /> },
      { value: 'focus', label: 'Focus', icon: <Focus class="size-3.5" /> },
      { value: 'list', label: 'List', icon: <List class="size-3.5" /> },
    ];

    // A glyph chip used as the AgentCard leading element (rail + list).
    const cardLeading = (a: Agent) => (
      <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-muted-foreground">
        <a.glyph class="size-4" />
      </span>
    );

    // The terminal-style pane body — one kai-message rendering the agent's markdown.
    const AgentBody = (props: { agent: Agent }) => (
      <div class="flex flex-col gap-2 px-3 py-2.5">
        <kai-message
          ref={(el) => { const m = el as El; m.role = 'assistant'; m.content = props.agent.body; m.avatar = 'none'; }}
          style={{ display: 'block' }}
        ></kai-message>
      </div>
    );

    // The compact per-pane composer (footer slot of every Pane).
    const Composer = (props: { name: string }) => (
      <div class="p-1.5">
        <kai-prompt-input
          ref={(el) => { (el as El).attach = false; }}
          class="block"
          placeholder={`Message ${props.name}...`}
        ></kai-prompt-input>
      </div>
    );

    // The "needs you" pill shown in the header of an attention pane (grid).
    const NeedsYouBadge = () => (
      <span class="inline-flex items-center gap-1 rounded-full bg-tool-amber/15 px-2 py-0.5 text-[11px] font-medium text-tool-amber">
        <Bell class="size-3" /> Needs you
      </span>
    );

    const RestoreAll = () => (
      <div class="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
        All agents closed.
        <kai-button ref={(el) => { el.addEventListener('kai-click', resetAll); }} variant="outline" size="sm" icon="rotate-cw">Restore agents</kai-button>
      </div>
    );

    // The header broadcast button opens this MOCK modal. There's no kai-dialog yet;
    // a real one would own the backdrop, focus-trap, and Escape — here we hand-roll
    // a fixed backdrop + centered panel, closing on Escape or a backdrop click.
    const BroadcastModal = () => {
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBroadcastOpen(false); };
      onMount(() => document.addEventListener('keydown', onKey));
      onCleanup(() => document.removeEventListener('keydown', onKey));
      return (
        <div
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setBroadcastOpen(false)}
        >
          <div
            class="w-full max-w-lg rounded-2xl border border-border bg-background shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div class="flex items-center justify-between border-b border-border px-4 py-3">
              <span class="inline-flex items-center gap-2 text-sm font-semibold">
                <Megaphone class="size-4 text-primary" /> Message all agents
              </span>
              <kai-button
                ref={(el) => { el.addEventListener('kai-click', () => setBroadcastOpen(false)); }}
                variant="ghost"
                size="icon-sm"
                icon="x"
                label="Close"
              ></kai-button>
            </div>
            <div class="flex flex-col gap-3 p-4">
              <kai-prompt-input
                ref={(el) => { (el as El).attach = false; }}
                class="block"
                placeholder={`Message all ${live().length} agents...`}
              ></kai-prompt-input>
              <div class="flex justify-end">
                <kai-button
                  ref={(el) => { el.addEventListener('kai-click', () => setBroadcastOpen(false)); }}
                  variant="default"
                  size="sm"
                >
                  Send to all {live().length} agents
                </kai-button>
              </div>
            </div>
          </div>
        </div>
      );
    };

    // The shell follows the Storybook light/dark toggle — every token flips, and
    // the kai-* shadow roots track the toggle via the preview decorator. The only
    // pinned-dark surface is the Browser tab's "Acme App" preview (a dark app being
    // previewed, independent of the IDE chrome) — it carries its own dark styles in
    // an isolated `data:` iframe, so it stays dark in either theme.
    return (
      <div class="flex h-screen w-full flex-col bg-background text-foreground">
        {/* desktop chrome */}
        <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div class="flex items-center gap-2">
            <Boxes class="size-5 text-primary" />
            <span class="text-sm font-semibold tracking-tight">Multi-Agent Workspace</span>
            <kai-badge variant="outline">{WORKSPACE_LABEL.get(workspace())}</kai-badge>
          </div>
          <div class="flex items-center gap-2">
            {/* attention routing: a header count that jumps to the first needs-you agent */}
            <Show when={attentionCount() > 0}>
              <button
                type="button"
                onClick={jumpToAttention}
                class="inline-flex items-center gap-1.5 rounded-full bg-tool-amber/15 px-2.5 py-1 text-xs font-medium text-tool-amber transition-colors hover:bg-tool-amber/25"
              >
                <Bell class="size-3.5" />
                {attentionCount()} {attentionCount() === 1 ? 'agent needs you' : 'agents need you'}
              </button>
            </Show>
            {/* broadcast: opens a mock modal composer that fans out to every agent */}
            <kai-tooltip content="Message all agents">
              <kai-button
                ref={(el) => { el.addEventListener('kai-click', () => setBroadcastOpen(true)); }}
                variant="ghost"
                size="icon-sm"
                label="Message all agents"
              >
                <Megaphone slot="icon" class="size-4" />
              </kai-button>
            </kai-tooltip>
            <kai-tooltip content="Layout">
              <kai-button variant="ghost" size="icon-sm" icon="sliders-horizontal" label="Layout"></kai-button>
            </kai-tooltip>
            {/* toggle the right utility dock open/closed (starts collapsed) */}
            <kai-tooltip content={panelOpen() ? 'Hide panel' : 'Show panel'}>
              <kai-button
                ref={(el) => { el.addEventListener('kai-click', () => setPanelOpen((v) => !v)); }}
                variant={panelOpen() ? 'outline' : 'ghost'}
                size="icon-sm"
                label={panelOpen() ? 'Hide utility panel' : 'Show utility panel'}
              >
                <PanelRight slot="icon" class="size-4" />
              </kai-button>
            </kai-tooltip>
            <kai-tooltip content="Settings">
              <kai-button variant="ghost" size="icon-sm" icon="settings" label="Settings"></kai-button>
            </kai-tooltip>
          </div>
        </header>

        {/* THE SPLIT: a real three-region kai-resizable (rail | center | utility).
            This fits the <= 3 cap exactly, so it is a true resizable. */}
        <div class="min-h-0 flex-1">
          <kai-resizable orientation="horizontal" class="block h-full">
            {/* LEFT — workspaces rail */}
            <kai-resizable-item size="220px" min="180px" max="300px">
              <aside class="flex h-full flex-col bg-surface">
                <div class="flex shrink-0 items-center justify-between px-3 pt-3 pb-1">
                  <span class="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">Workspaces</span>
                  <kai-tooltip content="New workspace">
                    <kai-button variant="ghost" size="icon-sm" icon="plus" label="New workspace"></kai-button>
                  </kai-tooltip>
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto px-2 py-1">
                  <kai-nav
                    ref={(el) => {
                      const n = el as El;
                      n.items = WORKSPACES;
                      n.value = workspace();
                      el.addEventListener('kai-nav-select', (e) => {
                        const id = (e as CustomEvent).detail.id as string;
                        setWorkspace(id);
                        (el as El).value = id;
                      });
                    }}
                  ></kai-nav>
                </div>
                <kai-separator></kai-separator>
                <div class="shrink-0 p-2">
                  <kai-button variant="ghost" full align="start" icon="settings">Settings</kai-button>
                </div>
              </aside>
            </kai-resizable-item>

            {/* CENTER — the view-mode area. A Segmented switcher over grid | focus |
                list; the N-pane tiling lives in PaneGrid, the focus + periphery in
                Pane + AgentCard. */}
            <kai-resizable-item min="460px">
              <div class="flex h-full flex-col">
                {/* view switcher + ordering toggle */}
                <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <Segmented options={VIEW_OPTIONS} value={view()} onChange={(v) => setView(v as ViewMode)} size="sm" />
                  <div class="flex items-center gap-2">
                    <span class="hidden text-xs text-muted-foreground sm:inline">
                      {live().length} {live().length === 1 ? 'agent' : 'agents'}
                    </span>
                    {/* fires a success toast ("<Agent> finished …") whose action opens it */}
                    <kai-button
                      ref={(el) => { el.addEventListener('kai-click', simulateCompletion); }}
                      variant="outline"
                      size="sm"
                    >
                      <CheckCircle2 slot="icon" class="size-3.5" />
                      Simulate completion
                    </kai-button>
                    <kai-button
                      ref={(el) => { el.addEventListener('kai-click', () => setAttentionFirst((v) => !v)); }}
                      variant={attentionFirst() ? 'default' : 'outline'}
                      size="sm"
                    >
                      <Bell slot="icon" class="size-3.5" />
                      Needs you first
                    </kai-button>
                  </div>
                </div>

                {/* the active view */}
                <div class="min-h-0 flex-1">
                  <Switch>
                    {/* GRID — a PaneGrid of Panes; maximize → maximizedIndex, close → remove. */}
                    <Match when={view() === 'grid'}>
                      <Show when={live().length > 0} fallback={<RestoreAll />}>
                        <div class="h-full min-h-0 p-2">
                          <PaneGrid maximizedIndex={maxIndex()} minPaneWidth={300} minPaneHeight={220}>
                            <For each={gridAgents()}>
                              {(agent) => {
                                const isMax = () => maxPaneId() === agent.id;
                                return (
                                  <Pane
                                    leading={<agent.glyph class="size-4" />}
                                    title={agent.name}
                                    subtitle={agent.role}
                                    status={agent.status}
                                    maximized={isMax()}
                                    onMaximize={() => setMaxPaneId(isMax() ? null : agent.id)}
                                    onClose={() => closeAgent(agent.id)}
                                    actions={agent.needsAttention ? <NeedsYouBadge /> : undefined}
                                    class={agent.needsAttention ? 'border-tool-amber/50 ring-2 ring-inset ring-tool-amber/55' : undefined}
                                    footer={<Composer name={agent.name} />}
                                  >
                                    <AgentBody agent={agent} />
                                  </Pane>
                                );
                              }}
                            </For>
                          </PaneGrid>
                        </div>
                      </Show>
                    </Match>

                    {/* FOCUS — one large Pane + a vertical rail of AgentCards (focus + periphery). */}
                    <Match when={view() === 'focus'}>
                      <div class="flex h-full min-h-0 gap-2 p-2">
                        {/* keyed: re-mounts the pane (and its kai-message) when focus changes */}
                        <Show when={live().length > 0 ? focusedAgent() : undefined} keyed fallback={<RestoreAll />}>
                          {(a) => (
                            <Pane
                              class="min-w-0 flex-1"
                              leading={<a.glyph class="size-4" />}
                              title={a.name}
                              subtitle={a.role}
                              status={a.status}
                              onMaximize={() => { setMaxPaneId(a.id); setView('grid'); }}
                              onClose={() => setView('list')}
                              footer={<Composer name={a.name} />}
                            >
                              <AgentBody agent={a} />
                            </Pane>
                          )}
                        </Show>
                        {/* the periphery: the other agents, glanceable, click to promote */}
                        <aside class="flex w-72 shrink-0 flex-col overflow-hidden">
                          <div class="shrink-0 px-0.5 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
                            Other agents · {ordered(live().filter((a) => a.id !== focusedId())).length}
                          </div>
                          <div class="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
                            <For each={ordered(live().filter((a) => a.id !== focusedId()))}>
                              {(a) => (
                                <AgentCard
                                  leading={cardLeading(a)}
                                  name={a.name}
                                  subtitle={a.role}
                                  lastLine={a.lastLine}
                                  status={a.status}
                                  needsAttention={a.needsAttention}
                                  onActivate={() => setFocusedId(a.id)}
                                />
                              )}
                            </For>
                          </div>
                        </aside>
                      </div>
                    </Match>

                    {/* LIST — a full-width scannable column; click promotes to focus. */}
                    <Match when={view() === 'list'}>
                      <Show when={live().length > 0} fallback={<RestoreAll />}>
                        <div class="flex h-full min-h-0 flex-col gap-1.5 overflow-y-auto p-3">
                          <For each={ordered(live())}>
                            {(a) => (
                              <AgentCard
                                leading={cardLeading(a)}
                                name={a.name}
                                subtitle={a.role}
                                lastLine={a.lastLine}
                                status={a.status}
                                needsAttention={a.needsAttention}
                                active={a.id === focusedId()}
                                onActivate={() => { setFocusedId(a.id); setView('focus'); }}
                              />
                            )}
                          </For>
                        </div>
                      </Show>
                    </Match>
                  </Switch>
                </div>
              </div>
            </kai-resizable-item>

            {/* RIGHT — dockable utility panel: Browser (kai-artifact) | Editor
                (kai-file-tree), swapped by kai-tabs. Starts collapsed; the chrome
                PanelRight toggle flips `collapsed` via the panelOpen signal. */}
            <kai-resizable-item size="380px" min="300px" max="560px" collapsed={!panelOpen()}>
              <div class="flex h-full flex-col bg-surface">
                <div class="shrink-0 border-b border-border px-2 py-1.5">
                  <kai-tabs
                    ref={(el) => {
                      const t = el as El;
                      t.items = UTIL_TABS;
                      t.defaultValue = 'browser';
                      t.block = true;
                      el.addEventListener('kai-tab-change', (e) => setUtilTab((e as CustomEvent).detail.value));
                    }}
                    variant="segmented"
                  ></kai-tabs>
                </div>
                {/* Browser: the REAL kai-artifact preview + address bar. Preview-only
                    (noTabs) since the Editor is a sibling kai-tabs tab; back/forward/
                    home hidden; displayUrl shows a clean read-only address for the
                    `data:` blob; expandable maximizes THIS panel via the kai-resizable
                    maximize protocol (the panel is a direct kai-resizable-item). */}
                <Show when={utilTab() === 'browser'}>
                  <div class="min-h-0 flex-1">
                    <kai-artifact
                      ref={(el) => {
                        const art = el as El;
                        art.src = PREVIEW_URL;
                        art.displayUrl = '/staging/acme';
                        art.iframeTitle = 'Acme App staging preview';
                        art.noNav = true;
                        art.noHome = true;
                        art.noTabs = true;
                        art.openInTab = true;
                      }}
                      expandable
                      style={{ display: 'block', height: '100%' }}
                    ></kai-artifact>
                  </div>
                </Show>
                {/* Editor: kai-file-tree with diff stats + its own summary header. */}
                <Show when={utilTab() === 'editor'}>
                  <div class="min-h-0 flex-1 overflow-hidden">
                    <kai-file-tree
                      ref={(el) => { const f = el as El; f.files = EDITOR_FILES; f.summary = true; }}
                      style={{ display: 'block', height: '100%' }}
                    ></kai-file-tree>
                  </div>
                </Show>
              </div>
            </kai-resizable-item>
          </kai-resizable>
        </div>

        {/* broadcast composer (mock modal) — opened from the header megaphone */}
        <Show when={broadcastOpen()}>
          <BroadcastModal />
        </Show>
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        // A representative skeleton (not the full interactive render). The shell is a
        // three-region kai-resizable (rail | center | utility). The CENTER is a
        // `Segmented` view switcher over grid | focus | list, composing the workspace
        // primitives (Pane / AgentCard / PaneGrid). Attention routing sits in the
        // chrome; a header button opens a broadcast modal; agent notifications are
        // raised through the kit's imperative toast() store.
        code: `// status vocabulary shared by Pane + AgentCard
const AGENTS = [
  { id: 'cleo', name: 'Cleo', role: 'Docs', glyph: BookText,
    status: { tone: 'blocked', label: 'Needs input' }, needsAttention: true,
    lastLine: 'Which provider should the guide target?', body: '...' },
  // ...working / idle / done / error agents...
];

const [view, setView] = createSignal<'grid' | 'focus' | 'list'>('grid');
const [focusedId, setFocusedId] = createSignal('atlas');
const [maxPaneId, setMaxPaneId] = createSignal<string | null>(null);

// CENTER: the view switcher + the active tier
<Segmented options={[{ value: 'grid', label: 'Grid', icon: <LayoutGrid/> }, /* ... */]}
           value={view()} onChange={setView} />

<Switch>
  {/* GRID — N panes; per-pane maximize drives PaneGrid maximizedIndex */}
  <Match when={view() === 'grid'}>
    <PaneGrid maximizedIndex={maxIndex()}>
      <For each={agents()}>{(a) => (
        <Pane title={a.name} subtitle={a.role} status={a.status}
              maximized={maxPaneId() === a.id}
              onMaximize={() => setMaxPaneId(/* toggle */)}
              onClose={() => closeAgent(a.id)}
              actions={a.needsAttention ? <NeedsYouBadge/> : undefined}
              footer={<Composer name={a.name}/>}>
          <AgentBody agent={a}/>
        </Pane>
      )}</For>
    </PaneGrid>
  </Match>

  {/* FOCUS — one big Pane + a rail of AgentCards (focus + periphery) */}
  <Match when={view() === 'focus'}>
    <Pane title={focused().name} status={focused().status} footer={<Composer/>}>
      <AgentBody agent={focused()}/>
    </Pane>
    <For each={others()}>{(a) => (
      <AgentCard name={a.name} subtitle={a.role} lastLine={a.lastLine}
                 status={a.status} needsAttention={a.needsAttention}
                 onActivate={() => setFocusedId(a.id)} />
    )}</For>
  </Match>

  {/* LIST — a scannable column; click promotes to focus */}
  <Match when={view() === 'list'}>
    <For each={agents()}>{(a) => (
      <AgentCard name={a.name} status={a.status} needsAttention={a.needsAttention}
                 active={a.id === focusedId()}
                 onActivate={() => { setFocusedId(a.id); setView('focus'); }} />
    )}</For>
  </Match>
</Switch>

{/* ATTENTION: a header count that jumps to the first needs-you agent */}
<button onClick={jumpToAttention}>{attentionCount()} agents need you</button>

{/* NOTIFICATIONS: dogfood the kit's imperative toast() store. */}
configureToasts({ position: 'bottom-right' });
// "needs you" → persistent + actionable, raised once on mount
toast('Cleo needs your input', { duration: 0,
  action: { label: 'Respond', onAction: () => focusAgent('cleo') } });
// "finished" → success toast whose action opens that agent
toast.success('Otto finished its backend task',
  { action: { label: 'Open', onAction: () => focusAgent('otto') } });

{/* BROADCAST: a header button opens a mock modal (a future kai-dialog) */}
<button onClick={() => setBroadcastOpen(true)}>Message all agents</button>`,
      },
    },
  },
};
