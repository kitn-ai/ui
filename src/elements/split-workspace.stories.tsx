import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, Show, For, Switch, Match, onMount, onCleanup, type JSX } from 'solid-js';
import {
  Bot, Terminal, FlaskConical, BookText, Boxes, Sparkles, ShieldCheck, Database,
  Megaphone, Bell, Columns3, Focus, List, Globe, CheckCircle2, Command,
  MoreHorizontal, X, Plus, type LucideProps,
} from 'lucide-solid';
import './register'; // every kai-* element used below
import { Pane } from '../ui/pane';
import { AgentCard, type AgentStatus, type AgentStatusTone } from '../ui/agent-card';
import { Segmented, type SegmentedOption } from '../ui/segmented';
import { cn } from '../utils/cn';
import type { KaiNavItem } from '../ui/nav';
import type { KaiCommandItem } from './command';
import { toast, configureToasts } from '../primitives/toast-store';

// Labs/Apps: the full MULTI-AGENT WORKSPACE. A desktop shell with a LEFT
// workspace rail (kai-nav) and a TOP-LEVEL view toggle — AGENTS or BROWSER — that
// fills the rest of the screen. AGENTS is the view-mode area the operator switches
// between three tiers; BROWSER is a FULL-SCREEN kai-artifact (address bar /
// back-forward / reload / displayUrl) with a hand-rolled preview TAB STRIP above
// it, one tab per open preview (composition, not a monolith).
//
// The problem this models: one human navigating MANY WORKSPACES (projects) ×
// MANY AGENTS within each, keyboard-first AND mouse-friendly. Two nav levels —
// WORKSPACE (the left rail) and AGENT (the editor-group) — and both are reachable
// from the keyboard and the command palette. The browser is full-screen, never
// tiled: a tiny tiled preview is useless, so previews get the whole canvas.
//
// The center is driven by a `Segmented` view switcher over a `view` signal:
//   • WORKSPACE — a 2-level editor-group split (Zed/VSCode/tmux WINDOW TILING): a
//                 row of resizable COLUMNS; each column is a vertical stack of one
//                 or more resizable GROUPS (rows); each group = a TAB STRIP + the
//                 active agent's `Pane`. Columns/groups are LAYOUT regions, never
//                 status lanes. The default tier.
//   • FOCUS     — one large `Pane` (the focused agent) beside a vertical RAIL of
//                 `AgentCard`s; clicking a card promotes it to focus.
//   • LIST      — a full-width column of `AgentCard`s for scanning many agents.
//
// Editor-group tabs use a SPACE-EFFICIENT design: each tab leads with a small
// tone-colored badge carrying the agent's keyboard NUMBER — the color encodes
// status, the digit is the ⌥-jump key, unifying status + hint into one element.
// The status WORD shows on the active tab + on hover (and always for needs-you /
// error). A per-tab "…" menu moves/splits the pane; an "×" closes it.
//
// Keyboard backbone (browser-safe — no Cmd/Ctrl+number, which browsers reserve):
//   • Cmd/Ctrl+K        opens the kai-command palette (both nav levels).
//   • Alt/Option+1..8   jumps to agent N: focuses its pane + its prompt input.
//   • Alt/Option+Z      zooms / restores the focused pane (Esc also restores).
//   • Alt/Option+B      toggles the top-level AGENTS / BROWSER view.
// Number keys read `event.code` (Digit1…Digit8) so macOS Option-glyphs never leak.
//
// Attention routing surfaces "who needs you": a header count pill that jumps to
// the first waiting agent, an amber edge on the agents awaiting input, and a
// "Needs you first" sort toggle. A broadcast composer ("Message all agents") opens
// from the header. The top-level rail | center split is a real kai-resizable; the
// 2-level editor-group is a hand-rolled flex layout with draggable dividers on
// BOTH axes — between columns (horizontal) and between stacked groups within a
// column (vertical) — since kai-resizable can't express the nested N×M tiling.

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
      'kai-command': JSX.HTMLAttributes<HTMLElement> & { placeholder?: string; 'empty-label'?: string; theme?: string };
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
type ViewMode = 'workspace' | 'focus' | 'list';
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

// ── Editor-group model (2-level: columns × rows) ─────────────────────────────
// WINDOW TILING, not a kanban. A `Column` is a LAYOUT region: a vertical stack of
// one or more `Group`s (rows). A `Group` is one editor group — an ordered set of
// agent tabs plus the active one. The workspace renders `columns()` left → right
// and, inside each column, its groups top → bottom. Tab "…" actions, the
// "+ New column" affordance, the column close, and the palette mutate this model
// (split right / split down · move · close), dropping empty GROUPS and empty
// COLUMNS and keeping every `activeId` + the focus valid. Columns/groups are
// never organized BY status.
interface Group {
  id: string;
  agentIds: string[];
  activeId: string;
}
interface Column {
  id: string;
  groups: Group[];
}

let colSeq = 0;
let groupSeq = 0;
const newColId = () => `col-${colSeq++}`;
const newGroupId = () => `grp-${groupSeq++}`;
const makeGroup = (ids: string[]): Group => ({ id: newGroupId(), agentIds: [...ids], activeId: ids[0] ?? '' });

// Distribute the 8 agents across 3 HETEROGENEOUS columns so the 2-level model is
// visible by default: columns 1 and 3 are single full-height panes (one group
// each), while the MIDDLE column starts as TWO stacked groups (a row split). Cleo
// lands in the middle column's top row and Nova in the last column, so attention
// is spread across the layout. Nothing assumes columns are uniform.
const initialColumns = (): Column[] => {
  const ids = AGENTS.map((a) => a.id);
  return [
    { id: newColId(), groups: [makeGroup(ids.slice(0, 3))] },
    { id: newColId(), groups: [makeGroup(ids.slice(3, 5)), makeGroup(ids.slice(5, 6))] },
    { id: newColId(), groups: [makeGroup(ids.slice(6))] },
  ];
};

// The keyboard NUMBER for each agent (Alt/Option+N), shown inside the tab badge.
// Stable across the fleet by AGENTS order: Atlas=1 … Nova=8.
const AGENT_NUMBER = new Map(AGENTS.map((a, i) => [a.id, i + 1]));

// tone → solid badge (the numbered status chip) and tone → label text color. Both
// token-backed (tool-* / muted), so they read in light AND dark with no hardcodes.
const TONE_BADGE: Record<AgentStatusTone, string> = {
  working: 'bg-tool-blue text-white',
  idle: 'bg-muted-foreground text-background',
  done: 'bg-tool-green text-white',
  error: 'bg-tool-red text-white',
  blocked: 'bg-tool-amber text-white',
};
const TONE_TEXT: Record<AgentStatusTone, string> = {
  working: 'text-tool-blue',
  idle: 'text-muted-foreground',
  done: 'text-tool-green',
  error: 'text-tool-red',
  blocked: 'text-tool-amber',
};

