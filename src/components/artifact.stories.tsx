import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Artifact, type ArtifactFile, type ArtifactTab } from './artifact';
import { componentDescription } from '../stories/docs/element-controls';

// Storybook serves examples/artifact-fixtures at /artifact-fixtures.
const BASE = new URL('artifact-fixtures', document.baseURI).href;

const FILES: ArtifactFile[] = [
  {
    path: 'index.html',
    url: `${BASE}/index.html`,
    type: 'html',
    language: 'html',
    code: `<!DOCTYPE html>\n<html lang="en">\n  <head><link rel="stylesheet" href="css/site.css" /></head>\n  <body><h1>Starboard</h1><a href="about.html">About</a></body>\n</html>`,
  },
  {
    path: 'about.html',
    url: `${BASE}/about.html`,
    type: 'html',
    language: 'html',
    code: `<!DOCTYPE html>\n<html lang="en">\n  <body data-page="about"><h1>About</h1><a href="index.html">Home</a></body>\n</html>`,
  },
  {
    path: 'css/site.css',
    url: `${BASE}/css/site.css`,
    type: 'other',
    language: 'css',
    code: `:root { --accent: #6ea8fe; }\nbody { font-family: system-ui, sans-serif; }`,
  },
  { path: 'assets/logo.svg', url: `${BASE}/assets/logo.svg`, type: 'image' },
  { path: 'assets/report.pdf', url: `${BASE}/assets/report.pdf`, type: 'pdf' },
];

const meta = {
  title: 'Components/Artifact',
  component: Artifact,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A framed, switchable **generated-artifact viewer** — the "canvas / artifacts" pattern. A sandboxed `<iframe>` with a functional nav toolbar (back · forward · reload · home + editable path field) and a **Preview | Code** toggle; the Code tab shows a `FileTree` + the active file source via `CodeBlock`.',
        '**When to use:** to show an AI-generated artifact your backend hosts (page, doc, image, PDF) beside the conversation. The component frames; your backend serves — so relative links, back/forward and multi-format work natively.',
        '**How to use:** set `src` to the hosted URL and `files` (`{ path, url?, code?, language?, type? }[]`) for the Code tree. The iframe `sandbox` defaults to `allow-scripts allow-forms` (not `allow-same-origin`). Handle `onNavigate(url)`, `onTabChange(tab)`, `onFileSelect(path)`.',
        '**Placement:** the preview/canvas panel of a chat shell (e.g. `list | chat | artifact`). It **fills** its container — give the parent a height.',
      ]),
    },
  },
  argTypes: {
    files: { control: false },
    src: { control: 'text' },
    tab: { control: 'select', options: ['preview', 'code'] },
    sandbox: { control: 'text' },
  },
  args: { src: `${BASE}/index.html`, files: FILES, tab: 'preview' as ArtifactTab },
  render: (args) => (
    <div class="h-[520px] w-full max-w-[900px]">
      <Artifact
        src={args.src}
        files={args.files}
        tab={args.tab}
        sandbox={args.sandbox}
        iframeTitle="Starboard artifact preview"
      />
    </div>
  ),
} satisfies Meta<typeof Artifact>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Artifact } from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

export const Playground: Story = {
  ...src(`<Artifact src={src} files={files} tab="preview" />`),
};

export const CodeTab: Story = {
  name: 'Code tab',
  args: { tab: 'code' as ArtifactTab },
  render: (args: { src?: string; files: ArtifactFile[] }) => (
    <div class="h-[520px] w-full max-w-[900px]">
      <Artifact src={args.src} files={args.files} tab="code" activeFile="index.html" iframeTitle="Starboard artifact preview" />
    </div>
  ),
  ...src(`<Artifact src={src} files={files} tab="code" activeFile="index.html" />`),
};

/** Controlled — observe the emitted nav model. */
export const Controlled: Story = {
  render: () => {
    const [log, setLog] = createSignal<string[]>([]);
    const push = (s: string) => setLog((l) => [s, ...l].slice(0, 6));
    return (
      <div class="flex flex-col gap-2">
        <div class="h-[420px] w-full max-w-[900px]">
          <Artifact
            src={`${BASE}/index.html`}
            files={FILES}
            iframeTitle="Starboard artifact preview"
            onNavigate={(url) => push(`navigate → ${url}`)}
            onTabChange={(t) => push(`tabchange → ${t}`)}
            onFileSelect={(p) => push(`fileselect → ${p}`)}
          />
        </div>
        <pre class="m-0 min-h-24 max-w-[900px] rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
          {log().length ? log().join('\n') : '(navigate the preview / switch tabs / pick a file…)'}
        </pre>
      </div>
    );
  },
  ...src(`<Artifact src={src} files={files}
  onNavigate={(url) => …} onTabChange={(t) => …} onFileSelect={(p) => …} />`),
};

/** PDFs render inline via pdf.js (loaded on demand from a CDN). */
export const PdfPreview: Story = {
  name: 'PDF (inline)',
  render: () => (
    <div class="h-[520px] w-full max-w-[900px]">
      <Artifact src={`${BASE}/assets/report.pdf`} files={FILES} />
    </div>
  ),
};

/** Fallback card when inline rendering can't work (here the src 404s). */
export const PdfFallback: Story = {
  name: 'PDF (fallback card)',
  render: () => (
    <div class="h-[520px] w-full max-w-[900px]">
      <Artifact src={`${BASE}/assets/does-not-exist.pdf`} />
    </div>
  ),
};
