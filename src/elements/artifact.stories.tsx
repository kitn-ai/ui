import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { ArtifactFile } from '../components/artifact';

// Custom DOM elements — declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-artifact': JSX.HTMLAttributes<HTMLElement> & {
        src?: string;
        tab?: string;
        'active-file'?: string;
        sandbox?: string;
        'iframe-title'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

// Storybook serves examples/artifact-fixtures at /artifact-fixtures (see
// .storybook/main.ts staticDirs). These are real, cross-linked pages so
// relative-link nav, back/forward and multi-format all work in the iframe.
const BASE = '/artifact-fixtures';

const FILES: ArtifactFile[] = [
  {
    path: 'index.html',
    url: `${BASE}/index.html`,
    type: 'html',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="css/site.css" />
    <title>Starboard — Home</title>
  </head>
  <body>
    <h1>Starboard</h1>
    <a href="about.html">About</a>
  </body>
</html>`,
  },
  {
    path: 'about.html',
    url: `${BASE}/about.html`,
    type: 'html',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="en">
  <head>
    <link rel="stylesheet" href="css/site.css" />
    <title>Starboard — About</title>
  </head>
  <body data-page="about">
    <h1>About Starboard</h1>
    <a href="index.html">← Home</a>
  </body>
</html>`,
  },
  {
    path: 'css/site.css',
    url: `${BASE}/css/site.css`,
    type: 'other',
    language: 'css',
    code: `:root { --accent: #6ea8fe; }
body { font-family: system-ui, sans-serif; }
.card { border: 1px solid var(--accent); border-radius: 14px; }`,
  },
  {
    path: 'assets/logo.svg',
    url: `${BASE}/assets/logo.svg`,
    type: 'image',
  },
  {
    path: 'assets/report.pdf',
    url: `${BASE}/assets/report.pdf`,
    type: 'pdf',
  },
];

