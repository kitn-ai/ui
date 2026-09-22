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
 * `<kai-kbd-group>` lays several separate `<kai-kbd>`s out as one hint. Use it when
 * the caps come from MORE THAN ONE shortcut or from a typed sequence; a `keys`
 * token spec is a single shortcut and cannot say where one ends and the next
 * begins. The group owns the gap between the kbd elements (`::part(group)`).
 */
export const Group: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', gap: '2rem', 'align-items': 'center', 'flex-wrap': 'wrap', padding: '1rem' }}>
      <kai-kbd-group>
        <kai-kbd keys="Mod+B" platform="other"></kai-kbd>
        <kai-kbd keys="Mod+K" platform="other"></kai-kbd>
      </kai-kbd-group>
      <kai-kbd-group>
        <kai-kbd>G</kai-kbd>
        <kai-kbd>D</kai-kbd>
      </kai-kbd-group>
    </div>
  ),
  parameters: src(`<!-- two separate shortcuts: each kai-kbd is its own chip -->
<kai-kbd-group>
  <kai-kbd keys="Mod+B" platform="other"></kai-kbd>
  <kai-kbd keys="Mod+K" platform="other"></kai-kbd>
</kai-kbd-group>

<!-- a typed sequence: omit keys and slot the letters yourself -->
<kai-kbd-group>
  <kai-kbd>G</kai-kbd>
  <kai-kbd>D</kai-kbd>
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
