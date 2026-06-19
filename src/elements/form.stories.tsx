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
      'kai-form': JSX.HTMLAttributes<HTMLElement> & {
        heading?: string;
        'card-id'?: string;
        ref?: (el: HTMLElement) => void;
      };
    }
  }
}

type FormEl = HTMLElement & { data?: FormDefinition; resolution?: Record<string, unknown> };

/** A bordered box the form sits inside. */
function Frame(props: { children: JSX.Element }) {
  return <div style={{ 'max-width': '460px' }}>{props.children}</div>;
}

/** Mounts a <kai-form>, sets `.data`, logs the emitted CardEvent under the render. */
function FormDemo(props: { def: FormDefinition; cardId: string }) {
  const [log, setLog] = createSignal<CardEvent[]>([]);
  let el: FormEl | undefined;
  onMount(() => {
    if (!el) return;
    el.data = props.def;
    el.addEventListener('kai-card', (e) => {
      const detail = (e as CustomEvent<CardEvent>).detail;
      setLog((prev) => [...prev, detail]);
    });
  });
  return (
    <Frame>
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '12px' }}>
        <kai-form ref={(e) => (el = e as FormEl)} card-id={props.cardId} />
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
  'x-kai-order': ['rating', 'comments', 'plan', 'contactOk'],
  'x-kai-submitLabel': 'Send feedback',
  'x-kai-actions': [{ id: 'skip', label: 'Skip', variant: 'ghost' }],
  properties: {
    rating: { type: 'integer', title: 'Overall rating', minimum: 1, maximum: 5, 'x-kai-widget': 'rating' },
    comments: {
      type: 'string',
      title: 'Comments',
      maxLength: 500,
      'x-kai-widget': 'textarea',
      'x-kai-placeholder': "What worked, what didn't…",
    },
    plan: { type: 'string', title: 'Your plan', enum: ['free', 'pro', 'team'], default: 'free' },
    contactOk: { type: 'boolean', title: 'OK to contact me about this', default: false },
  },
};

