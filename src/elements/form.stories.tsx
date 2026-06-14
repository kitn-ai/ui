import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, type JSX } from 'solid-js';
import './form';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';
import type { FormDefinition } from '../components/form';
import type { CardEvent } from '../primitives/card-contract';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-form': JSX.HTMLAttributes<HTMLElement> & {
        heading?: string;
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type FormEl = HTMLElement & { data?: FormDefinition };

/** A bordered box the form sits inside. */
function Frame(props: { children: JSX.Element }) {
  return <div style={{ 'max-width': '460px' }}>{props.children}</div>;
}

/** Mounts a <kc-form>, sets `.data`, logs the emitted CardEvent under the render. */
function FormDemo(props: { def: FormDefinition; cardId: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  let el: FormEl | undefined;
  onMount(() => {
    if (!el) return;
    el.data = props.def;
    el.addEventListener('kc-card', (e) => {
      const detail = (e as CustomEvent<CardEvent>).detail;
      setLog((prev) => [...prev, detail]);
    });
  });
  return (
    <Frame>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <kc-form ref={(e) => (el = e as FormEl)} card-id={props.cardId} />
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

const FEEDBACK: FormDefinition = {
  type: 'object',
  title: 'How did we do?',
  description: 'Two quick questions.',
  required: ['rating', 'contactOk'],
  'x-kc-order': ['rating', 'comments', 'plan', 'contactOk'],
  'x-kc-submitLabel': 'Send feedback',
  'x-kc-actions': [{ id: 'skip', label: 'Skip', variant: 'ghost' }],
  properties: {
    rating: { type: 'integer', title: 'Overall rating', minimum: 1, maximum: 5, 'x-kc-widget': 'rating' },
    comments: {
      type: 'string',
      title: 'Comments',
      maxLength: 500,
      'x-kc-widget': 'textarea',
      'x-kc-placeholder': "What worked, what didn't…",
    },
    plan: { type: 'string', title: 'Your plan', enum: ['free', 'pro', 'team'], default: 'free' },
    contactOk: { type: 'boolean', title: 'OK to contact me about this', default: false },
  },
};

const ALL_WIDGETS: FormDefinition = {
  type: 'object',
  title: 'Every widget',
  'x-kc-submitLabel': 'Submit all',
  properties: {
    name: { type: 'string', title: 'Name' },
    bio: { type: 'string', title: 'Bio', maxLength: 300 },
    email: { type: 'string', title: 'Email', format: 'email' },
    website: { type: 'string', title: 'Website', format: 'uri' },
    birthday: { type: 'string', title: 'Birthday', format: 'date' },
    secret: { type: 'string', title: 'Password', 'x-kc-widget': 'password' },
    size: { type: 'string', title: 'Size', enum: ['S', 'M', 'L'] },
    country: { type: 'string', title: 'Country', enum: ['US', 'UK', 'DE', 'FR', 'JP'] },
    age: { type: 'integer', title: 'Age', minimum: 0, maximum: 120 },
    volume: { type: 'integer', title: 'Volume', minimum: 0, maximum: 11, 'x-kc-widget': 'slider' },
    stars: { type: 'integer', title: 'Stars', minimum: 1, maximum: 5, 'x-kc-widget': 'rating' },
    notify: { type: 'boolean', title: 'Email me updates' },
    agree: { type: 'boolean', title: 'I agree', 'x-kc-widget': 'checkbox' },
    tags: { type: 'array', title: 'Tags', items: { type: 'string' } },
    topics: { type: 'array', title: 'Topics', items: { enum: ['news', 'sports', 'tech'] } },
    contacts: {
      type: 'array',
      title: 'Contacts',
      items: {
        type: 'object',
        properties: { label: { type: 'string', title: 'Label' }, phone: { type: 'string', title: 'Phone' } },
      },
    },
    address: {
      type: 'object',
      title: 'Address',
      properties: { street: { type: 'string', title: 'Street' }, city: { type: 'string', title: 'City' } },
    },
  },
};

const VALIDATION: FormDefinition = {
  type: 'object',
  title: 'Create account',
  required: ['username', 'email', 'age'],
  properties: {
    username: { type: 'string', title: 'Username', minLength: 3, maxLength: 12 },
    email: { type: 'string', title: 'Email', format: 'email' },
    age: { type: 'integer', title: 'Age', minimum: 13, maximum: 120 },
  },
};

const HTML_SNIPPET = (def: FormDefinition) => `<kc-form></kc-form>
<script type="module">
  import '@kitnai/chat/elements'; // registers the custom elements

  const form = document.querySelector('kc-form');
  // \`data\` is the CardEnvelope.data — a JSON Schema + x-kc-* UI hints (set as a property).
  form.data = ${JSON.stringify(def, null, 2)};

  // Cards bubble ONE \`kc-card\` CustomEvent carrying a typed CardEvent.
  form.addEventListener('kc-card', (e) => {
    const ev = e.detail; // { kind:'submit-data', cardId, data } | { kind:'action', ... } | ...
    if (ev.kind === 'submit-data') console.log('submission', ev.data);
  });
</script>`;

const meta = {
  title: 'Generative UI/Cards/kc-form',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-form'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kc-form', [
        '`<kc-form>` turns an agent\'s **JSON Schema** "shape" (set via the `data` **property**) into a themed, accessible, validated form inside `<kc-card>` chrome. A valid submission is emitted **up the Card contract** as a bubbling **`kc-card`** CustomEvent of `{ kind: \'submit-data\', cardId, data }`.',
        '**The mapping is deterministic:** `string`→text, `string`+`enum`→radio/select, `string`+`format`→typed inputs, `number`/`integer`→number (or `slider`/`rating` via `x-kc-widget`), `boolean`→switch, `array`→checkbox-group / multi-select / repeater / tag-list, nested `object`→fieldset. `x-kc-*` hints (`x-kc-widget`, `x-kc-order`, `x-kc-submitLabel`, `x-kc-actions`, `x-kc-dismissible`, …) refine the UI and live **inside** the schema, so one source of truth drives both the form and validation.',
        "**Events** (all frozen Card-contract verbs): `ready` on mount, `submit-data` on a valid submit, `action` for secondary buttons (`x-kc-actions`), `dismiss` when dismissible, `error` for a malformed definition (renders the inline `kc-card` error). It **never invents events**.",
        '**The same `CardEnvelope`/`CardEvent` shapes flow over the remote iframe transport unchanged** — this is the *native* card. See the **Code** tab for the full envelope JSON + the HTML wiring.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The worked example: a rating + textarea + enum radio + switch, with a Skip action. */
export const Feedback: Story = {
  render: () => <FormDemo def={FEEDBACK} cardId="card-feedback-7f3" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(FEEDBACK), language: 'html' } } },
};

/** One form exercising every row of the mapping table. */
export const AllWidgets: Story = {
  render: () => <FormDemo def={ALL_WIDGETS} cardId="card-all" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(ALL_WIDGETS), language: 'html' } } },
};

/** Required + min/max + format: try submitting empty (inline errors), then fill it in. */
export const Validation: Story = {
  render: () => <FormDemo def={VALIDATION} cardId="card-signup" />,
  parameters: { docs: { source: { code: HTML_SNIPPET(VALIDATION), language: 'html' } } },
};

/** A malformed `data` → the inline error state + an `error` event (no form rendered). */
export const InvalidEnvelope: Story = {
  render: () => <FormDemo def={{ type: 'array' } as unknown as FormDefinition} cardId="card-bad" />,
  parameters: {
    docs: {
      source: {
        code: `<kc-form></kc-form>
<script type="module">
  import '@kitnai/chat/elements';
  const form = document.querySelector('kc-form');
  // A definition that isn't a JSON-Schema object → inline error + an \`error\` event.
  form.data = { type: 'array' };
  form.addEventListener('kc-card', (e) => {
    if (e.detail.kind === 'error') console.warn('form error:', e.detail.message);
  });
</script>`,
        language: 'html',
      },
    },
  },
};
