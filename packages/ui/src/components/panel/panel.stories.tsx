import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { X, ArrowLeft } from 'lucide-solid';
import { Panel, PanelHeader, PanelBody, PanelFooter } from './panel';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';

// The widget panel chrome as public parts. Stub data: these stories iterate the LOOK
// of the chrome, not a real message flow.
const meta = {
  title: 'Components/Panel',
  component: Panel,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    // Painted from kit tokens, so a `--kai-color-*` override retints the chrome and the web components
    // inside it. Back and close are slotted content in the header, never props.
    docs: {
      description: componentDescription([
        'The frame an app view sits in.',
      ]),
    },
  },
  argTypes: {
    frame: {
      control: 'boolean',
      description: 'Standalone widget-box chrome (border, radius, shadow). Off, the panel inherits its container radius, the inside-a-dock posture.',
    },
  },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

// Not yet part of the public export surface (blocks-and-parts phase 1) --
// this mirrors the file's own relative import rather than a package path.
const IMPORT = `import { Panel, PanelHeader, PanelBody, PanelFooter } from './panel';
import { Button } from '@kitn.ai/ui/solid';
import { X, ArrowLeft } from 'lucide-solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Shared stub body: token-painted placeholder content standing in for a
 *  home screen / thread view. */
function StubBody() {
  return (
    <div class="flex flex-1 flex-col gap-3 overflow-y-auto p-5">
      <div class="flex flex-col gap-1">
        <h2 class="m-0 text-xl font-semibold">Hi there</h2>
        <p class="m-0 text-sm text-muted-foreground">How can we help today?</p>
      </div>
      <div class="rounded-xl border border-border p-3">
        <div class="text-sm font-medium">Recent conversation</div>
        <div class="mt-1 text-sm text-muted-foreground">Where is my order?</div>
      </div>
      <Button class="w-full">Send us a message</Button>
    </div>
  );
}

function CloseButton() {
  return (
    <Button variant="ghost" size="icon-sm" aria-label="Close">
      <X size={24} aria-hidden="true" />
    </Button>
  );
}

/**
 * The widget box, standalone (`frame`): header with title and close, stub
 * body, footer slot in use. This is the P-1 acceptance "level" header
 * variant: title + close, no back arrow.
 */
export const WidgetBox: Story = {
  args: { frame: true },
  render: (args: { frame?: boolean }) => (
    <div style={{ width: '380px', height: '560px' }}>
      <Panel frame={args.frame}>
        <PanelHeader end={<CloseButton />}>Aurora Support</PanelHeader>
        <PanelBody>
          <StubBody />
        </PanelBody>
        <PanelFooter>
          <div class="border-t border-border px-4 py-2 text-center text-xs text-muted-foreground">
            Powered by Aurora
          </div>
        </PanelFooter>
      </Panel>
    </div>
  ),
  ...src(`<Panel frame>
  <PanelHeader end={<Button variant="ghost" size="icon-sm" aria-label="Close"><X size={24} aria-hidden="true" /></Button>}>Aurora Support</PanelHeader>
  <PanelBody>...</PanelBody>
  <PanelFooter>Powered by Aurora</PanelFooter>
</Panel>`),
};

/**
 * The P-1 acceptance "drilled" header variant: back arrow (leading, slotted
 * content) + title + close. What a drilled-into chat shows while the tab bar
 * is hidden (rulings P-1/P-3).
 */
export const DrilledHeader: Story = {
  args: { frame: true },
  render: (args: { frame?: boolean }) => (
    <div style={{ width: '380px', height: '560px' }}>
      <Panel frame={args.frame}>
        <PanelHeader
          start={
            <Button variant="ghost" size="icon-sm" aria-label="Back">
              <ArrowLeft size={24} aria-hidden="true" />
            </Button>
          }
          end={<CloseButton />}
        >
          Aurora Support
        </PanelHeader>
        <PanelBody>
          <div class="flex flex-1 items-center justify-center p-5 text-sm text-muted-foreground">
            Thread view goes here
          </div>
        </PanelBody>
      </Panel>
    </div>
  ),
  ...src(`<Panel frame>
  <PanelHeader start={<Button variant="ghost" size="icon-sm" aria-label="Back"><ArrowLeft size={24} aria-hidden="true" /></Button>} end={<Button variant="ghost" size="icon-sm" aria-label="Close"><X size={24} aria-hidden="true" /></Button>}>Aurora Support</PanelHeader>
  <PanelBody>Thread view goes here</PanelBody>
</Panel>`),
};

/**
 * Frameless (the default posture): the panel inherits its container's
 * radius and clips to it, exactly the shape the facade has inside
 * the dock element's already-framed floating panel. The wrapper here stands in
 * for the dock: it owns border, radius and shadow.
 */
export const FramelessInDock: Story = {
  render: () => (
    <div
      class="border border-border shadow-xl"
      style={{ width: '380px', height: '560px', 'border-radius': '16px' }}
    >
      <Panel>
        <PanelHeader end={<CloseButton />}>Aurora Support</PanelHeader>
        <PanelBody>
          <StubBody />
        </PanelBody>
      </Panel>
    </div>
  ),
  ...src(`{/* the wrapper owns border, radius, and shadow -- Panel just clips to it */}
<div class="rounded-2xl border border-border shadow-xl">
  <Panel>
    <PanelHeader end={<Button variant="ghost" size="icon-sm" aria-label="Close"><X size={24} aria-hidden="true" /></Button>}>Aurora Support</PanelHeader>
    <PanelBody>...</PanelBody>
  </Panel>
</div>`),
};

// The accent pair is measured, not decorative: this panel ships a copy-pasteable recipe, so
// the pair it demonstrates has to be one a consumer can adopt. `oklch(0.62 0.25 330)`
// (#d231cb) against the near-white foreground declared beside it is 3.99:1, under the
// 4.5:1 AA floor for normal text. Same hue and chroma at `oklch(0.58 0.25 330)` (#c41cbe)
// measures 4.73:1, and L=0.59 (4.52:1) is the lightest that clears at all, so do not nudge
// this back up.
// For a light-DOM subtree the knob is the `--color-*` value itself, scoped to the subtree;
// the `--kai-color-*` spelling re-resolves inside the shadow roots of the `kai-*` facades.
/** An accent override scoped to a subtree, so the panel surface stays neutral. */
export const AccentOverride: Story = {
  args: { frame: true },
  render: (args: { frame?: boolean }) => (
    <div style={{ width: '380px', height: '560px', '--color-primary': 'oklch(0.58 0.25 330)', '--color-primary-foreground': 'oklch(0.985 0 0)' }}>
      <Panel frame={args.frame}>
        <PanelHeader end={<CloseButton />}>Aurora Support</PanelHeader>
        <PanelBody>
          <StubBody />
        </PanelBody>
      </Panel>
    </div>
  ),
  ...src(`<div style={{ '--color-primary': 'oklch(0.58 0.25 330)', '--color-primary-foreground': 'oklch(0.985 0 0)' }}>
  <Panel frame>
    <PanelHeader end={<Button variant="ghost" size="icon-sm" aria-label="Close"><X size={24} aria-hidden="true" /></Button>}>Aurora Support</PanelHeader>
    <PanelBody>...</PanelBody>
  </Panel>
</div>`),
};
