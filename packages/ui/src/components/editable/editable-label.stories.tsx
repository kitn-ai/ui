import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { EditableLabel } from './editable-label';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/EditableLabel',
  component: EditableLabel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A label a reader can rename in place.',
      ]),
    },
  },
  argTypes: {
    value: { control: 'text', description: 'The label text.' },
    placeholder: { control: 'text', description: 'Placeholder while editing / when empty.' },
    editing: { control: 'boolean', description: 'Controlled edit state.' },
    editTrigger: {
      control: 'select',
      options: ['dblclick', 'click'],
      description: 'How the read view enters edit mode. `dblclick` (the default) opens the field on a double click, `click` on a single click.',
      table: { defaultValue: { summary: 'dblclick' } },
    },
    disabled: { control: 'boolean', description: 'Disable entering edit mode.' },
    onRename: {
      action: 'rename',
      description: 'Fires on commit (Enter or blur) with the new value, only when it changed.',
      table: { category: 'Events' },
    },
    onCancel: {
      action: 'cancel',
      description: 'Fires on Esc (cancel); the text is restored.',
      table: { category: 'Events' },
    },
  },
  args: {
    value: 'Project Alpha',
    placeholder: 'Untitled',
    editing: false,
    editTrigger: 'dblclick',
    disabled: false,
    onRename: fn(),
    onCancel: fn(),
  },
  // The primitive shows the renamed value optimistically, so no wrapper signal is
  // needed to demo a commit.
  render: (args) => <EditableLabel {...args} />,
} satisfies Meta<typeof EditableLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { EditableLabel } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Double-click the text to rename. Enter or blur commits; Esc reverts. */
export const Playground: Story = {
  ...src(`const [name, setName] = createSignal('Project Alpha');
<EditableLabel value={name()} onRename={setName} />`),
};

/** Empty value falls back to the muted placeholder. */
export const WithPlaceholder: Story = {
  args: { value: '', placeholder: 'Untitled note' },
  ...src(`<EditableLabel value="" placeholder="Untitled note" onRename={save} />`),
};

/** Open in edit mode via the controlled `editing` prop. */
export const StartEditing: Story = {
  args: { value: 'Rename me', editing: true },
  ...src(`<EditableLabel value="Rename me" editing onRename={save} />`),
};

/** Disabled: the text never enters edit mode. */
export const Disabled: Story = {
  args: { value: 'Locked name', disabled: true },
  ...src(`<EditableLabel value="Locked name" disabled />`),
};

/** One click opens the field instead of a double click. */
export const SingleClick: Story = {
  args: { value: 'Click me', editTrigger: 'click' },
  ...src(`<EditableLabel value="Click me" editTrigger="click" onRename={save} />`),
};

/** Inline next to other text, the usual list-row rename pattern. */
export const Inline: Story = {
  render: (args: { onRename?: (value: string) => void }) => (
    <div class="flex items-center gap-2 text-sm text-foreground">
      <span class="text-muted-foreground">Workspace</span>
      <span aria-hidden="true">/</span>
      <EditableLabel value="Project Alpha" onRename={args.onRename} />
    </div>
  ),
  ...src(`<div class="flex items-center gap-2 text-sm">
  <span class="text-muted-foreground">Workspace</span>
  <span>/</span>
  <EditableLabel value="Project Alpha" onRename={save} />
</div>`),
};
