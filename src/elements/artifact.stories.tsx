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
        // toolbar composition flags (all boolean attrs)
        expandable?: boolean | string;
        'open-in-tab'?: boolean | string;
        'no-nav'?: boolean | string;
        'no-reload'?: boolean | string;
        'no-home'?: boolean | string;
        'no-path-field'?: boolean | string;
        'no-tabs'?: boolean | string;
        standalone?: boolean | string;
        'readonly-path'?: boolean | string;
      };
    }
  }
}

// Storybook serves examples/artifact-fixtures at /artifact-fixtures (see
// .storybook/main.ts staticDirs). These are real, cross-linked pages so
// relative-link nav, back/forward and multi-format all work in the iframe.
const BASE = new URL('artifact-fixtures', document.baseURI).href;

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
  import '@kitn.ai/chat/elements'; // registers the custom elements

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
  title: 'Web Components/Artifact',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-artifact'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-artifact', [
        '`<kc-artifact>` is the framework-agnostic **web component** for a framed, switchable **generated-artifact viewer** — the "canvas / artifacts" pattern (Claude Artifacts, ChatGPT Canvas, V0, bolt). It frames a consumer-served URL in a **sandboxed `<iframe>`** with a functional nav toolbar, and a **Preview | Code** toggle whose Code tab shows a file tree (`<kc-file-tree>`) + the active file source (`<kc-code-block>`). Isolated in **Shadow DOM**.',
        "**When to use:** to show an AI-generated artifact (a web page, doc, image, or PDF your backend hosts) beside the conversation — typically inside a `<kc-resizable>` panel. The component **frames** content; your backend serves it, so relative links, back/forward, reload and multi-format work natively.",
        "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set `src` to the hosted URL, and set the `files` **property** (a JS array of `{ path, url?, code?, language?, type? }`) for the Code tab tree. The iframe `sandbox` defaults to `allow-scripts allow-forms` (**not** `allow-same-origin`); widen it via the `sandbox` attribute only if you trust the artifact. Listen for **`navigate`** (`detail.url`), **`tabchange`** (`detail.tab`), and **`fileselect`** (`detail.path`).",
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

/** Multi-format: PDFs render inline via pdf.js (loaded on demand from a CDN). */
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

/** When inline rendering can't work (CORS / 404 / blocked CDN) the viewer shows
 *  an "Open in new tab / Download" card. Here the src 404s to force that path. */
export const PdfFallback: Story = {
  name: 'PDF (fallback card)',
  render: () => (
    <Frame>
      <kc-artifact
        src={`${BASE}/assets/does-not-exist.pdf`}
        iframe-title="Missing PDF"
      />
    </Frame>
  ),
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

const CONFIGURABLE_TOOLBAR_SNIPPET = `<!-- All toolbar affordances are individually opt-in/out via attributes. -->

<!-- The five default-shown items each have a "no-*" flag to hide them: -->
<kc-artifact
  src="…"
  no-nav
  no-reload
  no-home
></kc-artifact>

<!-- Two new buttons are OPT-IN (hidden by default): -->
<kc-artifact
  src="…"
  expandable
  open-in-tab
></kc-artifact>

<!-- Standalone chrome: rounded corners + border (default is square/borderless in-panel): -->
<kc-artifact src="…" standalone></kc-artifact>

<!-- Read-only path: visible, nav-tracking, non-editable: -->
<kc-artifact src="…" readonly-path></kc-artifact>`;

/**
 * Every toolbar affordance is individually configurable.
 *
 * **Default-shown (`no-*` flags hide):** back/forward (`no-nav`), reload (`no-reload`),
 * home (`no-home`), address field (`no-path-field`), Preview|Code toggle (`no-tabs`).
 *
 * **Opt-in (hidden by default; positive attr enables):** expand-to-fill (`expandable`),
 * open-in-new-tab (`open-in-tab`).
 *
 * **Chrome:** `standalone` adds rounded corners + border (default = square/borderless
 * for in-panel use). `readonly-path` makes the address field visible but non-editable.
 *
 * When ALL affordances are hidden the toolbar bar is omitted entirely (zero height).
 */
export const ConfigurableToolbar: Story = {
  name: 'Configurable toolbar',
  render: (args: {
    expandable?: boolean;
    openInTab?: boolean;
    noNav?: boolean;
    noReload?: boolean;
    noHome?: boolean;
    noPathField?: boolean;
    noTabs?: boolean;
    standalone?: boolean;
    readonlyPath?: boolean;
  }) => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => { if (el) el.files = FILES; });
    return (
      <Frame>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={`${BASE}/index.html`}
          iframe-title="Starboard artifact preview"
          expandable={args.expandable || undefined}
          open-in-tab={args.openInTab || undefined}
          no-nav={args.noNav || undefined}
          no-reload={args.noReload || undefined}
          no-home={args.noHome || undefined}
          no-path-field={args.noPathField || undefined}
          no-tabs={args.noTabs || undefined}
          standalone={args.standalone || undefined}
          readonly-path={args.readonlyPath || undefined}
        />
      </Frame>
    );
  },
  args: {
    expandable: false,
    openInTab: false,
    noNav: false,
    noReload: false,
    noHome: false,
    noPathField: false,
    noTabs: false,
    standalone: false,
    readonlyPath: false,
  },
  argTypes: {
    expandable: { control: 'boolean', description: 'Show the expand-to-fill button (opt-in).' },
    openInTab: { control: 'boolean', name: 'open-in-tab', description: 'Show the open-in-new-tab button (opt-in).' },
    noNav: { control: 'boolean', name: 'no-nav', description: 'Hide the back/forward buttons.' },
    noReload: { control: 'boolean', name: 'no-reload', description: 'Hide the reload button.' },
    noHome: { control: 'boolean', name: 'no-home', description: 'Hide the home button.' },
    noPathField: { control: 'boolean', name: 'no-path-field', description: 'Hide the address field.' },
    noTabs: { control: 'boolean', name: 'no-tabs', description: 'Hide the Preview|Code toggle.' },
    standalone: { control: 'boolean', description: 'Standalone chrome (rounded + border).' },
    readonlyPath: { control: 'boolean', name: 'readonly-path', description: 'Address field is visible but non-editable.' },
  },
  parameters: { docs: { source: { code: CONFIGURABLE_TOOLBAR_SNIPPET, language: 'html' } } },
};

