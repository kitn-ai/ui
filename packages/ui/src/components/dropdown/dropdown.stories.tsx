import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test';
import { createSignal } from 'solid-js';
import { Paperclip, Github, Sparkles, Globe, Settings, Plus, FileText } from 'lucide-solid';
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownSeparator, DropdownLabel, DropdownCheckboxItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
} from './dropdown';
import { buttonVariants } from '../button/button';
import { renderIcon } from '../icon/icon';
import { cn } from '../../utils/cn';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'A menu of actions that opens from a trigger.',
      ]),
    },
  },
  argTypes: {
    onSelect: {
      action: 'select',
      description: 'Per-item handler (`DropdownItem` / `DropdownCheckboxItem`). Fires the item label when chosen.',
      table: { category: 'Events' },
    },
  },
  args: {
    onSelect: fn(),
  },
  render: (args) => <DropdownDemo onSelect={args.onSelect} />,
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Per-item select handler, surfaced to the Actions panel. Each demo also keeps a
 *  local signal so the UI shows the last selection inline. */
type SelectHandler = (label: string) => void;

const IMPORT = `import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem, buttonVariants, cn } from '@kitn.ai/ui';
import { renderIcon } from '@kitn.ai/ui/solid';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

function DropdownDemo(props: { onSelect?: SelectHandler }) {
  const [last, setLast] = createSignal<string>();
  const select = (label: string) => { setLast(label); props.onSelect?.(label); };
  return (
    <div class="space-y-3">
      <Dropdown>
        <DropdownTrigger class={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
          Actions
          {renderIcon('chevron-down', { class: 'size-3.5 shrink-0 opacity-60' })}
        </DropdownTrigger>
        <DropdownContent>
          <DropdownItem onSelect={() => select('Rename')}>Rename</DropdownItem>
          <DropdownItem onSelect={() => select('Duplicate')}>Duplicate</DropdownItem>
          <DropdownItem onSelect={() => select('Archive')}>Archive</DropdownItem>
        </DropdownContent>
      </Dropdown>
      <p class="text-xs text-muted-foreground">Last selected: {last() ?? '—'}</p>
    </div>
  );
}

/** Click the trigger (or focus it and press ↓ / Enter) to open the menu; Arrow keys move, Escape closes. */
export const Playground: Story = {
  ...src(`<Dropdown>
  <DropdownTrigger class={cn(buttonVariants({ variant: 'outline' }), 'gap-1.5')}>
    Actions
    {renderIcon('chevron-down', { class: 'size-3.5 shrink-0 opacity-60' })}
  </DropdownTrigger>
  <DropdownContent>
    <DropdownItem onSelect={() => rename()}>Rename</DropdownItem>
    <DropdownItem onSelect={() => duplicate()}>Duplicate</DropdownItem>
    <DropdownItem onSelect={() => archive()}>Archive</DropdownItem>
  </DropdownContent>
