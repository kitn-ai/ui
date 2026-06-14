import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, For } from 'solid-js';
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
  AttachmentRemove,
  AttachmentHoverCard,
  AttachmentHoverCardTrigger,
  AttachmentHoverCardContent,
  AttachmentEmpty,
} from './attachments';
import type { AttachmentData } from './attachments';
import { componentDescription } from '../stories/docs/element-controls';

const sampleAttachments: AttachmentData[] = [
  {
    id: '1',
    type: 'file',
    filename: 'mountain-landscape.jpg',
    mediaType: 'image/jpeg',
    url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
  },
  {
    id: '2',
    type: 'file',
    filename: 'sunset-beach.png',
    mediaType: 'image/png',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop',
  },
  {
    id: '3',
    type: 'file',
    filename: 'architecture-report.pdf',
    mediaType: 'application/pdf',
  },
  {
    id: '4',
    type: 'file',
    filename: 'demo-recording.mp4',
    mediaType: 'video/mp4',
  },
  {
    id: '5',
    type: 'file',
    filename: 'podcast-episode.mp3',
    mediaType: 'audio/mpeg',
  },
  {
    id: '6',
    type: 'source-document',
    filename: 'SolidJS Documentation',
    title: 'SolidJS Reactivity Guide',
    url: 'https://solidjs.com/docs',
  },
];

const meta = {
  title: 'Components/Attachments',
  component: Attachments,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A composable container for displaying file and source-document attachments as thumbnails, inline chips, or a vertical list. Built from `Attachments` + per-item `Attachment` with `AttachmentPreview`, `AttachmentInfo`, and `AttachmentRemove` parts.',
        '**When to use:** to show files a user attached to a prompt, or documents/sources referenced by a message. Choose `grid` for thumbnails, `inline` for compact chips, `list` for a detailed rows view.',
        '**How to use:** set `variant` on `Attachments`, then map your data to `Attachment` (passing each item via `data` and an `onRemove` handler) and compose the preview/info/remove parts inside.',
        '**Placement:** prompt input area (pending uploads), message bodies (attached or cited files), and document panels.',
      ]),
      controls: { exclude: ['use:eventListener'] },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['grid', 'inline', 'list'],
      description: 'Layout of the attachment items.',
      table: { defaultValue: { summary: 'grid' } },
    },
    children: {
      control: false,
      description: 'The `Attachment` items to render inside the container.',
    },
    class: {
      control: 'text',
      description: 'Extra classes for the container element.',
    },
  },
  args: {
    variant: 'grid',
  },
  render: (args) => {
    const [items, setItems] = createSignal([...sampleAttachments]);
    const remove = (id: string) => setItems((prev) => prev.filter((a) => a.id !== id));
    return (
      <Attachments {...args}>
        <For each={items()}>
          {(item) => (
            <Attachment data={item} onRemove={() => remove(item.id)}>
              <AttachmentPreview />
              <AttachmentInfo />
              <AttachmentRemove />
            </Attachment>
          )}
        </For>
      </Attachments>
    );
  },
} satisfies Meta<typeof Attachments>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import {
  Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove,
} from '@kitn.ai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground — switch `variant` to compare grid / inline / list. */
export const Playground: Story = {
  ...src(`<Attachments variant="grid">
  <For each={items()}>
    {(item) => (
      <Attachment data={item} onRemove={() => remove(item.id)}>
        <AttachmentPreview />
        <AttachmentInfo />
        <AttachmentRemove />
      </Attachment>
    )}
  </For>
</Attachments>`),
};

