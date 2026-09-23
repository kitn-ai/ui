import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { createSignal, createEffect } from 'solid-js';
import { Select, type SelectProps } from './select';
import { componentDescription } from '../../stories/docs/web-component-controls';

const MODELS = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

const meta = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A native select styled to match the other input controls.',
      ]),
    },
  },
  argTypes: {
    options: { control: 'object', description: 'The choices: `{ value, label?, disabled? }`. `label` defaults to `String(value)`.' },
    value: { control: 'text', description: 'Selected value, matched by IDENTITY (a numeric enum selects on the number). Pass an array for `multiple`.' },
    placeholder: { control: 'text', description: 'Text for a leading, disabled, empty option. Omit it and no such row is rendered: there is no default wording.' },
    invalid: { control: 'boolean', description: 'Force the destructive-border state. Matches `Input`\'s.' },
    disabled: { control: 'boolean', description: 'Disable the whole control. Individual options carry their own `disabled`.' },
    required: { control: 'boolean', description: 'Sets the native `required` attribute. Adds no validation of its own.' },
    multiple: { control: 'boolean', description: 'Allow several selections. Renders the platform list box, so no chevron is drawn.' },
    name: { control: 'text', description: 'Form-control name. This is what a native form submits.' },
    class: { control: 'text', description: 'Extra classes for the `<select>`, merged with the kit box rather than replacing it.' },
    containerClass: { control: 'text', description: 'Extra classes for the positioning wrapper that holds the chevron.' },
    'aria-label': { control: 'text', description: 'Accessible name, for a select with no visible label.' },
    onChange: { action: 'change', description: 'Native change event. Read `e.currentTarget.value`, or `selectedOptions` when `multiple`.', table: { category: 'Events' } },
  },
  args: {
    options: MODELS,
    value: 'sonnet',
    placeholder: 'Choose a model…',
    invalid: false,
    disabled: false,
    required: false,
    multiple: false,
    name: 'model',
    class: '',
    containerClass: '',
    // Every prop not owned by the component is forwarded, and `aria-label` is the one a
    // standalone select genuinely needs: the axe check flags an unnamed form control,
    // and a demo that ships the violation teaches the violation.
    'aria-label': 'Model',
    onChange: fn(),
  },
  // Same shape as the Slider Playground, and for the same reason: `args` carries a
  // `value`, so a bare spread renders a CONTROLLED select with no writer. Picking an
  // option would move the native control while the component's state stayed put. Less
  // visible here than on a slider (there is no second thing to disagree with it), but
  // it is the same defect, so it gets the same fix: seed a signal from the arg, keep
  // the Controls panel driving it, and let interaction write it.
  render: (args: SelectProps) => {
    const [v, setV] = createSignal(args.value);
    createEffect(() => setV(args.value));
    return (
      <div style={{ 'max-width': '20rem' }}>
        <Select
          {...args}
          value={v()}
          onChange={(e) => {
            setV(e.currentTarget.value);
            (args.onChange as ((e: Event) => void) | undefined)?.(e);
          }}
        />
      </div>
    );
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * SolidJS stories can't auto-serialize a render function, so notable variations carry
 * a real, paste-ready snippet with its import line.
 */
const IMPORT = `import { Select } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

const box = { 'max-width': '20rem' } as const;

/** Every prop on a control panel. Edit `options` live in the Controls tab. */
export const Playground: Story = {
  ...src(`// MODELS is your own data
const MODELS = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

const [model, setModel] = createSignal('sonnet');

<Select
  options={MODELS}
  value={model()}
  placeholder="Choose a model…"
  aria-label="Model"
  onChange={setModel}
/>`),
};

/**
 * The two ways to feed it. `options` is the flat list; `children` is the escape hatch
 * for anything a flat list can't say, such as `<optgroup>`.
 */
export const OptionsOrChildren: Story = {
  name: 'options, or raw children',
  render: () => (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem', ...box }}>
      <Select options={MODELS} value="haiku" aria-label="Model" />
      <Select value="us-east" aria-label="Region">
        <optgroup label="Americas">
          <option value="us-east">us-east-1</option>
          <option value="us-west">us-west-2</option>
        </optgroup>
        <optgroup label="Europe">
          <option value="eu-west">eu-west-1</option>
        </optgroup>
      </Select>
    </div>
  ),
  ...src(`<Select options={[{ value: 'opus', label: 'Claude Opus' }, { value: 'sonnet', label: 'Claude Sonnet' }]} value="haiku" aria-label="Model" />

<Select value="us-east" aria-label="Region">
  <optgroup label="Americas">
    <option value="us-east">us-east-1</option>
  </optgroup>
</Select>`),
};

/**
 * Nothing chosen yet. Pass `placeholder` and the component renders one leading,
 * disabled, empty-valued option. There is no default wording, because inventing one
 * would put words in your UI.
 */
export const Placeholder: Story = {
  render: () => (
    <div style={box}>
      <Select options={MODELS} placeholder="Choose a model…" aria-label="Model" />
    </div>
  ),
  ...src(`// MODELS is your own data
const MODELS = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

<Select options={MODELS} placeholder="Choose a model…" aria-label="Model" />`),
};

/**
 * The states. `invalid` matches `Input`'s destructive border exactly, so a select and a
 * text field in the same form never disagree about what an error looks like.
 */
export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '1rem', ...box }}>
      <Select options={MODELS} value="opus" aria-label="Default" />
      <Select options={MODELS} value="opus" invalid aria-label="Invalid" />
      <Select options={MODELS} value="opus" disabled aria-label="Disabled" />
      <Select
        options={[...MODELS, { value: 'legacy', label: 'Legacy (retired)', disabled: true }]}
        value="opus"
        aria-label="One option disabled"
      />
    </div>
  ),
  ...src(`// MODELS is your own data
const MODELS = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

<Select options={MODELS} value="opus" />
<Select options={MODELS} value="opus" invalid />
<Select options={MODELS} value="opus" disabled />
<Select options={[...MODELS, { value: 'legacy', label: 'Legacy (retired)', disabled: true }]} value="opus" />`),
};

/**
 * `multiple` renders the platform's list box. There is no chevron, because there is no
 * closed state for one to point at, and the native control keeps its own scroll and
 * ctrl/cmd-click selection.
 */
export const Multiple: Story = {
  render: () => {
    const [picked, setPicked] = createSignal<string[]>(['sonnet']);
    return (
      <div style={{ display: 'flex', 'flex-direction': 'column', gap: '0.5rem', ...box }}>
        <Select
          multiple
          class="min-h-[6rem]"
          options={MODELS}
          value={picked()}
          aria-label="Models"
          onChange={(e) => setPicked([...e.currentTarget.selectedOptions].map((o) => o.value))}
        />
        <code style={{ 'font-size': '12px' }}>[{picked().map((v) => `"${v}"`).join(', ')}]</code>
      </div>
    );
  },
  ...src(`// MODELS is your own data
const MODELS = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

const [picked, setPicked] = createSignal(['sonnet']);

<Select
  multiple
  class="min-h-[6rem]"
  options={MODELS}
  value={picked()}
  onChange={(e) => setPicked([...e.currentTarget.selectedOptions].map((o) => o.value))}
/>`),
};

/**
 * Give it a `name` and a native `<form>` submits it with no JavaScript at all — the
 * part a hand-built listbox silently loses.
 */
export const InAForm: Story = {
  name: 'Native form participation',
  render: () => {
    const [submitted, setSubmitted] = createSignal('—');
    return (
      <form
        style={{ display: 'flex', 'flex-direction': 'column', gap: '0.75rem', 'align-items': 'flex-start', ...box }}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(String(new FormData(e.currentTarget).get('model')));
        }}
      >
        <Select name="model" options={MODELS} value="haiku" aria-label="Model" />
        <button type="submit">Submit</button>
        <code style={{ 'font-size': '12px' }}>model = {submitted()}</code>
      </form>
    );
  },
  ...src(`// MODELS is your own data
const MODELS = [
  { value: 'opus', label: 'Claude Opus' },
  { value: 'sonnet', label: 'Claude Sonnet' },
  { value: 'haiku', label: 'Claude Haiku' },
];

<form onSubmit={(e) => { e.preventDefault(); console.log(new FormData(e.currentTarget).get('model')); }}>
  <Select name="model" options={MODELS} value="haiku" aria-label="Model" />
  <button type="submit">Submit</button>
</form>`),
};
