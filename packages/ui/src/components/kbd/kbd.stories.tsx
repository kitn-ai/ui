import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { Kbd } from './kbd';
import { KbdGroup } from './kbd-group';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';

const meta = {
  title: 'Components/Kbd',
  component: Kbd,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: { exclude: ['use:eventListener'] },
      description: componentDescription([
        'Displays a keyboard shortcut as key caps, one per key. Display only; it does not bind the keys.',
      ]),
    },
  },
  argTypes: {
    keys: {
      control: 'text',
      description: 'Shortcut spec, tokens joined by `+`.',
    },
    platform: {
      control: 'select',
      options: ['auto', 'mac', 'other'],
      description: 'Glyph platform. `auto` sniffs the OS.',
      table: { defaultValue: { summary: 'auto' } },
    },
    size: {
      control: 'select',
      options: ['sm', 'md'],
      description: 'Cap size.',
      table: { defaultValue: { summary: 'md' } },
    },
  },
  args: {
    keys: 'Mod+K',
    platform: 'mac',
    size: 'md',
  },
  render: (args) => <Kbd {...args} />,
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

const IMPORT = `import { Kbd } from '@kitn.ai/ui/solid';`;
const IMPORT_BUTTON = `import { Button, Kbd } from '@kitn.ai/ui/solid';`;
const IMPORT_GROUP = `import { Kbd, KbdGroup } from '@kitn.ai/ui/solid';`;

