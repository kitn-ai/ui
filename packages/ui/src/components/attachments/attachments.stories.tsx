import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, For, Show } from 'solid-js';
import { action } from 'storybook/actions';
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
  useAttachmentsContext,
} from './attachments';
import type { AttachmentData, AttachmentsProps } from './attachments';
import {
  Lightbox,
  LightboxTrigger,
  LightboxContent,
} from '../lightbox/lightbox';
import { componentDescription } from '../../stories/docs/web-component-controls';

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
        'A composable container for files a user attached to a prompt or documents a message cites. Built from `Attachments` plus per-item `Attachment` with `AttachmentPreview`, `AttachmentInfo`, and `AttachmentRemove` parts.',
        'Set `variant`: `grid` (thumbnails), `inline` (compact chips), or `list` (detailed rows). Pass each item via `data` and an `onRemove` handler.',
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
    imagePreview: {
      control: 'select',
      options: ['hover', 'lightbox'],
      description:
        'How an image tile reveals its full size: a pointer-only hover card, or a click-to-open lightbox. Read by the tile from context; a non-image tile always keeps the hover card.',
      table: { defaultValue: { summary: 'hover' } },
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
    variant: 'grid' as const,
  },
  // `onRemove` lives on each child `Attachment`, not the container, so it isn't a
  // story arg; route it straight to the Actions panel via `action('remove')`.
  render: (args) => {
    const [items, setItems] = createSignal([...sampleAttachments]);
    const remove = (id: string) => { action('remove')(id); setItems((prev) => prev.filter((a) => a.id !== id)); };
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

/**
 * The image tile from `sampleAttachments`, rendered the way the thread renders
 * it: which affordance shows the full image is chosen by `imagePreview`, read
 * from context. It is a component and not inline markup because
 * `useAttachmentsContext()` resolves from the OWNER scope — the read has to sit
 * below the `<Attachments>` provider, or it finds nothing and always takes the
 * `'hover'` fallback.
 */
function ImageTile() {
  const ctx = useAttachmentsContext();
  const item = sampleAttachments[0];
  return (
    <Attachment data={item}>
      <Show
        when={ctx.imagePreview === 'lightbox'}
        fallback={
          <AttachmentHoverCard>
            <AttachmentHoverCardTrigger class="block size-full">
              <AttachmentPreview />
            </AttachmentHoverCardTrigger>
            <AttachmentHoverCardContent>
              <img alt={item.filename} class="block max-w-xs rounded object-contain" src={item.url} />
            </AttachmentHoverCardContent>
          </AttachmentHoverCard>
        }
      >
        <Lightbox>
          <LightboxTrigger class="block size-full">
            <AttachmentPreview />
          </LightboxTrigger>
          <LightboxContent label={item.filename}>
            <img alt={item.filename} class="block object-contain" src={item.url} />
          </LightboxContent>
        </Lightbox>
      </Show>
    </Attachment>
  );
}

const IMPORT = `import {
  Attachments, Attachment, AttachmentPreview, AttachmentInfo, AttachmentRemove,
  AttachmentHoverCard, AttachmentHoverCardTrigger, AttachmentHoverCardContent,
  Lightbox, LightboxTrigger, LightboxContent,
  AttachmentEmpty, useAttachmentsContext,
  type AttachmentData,
} from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: switch `variant` to compare grid / inline / list. */
export const Playground: Story = {
  ...src(`// Each item is an AttachmentData, a file or a cited source-document.
const [items, setItems] = createSignal<AttachmentData[]>([
  { id: '1', type: 'file', filename: 'mountain.jpg', mediaType: 'image/jpeg',
    url: 'https://…/mountain.jpg' },
  { id: '2', type: 'file', filename: 'report.pdf', mediaType: 'application/pdf' },
  { id: '3', type: 'source-document', filename: 'SolidJS Docs',
    title: 'Reactivity Guide', url: 'https://solidjs.com/docs' },
]);
const remove = (id: string) => setItems((prev) => prev.filter((a) => a.id !== id));

<Attachments variant="grid">
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
    const remove = (id: string) => { action('remove')(id); setItems((prev) => prev.filter((a) => a.id !== id)); };
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
    const remove = (id: string) => { action('remove')(id); setItems((prev) => prev.filter((a) => a.id !== id)); };
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
    const remove = (id: string) => { action('remove')(id); setItems((prev) => prev.filter((a) => a.id !== id)); };
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
  ...src(`// Wrap a single Attachment in a hover card to preview the full asset.
const item: AttachmentData = {
  id: '1', type: 'file', filename: 'mountain.jpg', mediaType: 'image/jpeg',
  url: 'https://…/mountain.jpg',
};

<Attachments variant="grid">
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

/** Click the thumbnail: the full image opens as a modal, and Escape or a
 *  backdrop click closes it. Switch `imagePreview` to `hover` to compare the two
 *  affordances. */
// Named `LightboxTile`, not `Lightbox`: a story's own name is a binding in this
// module, and one that shadows an imported kit export makes the snippet lint read
// the story as the component it is demonstrating. See rule (i) in
// scripts/lint-story-conventions.mjs.
export const LightboxTile: Story = {
  args: { imagePreview: 'lightbox' },
  render: (args: AttachmentsProps) => (
    <Attachments variant="grid" imagePreview={args.imagePreview}>
      <ImageTile />
    </Attachments>
  ),
  ...src(`// The container names the affordance; the image tile branches on it.
const item: AttachmentData = {
  id: '1', type: 'file', filename: 'mountain.jpg', mediaType: 'image/jpeg',
  url: 'https://…/mountain.jpg',
};

<Attachments variant="grid" imagePreview="lightbox">
  <Attachment data={item}>
    <Lightbox>
      <LightboxTrigger class="block size-full">
        <AttachmentPreview />
      </LightboxTrigger>
      <LightboxContent label={item.filename}>
        <img src={item.url} alt={item.filename} class="block object-contain" />
      </LightboxContent>
    </Lightbox>
  </Attachment>
</Attachments>`),
};

/** The modal with no click at all: `defaultOpen` seeds it open for a screenshot
 *  or a first-run tour. The trio is composed directly here because only the
 *  lightbox owns that state (an `Attachments` grid composes it per tile).
 *
 *  A JSX child can never ride in `args` — it cannot cross the Storybook
 *  manager/preview boundary — so this story's markup lives in `render` and its
 *  args stay empty. */
export const LightboxOpenAtMount: Story = {
  render: () => (
    <Lightbox defaultOpen>
      <LightboxTrigger class="block size-24 overflow-hidden rounded-lg">
        <img
          alt={sampleAttachments[0].filename}
          class="size-full object-cover"
          src={sampleAttachments[0].url}
        />
      </LightboxTrigger>
      <LightboxContent label={sampleAttachments[0].filename}>
        <img
          alt={sampleAttachments[0].filename}
          class="block object-contain"
          src={sampleAttachments[0].url}
        />
      </LightboxContent>
    </Lightbox>
  ),
  ...src(`// Open at mount: 'defaultOpen' is the uncontrolled seed. Drive it yourself
// with 'open' + onOpenChange for controlled use.
const item: AttachmentData = {
  id: '1', type: 'file', filename: 'mountain.jpg', mediaType: 'image/jpeg',
  url: 'https://…/mountain.jpg',
};

<Lightbox defaultOpen>
  <LightboxTrigger class="block size-24 overflow-hidden rounded-lg">
    <img src={item.url} alt={item.filename} class="size-full object-cover" />
  </LightboxTrigger>
  <LightboxContent label={item.filename}>
    <img src={item.url} alt={item.filename} class="block object-contain" />
  </LightboxContent>
</Lightbox>`),
};
