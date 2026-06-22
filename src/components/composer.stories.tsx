import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn, within, expect } from 'storybook/test';
import { Composer } from './composer';
import type { TriggerDef } from './composer';
import type { ComposerDoc } from '../primitives/composer-model';
import { componentDescription } from '../stories/docs/element-controls';

// Minimal inline data: URI icon — a plain colored square with a glyph.
function imgData(fill: string, glyph: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="4" fill="${fill}"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const SKILL_ICON = imgData('#7c3aed', '▶');

const meta = {
  title: 'Solid (Advanced)/Elements/Composer',
  component: Composer,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A rich plain-text composer that supports atomic entity pills (skills, mentions) via `/` and `@` trigger menus, keyword highlighting via the CSS Custom Highlight API, and a structured `{ doc, text, entities }` submit event.',
        '**Not an RTE** — no formatting controls. `contenteditable="plaintext-only"`, entity pills are the only non-text nodes.',
        '**When to use:** as the prompt input in an AI chat surface where the user needs to reference skills or mention collaborators inline.',
        '**Array/object props** (`value`, `triggers`, `highlights`) are set as JS properties; scalars (`placeholder`, `disabled`, `loading`, `maxHeight`, `submitOnEnter`) work as attributes on the `<kai-composer>` element.',
      ]),
    },
  },
  argTypes: {
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when the composer is empty.',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the composer — non-interactive.',
      table: { defaultValue: { summary: 'false' } },
    },
    loading: {
      control: 'boolean',
      description: 'Shows a busy/streaming state and blocks submit.',
      table: { defaultValue: { summary: 'false' } },
    },
    maxHeight: {
      control: 'number',
      description: 'Maximum height in px before the content area scrolls.',
      table: { defaultValue: { summary: '240' } },
    },
    submitOnEnter: {
      control: 'boolean',
      description: 'Whether Enter (without Shift) fires onSubmit.',
      table: { defaultValue: { summary: 'true' } },
    },
    onSubmit: {
      action: 'submit',
      description: 'Fired with `{ doc, text, entities }` on Enter or programmatic submit.',
      table: { category: 'Events' },
    },
    onChange: {
      action: 'change',
      description: 'Fired with `{ doc, text, entities }` on every input event.',
      table: { category: 'Events' },
    },
  },
  args: {
    placeholder: 'Ask anything…',
    disabled: false,
    loading: false,
    maxHeight: 240,
    submitOnEnter: true,
    onSubmit: fn(),
    onChange: fn(),
  },
  render: (args) => (
    <div class="max-w-2xl">
      <Composer {...args} />
    </div>
  ),
} satisfies Meta<typeof Composer>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Playground
// ---------------------------------------------------------------------------

/** Args-driven — toggle disabled/loading and edit the placeholder via Controls. */
export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The editable surface must be present.
    const editable = canvas.getByRole('textbox');
    expect(editable).toBeTruthy();
    // The placeholder must be visible when the composer is empty.
    expect(canvas.getByText('Ask anything…')).toBeTruthy();
  },
};

// ---------------------------------------------------------------------------
// WithSkills — a / trigger with skill items
// ---------------------------------------------------------------------------

const SKILL_TRIGGERS: TriggerDef[] = [
  {
    char: '/',
    kind: 'skill',
    items: [
      {
        id: 'record-replay',
        label: 'Record & Replay',
        icon: SKILL_ICON,
        promptText: 'Use the Record & Replay skill.',
      },
      {
        id: 'summarize',
        label: 'Summarize',
      },
    ],
  },
];

/** Type `/` in the composer to open the skill picker. Select an item to insert
 *  a pill. */
