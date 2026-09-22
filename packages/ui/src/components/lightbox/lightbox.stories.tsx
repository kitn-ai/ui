import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { Lightbox, LightboxTrigger, LightboxContent } from './lightbox';
import { componentDescription } from '../../stories/docs/web-component-controls';

const IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&fit=crop';
const ALT = 'A snow-capped mountain above the clouds at dusk';

/**
 * The Solid story for the `Lightbox` trio. The `<kai-lightbox>` element carries its
 * own Labs story for the plain-HTML spelling of the same thing; this one is the
 * composed components a Solid app imports from `@kitn.ai/ui`.
 *
 * The modal is `Dialog`, not a second implementation of one. Escape, the backdrop
 * click, the focus move in and back out, and the Tab trap all come from there, so
 * the trigger and the panel cannot disagree about what "dismissed" means.
 */
const meta = {
  title: 'Components/Lightbox',
  component: Lightbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: componentDescription([
        'Click-to-open full-size preview. `LightboxTrigger` wraps the thumbnail, `LightboxContent` holds the media, and `Lightbox` owns the open state — uncontrolled from `defaultOpen`, or controlled with `open` + `onOpenChange`.',
        'The panel renders a close (X) button in its top-right by default; `showClose={false}` takes it away when something the reader can already see dismisses the modal. A click on the picture itself dismisses the modal too — `closeOnContentClick={false}` keeps it open when a click inside the content means something else, such as a zoom toggle. The X, Escape, a backdrop click, the picture and your own control all report through the same `onOpenChange`.',
      ]),
    },
  },
  argTypes: {
    open: {
      control: false,
      description:
        'Controlled open state. While it is set the modal never changes it itself — drive it from `onOpenChange`. Left unset in these stories so the trigger owns opening.',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Open at mount (uncontrolled seed), for a modal that should greet the reader already open.',
    },
    showClose: {
      control: 'boolean',
      description: 'Render the close (X) button in the panel. On by default.',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnContentClick: {
      control: 'boolean',
      description:
        'Close the modal when a click lands inside the content. On by default; a click on a link or a button inside the content is let through instead. `false` keeps the modal open on any content click.',
      table: { defaultValue: { summary: 'true' } },
    },
    children: {
      control: false,
      description: 'The trigger and the content, built in `render`: a JSX child cannot cross the Storybook manager/preview boundary, so it can never ride in `args`.',
    },
    controllerRef: {
      control: false,
      description: 'Hands the open controller to a facade — `<kai-lightbox>` layers its `open` attribute, methods and event onto the same state. Not a story argument.',
    },
    onOpenChange: {
      action: 'open-change',
      description:
        'Fires with the next open state for every path: the X, Escape, a backdrop click, a click on the content and your own control.',
      table: { category: 'Events' },
    },
  },
  args: { defaultOpen: false, showClose: true, closeOnContentClick: true, onOpenChange: fn() },
  render: (args: LightboxArgs) => (
    <Lightbox defaultOpen={args.defaultOpen} onOpenChange={args.onOpenChange}>
      <LightboxTrigger class="block w-56 overflow-hidden rounded-lg ring-1 ring-border">
        <img alt={ALT} src={IMAGE_URL} class="block h-40 w-full object-cover" />
      </LightboxTrigger>
      <LightboxContent
        label={ALT}
        showClose={args.showClose}
        closeOnContentClick={args.closeOnContentClick}
      >
        <img alt={ALT} src={IMAGE_URL} class="block object-contain" />
      </LightboxContent>
    </Lightbox>
  ),
} satisfies Meta<typeof Lightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The args each story's `render` receives. Spelled out because `satisfies Meta<…>`
 *  keeps `typeof meta` a literal type, which Storybook cannot map back to the
 *  component's props for a per-story `render`. */
type LightboxArgs = {
  defaultOpen?: boolean;
  showClose?: boolean;
  closeOnContentClick?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const IMPORT = `import { Lightbox, LightboxTrigger, LightboxContent } from '@kitn.ai/ui';`;
// `imports` is a parameter rather than a wrapper call so the composed text — the
// thing the reader copies — still carries its own import line.
const src = (code: string, imports: string = IMPORT) => ({
  parameters: { docs: { source: { code: `${imports}\n\n${code}`, language: 'tsx' } } },
});

/** Click the thumbnail: the image opens at the size the viewport allows. The modal
 *  owns Escape, the backdrop click and the Tab trap; `onOpenChange` hears all of
 *  them plus the X and a click on the picture itself, which closes by default. */
export const ThumbnailTrigger: Story = {
  ...src(`<Lightbox onOpenChange={(open) => console.log('open:', open)}>
  <LightboxTrigger class="block w-56 overflow-hidden rounded-lg">
    <img src="https://…/mountain.jpg" alt="A mountain at dusk" class="block h-40 w-full object-cover" />
  </LightboxTrigger>
  <LightboxContent label="A mountain at dusk">
    <img src="https://…/mountain.jpg" alt="A mountain at dusk" class="block object-contain" />
  </LightboxContent>
</Lightbox>`),
};

/** Seeded open, so the Docs preview shows the modal without a click — `defaultOpen`
 *  is the uncontrolled seed. Note the X in the panel's top-right: `showClose` is on
 *  unless you pass `false`, and turning the `showClose` control off here leaves the
 *  panel with no X, since Escape, a backdrop click, the picture and the host's own
 *  control still close it. Clicking the picture dismisses the modal; the
 *  `closeOnContentClick` control turns that off, which is what you want when a
 *  content click means something else. */
export const OpenAtMount: Story = {
  args: { defaultOpen: true },
  ...src(`// Open at mount: 'defaultOpen' is the uncontrolled seed. Use 'open' with
// onOpenChange to drive it yourself.
<Lightbox defaultOpen>
  <LightboxTrigger class="block w-56 overflow-hidden rounded-lg">
    <img src="https://…/mountain.jpg" alt="A mountain at dusk" class="block h-40 w-full object-cover" />
  </LightboxTrigger>
  <LightboxContent label="A mountain at dusk">
    <img src="https://…/mountain.jpg" alt="A mountain at dusk" class="block object-contain" />
  </LightboxContent>
</Lightbox>`),
};
