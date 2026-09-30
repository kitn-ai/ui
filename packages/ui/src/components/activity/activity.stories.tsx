import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn, within, expect, userEvent, waitFor } from 'storybook/test';
import { Activity, ActivityStepItem } from './activity';
import type { ActivityStep } from '../../primitives/activity';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Activity',
  component: Activity,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'One quiet line that says what the model did before it answered: "Thought for 6s · Searched the web · Read 3 files". It opens to a timeline of steps, and each step with arguments or a result opens again to show them.',
        'Give it `steps` (from `activityStepsFromParts`) for the preset, or put `ActivityStepItem` rows inside to compose the timeline yourself. Everything a step carries is model output and is rendered as text.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    steps: { control: 'object', description: 'The steps, in order, as `activityStepsFromParts(parts)` returns them.' },
    streaming: { control: 'boolean', description: 'A run in progress: the line shows the live step and shimmers.' },
    open: { control: 'boolean', description: 'Controlled open state of the timeline. Omit for uncontrolled.' },
    defaultOpen: { control: 'boolean', description: 'Initial open state when uncontrolled.' },
    detail: { control: 'inline-radio', options: ['full', 'summary'], description: '`summary` shows the line only, with no disclosure.' },
    summary: { control: 'text', description: 'Replaces the derived line.' },
    renderers: { control: 'object', description: 'Custom elements for individual steps: `tool:<name>`, `tool`, `reasoning`.' },
    onOpenChange: { action: 'openChange', description: 'The timeline expanded or collapsed.', table: { category: 'Events' } },
    onStepToggle: { action: 'stepToggle', description: 'A step opened or closed, with its id.', table: { category: 'Events' } },
    children: { control: false, description: 'Item mode: `ActivityStepItem` rows.' },
  },
  args: { onOpenChange: fn(), onStepToggle: fn() },
} satisfies Meta<typeof Activity>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Data ───────────────────────────────────────────────────────────────────────────────

const SEARCH: ActivityStep = {
  id: 'search', kind: 'tool', status: 'done', toolName: 'web_search', toolKind: 'search', startedAt: 0, endedAt: 1200,
  input: { query: 'solid createEffect runs twice strict mode' },
  output: {
    results: [
      { title: 'Effects and lifecycle | SolidJS', url: 'https://docs.solidjs.com/concepts/effects' },
      { title: 'Why does my effect run twice?', url: 'https://github.com/solidjs/solid/discussions/1401' },
    ],
  },
};
const THOUGHT: ActivityStep = { id: 'thought', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 };
const READ: ActivityStep = {
  id: 'read', kind: 'tool', status: 'done', toolName: 'read_file', toolKind: 'file-read', startedAt: 0, endedAt: 100,
  input: { path: 'src/app.ts' }, output: { bytes: 2140 },
};
const FAILED_READ: ActivityStep = {
  id: 'read', kind: 'tool', status: 'error', toolName: 'read_file', toolKind: 'file-read', startedAt: 0, endedAt: 100,
  input: { path: 'src/app.ts' }, errorText: "ENOENT: no such file or directory, open 'src/app.ts'",
};
const OK = [THOUGHT, SEARCH, READ];

const LONG: ActivityStep[] = Array.from({ length: 16 }, (_, i) => ({
  id: `l${i}`, kind: 'tool', status: 'done', toolName: i % 3 === 0 ? 'web_search' : 'read_file', toolKind: i % 3 === 0 ? 'search' : 'file-read',
  startedAt: 0, endedAt: 800 + i * 40, input: { n: i },
} as ActivityStep));

// ── Snippets: the markup each story renders ────────────────────────────────────────────

