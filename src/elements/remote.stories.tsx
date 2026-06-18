import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, createEffect, onMount, onCleanup, type JSX } from 'solid-js';
import './remote';
import type { CardEnvelope, CardEvent, CardHost } from '../primitives/card-contract';
import { formRenderer, infoRenderer } from '../../examples/remote-provider/renderers';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-remote': JSX.HTMLAttributes<HTMLElement> & {
        src?: string;
        'provider-origin'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type RemoteEl = HTMLElement & { envelope?: CardEnvelope; policy?: Record<string, unknown> };

/**
 * The live cross-origin demo only works in **local Storybook dev** (`npm run storybook`):
 * there, `.storybook/main.ts`'s Vite pipeline serves the reference provider at
 * `/remote-provider/`, and we frame it via the `127.0.0.1` alias of the SAME dev server
 * — a genuinely different origin from the `localhost` preview, so `<kc-remote>`'s
 * cross-origin precondition (provider ≠ host) holds.
 *
 * A **static, single-origin deploy** (e.g. the GitHub Pages docs) cannot do this: there
 * is no second origin and the provider isn't served. So `liveProvider()` returns `null`
 * there and the stories render an explanatory panel instead of a doomed mount. The real
 * cross-origin behavior is verified by the standalone Playwright suite (H-L).
 */
function liveProvider(): { origin: string; src: string } | null {
  if (typeof window === 'undefined') return null;
  // The deployed/built Storybook (PROD) is single-origin + has no provider middleware.
  if (import.meta.env.PROD) return null;
  const here = new URL(window.location.href);
  if ((here.hostname !== 'localhost' && here.hostname !== '127.0.0.1') || !here.port) return null;
  // Swap localhost ↔ 127.0.0.1 to obtain a cross-origin sibling of the dev server.
  const alias = here.hostname === '127.0.0.1' ? 'localhost' : '127.0.0.1';
  const origin = `${here.protocol}//${alias}:${here.port}`;
  return { origin, src: `${origin}/remote-provider/` };
}

const FORM_ENVELOPE: CardEnvelope = {
  type: 'form',
  id: 'remote-form-1',
  title: 'Quick question',
  data: {
    type: 'object',
    required: ['email'],
    properties: {
      email: { type: 'string', title: 'Email', format: 'email' },
      role: { type: 'string', title: 'Role', enum: ['Engineer', 'Designer', 'PM'] },
    },
    'x-kc-submitLabel': 'Send',
  },
};

const WEATHER_ENVELOPE: CardEnvelope = {
  type: 'info',
  id: 'remote-info-1',
  title: 'San Francisco',
  data: {
    location: 'San Francisco',
    temperature: 18,
    unit: '°C',
    condition: 'Partly cloudy',
    humidity: 64,
    wind: 12,
    feelsLike: 17,
    forecast: [
      { day: 'Mon', high: 19, low: 12 },
      { day: 'Tue', high: 21, low: 13 },
      { day: 'Wed', high: 17, low: 11 },
    ],
  },
};

/** The Storybook theme mode, read the way the kit elements do (preview.ts mirrors
 *  the resolved Storybook theme by toggling `.dark` on the <html>). Falls back to
 *  the OS preference when not in the Storybook shell. */
