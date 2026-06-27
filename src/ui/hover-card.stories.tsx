import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { HoverCard } from './hover-card';
import { Button } from './button';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A floating card shown on hover/focus of its `trigger`, with a safe bridge so it stays open as the pointer moves onto it. Use for non-essential previews; reach for `Dropdown` if it needs actions, `Tooltip` for a one-line label.',
        'Pass the trigger as `trigger` and the body as `children`; tune `openDelay` / `closeDelay` (ms).',
      ]),
    },
  },
  argTypes: {
    trigger: { control: false, description: 'The element that opens the card on hover/focus.' },
    children: { control: false, description: 'The card contents.' },
    openDelay: { control: 'number', description: 'Delay (ms) before the card opens. Default 0.' },
    closeDelay: { control: 'number', description: 'Delay (ms) before the card closes after the pointer leaves. Default 300.' },
    class: { control: 'text', description: 'Extra classes applied to the card body.' },
  },
  args: {
    trigger: <Button variant="outline">@ada</Button>,
    children: (
      <div class="flex gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">AL</div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-foreground">Ada Lovelace</p>
          <p class="text-xs text-muted-foreground">Wrote the first algorithm intended for a machine. Joined in 1843.</p>
        </div>
      </div>
    ),
  },
  render: (args) => <HoverCard {...args} />,
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { HoverCard } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Hover (or focus) the trigger to reveal a profile preview card. */
export const Playground: Story = {
  ...src(`<HoverCard trigger={<Button variant="outline">@ada</Button>}>
  <div class="flex gap-3">
    <div class="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
      AL
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium">Ada Lovelace</p>
      <p class="text-xs text-muted-foreground">Wrote the first algorithm for a machine.</p>
    </div>
  </div>
</HoverCard>`),
};

/** A link-preview card, the way it might appear inline in an assistant message. */
export const LinkPreview: Story = {
  render: () => (
    <p class="max-w-md text-sm text-foreground">
      See the{' '}
      <HoverCard
        trigger={<a href="#" class="font-medium text-primary underline underline-offset-2">MDN reference</a>}
      >
        <div class="space-y-1">
          <p class="text-sm font-medium text-foreground">Custom elements, MDN</p>
          <p class="text-xs text-muted-foreground">developer.mozilla.org</p>
          <p class="text-xs text-muted-foreground">Define your own HTML elements with the CustomElementRegistry.</p>
        </div>
      </HoverCard>{' '}
      for the full custom-elements API.
    </p>
  ),
  ...src(`<HoverCard trigger={<a href="https://developer.mozilla.org/...">MDN reference</a>}>
  <div class="space-y-1">
    <p class="text-sm font-medium">Custom elements, MDN</p>
    <p class="text-xs text-muted-foreground">developer.mozilla.org</p>
    <p class="text-xs text-muted-foreground">Define your own HTML elements with the CustomElementRegistry.</p>
  </div>
</HoverCard>`),
};
