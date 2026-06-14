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

const PLAYGROUND_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-card heading="Invite teammates" description="They'll get an email to join.">
  <p>Add the people you want in this workspace.</p>
  <div slot="actions">
    <button>Cancel</button>
    <button>Send invites</button>
  </div>
</kc-card>

<script type="module">
  import '@kitnai/chat/elements'; // registers the custom elements
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
        '**It emits no events and reads no context** — it is chrome only. The cards that compose it (e.g. `<kc-form>`) own the Card-contract interaction. It ships public so you can also use it as a plain themed surface.',
        "**How to use:** register once with `import '@kitnai/chat/elements'`, set `heading`/`description` attributes, drop body markup in the default slot, footer buttons in `slot=\"actions\"`, and media in `slot=\"media\"`. Set `error-message` to render the standard inline error (it replaces the body/actions).",
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Heading + description + body + two footer buttons. */
export const Playground: Story = {
  render: () => (
    <Frame>
      <kc-card heading="Invite teammates" description="They'll get an email to join.">
        <p style={{ margin: 0 }}>Add the people you want in this workspace.</p>
        <div slot="actions" style={{ display: 'flex', gap: '8px' }}>
          <button>Cancel</button>
          <button>Send invites</button>
        </div>
      </kc-card>
    </Frame>
  ),
  parameters: { docs: { source: { code: PLAYGROUND_SNIPPET, language: 'html' } } },
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
