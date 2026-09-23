import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { Switch, type SwitchProps } from './switch';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Switch',
  component: Switch,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A toggle for an on/off setting.',
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

/**
 * SolidJS stories can't auto-serialize a render function, so attach a real,
 * paste-ready snippet (with its import line). `language: 'tsx'` labels SolidJS.
 *
 * EVERY story gets one, args-only included. That is a correction: this comment
 * used to end "Args-only stories already show clean source, so they skip this",
 * and the Code panel proved otherwise. With no `render:` to serialize,
 * Storybook falls back to a dump of the story OBJECT -- `{ args: { … } }` -- so
 * the three args-driven stories below shipped the reader an object where an
 * example belongs. The `lint:story-conventions` rule is per STORY for the same
 * reason: what the reader sees is one story at a time.
 */
const IMPORT = `import { Switch } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Off by default; click or press Space to toggle. */
export const Playground: Story = {
  ...src(`const [on, setOn] = createSignal(false);

<Switch label="Temporary chat" checked={on()} onChange={setOn} />`),
};

/** Starts on via `defaultChecked`. */
export const On: Story = {
  args: { defaultChecked: true },
  ...src('<Switch label="Temporary chat" defaultChecked />'),
};

/** Non-interactive. */
export const Disabled: Story = {
  args: { disabled: true },
  ...src('<Switch label="Temporary chat" disabled />'),
};

/** The common shape: a labelled settings row with the switch trailing. */
export const SettingsRow: Story = {
  name: 'In a settings row',
  render: (args: SwitchProps) => (
    <div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '2rem', width: '18rem' }}>
      <span style={{ 'font-size': '14px' }}>Temporary chat</span>
      <Switch {...args} />
    </div>
  ),
  ...src(`<div style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'space-between', gap: '2rem', width: '18rem' }}>
  <span style={{ 'font-size': '14px' }}>Temporary chat</span>
  <Switch label="Temporary chat" />
</div>`),
};