const IMPORT = `import { Activity, ActivityStepItem } from '@kitn.ai/ui/solid';\nimport type { ActivityStep } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const STEP_TS = `const steps: ActivityStep[] = [
  { id: 'thought', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 },
  {
    id: 'search', kind: 'tool', status: 'done', toolName: 'web_search', toolKind: 'search', startedAt: 0, endedAt: 1200,
    input: { query: 'solid createEffect runs twice strict mode' },
    output: { results: [{ title: 'Effects and lifecycle | SolidJS', url: 'https://docs.solidjs.com/concepts/effects' }] },
  },
  {
    id: 'read', kind: 'tool', status: 'done', toolName: 'read_file', toolKind: 'file-read', startedAt: 0, endedAt: 100,
    input: { path: 'src/app.ts' }, output: { bytes: 2140 },
  },
];`;

const clickStep = async (canvasElement: HTMLElement, name: RegExp) => {
  // The step's own trigger, not the summary line, whose text names the same steps.
  await waitFor(() => expect(canvasElement.querySelector('[data-kai-step-trigger]')).not.toBeNull());
  const step = [...canvasElement.querySelectorAll<HTMLButtonElement>('[data-kai-step-trigger]')].find((b) => name.test(b.textContent ?? ''));
  if (!step) throw new Error(`no step trigger matches ${name}`);
  await userEvent.click(step);
  await waitFor(() => expect(step).toHaveAttribute('aria-expanded', 'true'));
};

/** Closed by default: one line, the size and weight of the reasoning trigger, muted. */
export const Collapsed: Story = {
  args: { steps: OK },
  ...src(`${STEP_TS}\n\n<Activity steps={steps} />`),
};

/** While a step runs, the line shows it in the present tense and shimmers. */
export const Streaming: Story = {
  args: {
    streaming: true,
    steps: [THOUGHT, { id: 'live', kind: 'tool', status: 'running', toolName: 'web_search', toolKind: 'search', startedAt: 0 }],
  },
  ...src(`const steps: ActivityStep[] = [
  { id: 'thought', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 },
  { id: 'live', kind: 'tool', status: 'running', toolName: 'web_search', toolKind: 'search', startedAt: 0 },
];

<Activity steps={steps} streaming />`),
};

/** The timeline: a status glyph on a thin rail, the step's name and how long it took. */
export const Expanded: Story = {
  args: { steps: OK, defaultOpen: true },
  ...src(`${STEP_TS}\n\n<Activity steps={steps} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const line = await within(canvasElement).findByRole('button', { name: /Thought for 6s/ });
    await waitFor(() => expect(line).toHaveAttribute('aria-expanded', 'true'));
    expect(canvasElement.querySelectorAll('li[data-kai-step]')).toHaveLength(3);
  },
};

/** A step with arguments or a result opens to them, as JSON text in the kit's code block. */
export const StepExpanded: Story = {
  args: { steps: OK, defaultOpen: true },
  ...src(`${STEP_TS}\n\n<Activity steps={steps} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await clickStep(canvasElement, /Searched the web/);
    await within(canvasElement).findByText('Arguments');
    await within(canvasElement).findByText('Result');
  },
};

/** A failed step turns red and gives its reason under the step. The collapsed line says what failed. */
export const WithError: Story = {
  args: { steps: [THOUGHT, SEARCH, FAILED_READ], defaultOpen: true },
  ...src(`const steps: ActivityStep[] = [
  { id: 'thought', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 },
  {
    id: 'read', kind: 'tool', status: 'error', toolName: 'read_file', toolKind: 'file-read', startedAt: 0, endedAt: 100,
    input: { path: 'src/app.ts' }, errorText: "ENOENT: no such file or directory, open 'src/app.ts'",
  },
];

<Activity steps={steps} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await within(canvasElement).findByText(/ENOENT/);
  },
};

