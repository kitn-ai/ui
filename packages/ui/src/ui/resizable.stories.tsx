import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle, Resizable } from './resizable';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Resizable',
  component: ResizablePanelGroup,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A draggable split layout: `ResizablePanelGroup` lays out `ResizablePanel` children along `orientation`, divided by a `ResizableHandle`. Pick its affordance with `handle`: `line` (default hairline), `grip` (dotted), or `none`.',
        'Give panels a `defaultSize` (percent) plus optional `minSize`/`maxSize`. The group needs a sized container.',
      ]),
    },
  },
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Axis the panels are laid out along.',
      table: { defaultValue: { summary: 'horizontal' } },
    },
    onPanelResize: {
      action: 'panelResize',
      description: 'On `ResizableHandle`, fires the clamped pixel delta while dragging (and `0` on a double-click reset).',
      table: { category: 'Events' },
    },
    onChange: {
      action: 'change',
      description: 'On the `Resizable` convenience, fires the current panel sizes (percent) on drag-end / keyboard resize / visibility change.',
      table: { category: 'Events' },
    },
  },
  args: {
    orientation: 'horizontal',
  },
  render: (args) => (
    <div class="h-48 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup {...args}>
        <ResizablePanel defaultSize={30} data-min-size="100" data-max-size="400">
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Sidebar</span>
          </div>
        </ResizablePanel>
        <ResizableHandle handle="grip" />
        <ResizablePanel>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Content</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
} satisfies Meta<typeof ResizablePanelGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: flip the orientation, then drag the handle. */
export const Playground: Story = {
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={30} data-min-size="100" data-max-size="400">
    Sidebar
  </ResizablePanel>
  <ResizableHandle handle="grip" />
  <ResizablePanel>Content</ResizablePanel>
</ResizablePanelGroup>`),
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={30} data-min-size="100" data-max-size="400">
    Sidebar
  </ResizablePanel>
  <ResizableHandle handle="grip" />
  <ResizablePanel>Content</ResizablePanel>
</ResizablePanelGroup>`),
};

/** Stacked top/bottom split (showcase). */
export const Vertical: Story = {
  render: () => (
    <div class="h-96 w-full max-w-md rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup orientation="vertical">
        <ResizablePanel defaultSize={40} data-min-size="60" data-max-size="300">
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Top</span>
          </div>
        </ResizablePanel>
        <ResizableHandle handle="grip" />
        <ResizablePanel>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Bottom</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
  ...src(`<ResizablePanelGroup orientation="vertical">
  <ResizablePanel defaultSize={40} data-min-size="60" data-max-size="300">
    Top
  </ResizablePanel>
  <ResizableHandle handle="grip" />
  <ResizablePanel>Bottom</ResizablePanel>
</ResizablePanelGroup>`),
};

/** Three panels with two handles (showcase). */
export const ThreePanels: Story = {
  name: 'Three Panels',
  render: () => (
    <div class="h-48 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={25} data-min-size="80" data-max-size="300">
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Left</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Center</span>
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={25} data-min-size="80" data-max-size="300">
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Right</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={25} data-min-size="80" data-max-size="300">Left</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel>Center</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={25} data-min-size="80" data-max-size="300">Right</ResizablePanel>
</ResizablePanelGroup>`),
};

/** `handle="none"` — an invisible divider (8px hit-area only) that still reports drag deltas via `onPanelResize` (showcase). */
export const NoHandle: Story = {
  name: 'Without Handle',
  render: () => (
    <div class="h-48 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize={40}>
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Panel A</span>
          </div>
        </ResizablePanel>
        <ResizableHandle handle="none" onPanelResize={fn()} />
        <ResizablePanel>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Panel B</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={40}>Panel A</ResizablePanel>
  <ResizableHandle handle="none" onPanelResize={(delta) => console.log(delta)} />
  <ResizablePanel>Panel B</ResizablePanel>
</ResizablePanelGroup>`),
};

/**
 * The three `handle` affordances side by side. `line` (the default) is a 1px
 * hairline that stays transparent at rest and tints on hover/drag; `grip` is the
 * dotted handle; `none` is an invisible 8px hit-area. Drag or hover each divider.
 */
export const HandleStyles: Story = {
  name: 'Handle Styles',
  render: () => {
    const row = (label: string, handle: 'line' | 'grip' | 'none') => (
      <div>
        <p class="mb-1 text-xs font-medium text-muted-foreground">
          handle="{handle}"{handle === 'line' ? ' (default)' : ''}
        </p>
        <div class="h-24 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel defaultSize={40} data-min-size="100" data-max-size="400">
              <div class="flex h-full items-center justify-center bg-muted/30 p-4">
                <span class="text-sm text-muted-foreground">{label}</span>
              </div>
            </ResizablePanel>
            <ResizableHandle handle={handle} />
            <ResizablePanel>
              <div class="flex h-full items-center justify-center p-4">
                <span class="text-sm text-muted-foreground">Content</span>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    );
    return (
      <div class="flex flex-col gap-4">
        {row('Line', 'line')}
        {row('Grip', 'grip')}
        {row('None', 'none')}
      </div>
    );
  },
  ...src(`{/* line is the default; pass handle to opt into grip/none */}
<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={40} data-min-size="100" data-max-size="400">Sidebar</ResizablePanel>
  <ResizableHandle handle="line" />
  <ResizablePanel>Content</ResizablePanel>
</ResizablePanelGroup>`),
};

/**
 * The `Resizable` convenience: pass `ResizablePanel` children and it
 * auto-inserts a handle between each visible pair. A `locked` panel makes its
 * neighbouring handle a static (non-draggable) divider; a `hidden` panel drops
 * its divider entirely.
 */
export const ConvenienceGroup: Story = {
  name: 'Resizable (convenience)',
  render: () => (
    <div class="h-48 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
      <Resizable orientation="horizontal" handle="grip" onChange={fn()}>
        <ResizablePanel defaultSize="240px" locked>
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Locked sidebar (240px)</span>
          </div>
        </ResizablePanel>
        <ResizablePanel>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Chat</span>
          </div>
        </ResizablePanel>
        <ResizablePanel defaultSize="30%" minSize="160px">
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">Preview</span>
          </div>
        </ResizablePanel>
      </Resizable>
    </div>
  ),
  ...src(`<Resizable orientation="horizontal" handle="grip" onChange={(sizes) => console.log(sizes)}>
  <ResizablePanel defaultSize="240px" locked>Locked sidebar</ResizablePanel>
  <ResizablePanel>Chat</ResizablePanel>
  <ResizablePanel defaultSize="30%" minSize="160px">Preview</ResizablePanel>
</Resizable>`),
};

/**
 * Min/max + keyboard: focus the handle (Tab) and use ←/→ to nudge, Home/End to
 * jump to the panel's min/max. Sizes accept px or %.
 */
export const MinMaxKeyboard: Story = {
  name: 'Min/Max + Keyboard',
  render: () => (
    <div class="h-48 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel defaultSize="30%" minSize="120px" maxSize="50%">
          <div class="flex h-full items-center justify-center bg-muted/30 p-4">
            <span class="text-sm text-muted-foreground">min 120px · max 50%</span>
          </div>
        </ResizablePanel>
        <ResizableHandle handle="grip" />
        <ResizablePanel minSize="160px">
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Content (min 160px)</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize="30%" minSize="120px" maxSize="50%">Sidebar</ResizablePanel>
  <ResizableHandle handle="grip" />
  <ResizablePanel minSize="160px">Content</ResizablePanel>
</ResizablePanelGroup>`),
};
