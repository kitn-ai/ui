import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount, onCleanup, type JSX } from 'solid-js';
import './embed'; // side effect: registers <kc-embed>
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { EmbedCardData } from '../primitives/embed-providers';
import { configureEmbedAllowlist } from '../primitives/embed-providers';

// Custom DOM element — declare the tag for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-embed': JSX.HTMLAttributes<HTMLElement> & {
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

/** A sized box the embed sits in. */
function Frame(props: { children: JSX.Element }) {
  return <div style={{ width: '100%', 'max-width': '560px' }}>{props.children}</div>;
}

/** Mount a kc-embed, set its `data` property, and route `open` to a console log. */
function Embed(props: { cardId: string; data: EmbedCardData }) {
  let el: HTMLElement & { cardId?: string; data?: EmbedCardData };
  const onCard = (e: Event) => {
    const ev = (e as CustomEvent).detail;
    // eslint-disable-next-line no-console
    console.log('[kc-card]', ev);
    if (ev.kind === 'open' && ev.target === 'tab') {
      window.open(ev.url, '_blank', 'noopener,noreferrer');
    }
  };
  onMount(() => {
    if (el) {
      el.cardId = props.cardId;
      el.data = props.data;
    }
    document.addEventListener('kc-card', onCard);
    onCleanup(() => document.removeEventListener('kc-card', onCard));
  });
  return (
    <Frame>
      <kc-embed ref={(e) => (el = e as HTMLElement & { cardId?: string; data?: EmbedCardData })} />
    </Frame>
  );
}

const YT_ENVELOPE = {
  type: 'embed',
  id: 'card-embed-1',
  title: 'Intro video',
  data: { provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Product intro', aspectRatio: '16:9' },
} satisfies { type: string; id: string; title: string; data: EmbedCardData };

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-embed id="em"></kc-embed>

<script type="module">
  import '@kitn.ai/chat/elements'; // registers the custom elements

  const em = document.getElementById('em');
  em.cardId = 'card-embed-1';
  // \`data\` is a JS property (the CardEnvelope \`data\`):
  em.data = { provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Product intro' };

  // NO network to YouTube until the user clicks play (privacy-first lazy facade).
  // The optional "Open on YouTube" affordance bubbles a composed \`kc-card\` open event:
  document.addEventListener('kc-card', (e) => {
    const ev = e.detail;
    if (ev.kind === 'open' && ev.target === 'tab') {
      window.open(ev.url, '_blank', 'noopener,noreferrer');
    }
  });
</script>`;

const meta = {
  title: 'Generative UI/Cards/kc-embed',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-embed'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-embed', [
        '`<kc-embed>` is a **privacy-first lazy media embed** (YouTube / Vimeo / allowlisted generic player) for the generative-UI feature. It speaks the **Card Contract**: data down (an `embed` `CardEnvelope`), events up (only the `open` verb, plus lifecycle `ready` / failure `error`).',
        '**Lazy facade:** the initial render is just a **poster + play button** — NO provider iframe, NO third-party JS, NO cookies until the user clicks play. YouTube loads via `youtube-nocookie.com`; Vimeo with `dnt=1`. This buys privacy (no tracking until opt-in) and performance (no player JS on load).',
        '**Security:** `generic` embeds frame an arbitrary https URL, so they are **rejected unless the app allowlists their origin** with `configureEmbedAllowlist([...])` (defaults to empty — an agent cannot frame an arbitrary origin). The player iframe is sandboxed for a *trusted provider* (`allow-scripts allow-same-origin` on a cross-origin player) — contrast `<kc-artifact>`, which trusts nothing.',
        '**Never a dead end:** a persistent "Open on {provider}" affordance dispatches the `open` verb (so a provider that refuses framing still has a way out). Set `data` as a JS property; `card-id` via attribute.',
        'See the **Code** tab for the `CardEnvelope` JSON + HTML wiring.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** YouTube (lazy) — poster + play; the iframe loads (youtube-nocookie) only on click. */
export const YouTube: Story = {
  name: 'YouTube (lazy)',
  render: () => <Embed cardId={YT_ENVELOPE.id} data={YT_ENVELOPE.data} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Vimeo — supply a `poster` (Vimeo has no static thumbnail URL). */
export const Vimeo: Story = {
  render: () => (
    <Embed
      cardId="card-embed-2"
      data={{
        provider: 'vimeo',
        id: '76979871',
        title: 'Vimeo staff pick',
        poster: 'https://placehold.co/1280x720/1ab7ea/ffffff/png?text=Vimeo',
      }}
    />
  ),
};

/** Generic player — an https embed URL whose origin the app has allowlisted. */
export const Generic: Story = {
  name: 'Generic player',
  render: () => {
    configureEmbedAllowlist(['https://www.youtube-nocookie.com']);
    return (
      <Embed
        cardId="card-embed-3"
        data={{
          provider: 'generic',
          url: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
          title: 'Generic embed',
          poster: 'https://placehold.co/1280x720/444/fff/png?text=Generic+player',
        }}
      />
    );
  },
  parameters: {
    docs: {
      source: {
        code: `import { configureEmbedAllowlist } from '@kitn.ai/chat';

// Generic embeds are blocked by default — allowlist the trusted origin first:
configureEmbedAllowlist(['https://your-player.example.com']);

em.data = {
  provider: 'generic',
  url: 'https://your-player.example.com/embed/abc',
  title: 'Generic embed',
  poster: 'https://your-cdn.example.com/poster.jpg',
};`,
        language: 'ts',
      },
    },
  },
};

/** Custom aspect ratio — a vertical 9:16 short. */
export const CustomAspectRatio: Story = {
  name: 'Custom aspect ratio (9:16)',
  render: () => (
    <div style={{ width: '100%', 'max-width': '280px' }}>
      <EmbedRaw
        cardId="card-embed-4"
        data={{ provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Short', aspectRatio: '9:16' }}
      />
    </div>
  ),
};

/** Blocked-embed fallback — the "Open on provider" affordance is always present. */
export const BlockedFallback: Story = {
  name: 'Blocked-embed fallback',
  render: () => <Embed cardId="card-embed-5" data={{ provider: 'youtube', id: 'dQw4w9WgXcQ', title: 'Maybe blocked' }} />,
  parameters: {
    docs: {
      description: {
        story:
          'Some providers refuse framing (X-Frame-Options / CSP `frame-ancestors`). We can\'t detect that cross-origin in JS, so the **"Open on {provider}"** affordance is *always* available — a blocked embed is never a dead end.',
      },
    },
  },
};

// A frame-less variant so the 9:16 story controls its own width.
function EmbedRaw(props: { cardId: string; data: EmbedCardData }) {
  let el: HTMLElement & { cardId?: string; data?: EmbedCardData };
  onMount(() => {
    if (el) {
      el.cardId = props.cardId;
      el.data = props.data;
    }
  });
  return <kc-embed ref={(e) => (el = e as HTMLElement & { cardId?: string; data?: EmbedCardData })} />;
}