function readThemeMode(): 'light' | 'dark' {
  if (typeof document === 'undefined') return 'light';
  if (document.documentElement.classList.contains('dark')) return 'dark';
  if (document.documentElement.classList.contains('light')) return 'light';
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

/** Pick the matching provider renderer for a card type (the SAME renderers the live
 *  cross-origin provider registers), or null for an unhandled type. */
function rendererFor(type: string) {
  if (type === 'form') return formRenderer;
  if (type === 'info') return infoRenderer;
  return null;
}

/** Mounts a <kc-remote> when a live cross-origin provider is available (local dev),
 *  logs every routed CardEvent (via the bubbling kc-card). On a static/deployed
 *  Storybook (no second origin) it renders the SAME provider renderer's output
 *  DIRECTLY — so the docs show the real, interactive card — with a slim honest
 *  banner explaining the production transport. */
function RemoteDemo(props: { envelope: CardEnvelope; src?: string; providerOrigin?: string; showEnvelope?: boolean }) {
  const live = props.providerOrigin && props.src ? { origin: props.providerOrigin, src: props.src } : liveProvider();
  const [log, setLog] = createSignal<CardEvent[]>([]);
  const [mode, setMode] = createSignal<'light' | 'dark'>(readThemeMode());
  let el: RemoteEl | undefined;
  let container: HTMLDivElement | undefined;

  const renderer = rendererFor(props.envelope.type);

  // ── Live (local dev): cross-origin <kc-remote>, exactly as before. ──
  onMount(() => {
    if (!live || !el) return;
    el.envelope = props.envelope;
    const onCard = (e: Event) => {
      const detail = (e as CustomEvent<CardEvent>).detail;
      setLog((prev) => [...prev, detail]);
    };
    el.addEventListener('kc-card', onCard);
    onCleanup(() => el?.removeEventListener('kc-card', onCard));
  });

  // ── Static (deployed): render the real card content directly, reusing the
  //    provider renderer. Re-mount when the theme mode changes so the ThemePush
  //    story still means something on static. ──
  if (!live && renderer) {
    // Track Storybook's light/dark toggle (preview.ts flips `.dark` on <html>).
    onMount(() => {
      if (typeof MutationObserver === 'undefined') return;
      const obs = new MutationObserver(() => setMode(readThemeMode()));
      obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      onCleanup(() => obs.disconnect());
    });

    createEffect(() => {
      const m = mode(); // re-run on theme change
      if (!container) return;
      const stubHost: CardHost = {
        context: () => ({ theme: { mode: m }, locale: 'en' }),
        emit: (e) => setLog((prev) => [...prev, e]),
      };
      const dispose = renderer.mount(container, props.envelope, stubHost);
      onCleanup(() => {
        try { dispose(); } catch { /* renderer disposer threw — best-effort */ }
        if (container) container.replaceChildren();
      });
    });
  }

  return (
    <div style={{ display: 'flex', gap: '16px', 'flex-wrap': 'wrap', 'align-items': 'flex-start' }}>
      <div style={{ flex: '1 1 320px', 'min-width': '300px', 'max-width': '460px' }}>
        {live ? (
          <kc-remote ref={(e) => (el = e as RemoteEl)} provider-origin={live.origin} src={live.src} />
        ) : renderer ? (
          <div style={{ display: 'flex', 'flex-direction': 'column', gap: '8px' }}>
            <div
              ref={(e) => (container = e)}
              style={{ border: '1px solid var(--color-border, #e4e4e7)', 'border-radius': '12px', overflow: 'hidden' }}
            />
            <p
              role="note"
              style={{ margin: 0, 'font-size': '12px', 'line-height': '1.5', color: 'var(--color-muted-foreground, #71717a)' }}
            >
              Rendered directly for these static docs. In production <code>&lt;kc-remote&gt;</code> delivers this over a
              sandboxed cross-origin iframe — run <code>npm run storybook</code> for the live transport; the cross-origin
              model is verified by the Playwright suite.
            </p>
          </div>
        ) : (
          <div
            role="note"
            style={{
              border: '1px dashed var(--color-border, #d4d4d8)', 'border-radius': '12px',
              padding: '16px', 'font-size': '13px', 'line-height': '1.55', color: 'var(--color-foreground, #18181b)',
            }}
          >
            <strong>Live cross-origin demo runs in local Storybook</strong>
            <p style={{ margin: '8px 0 0' }}>
              <code>&lt;kc-remote&gt;</code> delivers this card over a sandboxed{' '}
              <strong>cross-origin</strong> <code>&lt;iframe&gt;</code>, which needs a second
              origin and the reference provider served by the dev server. Run{' '}
              <code>npm run storybook</code> to see it live; the cross-origin transport is
              verified by the Playwright e2e matrix.
            </p>
          </div>
        )}
      </div>
      <div style={{ flex: '1 1 280px', 'min-width': '260px', display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        {props.showEnvelope && (
          <pre style={{ margin: 0, 'font-size': '12px', background: 'var(--color-muted, #f4f4f5)', 'border-radius': '8px', padding: '8px', overflow: 'auto' }}>
            {`// CardEnvelope sent down the wire (inside a WireFrame):\n` + JSON.stringify(props.envelope, null, 2)}
          </pre>
        )}
        <pre style={{ margin: 0, 'max-height': '200px', overflow: 'auto', background: 'var(--color-muted, #f4f4f5)', 'border-radius': '8px', padding: '8px', 'font-size': '12px' }}>
          {log().length === 0 ? '// routed CardEvents appear here' : JSON.stringify(log(), null, 2)}
        </pre>
      </div>
    </div>
  );
}

const HTML_SNIPPET = (envelope: CardEnvelope) => `<kc-remote
  provider-origin="https://cards.provider.example"
  src="https://cards.provider.example/card"
></kc-remote>
<script type="module">
  import '@kitn.ai/ui/elements'; // registers <kc-remote>

  const el = document.querySelector('kc-remote');
  // The CardEnvelope is set as a JS PROPERTY (it travels down the wire unchanged).
  el.envelope = ${JSON.stringify(envelope, null, 2)};

  // Every routed CardEvent is re-emitted as a bubbling kc-card CustomEvent.
  el.addEventListener('kc-card', (e) => {
    if (e.detail.kind === 'submit') console.log('submitted', e.detail.data);
  });

  // Or pass a CardPolicy directly (same shape native cards use):
  // el.policy = { onSubmit: (cardId, data) => save(data) };
</script>`;

const meta = {
  title: 'Generative UI/Remote/kc-remote',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    // axe can't read a CROSS-ORIGIN frame's tree (that's the provider's a11y
    // obligation, proven by the provider's own stories/tests); scope axe to the
    // HOST page only — the iframe boundary + any inline fallback regions (H-L).
    a11y: { context: { exclude: [['iframe']] } },
    docs: {
      description: {
        component:
          "`<kc-remote>` mounts a **sandboxed cross-origin `<iframe>`** card from a card *provider* and bridges it to the host over `postMessage` — the SAME `CardEnvelope`/`CardContext`/`CardEvent` shapes as native cards, routed through the SAME `CardPolicy`. " +
          'It pins the provider **origin + source window + a per-instance nonce + the negotiated protocol version** on every inbound frame, auto-sizes the iframe from the card’s reported height, pushes theme/locale context, and re-emits every routed event as a bubbling **`kc-card`** CustomEvent. ' +
          'These stories frame the reference provider (`examples/remote-provider/`) served by Storybook over its `127.0.0.1` alias so the precondition (provider ≠ host origin) holds; the full cross-origin **security matrix** is the standalone Playwright suite.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Happy path: the framed provider renders a `<kc-form>`; submitting it crosses the
 *  origin boundary and the routed `submit` is logged. The CardEnvelope is shown too. */
export const RemoteForm: Story = {
  name: 'Remote form (happy path)',
  render: () => <RemoteDemo envelope={FORM_ENVELOPE} showEnvelope />,
  parameters: { docs: { source: { code: HTML_SNIPPET(FORM_ENVELOPE), language: 'html' } } },
};

/** Auto-height: the self-contained card’s `<details>` forecast toggle grows the
 *  content; the runtime reports a larger `resize` and the host enlarges the iframe. */
export const AutoHeight: Story = {
  name: 'Auto-height',
  render: () => <RemoteDemo envelope={WEATHER_ENVELOPE} />,
  parameters: { docs: { source: { code: HTML_SNIPPET(WEATHER_ENVELOPE), language: 'html' } } },
};

/** Theme push: toggle the Storybook light/dark toolbar — the host re-pushes
 *  `context` and the framed card re-themes live (no reload). */
export const ThemePush: Story = {
  name: 'Theme push',
  render: () => <RemoteDemo envelope={WEATHER_ENVELOPE} />,
  parameters: { docs: { source: { code: HTML_SNIPPET(WEATHER_ENVELOPE), language: 'html' } } },
};

/** Self-contained display card: a rich, read-only weather view rendered entirely
 *  from `envelope.data` inside the provider. It is internally interactive (the
 *  forecast toggle) but emits NOTHING back to the host — the zero-round-trip
 *  pattern. The bridge still auto-sizes it. */
export const SelfContained: Story = {
  name: 'Self-contained display',
  render: () => <RemoteDemo envelope={WEATHER_ENVELOPE} showEnvelope />,
  parameters: { docs: { source: { code: HTML_SNIPPET(WEATHER_ENVELOPE), language: 'html' } } },
};

/** Failure: an invalid `provider-origin` (a wildcard) is rejected before any mount
 *  — <kc-remote> renders an inline accessible error instead of an iframe. (A bad
 *  `src` that loads but never handshakes shows the SDK’s inline fallback + Retry;
 *  that path is exercised end-to-end by the Playwright suite.) */
export const Failure: Story = {
  name: 'Failure: bad provider-origin',
  render: () => {
    let el: RemoteEl | undefined;
    onMount(() => {
      if (el) el.envelope = FORM_ENVELOPE;
    });
    return (
      <div style={{ 'max-width': '460px' }}>
        <kc-remote ref={(e) => (el = e as RemoteEl)} provider-origin="*" src="https://cards.provider.example/card" />
      </div>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `<!-- provider-origin must be a single absolute origin (https, or http://localhost for dev). -->
<kc-remote provider-origin="*" src="https://cards.provider.example/card"></kc-remote>
<script type="module">
  import '@kitn.ai/ui/elements';
  document.querySelector('kc-remote').envelope = ${JSON.stringify(FORM_ENVELOPE, null, 2)};
  // "*" is rejected → an inline accessible error renders instead of an iframe.
</script>`,
        language: 'html',
      },
    },
  },
};
