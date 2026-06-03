import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from './resizable';

const meta: Meta = {
  title: 'UI/Resizable',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

export const Horizontal: Story = {
  render: () => (
    <div class="h-48 w-full max-w-2xl rounded-lg border border-border overflow-hidden">
      <ResizablePanelGroup orientation="horizontal">
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
};

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
};

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
};

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
        <ResizableHandle />
        <ResizablePanel>
          <div class="flex h-full items-center justify-center p-4">
            <span class="text-sm text-muted-foreground">Panel B</span>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  ),
};
