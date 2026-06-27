import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A disclosure that expands/collapses `CollapsibleContent` from a `CollapsibleTrigger`, with the right `aria-expanded` wiring and `inert` collapsed content. Controlled (`open` + `onOpenChange`) or uncontrolled (`defaultOpen`).',
      ]),
    },
  },
  argTypes: {
    onOpenChange: {
      action: 'openChange',
      description: 'Fires with the next open state whenever the disclosure expands or collapses.',
      table: { category: 'Events' },
    },
  },
  args: {
    onOpenChange: fn(),
  },
  render: (args) => <CollapsibleDemo defaultOpen onOpenChange={args.onOpenChange} />,
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

function CollapsibleDemo(props: { defaultOpen?: boolean; onOpenChange?: (open: boolean) => void }) {
  return (
    <Collapsible defaultOpen={props.defaultOpen} onOpenChange={props.onOpenChange} class="w-80 rounded-lg border border-border">
      <CollapsibleTrigger class="group flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-foreground">
        <span>Reasoning</span>
        <svg
          class="size-4 text-muted-foreground transition-transform duration-200 group-data-[expanded]:rotate-180"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <p class="px-3 pb-3 text-sm text-muted-foreground">
          First I parsed the request, then checked the available tools, and finally
          composed the answer. This panel is removed from the tab order while collapsed.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Toggle the trigger to expand/collapse. The chevron rotates via the `data-expanded` attribute. */
export const Playground: Story = {
  ...src(`<Collapsible defaultOpen onOpenChange={(open) => console.log('expanded:', open)}>
  <CollapsibleTrigger>Reasoning</CollapsibleTrigger>
  <CollapsibleContent>
    <p>First I parsed the request, then checked the available tools…</p>
  </CollapsibleContent>
</Collapsible>`),
};

/** Starts collapsed. */
export const InitiallyClosed: Story = {
  render: (args: { onOpenChange?: (open: boolean) => void }) => <CollapsibleDemo onOpenChange={args.onOpenChange} />,
  ...src(`<Collapsible onOpenChange={(open) => console.log(open)}>
  <CollapsibleTrigger>Reasoning</CollapsibleTrigger>
  <CollapsibleContent>…</CollapsibleContent>
</Collapsible>`),
};
