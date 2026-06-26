import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { Switch, type SwitchProps } from './switch';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Components/Primitives/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A toggle **switch** (`role="switch"`) for an immediate on/off setting, built on a native `<button>`.',
        '**When to use:** a preference that applies the moment it flips — "Temporary chat", notifications, a feature flag. For a labelled choice submitted with a form, prefer a checkbox.',
        '**How to use:** uncontrolled via `defaultChecked`, or controlled via `checked` + `onChange`. Operable with Space/Enter. Pass `label` for the accessible name.',
        '**Placement:** settings rows, preference panels, and popover menus such as a chat header model menu.',
      ]),
    },
  },
  argTypes: {
    checked: { control: 'boolean', description: 'Controlled checked state. Drive it from `onChange`.' },
    defaultChecked: { control: 'boolean', description: 'Initial state when uncontrolled.' },
    disabled: { control: 'boolean', description: 'Disable interaction.' },
    label: { control: 'text', description: 'Accessible label.' },
    onChange: {
      action: 'change',
      description: 'Fires with the next checked state on toggle.',
      table: { category: 'Events' },
    },
  },
  args: { label: 'Temporary chat', onChange: fn() },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Off by default; click or press Space to toggle. */
export const Playground: Story = {};

/** Starts on via `defaultChecked`. */
export const On: Story = { args: { defaultChecked: true } };

/** Non-interactive. */
export const Disabled: Story = { args: { disabled: true } };

/** The common shape: a labelled settings row with the switch trailing. */
export const SettingsRow: Story = {
  name: 'In a settings row',
  render: (args: SwitchProps) => (
    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '2rem', width: '18rem' }}>
      <span style={{ 'font-size': '14px' }}>Temporary chat</span>
      <Switch {...args} />
    </div>
  ),
};
