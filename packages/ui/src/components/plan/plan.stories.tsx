import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn, within, expect, userEvent, waitFor } from 'storybook/test';
import { createSignal } from 'solid-js';
import { Plan, PlanItemRow, type PlanProps } from './plan';
import { DefaultPromptInput } from '../prompt/default-input';
import { ChatApp } from '../chat/chat-app';
import type { PlanItem } from '../../primitives/plan';
import type { ChatMessage } from '../../web-components/chat/chat-types';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Plan',
  component: Plan,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        "The agent's checklist while it works: one line (the count, then the running item) that opens to every item over a thin progress bar that turns green when the plan is done.",
        'It has no surface of its own: no fill, border or shadow. Put it in the prompt input\'s `above` region, where the card around it is the surface (the chat element does this for you from the latest `kai_plan` tool call). Give it `items` for the preset, or put `PlanItemRow`s inside to compose the list. Every label is model output and is rendered as text.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    items: { control: 'object', description: 'The plan, as `planFromMessages(messages)` returns it. In item mode it still feeds the summary line and the bar.' },
    label: { control: 'text', description: 'The header while open. Default `Plan`.' },
    open: { control: 'boolean', description: 'Controlled open state. Omit for uncontrolled.' },
    defaultOpen: { control: 'boolean', description: 'Initial open state when uncontrolled.' },
    onOpenChange: { action: 'openChange', description: 'The plan expanded or collapsed.', table: { category: 'Events' } },
    children: { control: false, description: 'Item mode: `PlanItemRow`s.' },
  },
  args: { onOpenChange: fn() },
  render: (args) => (
    <div class="max-w-xl">
      <Plan {...args} />
    </div>
  ),
} satisfies Meta<typeof Plan>;

export default meta;
type Story = StoryObj<typeof meta>;

const LABELS = ['Read the brief', 'Draft the outline', 'Write the introduction', 'Write the body', 'Review and tighten'];
const plan = (done: number, running: boolean): PlanItem[] =>
  LABELS.map((label, i) => ({
    id: `s${i}`,
    label,
    status: i < done ? 'completed' : i === done && running ? 'in_progress' : 'pending',
  }));
const PENDING = plan(0, false);
const RUNNING = plan(2, true);
const DONE = plan(LABELS.length, false);

const IMPORT = `import { Plan, PlanItemRow, DefaultPromptInput, ChatApp } from '@kitn.ai/ui/solid';\nimport type { PlanItem } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});
const ITEMS_TS = `const items: PlanItem[] = [
  { id: 's0', label: 'Read the brief', status: 'completed' },
  { id: 's1', label: 'Draft the outline', status: 'completed' },
  { id: 's2', label: 'Write the introduction', status: 'in_progress' },
  { id: 's3', label: 'Write the body', status: 'pending' },
  { id: 's4', label: 'Review and tighten', status: 'pending' },
];`;

/** Closed: the count and the running item, which shimmers. The default. */
export const Collapsed: Story = {
  args: { items: RUNNING },
  ...src(`${ITEMS_TS}\n\n<Plan items={items} />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole('button')).toHaveTextContent('2 of 5 done · Write the introduction');
    await expect(c.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  },
};

/** Open: finished items struck through with a check, the running one with a spinner, pending ones muted. */
export const Expanded: Story = {
  args: { items: RUNNING, defaultOpen: true },
  ...src(`${ITEMS_TS}\n\n<Plan items={items} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole('listitem')).toHaveLength(5);
    await expect(c.getAllByRole('img', { name: 'completed' })).toHaveLength(2);
    await expect(c.getByRole('img', { name: 'in progress' })).toBeVisible();
    await expect(c.getAllByRole('img', { name: 'pending' })).toHaveLength(2);
  },
};

/** Click or press Enter or Space on the line to open and close it. */
export const Toggle: Story = {
  args: { items: RUNNING },
  ...src(`${ITEMS_TS}\n\n<Plan items={items} />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const c = within(canvasElement);
    const b = c.getByRole('button');
    await userEvent.click(b);
    await waitFor(() => expect(b).toHaveAttribute('aria-expanded', 'true'));
    b.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(b).toHaveAttribute('aria-expanded', 'false'));
    await userEvent.keyboard(' ');
    await waitFor(() => expect(b).toHaveAttribute('aria-expanded', 'true'));
  },
};

/** Nothing started: every item pending, the bar empty. */
export const NotStarted: Story = {
  args: { items: PENDING, defaultOpen: true },
  ...src(`<Plan items={items} defaultOpen />`),
};

