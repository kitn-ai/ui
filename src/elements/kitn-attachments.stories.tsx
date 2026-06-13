import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import type { AttachmentData } from '../components/attachments';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-attachments': JSX.HTMLAttributes<HTMLElement>;
    }
  }
}

function imgData(fill: string, glyph: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="12" fill="${fill}"/><text x="48" y="60" font-size="42" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const sampleItems: AttachmentData[] = [
  { id: '1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: imgData('#7c3aed', '◆') },
  { id: '2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  { id: '3', type: 'source-document', title: 'kitn.dev/docs', filename: 'kitn.dev' },
];

/** Render the actual `<kitn-attachments>` custom element with an `items` property. */
function AttachmentsElement(props: { variant?: string; removable?: boolean }) {
  let el: (HTMLElement & { items?: AttachmentData[] }) | undefined;
  onMount(() => {
    if (el) {
      el.items = sampleItems;
      if (props.variant) el.setAttribute('variant', props.variant);
      if (props.removable) {
        el.setAttribute('removable', '');
        el.addEventListener('remove', ((e: CustomEvent<{ id: string }>) => {
          el!.items = (el!.items ?? []).filter((x) => x.id !== e.detail.id);
        }) as EventListener);
      }
    }
  });
  return (
    <kitn-attachments ref={(e) => (el = e as HTMLElement)} style={{ display: 'block', padding: '16px', 'max-width': '720px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-attachments id="att" variant="grid" removable></kitn-attachments>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const att = document.getElementById('att');
  att.items = [
    { id: '1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: '...' },
    { id: '2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  ];

  // events are CustomEvents on the element (they do not bubble)
  att.addEventListener('remove', (e) => {
    att.items = att.items.filter((x) => x.id !== e.detail.id);
  });
</script>`;

const meta = {
  title: 'Web Components/kitn-attachments',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-attachments>` is the framework-agnostic **web component** for a set of file/source attachments, and the exemplar for the "collapse a compound primitive to ONE configurable element" pattern: the sub-parts the SolidJS layer composes become attributes here. Isolated in **Shadow DOM**.',
          '**When to use:** rendering attachment chips/tiles in a non-Solid app. In SolidJS, compose the `Attachment*` primitives for fully custom layouts.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the data via the `items` **property**, pick a layout with `variant` (`grid` | `inline` | `list`), add `removable` to get per-item remove buttons (emits a `remove` **CustomEvent** with `{ id }`), and `hover-card` for inline previews.",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Visual tiles (the default `grid` variant). */
export const Grid: Story = {
  render: () => <AttachmentsElement variant="grid" />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Icon + label chips. */
export const Inline: Story = {
  render: () => <AttachmentsElement variant="inline" />,
};

/** Removable rows — clicking the remove button fires a `remove` event. */
export const RemovableList: Story = {
  name: 'Removable List',
  render: () => <AttachmentsElement variant="list" removable />,
};
