import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './link-preview'; // side effect: registers <kc-link-preview>
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { LinkPreviewData } from '../primitives/link-preview';
import { configureLinkPreview } from '../primitives/link-preview';
import type { CardEvent } from '../primitives/card-contract';

// Custom DOM element — declare the tag for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-link-preview': JSX.HTMLAttributes<HTMLElement> & {
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type LinkPreviewEl = HTMLElement & { cardId?: string; data?: LinkPreviewData };

/** A sized box the card sits in (cards expand to their container width). */
function Frame(props: { children: JSX.Element }) {
  return <div style={{ width: '100%', 'max-width': '420px' }}>{props.children}</div>;
}

/** Mounts a <kc-link-preview>, sets `.data`, logs emitted CardEvents under the render. */
function LinkPreviewDemo(props: { cardId: string; data: LinkPreviewData }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  let el: LinkPreviewEl | undefined;
  onMount(() => {
    if (!el) return;
    el.cardId = props.cardId;
    el.data = props.data;
    el.addEventListener('kc-card', (e) => {
      const detail = (e as CustomEvent<CardEvent>).detail;
      setLog((prev) => [...prev, detail]);
      if (detail.kind === 'open' && detail.target === 'tab') {
        window.open(detail.url, '_blank', 'noopener,noreferrer');
      }
    });
  });
  return (
    <Frame>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <kc-link-preview ref={(e) => (el = e as LinkPreviewEl)} card-id={props.cardId} />
        <pre
          style={{
            margin: 0,
            'max-height': '180px',
            overflow: 'auto',
            background: 'var(--color-muted, #f4f4f5)',
            'border-radius': '8px',
            padding: '8px',
            'font-size': '12px',
          }}
        >
          {log().length === 0 ? '// emitted CardEvents appear here' : JSON.stringify(log(), null, 2)}
        </pre>
      </div>
    </Frame>
  );
}

const FULL_ENVELOPE = {
  type: 'link',
  id: 'card-link-1',
  title: 'Shared link',
  data: {
    url: 'https://example.com/blog/generative-ui',
    title: 'Generative UI, explained',
    description:
      'How agents render typed, themed cards in the chat — across native components and provider iframes.',
    image: 'https://placehold.co/1200x630/6366f1/ffffff/png?text=Generative+UI',
    imageAlt: 'Diagram of the card contract',
    favicon: 'https://example.com/favicon.ico',
    siteName: 'Example Blog',
    domain: 'example.com',
  },
} satisfies { type: string; id: string; title: string; data: LinkPreviewData };

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-link-preview id="lc"></kc-link-preview>

<script type="module">
  import '@kitn.ai/chat/elements'; // registers the custom elements

  const lc = document.getElementById('lc');
  lc.cardId = 'card-link-1';
  // \`data\` is a JS property (the CardEnvelope \`data\`):
  lc.data = ${JSON.stringify(FULL_ENVELOPE.data, null, 2).replace(/\n/g, '\n  ')};

  // Cards bubble a composed \`kc-card\` event carrying a typed CardEvent.
  // kc-link-preview emits: ready (on mount), open (on click), error (invalid/broken url).
  lc.addEventListener('kc-card', (e) => {
    const ev = e.detail; // CardEvent
    if (ev.kind === 'open' && ev.target === 'tab') {
      window.open(ev.url, '_blank', 'noopener,noreferrer');
    }
  });
</script>`;

const meta = {
  title: 'Generative UI/Cards/kc-link-preview',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-link-preview'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-link-preview', [
        '`<kc-link-preview>` is a themed, accessible **rich link / Open-Graph preview** card for the generative-UI feature. It speaks the **Card Contract**: data down (a `link` `CardEnvelope`), events up (only the `open` verb, plus lifecycle `ready` / failure `error`).',
        '**Pure by default:** the card renders from the metadata you supply (`title`, `description`, `image`, `favicon`, `siteName`, `domain`) — it **never fetches**. For the bare-`{ url }` case, an app may opt in to a resolver with `configureLinkPreview({ fetchMetadata })` (CORS means OG scraping needs YOUR backend; there is no built-in network call).',
        '**Interaction:** the whole card is one link target. Activating it (click / Enter / Space) dispatches the bubbling, composed **`kc-card`** event with `{ kind: \'open\', url, target: \'tab\' }` so a host-level listener routes it through `CardPolicy` (which performs the navigation, after scheme validation).',
        '**Graceful degradation:** a missing/broken image drops the image region (not an error); an invalid url renders a non-clickable "Invalid link" chip and emits one `error`.',
        'See the **Code** tab for the `CardEnvelope` JSON + HTML wiring.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Full OG metadata — image, site name, title, description. Click the card to see the emitted `open` event. */
export const FullPreview: Story = {
  name: 'Full preview',
  render: () => <LinkPreviewDemo cardId={FULL_ENVELOPE.id} data={FULL_ENVELOPE.data} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** No image — the card degrades gracefully to the text + domain layout. */
export const NoImage: Story = {
  name: 'No image',
  render: () => (
    <LinkPreviewDemo
      cardId="card-link-2"
      data={{
        url: 'https://docs.example.com/guide',
        title: 'API Guide',
        description: 'Reference for the public endpoints, auth, and rate limits.',
        siteName: 'Example Docs',
      }}
    />
  ),
  parameters: {
    docs: {
      source: {
        code: JSON.stringify(
          {
            type: 'link',
            id: 'card-link-2',
            data: {
              url: 'https://docs.example.com/guide',
              title: 'API Guide',
              description: 'Reference for the public endpoints, auth, and rate limits.',
              siteName: 'Example Docs',
            },
          },
          null,
          2,
        ),
        language: 'json',
      },
    },
  },
};

/** Bare URL + a configured fetcher — shows the skeleton → merged render path. */
export const BareUrlWithFetcher: Story = {
  name: 'Bare URL + fetcher',
  render: () => {
    // Demo only: an app would point this at its own backend/proxy.
    configureLinkPreview({
      fetchMetadata: async (url) => {
        await new Promise((r) => setTimeout(r, 900)); // show the skeleton
        return {
          title: 'Resolved by your backend',
          description: `Metadata for ${url} fetched via configureLinkPreview.`,
          siteName: 'example.com',
        };
      },
    });
    return <LinkPreviewDemo cardId="card-link-3" data={{ url: 'https://example.com/bare' }} />;
  },
  parameters: {
    docs: {
      source: {
        code: `import { configureLinkPreview } from '@kitn.ai/chat';

// Opt in once (points at YOUR backend/proxy — there is no built-in network call):
configureLinkPreview({
  fetchMetadata: (url) => fetch('/api/og?url=' + encodeURIComponent(url)).then((r) => r.json()),
});

// Then a bare { url } envelope resolves to a full preview:
lc.data = { url: 'https://example.com/bare' };`,
        language: 'ts',
      },
    },
  },
};

/** Invalid link — a non-clickable error chip; one `error` event is emitted (visible in the log below). */
export const InvalidLink: Story = {
  name: 'Invalid link',
  render: () => <LinkPreviewDemo cardId="card-link-4" data={{ url: 'not-a-valid-url' }} />,
};
