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
        'A **resizable split layout**: `ResizablePanelGroup` lays out `ResizablePanel` children along an axis, divided by a draggable `ResizableHandle`.',
        '**When to use:** to let users adjust the relative size of two or more regions — e.g. a collapsible sidebar next to the main chat, or a chat pane next to an inspector.',
        '**How to use:** wrap panels in `ResizablePanelGroup` and set `orientation` (`horizontal` row / `vertical` column). Give panels a `defaultSize` (percent) and optional `minSize`/`maxSize`; min/max are read from `data-min-size`/`data-max-size` attributes at drag time. Place a `ResizableHandle` (add `withHandle` for a visible grip) between panels. The group needs a sized container (height/width).',
        '**Placement:** app shells — sidebar + conversation, conversation + context/inspector panels, or stacked editor/preview regions.',
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
      description: 'On `ResizableHandle` — fires the clamped pixel delta while dragging (and `0` on a double-click reset).',
      table: { category: 'Events' },
    },
    onChange: {
      action: 'change',
      description: 'On the `Resizable` convenience — fires the current panel sizes (percent) on drag-end / keyboard resize / visibility change.',
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
        <ResizableHandle withHandle />
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

/** Interactive playground — flip the orientation, then drag the handle. */
export const Playground: Story = {
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={30} data-min-size="100" data-max-size="400">
    Sidebar
  </ResizablePanel>
  <ResizableHandle withHandle />
  <ResizablePanel>Content</ResizablePanel>
</ResizablePanelGroup>`),
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  ...src(`<ResizablePanelGroup orientation="horizontal">
  <ResizablePanel defaultSize={30} data-min-size="100" data-max-size="400">
    Sidebar
  </ResizablePanel>
  <ResizableHandle withHandle />
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
        <ResizableHandle withHandle />
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
  <ResizableHandle withHandle />
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

/** Handle without a visible grip; reports drag deltas via `onPanelResize` (showcase). */
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
        <ResizableHandle onPanelResize={fn()} />
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
  <ResizableHandle onPanelResize={(delta) => console.log(delta)} />
  <ResizablePanel>Panel B</ResizablePanel>
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
      <Resizable orientation="horizontal" withHandle onChange={fn()}>
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
  ...src(`<Resizable orientation="horizontal" withHandle onChange={(sizes) => console.log(sizes)}>
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
        <ResizableHandle withHandle />
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
  <ResizableHandle withHandle />
  <ResizablePanel minSize="160px">Content</ResizablePanel>
</ResizablePanelGroup>`),
};
