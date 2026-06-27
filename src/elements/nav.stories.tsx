import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './nav';
import type { KaiNavItem } from '../ui/nav';

// Declare the custom element tag for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-nav': JSX.HTMLAttributes<HTMLElement> & { value?: string; 'default-value'?: string; theme?: string };
    }
  }
}

const meta: Meta = {
  title: 'Labs/Foundations/Nav',
};
export default meta;

const ITEMS: KaiNavItem[] = [
  { id: 'new', label: 'New task', icon: 'plus', trailing: 'pencil' },
  { id: 'projects', label: 'Projects', icon: 'folder' },
  { id: 'artifacts', label: 'Artifacts', icon: 'sparkles' },
  { id: 'scheduled', label: 'Scheduled', icon: 'settings' },
  { id: 'dispatch', label: 'Dispatch', icon: 'share', badge: 'Beta' },
  { id: 'customize', label: 'Customize', icon: 'book-open' },
];

export const Sidebar: StoryObj = {
  render: () => {
    let el!: HTMLElement & { items?: KaiNavItem[] };
    onMount(() => { el.items = ITEMS; });
    return (
      <div style={{ width: '240px', padding: '1rem' }}>
        <kai-nav ref={el} default-value="new"></kai-nav>
      </div>
    );
  },
};