// `imports` is a parameter rather than a wrapper call so the composed text -- the
// thing the reader copies -- still carries its own import line. A helper that
// merely CALLS `src` would stop reading as a snippet producer (the
// docs-source-code chain would no longer be in this function's body), and every
// story behind it would report as having no snippet at all.
const src = (code: string, imports: string = IMPORT) => ({
  parameters: { docs: { source: { code: `${imports}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: type a `+`-joined spec and pick a platform. */
export const Playground: Story = {
  ...src(`<Kbd keys="Mod+K" platform="mac" />`),
};

/** Mac glyphs vs the cross-platform Ctrl set, same spec. */
export const Platforms: Story = {
  render: () => (
    <div class="flex items-center gap-5 text-sm text-foreground">
      <span class="flex items-center gap-2">mac <Kbd keys="Mod+Shift+K" platform="mac" /></span>
      <span class="flex items-center gap-2">other <Kbd keys="Mod+Shift+K" platform="other" /></span>
    </div>
  ),
  ...src(`<Kbd keys="Mod+Shift+K" platform="mac" />
<Kbd keys="Mod+Shift+K" platform="other" />`),
};

/** Modifiers, arrows, and named keys mapped to their glyphs. */
export const Glyphs: Story = {
  render: () => (
    <div class="flex flex-wrap items-center gap-3">
      <Kbd keys="Mod+K" platform="mac" />
      <Kbd keys="Mod+Shift+ArrowUp" platform="mac" />
      <Kbd keys="Alt+Enter" platform="mac" />
      <Kbd keys="Ctrl+Esc" platform="other" />
      <Kbd keys="Shift+Space" platform="mac" />
    </div>
  ),
  ...src(`<Kbd keys="Mod+K" platform="mac" />
<Kbd keys="Mod+Shift+ArrowUp" platform="mac" />
<Kbd keys="Alt+Enter" platform="mac" />
<Kbd keys="Ctrl+Esc" platform="other" />
<Kbd keys="Shift+Space" platform="mac" />`),
};

/** Both cap sizes for comparison. */
export const Sizes: Story = {
  render: () => (
    <div class="flex items-center gap-5">
      <Kbd keys="Mod+K" platform="mac" size="sm" />
      <Kbd keys="Mod+K" platform="mac" size="md" />
    </div>
  ),
  ...src(`<Kbd keys="Mod+K" platform="mac" size="sm" />
<Kbd keys="Mod+K" platform="mac" size="md" />`),
};

/** Omit `keys` to render custom content verbatim inside the cap row. */
export const CustomContent: Story = {
  render: () => (
    <Kbd>
      <span class="inline-flex h-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground">
        Esc
      </span>
    </Kbd>
  ),
  ...src(`<Kbd>
  <span class="...">Esc</span>
</Kbd>`),
};

/** Inline next to a label, the usual menu / command-row pattern. */
export const Inline: Story = {
  render: () => (
    <div class="flex items-center gap-2 text-sm text-foreground">
      <span>Command palette</span>
      <Kbd keys="Mod+K" platform="mac" class="ml-auto" />
    </div>
  ),
  ...src(`<div class="flex items-center gap-2 text-sm">
  <span>Command palette</span>
  <Kbd keys="Mod+K" platform="mac" />
</div>`),
};

/** The shortcut inside the thing it activates: a `Button` whose label carries the
 *  key. The button's own gap and taller box set the cap's context, so this is the
 *  comparison for corner radius and weight against a bare `Kbd` on its own. */
export const InButton: Story = {
  render: () => (
    <div class="flex flex-wrap items-center gap-3">
      <Button variant="outline" class="pr-2">
        Accept
        <Kbd keys="Enter" platform="mac" />
      </Button>
      <Button variant="ghost" class="pr-2">
        Search
        <Kbd keys="Mod+K" platform="mac" />
      </Button>
    </div>
  ),
  ...src(
    `<Button variant="outline" class="pr-2">
  Accept
  <Kbd keys="Enter" platform="mac" />
</Button>`,
    IMPORT_BUTTON,
  ),
};

/** Two SEPARATE shortcuts in one `KbdGroup` (Ctrl+B, Ctrl+K). Compare with
 *  `TokenSpec` beside it: the group is how you say "and then", because a `keys`
 *  token spec is one shortcut and cannot mark where it ends. */
export const Group: Story = {
  render: () => (
    <div class="flex flex-wrap items-center gap-5 text-sm text-foreground">
      <span class="flex items-center gap-2">
        two shortcuts
        <KbdGroup>
          <Kbd keys="Mod+B" platform="other" />
          <Kbd keys="Mod+K" platform="other" />
        </KbdGroup>
      </span>
      <span class="flex items-center gap-2">
        a typed sequence
        <KbdGroup>
          <Kbd>G</Kbd>
          <Kbd>D</Kbd>
        </KbdGroup>
      </span>
    </div>
  ),
  ...src(
    `{/* two shortcuts: each Kbd is its own chip */}
<KbdGroup>
  <Kbd keys="Mod+B" platform="other" />
  <Kbd keys="Mod+K" platform="other" />
</KbdGroup>

{/* a typed sequence: omit keys and render the letters yourself */}
<KbdGroup>
  <Kbd>G</Kbd>
  <Kbd>D</Kbd>
</KbdGroup>`,
    IMPORT_GROUP,
  ),
};

/** The contrast case: ONE shortcut with four tokens, which is what `keys` is for.
 *  Read it next to `Group` -- same caps, one chip versus several. */
export const TokenSpec: Story = {
  render: () => (
    <div class="flex items-center gap-5 text-sm text-foreground">
      <span class="flex items-center gap-2">
        one shortcut, many tokens
        <Kbd keys="Mod+Shift+K" platform="mac" />
      </span>
    </div>
  ),
  ...src(`<Kbd keys="Mod+Shift+K" platform="mac" />`),
};

/** In a sentence, which is where a shortcut most often appears. The caps sit on
 *  the text baseline via `align-middle`. */
export const InlineProse: Story = {
  render: () => (
    <p class="m-0 max-w-md text-sm leading-6 text-foreground">
      Press <Kbd keys="Mod+K" platform="mac" /> to search, or <Kbd keys="Mod+Shift+P" platform="mac" /> to open the
      command palette.
    </p>
  ),
  ...src(`<p class="text-sm leading-6">
  Press <Kbd keys="Mod+K" platform="mac" /> to search, or <Kbd keys="Mod+Shift+P" platform="mac" /> to open the
  command palette.
</p>`),
};
