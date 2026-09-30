import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { For, Show, createSignal, type JSX } from 'solid-js';
import { ChevronDown } from 'lucide-solid';
import { DefaultPromptInput } from './default-input';
import { Button } from '../button/button';
import { cn } from '../../utils/cn';

// Content that grows INTO the prompt input's card. The card keeps the one surface, shadow and
// focus ring; the attached content sits in its top or bottom area over a hairline divider.
// With nothing attached the input is exactly the plain input: no divider, no padding, no
// extra height (a screenshot diff pins it, light and dark).

const meta = {
  title: 'Components/PromptInput/Attached content',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Two regions inside the prompt input\'s own card, `above` and `below`, each over a hairline divider. The card grows to hold whatever you attach (a plan, a question, a mode row) and keeps its single surface, shadow and focus ring, so focusing a control inside the attached content rings the whole card. A region grows in from nothing to its measured height, follows content that changes height while open, snaps under reduced motion, and takes no space and draws no divider while empty. On the `kai-prompt-input` element the same regions are the `above` and `below` slots.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const STEPS = [
  { label: 'Read the registry and the block layout', done: true },
  { label: 'Add registry-item.json to blocks/voice', done: true },
  { label: 'Teach the docs route to skip empty blocks', done: true },
  { label: 'Write the failing test first', done: false },
  { label: 'Make the build pass', done: false },
];

/** A plan summary that opens to every step: content whose height changes while attached. */
function Plan(props: { defaultOpen?: boolean }) {
  const [open, setOpen] = createSignal(!!props.defaultOpen);
  const done = () => STEPS.filter((s) => s.done).length;
  return (
    <div class="text-sm">
      <button
        type="button"
        class="text-foreground flex w-full items-center gap-2 rounded-md text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open()}
        onClick={() => setOpen(!open())}
      >
        <span class="min-w-0 flex-1 truncate">
          Plan · {done()} of {STEPS.length} done · {STEPS.find((s) => !s.done)?.label}
        </span>
        <ChevronDown class={cn('size-4 shrink-0 transition-transform', open() && 'rotate-180')} />
      </button>
      <Show when={open()}>
        <ul class="text-muted-foreground mt-2 flex flex-col gap-1.5">
          <For each={STEPS}>
            {(s) => <li class={cn(s.done && 'line-through')}>{s.label}</li>}
          </For>
        </ul>
      </Show>
    </div>
  );
}

function Pill(props: { children: JSX.Element }) {
  return (
    <button
      type="button"
      class="border-border bg-background text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {props.children}
    </button>
  );
}

const Frame = (props: { children: JSX.Element; width?: string }) => (
  <div style={{ 'max-width': props.width ?? '40rem' }}>{props.children}</div>
);

const IMPORT = `import { createSignal } from 'solid-js';
import { DefaultPromptInput, Button } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const base = {
  value: '',
  placeholder: 'Ask anything…',
  onValueChange: () => {},
  onSubmit: () => {},
  onSuggestionClick: () => {},
};

/** A plan attached above the input. The hairline divides it from the input row. */
export const WithContentAbove: Story = {
  name: 'With content above',
  render: () => (
    <Frame>
      <DefaultPromptInput {...base} above={<Plan />} />
    </Frame>
  ),
  ...src(`<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
  above={
    <div class="text-sm font-medium">Plan · 3 of 5 done · Write the failing test first</div>
  }
/>`),
};

/** A mode row attached below the input, under its own hairline. */
export const WithContentBelow: Story = {
  name: 'With content below',
  render: () => (
    <Frame>
      <DefaultPromptInput
        {...base}
        below={
          <div class="flex flex-wrap gap-2">
            <Pill>Local</Pill>
            <Pill>main</Pill>
            <Pill>Auto-accept edits</Pill>
          </div>
        }
      />
    </Frame>
  ),
  ...src(`<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
  below={
    <div class="flex gap-2">
      <button type="button" class="rounded-full border border-border px-3 py-1 text-xs">Local</button>
      <button type="button" class="rounded-full border border-border px-3 py-1 text-xs">main</button>
    </div>
  }
