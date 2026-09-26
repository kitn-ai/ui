import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { HoverCard } from './hover-card';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/HoverCard',
  component: HoverCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    // A safe bridge keeps it open as the pointer travels onto the card. Reach for `Dropdown`
    // when the floating surface carries actions, and `Tooltip` for a one-line label.
    docs: {
      description: componentDescription([
        'A floating card that opens on hover or focus of the element it wraps.',
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
  render: (args) => (
    <HoverCard
      trigger={<Button variant="outline">@ada</Button>}
      openDelay={args.openDelay}
      closeDelay={args.closeDelay}
      class={args.class}
    >
      <div class="flex gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">AL</div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-foreground">Demo User</p>
          <p class="text-xs text-muted-foreground">Wrote the first algorithm intended for a machine. Joined in 1843.</p>
        </div>
      </div>
    </HoverCard>
  ),
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { HoverCard, Button } from '@kitn.ai/ui';`;
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
      <p class="text-sm font-medium">Demo User</p>
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
