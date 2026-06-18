import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { FileTree, type FileTreeFile } from './file-tree';
import { componentDescription } from '../stories/docs/element-controls';

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

const meta = {
  title: 'Solid (Advanced)/Elements/FileTree',
  component: FileTree,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A collapsible, keyboard-navigable file explorer built from a flat list of `/`-delimited paths — nested folders are derived automatically. ARIA `tree`/`treeitem`.',
        '**When to use:** any file/folder tree — the Code tab of `Artifact` uses it, and it is exported for standalone reuse (project explorers, attachment browsers, doc outlines).',
        '**How to use:** pass `files` (`{ path, url?, code?, language?, type? }[]`); folders come from `/` in each path and `type` picks the icon. Control highlight via `activeFile`, initial open folders via `defaultExpanded`, and handle `onSelect(path, file)`. Arrow keys navigate; Enter/Space selects or toggles.',
        '**Placement:** a sidebar/explorer column.',
      ]),
    },
  },
  argTypes: {
    files: { control: false },
    activeFile: { control: 'text' },
  },
  args: { files: FILES, activeFile: 'src/app.ts' },
  render: (args) => (
    <div class="w-64 h-80 overflow-auto rounded-lg border border-border scrollbar-thin">
      <FileTree files={args.files} activeFile={args.activeFile} />
    </div>
  ),
} satisfies Meta<typeof FileTree>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { FileTree } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

export const Playground: Story = {
  ...src(`<FileTree files={files} activeFile="src/app.ts" onSelect={(p) => set(p)} />`),
};

/** Drives selection from `onSelect` — the controlled pattern. */
export const Interactive: Story = {
  render: () => {
    const [active, setActive] = createSignal('src/lib/format.ts');
    return (
      <div class="flex flex-col gap-2">
        <div class="w-64 h-80 overflow-auto rounded-lg border border-border scrollbar-thin">
          <FileTree files={FILES} activeFile={active()} onSelect={(p) => setActive(p)} />
        </div>
        <span class="text-sm text-muted-foreground">
          Selected: <code>{active()}</code>
        </span>
      </div>
    );
  },
  ...src(`const [active, setActive] = createSignal('src/lib/format.ts');
<FileTree files={files} activeFile={active()} onSelect={setActive} />`),
};
