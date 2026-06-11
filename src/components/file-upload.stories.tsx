import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal, For } from 'solid-js';
import { FileUpload, FileUploadTrigger, FileUploadContent } from './file-upload';
import { Upload } from 'lucide-solid';

const meta = {
  title: 'Components/FileUpload',
  component: FileUpload,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: {
        component: [
          'A headless file-upload root that handles window-wide drag-and-drop plus a hidden file input, composed with `FileUploadTrigger` (opens the picker) and `FileUploadContent` (full-screen drop overlay).',
          '**When to use:** to let users attach files to a chat — via a button click or by dragging files anywhere onto the page.',
          '**How to use:** wrap a `FileUploadTrigger` and optional `FileUploadContent` in `FileUpload`, and read selected files from `onFilesAdded`. Set `multiple`, `accept`, or `disabled` as needed.',
          '**Placement:** in the prompt input area or composer toolbar where attachments are added.',
        ].join('\n\n'),
      },
    },
  },
  argTypes: {
    multiple: {
      control: 'boolean',
      description: 'Allow selecting / dropping more than one file.',
      table: { defaultValue: { summary: 'true' } },
    },
    accept: {
      control: 'text',
      description: 'Accepted file types, forwarded to the file input (e.g. `image/*`).',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the file input and suppresses the drop overlay.',
    },
    onFilesAdded: {
      action: 'filesAdded',
      description: 'Fired with the selected/dropped `File[]` (capped to one when `multiple` is false).',
      table: { category: 'Events' },
    },
    children: {
      control: false,
      description: 'Trigger and overlay composition (`FileUploadTrigger`, `FileUploadContent`).',
    },
  },
  args: {
    multiple: true,
    onFilesAdded: fn(),
  },
  render: (args) => (
    <FileUpload {...args}>
      <FileUploadTrigger class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
        <Upload class="size-4" />
        Upload files
      </FileUploadTrigger>
      <FileUploadContent class="flex flex-col items-center gap-2">
        <Upload class="size-12 text-muted-foreground" />
        <p class="text-lg font-medium">Drop files here</p>
      </FileUploadContent>
    </FileUpload>
  ),
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { FileUpload, FileUploadTrigger, FileUploadContent } from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — toggle multiple/disabled and watch the `filesAdded` action. */
export const Playground: Story = {
  ...src(`<FileUpload onFilesAdded={(files) => console.log(files)}>
  <FileUploadTrigger class="...">
    <Upload class="size-4" /> Upload files
  </FileUploadTrigger>
  <FileUploadContent class="...">
    <Upload class="size-12" />
    <p>Drop files here</p>
  </FileUploadContent>
</FileUpload>`),
};

/** Multi-file upload with a live list of selected files (showcase). */
export const Default: Story = {
  render: () => {
    const [files, setFiles] = createSignal<File[]>([]);
    return (
      <div class="space-y-4">
        <FileUpload onFilesAdded={(f) => setFiles((prev) => [...prev, ...f])}>
          <FileUploadTrigger class="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            <Upload class="size-4" />
            Upload files
          </FileUploadTrigger>
          <FileUploadContent class="flex flex-col items-center gap-2">
            <Upload class="size-12 text-muted-foreground" />
            <p class="text-lg font-medium">Drop files here</p>
          </FileUploadContent>
        </FileUpload>
        <div class="space-y-1">
          <For each={files()}>
            {(file) => (
              <div class="text-sm text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </For>
        </div>
      </div>
    );
  },
  ...src(`<FileUpload onFilesAdded={(f) => setFiles((prev) => [...prev, ...f])}>
  <FileUploadTrigger class="...">
    <Upload class="size-4" /> Upload files
  </FileUploadTrigger>
  <FileUploadContent class="...">
    <Upload class="size-12" />
    <p>Drop files here</p>
  </FileUploadContent>
</FileUpload>`),
};

/** Single-file, image-only upload (showcase). */
export const SingleFile: Story = {
  render: () => {
    const [file, setFile] = createSignal<File | null>(null);
    return (
      <div class="space-y-4">
        <FileUpload
          onFilesAdded={(f) => setFile(f[0] ?? null)}
          multiple={false}
          accept="image/*"
        >
          <FileUploadTrigger class="rounded-md bg-muted px-4 py-2 text-sm hover:bg-muted/80">
            Choose image
          </FileUploadTrigger>
          <FileUploadContent>
            <p class="text-lg font-medium">Drop an image here</p>
          </FileUploadContent>
        </FileUpload>
        <div class="text-sm text-muted-foreground">
          {file() ? `Selected: ${file()!.name}` : 'No file selected'}
        </div>
      </div>
    );
  },
  ...src(`<FileUpload onFilesAdded={(f) => setFile(f[0] ?? null)} multiple={false} accept="image/*">
  <FileUploadTrigger class="...">Choose image</FileUploadTrigger>
  <FileUploadContent>
    <p>Drop an image here</p>
  </FileUploadContent>
</FileUpload>`),
};