const ALL_WIDGETS: FormDefinition = {
  type: 'object',
  title: 'Every widget',
  'x-kai-submitLabel': 'Submit all',
  properties: {
    name: { type: 'string', title: 'Name' },
    bio: { type: 'string', title: 'Bio', maxLength: 300 },
    email: { type: 'string', title: 'Email', format: 'email' },
    website: { type: 'string', title: 'Website', format: 'uri' },
    birthday: { type: 'string', title: 'Birthday', format: 'date' },
    secret: { type: 'string', title: 'Password', 'x-kai-widget': 'password' },
    size: { type: 'string', title: 'Size', enum: ['S', 'M', 'L'] },
    country: { type: 'string', title: 'Country', enum: ['US', 'UK', 'DE', 'FR', 'JP'] },
    age: { type: 'integer', title: 'Age', minimum: 0, maximum: 120 },
    volume: { type: 'integer', title: 'Volume', minimum: 0, maximum: 11, 'x-kai-widget': 'slider' },
    stars: { type: 'integer', title: 'Stars', minimum: 1, maximum: 5, 'x-kai-widget': 'rating' },
    notify: { type: 'boolean', title: 'Email me updates' },
    agree: { type: 'boolean', title: 'I agree', 'x-kai-widget': 'checkbox' },
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

const HTML_SNIPPET = (def: FormDefinition) => `<kai-form></kai-form>
<script type="module">
  import '@kitn.ai/ui/elements'; // registers the custom elements

  const form = document.querySelector('kai-form');
  // \`data\` is the CardEnvelope.data — a JSON Schema + x-kai-* UI hints (set as a property).
  form.data = ${JSON.stringify(def, null, 2)};

  // Cards bubble ONE \`kai-card\` CustomEvent carrying a typed CardEvent.
  form.addEventListener('kai-card', (e) => {
    const ev = e.detail; // { kind:'submit', cardId, data } | { kind:'action', ... } | ...
    if (ev.kind === 'submit') console.log('submission', ev.data);
  });
</script>`;

const meta = {
  title: 'Generative UI/Cards/kai-form',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-form'),
  parameters: {
    layout: 'padded',
    docs: {
      description: specDescription('kai-form', [
        '`<kai-form>` turns an agent\'s **JSON Schema** "shape" (set via the `data` **property**) into a themed, accessible, validated form inside `<kai-card>` chrome. A valid submission is emitted **up the Card contract** as a bubbling **`kai-card`** CustomEvent of `{ kind: \'submit\', cardId, data }`.',
        '**Anatomy:** `<kai-card>` chrome (optional heading from `data.title` or `heading` attr) → **field rows** (one per schema property in `x-kai-order` / key order: label + widget; `object` properties become a `<fieldset>`, `array` items become a repeater/checkbox-group/tag-list) → **card footer** (`x-kai-submitLabel` submit `<Button>` + optional `x-kai-actions` secondary buttons; replaced by a read-only `<dl>` summary after a resolved submission).',
        '**The mapping is deterministic:** `string`→text, `string`+`enum`→radio/select, `string`+`format`→typed inputs, `number`/`integer`→number (or `slider`/`rating` via `x-kai-widget`), `boolean`→switch, `array`→checkbox-group / multi-select / repeater / tag-list, nested `object`→fieldset. `x-kai-*` hints (`x-kai-widget`, `x-kai-order`, `x-kai-submitLabel`, `x-kai-actions`, `x-kai-dismissible`, …) refine the UI and live **inside** the schema, so one source of truth drives both the form and validation.',
        "**Events** (all frozen Card-contract verbs): `ready` on mount, `submit` on a valid submit, `action` for secondary buttons (`x-kai-actions`), `dismiss` when dismissible, `error` for a malformed definition (renders the inline `kai-card` error). It **never invents events**.",
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

const RESOLVED_FORM: FormDefinition = {
  type: 'object',
  title: 'Book a demo',
  'x-kai-order': ['name', 'optIn'],
  properties: {
    name: { type: 'string', title: 'Full name' },
    optIn: { type: 'boolean', title: 'Email me' },
  },
};

/** The form after a valid submission — read-only `<dl>` summary + "✓ Submitted", no inputs. */
export const Resolved: Story = {
  name: 'Resolved (read-only)',
  render: () => {
    let el: FormEl | undefined;
    onMount(() => {
      if (!el) return;
      el.data = RESOLVED_FORM;
      el.resolution = { kind: 'submit', data: { name: 'Jane Cooper', optIn: true } };
    });
    return (
      <Frame>
        <kai-form ref={(e) => (el = e as FormEl)} card-id="card-resolved-form" />
      </Frame>
    );
  },
  parameters: {
    docs: {
      source: {
        code: `<kai-form></kai-form>
<script type="module">
  import '@kitn.ai/ui/elements';
  const form = document.querySelector('kai-form');
  form.data = ${JSON.stringify(RESOLVED_FORM, null, 2)};
  // Setting .resolution renders the chromed read-only summary — no inputs or submit button.
  form.resolution = { kind: 'submit', data: { name: 'Jane Cooper', optIn: true } };
</script>`,
        language: 'html',
      },
    },
  },
};

/** A malformed `data` → the inline error state + an `error` event (no form rendered). */
export const InvalidEnvelope: Story = {
  render: () => <FormDemo def={{ type: 'array' } as unknown as FormDefinition} cardId="card-bad" />,
  parameters: {
    docs: {
      source: {
        code: `<kai-form></kai-form>
<script type="module">
  import '@kitn.ai/ui/elements';
  const form = document.querySelector('kai-form');
  // A definition that isn't a JSON-Schema object → inline error + an \`error\` event.
  form.data = { type: 'array' };
  form.addEventListener('kai-card', (e) => {
    if (e.detail.kind === 'error') console.warn('form error:', e.detail.message);
  });
</script>`,
        language: 'html',
      },
    },
  },
};
