import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { SlidersHorizontal } from 'lucide-solid';
import { Card } from './card';
import { Button } from './button';
import { componentDescription } from '../stories/docs/element-controls';
import cover from '../elements/card-media.jpg';

const meta = {
  title: 'Components/Primitives/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      controls: {
        exclude: [
          'media',
          'header',
          'headerActions',
          'footer',
          'footerActions',
          'onDismiss',
          'onCardClick',
          'href',
          'target',
          'rel',
          'collapse',
          'children',
          'class',
          'use:eventListener',
        ],
      },
      description: componentDescription([
        'A presentational surface with structural regions: `media`, `header` (+ `headerActions`), the body (the default slot, shown when `hasBody` is set), and `footer` (+ `footerActions`). Pick a surface with `appearance` and a layout with `orientation`. Make the whole card a link (`href`) or a button (`clickable`), but not alongside footer action buttons.',
      ]),
    },
  },
  argTypes: {
    appearance: {
      control: 'select',
      options: ['outlined', 'filled', 'plain', 'accent'],
      description: 'Surface treatment.',
      table: { defaultValue: { summary: 'outlined' } },
    },
    orientation: {
      control: 'select',
      options: ['vertical', 'horizontal', 'responsive'],
      description: 'Media on top (`vertical`), at the start (`horizontal`), or width-driven (`responsive`).',
      table: { defaultValue: { summary: 'vertical' } },
    },
    dense: {
      control: 'boolean',
      description: 'Tighter spacing for dense lists.',
    },
    hasBody: {
      control: 'boolean',
      description: 'Render the default-slot body. Off skips an empty body region.',
    },
    dismissible: {
      control: 'boolean',
      description: 'Show a dismiss (×) that hides the card and fires `onDismiss`.',
    },
    clickable: {
      control: 'boolean',
      description: 'Make the whole card a button with Enter/Space activation.',
    },
  },
  args: {
    appearance: 'outlined',
    orientation: 'vertical',
    dense: false,
    hasBody: true,
    dismissible: false,
    clickable: false,
  },
  render: (args) => (
    <Card {...args} class="max-w-sm" header={<strong class="font-semibold">Weekly report</strong>}>
      Generated just now from your last seven days of activity.
    </Card>
  ),
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// Region props (media / header / footer / actions) take JSX, and the body renders
// only when `hasBody` is set. `Card` is a scoped SolidJS import, so the unprefixed
// name is safe; alias on import if a host already has a `Card`.
const IMPORT = `import { Card } from '@kitn.ai/ui';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: toggle the controls to explore the variants. */
export const Playground: Story = {
  ...src(`<Card appearance="outlined" hasBody header={<strong>Weekly report</strong>}>
  Generated just now from your last seven days of activity.
</Card>`),
};

/** The four surface treatments. */
export const Appearances: Story = {
  render: () => (
    <div class="grid max-w-3xl grid-cols-2 gap-4">
      <Card appearance="outlined" hasBody header={<strong class="font-semibold">Outlined</strong>}>
        The default. A bordered card with a soft elevation.
      </Card>
      <Card appearance="filled" hasBody header={<strong class="font-semibold">Filled</strong>}>
        A raised opaque surface, no border.
      </Card>
      <Card appearance="plain" hasBody header={<strong class="font-semibold">Plain</strong>}>
        No border or background. A padded region.
      </Card>
      <Card appearance="accent" hasBody header={<strong class="font-semibold">Accent</strong>}>
        The bold primary fill, for announcements.
      </Card>
    </div>
  ),
  ...src(`<Card appearance="outlined" hasBody header={<strong>Outlined</strong>}>…</Card>
<Card appearance="filled" hasBody header={<strong>Filled</strong>}>…</Card>
<Card appearance="plain" hasBody header={<strong>Plain</strong>}>…</Card>
<Card appearance="accent" hasBody header={<strong>Accent</strong>}>…</Card>`),
};

/** Media + header (with an end action) + body + a footer actions cluster. */
export const Composed: Story = {
  render: () => (
    <Card
      class="max-w-sm"
      hasBody
      media={<img src={cover} alt="Cover" class="block h-44 w-full object-cover" />}
      header={<strong class="font-semibold">Weekly report</strong>}
      headerActions={
        <Button variant="ghost" size="icon-sm" aria-label="Settings">
          <SlidersHorizontal class="size-4" />
        </Button>
      }
      footerActions={
        <>
          <Button variant="ghost">Dismiss</Button>
          <Button>Open</Button>
        </>
      }
    >
      Generated just now from your last seven days of activity.
    </Card>
  ),
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import { Card, Button } from '@kitn.ai/ui';
import { SlidersHorizontal } from 'lucide-solid';

<Card
  class="max-w-sm"
  hasBody
  media={<img src={cover} alt="Cover" class="block h-44 w-full object-cover" />}
  header={<strong class="font-semibold">Weekly report</strong>}
  headerActions={
    <Button variant="ghost" size="icon-sm" aria-label="Settings">
      <SlidersHorizontal class="size-4" />
    </Button>
  }
  footerActions={
    <>
      <Button variant="ghost">Dismiss</Button>
      <Button>Open</Button>
    </>
  }
>
  Generated just now from your last seven days of activity.
</Card>`,
      },
    },
  },
};

/** A dismissible promo: a filled surface with a dismiss (×) in the corner. */
export const Dismissible: Story = {
  render: () => (
    <Card appearance="filled" dismissible class="max-w-xs" hasBody header={<strong class="font-semibold">2x usage for Cowork</strong>}>
      Do more with a higher session limit, now through July 5.
    </Card>
  ),
  ...src(`<Card appearance="filled" dismissible hasBody
  header={<strong>2x usage for Cowork</strong>}
  onDismiss={() => {}}
>
  Do more with a higher session limit, now through July 5.
</Card>`),
};

/** The whole card as one button (no inner action buttons). */
export const Clickable: Story = {
  render: () => (
    <Card
      clickable
      class="max-w-sm"
      hasBody
      header={<strong class="font-semibold">Open the workspace</strong>}
      onCardClick={() => {}}
    >
      The entire card is one button. Press Enter or Space when focused.
    </Card>
  ),
  ...src(`<Card clickable hasBody
  header={<strong>Open the workspace</strong>}
  onCardClick={() => openWorkspace()}
>
  The entire card is one button.
</Card>`),
};

/** Horizontal: media fills the start column, content beside it. */
export const Horizontal: Story = {
  render: () => (
    <Card
      orientation="horizontal"
      class="max-w-lg"
      hasBody
      media={<img src={cover} alt="Cover" class="h-full w-44 object-cover" />}
      header={<strong class="font-semibold">Side by side</strong>}
    >
      The media fills the start column and the content fills the rest.
    </Card>
  ),
  ...src(`<Card orientation="horizontal" hasBody
  media={<img src={cover} alt="Cover" class="h-full w-44 object-cover" />}
  header={<strong>Side by side</strong>}
>
  The media fills the start column and the content fills the rest.
</Card>`),
};
