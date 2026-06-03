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

const meta: Meta = {
  title: 'Components/Attachments',
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj;

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

export const Grid: Story = {
  render: () => {
    const [items, setItems] = createSignal([...sampleAttachments]);

    const remove = (id: string) => {
      setItems((prev) => prev.filter((a) => a.id !== id));
    };

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
};

export const Inline: Story = {
  render: () => {
    const [items, setItems] = createSignal([...sampleAttachments]);

    const remove = (id: string) => {
      setItems((prev) => prev.filter((a) => a.id !== id));
    };

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
};

export const List: Story = {
  render: () => {
    const [items, setItems] = createSignal([...sampleAttachments]);

    const remove = (id: string) => {
      setItems((prev) => prev.filter((a) => a.id !== id));
    };

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
};

export const Empty: Story = {
  render: () => (
    <Attachments variant="grid">
      <AttachmentEmpty />
    </Attachments>
  ),
};