/** A bordered, sized box the artifact fills. */
function Frame(props: { children: JSX.Element; height?: string }) {
  return (
    <div
      style={{
        height: props.height ?? '520px',
        width: '100%',
        'max-width': '900px',
        border: '1px solid var(--color-border, #e4e4e7)',
        'border-radius': '12px',
        overflow: 'hidden',
      }}
    >
      {props.children}
    </div>
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-artifact
  src="https://your-backend.example/artifacts/abc/index.html"
  style="display:block;height:520px"
></kc-artifact>

<script type="module">
  import '@kitnai/chat/elements'; // registers the custom elements

  const el = document.querySelector('kc-artifact');
  // \`files\` is a JS property (array): tree labels (folders from \`/\`), a preview
  // \`url\` per file, and \`code\` for the Code tab.
  el.files = [
    { path: 'index.html', url: '…/index.html', type: 'html', code: '<!DOCTYPE …' },
    { path: 'about.html', url: '…/about.html', type: 'html', code: '<!DOCTYPE …' },
    { path: 'assets/logo.svg', url: '…/logo.svg', type: 'image' },
  ];

  el.addEventListener('navigate', (e) => console.log('navigate', e.detail.url));
  el.addEventListener('tabchange', (e) => console.log('tab', e.detail.tab));
  el.addEventListener('fileselect', (e) => console.log('file', e.detail.path));
</script>`;

const meta = {
  title: 'Web Components/kc-artifact',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-artifact'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-artifact', [
        '`<kc-artifact>` is the framework-agnostic **web component** for a framed, switchable **generated-artifact viewer** — the "canvas / artifacts" pattern (Claude Artifacts, ChatGPT Canvas, V0, bolt). It frames a consumer-served URL in a **sandboxed `<iframe>`** with a functional nav toolbar, and a **Preview | Code** toggle whose Code tab shows a file tree (`<kc-file-tree>`) + the active file source (`<kc-code-block>`). Isolated in **Shadow DOM**.',
        "**When to use:** to show an AI-generated artifact (a web page, doc, image, or PDF your backend hosts) beside the conversation — typically inside a `<kc-resizable>` panel. The component **frames** content; your backend serves it, so relative links, back/forward, reload and multi-format work natively.",
        "**How to use:** register once with `import '@kitnai/chat/elements'`, set `src` to the hosted URL, and set the `files` **property** (a JS array of `{ path, url?, code?, language?, type? }`) for the Code tab tree. The iframe `sandbox` defaults to `allow-scripts allow-forms` (**not** `allow-same-origin`); widen it via the `sandbox` attribute only if you trust the artifact. Listen for **`navigate`** (`detail.url`), **`tabchange`** (`detail.tab`), and **`fileselect`** (`detail.path`).",
        '**Placement:** the preview/canvas panel of a compose-your-own-chat shell — e.g. `list | chat | artifact`. It **fills** its container, so give the parent (or the element) a height.',
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
  args: { tab: 'preview', sandbox: 'allow-scripts allow-forms' },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Interactive playground — frames a live, cross-linked fixture. Flip Preview/Code. */
export const Playground: Story = {
  render: (args: { src?: string; tab?: string; sandbox?: string }) => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => {
      if (el) el.files = FILES;
    });
    return (
      <Frame>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={args.src ?? `${BASE}/index.html`}
          tab={args.tab ?? 'preview'}
          sandbox={args.sandbox ?? 'allow-scripts allow-forms'}
          iframe-title="Starboard artifact preview"
        />
      </Frame>
    );
  },
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Opens on the Code tab — file tree + syntax-highlighted source. */
export const CodeTab: Story = {
  name: 'Code tab',
  render: () => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => {
      if (el) el.files = FILES;
    });
    return (
      <Frame>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={`${BASE}/index.html`}
          tab="code"
          active-file="index.html"
          iframe-title="Starboard artifact preview"
        />
      </Frame>
    );
  },
};

/** Multi-format: the preview frames an image fixture natively. */
export const ImagePreview: Story = {
  name: 'Image (multi-format)',
  render: () => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => {
      if (el) el.files = FILES;
    });
    return (
      <Frame>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={`${BASE}/assets/logo.svg`}
          iframe-title="Logo image"
        />
      </Frame>
    );
  },
};

/** Multi-format: the browser's native PDF viewer renders a .pdf fixture. */
export const PdfPreview: Story = {
  name: 'PDF (multi-format)',
  render: () => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => {
      if (el) el.files = FILES;
    });
    return (
      <Frame>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={`${BASE}/assets/report.pdf`}
          iframe-title="Report PDF"
        />
      </Frame>
    );
  },
};

/** Logs the emitted events so you can see the controlled nav model in action. */
export const WithEvents: Story = {
  name: 'Events',
  render: () => {
    const [log, setLog] = createSignal<string[]>([]);
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => {
      if (!el) return;
      el.files = FILES;
      el.addEventListener('navigate', (e) =>
        setLog((l) => [`navigate → ${(e as CustomEvent).detail.url}`, ...l].slice(0, 6)),
      );
      el.addEventListener('tabchange', (e) =>
        setLog((l) => [`tabchange → ${(e as CustomEvent).detail.tab}`, ...l].slice(0, 6)),
      );
      el.addEventListener('fileselect', (e) =>
        setLog((l) => [`fileselect → ${(e as CustomEvent).detail.path}`, ...l].slice(0, 6)),
      );
    });
    return (
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
        <Frame height="420px">
          <kc-artifact
            ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
            src={`${BASE}/index.html`}
            iframe-title="Starboard artifact preview"
          />
        </Frame>
        <pre
          style={{
            'font-size': '12px',
            'max-width': '900px',
            padding: '10px 12px',
            'border-radius': '8px',
            background: 'var(--color-muted, #f4f4f5)',
            color: 'var(--color-muted-foreground, #71717a)',
            'min-height': '96px',
            margin: '0',
          }}
        >
          {log().length ? log().join('\n') : '(navigate the preview / switch tabs / pick a file…)'}
        </pre>
      </div>
    );
  },
};