/** Every item finished: the check replaces the spinner and the bar fills green. */
export const Finished: Story = {
  args: { items: DONE },
  ...src(`${ITEMS_TS}\n\n<Plan items={items} />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(within(canvasElement).getByRole('button')).toHaveTextContent('5 of 5 done');
  },
};

/** Item mode: your own rows inside, from the same `PlanItemRow` the preset uses. `items` still feeds the summary and the bar. */
export const Composed: Story = {
  args: { items: RUNNING, defaultOpen: true },
  render: (args: PlanProps) => (
    <div class="max-w-xl">
      <Plan {...args}>
        {RUNNING.map((i) => <PlanItemRow label={i.label} status={i.status} />)}
      </Plan>
    </div>
  ),
  ...src(`${ITEMS_TS}\n\n<Plan items={items} defaultOpen>
  {items.map((i) => <PlanItemRow label={i.label} status={i.status} />)}
</Plan>`),
};

/** Labels are whatever the model wrote. They are text, never markup. */
export const HostileLabels: Story = {
  args: {
    defaultOpen: true,
    items: [
      { id: 'a', label: '<img src=x onerror="alert(1)">', status: 'completed' },
      { id: 'b', label: '[click me](javascript:alert(1))', status: 'in_progress' },
      { id: 'c', label: '<script>alert(1)</script>', status: 'pending' },
    ],
  },
  ...src(`<Plan items={itemsFromTheModel} defaultOpen />`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await expect(canvasElement.querySelector('img, script, a')).toBeNull();
    await expect(within(canvasElement).getByText('<script>alert(1)</script>')).toBeVisible();
  },
};

// ── Where it lives: the prompt input's card ──────────────────────────────────────────

const Input = (props: { items: PlanItem[]; defaultOpen?: boolean }) => {
  const [value, setValue] = createSignal('');
  return (
    <div class="mx-auto max-w-xl">
      <DefaultPromptInput
        value={value()}
        placeholder="Steer the agent or add a step"
        loading
        attach={false}
        above={<Plan items={props.items} defaultOpen={props.defaultOpen} />}
        onValueChange={setValue}
        onSubmit={() => {}}
        onSuggestionClick={setValue}
      />
    </div>
  );
};

/** Inside the prompt input's `above` region: the card is the surface, a hairline divides the plan from the input. */
export const InThePromptInput: Story = {
  render: () => <Input items={RUNNING} defaultOpen />,
  ...src(`<DefaultPromptInput
  value={value()}
  placeholder="Steer the agent or add a step"
  loading
  above={<Plan items={items} defaultOpen />}
  onValueChange={setValue}
  onSubmit={send}
  onSuggestionClick={setValue}
/>`),
};

/** The same region closed: the plan costs one line of height above the input. */
export const InThePromptInputCollapsed: Story = {
  render: () => <Input items={RUNNING} />,
  ...src(`<DefaultPromptInput value={value()} loading above={<Plan items={items} />} onValueChange={setValue} onSubmit={send} onSuggestionClick={setValue} />`),
};

// ── In the chat: the latest kai_plan call, derived from the thread ───────────────────

const planCall = (n: number, items: PlanItem[]): ChatMessage => ({
  id: `plan-${n}`,
  role: 'assistant',
  parts: [
    { type: 'text', text: n === 1 ? "Here's my plan." : `Step ${n - 1} is done.` },
    { type: 'tool', tool: { type: 'kai_plan', state: 'output-available', toolCallId: `call-${n}`, input: { items } as unknown as Record<string, unknown>, output: { ok: true } } },
  ],
});
const USER: ChatMessage = { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Write the launch post.' }] };
const STEPS = [plan(0, true), plan(1, true), plan(2, true), plan(3, true), plan(4, true), DONE];

function ChatWithPlan() {
  const [messages, setMessages] = createSignal<ChatMessage[]>([USER, planCall(1, STEPS[0]!)]);
  const advance = () =>
    setMessages((cur) => {
      const n = cur.filter((m) => m.id.startsWith('plan-')).length;
      return n >= STEPS.length ? cur : [...cur, planCall(n + 1, STEPS[n]!)];
    });
  return (
    <div class="flex flex-col gap-3">
      <button
        type="button"
        data-testid="advance"
        class="w-fit cursor-pointer rounded-md border border-border px-3 py-1.5 text-meta hover:bg-muted/60"
        onClick={advance}
      >
        The agent sends the next plan
      </button>
      <div class="h-[560px] w-[440px] overflow-hidden rounded-2xl border border-border">
        <ChatApp messages={messages()} loading onSubmit={() => {}} />
      </div>
    </div>
  );
}

/** The chat shows the latest valid `kai_plan` call above the composer, and it updates as later calls arrive. Each click adds a message holding the next whole plan. */
export const InTheChat: Story = {
  render: () => <ChatWithPlan />,
  ...src(`<ChatApp messages={messages()} loading onSubmit={send} />
// No wiring: a \`kai_plan\` tool part in \`messages\` is the plan. Answer the call with
// applyToolOutput(stream, call.id, { ok: true }). \`plan="off"\` hides it.`),
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const plans = () => canvasElement.querySelector('[part="attachment-above"] [data-kai-plan] > button');
    await waitFor(() => expect(plans()).toHaveTextContent('0 of 5 done · Read the brief'));
    await userEvent.click(within(canvasElement).getByTestId('advance'));
    await waitFor(() => expect(plans()).toHaveTextContent('1 of 5 done · Draft the outline'));
  },
};