/** A tool call that never got a result, in a turn that is over. Amber and worded as "no result", so it is not mistaken for a failure or for finished work. */
export const Interrupted: Story = {
  args: {
    defaultOpen: true,
    steps: [
      THOUGHT,
      { id: 'run', kind: 'tool', status: 'interrupted', toolName: 'run_tests', toolKind: 'command', startedAt: 0, input: { command: 'pnpm test' } },
    ],
  },
  ...src(`const steps: ActivityStep[] = [
  { id: 'thought', kind: 'reasoning', status: 'done', startedAt: 0, endedAt: 6000 },
  { id: 'run', kind: 'tool', status: 'interrupted', toolName: 'run_tests', toolKind: 'command', startedAt: 0, input: { command: 'pnpm test' } },
];

<Activity steps={steps} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await within(canvasElement).findByText(/No result\. The run ended/);
  },
};

/** A long run scrolls inside the timeline instead of pushing the answer down the page. */
export const LongRun: Story = {
  args: { steps: LONG, defaultOpen: true },
  ...src(`const steps: ActivityStep[] = Array.from({ length: 16 }, (_, i) => ({
  id: \`step-\${i}\`, kind: 'tool', status: 'done', toolName: i % 3 === 0 ? 'web_search' : 'read_file',
  toolKind: i % 3 === 0 ? 'search' : 'file-read', startedAt: 0, endedAt: 800 + i * 40, input: { n: i },
}));

<Activity steps={steps} defaultOpen />`),
};

/** `detail="summary"` is the line and nothing else, for a compact thread. */
export const SummaryOnly: Story = {
  args: { steps: OK, detail: 'summary' },
  ...src(`${STEP_TS}\n\n<Activity steps={steps} detail="summary" />`),
};

/** Item mode: render the rows yourself. The line, the rail, the disclosure and the arrow keys stay built in. */
export const ComposedRows: Story = {
  args: { steps: undefined, summary: 'Checked the calendar · Booked the room', defaultOpen: true },
  render: (args: Parameters<NonNullable<Story['render']>>[0]) => (
    <Activity {...args}>
      <ActivityStepItem label="Checked the calendar" duration="0.4s" status="done">
        <p class="text-caption text-muted-foreground">Room 4B is free from 10:00 to 11:00.</p>
      </ActivityStepItem>
      <ActivityStepItem label="Booked the room" duration="0.9s" status="done" />
    </Activity>
  ),
  ...src(`<Activity summary="Checked the calendar · Booked the room" defaultOpen>
  <ActivityStepItem label="Checked the calendar" duration="0.4s" status="done">
    <p class="text-caption text-muted-foreground">Room 4B is free from 10:00 to 11:00.</p>
  </ActivityStepItem>
  <ActivityStepItem label="Booked the room" duration="0.9s" status="done" />
</Activity>`),
};

const HOSTILE = '<img src=x onerror="window.__PWNED__=1">';

/** Everything a step carries is model output. Markup in a label, a tool name, arguments, a result or reasoning stays visible text and never runs. */
export const HostileOutput: Story = {
  args: {
    defaultOpen: true,
    steps: [
      { id: 'r', kind: 'reasoning', status: 'done', text: `Reading ${HOSTILE} and [a link](javascript:alert(1))` },
      {
        id: 't', kind: 'tool', status: 'done', toolName: 'echo', toolKind: 'generic',
        label: HOSTILE, input: { html: '<script>window.__PWNED__=1</script>' }, output: { link: 'javascript:alert(1)' },
      },
    ],
  },
  ...src(`const steps: ActivityStep[] = [
  { id: 'r', kind: 'reasoning', status: 'done', text: 'Reading <img src=x onerror="alert(1)"> and [a link](javascript:alert(1))' },
  {
    id: 't', kind: 'tool', status: 'done', toolName: 'echo', toolKind: 'generic',
    label: '<img src=x onerror="alert(1)">', input: { html: '<script>alert(1)</script>' }, output: { link: 'javascript:alert(1)' },
  },
];

<Activity steps={steps} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const buttons = () => [...canvasElement.querySelectorAll<HTMLButtonElement>('[data-kai-step-trigger]')];
    await waitFor(() => expect(buttons().length).toBe(2));
    for (const b of buttons()) await userEvent.click(b);
    await within(canvasElement).findByText(/javascript:alert\(1\)/, { exact: false, selector: 'pre, pre *, .chat-markdown *, .chat-markdown' }).catch(() => undefined);
    expect(canvasElement.querySelector('img, script, iframe')).toBeNull();
    expect((window as unknown as Record<string, unknown>).__PWNED__).toBeUndefined();
    expect(canvasElement.textContent).toContain('<img src=x onerror=');
    expect(canvasElement.querySelector('a[href^="javascript"]')).toBeNull();
  },
};
