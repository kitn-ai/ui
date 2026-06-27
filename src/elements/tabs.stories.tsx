import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './tabs';
import type { KaiTabItem } from '../ui/tabs';

// Declare the custom element tag for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-tabs': JSX.HTMLAttributes<HTMLElement> & { variant?: string; value?: string; 'default-value'?: string; disabled?: boolean; theme?: string };
    }
  }
}

const meta: Meta = {
  title: 'Labs/Foundations/Tabs',
};
export default meta;

const ITEMS: KaiTabItem[] = [
  { id: 'chat', label: 'Chat', icon: 'message-circle' },
  { id: 'cowork', label: 'Cowork' },
  { id: 'code', label: 'Code', icon: 'code' },
];

function Strip(props: { variant?: 'segmented' | 'underline'; defaultValue?: string }) {
  let el!: HTMLElement & { items?: KaiTabItem[] };
  onMount(() => { el.items = ITEMS; });
  return (
    <kai-tabs
      ref={el}
      variant={props.variant}
      default-value={props.defaultValue ?? 'chat'}
    ></kai-tabs>
  );
}

export const Variants: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', 'flex-direction': 'column', gap: '2rem', padding: '1rem' }}>
      <Strip variant="segmented" />
      <Strip variant="underline" defaultValue="code" />
    </div>
  ),
};
