import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { fn } from 'storybook/test';
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
  title: 'Components/Elements/Artifact',
  component: Artifact,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'The "canvas / artifacts" pattern: a framed viewer for an AI-generated artifact your backend hosts (page, doc, image, PDF), shown beside the conversation. A sandboxed `<iframe>` with a nav toolbar and a Preview | Code toggle (the Code tab pairs a `FileTree` with `CodeBlock`).',
        'Set `src` to the hosted URL and `files` for the Code tree; handle `onNavigate`, `onTabChange`, `onFileSelect`. It fills its container, so give the parent a height.',
      ]),
    },
  },
  argTypes: {
    files: { control: false },
    src: { control: 'text' },
    tab: { control: 'select', options: ['preview', 'code'] },
    sandbox: { control: 'text' },
    onNavigate: { action: 'kai-navigate', description: 'The preview navigated to a new URL.', table: { category: 'Events' } },
    onTabChange: { action: 'kai-tab-change', description: 'The Preview | Code tab changed.', table: { category: 'Events' } },
    onFileSelect: { action: 'kai-file-select', description: 'A file was selected in the Code tree.', table: { category: 'Events' } },
    onMaximizeChange: { action: 'kai-maximize-change', description: 'The artifact entered/left the maximized view.', table: { category: 'Events' } },
  },
  args: {
    src: `${BASE}/index.html`,
    files: FILES,
    tab: 'preview' as ArtifactTab,
    onNavigate: fn(),
    onTabChange: fn(),
    onFileSelect: fn(),
    onMaximizeChange: fn(),
  },
  render: (args) => (
    <div class="h-[520px] w-full max-w-[900px]">
      <Artifact
        src={args.src}
        files={args.files}
        tab={args.tab}
        sandbox={args.sandbox}
        iframeTitle="Starboard artifact preview"
        onNavigate={args.onNavigate}
        onTabChange={args.onTabChange}
        onFileSelect={args.onFileSelect}
        onMaximizeChange={args.onMaximizeChange}
      />
    </div>
  ),
} satisfies Meta<typeof Artifact>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Artifact, type ArtifactFile } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

export const Playground: Story = {
  ...src(`// Your backend hosts the artifact; \`src\` is the live URL it serves.
// \`files\` feeds the Code tab's tree + source view.
const src = 'https://your-app.dev/index.html';

const files: ArtifactFile[] = [
  { path: 'index.html', url: \`\${base}/index.html\`, language: 'html',
    code: '<!DOCTYPE html>\\n<html>…</html>' },
  { path: 'css/site.css', url: \`\${base}/css/site.css\`, language: 'css',
    code: ':root { --accent: #6ea8fe; }' },
  { path: 'assets/logo.svg', url: \`\${base}/assets/logo.svg\`, type: 'image' },
  { path: 'assets/report.pdf', url: \`\${base}/assets/report.pdf\`, type: 'pdf' },
];

<Artifact
  src={src}
  files={files}
  tab="preview"
  onNavigate={(url) => console.log('navigate', url)}
  onTabChange={(tab) => console.log('tab', tab)}
  onFileSelect={(path) => console.log('file', path)}
/>`),
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

/** Controlled: observe the emitted nav model. */
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
            onTabChange={(t) => push(`kai-tab-change → ${t}`)}
            onFileSelect={(p) => push(`kai-file-select → ${p}`)}
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