export const WithSkills: Story = {
  args: {
    placeholder: 'Type / to pick a skill…',
    triggers: SKILL_TRIGGERS,
    onSubmit: fn(),
    onChange: fn(),
  },
  render: (args) => (
    <div class="max-w-2xl">
      <Composer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // NOTE: full /-menu → select → backspace keyboard flow is verified by the
    // IVP (tests/e2e/composer-ivp.spec.ts), not here — userEvent can't reliably
    // drive contenteditable selection in this harness (focus races, synthetic
    // input events don't update the DOM the same way a real key sequence does).
    //
    // What we CAN reliably assert: the component mounts correctly and the
    // editable surface is present.
    const canvas = within(canvasElement);
    const editable = canvas.getByRole('textbox');
    expect(editable).toBeTruthy();
    // The placeholder is shown before any typing.
    expect(canvas.getByText('Type / to pick a skill…')).toBeTruthy();
  },
};

// ---------------------------------------------------------------------------
// WithMentions — a @ trigger with mention items
// ---------------------------------------------------------------------------

const MENTION_TRIGGERS: TriggerDef[] = [
  {
    char: '@',
    kind: 'mention',
    items: [
      { id: 'alice', label: 'Alice Kim', icon: imgData('#0369a1', 'A') },
      { id: 'bob', label: 'Bob Chen', icon: imgData('#0f766e', 'B') },
    ],
  },
];

/** Type `@` to mention a collaborator. */
export const WithMentions: Story = {
  args: {
    placeholder: 'Type @ to mention someone…',
    triggers: MENTION_TRIGGERS,
    onSubmit: fn(),
    onChange: fn(),
  },
  render: (args) => (
    <div class="max-w-2xl">
      <Composer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    // NOTE: full @-menu → select keyboard flow is verified by the IVP —
    // userEvent can't reliably drive contenteditable in Storybook browser tests.
    const canvas = within(canvasElement);
    const editable = canvas.getByRole('textbox');
    expect(editable).toBeTruthy();
    expect(canvas.getByText('Type @ to mention someone…')).toBeTruthy();
  },
};

// ---------------------------------------------------------------------------
// Prefilled — a doc with an entity pill + trailing text
// ---------------------------------------------------------------------------

const PREFILLED_DOC: ComposerDoc = [
  {
    type: 'entity',
    entity: {
      kind: 'skill',
      id: 'record-replay',
      label: 'Record & Replay',
      icon: SKILL_ICON,
    },
  },
  { type: 'text', text: " I'm going to show y" },
];

/** A pre-populated doc — an entity pill followed by text.
 *  The pill renders as an atomic inline chip and the trailing text is editable. */
export const Prefilled: Story = {
  args: {
    value: PREFILLED_DOC,
    placeholder: 'Ask anything…',
    onSubmit: fn(),
    onChange: fn(),
  },
  render: (args) => (
    <div class="max-w-2xl">
      <Composer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The entity pill must render with the data-kai-entity attribute.
    const pill = canvasElement.querySelector('[data-kai-entity]');
    expect(pill).toBeTruthy();
    // The pill must contain the label text.
    expect(pill!.textContent).toContain('Record & Replay');
    // The trailing text must also be present somewhere in the editable.
    const editable = canvas.getByRole('textbox');
    expect(editable.textContent).toContain("I'm going to show y");
  },
};

// ---------------------------------------------------------------------------
// Highlighted — keyword highlight rules
// ---------------------------------------------------------------------------

/** Keywords matching `highlights` rules are decorated via the CSS Custom
 *  Highlight API (browsers that don't support it simply show plain text). */
export const Highlighted: Story = {
  args: {
    value: 'Please deploy this fix for TICKET-123 and also TICKET-456 soon.',
    highlights: [
      'deploy',
      { pattern: 'TICKET-\\d+', class: 'tok' },
    ],
    placeholder: 'Ask anything…',
    onSubmit: fn(),
    onChange: fn(),
  },
  render: (args) => (
    <div class="max-w-2xl">
      <Composer {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editable = canvas.getByRole('textbox');
    expect(editable).toBeTruthy();
    // The text content must include the pre-filled value.
    expect(editable.textContent).toContain('deploy');
    expect(editable.textContent).toContain('TICKET-123');
  },
};
