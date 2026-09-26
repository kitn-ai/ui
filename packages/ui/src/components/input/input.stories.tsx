import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { Search } from 'lucide-solid';
import { Input } from './input';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: {
        exclude: ['leading', 'trailing', 'class', 'children'],
      },
      description: componentDescription([
        'A single-line text field with a label, a hint and an error message.',
      ]),
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Control density.',
      table: { defaultValue: { summary: 'md' } },
    },
    label: { control: 'text', description: 'Field label, linked to the input.' },
    hint: { control: 'text', description: 'Helper text below the control.' },
    error: { control: 'text', description: 'Error text; flips the field invalid.' },
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    invalid: { control: 'boolean', description: 'Force the invalid state without an error string.' },
    format: {
      control: 'text',
      description:
        "Mask pattern: `#` digit, `@` letter or digit, `*` the same but hidden; others are positional literals. `default` resolves `semantic`'s format.",
    },
    guide: {
      control: 'text',
      description: 'Placeholder guide at unfilled positions, aligned position for position with `format`.',
    },
    semantic: {
      control: 'select',
      // A deliberate SUBSET of FIELD_SEMANTIC_TYPES, not a copy of it: `ssn` is a real
      // member of the enum and stays supported, but no story, demo or fixture in this
      // repo puts a social security number on screen.
      options: ['tel', 'credit-card', 'custom'],
      description:
        "Sets the field's input attributes and the canonical (submitted) value. Never starts masking on its own.",
    },
    caseMode: {
      control: 'inline-radio',
      options: ['preserve', 'upper', 'lower'],
      description: 'Case folding applied to typed and pasted text.',
      table: { defaultValue: { summary: 'preserve' } },
    },
    copyPolicy: {
      control: 'inline-radio',
      options: ['canonical', 'formatted', 'obscured', 'blocked'],
      description: 'What a copy or cut of a masked field puts on the clipboard.',
      table: { defaultValue: { summary: 'canonical' } },
    },
    onValueInput: {
      action: 'value-input',
      description:
        'Fires per keystroke with the current value, canonical while a mask is active and the raw text otherwise.',
      table: { category: 'Events' },
    },
    onValueChange: {
      action: 'value-change',
      description: 'Fires on commit (blur) with the current value; canonical when a mask is active.',
      table: { category: 'Events' },
    },
    onMaskReject: {
      action: 'mask-reject',
      // `reason` names the rule that refused the content (`full`, `wrong-class`,
      // `over-capacity`, `format-change-clipped`); none of them is an error state.
      description:
        'A mask refused some content. Not an error state, and `invalid` is untouched.',
      table: { category: 'Events' },
    },
  },
  args: {
    size: 'md',
    placeholder: 'Acme Inc.',
    disabled: false,
    invalid: false,
    onValueInput: fn(),
    onValueChange: fn(),
    onMaskReject: fn(),
  },
  render: (args) => (
    <div class="max-w-sm">
      <Input {...args} />
    </div>
  ),
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Input } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: toggle the controls to explore the field. */
export const Default: Story = {
  ...src(`<Input placeholder="Acme Inc." onValueInput={setName} />`),
};

/** A labelled field with helper text below it. */
export const WithLabelHint: Story = {
  args: { label: 'Workspace name', hint: 'Shown to everyone you invite.' },
  ...src(`<Input
  label="Workspace name"
  hint="Shown to everyone you invite."
  placeholder="Acme Inc."
/>`),
};

/** The invalid state: a destructive border with the error text linked for a11y. */
export const Error: Story = {
  args: { label: 'Workspace name', value: 'a', error: 'Use at least 3 characters.' },
  ...src(`<Input
  label="Workspace name"
  value="a"
  error="Use at least 3 characters."
/>`),
};

/** Both densities, side by side. */
export const Sizes: Story = {
  render: () => (
    <div class="flex max-w-sm flex-col gap-3">
      <Input size="sm" placeholder="Small" />
      <Input size="md" placeholder="Medium (default)" />
    </div>
  ),
  ...src(`<Input size="sm" placeholder="Small" />
<Input size="md" placeholder="Medium (default)" />`),
};

