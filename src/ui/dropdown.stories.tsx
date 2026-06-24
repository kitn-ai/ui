import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';
import { Paperclip, Github, Sparkles, Globe, Settings, Plus, FileText } from 'lucide-solid';
import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownSeparator, DropdownLabel, DropdownCheckboxItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
} from './dropdown';
import { buttonVariants } from './button';
import { componentDescription } from '../stories/docs/element-controls';

const meta = {
  title: 'Solid (Advanced)/Primitives/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: componentDescription([
        'An accessible menu that opens from a trigger, built on the kit\'s DIY overlay core (no third-party dependency). Implements the WAI-ARIA menu-button pattern: `aria-haspopup`/`aria-expanded` wiring, roving focus with Arrow/Home/End, type-ahead, Escape/outside-click dismissal, and focus return to the trigger. Portals into the active shadow root and resolves focus through `getRootNode()` so roving focus works inside web components.',
        '**When to use:** for a list of *actions* or single-choice options triggered by a button — overflow "⋯" menus, model pickers, scope selectors. For hover-only context use `HoverCard`; for a label use `Tooltip`.',
        '**How to use:** compose `Dropdown` › `DropdownTrigger` (the button) + `DropdownContent` › one `DropdownItem` per action. Give each item an `onSelect` handler — selecting also closes the menu.',
      ]),
    },
  },
  render: () => <DropdownDemo />,
} satisfies Meta<typeof Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Dropdown, DropdownTrigger, DropdownContent, DropdownItem } from '@kitn.ai/ui';`;
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

const CASCADE_IMPORT = `import {
  Dropdown, DropdownTrigger, DropdownContent, DropdownItem,
  DropdownLabel, DropdownSeparator, DropdownCheckboxItem,
  DropdownSub, DropdownSubTrigger, DropdownSubContent,
} from '@kitn.ai/ui';`;

function CascadingMenuDemo() {
  const [webSearch, setWebSearch] = createSignal(true);
  const [last, setLast] = createSignal<string>();
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
          <DropdownItem onSelect={() => setLast('Add files or photos')}>
            <Paperclip class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            Add files or photos
            <span class="ml-auto pl-4 text-xs tracking-widest text-muted-foreground">⌘U</span>
          </DropdownItem>
          <DropdownItem onSelect={() => setLast('Add from GitHub')}>
            <Github class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            Add from GitHub
          </DropdownItem>
          <DropdownSub>
            <DropdownSubTrigger>
              <Sparkles class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              Skills
            </DropdownSubTrigger>
            <DropdownSubContent class="min-w-[12rem]">
              <DropdownItem onSelect={() => setLast('skill-creator')}>
                <Sparkles class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                skill-creator
              </DropdownItem>
              <DropdownItem onSelect={() => setLast('Manage skills')}>
                <Settings class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                Manage skills
              </DropdownItem>
              <DropdownItem onSelect={() => setLast('Add skill')}>
                <FileText class="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                Add skill
              </DropdownItem>
            </DropdownSubContent>
          </DropdownSub>
          <DropdownSeparator />
          <DropdownCheckboxItem checked={webSearch()} onSelect={() => setWebSearch((v) => !v)}>
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

/**
 * The composer's `＋` action menu: a section `DropdownLabel`, items with leading
 * icons + a trailing keyboard-shortcut span, a `DropdownSub` ("Skills") that
 * opens a nested menu on hover / ArrowRight, a `DropdownSeparator`, and a
 * `DropdownCheckboxItem` ("Web search") that toggles in place without closing.
 */
export const CascadingMenu: Story = {
  render: () => <CascadingMenuDemo />,
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
