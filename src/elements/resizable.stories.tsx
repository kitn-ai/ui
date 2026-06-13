import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-resizable': JSX.HTMLAttributes<HTMLElement> & { orientation?: string };
      'kc-resizable-item': JSX.HTMLAttributes<HTMLElement> & {
        size?: string; min?: string; max?: string; locked?: boolean | string; hidden?: boolean | string;
      };
    }
  }
}

/** A labelled placeholder pane so the layout is visible in stories. */
function Pane(props: { label: string; tone?: 'muted' | 'plain' }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        padding: '16px',
        background: props.tone === 'plain' ? 'transparent' : 'var(--color-muted, #f4f4f5)',
        color: 'var(--color-muted-foreground, #71717a)',
        'font-size': '13px',
      }}
    >
      {props.label}
    </div>
  );
}

/** A bordered, sized frame the group fills. */
function Frame(props: { children: JSX.Element; tall?: boolean }) {
  return (
    <div
      style={{
        height: props.tall ? '384px' : '256px',
        width: '100%',
        'max-width': '768px',
        border: '1px solid var(--color-border, #e4e4e7)',
        'border-radius': '8px',
        overflow: 'hidden',
      }}
    >
      {props.children}
    </div>
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-resizable orientation="horizontal" style="display:block;height:400px">
  <kc-resizable-item size="25%" min="160px"> ...list... </kc-resizable-item>
  <kc-resizable-item> ...chat... </kc-resizable-item>
  <kc-resizable-item size="30%"> ...preview... </kc-resizable-item>
</kc-resizable>

<script type="module">
  import '@kitnai/chat/elements'; // registers the custom elements
  document.querySelector('kc-resizable')
    .addEventListener('change', (e) => console.log(e.detail.sizes));
</script>`;

const meta = {
  title: 'Web Components/kc-resizable',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-resizable'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-resizable', [
        '`<kc-resizable>` is the framework-agnostic **web component** for a composable, resizable multi-panel layout (up to **3** `<kc-resizable-item>` panels) with **auto-inserted draggable dividers** — isolated in **Shadow DOM**.',
        '**When to use:** to compose an app shell out of slotted regions without hand-wiring panels and handles — e.g. `list | chat | preview`. In SolidJS, use the `Resizable` convenience (UI/Resizable) directly.',
        "**How to use:** register once with `import '@kitnai/chat/elements'`, set `orientation` (`horizontal` row / `vertical` column), and put a `<kc-resizable-item>` per panel. Each item carries `size` (px or %, e.g. `\"280px\"` or `\"25%\"`), `min`/`max`, `locked` (fixed size + non-draggable neighbour), and `hidden` (drops the panel + its divider). Listen for the **`change`** event (`detail.sizes`, percent).",
        '**Placement:** the layout spine for compose-your-own-chat shells — sidebar + conversation, conversation + inspector, or a three-up list/chat/preview.',
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
  args: { orientation: 'horizontal' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Interactive playground — flip orientation, then drag the dividers. */
export const Playground: Story = {
  render: (args: { orientation?: string }) => (
    <Frame>
      <kc-resizable orientation={args.orientation ?? 'horizontal'}>
        <kc-resizable-item size="25%" min="120px"><Pane label="List" /></kc-resizable-item>
        <kc-resizable-item><Pane label="Chat" tone="plain" /></kc-resizable-item>
      </kc-resizable>
    </Frame>
  ),
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Two panels: a sized list beside a flexible chat. */
export const ListChat: Story = {
  name: 'Sidebar + chat',
  render: () => (
    <Frame>
      <kc-resizable orientation="horizontal">
        <kc-resizable-item size="28%" min="140px" max="50%"><Pane label="List" /></kc-resizable-item>
        <kc-resizable-item><Pane label="Chat" tone="plain" /></kc-resizable-item>
      </kc-resizable>
    </Frame>
  ),
};

/** Three panels, two draggable dividers. */
export const ListChatPreview: Story = {
  name: 'List + chat + preview',
  render: () => (
    <Frame>
      <kc-resizable orientation="horizontal">
        <kc-resizable-item size="22%" min="120px"><Pane label="List" /></kc-resizable-item>
        <kc-resizable-item><Pane label="Chat" tone="plain" /></kc-resizable-item>
        <kc-resizable-item size="30%" min="160px"><Pane label="Preview" /></kc-resizable-item>
      </kc-resizable>
    </Frame>
  ),
};

/** A locked, fixed-px sidebar — its divider is a static (non-draggable) separator. */
export const LockedSidebar: Story = {
  name: 'Locked sidebar',
  render: () => (
    <Frame>
      <kc-resizable orientation="horizontal">
        <kc-resizable-item size="240px" locked><Pane label="Locked sidebar (240px)" /></kc-resizable-item>
        <kc-resizable-item><Pane label="Chat" tone="plain" /></kc-resizable-item>
      </kc-resizable>
    </Frame>
  ),
};

/** Stacked top/bottom split. */
export const Vertical: Story = {
  name: 'Vertical split',
  render: () => (
    <Frame tall>
      <kc-resizable orientation="vertical">
        <kc-resizable-item size="40%" min="80px"><Pane label="Top" /></kc-resizable-item>
        <kc-resizable-item><Pane label="Bottom" tone="plain" /></kc-resizable-item>
      </kc-resizable>
    </Frame>
  ),
};

/** Toggle the preview panel — its divider drops and the rest reflow. */
export const HiddenToggle: Story = {
  name: 'Show / hide a panel',
  render: () => {
    const [showPreview, setShowPreview] = createSignal(true);
    let previewItem: HTMLElement | undefined;
    const toggle = () => {
      setShowPreview((v) => !v);
      // Drive the boolean attribute directly so the group's MutationObserver
      // re-lays out (Solid sets the `hidden` IDL property, which doesn't reflect
      // to the attribute on a custom element).
      if (previewItem) {
        if (showPreview()) previewItem.removeAttribute('hidden');
        else previewItem.setAttribute('hidden', '');
      }
    };
    return (
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <button
          type="button"
          onClick={toggle}
          style={{
            'align-self': 'flex-start',
            padding: '4px 12px',
            'font-size': '13px',
            border: '1px solid var(--color-border, #e4e4e7)',
            'border-radius': '6px',
            cursor: 'pointer',
          }}
        >
          {showPreview() ? 'Hide preview' : 'Show preview'}
        </button>
        <Frame>
          <kc-resizable orientation="horizontal">
            <kc-resizable-item size="24%" min="120px"><Pane label="List" /></kc-resizable-item>
            <kc-resizable-item><Pane label="Chat" tone="plain" /></kc-resizable-item>
            <kc-resizable-item ref={(e) => (previewItem = e as HTMLElement)} size="30%"><Pane label="Preview" /></kc-resizable-item>
          </kc-resizable>
        </Frame>
      </div>
    );
  },
};
