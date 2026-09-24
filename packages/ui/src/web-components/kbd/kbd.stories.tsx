import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import './kbd';
import './kbd-group';
import '../button/button'; // side effect: registers <kai-button>

// Declare the custom element tags for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-kbd': JSX.HTMLAttributes<HTMLElement> & { keys?: string; platform?: string; size?: string; theme?: string };
      'kai-kbd-group': JSX.HTMLAttributes<HTMLElement> & { theme?: string };
      // Identical to the declaration 13 showcase stories carry: the interface
      // augmentation MERGES, so a second copy that implies a different type is a
      // compile error in every file that declares it, not just this one.
      'kai-button': JSX.HTMLAttributes<HTMLElement> & { variant?: string; size?: string; icon?: string; 'icon-trailing'?: string; label?: string; disabled?: boolean; full?: boolean; align?: 'start' | 'center' | 'end' };
    }
  }
}

const meta: Meta = {
  title: 'Labs/Foundations/Kbd',
};
export default meta;

const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

export const States: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: '1.5rem', 'align-items': 'center', 'flex-wrap': 'wrap', padding: '1rem' }}>
      <kai-kbd keys="Mod+K" platform="mac"></kai-kbd>
      <kai-kbd keys="Mod+Shift+ArrowUp" platform="mac"></kai-kbd>
      <kai-kbd keys="Ctrl+Esc" platform="other"></kai-kbd>
      <kai-kbd keys="Alt+Enter" platform="mac"></kai-kbd>
      <kai-kbd keys="Mod+K" platform="mac" size="sm"></kai-kbd>
      <kai-kbd>Esc</kai-kbd>
    </div>
  ),
  parameters: src(`<!-- All scalar props: set as plain attributes. Display only; does not bind keys. -->
<kai-kbd keys="Mod+K" platform="mac"></kai-kbd>
<kai-kbd keys="Mod+Shift+ArrowUp" platform="mac"></kai-kbd>
<kai-kbd keys="Ctrl+Esc" platform="other"></kai-kbd>
<kai-kbd keys="Alt+Enter" platform="mac"></kai-kbd>
<kai-kbd keys="Mod+K" platform="mac" size="sm"></kai-kbd>
<!-- Omit keys to render your own content -->
<kai-kbd>Esc</kai-kbd>`),
};

/**
 * `<kai-kbd-group>` welds several `<kai-kbd>`s into ONE key strip: no gap between the
 * caps, one hairline at each seam, corners only at the strip's ends. Use it when one
 * key is spelled with caps from more than one element, or as a typed sequence; a
 * `keys` token spec is a single `<kai-kbd>` and already renders its own caps. Two
 * DIFFERENT shortcuts are two elements (or two groups), not one group.
 */
export const Group: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', 'align-items': 'center', 'flex-wrap': 'wrap', padding: '1rem' }}>
      <kai-kbd-group>
        <kai-kbd keys="Mod" platform="other"></kai-kbd>
        <kai-kbd keys="K" platform="other"></kai-kbd>
      </kai-kbd-group>
      <kai-kbd-group>
        <kai-kbd keys="G"></kai-kbd>
        <kai-kbd keys="D"></kai-kbd>
      </kai-kbd-group>
    </div>
  ),
  parameters: src(`<!-- one key: the group welds its caps into one strip -->
<kai-kbd-group>
  <kai-kbd keys="Mod" platform="other"></kai-kbd>
  <kai-kbd keys="K" platform="other"></kai-kbd>
</kai-kbd-group>

<!-- a typed sequence: G then D -->
<kai-kbd-group>
  <kai-kbd keys="G"></kai-kbd>
  <kai-kbd keys="D"></kai-kbd>
</kai-kbd-group>`),
};

/** The shortcut inside the button it activates, the shadcn "Button" example.
 *  `<kai-kbd>` is ordinary light-DOM content here, so any element that slots
 *  children can carry one. */
export const InButton: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: '0.75rem', 'align-items': 'center', padding: '1rem' }}>
      <kai-button variant="outline">
        Accept
        <kai-kbd keys="Enter" platform="mac"></kai-kbd>
      </kai-button>
      <kai-button variant="ghost">
        Search
        <kai-kbd keys="Mod+K" platform="mac"></kai-kbd>
      </kai-button>
    </div>
  ),
  parameters: src(`<!-- the shortcut rides in the button's label slot -->
<kai-button variant="outline">
  Accept
  <kai-kbd keys="Enter" platform="mac"></kai-kbd>
</kai-button>

<kai-button variant="ghost">
  Search
  <kai-kbd keys="Mod+K" platform="mac"></kai-kbd>
</kai-button>`),
};
