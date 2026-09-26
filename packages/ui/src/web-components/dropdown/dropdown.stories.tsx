import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import '../register/register'; // side effect: registers all kai-* custom elements (incl. kai-dropdown)
import { attachKaiActions } from '../../stories/docs/story-actions';

// Declare the custom element tag for SolidJS JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-dropdown': JSX.HTMLAttributes<HTMLElement> & {
        theme?: string;
        'trigger-icon'?: string;
        'trigger-label'?: string;
        'trigger-icon-trailing'?: string;
        label?: string;
        full?: boolean;
        open?: boolean;
        'default-open'?: boolean;
        disabled?: boolean;
      };
    }
  }
}

const meta = {
  title: 'Labs/Dropdown',
  parameters: { layout: 'padded' },
} satisfies Meta;
export default meta;
type Story = StoryObj;

// Hand-written HTML for the "Show code" panel (real consumer markup, not JSX).
const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

// Slotted rows must carry role="menuitem" and tabindex="-1" to join the surface's roving
// focus: ArrowUp/Down, Home/End and typeahead reach only what matches that role.
/** A dropdown whose rows you author yourself, unlike the data-driven `kai-menu`. */
export const SlottedRows: Story = {
  render: () => (
    <kai-dropdown
      label="Row actions"
      ref={(el: HTMLElement) => attachKaiActions(el, 'kai-dropdown')}
    >
      <span slot="trigger" aria-hidden="true">&#8942;</span>
      <div role="menuitem" tabindex="-1" style={{ padding: '6px 8px', cursor: 'pointer' }}>Rename</div>
      <div role="menuitem" tabindex="-1" style={{ padding: '6px 8px', cursor: 'pointer' }}>Duplicate</div>
      <div role="separator" style={{ height: '1px', margin: '4px -4px', background: 'var(--color-border)' }} />
      <div role="menuitem" tabindex="-1" style={{ padding: '6px 8px', cursor: 'pointer', color: 'var(--color-destructive)' }}>Delete</div>
    </kai-dropdown>
  ),
  parameters: src(`<kai-dropdown label="Row actions">
  <span slot="trigger" aria-hidden="true">&#8942;</span>
  <div role="menuitem" tabindex="-1">Rename</div>
  <div role="menuitem" tabindex="-1">Duplicate</div>
  <div role="separator"></div>
  <div role="menuitem" tabindex="-1">Delete</div>
</kai-dropdown>`),
};

// `label` is deliberately absent here: the visible `trigger-label` is already the accessible
// name, and a `label` that does not contain it is unreachable by speech input (WCAG 2.5.3).
/**
 * A trigger label with a trailing chevron, the shape of a select.
 */
export const LabelledTrigger: Story = {
  render: () => (
    <kai-dropdown
      trigger-label="Sort by"
      trigger-icon-trailing="chevron-down"
      ref={(el: HTMLElement) => attachKaiActions(el, 'kai-dropdown')}
    >
      <button type="button" role="menuitem" style={{ display: 'block', width: '100%', padding: '6px 8px', 'text-align': 'left' }}>Newest</button>
      <button type="button" role="menuitem" style={{ display: 'block', width: '100%', padding: '6px 8px', 'text-align': 'left' }}>Oldest</button>
      <button type="button" role="menuitem" style={{ display: 'block', width: '100%', padding: '6px 8px', 'text-align': 'left' }}>Name</button>
    </kai-dropdown>
  ),
  parameters: src(`<kai-dropdown trigger-label="Sort by" trigger-icon-trailing="chevron-down">
  <button type="button" role="menuitem">Newest</button>
  <button type="button" role="menuitem">Oldest</button>
  <button type="button" role="menuitem">Name</button>
</kai-dropdown>`),
};
