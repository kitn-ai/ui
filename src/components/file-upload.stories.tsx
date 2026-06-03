import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, For } from 'solid-js';
import { FileUpload, FileUploadTrigger, FileUploadContent } from './file-upload';
import { Upload } from 'lucide-solid';

const meta: Meta = {
  title: 'Components/FileUpload',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

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
};

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
};
