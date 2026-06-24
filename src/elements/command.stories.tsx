import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers all kai-* custom elements (incl. kai-command)
import type { KaiCommandItem } from './command';

// Declare the custom element tag for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-command': JSX.HTMLAttributes<HTMLElement> & {
        placeholder?: string;
        'empty-label'?: string;
        theme?: string;
      };
    }
  }
}

interface CommandEl extends HTMLElement {
  items?: KaiCommandItem[];
}

const meta = {
  title: 'Spikes/Kai Command',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

/**
 * Reproduces a @-mention or slash-command picker backed by `<kai-command>`.
 * Items are grouped under "Mac apps", "Chats", and "Files". Set as a JS property
 * in `onMount`. `kai-select` and `kai-query-change` are both logged to the console.
 */
function MentionPickerDemo() {
  let el: CommandEl | undefined;

  const items: KaiCommandItem[] = [
    // Mac apps
    { id: 'ss', label: 'Screen Studio', icon: 'monitor', description: 'Computer use', group: 'Mac apps' },
    { id: 'ssb', label: 'Screen Studio Beta', icon: 'monitor', description: 'Computer use', group: 'Mac apps' },
    // Chats
    { id: 'rs', label: 'Record screen', icon: 'message-circle', description: 'Building ScreenOverlay', group: 'Chats' },
    { id: 'bso', label: 'Building ScreenOverlay', icon: 'message-circle', group: 'Chats' },
    // Files
    { id: 'screens', label: 'screens', icon: 'folder', group: 'Files' },
    { id: 'screen9', label: 'screen9.py', icon: 'file-text', description: '/Users/rob/screen9.py', group: 'Files' },
    { id: 'screenrec', label: 'screenrec.py', icon: 'file-text', description: '/Users/rob/screenrec.py', group: 'Files' },
  ];

  onMount(() => {
    if (!el) return;
    el.items = [...items];

    el.addEventListener('kai-select', (e) => {
      console.log('[kai-command] kai-select', (e as CustomEvent<{ id: string }>).detail);
    });

    el.addEventListener('kai-query-change', (e) => {
      console.log('[kai-command] kai-query-change', (e as CustomEvent<{ value: string }>).detail);
    });
  });

  return (
    <div style={{ padding: '48px', display: 'flex', gap: '24px', 'align-items': 'flex-start' }}>
      <div style={{ width: '320px', border: '1px solid var(--color-border, #e4e4e7)', 'border-radius': '12px', overflow: 'hidden' }}>
        <kai-command
          ref={(e) => (el = e as CommandEl)}
          placeholder="Search…"
        />
      </div>
      <p style={{ 'font-size': '13px', color: '#71717a', 'margin-top': '4px', 'max-width': '240px' }}>
        Type to filter across all groups. Arrow keys move the selection; Enter picks;
        Escape clears. Watch the console for <code>kai-select</code> and <code>kai-query-change</code>.
      </p>
    </div>
  );
}

export const MentionPicker: Story = { render: () => <MentionPickerDemo /> };

// ---------------------------------------------------------------------------
// Dark — validates that kai-command renders correctly with theme="dark"
// ---------------------------------------------------------------------------

function MentionPickerDarkDemo() {
  let el: CommandEl | undefined;

  const items: KaiCommandItem[] = [
    { id: 'ss', label: 'Screen Studio', icon: 'monitor', description: 'Computer use', group: 'Mac apps' },
    { id: 'ssb', label: 'Screen Studio Beta', icon: 'monitor', description: 'Computer use', group: 'Mac apps' },
    { id: 'rs', label: 'Record screen', icon: 'message-circle', description: 'Building ScreenOverlay', group: 'Chats' },
    { id: 'bso', label: 'Building ScreenOverlay', icon: 'message-circle', group: 'Chats' },
    { id: 'screens', label: 'screens', icon: 'folder', group: 'Files' },
    { id: 'screen9', label: 'screen9.py', icon: 'file-text', description: '/Users/rob/screen9.py', group: 'Files' },
    { id: 'screenrec', label: 'screenrec.py', icon: 'file-text', description: '/Users/rob/screenrec.py', group: 'Files' },
  ];

  onMount(() => {
    if (!el) return;
    el.items = [...items];

    el.addEventListener('kai-select', (e) => {
      console.log('[kai-command dark] kai-select', (e as CustomEvent<{ id: string }>).detail);
    });

    el.addEventListener('kai-query-change', (e) => {
      console.log('[kai-command dark] kai-query-change', (e as CustomEvent<{ value: string }>).detail);
    });
  });

  return (
    <div style={{ padding: '48px', background: '#161618', 'min-height': '100vh', display: 'flex', gap: '24px', 'align-items': 'flex-start' }}>
      <div style={{ width: '320px', 'border-radius': '12px', overflow: 'hidden' }}>
        <kai-command
          ref={(e) => (el = e as CommandEl)}
          theme="dark"
          placeholder="Search…"
        />
      </div>
      <p style={{ 'font-size': '13px', color: '#71717a', 'margin-top': '4px', 'max-width': '240px' }}>
        Dark mode. Type to filter. Arrow keys move selection; Enter picks; Escape clears. Watch the console.
      </p>
    </div>
  );
}

export const Dark: Story = {
  render: () => <MentionPickerDarkDemo />,
  parameters: {
    // Force dark mode so preview.ts syncs theme="dark" onto all kai-* elements
    // and the kit's CSS tokens resolve to dark values in the shadow root.
    darkMode: { current: 'dark' },
  },
};
