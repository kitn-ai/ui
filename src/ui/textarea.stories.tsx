import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import type { JSX } from 'solid-js';
import { fn } from 'storybook/test';
import { Textarea, type TextareaProps } from './textarea';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A single-line-by-default textarea that auto-grows with its content up to an optional `maxHeight`, after which it scrolls. It is **transparent and borderless by design** — it is meant to drop into a composed input frame that owns the visual boundary and focus ring (the demos below wrap it exactly the way `PromptInput` / `<kai-prompt-input>` does, with `focus-within` on the frame). This is the editable surface behind `PromptInput`.',
        '**When to use:** free-text entry that may span multiple lines — a chat composer, a comment box, an editable note.',
        '**How to use:** drop it inside a framed container and use it like a native `<textarea>` (`value`, `placeholder`, `onInput`, …). Auto-resize is on by default; set `maxHeight` (px) to cap growth, or `autoResize={false}` for a fixed-height field.',
      ]),
    },
  },
  argTypes: {
    placeholder: { control: 'text', description: 'Placeholder text.' },
    maxHeight: { control: 'number', description: 'Max height (px) before the field scrolls instead of growing.' },
    autoResize: { control: 'boolean', description: 'Grow with content. Default true.' },
    class: { control: 'text', description: 'Extra classes.' },
    onInput: {
      action: 'input',
      description: 'Fires on every keystroke — read `event.currentTarget.value`.',
      table: { category: 'Events' },
    },
    onChange: {
      action: 'change',
      description: 'Fires on blur/commit, like a native textarea.',
      table: { category: 'Events' },
    },
  },
  args: {
    placeholder: 'Ask anything… (Shift+Enter for a newline)',
    maxHeight: 200,
    onInput: fn(),
    onChange: fn(),
  },
  render: (args) => (
    <Frame>
      <Textarea {...args} class="focus-visible:ring-0" />
    </Frame>
  ),
} satisfies Meta<typeof Textarea>;

/**
 * The composed input frame, mirroring how `PromptInput` wraps the textarea: the
 * FRAME owns the boundary + focus ring (`focus-within`), and the transparent
 * textarea inside has its own ring neutralized so there's no nested box.
 */
function Frame(props: { children: JSX.Element }) {
  return (
    <div class="w-96 cursor-text rounded-xl border border-border bg-muted/40 p-3 shadow-xs transition-shadow focus-within:border-ring focus-within:ring-2 focus-within:ring-ring">
      {props.children}
    </div>
  );
}

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Textarea } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Type several lines — the field grows until `maxHeight`, then scrolls. Focus the field: the ring is on the frame, not a nested box. */
export const Playground: Story = {
  ...src(`{/* The frame owns the focus ring; the textarea's own ring is neutralized. */}
<div class="cursor-text rounded-xl border bg-muted/40 p-3 focus-within:ring-2 focus-within:ring-ring">
  <Textarea
    placeholder="Ask anything…"
    maxHeight={200}
    class="focus-visible:ring-0"
    onInput={(e) => setValue(e.currentTarget.value)}
  />
</div>`),
};

/** A fixed-height field (auto-resize disabled). */
export const FixedHeight: Story = {
  render: (args: TextareaProps) => (
    <Frame>
      <Textarea
        autoResize={false}
        rows={4}
        placeholder="Fixed at 4 rows…"
        class="focus-visible:ring-0"
        onInput={args.onInput}
        onChange={args.onChange}
      />
    </Frame>
  ),
  ...src(`<div class="cursor-text rounded-xl border bg-muted/40 p-3 focus-within:ring-2 focus-within:ring-ring">
  <Textarea autoResize={false} rows={4} placeholder="Fixed at 4 rows…" class="focus-visible:ring-0" />
</div>`),
};
