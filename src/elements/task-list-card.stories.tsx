import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './task-list-card';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { TaskListCardData } from '../components/task-list-card';
import type { CardEvent } from '../primitives/card-contract';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-task-list': JSX.HTMLAttributes<HTMLElement> & {
        heading?: string;
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type TaskListEl = HTMLElement & { data?: TaskListCardData };

function Frame(props: { children: JSX.Element }) {
  return <div style={{ 'max-width': '460px' }}>{props.children}</div>;
}

/** Mounts a <kc-task-list>, sets `.data`, logs the emitted CardEvent under the render. */
function TaskListDemo(props: { def: TaskListCardData; cardId: string; heading?: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  let el: TaskListEl | undefined;
  onMount(() => {
    if (!el) return;
    el.data = props.def;
    el.addEventListener('kc-card', (e) => {
      const detail = (e as CustomEvent<CardEvent>).detail;
      setLog((prev) => [...prev, detail]);
    });
  });
  return (
    <Frame>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <kc-task-list ref={(e) => (el = e as TaskListEl)} card-id={props.cardId} heading={props.heading} />
        <pre
          style={{
            margin: 0,
            'max-height': '180px',
            overflow: 'auto',
            background: 'var(--color-muted, #f4f4f5)',
            'border-radius': '8px',
            padding: '8px',
            'font-size': '12px',
          }}
        >
          {log().length === 0 ? '// emitted CardEvents appear here' : JSON.stringify(log(), null, 2)}
        </pre>
      </div>
    </Frame>
  );
}

const PLAN: TaskListCardData = {
  mode: 'select',
  selectAll: true,
  confirmLabel: 'Run selected',
  tasks: [
    { id: 'lint', label: 'Run linter', checked: true },
    { id: 'test', label: 'Run unit tests', checked: true },
    { id: 'build', label: 'Build production bundle' },
    { id: 'deploy', label: 'Deploy to staging', description: 'Reversible; staging only' },
  ],
};

const REQUIRE_ONE: TaskListCardData = {
  confirmLabel: 'Apply',
  allowEmpty: false,
  tasks: [
    { id: 'cache', label: 'Clear the CDN cache' },
    { id: 'reindex', label: 'Rebuild the search index' },
    { id: 'restart', label: 'Restart the workers' },
  ],
};

const BOUNDED: TaskListCardData = {
  heading: 'Pick up to 2 reviewers',
  confirmLabel: 'Request review',
  min: 1,
  max: 2,
  tasks: [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
    { id: 'cat', label: 'Cat' },
    { id: 'dan', label: 'Dan' },
  ],
};

const WITH_DESCRIPTIONS: TaskListCardData = {
  selectAll: true,
  confirmLabel: 'Run cleanup',
  tasks: [
    { id: 'tmp', label: 'Delete temp files', description: 'Frees ~2.1 GB; safe to remove' },
    { id: 'logs', label: 'Rotate logs', description: 'Archives logs older than 30 days' },
    { id: 'orphans', label: 'Prune orphaned blobs', description: 'Unreferenced uploads only' },
  ],
};

const HEADING_MAP: Record<string, string | undefined> = {
  'card-plan': 'Approve the plan steps',
  'card-require': 'Choose maintenance steps',
  'card-bounded': undefined,
  'card-desc': 'Storage cleanup',
};

const HTML_SNIPPET = (def: TaskListCardData, cardId: string) => {
  const heading = HEADING_MAP[cardId];
  return `<kc-task-list${heading ? ` heading="${heading}"` : ''}></kc-task-list>
<script type="module">
  import '@kitnai/chat/elements'; // registers the custom elements

  const el = document.querySelector('kc-task-list');
  // \`data\` is the CardEnvelope.data (set as a property).
  el.data = ${JSON.stringify(def, null, 2)};

  // Toggling rows is local; only CONFIRM emits — a single bubbling \`kc-card\` event.
  el.addEventListener('kc-card', (e) => {
    const ev = e.detail; // { kind:'submit-data', cardId, data:{ selected } } | ...
    if (ev.kind === 'submit-data') console.log('selected', ev.data.selected);
  });
</script>`;
};

const meta = {
  title: 'Generative UI/Cards/kc-task-list',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-task-list'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-task-list', [
        "`<kc-task-list>` is a **selectable** task/plan list (set via the `data` **property**): checkbox rows + an optional select-all + a confirm button. The user picks a subset, confirms, and the card emits the Card contract's **`submit-data`** verb up a bubbling **`kc-card`** CustomEvent of `{ kind: 'submit-data', cardId, data: { selected } }` — the checked ids in **input order**. Toggling rows is local UI state; **only the final confirm emits** (the wire stays quiet, the result atomic).",
        '**Gating:** confirm is enabled when `selectedCount >= (min ?? (allowEmpty ? 0 : 1))` and `<= (max ?? ∞)`. Select-all checks every toggleable (non-`disabled`) row and shows an **indeterminate** (`aria-checked="mixed"`) state when only some are checked. When `max` is reached, unchecked rows become non-toggleable. v1 is **select/approve only** (a future `mode:\'progress\'` is reserved in the schema).',
        '**Events** (all frozen Card-contract verbs): `ready` on mount, `submit-data` on confirm, `error` for a malformed definition (renders the inline `kc-card` error). It **never invents events**. The same shapes flow over the remote iframe transport unchanged.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Select a plan (select-all on, a few pre-checked). */
export const SelectAPlan: Story = {
  render: () => <TaskListDemo def={PLAN} cardId="card-plan" heading="Approve the plan steps" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(PLAN, 'card-plan'), language: 'html' } } },
};

/** Require at least one (`allowEmpty:false`, the default) — confirm stays disabled until a row is checked. */
export const RequireAtLeastOne: Story = {
  render: () => <TaskListDemo def={REQUIRE_ONE} cardId="card-require" heading="Choose maintenance steps" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(REQUIRE_ONE, 'card-require'), language: 'html' } } },
};

/** Bounded (`min`/`max`) — confirm gating + max-reached row disabling. */
export const Bounded: Story = {
  render: () => <TaskListDemo def={BOUNDED} cardId="card-bounded" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(BOUNDED, 'card-bounded'), language: 'html' } } },
};

/** Rows with secondary descriptions (linked via aria-describedby). */
export const WithDescriptions: Story = {
  render: () => <TaskListDemo def={WITH_DESCRIPTIONS} cardId="card-desc" heading="Storage cleanup" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(WITH_DESCRIPTIONS, 'card-desc'), language: 'html' } } },
};

/** A malformed `data` (empty `tasks`) → the inline error state + an `error` event. */
export const ErrorState: Story = {
  render: () => <TaskListDemo def={{ tasks: [] } as unknown as TaskListCardData} cardId="card-bad" />,
  parameters: {
    docs: {
      source: {
        code: `<kc-task-list></kc-task-list>
<script type="module">
  import '@kitnai/chat/elements';
  const el = document.querySelector('kc-task-list');
  // No tasks → inline error state + an \`error\` event.
  el.data = { tasks: [] };
  el.addEventListener('kc-card', (e) => {
    if (e.detail.kind === 'error') console.warn('task-list error:', e.detail.message);
  });
</script>`,
        language: 'html',
      },
    },
  },
};
