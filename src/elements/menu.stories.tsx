import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import { Plus } from 'lucide-solid';
import './register'; // side effect: registers all kai-* custom elements (incl. kai-menu)
import type { KaiMenuItem } from './menu';

// Declare the custom element tag for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-menu': JSX.HTMLAttributes<HTMLElement> & { theme?: string; 'trigger-icon'?: string; 'trigger-label'?: string; 'trigger-icon-trailing'?: string; label?: string };
    }
  }
}

interface MenuEl extends HTMLElement {
  items?: KaiMenuItem[];
}

const meta = {
  title: 'Labs/Kai Menu',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

/**
 * Reproduces the `+` action menu from the design screenshot via the `kai-menu`
 * JSON-driven web component. Items are set as a JS property (array ref) in
 * `onMount`. The `kai-select` event is logged to the console; clicking the
 * "Web search" checkbox also flips the item and reassigns `el.items` with a
 * fresh array reference so the checkmark updates reactively.
 */
function PlusMenuDemo() {
  let el: MenuEl | undefined;

  const initialItems: KaiMenuItem[] = [
    { heading: true, label: 'Actions' },
    {
      id: 'add-files',
      label: 'Add files or photos',
      icon: 'paperclip',
      shortcut: '⌘U',
    },
    {
      id: 'add-github',
      label: 'Add from GitHub',
      icon: 'github',
    },
    {
      label: 'Skills',
      icon: 'sparkles',
      items: [
        { id: 'skill-creator', label: 'skill-creator', icon: 'sparkles' },
        { id: 'manage-skills', label: 'Manage skills', icon: 'settings' },
        { id: 'add-skill', label: 'Add skill', icon: 'file-text' },
      ],
    },
    { separator: true },
    { id: 'web-search', label: 'Web search', icon: 'globe', checked: true },
    { id: 'coming-soon', label: 'Coming soon', disabled: true },
  ];

  onMount(() => {
    if (!el) return;
    el.items = [...initialItems];

    el.addEventListener('kai-select', (e) => {
      const detail = (e as CustomEvent<{ id: string; checked?: boolean }>).detail;
      console.log('[kai-menu] kai-select', detail);

      // For the checkbox item, flip its state and reassign a fresh array ref.
      if (detail.id === 'web-search' && detail.checked !== undefined) {
        el!.items = el!.items!.map((item) =>
          item.id === 'web-search' ? { ...item, checked: detail.checked } : item,
        );
      }
    });
  });

  return (
    <div style={{ padding: '48px', display: 'flex', gap: '16px', 'align-items': 'flex-start' }}>
      <kai-menu ref={(e) => (el = e as MenuEl)}>
        <span slot="trigger" style={{ display: 'flex', 'align-items': 'center', 'justify-content': 'center' }}>
          <Plus size={18} />
        </span>
      </kai-menu>
      <p style={{ 'font-size': '13px', color: '#71717a', 'margin-top': '2px' }}>
        Click the + icon to open the cascading menu. Check the console for <code>kai-select</code> events.
      </p>
    </div>
  );
}

export const PlusMenu: Story = { render: () => <PlusMenuDemo /> };

