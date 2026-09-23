import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { SlidersHorizontal } from 'lucide-solid';
import { CardSurface, type CardSurfaceProps } from './card-surface';
import { Button } from '../button/button';
import { componentDescription } from '../../stories/docs/web-component-controls';
import cover from '../../web-components/card/card-media.jpg';

const meta = {
  title: 'Components/Card Surface',
  component: CardSurface,
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
        'A framed card surface around media and a body of content.',
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
    onDismiss: {
      action: 'dismiss',
      description: 'Called when the dismiss (×) hides the card.',
      table: { category: 'Events' },
    },
    onCardClick: {
      action: 'card-click',
      description: 'Fired when the card is activated as a button, by click or Enter / Space.',
      table: { category: 'Events' },
    },
  },
  args: {
    appearance: 'outlined',
    orientation: 'vertical',
    dense: false,
    hasBody: true,
    dismissible: false,
    clickable: false,
    onDismiss: fn(),
    onCardClick: fn(),
  },
  render: (args) => (
    <CardSurface {...args} class="max-w-sm" header={<strong class="font-semibold">Weekly report</strong>}>
      Generated just now from your last seven days of activity.
    </CardSurface>
  ),
} satisfies Meta<typeof CardSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

// Region props (media / header / footer / actions) take JSX, and the body renders
// only when `hasBody` is set.
//
// The sample imports RELATIVELY, like `tab-bar.stories.tsx` and `panel.stories.tsx`:
// `CardSurface` is not on any barrel. The public `Card` export is the generative-UI
// CONTRACT card (`src/components/card/card.tsx`), a different component with a different
// prop set, so naming it here would compile and render the wrong thing.
const IMPORT = `import { CardSurface } from './card-surface';`;
const src = (code: string) => ({
  parameters: { docs: { source: { code: `${IMPORT}\n\n${code}`, language: 'tsx' } } },
});

/** Interactive playground: toggle the controls to explore the variants. */
export const Playground: Story = {
  ...src(`<CardSurface appearance="outlined" hasBody header={<strong>Weekly report</strong>}>
  Generated just now from your last seven days of activity.
</CardSurface>`),
};

/** The four surface treatments. */
export const Appearances: Story = {
  render: () => (
    <div class="grid max-w-3xl grid-cols-2 gap-4">
      <CardSurface appearance="outlined" hasBody header={<strong class="font-semibold">Outlined</strong>}>
        The default. A bordered card with a soft elevation.
      </CardSurface>
      <CardSurface appearance="filled" hasBody header={<strong class="font-semibold">Filled</strong>}>
        A raised opaque surface, no border.
      </CardSurface>
      <CardSurface appearance="plain" hasBody header={<strong class="font-semibold">Plain</strong>}>
        No border or background. A padded region.
      </CardSurface>
      <CardSurface appearance="accent" hasBody header={<strong class="font-semibold">Accent</strong>}>
        The bold primary fill, for announcements.
      </CardSurface>
    </div>
  ),
  ...src(`<CardSurface appearance="outlined" hasBody header={<strong>Outlined</strong>}>…</CardSurface>
<CardSurface appearance="filled" hasBody header={<strong>Filled</strong>}>…</CardSurface>
<CardSurface appearance="plain" hasBody header={<strong>Plain</strong>}>…</CardSurface>
<CardSurface appearance="accent" hasBody header={<strong>Accent</strong>}>…</CardSurface>`),
};

/** Media + header (with an end action) + body + a footer actions cluster. */
export const Composed: Story = {
  render: () => (
    <CardSurface
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
    </CardSurface>
  ),
  parameters: {
    docs: {
      source: {
        language: 'tsx',
        code: `import { Button } from '@kitn.ai/ui';
import { CardSurface } from './card-surface';
import { SlidersHorizontal } from 'lucide-solid';

<CardSurface
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
</CardSurface>`,
      },
    },
  },
};

/** A dismissible promo: a filled surface with a dismiss (×) in the corner. */
export const Dismissible: Story = {
  render: (args: Pick<CardSurfaceProps, 'onDismiss'>) => (
    <CardSurface
      appearance="filled"
      dismissible
      class="max-w-xs"
      hasBody
      header={<strong class="font-semibold">2x usage for Cowork</strong>}
      onDismiss={args.onDismiss}
    >
      Do more with a higher session limit, now through July 5.
    </CardSurface>
  ),
  ...src(`<CardSurface appearance="filled" dismissible hasBody
  header={<strong>2x usage for Cowork</strong>}
  onDismiss={() => {}}
>
  Do more with a higher session limit, now through July 5.
</CardSurface>`),
};

/** The whole card as one button (no inner action buttons). */
export const Clickable: Story = {
  render: (args: Pick<CardSurfaceProps, 'onCardClick'>) => (
    <CardSurface
      clickable
      class="max-w-sm"
      hasBody
      header={<strong class="font-semibold">Open the workspace</strong>}
      onCardClick={args.onCardClick}
    >
      The entire card is one button. Press Enter or Space when focused.
    </CardSurface>
  ),
  ...src(`<CardSurface clickable hasBody
  header={<strong>Open the workspace</strong>}
  onCardClick={() => openWorkspace()}
>
  The entire card is one button.
</CardSurface>`),
};

/** Horizontal: media fills the start column, content beside it. */
export const Horizontal: Story = {
  render: () => (
    <CardSurface
      orientation="horizontal"
      class="max-w-lg"
      hasBody
      media={<img src={cover} alt="Cover" class="h-full w-44 object-cover" />}
      header={<strong class="font-semibold">Side by side</strong>}
    >
      The media fills the start column and the content fills the rest.
    </CardSurface>
  ),
  ...src(`<CardSurface orientation="horizontal" hasBody
  media={<img src={cover} alt="Cover" class="h-full w-44 object-cover" />}
  header={<strong>Side by side</strong>}
>
  The media fills the start column and the content fills the rest.
</CardSurface>`),
};