// ── Browser previews (the full-screen Browser view) ─────────────────────────
// The Browser top-level view is a FULL-SCREEN kai-artifact (address bar /
// back-forward / reload / displayUrl) with a hand-rolled TAB STRIP above it — one
// tab per open preview. Different agents open their OWN preview tabs, so the model
// is a flat `browserTabs` array of { id, title, url, agentId, src }. Every
// previewed app is itself DARK (dark surfaces + light text), carried in an
// isolated `data:` iframe, so it reads as a real dark product regardless of the
// IDE theme. The artifact frames the `data:` blob; `displayUrl` shows a clean
// read-only address instead of leaking the blob.
const dataUrl = (html: string) => `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

// Shared dark styling for every preview page.
const PREVIEW_CSS = `
  :root { color-scheme: dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; background: #0b0b0e; color: #fafafa; }
  header { display: flex; align-items: center; gap: 8px; padding: 14px 20px; border-bottom: 1px solid #27272a; font-weight: 600; }
  .dot { width: 10px; height: 10px; border-radius: 50%; background: #22c55e; box-shadow: 0 0 8px #22c55e80; }
  main { padding: 28px 20px; max-width: 560px; }
  h1 { font-size: 22px; margin: 0 0 6px; }
  p { color: #a1a1aa; line-height: 1.55; }
  .card { margin-top: 18px; padding: 16px; border: 1px solid #27272a; border-radius: 12px; background: #18181b; }
  .btn { display: inline-block; margin-top: 12px; padding: 9px 16px; border-radius: 8px; background: #fafafa; color: #18181b; text-decoration: none; font-size: 14px; font-weight: 600; }
`;

interface PreviewCopy {
  badge: string;
  h1: string;
  lede: string;
  cardTitle: string;
  cardMeta: string;
  cta: string;
}
const previewPage = (o: PreviewCopy) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${PREVIEW_CSS}</style></head><body>` +
  `<header><span class="dot"></span> ${o.badge}</header>` +
  `<main><h1>${o.h1}</h1><p>${o.lede}</p>` +
  `<div class="card"><strong>${o.cardTitle}</strong><p style="margin:6px 0 0">${o.cardMeta}</p>` +
  `<a class="btn" href="#">${o.cta}</a></div></main></body></html>`;

// A single browser preview tab. `agentId` is the agent that opened it (so a tab
// reads as "owned" by an agent and we can dedupe re-opens); `src` is the dark
// `data:` page the artifact frames.
interface BrowserTab {
  id: string;
  title: string;
  url: string;
  agentId: string;
  src: string;
}
let previewSeq = 0;

// Seed previews opened by DIFFERENT agents: the dark "Acme App — staging /
// Checkout" one (Cy), an admin orders view (Otto), and the rendered docs guide
// (Cleo). The count of these is what the Browser top-level tab badges.
const INITIAL_BROWSER_TABS: BrowserTab[] = [
  {
    id: 'pv-checkout', title: 'Acme App — Checkout', url: '/staging/acme/checkout', agentId: 'cy',
    src: dataUrl(previewPage({
      badge: 'Acme App — staging',
      h1: 'Checkout v2',
      lede: 'The refactored flow is live on the staging preview. Atlas is coordinating the rollout while the fleet finishes its tasks.',
      cardTitle: 'Cart', cardMeta: '2 items · $84.00', cta: 'Continue to payment',
    })),
  },
  {
    id: 'pv-orders', title: 'Acme Admin — Orders', url: '/staging/acme/admin/orders', agentId: 'otto',
    src: dataUrl(previewPage({
      badge: 'Acme Admin — staging',
      h1: 'Orders',
      lede: 'The split orders table is live behind the new migrations. Otto is reconciling payment intents against the ledger.',
      cardTitle: 'Today', cardMeta: '1,284 orders · $48,910 captured', cta: 'Open order #4821',
    })),
  },
  {
    id: 'pv-docs', title: 'Docs — Checkout guide', url: '/preview/docs/checkout', agentId: 'cleo',
    src: dataUrl(previewPage({
      badge: 'Docs Portal — preview',
      h1: 'Checkout integration',
      lede: 'Cleo is drafting the provider walkthrough. The auth section is blocked on which gateway the guide should target.',
      cardTitle: 'On this page', cardMeta: 'Setup · Webhooks · Going live', cta: 'Read the guide',
    })),
  },
];

export const SplitWorkspace: Story = {
  name: 'Multi-Agent Workspace',
  render: () => {
    const [workspace, setWorkspace] = createSignal('acme');
    const [view, setView] = createSignal<ViewMode>('workspace');
    // focusedId drives the Focus + List tiers (one agent at a time).
    const [focusedId, setFocusedId] = createSignal<string>(AGENTS[0].id);
    // The 2-level editor-group model. `colSizes` holds the per-COLUMN horizontal
    // flex weights (the column dividers drive these); `rowSizes` maps a column id →
    // its per-GROUP vertical flex weights (the in-column row dividers drive those).
    const [columns, setColumns] = createSignal<Column[]>(initialColumns());
    const [colSizes, setColSizes] = createSignal<number[]>(columns().map(() => 1));
    const [rowSizes, setRowSizes] = createSignal<Record<string, number[]>>(
      Object.fromEntries(columns().map((c) => [c.id, c.groups.map(() => 1)])),
    );
    // Which group/pane is focused (the ⌥-jump + zoom target; paints Pane `focused`).
    const [focusedGroupId, setFocusedGroupId] = createSignal<string>(columns()[0]?.groups[0]?.id ?? '');
    // The zoomed (maximized) agent id, or null. Esc / ⌥Z restore.
    const [zoomedId, setZoomedId] = createSignal<string | null>(null);
    // The agent id whose tab "…" menu is open, or null.
    const [menuFor, setMenuFor] = createSignal<string | null>(null);
    const [closed, setClosed] = createSignal<Set<string>>(new Set());
    const [attentionFirst, setAttentionFirst] = createSignal(false);
    const [cmdOpen, setCmdOpen] = createSignal(false);
    // TOP-LEVEL view: AGENTS (the editor-group tiling) or BROWSER (a full-screen
    // kai-artifact + preview tab strip). Distinct from the within-Agents tier.
    const [topView, setTopView] = createSignal<'agents' | 'browser'>('agents');
    // Open browser previews — different agents open their own tabs.
    const [browserTabs, setBrowserTabs] = createSignal<BrowserTab[]>(INITIAL_BROWSER_TABS);
    const [activeBrowserTab, setActiveBrowserTab] = createSignal<string>(INITIAL_BROWSER_TABS[0]?.id ?? '');
    // Broadcast composer now lives behind a header button → mock modal.
    const [broadcastOpen, setBroadcastOpen] = createSignal(false);

    // Refs captured imperatively: the per-agent prompt input (so ⌥N can focus it),
    // the workspace nav (so the palette can drive its controlled value), and the
    // columns row (so the dividers can measure it for drag math).
    const promptRefs = new Map<string, El>();
    let navEl: El | undefined;
    // The columns row (measured by the column dividers for horizontal drag) + each
    // column's group stack (measured by its row dividers for vertical drag).
    let rowEl: HTMLDivElement | undefined;
    const colRefs = new Map<string, HTMLElement>();

    const live = () => AGENTS.filter((a) => !closed().has(a.id));
    const agentById = (id: string) => AGENTS.find((a) => a.id === id);
    // Stable sort: agents awaiting input float to the top when the toggle is on.
    const ordered = (list: Agent[]) =>
      attentionFirst()
        ? [...list].sort((a, b) => Number(!!b.needsAttention) - Number(!!a.needsAttention))
        : list;
    const attentionCount = () => live().filter((a) => a.needsAttention).length;
    const focusedAgent = () => live().find((a) => a.id === focusedId()) ?? live()[0];

    // ── Editor-group helpers (2-level) ───────────────────────────────────────
    // A group's live agents, in display (attention) order.
    const colAgents = (group: Group) =>
      ordered(
        group.agentIds
          .map((id) => agentById(id))
          .filter((a): a is Agent => !!a && !closed().has(a.id)),
      );
    // Locate a group (and its column) by group id / by the agent it holds.
    const findGroup = (groupId: string) => {
      for (const col of columns()) for (const group of col.groups) if (group.id === groupId) return { col, group };
      return undefined;
    };
    const findGroupOfAgent = (agentId: string) => {
      for (const col of columns()) for (const group of col.groups) if (group.agentIds.includes(agentId)) return { col, group };
      return undefined;
    };
    const focusedGroup = () => findGroup(focusedGroupId())?.group ?? columns()[0]?.groups[0];
    const focusedPaneId = () => focusedGroup()?.activeId;

    // Strip an agent out of whatever group holds it, keeping that group's activeId
    // valid. Leaves empty groups/columns in place — commitColumns drops them.
    const withoutAgent = (cols: Column[], agentId: string): Column[] =>
      cols.map((col) => ({
        ...col,
        groups: col.groups.map((g) => {
          if (!g.agentIds.includes(agentId)) return g;
          const remaining = g.agentIds.filter((id) => id !== agentId);
          return { ...g, agentIds: remaining, activeId: g.activeId === agentId ? (remaining[0] ?? '') : g.activeId };
        }),
      }));

    // Commit a new layout: drop empty GROUPS then empty COLUMNS, reset BOTH axes'
    // divider weights to equal (survivors REFLOW to fill the freed space), and keep
    // focusedGroupId pointing at a group that still exists.
    const commitColumns = (next: Column[]) => {
      const cleaned = next
        .map((col) => ({ ...col, groups: col.groups.filter((g) => g.agentIds.length > 0) }))
        .filter((col) => col.groups.length > 0);
      setColumns(cleaned);
      setColSizes(cleaned.map(() => 1));
      setRowSizes(Object.fromEntries(cleaned.map((col) => [col.id, col.groups.map(() => 1)])));
      const groupIds = cleaned.flatMap((col) => col.groups.map((g) => g.id));
      if (!groupIds.includes(focusedGroupId())) {
        setFocusedGroupId(groupIds[0] ?? '');
      }
    };

    const selectTab = (groupId: string, agentId: string) => {
      setColumns((cols) =>
        cols.map((col) => ({
          ...col,
          groups: col.groups.map((g) => (g.id === groupId ? { ...g, activeId: agentId } : g)),
        })),
      );
      setFocusedGroupId(groupId);
      setFocusedId(agentId);
    };

    const closeTab = (agentId: string) => {
      setClosed((s) => { const n = new Set<string>(s); n.add(agentId); return n; });
      if (zoomedId() === agentId) setZoomedId(null);
      setMenuFor(null);
      const next = columns().map((col) => ({
        ...col,
        groups: col.groups.map((g) => {
          if (!g.agentIds.includes(agentId)) return g;
          const idx = g.agentIds.indexOf(agentId);
          const remaining = g.agentIds.filter((id) => id !== agentId);
          const activeId =
            g.activeId === agentId
              ? remaining[Math.min(idx, remaining.length - 1)] ?? ''
              : g.activeId;
          return { ...g, agentIds: remaining, activeId };
        }),
      }));
      commitColumns(next);
    };

    // Close an ENTIRE column (its panes go with it). The survivors REFLOW to fill
    // the freed width — commitColumns resets the column weights to equal.
    const closeColumn = (colId: string) => {
      setMenuFor(null);
      const col = columns().find((c) => c.id === colId);
      if (!col) return;
      const ids = col.groups.flatMap((g) => g.agentIds);
      setClosed((s) => { const n = new Set<string>(s); ids.forEach((id) => n.add(id)); return n; });
      if (zoomedId() && ids.includes(zoomedId() as string)) setZoomedId(null);
      commitColumns(columns().filter((c) => c.id !== colId));
    };

    const resetAll = () => {
      setClosed(new Set<string>());
      const cols = initialColumns();
      setColumns(cols);
      setColSizes(cols.map(() => 1));
      setRowSizes(Object.fromEntries(cols.map((col) => [col.id, col.groups.map(() => 1)])));
      setFocusedGroupId(cols[0]?.groups[0]?.id ?? '');
      setZoomedId(null);
    };

    // SPLIT RIGHT: pull an agent into a brand-new COLUMN inserted right after its
    // current column (a single-group column to the right).
    const splitRight = (agentId: string) => {
      setMenuFor(null);
      const loc = findGroupOfAgent(agentId);
      if (!loc) return;
      const ng = makeGroup([agentId]);
      const nc: Column = { id: newColId(), groups: [ng] };
      const next: Column[] = [];
      for (const col of withoutAgent(columns(), agentId)) {
        next.push(col);
        if (col.id === loc.col.id) next.push(nc);
      }
      commitColumns(next);
      setFocusedGroupId(ng.id);
      setFocusedId(agentId);
    };

    // SPLIT DOWN: pull an agent into a NEW GROUP (row) inserted just below its
    // current group, within the SAME column.
    const splitDown = (agentId: string) => {
      setMenuFor(null);
      const loc = findGroupOfAgent(agentId);
      if (!loc) return;
      const ng = makeGroup([agentId]);
      const next = withoutAgent(columns(), agentId).map((col) => {
        if (col.id !== loc.col.id) return col;
        const at = col.groups.findIndex((g) => g.id === loc.group.id);
        const groups = [...col.groups];
        groups.splice(at + 1, 0, ng);
        return { ...col, groups };
      });
      commitColumns(next);
      setFocusedGroupId(ng.id);
      setFocusedId(agentId);
    };

    // Add a NEW trailing column from the focused pane (the explicit "+ New column"
    // affordance at the row's trailing edge). Survivors reflow via commitColumns.
    const addColumn = () => {
      const agentId = focusedPaneId();
      if (!agentId) return;
      setMenuFor(null);
      const ng = makeGroup([agentId]);
      const nc: Column = { id: newColId(), groups: [ng] };
      commitColumns([...withoutAgent(columns(), agentId), nc]);
      setFocusedGroupId(ng.id);
      setFocusedId(agentId);
    };

    // Move an agent to the adjacent COLUMN (dir −1 / +1) — appends to that column's
    // first group + makes it active. No-op past the ends.
    const moveToColumn = (agentId: string, dir: -1 | 1) => {
      setMenuFor(null);
      const cs = columns();
      const srcIdx = cs.findIndex((c) => c.groups.some((g) => g.agentIds.includes(agentId)));
      if (srcIdx < 0) return;
      const tgtIdx = srcIdx + dir;
      if (tgtIdx < 0 || tgtIdx >= cs.length) return;
      const target = cs[tgtIdx];
      const targetGroup = target.groups[0];
      if (!targetGroup) return;
      const next = withoutAgent(cs, agentId).map((col) =>
        col.id === target.id
          ? {
              ...col,
              groups: col.groups.map((g) =>
                g.id === targetGroup.id ? { ...g, agentIds: [...g.agentIds, agentId], activeId: agentId } : g,
              ),
            }
          : col,
      );
      commitColumns(next);
      setFocusedGroupId(targetGroup.id);
      setFocusedId(agentId);
    };

    // Move an agent to the adjacent GROUP within its column (dir −1 / +1 — the row
    // above / below). No-op if there's no such row.
    const moveToGroup = (agentId: string, dir: -1 | 1) => {
      setMenuFor(null);
      const loc = findGroupOfAgent(agentId);
      if (!loc) return;
      const groups = loc.col.groups;
      const srcIdx = groups.findIndex((g) => g.id === loc.group.id);
      const tgtIdx = srcIdx + dir;
      if (tgtIdx < 0 || tgtIdx >= groups.length) return;
      const targetGroup = groups[tgtIdx];
      const next = withoutAgent(columns(), agentId).map((col) =>
        col.id === loc.col.id
          ? {
              ...col,
              groups: col.groups.map((g) =>
                g.id === targetGroup.id ? { ...g, agentIds: [...g.agentIds, agentId], activeId: agentId } : g,
              ),
            }
          : col,
      );
      commitColumns(next);
      setFocusedGroupId(targetGroup.id);
      setFocusedId(agentId);
    };

    const toggleZoom = (agentId?: string) => {
      const id = agentId ?? focusedPaneId();
      if (!id) return;
      setTopView('agents');
      setView('workspace');
      setZoomedId((z) => (z === id ? null : id));
    };

    // Jump to an agent (palette "Go to …", header pill, ⌥N): make it the active tab
    // of its column, focus that group + its prompt input, in the Workspace tier.
    const jumpToAgent = (agentId: string) => {
      if (!live().some((a) => a.id === agentId)) return;
      setTopView('agents');
      setView('workspace');
      setZoomedId(null);
      const loc = findGroupOfAgent(agentId);
      if (loc) {
        selectTab(loc.group.id, agentId);
      } else {
        setFocusedId(agentId);
      }
      queueMicrotask(() => promptRefs.get(agentId)?.focus?.());
    };
    const jumpToNumber = (n: number) => {
      const a = AGENTS[n - 1];
      if (a) jumpToAgent(a.id);
    };

    // Route the operator to whatever wants them first.
    const jumpToAttention = () => {
      const first = ordered(live()).find((a) => a.needsAttention);
      if (first) jumpToAgent(first.id);
    };

    // Toast actions land here: open that agent in the Workspace tier.
    const focusAgent = (id: string) => jumpToAgent(id);

    // ── Browser previews (full-screen Browser view) ──────────────────────────
    const activeBrowserTabData = () =>
      browserTabs().find((t) => t.id === activeBrowserTab()) ?? browserTabs()[0];

    // Build a dark preview tab for an arbitrary agent (the "Open preview" action).
    const makeAgentTab = (a: Agent): BrowserTab => ({
      id: `pv-${a.id}-${previewSeq++}`,
      title: `${a.name} preview`,
      url: `/preview/${workspace()}/${a.id}`,
      agentId: a.id,
      src: dataUrl(
        previewPage({
          badge: `${WORKSPACE_LABEL.get(workspace())} — preview`,
          h1: `${a.name} · ${a.role}`,
          lede: a.lastLine,
          cardTitle: 'Status',
          cardMeta: a.status.label ?? a.status.tone,
          cta: 'Open in agent',
        }),
      ),
    });

    // Open a preview for an agent (defaults to the focused pane): reuse its tab if
    // one is already open, else add one, then switch to the full-screen Browser.
    const openPreview = (agentId?: string) => {
      const id = agentId ?? focusedPaneId();
      if (!id) return;
      const a = agentById(id);
      if (!a) return;
      setCmdOpen(false);
      const existing = browserTabs().find((t) => t.agentId === id);
      if (existing) {
        setActiveBrowserTab(existing.id);
      } else {
        const tab = makeAgentTab(a);
        setBrowserTabs((tabs) => [...tabs, tab]);
        setActiveBrowserTab(tab.id);
      }
      setTopView('browser');
    };

    // Close a preview tab; keep the active tab valid and drop back to Agents when
    // the last preview closes.
    const closeBrowserTab = (tabId: string) => {
      const tabs = browserTabs();
      const idx = tabs.findIndex((t) => t.id === tabId);
      if (idx < 0) return;
      const next = tabs.filter((t) => t.id !== tabId);
      setBrowserTabs(next);
      if (activeBrowserTab() === tabId) setActiveBrowserTab(next[Math.min(idx, next.length - 1)]?.id ?? '');
      if (next.length === 0) setTopView('agents');
    };

    // ── Toasts + keyboard ────────────────────────────────────────────────────
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

      // Browser-safe global shortcuts. Number + zoom keys read `event.code` so
      // macOS Option-glyphs (⌥1 → "¡", ⌥z → "Ω") never matter; preventDefault
      // cancels the default even when the event originates in a shadow-DOM input.
      const onKey = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') {
          e.preventDefault();
          setCmdOpen(true);
          return;
        }
        if (e.altKey && !e.metaKey && !e.ctrlKey && /^Digit[1-8]$/.test(e.code)) {
          e.preventDefault();
          jumpToNumber(Number(e.code.slice(5)));
          return;
        }
        if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyZ') {
          e.preventDefault();
          toggleZoom();
          return;
        }
        if (e.altKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyB') {
          e.preventDefault();
          setTopView((v) => (v === 'browser' ? 'agents' : 'browser'));
          return;
        }
        if (e.key === 'Escape') {
          if (menuFor()) setMenuFor(null);
          if (zoomedId()) setZoomedId(null);
        }
      };
      // Any outside click dismisses an open tab "…" menu (its own clicks stop
      // propagation, so opening never immediately re-closes it).
      const onDocClick = () => { if (menuFor()) setMenuFor(null); };
      document.addEventListener('keydown', onKey);
      document.addEventListener('click', onDocClick);
      onCleanup(() => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('click', onDocClick);
      });
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

    // ── Command palette: covers BOTH nav levels ──────────────────────────────
    // Computed fresh each open (the overlay re-mounts), so it reflects the live
    // fleet + the currently focused pane. Icons are only set where a kai icon name
    // is known, to avoid the text-fallback warning.
    const commandItems = (): KaiCommandItem[] => {
      const items: KaiCommandItem[] = [];
      for (const a of live()) {
        items.push({
          id: `goto-${a.id}`,
          label: `Go to ${a.name}`,
          description: `${a.role} · ⌥${AGENT_NUMBER.get(a.id)}`,
          group: 'Agents',
        });
      }
      for (const w of WORKSPACES) {
        items.push({
          id: `ws-${w.id}`,
          label: `Switch to ${w.label}`,
          icon: typeof w.icon === 'string' ? w.icon : undefined,
          group: 'Workspaces',
        });
      }
      const fa = focusedPaneId();
      const faName = (fa && agentById(fa)?.name) || 'pane';
      items.push({ id: 'pane-split-right', label: 'Split pane right (new column)', description: faName, group: 'Pane' });
      items.push({ id: 'pane-split-down', label: 'Split pane down (new row)', description: faName, group: 'Pane' });
      items.push({ id: 'pane-next-col', label: 'Move pane to next column', group: 'Pane' });
      items.push({ id: 'pane-prev-col', label: 'Move pane to previous column', group: 'Pane' });
      items.push({ id: 'pane-add-col', label: 'New column from pane', group: 'Pane' });
      items.push({ id: 'pane-zoom', label: 'Zoom pane', description: faName, group: 'Pane' });
      items.push({ id: 'broadcast', label: 'Message all agents', group: 'Broadcast' });
      items.push({ id: 'view-agents', label: 'View agents', group: 'View' });
      items.push({
        id: 'open-browser',
        label: browserTabs().length ? `Open browser (${browserTabs().length})` : 'Open browser',
        group: 'View',
      });
      items.push({ id: 'open-preview', label: `Open preview of ${faName}`, group: 'View' });
      return items;
    };

    const onCommandSelect = (id: string) => {
      setCmdOpen(false);
      if (id.startsWith('goto-')) { jumpToAgent(id.slice('goto-'.length)); return; }
      if (id.startsWith('ws-')) {
        const w = id.slice('ws-'.length);
        setWorkspace(w);
        if (navEl) navEl.value = w;
        return;
      }
      const fa = focusedPaneId();
      switch (id) {
        case 'pane-split-right': if (fa) splitRight(fa); break;
        case 'pane-split-down': if (fa) splitDown(fa); break;
        case 'pane-next-col': if (fa) moveToColumn(fa, 1); break;
        case 'pane-prev-col': if (fa) moveToColumn(fa, -1); break;
        case 'pane-add-col': addColumn(); break;
        case 'pane-zoom': toggleZoom(); break;
        case 'broadcast': setBroadcastOpen(true); break;
        case 'view-agents': setTopView('agents'); break;
        case 'open-browser': setTopView('browser'); break;
        case 'open-preview': if (fa) openPreview(fa); break;
      }
    };

    const VIEW_OPTIONS: SegmentedOption[] = [
      { value: 'workspace', label: 'Workspace', icon: <Columns3 class="size-3.5" /> },
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

    // The compact per-pane composer (footer slot of every Pane). Registers its
    // prompt input by agent id so ⌥N can focus it the instant the pane mounts.
    const Composer = (props: { agent: Agent }) => (
      <div class="p-1.5">
        <kai-prompt-input
          ref={(el) => { const p = el as El; p.attach = false; promptRefs.set(props.agent.id, p); }}
          class="block"
          placeholder={`Message ${props.agent.name}...`}
        ></kai-prompt-input>
      </div>
    );

    // The "needs you" pill shown in the header of an attention pane.
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

    // ── Editor-group tab + its move/split menu ───────────────────────────────
    const TabMenuItem = (props: { onClick: () => void; disabled?: boolean; children: JSX.Element }) => (
      <button
        type="button"
        role="menuitem"
        disabled={props.disabled}
        onClick={() => { if (!props.disabled) props.onClick(); }}
        class="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs text-popover-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
      >
        {props.children}
      </button>
    );

    // A NUMBERED-STATUS-BADGE tab: [tone badge + ⌥number] name [status word] … ×.
    // The badge color encodes status, the digit is the jump key. The status word
    // shows on the active tab, on hover, and always for needs-you / error.
    const Tab = (props: { group: Group; colId: string; agent: Agent }) => {
      const isActive = () => props.group.activeId === props.agent.id;
      const num = AGENT_NUMBER.get(props.agent.id);
      const alwaysWord = () =>
        isActive() || !!props.agent.needsAttention || props.agent.status.tone === 'error';
      const colIdx = () => columns().findIndex((c) => c.id === props.colId);
      const col = () => columns().find((c) => c.id === props.colId);
      const grpIdx = () => col()?.groups.findIndex((g) => g.id === props.group.id) ?? -1;
      const groupCount = () => col()?.groups.length ?? 0;
      const menuOpen = () => menuFor() === props.agent.id;
      return (
        <div
          role="tab"
          aria-selected={isActive()}
          onClick={() => selectTab(props.group.id, props.agent.id)}
          class={cn(
            'group/tab relative flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pl-1.5 pr-1 text-xs transition-colors',
            isActive()
              ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:bg-hover hover:text-foreground',
            props.agent.needsAttention && !isActive() && 'ring-1 ring-tool-amber/50',
          )}
        >
          <span
            class={cn(
              'flex size-[18px] shrink-0 items-center justify-center rounded text-[11px] font-bold leading-none tabular-nums',
              TONE_BADGE[props.agent.status.tone],
            )}
            aria-hidden="true"
          >
            {num}
          </span>
          <span class="max-w-[8rem] truncate font-medium">{props.agent.name}</span>
          <Show when={props.agent.status.label}>
            <span
              class={cn(
                'truncate text-[10px] font-medium',
                TONE_TEXT[props.agent.status.tone],
                alwaysWord() ? 'inline' : 'hidden group-hover/tab:inline',
              )}
            >
              {props.agent.status.label}
            </span>
          </Show>
          <span class="ml-0.5 flex shrink-0 items-center">
            <button
              type="button"
              aria-label={`${props.agent.name} tab actions`}
              aria-haspopup="menu"
              aria-expanded={menuOpen()}
              onClick={(e) => { e.stopPropagation(); setMenuFor((m) => (m === props.agent.id ? null : props.agent.id)); }}
              class={cn(
                'flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground',
                isActive() || menuOpen() ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100',
              )}
            >
              <MoreHorizontal class="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={`Close ${props.agent.name}`}
              onClick={(e) => { e.stopPropagation(); closeTab(props.agent.id); }}
              class={cn(
                'flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground',
                isActive() ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100',
              )}
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </span>
          <Show when={menuOpen()}>
            <div
              role="menu"
              class="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <TabMenuItem onClick={() => splitRight(props.agent.id)}>Split right</TabMenuItem>
              <TabMenuItem onClick={() => splitDown(props.agent.id)}>Split down</TabMenuItem>
              <div class="my-1 h-px bg-border"></div>
              <TabMenuItem disabled={colIdx() >= columns().length - 1} onClick={() => moveToColumn(props.agent.id, 1)}>Move to next column</TabMenuItem>
              <TabMenuItem disabled={colIdx() <= 0} onClick={() => moveToColumn(props.agent.id, -1)}>Move to previous column</TabMenuItem>
              <TabMenuItem disabled={grpIdx() >= groupCount() - 1} onClick={() => moveToGroup(props.agent.id, 1)}>Move to group below</TabMenuItem>
              <TabMenuItem disabled={grpIdx() <= 0} onClick={() => moveToGroup(props.agent.id, -1)}>Move to group above</TabMenuItem>
              <div class="my-1 h-px bg-border"></div>
              <TabMenuItem onClick={() => closeTab(props.agent.id)}>Close</TabMenuItem>
            </div>
          </Show>
        </div>
      );
    };

    // One editor GROUP (a row): a tab strip + the active agent's Pane below. Its
    // vertical flex weight comes from its column's rowSizes. Pointer-down anywhere
    // focuses the group (paints Pane `focused`).
    const GroupView = (props: { group: Group; colId: string; weight: number }) => {
      const isFocused = () => props.group.id === focusedGroupId();
      const activeAgent = () => agentById(props.group.activeId);
      return (
        <div
          class="flex min-h-0 min-w-0 flex-col gap-1.5"
          style={{ flex: String(props.weight) }}
          onPointerDown={() => setFocusedGroupId(props.group.id)}
        >
          <div
            role="tablist"
            class={cn(
              'flex shrink-0 items-center gap-1 overflow-x-auto rounded-lg border bg-surface px-1.5 py-1',
              isFocused() ? 'border-ring' : 'border-border',
            )}
          >
            <For each={colAgents(props.group)}>
              {(agent) => <Tab group={props.group} colId={props.colId} agent={agent} />}
            </For>
          </div>
          <div class="min-h-0 flex-1">
            <Show
              when={activeAgent()}
              keyed
              fallback={
                <div class="flex h-full items-center justify-center rounded-xl border border-border text-xs text-muted-foreground">
                  Empty group
                </div>
              }
            >
              {(a) => (
                <Pane
                  focused={isFocused()}
                  leading={<a.glyph class="size-4" />}
                  title={a.name}
                  subtitle={a.role}
                  status={a.status}
                  maximized={zoomedId() === a.id}
                  onMaximize={() => toggleZoom(a.id)}
                  onClose={() => closeTab(a.id)}
                  actions={a.needsAttention ? <NeedsYouBadge /> : undefined}
                  class={a.needsAttention ? 'border-tool-amber/50 ring-2 ring-inset ring-tool-amber/55' : undefined}
                  footer={<Composer agent={a} />}
                >
                  <AgentBody agent={a} />
                </Pane>
              )}
            </Show>
          </div>
        </div>
      );
    };

    // One COLUMN: a slim header (pane count + a CLOSE-COLUMN control) over a
    // VERTICAL stack of its groups, with draggable row dividers between stacked
    // groups. The column's horizontal flex weight comes from colSizes; the inner
    // stack element is captured in colRefs so the row dividers can measure it.
    const ColumnView = (props: { col: Column; index: number }) => {
      const weights = () => rowSizes()[props.col.id] ?? props.col.groups.map(() => 1);
      return (
        <div
          class="flex h-full min-h-0 min-w-[260px] flex-col gap-1"
          style={{ flex: String(colSizes()[props.index] ?? 1) }}
        >
          <div class="flex h-5 shrink-0 items-center justify-between gap-1 px-0.5">
            <span class="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
              {props.col.groups.length} {props.col.groups.length === 1 ? 'pane' : 'panes'}
            </span>
            <button
              type="button"
              title="Close column"
              aria-label="Close column"
              onClick={() => closeColumn(props.col.id)}
              class="flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-tool-red/10 hover:text-tool-red"
            >
              <X class="size-3.5" aria-hidden="true" />
            </button>
          </div>
          <div ref={(el) => colRefs.set(props.col.id, el)} class="flex min-h-0 flex-1 flex-col">
            <For each={props.col.groups}>
              {(group, gi) => (
                <>
                  <Show when={gi() > 0}>
                    <div
                      role="separator"
                      aria-orientation="horizontal"
                      onPointerDown={startRowDrag(props.col.id, gi() - 1)}
                      class="group/rdiv relative my-0.5 h-1 shrink-0 cursor-row-resize"
                    >
                      <div class="absolute inset-x-2 top-1/2 h-px -translate-y-1/2 rounded-full bg-border transition-colors group-hover/rdiv:bg-ring"></div>
                    </div>
                  </Show>
                  <GroupView group={group} colId={props.col.id} weight={weights()[gi()] ?? 1} />
                </>
              )}
            </For>
          </div>
        </div>
      );
    };

    // A draggable divider between two COLUMNS: shifts horizontal flex weight
    // between the pair as the operator drags. Weight is a fraction of the row
    // width, clamped so neither side collapses past ~12%.
    const startDrag = (pair: number) => (e: PointerEvent) => {
      e.preventDefault();
      const row = rowEl;
      if (!row) return;
      const rect = row.getBoundingClientRect();
      const sizes = [...colSizes()];
      const total = sizes.reduce((s, n) => s + n, 0) || 1;
      const startX = e.clientX;
      const a0 = sizes[pair] ?? 1;
      const b0 = sizes[pair + 1] ?? 1;
      const min = total * 0.12;
      const onMove = (ev: PointerEvent) => {
        const delta = ((ev.clientX - startX) / rect.width) * total;
        let a = a0 + delta;
        let b = b0 - delta;
        if (a < min) { b -= min - a; a = min; }
        if (b < min) { a -= min - b; b = min; }
        const nextSizes = [...colSizes()];
        nextSizes[pair] = a;
        nextSizes[pair + 1] = b;
        setColSizes(nextSizes);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    // A draggable divider between two STACKED GROUPS in a column: shifts vertical
    // flex weight between the pair as the operator drags, clamped so neither row
    // collapses past ~12%. Measures the column's group-stack element (colRefs).
    const startRowDrag = (colId: string, pair: number) => (e: PointerEvent) => {
      e.preventDefault();
      const stack = colRefs.get(colId);
      if (!stack) return;
      const rect = stack.getBoundingClientRect();
      const sizes = [...(rowSizes()[colId] ?? [])];
      const total = sizes.reduce((s, n) => s + n, 0) || 1;
      const startY = e.clientY;
      const a0 = sizes[pair] ?? 1;
      const b0 = sizes[pair + 1] ?? 1;
      const min = total * 0.12;
      const onMove = (ev: PointerEvent) => {
        const delta = ((ev.clientY - startY) / rect.height) * total;
        let a = a0 + delta;
        let b = b0 - delta;
        if (a < min) { b -= min - a; a = min; }
        if (b < min) { a -= min - b; b = min; }
        const nextSizes = [...(rowSizes()[colId] ?? [])];
        nextSizes[pair] = a;
        nextSizes[pair + 1] = b;
        setRowSizes({ ...rowSizes(), [colId]: nextSizes });
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    };

    // The editor-group row: resizable columns with draggable dividers + a trailing
    // "+ New column" affordance.
    const ColumnsRow = () => (
      <div ref={rowEl} class="flex h-full min-h-0 gap-0 overflow-x-auto p-2">
        <For each={columns()}>
          {(col, i) => (
            <>
              <Show when={i() > 0}>
                <div
                  role="separator"
                  aria-orientation="vertical"
                  onPointerDown={startDrag(i() - 1)}
                  class="group/div relative mx-0.5 w-1 shrink-0 cursor-col-resize"
                >
                  <div class="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 rounded-full bg-border transition-colors group-hover/div:bg-ring"></div>
                </div>
              </Show>
              <ColumnView col={col} index={i()} />
            </>
          )}
        </For>
        {/* explicit, discoverable affordance to CREATE a column at the trailing
            edge — moves the focused pane into a new trailing column (alongside the
            per-tab "Split right"). */}
        <button
          type="button"
          onClick={addColumn}
          title="New column from the focused pane"
          aria-label="New column"
          class="group/newcol ml-1 flex w-10 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-ring hover:bg-hover hover:text-foreground"
        >
          <Plus class="size-4" aria-hidden="true" />
          <span class="text-[10px] font-medium uppercase tracking-wider [writing-mode:vertical-rl]">New column</span>
        </button>
      </div>
    );

    // A single maximized pane (⌥Z / the pane maximize control). Esc + the restore
    // glyph drop back to the columns.
    const ZoomPane = (props: { id: string }) => {
      const a = () => agentById(props.id);
      return (
        <div class="h-full min-h-0 p-2">
          <Show when={a()} keyed fallback={<RestoreAll />}>
            {(ag) => (
              <Pane
                focused
                maximized
                leading={<ag.glyph class="size-4" />}
                title={ag.name}
                subtitle={ag.role}
                status={ag.status}
                onMaximize={() => setZoomedId(null)}
                onClose={() => closeTab(ag.id)}
                actions={ag.needsAttention ? <NeedsYouBadge /> : undefined}
                footer={<Composer agent={ag} />}
              >
                <AgentBody agent={ag} />
              </Pane>
            )}
          </Show>
        </div>
      );
    };

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
    // pinned-dark surfaces are the Browser view's previews (dark apps being
    // previewed, independent of the IDE chrome) — each carries its own dark styles
    // in an isolated `data:` iframe, so it stays dark in either theme.
    return (
      <div class="flex h-screen w-full flex-col bg-background text-foreground">
        {/* desktop chrome */}
        <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div class="flex items-center gap-2">
            <Boxes class="size-5 text-primary" />
            <span class="text-sm font-semibold tracking-tight">Multi-Agent Workspace</span>
            <kai-badge variant="outline">{WORKSPACE_LABEL.get(workspace())}</kai-badge>
            {/* TOP-LEVEL view toggle: AGENTS or the full-screen BROWSER. A prominent
                header pair, distinct from the within-Agents tier switcher. The
                Browser side carries a count badge of open preview tabs. */}
            <div class="ml-2 flex items-center gap-0.5 rounded-lg bg-surface-sunken p-0.5">
              <button
                type="button"
                aria-pressed={topView() === 'agents'}
                onClick={() => setTopView('agents')}
                class={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  topView() === 'agents' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Boxes class="size-3.5" aria-hidden="true" /> Agents
              </button>
              <button
                type="button"
                aria-pressed={topView() === 'browser'}
                onClick={() => setTopView('browser')}
                class={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  topView() === 'browser' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Globe class="size-3.5" aria-hidden="true" /> Browser
                <Show when={browserTabs().length > 0}>
                  <span class="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
                    {browserTabs().length}
                  </span>
                </Show>
              </button>
            </div>
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
            {/* command palette: the browser-safe universal entry (⌘K) */}
            <kai-button
              ref={(el) => { el.addEventListener('kai-click', () => setCmdOpen(true)); }}
              variant="outline"
              size="sm"
            >
              <Command slot="icon" class="size-3.5" />
              <span class="font-mono text-[11px]">⌘K</span>
            </kai-button>
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
            <kai-tooltip content="Settings">
              <kai-button variant="ghost" size="icon-sm" icon="settings" label="Settings"></kai-button>
            </kai-tooltip>
          </div>
        </header>

        {/* THE SPLIT: a real two-region kai-resizable (rail | center). The center
            holds the TOP-LEVEL Agents / Browser views; the browser is full-screen,
            so there's no third utility region. */}
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
                      navEl = n;
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

            {/* CENTER — fills everything but the rail. The TOP-LEVEL toggle swaps
                between AGENTS (the view-mode area: a Segmented switcher over
                workspace | focus | list) and the full-screen BROWSER. */}
            <kai-resizable-item min="460px">
              <Switch>
                {/* AGENTS — the editor-group tiering, now full-width. */}
                <Match when={topView() === 'agents'}>
                  <div class="flex h-full flex-col">
                {/* view switcher + ordering toggle */}
                <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
                  <div class="flex items-center gap-2">
                    <Segmented options={VIEW_OPTIONS} value={view()} onChange={(v) => setView(v as ViewMode)} size="sm" />
                    <span class="hidden text-[11px] text-muted-foreground lg:inline">⌥1–8 jump · ⌥Z zoom · ⌥B browser · ⌘K palette</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="hidden text-xs text-muted-foreground sm:inline">
                      {live().length} {live().length === 1 ? 'agent' : 'agents'}
                    </span>
                    {/* opens a dark preview for the focused agent in the Browser view */}
                    <kai-button
                      ref={(el) => { el.addEventListener('kai-click', () => openPreview()); }}
                      variant="outline"
                      size="sm"
                    >
                      <Globe slot="icon" class="size-3.5" />
                      Open preview
                    </kai-button>
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
                    {/* WORKSPACE — the editor-group: resizable columns, each a tab
                        strip + the active agent's Pane. Zoom replaces the row with a
                        single maximized Pane. */}
                    <Match when={view() === 'workspace'}>
                      <Show when={columns().length > 0} fallback={<RestoreAll />}>
                        <Show when={zoomedId()} keyed fallback={<ColumnsRow />}>
                          {(id) => <ZoomPane id={id} />}
                        </Show>
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
                              onMaximize={() => { setZoomedId(a.id); setView('workspace'); }}
                              onClose={() => setView('list')}
                              footer={<Composer agent={a} />}
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
                </Match>

                {/* BROWSER — a FULL-SCREEN kai-artifact (address bar / back-forward
                    / reload / displayUrl) with a hand-rolled preview TAB STRIP above
                    it: one tab per open preview, owned by whichever agent opened it.
                    Composition (artifact + strip), not a monolith. The previewed
                    apps are themselves DARK, carried in isolated `data:` iframes. */}
                <Match when={topView() === 'browser'}>
                  <div class="flex h-full min-h-0 flex-col">
                    <div role="tablist" class="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-1.5">
                      <For each={browserTabs()}>
                        {(tab) => (
                          <div
                            role="tab"
                            aria-selected={tab.id === activeBrowserTab()}
                            onClick={() => setActiveBrowserTab(tab.id)}
                            class={cn(
                              'group/btab flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pl-2 pr-1 text-xs transition-colors',
                              tab.id === activeBrowserTab()
                                ? 'bg-background text-foreground shadow-sm ring-1 ring-border'
                                : 'text-muted-foreground hover:bg-hover hover:text-foreground',
                            )}
                          >
                            <Globe class="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
                            <span class="max-w-[12rem] truncate font-medium">{tab.title}</span>
                            <button
                              type="button"
                              aria-label={`Close ${tab.title}`}
                              onClick={(e) => { e.stopPropagation(); closeBrowserTab(tab.id); }}
                              class={cn(
                                'ml-0.5 flex size-5 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-surface-sunken hover:text-foreground',
                                tab.id === activeBrowserTab() ? 'opacity-100' : 'opacity-0 group-hover/btab:opacity-100',
                              )}
                            >
                              <X class="size-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </For>
                      <kai-tooltip content="Open a preview for the focused agent">
                        <button
                          type="button"
                          aria-label="Open preview"
                          onClick={() => openPreview()}
                          class="ml-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-ring hover:bg-hover hover:text-foreground"
                        >
                          <Plus class="size-4" aria-hidden="true" />
                        </button>
                      </kai-tooltip>
                    </div>
                    <div class="min-h-0 flex-1">
                      <Show
                        when={activeBrowserTabData()}
                        keyed
                        fallback={
                          <div class="flex h-full flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                            No previews open.
                            <kai-button ref={(el) => { el.addEventListener('kai-click', () => openPreview()); }} variant="outline" size="sm" icon="plus">Open preview</kai-button>
                          </div>
                        }
                      >
                        {(tab) => (
                          <kai-artifact
                            ref={(el) => {
                              const art = el as El;
                              art.src = tab.src;
                              art.displayUrl = tab.url;
                              art.iframeTitle = tab.title;
                              art.noTabs = true;
                              art.openInTab = true;
                            }}
                            style={{ display: 'block', height: '100%' }}
                          ></kai-artifact>
                        )}
                      </Show>
                    </div>
                  </div>
                </Match>
              </Switch>
            </kai-resizable-item>
          </kai-resizable>
        </div>

        {/* command palette: a light-DOM overlay hosting kai-command. Opened by ⌘K or
            the header button; closes on backdrop click, Escape, or a selection. */}
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
                  (el as El).items = commandItems();
                  el.addEventListener('kai-select', (e) => onCommandSelect((e as CustomEvent).detail.id));
                  queueMicrotask(() => (el as El).focus?.());
                }}
                placeholder="Search agents, workspaces, actions..."
              ></kai-command>
            </div>
          </div>
        </Show>

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
        // two-region kai-resizable (rail | center) under a TOP-LEVEL Agents / Browser
        // toggle. AGENTS is a `Segmented` view switcher whose default WORKSPACE tier
        // is a 2-level editor-group (window tiling) — a row of resizable COLUMNS, each
        // a vertical stack of resizable GROUPS (rows); every group = a
        // numbered-status-badge tab strip + the active agent's `Pane`. BROWSER is a
        // full-screen kai-artifact + a hand-rolled preview tab strip. A kai-command
        // palette + ⌥-number keys are the keyboard backbone; notifications use toast().
        code: `// status vocabulary shared by Pane + AgentCard
const AGENTS = [ /* atlas, otto, ivy, cleo (needsAttention), … nova */ ];

// 2-LEVEL EDITOR-GROUP model (window tiling, not a kanban):
//   Column = a vertical stack of Groups (rows); Group = an ordered set of agent tabs.
type Group = { id: string; agentIds: string[]; activeId: string };
type Column = { id: string; groups: Group[] };
const [columns, setColumns] = createSignal<Column[]>(distribute(AGENTS)); // mixed cols
const [colSizes, setColSizes] = createSignal(columns().map(() => 1));        // column widths
const [rowSizes, setRowSizes] = createSignal(rowWeights(columns()));         // row heights
const [focusedGroupId, setFocusedGroupId] = createSignal(columns()[0].groups[0].id);
const [zoomedId, setZoomedId] = createSignal<string | null>(null);
const [view, setView] = createSignal<'workspace' | 'focus' | 'list'>('workspace');

// TOP-LEVEL view: AGENTS or the FULL-SCREEN BROWSER (never tiled). Different agents
// open their own preview tabs; the Browser top-level tab badges the open count.
const [topView, setTopView] = createSignal<'agents' | 'browser'>('agents');
type BrowserTab = { id: string; title: string; url: string; agentId: string; src: string };
const [browserTabs, setBrowserTabs] = createSignal<BrowserTab[]>(seedPreviews()); // dark data: pages
const [activeBrowserTab, setActiveBrowserTab] = createSignal(browserTabs()[0].id);

// BROWSER-SAFE keyboard (no Cmd/Ctrl+number — browsers reserve it):
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.code === 'KeyK') { open palette }       // ⌘K
  if (e.altKey && /^Digit[1-8]$/.test(e.code)) jumpToAgent(/* code → N */); // ⌥1–8
  if (e.altKey && e.code === 'KeyZ') toggleZoom(focusedPaneId());           // ⌥Z
  if (e.altKey && e.code === 'KeyB') setTopView(v => v === 'browser' ? 'agents' : 'browser'); // ⌥B
  if (e.key === 'Escape') setZoomedId(null);
});

// TOP-LEVEL toggle (header): AGENTS | Browser (count badge). The within-Agents
// Workspace/Focus/List Segmented is a SEPARATE, lower switcher.
<TopToggle value={topView()} onChange={setTopView} browserCount={browserTabs().length} />

<Switch>
{/* AGENTS — the view switcher + the active tier (full-width) */}
<Match when={topView() === 'agents'}>
<Segmented options={[{ value: 'workspace', label: 'Workspace', icon: <Columns3/> }, /* … */]}
           value={view()} onChange={setView} />

<Switch>
  {/* WORKSPACE — resizable COLUMNS; inside each, resizable GROUPS (rows) */}
  <Match when={view() === 'workspace'}>
    <For each={columns()}>{(col, i) => <>
      {i() > 0 && <ColDivider onPointerDown={startDrag(i() - 1)} />}          {/* resize cols */}
      <Column>                                                                {/* + close-column "x" */}
        <For each={col.groups}>{(g, gi) => <>
          {gi() > 0 && <RowDivider onPointerDown={startRowDrag(col.id, gi() - 1)} />} {/* resize rows */}
          <Group>
            {/* NUMBERED-STATUS-BADGE tabs: [tone badge + ⌥number] name [status] … × */}
            <For each={colAgents(g)}>{(a) => <Tab group={g} colId={col.id} agent={a} />}</For>
            <Pane focused={g.id === focusedGroupId()} maximized={zoomedId() === active(g).id}
                  onClose={() => closeTab(active(g).id)} footer={<Composer agent={active(g)} />}>
              <AgentBody agent={active(g)} />
            </Pane>
          </Group>
        </>}</For>
      </Column>
    </>}</For>
    <NewColumnButton onClick={addColumn} />   {/* trailing "+ New column" affordance */}
  </Match>
  {/* FOCUS — one big Pane + a rail of AgentCards; LIST — a scannable column */}
</Switch>
</Match>

{/* BROWSER — a FULL-SCREEN kai-artifact (address bar / back-forward / reload) with
    a hand-rolled preview TAB STRIP above it (composition, not a monolith) */}
<Match when={topView() === 'browser'}>
  <div role="tablist">
    <For each={browserTabs()}>{(t) => <PreviewTab tab={t}            // title + close ×
      active={t.id === activeBrowserTab()} onClose={() => closeBrowserTab(t.id)} />}</For>
    <button onClick={() => openPreview(focusedPaneId())}>＋</button>   {/* open a preview */}
  </div>
  <kai-artifact src={activeTab().src} displayUrl={activeTab().url} noTabs />  {/* dark page */}
</Match>
</Switch>

// COMMAND PALETTE (kai-command) — both nav levels + pane + view ops:
//   Go to <agent> · Switch <workspace> · split right/down · move next/prev column · new column · zoom
//   · View agents · Open browser · Open preview of <agent>
<kai-command items={commandItems()} onkai-select={(e) => onCommandSelect(e.detail.id)} />

// SPLIT / MOVE via the tab "…" menu (no drag yet): split right (new column) ·
// split down (new row) · move next/prev column · move group above/below · close.
// A column "×" closes the WHOLE column; survivors REFLOW to fill the freed width.
// NOTIFICATIONS: dogfood the kit's imperative toast() store (needs-you + finished).`,
      },
    },
  },
};
