import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Nav, type KaiNavItem } from './nav';
import { componentDescription } from '../stories/docs/element-controls';

const ITEMS: KaiNavItem[] = [
  { id: 'new', label: 'New task', icon: 'plus', trailing: 'pencil' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'artifacts', label: 'Artifacts', icon: 'sparkles' },
  { id: 'dispatch', label: 'Dispatch', icon: 'share', badge: 'Beta' },
  { id: 'customize', label: 'Customize', icon: 'book-open' },
  { id: 'archived', label: 'Archived', icon: 'box', disabled: true },
];

const meta = {
  title: 'Components/Primitives/Nav',
  component: Nav,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'A vertical sidebar nav. Pass `items` (`id`, `label`, optional `icon` / `badge` / `trailing` / `disabled`); `value` is the active id (drives `aria-current`), and `onItemSelect` fires with the clicked id.',
      ]),
    },
  },
  argTypes: {
    value: {
      control: 'select',
      options: ITEMS.map((i) => i.id),
      description: 'Active item id.',
    },
    onItemSelect: {
      action: 'item-select',
      description: 'Fired with the selected item id.',
      table: { category: 'Events' },
    },
  },
  args: {
    value: 'new',
  },
  render: (args) => {
    const [value, setValue] = createSignal(args.value ?? 'new');
    return (
      <div class="w-60">
        <Nav
          items={ITEMS}
          value={value()}
          onItemSelect={(id) => { setValue(id); args.onItemSelect?.(id); }}
        />
      </div>
    );
  },
} satisfies Meta<typeof Nav>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Nav } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: click an item; the selected look follows. */
export const Playground: Story = {
  ...src(`const [active, setActive] = createSignal('new');

<Nav
  items={[
    { id: 'new', label: 'New task', icon: 'plus', trailing: 'pencil' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'dispatch', label: 'Dispatch', icon: 'share', badge: 'Beta' },
  ]}
  value={active()}
  onItemSelect={setActive}
/>`),
};

/** A sidebar showing icons, a badge, a trailing affordance, and a disabled row. */
export const Sidebar: Story = {
  render: () => {
    const [value, setValue] = createSignal('projects');
    return (
      <div class="w-60 rounded-lg border border-border p-2">
        <Nav items={ITEMS} value={value()} onItemSelect={setValue} />
      </div>
    );
  },
  ...src(`<Nav
  items={[
    { id: 'new', label: 'New task', icon: 'plus', trailing: 'pencil' },
    { id: 'projects', label: 'Projects', icon: 'folder' },
    { id: 'artifacts', label: 'Artifacts', icon: 'sparkles' },
    { id: 'dispatch', label: 'Dispatch', icon: 'share', badge: 'Beta' },
    { id: 'archived', label: 'Archived', icon: 'box', disabled: true },
  ]}
  value={active()}
  onItemSelect={setActive}
/>`),
};
