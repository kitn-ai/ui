import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import type { JSX } from 'solid-js';
import './card';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-card': JSX.HTMLAttributes<HTMLElement> & {
        heading?: string;
        description?: string;
        'error-message'?: string;
        dense?: boolean | string;
      };
    }
  }
}

/** A bordered box the card sits inside (gives it a sensible width). */
function Frame(props: { children: JSX.Element }) {
  return <div style={{ 'max-width': '420px' }}>{props.children}</div>;
}

const CONTENT_SNIPPET = `<!-- kc-card is the chrome/container. Slot in plain content — not interactive controls.
     For data-driven interactive cards use the typed cards instead (see below). -->
<kc-card heading="Workspace summary" description="Generated just now.">
  <p>Your repository has 3 open pull requests and 12 passing checks.</p>
</kc-card>

<script type="module">
  import '@kitn.ai/chat/elements'; // registers the custom elements
</script>`;

const MEDIA_SNIPPET = `<kc-card heading="Quarterly report" description="Generated just now.">
  <img slot="media" src="/preview.png" alt="Report preview" />
  <p>Your Q2 numbers are ready to review.</p>
</kc-card>`;

const ERROR_SNIPPET = `<!-- The one consistent inline error every card uses. -->
<kc-card heading="Share your feedback" error-message="This card couldn't be displayed."></kc-card>`;

const meta = {
  title: 'Generative UI/Cards/kc-card',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-card'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-card', [
        '`<kc-card>` is the shared, presentational **card chrome** every native generative-UI card composes from: an optional **media** region (`slot="media"`), a **heading** + **description**, a **body** (default slot), an **actions** footer (`slot="actions"`), and one consistent inline **error** state (`error-message`).',
        '**Chrome only — it emits no events and reads no context.** Raw light-DOM content slotted into `kc-card` (such as plain `<button>` elements) is unstyled because light DOM cannot reach shadow CSS. The cards that compose it own the Card-contract interaction.',
        '**For interactive, data-driven cards use the typed cards:** `<kc-confirm>` (approval actions — see that story for the canonical data-in → event-out example), `<kc-form>` (input/submit), `<kc-choice>` (single-select), `<kc-task-list>` (progress), `<kc-link-card>` (rich link), `<kc-embed>` (media). Use `kc-card` only as a **plain themed surface** for presentational content.',
        "**How to use as a surface:** register once with `import '@kitn.ai/chat/elements'`, set `heading`/`description` attributes, drop body markup in the default slot, and optionally a media region in `slot=\"media\"`. Set `error-message` to render the standard inline error (it replaces the body/actions).",
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** `kc-card` as a plain themed surface: heading + description + slotted text content. This is the correct use of `kc-card` — presentational chrome around passive content. For interactive cards (actions, forms, choices) use the typed cards such as `kc-confirm`. */
export const ContentSurface: Story = {
  name: 'Content surface',
  render: () => (
    <Frame>
      <kc-card heading="Workspace summary" description="Generated just now.">
        <p style={{ margin: 0 }}>Your repository has 3 open pull requests and 12 passing checks.</p>
      </kc-card>
    </Frame>
  ),
  parameters: { docs: { source: { code: CONTENT_SNIPPET, language: 'html' } } },
};

/** An image media region above the heading. */
export const WithMedia: Story = {
  render: () => (
    <Frame>
      <kc-card heading="Quarterly report" description="Generated just now.">
        <div
          slot="media"
          style={{
            height: '120px',
            display: 'grid',
            'place-items': 'center',
            background: 'var(--color-muted, #f4f4f5)',
            color: 'var(--color-muted-foreground, #71717a)',
            'font-size': '13px',
          }}
        >
          media slot
        </div>
        <p style={{ margin: 0 }}>Your Q2 numbers are ready to review.</p>
      </kc-card>
    </Frame>
  ),
  parameters: { docs: { source: { code: MEDIA_SNIPPET, language: 'html' } } },
};

/** The standard inline error state (replaces the body/actions). */
export const ErrorState: Story = {
  render: () => (
    <Frame>
      <kc-card
        heading="Share your feedback"
        error-message="This card couldn't be displayed."
      />
    </Frame>
  ),
  parameters: { docs: { source: { code: ERROR_SNIPPET, language: 'html' } } },
};