// The date field is a mask, not a validator: `99/99/9999` types happily, and whether a
// date is real stays the consumer's call. The ticket field is the lenient one, because a
// literal run already in the value is consumed rather than fed back into the first fill
// position.
/** Four fields that mask what you type, each in a different format. */
export const MaskedFormats: Story = {
  render: () => (
    <div class="flex max-w-sm flex-col gap-4">
      <Input
        label="Ticket"
        format="@@@-####"
        caseMode="upper"
        hint="Three letters, a dash, four digits. chg4821 works too."
      />
      <Input
        label="Renewal date"
        format="##/##/####"
        guide="mm/dd/yyyy"
        hint="A mask, not a date check: it shapes the digits and validates nothing."
      />
      <Input
        label="Phone"
        semantic="tel"
        format="default"
        guide="   -   -    "
        hint="Ten digits. Submitted as digits only."
      />
      <Input
        label="Asset serial"
        format="SN-@@##-####"
        caseMode="upper"
        hint="Two letters then two digits, then four digits."
      />
    </div>
  ),
  ...src(`<Input label="Ticket" format="@@@-####" caseMode="upper"
  hint="Three letters, a dash, four digits." />

<Input label="Renewal date" format="##/##/####" guide="mm/dd/yyyy"
  hint="A mask, not a date check." />

<Input label="Phone" semantic="tel" format="default" guide="   -   -    " />

<Input label="Asset serial" format="SN-@@##-####" caseMode="upper" />`),
};

// A semantic type is tier 1: it sets the input hints and decides the canonical value, but
// it never starts masking by itself. `format="default"` is the opt-in that does.
/** A phone field that declares its kind, with no mask. */
export const SemanticOnly: Story = {
  args: {
    label: 'Phone',
    semantic: 'tel',
    hint: 'A numeric keypad and an autofill hint. No mask: type it however you like.',
  },
  ...src(`<Input label="Phone" semantic="tel" />`),
};

// A rejection is announced, not swallowed, and it is not an error state: the field stays
// valid and `invalid` stays the consumer's to set.
/** A blocked keystroke announced in a live region beside the field. */
export const AnnouncedRejections: Story = {
  render: () => {
    let region: HTMLParagraphElement | undefined;
    const announce = (detail: { reason: string; data: string }) => {
      const text =
        detail.reason === 'wrong-class'
          ? `${detail.data} does not belong in this position.`
          : detail.reason === 'over-capacity'
            ? 'That is longer than this field holds; the rest was dropped.'
            : 'This field is full.';
      if (region) region.textContent = text;
    };
    return (
      <div class="flex max-w-sm flex-col gap-2">
        <Input
          label="Employee id"
          format="EMP-#####"
          caseMode="upper"
          hint="Five digits after the prefix."
          onMaskReject={announce}
        />
        <p ref={region} aria-live="polite" class="text-xs text-muted-foreground" />
      </div>
    );
  },
  ...src(`<Input
  label="Employee id"
  format="EMP-#####"
  caseMode="upper"
  onMaskReject={(d) => announce(d.reason, d.data)}
/>`),
};

/** Affixes: a leading search icon and a trailing inline button, wrapped by the field border. */
export const WithLeadingIconAndTrailingButton: Story = {
  render: () => (
    <div class="max-w-sm">
      <Input
        placeholder="Search projects"
        leading={<Search class="size-4" aria-hidden="true" />}
        trailing={<Button size="sm">Go</Button>}
      />
    </div>
  ),
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import { Input, Button } from '@kitn.ai/ui/solid';
import { Search } from 'lucide-solid';

<Input
  placeholder="Search projects"
  leading={<Search class="size-4" aria-hidden="true" />}
  trailing={<Button size="sm">Go</Button>}
/>`,
      },
    },
  },
};
