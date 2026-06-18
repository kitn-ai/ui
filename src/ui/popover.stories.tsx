import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal, Show, For } from 'solid-js';
import { Popover, type PopoverProps } from './popover';
import { Switch } from './switch';
import { Button } from './button';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Solid (Advanced)/Primitives/Popover',
  component: Popover,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A **popover**: a trigger that toggles a floating panel of arbitrary content. Unlike `Dropdown` (a `role="menu"` with roving focus), the panel is a `role="dialog"` region, so it holds anything — model rows, toggles, nested groups.',
        '**When to use:** a "button + card" affordance — a header model menu, a settings popover, an account dropdown with mixed controls. For a simple list of commands, use `Dropdown` instead.',
        '**How to use:** pass the control as `trigger` and the panel as `children`. Clicking the trigger toggles; Escape or an outside click closes (clicks inside do not). Uncontrolled by default; pass `open` + `onOpenChange` to control it.',
        '**Placement:** chat headers, toolbars, and anywhere a compact control should reveal a richer card.',
      ]),
    },
  },
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end', 'left', 'right'],
      description: 'Floating placement relative to the trigger.',
      table: { defaultValue: { summary: 'bottom-start' } },
    },
    gutter: { control: 'number', description: 'Gap in px between trigger and panel.', table: { defaultValue: { summary: '6' } } },
    open: { control: 'boolean', description: 'Controlled open state. Omit for click-to-toggle.' },
  },
  args: { placement: 'bottom-start', onOpenChange: fn() },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

const LEGACY = ['GPT-4o', 'GPT-4.1', 'GPT-4o mini'];
const row = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted';

/** A model menu rebuilt from the primitive — flagship row, an expandable group,
 *  and a Switch — the kind of card a plain menu can't hold. */
export const ModelMenu: Story = {
  render: (args: Partial<PopoverProps>) => {
    const [legacyOpen, setLegacyOpen] = createSignal(false);
    return (
      <Popover {...args} trigger={<Button variant="ghost" size="sm">GPT-5.5 ▾</Button>}>
        <div style={{ width: '15rem' }}>
          <button type="button" class={row}>
            <span style={{ 'font-weight': 600 }}>GPT-5.5</span>
            <span class="text-caption text-muted-foreground">Flagship</span>
          </button>
          <button type="button" class={row} aria-expanded={legacyOpen()} onClick={() => setLegacyOpen(!legacyOpen())}>
            Legacy models {legacyOpen() ? '▴' : '▾'}
          </button>
          <Show when={legacyOpen()}>
            <For each={LEGACY}>{(m) => <button type="button" class={row} style={{ 'padding-left': '1.75rem' }}>{m}</button>}</For>
          </Show>
          <div style={{ height: '1px', margin: '4px 0', background: 'var(--color-border)' }} />
          <div class={row} style={{ 'justify-content': 'space-between' }}>
            <span>Temporary chat</span>
            <Switch label="Temporary chat" />
          </div>
        </div>
      </Popover>
    );
  },
};

/** Minimal — a trigger and a small card. */
export const Basic: Story = {
  render: (args: Partial<PopoverProps>) => (
    <Popover {...args} trigger={<Button size="sm">Open</Button>}>
      <div style={{ width: '12rem', padding: '0.5rem' }} class="text-sm text-foreground">
        Any content goes here — this is a <code>role="dialog"</code> panel.
      </div>
    </Popover>
  ),
};
