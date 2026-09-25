import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { ColorField } from './color-field';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/ColorField',
  component: ColorField,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A color swatch and a hex field that set the same value.',
      ]),
    },
  },
  argTypes: {
    label: { control: 'text', description: "Accessible name for the swatch/native picker. The hex field's own label is derived from it." },
    value: { control: 'text', description: 'The committed color as a CSS hex string. Controlled.' },
    placeholder: { control: 'text', description: 'Placeholder for the hex text field when value is unset.' },
    disabled: { control: 'boolean' },
    onChange: { action: 'change', description: 'Fires with the next value once it is a syntactically valid hex.', table: { category: 'Events' } },
  },
} satisfies Meta<typeof ColorField>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { ColorField } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Uncontrolled-feeling playground: a local signal wires `value`/`onChange`
 *  so typing a valid hex or using the picker actually sticks. */
export const Playground: Story = {
  render: () => {
    const [value, setValue] = createSignal('#e91e63');
    return <ColorField label="Accent color" value={value()} onChange={setValue} />;
  },
  ...src(`function Example() {
  const [value, setValue] = createSignal('#e91e63');
  return <ColorField label="Accent color" value={value()} onChange={setValue} />;
}`),
};

/** No value yet: the swatch falls back to a neutral muted fill and the hex
 *  field shows its placeholder. */
export const Unset: Story = {
  render: () => {
    const [value, setValue] = createSignal<string | undefined>(undefined);
    return <ColorField label="Accent color" value={value()} placeholder="#e91e63" onChange={setValue} />;
  },
  ...src(`const [value, setValue] = createSignal<string | undefined>(undefined);

<ColorField label="Accent color" value={value()} placeholder="#e91e63" onChange={setValue} />`),
};

/** An invalid hex leaves the swatch unchanged and keeps the typed text. */
export const InvalidTextDoesNotCommit: Story = {
  render: () => {
    const [value, setValue] = createSignal('#38bdf8');
    return <ColorField label="Unread indicator color" value={value()} onChange={setValue} />;
  },
  ...src(`const [value, setValue] = createSignal('#38bdf8');

<ColorField label="Unread indicator color" value={value()} onChange={setValue} />`),
};

export const Disabled: Story = {
  args: { label: 'Accent color', value: '#e91e63', disabled: true },
  ...src('<ColorField label="Accent color" value="#e91e63" disabled />'),
};