/>`),
};

/** Both at once. Tab order reads top to bottom: the plan, the input, then the mode row. */
export const AboveAndBelow: Story = {
  name: 'Above and below',
  render: () => (
    <Frame>
      <DefaultPromptInput
        {...base}
        above={<Plan />}
        below={<div class="flex gap-2"><Pill>Local</Pill><Pill>main</Pill></div>}
      />
    </Frame>
  ),
  ...src(`<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
  above={
    <div class="text-sm font-medium">Plan · 3 of 5 done · Write the failing test first</div>
  }
  below={
    <div class="flex gap-2">
      <button type="button" class="rounded-full border border-border px-3 py-1 text-xs">Local</button>
      <button type="button" class="rounded-full border border-border px-3 py-1 text-xs">main</button>
    </div>
  }
/>`),
};

/** Attach and detach with a button: the region grows in and out, and the card's ring follows. */
export const Toggle: Story = {
  render: () => {
    const [attached, setAttached] = createSignal(false);
    return (
      <Frame>
        <div class="mb-4">
          <Button variant="outline" size="sm" onClick={() => setAttached(!attached())}>
            {attached() ? 'Detach the plan' : 'Attach a plan'}
          </Button>
        </div>
        <DefaultPromptInput {...base} above={attached() ? <Plan /> : undefined} />
      </Frame>
    );
  },
  ...src(`const [attached, setAttached] = createSignal(false);

<Button onClick={() => setAttached(!attached())}>Attach a plan</Button>
<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
  above={
    attached()
      ? <div class="text-sm font-medium">Plan · 3 of 5 done · Write the failing test first</div>
      : undefined
  }
/>`),
};

/** Content that changes height while attached: open the plan and the card follows it. */
export const GrowingContent: Story = {
  name: 'Growing content',
  render: () => (
    <Frame>
      <DefaultPromptInput {...base} above={<Plan />} />
    </Frame>
  ),
  ...src(`{/* A summary that opens to its steps: attach content whose height changes and the
    region re-measures and animates to it. */}
<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
  above={
    <details>
      <summary class="text-sm font-medium">Plan · 3 of 5 done</summary>
      <ul class="mt-2 text-sm"><li>Write the failing test first</li><li>Make the build pass</li></ul>
    </details>
  }
/>`),
};

/** Already attached at first render: it appears in place, without sliding in on page load. */
export const AttachedAtFirstRender: Story = {
  name: 'Attached at first render',
  render: () => (
    <Frame>
      <DefaultPromptInput {...base} above={<Plan defaultOpen />} />
    </Frame>
  ),
  ...src(`<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
  above={
    <div class="text-sm font-medium">Plan · 3 of 5 done · Write the failing test first</div>
  }
/>`),
};

/** Nothing attached: the plain prompt input, pixel for pixel. */
export const NothingAttached: Story = {
  name: 'Nothing attached',
  render: () => (
    <Frame>
      <DefaultPromptInput {...base} />
    </Frame>
  ),
  ...src(`<DefaultPromptInput
  value=""
  onValueChange={() => {}}
  onSubmit={() => {}}
  onSuggestionClick={() => {}}
/>`),
};

/** A narrow column: the content wraps inside the card and the divider stays inset. */
export const Narrow: Story = {
  render: () => (
    <Frame width="17.5rem">
      <DefaultPromptInput {...base} above={<Plan defaultOpen />} below={<div class="flex flex-wrap gap-2"><Pill>Local</Pill><Pill>main</Pill></div>} />
    </Frame>
  ),
  ...src(`<div style={{ 'max-width': '17.5rem' }}>
  <DefaultPromptInput
    value=""
    onValueChange={() => {}}
    onSubmit={() => {}}
    onSuggestionClick={() => {}}
    above={
      <div class="text-sm font-medium">Plan · 3 of 5 done · Write the failing test first</div>
    }
    below={
      <div class="flex gap-2">
        <button type="button" class="rounded-full border border-border px-3 py-1 text-xs">Local</button>
        <button type="button" class="rounded-full border border-border px-3 py-1 text-xs">main</button>
      </div>
    }
  />
</div>`),
};
