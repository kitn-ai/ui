import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Solid (Advanced)/Primitives/Collapsible',
  component: Collapsible,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A two-state disclosure that expands and collapses a region of content, animating height via a CSS `grid-template-rows` `0fr` → `1fr` transition (no JS measurement, no layout thrash). The trigger carries `aria-expanded`/`aria-controls` and the collapsed content is `inert`, so it is removed from tab order and the accessibility tree. Works controlled (`open` + `onOpenChange`) or uncontrolled (`defaultOpen`).',
        '**When to use:** to hide secondary detail behind a toggle — a reasoning/"chain of thought" panel, a tool-call payload, an expandable conversation group, an FAQ row.',
        '**How to use:** wrap `CollapsibleTrigger` and `CollapsibleContent` in a `Collapsible`. The trigger renders a `<button>` by default; pass `as` to render a custom element.',
      ]),
    },
  },
  render: () => <CollapsibleDemo defaultOpen />,
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

function CollapsibleDemo(props: { defaultOpen?: boolean }) {
  return (
    <Collapsible defaultOpen={props.defaultOpen} class="w-80 rounded-lg border border-border">
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
  ...src(`<Collapsible defaultOpen>
  <CollapsibleTrigger>Reasoning</CollapsibleTrigger>
  <CollapsibleContent>
    <p>First I parsed the request, then checked the available tools…</p>
  </CollapsibleContent>
</Collapsible>`),
};

/** Starts collapsed. */
export const InitiallyClosed: Story = {
  render: () => <CollapsibleDemo />,
  ...src(`<Collapsible>
  <CollapsibleTrigger>Reasoning</CollapsibleTrigger>
  <CollapsibleContent>…</CollapsibleContent>
</Collapsible>`),
};
