import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import { Resizable, ResizablePanel } from '../ui/resizable';
import type { ArtifactFile } from '../components/artifact';
import { Artifact } from '../components/artifact';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-resizable': JSX.HTMLAttributes<HTMLElement> & { orientation?: string };
      'kc-resizable-item': JSX.HTMLAttributes<HTMLElement> & {
        size?: string; min?: string; max?: string; locked?: boolean | string; hidden?: boolean | string;
      };
      // `kc-artifact` JSX type is augmented (with the full attr set) in
      // artifact.stories.tsx — declaring it again here with a different shape
      // would trip TS2717 (module-augmentation merges must match). Reuse that one.
    }
  }
}

// Fixture base URL (served by Storybook staticDirs from examples/artifact-fixtures).
const BASE = new URL('artifact-fixtures', document.baseURI).href;

const ARTIFACT_FILES: ArtifactFile[] = [
  { path: 'index.html', url: `${BASE}/index.html`, type: 'html', language: 'html',
    code: `<!DOCTYPE html><html lang="en"><head><title>Preview</title></head><body><h1>Starboard</h1></body></html>` },
  { path: 'about.html', url: `${BASE}/about.html`, type: 'html', language: 'html',
    code: `<!DOCTYPE html><html lang="en"><head><title>About</title></head><body><h1>About</h1></body></html>` },
];

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
  import '@kitn.ai/chat/elements'; // registers the custom elements
  document.querySelector('kc-resizable')
    .addEventListener('change', (e) => console.log(e.detail.sizes));
</script>`;

const meta = {
  title: 'Components/Resizable',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-resizable'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-resizable', [
        '`<kc-resizable>` is the framework-agnostic **web component** for a composable, resizable multi-panel layout (up to **3** `<kc-resizable-item>` panels) with **auto-inserted draggable dividers** — isolated in **Shadow DOM**.',
        '**When to use:** to compose an app shell out of slotted regions without hand-wiring panels and handles — e.g. `list | chat | preview`. In SolidJS, use the `Resizable` convenience (UI/Resizable) directly.',
        "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set `orientation` (`horizontal` row / `vertical` column), and put a `<kc-resizable-item>` per panel. Each item carries `size` (px or %, e.g. `\"280px\"` or `\"25%\"`), `min`/`max`, `locked` (fixed size + non-draggable neighbour), and `hidden` (drops the panel + its divider). Listen for the **`change`** event (`detail.sizes`, percent).",
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

const EXPAND_TO_FILL_SNIPPET = `<!-- The artifact's "Expand" button (opt-in: expandable) fires a bubbling
     kc-maximize-intent event. The nearest enclosing <kc-resizable> catches it
     automatically and hides siblings so the preview panel fills the container.
     No wiring needed between the two elements — the protocol is zero-config. -->

<kc-resizable orientation="horizontal" style="display:block;height:480px">
  <kc-resizable-item size="20%" min="120px"> …list… </kc-resizable-item>
  <kc-resizable-item> …chat… </kc-resizable-item>
  <kc-resizable-item size="35%" min="200px">
    <!-- expandable opt-in: adds the Expand/Collapse button -->
    <kc-artifact
      src="…/index.html"
      expandable
    ></kc-artifact>
  </kc-resizable-item>
</kc-resizable>

<script type="module">
  import '@kitn.ai/chat/elements';

  // Optional: observe the layout events.
  document.querySelector('kc-resizable')
    .addEventListener('change', (e) => console.log('change', e.detail.sizes));
  document.querySelector('kc-resizable')
    .addEventListener('maximizechange', (e) => console.log('maximizechange', e.detail));
  document.querySelector('kc-artifact')
    .addEventListener('maximizechange', (e) => console.log('artifact maximizechange', e.detail));
</script>

<!-- Cross-element protocol (hand-authored; not generated):
  • kc-maximize-intent  — CustomEvent, bubbles:true, composed:true
      Fired by <kc-artifact> when the Expand/Collapse button is clicked.
      detail: { requested: boolean }  (true = maximize, false = restore)
  • kc-maximize-state   — CustomEvent, bubbles:false, composed:true
      Dispatched by <kc-resizable> back DOWN onto the maximized <kc-resizable-item>
      (on maximize) or the group host + the formerly-maximized item (on restore)
      so the artifact can reconcile its button label.
      detail: { maximized: boolean }
  These protocol events are NOT listed in the generated web-components.md because
  they are cross-element — the generator only documents per-element dispatch events. -->`;

/**
 * **Expand to fill** — the headline integration: the artifact's expand button
 * fills the preview panel to the full container width. No wiring between the
 * two elements is needed — clicking **Expand** fires a `kc-maximize-intent` event
 * that bubbles up to the nearest enclosing `<kc-resizable>`, which hides siblings
 * and lets the preview panel fill. **Collapse** (or **Escape**) restores the
 * original layout.
 *
 * **Cross-element protocol (hand-authored docs):**
 * - `kc-maximize-intent` — `bubbles:true, composed:true`; fired by `<kc-artifact>`
 *   when Expand/Collapse is toggled. `detail: { requested: boolean }`.
 * - `kc-maximize-state` — `bubbles:false, composed:true`; dispatched by
 *   `<kc-resizable>` back down to the affected `<kc-resizable-item>` so the
 *   artifact can reconcile its button. `detail: { maximized: boolean }`.
 *
 * These protocol events are NOT in the generated `web-components.md`
 * (the generator only documents per-element `dispatch` events — resolved decision #1).
 */