export const Grid: Story = {
  render: () => {
    const [items, setItems] = createSignal([...sampleAttachments]);
    const remove = (id: string) => setItems((prev) => prev.filter((a) => a.id !== id));
    return (
      <div class="space-y-4">
        <Attachments variant="grid">
          <For each={items()}>
            {(item) => (
              <Attachment data={item} onRemove={() => remove(item.id)}>
                <AttachmentPreview />
                <AttachmentRemove />
              </Attachment>
            )}
          </For>
        </Attachments>
        <button
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setItems([...sampleAttachments])}
        >
          Reset
        </button>
      </div>
    );
  },
  ...src(`<Attachments variant="grid">
  <For each={items()}>
    {(item) => (
      <Attachment data={item} onRemove={() => remove(item.id)}>
        <AttachmentPreview />
        <AttachmentRemove />
      </Attachment>
    )}
  </For>
</Attachments>`),
};

export const Inline: Story = {
  render: () => {
    const [items, setItems] = createSignal([...sampleAttachments]);
    const remove = (id: string) => setItems((prev) => prev.filter((a) => a.id !== id));
    return (
      <div class="space-y-4">
        <Attachments variant="inline">
          <For each={items()}>
            {(item) => (
              <Attachment data={item} onRemove={() => remove(item.id)}>
                <AttachmentPreview />
                <AttachmentInfo />
                <AttachmentRemove />
              </Attachment>
            )}
          </For>
        </Attachments>
        <button
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setItems([...sampleAttachments])}
        >
          Reset
        </button>
      </div>
    );
  },
  ...src(`<Attachments variant="inline">
  <For each={items()}>
    {(item) => (
      <Attachment data={item} onRemove={() => remove(item.id)}>
        <AttachmentPreview />
        <AttachmentInfo />
        <AttachmentRemove />
      </Attachment>
    )}
  </For>
</Attachments>`),
};

export const List: Story = {
  render: () => {
    const [items, setItems] = createSignal([...sampleAttachments]);
    const remove = (id: string) => setItems((prev) => prev.filter((a) => a.id !== id));
    return (
      <div class="w-96 space-y-4">
        <Attachments variant="list">
          <For each={items()}>
            {(item) => (
              <Attachment data={item} onRemove={() => remove(item.id)}>
                <AttachmentPreview />
                <AttachmentInfo showMediaType />
                <AttachmentRemove />
              </Attachment>
            )}
          </For>
        </Attachments>
        <button
          class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setItems([...sampleAttachments])}
        >
          Reset
        </button>
      </div>
    );
  },
  ...src(`<Attachments variant="list">
  <For each={items()}>
    {(item) => (
      <Attachment data={item} onRemove={() => remove(item.id)}>
        <AttachmentPreview />
        <AttachmentInfo showMediaType />
        <AttachmentRemove />
      </Attachment>
    )}
  </For>
</Attachments>`),
};

export const WithHoverCard: Story = {
  render: () => (
    <Attachments variant="grid">
      <AttachmentHoverCard>
        <AttachmentHoverCardTrigger>
          <Attachment
            data={{
              id: '1',
              type: 'file',
              filename: 'mountain-landscape.jpg',
              mediaType: 'image/jpeg',
              url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=400&fit=crop',
            }}
          >
            <AttachmentPreview />
          </Attachment>
        </AttachmentHoverCardTrigger>
        <AttachmentHoverCardContent>
          <img
            src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop"
            alt="Mountain landscape"
            class="max-w-xs rounded"
          />
        </AttachmentHoverCardContent>
      </AttachmentHoverCard>
    </Attachments>
  ),
  ...src(`<Attachments variant="grid">
  <AttachmentHoverCard>
    <AttachmentHoverCardTrigger>
      <Attachment data={item}>
        <AttachmentPreview />
      </Attachment>
    </AttachmentHoverCardTrigger>
    <AttachmentHoverCardContent>
      <img src={item.url} alt={item.filename} class="max-w-xs rounded" />
    </AttachmentHoverCardContent>
  </AttachmentHoverCard>
</Attachments>`),
};

export const Empty: Story = {
  render: () => (
    <Attachments variant="grid">
      <AttachmentEmpty />
    </Attachments>
  ),
  ...src(`<Attachments variant="grid">
  <AttachmentEmpty />
</Attachments>`),
};