const MINIMAL_SNIPPET = `<!-- Minimal: only the preview iframe, no toolbar at all. -->
<kc-artifact
  src="…"
  no-nav
  no-reload
  no-home
  no-path-field
  no-tabs
></kc-artifact>`;

/**
 * All five default-shown toolbar affordances suppressed — the toolbar bar
 * disappears entirely (zero height), leaving just the preview iframe.
 * Useful for an embedded, chrome-free artifact tile.
 */
export const MinimalPreview: Story = {
  name: 'Minimal (preview-only)',
  render: () => (
    <Frame>
      <kc-artifact
        src={`${BASE}/index.html`}
        iframe-title="Starboard artifact preview"
        no-nav
        no-reload
        no-home
        no-path-field
        no-tabs
      />
    </Frame>
  ),
  parameters: { docs: { source: { code: MINIMAL_SNIPPET, language: 'html' } } },
};

const OPEN_IN_TAB_SNIPPET = `<!-- open-in-tab: adds a button that opens the current URL in a new tab.
     The button is disabled while the src is blank. -->
<kc-artifact
  src="https://your-backend.example/artifacts/abc/index.html"
  open-in-tab
></kc-artifact>`;

/**
 * The **open-in-tab** button (opt-in via `open-in-tab`) opens the current
 * preview URL in a new browser tab (`window.open`, `noopener,noreferrer`).
 * It is disabled while the URL is empty / `about:blank` and follows the live
 * navigation state — clicking it after the user has navigated to a sub-page
 * opens that sub-page, not the original `src`.
 */
export const OpenInTab: Story = {
  name: 'Open in new tab',
  render: () => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => { if (el) el.files = FILES; });
    return (
      <Frame>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={`${BASE}/index.html`}
          iframe-title="Starboard artifact preview"
          open-in-tab
        />
      </Frame>
    );
  },
  parameters: { docs: { source: { code: OPEN_IN_TAB_SNIPPET, language: 'html' } } },
};

const STANDALONE_SNIPPET = `<!-- standalone: adds rounded corners + a border (like a card).
     Suppresses the expand button even when expandable is set.
     Use for an artifact rendered outside any panel layout. -->
<kc-artifact
  src="…"
  standalone
  style="display:block;height:520px"
></kc-artifact>`;

/**
 * `standalone` adds rounded corners and a border — the "card" chrome for an
 * artifact rendered outside any panel layout (e.g. as a modal or inline tile).
 * In the default in-panel mode the element is square and borderless so it fits
 * flush inside a `<kc-resizable>` panel without double-borders.
 *
 * `standalone` also suppresses the expand button (there is no enclosing resizable
 * to maximize into) regardless of `expandable`.
 *
 * `readonly-path` keeps the address field visible and navigation-tracking but
 * non-editable — useful when the consumer drives the URL programmatically.
 */
export const StandaloneChrome: Story = {
  name: 'Standalone chrome + read-only path',
  render: () => {
    let el: HTMLElement & { files?: ArtifactFile[] };
    onMount(() => { if (el) el.files = FILES; });
    return (
      <div style={{ padding: '16px', 'max-width': '900px' }}>
        <kc-artifact
          ref={(e) => (el = e as HTMLElement & { files?: ArtifactFile[] })}
          src={`${BASE}/index.html`}
          iframe-title="Starboard artifact preview"
          standalone
          readonly-path
          style={{ display: 'block', height: '480px' }}
        />
      </div>
    );
  },
  parameters: { docs: { source: { code: STANDALONE_SNIPPET, language: 'html' } } },
};
