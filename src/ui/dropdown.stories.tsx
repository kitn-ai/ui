import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from './dropdown';
import { buttonVariants } from './button';

const meta = {
  title: 'UI/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'An accessible menu that opens from a trigger, built on the kit\'s DIY overlay core (no third-party dependency). Implements the WAI-ARIA menu-button pattern: `aria-haspopup`/`aria-expanded` wiring, roving focus with Arrow/Home/End, type-ahead, Escape/outside-click dismissal, and focus return to the trigger. Portals into the active shadow root and resolves focus through `getRootNode()` so roving focus works inside web components.',
          '**When to use:** for a list of *actions* or single-choice options triggered by a button — overflow "⋯" menus, model pickers, scope selectors. For hover-only context use `HoverCard`; for a label use `Tooltip`.',
          '**How to use:** compose `Dropdown` › `DropdownTrigger` (the button) + `DropdownContent` › one `DropdownItem` per action. Give each item an `onSelect` handler — selecting also closes the menu.',
        ].join('\n\n'),
      },
    },
  },
  render: () => <DropdownDemo />,
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@kitnai/chat';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

function DropdownDemo() {
  const [last, setLast] = createSignal<string>();
  return (
    <div class="space-y-3">
      <Dropdown>
        <DropdownTrigger class={buttonVariants({ variant: 'outline' })}>Actions ▾</DropdownTrigger>
        <DropdownContent>
          <DropdownItem onSelect={() => setLast('Rename')}>Rename</DropdownItem>
          <DropdownItem onSelect={() => setLast('Duplicate')}>Duplicate</DropdownItem>
          <DropdownItem onSelect={() => setLast('Archive')}>Archive</DropdownItem>
        </DropdownContent>
      </Dropdown>
      <p class="text-xs text-muted-foreground">Last selected: {last() ?? '—'}</p>
    </div>
  );
}

/** Click the trigger (or focus it and press ↓ / Enter) to open the menu; Arrow keys move, Escape closes. */
export const Playground: Story = {
  ...src(`<Dropdown>
  <DropdownTrigger class={buttonVariants({ variant: 'outline' })}>Actions ▾</DropdownTrigger>
  <DropdownContent>
    <DropdownItem onSelect={() => rename()}>Rename</DropdownItem>
    <DropdownItem onSelect={() => duplicate()}>Duplicate</DropdownItem>
    <DropdownItem onSelect={() => archive()}>Archive</DropdownItem>
  </DropdownContent>
</Dropdown>`),
};