</Dropdown>`),
};

const CASCADE_IMPORT = `import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownLabel, DropdownSeparator, DropdownCheckboxItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
} from '@kitn.ai/ui/solid';`;

function CascadingMenuDemo(props: { onSelect?: SelectHandler }) {
  const [webSearch, setWebSearch] = createSignal(true);
  const [last, setLast] = createSignal<string>();
  const select = (label: string) => { setLast(label); props.onSelect?.(label); };
  const toggleWebSearch = () => { setWebSearch((v) => !v); props.onSelect?.(`Web search: ${webSearch() ? 'on' : 'off'}`); };
  return (
    <div class="space-y-3">
      <Dropdown>
        <DropdownTrigger
          class={buttonVariants({ variant: 'outline', size: 'icon' })}
          aria-label="Add"
        >
          <Plus class="h-4 w-4" />
        </DropdownTrigger>
        <DropdownContent class="min-w-[15rem]">
          <DropdownLabel>Actions</DropdownLabel>
          <DropdownItem onSelect={() => select('Add files or photos')}>
            <Paperclip class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            Add files or photos
            <span class="ml-auto pl-4 text-xs tracking-widest text-muted-foreground">⌘U</span>
          </DropdownItem>
          <DropdownItem onSelect={() => select('Add from GitHub')}>
            <Github class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            Add from GitHub
          </DropdownItem>
          <DropdownSub>
            <DropdownSubTrigger>
              <Sparkles class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              Skills
            </DropdownSubTrigger>
            <DropdownSubContent class="min-w-[12rem]">
              <DropdownItem onSelect={() => select('skill-creator')}>
                <Sparkles class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                skill-creator
              </DropdownItem>
              <DropdownItem onSelect={() => select('Manage skills')}>
                <Settings class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                Manage skills
              </DropdownItem>
              <DropdownItem onSelect={() => select('Add skill')}>
                <FileText class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                Add skill
              </DropdownItem>
            </DropdownSubContent>
          </DropdownSub>
          <DropdownSeparator />
          <DropdownCheckboxItem checked={webSearch()} onSelect={toggleWebSearch}>
            <Globe class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            Web search
          </DropdownCheckboxItem>
        </DropdownContent>
      </Dropdown>
      <p class="text-xs text-muted-foreground">
        Last action: {last() ?? '—'} · Web search: {webSearch() ? 'on' : 'off'}
      </p>
    </div>
  );
}

function LongMenuDemo(props: { onSelect?: SelectHandler }) {
  const [last, setLast] = createSignal<string>();
  const select = (label: string) => { setLast(label); props.onSelect?.(label); };
  return (
    <div class="space-y-3">
      <Dropdown>
        <DropdownTrigger class={cn(buttonVariants({ variant: 'outline' }))}>Chats</DropdownTrigger>
        <DropdownContent>
          <DropdownLabel>Your chats</DropdownLabel>
          {Array.from({ length: 30 }, (_, i) => (
            <DropdownItem onSelect={() => select(`Chat ${i + 1}`)}>{`Chat ${i + 1}`}</DropdownItem>
          ))}
        </DropdownContent>
      </Dropdown>
      <p class="text-xs text-muted-foreground">Last action: {last() ?? '—'}</p>
    </div>
  );
}

/**
 * A menu whose LENGTH comes from the consumer's data, which is the case the height
 * ceiling exists for: the rail's palette listing the user's own conversations. 30 chats
 * here, and the surface caps itself at the room between its trigger and the viewport
 * edge and scrolls the rest, so the last row is reached by scrolling rather than by
 * resizing the window. Open it in a short window and the panel shrinks with it; the
 * ceiling is `--kai-dropdown-max-height`, defaulting to `min(20rem, calc(100dvh - 2rem))`.
 */
export const LongMenu: Story = {
  render: (args: { onSelect?: SelectHandler }) => <LongMenuDemo onSelect={args.onSelect} />,
  // Real layout, so this is where the ceiling can be measured: the surface is bounded at
  // its default (20rem) yet holds 30 rows, it scrolls, and roving focus carries the last row
  // into the visible part of it. jsdom has no layout and cannot state any of this.
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Chats' }));
    const menu = await screen.findByRole('menu');
    await waitFor(() => expect(menu.getBoundingClientRect().height).toBeGreaterThan(0));

    const ceiling = 20 * parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(menu.getBoundingClientRect().height).toBeLessThanOrEqual(ceiling + 1);
    expect(menu.scrollHeight).toBeGreaterThan(menu.clientHeight);
    expect(getComputedStyle(menu).overflowY).toBe('auto');

    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(30);
    for (let i = 0; i < items.length; i++) await userEvent.keyboard('{ArrowDown}');
    await waitFor(() => expect(document.activeElement).toBe(items[items.length - 1]));
    const box = menu.getBoundingClientRect();
    const row = items[items.length - 1].getBoundingClientRect();
    expect(row.top).toBeGreaterThanOrEqual(box.top - 1);
    expect(row.bottom).toBeLessThanOrEqual(box.bottom + 1);
    expect(menu.scrollTop).toBeGreaterThan(0);
  },
  parameters: {
    // A capped menu now scrolls at its 20rem default, which trips axe's
    // `scrollable-region-focusable`: the surface is `tabindex="-1"` and its rows are roving
    // (`-1`), so no element in it is in the tab order. That rule models a scrollable DOCUMENT
    // region reached by Tab; a menu is operated by ArrowUp/Down/Home/End and closes on Tab, so
    // a tab stop on it would be the wrong fix. Waived for THIS story only, and the play
    // function above is what proves the keyboard path reaches the last row.
    a11y: { config: { rules: [{ id: 'scrollable-region-focusable', enabled: false }] } },
    docs: {
      source: {
        language: 'tsx',
        code: `${IMPORT}
import { DropdownLabel } from '@kitn.ai/ui/solid';

const chats = Array.from({ length: 30 }, (_, i) => \`Chat \${i + 1}\`);

<Dropdown>
  <DropdownTrigger class={cn(buttonVariants({ variant: 'outline' }))}>Chats</DropdownTrigger>
  <DropdownContent>
    <DropdownLabel>Your chats</DropdownLabel>
    {chats.map((chat) => (
      <DropdownItem onSelect={() => open(chat)}>{chat}</DropdownItem>
    ))}
  </DropdownContent>
</Dropdown>`,
      },
    },
  },
};

/**
 * The composer's Plus action menu: a section `DropdownLabel`, items with leading
 * icons + a trailing keyboard-shortcut span, a `DropdownSub` ("Skills") that
 * opens a nested menu on hover / ArrowRight, a `DropdownSeparator`, and a
 * `DropdownCheckboxItem` ("Web search") that toggles in place without closing.
 */
export const CascadingMenu: Story = {
  render: (args: { onSelect?: SelectHandler }) => <CascadingMenuDemo onSelect={args.onSelect} />,
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `${CASCADE_IMPORT}

<Dropdown>
  <DropdownTrigger aria-label="Add"><Plus /></DropdownTrigger>
  <DropdownContent>
    <DropdownLabel>Actions</DropdownLabel>
    <DropdownItem onSelect={addFiles}>
      <Paperclip /> Add files or photos
      <span class="ml-auto text-xs text-muted-foreground">⌘U</span>
    </DropdownItem>
    <DropdownItem onSelect={addFromGitHub}><Github /> Add from GitHub</DropdownItem>
    <DropdownSub>
      <DropdownSubTrigger><Sparkles /> Skills</DropdownSubTrigger>
      <DropdownSubContent>
        <DropdownItem onSelect={() => run('skill-creator')}>skill-creator</DropdownItem>
        <DropdownItem onSelect={manageSkills}>Manage skills</DropdownItem>
        <DropdownItem onSelect={addSkill}>Add skill</DropdownItem>
      </DropdownSubContent>
    </DropdownSub>
    <DropdownSeparator />
    <DropdownCheckboxItem checked={webSearch()} onSelect={() => setWebSearch((v) => !v)}>
      <Globe /> Web search
    </DropdownCheckboxItem>
  </DropdownContent>
</Dropdown>`,
      },
    },
  },
};