export const ExpandToFill: Story = {
  name: 'Expand to fill',
  render: () => {
    const [log, setLog] = createSignal<string[]>([]);
    let artifactEl: HTMLElement & { files?: ArtifactFile[] };
    let resizableEl: HTMLElement;
    onMount(() => {
      if (artifactEl) artifactEl.files = ARTIFACT_FILES;
      if (resizableEl) {
        resizableEl.addEventListener('change', (e: Event) =>
          setLog((l) => [`change → ${JSON.stringify((e as CustomEvent).detail.sizes)}`, ...l].slice(0, 6)),
        );
        resizableEl.addEventListener('maximizechange', (e: Event) =>
          setLog((l) => [`maximizechange → ${JSON.stringify((e as CustomEvent).detail)}`, ...l].slice(0, 6)),
        );
      }
      if (artifactEl) {
        artifactEl.addEventListener('maximizechange', (e: Event) =>
          setLog((l) => [`artifact maximizechange → ${JSON.stringify((e as CustomEvent).detail)}`, ...l].slice(0, 6)),
        );
      }
    });
    return (
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <div
          style={{
            height: '480px',
            width: '100%',
            'max-width': '900px',
            border: '1px solid var(--color-border, #e4e4e7)',
            'border-radius': '8px',
            overflow: 'hidden',
          }}
        >
          <kc-resizable
            ref={(e) => (resizableEl = e as HTMLElement)}
            orientation="horizontal"
          >
            <kc-resizable-item size="20%" min="120px">
              <Pane label="List" />
            </kc-resizable-item>
            <kc-resizable-item min="140px">
              <Pane label="Chat" tone="plain" />
            </kc-resizable-item>
            <kc-resizable-item size="35%" min="200px">
              <kc-artifact
                ref={(e) => (artifactEl = e as HTMLElement & { files?: ArtifactFile[] })}
                src={`${BASE}/index.html`}
                iframe-title="Starboard artifact preview"
                expandable
              />
            </kc-resizable-item>
          </kc-resizable>
        </div>
        <pre
          style={{
            'font-size': '12px',
            'max-width': '900px',
            padding: '10px 12px',
            'border-radius': '8px',
            background: 'var(--color-muted, #f4f4f5)',
            color: 'var(--color-muted-foreground, #71717a)',
            'min-height': '72px',
            margin: '0',
          }}
        >
          {log().length ? log().join('\n') : '(click the ⤢ Expand button in the preview toolbar…)'}
        </pre>
      </div>
    );
  },
  parameters: { docs: { source: { code: EXPAND_TO_FILL_SNIPPET, language: 'html' } } },
};

const SOLID_PARITY_SNIPPET = `// SolidJS — Artifact inside Resizable with maximizedIndex/onMaximizeChange.
// No web components needed; works in a pure-Solid app.
import { createSignal } from 'solid-js';
import { Artifact } from '@kitn.ai/chat/components';
import { Resizable, ResizablePanel } from '@kitn.ai/chat/ui';

function App() {
  const [maximizedIndex, setMaximizedIndex] = createSignal<number | null>(null);
  return (
    <Resizable
      maximizedIndex={maximizedIndex()}
      onMaximizeChange={setMaximizedIndex}
      style="height:480px"
    >
      <ResizablePanel defaultSize="20%" minSize="120px">…list…</ResizablePanel>
      <ResizablePanel minSize="140px">…chat…</ResizablePanel>
      <ResizablePanel defaultSize="35%" minSize="200px">
        <Artifact
          src="…"
          expandable
          maximized={maximizedIndex() === 2}
          onMaximizeChange={(m) => setMaximizedIndex(m ? 2 : null)}
        />
      </ResizablePanel>
    </Resizable>
  );
}`;

/**
 * **SolidJS parity** — the same `list | chat | artifact` layout using the Solid
 * `Resizable` convenience and the `Artifact` component directly (no web components).
 * `maximizedIndex` / `onMaximizeChange` on `Resizable` mirror the web-component
 * protocol at the Solid level. Wire `Artifact`'s `onMaximizeChange` to set the
 * index and pass `maximized` back down to drive the button.
 */
export const SolidParity: Story = {
  name: 'SolidJS parity (Resizable + Artifact)',
  render: () => {
    const [maximizedIndex, setMaximizedIndex] = createSignal<number | null>(null);
    return (
      <div
        style={{
          height: '480px',
          width: '100%',
          'max-width': '900px',
          border: '1px solid var(--color-border, #e4e4e7)',
          'border-radius': '8px',
          overflow: 'hidden',
        }}
      >
        <Resizable
          maximizedIndex={maximizedIndex()}
          onMaximizeChange={setMaximizedIndex}
        >
          <ResizablePanel defaultSize="20%" minSize="120px">
            <Pane label="List" />
          </ResizablePanel>
          <ResizablePanel minSize="140px">
            <Pane label="Chat" tone="plain" />
          </ResizablePanel>
          <ResizablePanel defaultSize="35%" minSize="200px">
            <Artifact
              src={`${BASE}/index.html`}
              iframeTitle="Starboard artifact preview"
              expandable
              maximized={maximizedIndex() === 2}
              onMaximizeChange={(m) => setMaximizedIndex(m ? 2 : null)}
            />
          </ResizablePanel>
        </Resizable>
      </div>
    );
  },
  parameters: { docs: { source: { code: SOLID_PARITY_SNIPPET, language: 'tsx' } } },
};
