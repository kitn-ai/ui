import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { FileTreeFile } from '../components/file-tree';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-file-tree': JSX.HTMLAttributes<HTMLElement> & {
        'active-file'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

const FILES: FileTreeFile[] = [
  { path: 'index.html', type: 'html' },
  { path: 'about.html', type: 'html' },
  { path: 'css/site.css', type: 'other', language: 'css' },
  { path: 'src/app.ts', type: 'other', language: 'ts' },
  { path: 'src/lib/format.ts', type: 'other', language: 'ts' },
  { path: 'src/lib/parse.ts', type: 'other', language: 'ts' },
  { path: 'assets/logo.svg', type: 'image' },
  { path: 'assets/report.pdf', type: 'pdf' },
];

/** A bordered, sized box the tree fills + scrolls within. */
function Frame(props: { children: JSX.Element }) {
  return (
    <div
      style={{
        height: '320px',
        width: '280px',
        border: '1px solid var(--color-border, #e4e4e7)',
        'border-radius': '10px',
        overflow: 'hidden',
      }}
    >
      {props.children}
    </div>
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-file-tree style="display:block;height:320px"></kc-file-tree>

<script type="module">
  import '@kitn.ai/chat/elements'; // registers the custom elements

  const tree = document.querySelector('kc-file-tree');
  // \`files\` is a JS property (array). Folders are derived from \`/\` in each path.
  tree.files = [
    { path: 'index.html', type: 'html' },
    { path: 'src/app.ts', type: 'other' },
    { path: 'src/lib/format.ts', type: 'other' },
    { path: 'assets/logo.svg', type: 'image' },
  ];
  tree.setAttribute('active-file', 'src/app.ts');
  tree.addEventListener('kc-select', (e) => console.log('selected', e.detail.path));
</script>`;

const meta = {
  title: 'Components/FileTree',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-file-tree'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-file-tree', [
        '`<kc-file-tree>` is the framework-agnostic **web component** for a collapsible, keyboard-navigable **file explorer** built from a flat list of `/`-delimited paths (nested folders are derived automatically). ARIA `tree`/`treeitem`. Isolated in **Shadow DOM**.',
        '**When to use:** any time you need a file/folder tree — the Code tab of `<kc-artifact>` uses it, but it ships public so you can reuse it standalone (a project explorer, an attachments browser, a doc outline).',
        "**How to use:** register once with `import '@kitn.ai/chat/elements'`, then set the `files` **property** (a JS array of `{ path, url?, code?, language?, type? }`). Folders come from the `/` in each `path`; `type` picks the icon. Set `active-file` to highlight a row, `default-expanded` to control which folders open. Listen for **`select`** (`detail.path`). Arrow keys navigate; Enter/Space selects or toggles.",
        '**Anatomy:** a scrollable ARIA `tree` of **folder nodes** (collapsible `treeitem` groups, derived from `/`-delimited path segments) and **file leaf nodes** (selectable `treeitem` rows with a type icon; the `active-file` row is highlighted). Folders auto-expand on first render; click or arrow-key to collapse/expand.',
        '**Placement:** a sidebar/explorer column — inside `<kc-artifact>`, a `<kc-resizable>` panel, or any file-picker surface. It **fills** its container, so give the parent (or the element) a height.',
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Interactive playground — click rows, use arrow keys / Enter to navigate. */
export const Playground: Story = {
  render: () => {
    const [selected, setSelected] = createSignal('src/app.ts');
    let el: HTMLElement & { files?: FileTreeFile[] };
    onMount(() => {
      if (!el) return;
      el.files = FILES;
      el.addEventListener('kc-select', (e) => {
        const path = (e as CustomEvent).detail.path as string;
        setSelected(path);
        el.setAttribute('active-file', path);
      });
    });
    return (
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <Frame>
          <kc-file-tree
            ref={(e) => (el = e as HTMLElement & { files?: FileTreeFile[] })}
            active-file={selected()}
          />
        </Frame>
        <span style={{ 'font-size': '13px', color: 'var(--color-muted-foreground, #71717a)' }}>
          Selected: <code>{selected()}</code>
        </span>
      </div>
    );
  },
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** A deeper, nested layout with mixed file types. */
export const Nested: Story = {
  render: () => {
    let el: HTMLElement & { files?: FileTreeFile[] };
    onMount(() => {
      if (el) el.files = FILES;
    });
    return (
      <Frame>
        <kc-file-tree
          ref={(e) => (el = e as HTMLElement & { files?: FileTreeFile[] })}
          active-file="src/lib/format.ts"
        />
      </Frame>
    );
  },
};
