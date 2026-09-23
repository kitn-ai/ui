import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import type { JSX } from 'solid-js';
import './lightbox';

// The standalone element: wrap YOUR markup (a button, a card, a thumbnail) and show
// it bigger in a modal. `kai-attachments` composes the Solid trio for its own image
// tiles; this one is for everything else, which is why the trio is not named after
// attachments.

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-lightbox': JSX.HTMLAttributes<HTMLElement> & {
        open?: boolean;
        'default-open'?: boolean;
        disabled?: boolean;
        label?: string;
        'show-close'?: boolean;
        'close-on-content-click'?: boolean;
      };
    }
  }
}

const IMAGE_URL = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&fit=crop';

const meta: Meta = {
  title: 'Labs/Foundations/Lightbox',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          '`<kai-lightbox>` shows your own markup bigger, centered over a dimmed page. '
          + 'The default slot is the TRIGGER and `slot="content"` is the media. It composes the '
          + "kit's Dialog, so it inherits Escape, backdrop dismissal, the focus move and restore, "
          + 'the Tab trap and `role="dialog" aria-modal` rather than reimplementing them. The '
          + 'modal carries its own close (X) button — on by default, `show-close="false"` to remove it — '
          + 'and a click inside `slot="content"` dismisses it — on by default too, with '
          + '`close-on-content-click="false"` to keep it open. A click on an interactive element '
          + 'inside the content is let through either way, so a caption link or a download button works.',
      },
    },
  },
  argTypes: {
    open: { control: 'boolean', description: 'Drive and observe open state; reflects to the `open` attribute.' },
    defaultOpen: {
      name: 'default-open',
      control: 'boolean',
      description: 'Open at mount (uncontrolled seed), for a lightbox that should greet the reader open.',
    },
    disabled: {
      control: 'boolean',
      description: 'Take away the programmatic open path only: `show()` no-ops, `toggle()` closes. The trigger still works.',
    },
    label: { control: 'text', description: 'Accessible name for the modal.' },
    showClose: {
      name: 'show-close',
      control: 'boolean',
      description: 'Show the close (X) button in the panel. ON when the attribute is absent; `show-close="false"` removes it.',
      table: { defaultValue: { summary: 'true' } },
    },
    closeOnContentClick: {
      name: 'close-on-content-click',
      control: 'boolean',
      description:
        'Close the modal on a click inside `slot="content"`. ON when the attribute is absent; `close-on-content-click="false"` keeps it open. A click on a link or a button inside the content is let through either way.',
      table: { defaultValue: { summary: 'true' } },
    },
  },
  args: {
    open: false,
    defaultOpen: false,
    disabled: false,
    label: 'A mountain at dusk',
    showClose: true,
    closeOnContentClick: true,
  },
};
export default meta;

const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

/** The element used the plain-HTML way: your own `<button>` as the trigger, the
 *  image you already have as the content. */
export const ZoomYourOwnMarkup: StoryObj = {
  name: 'Zoom Your Own Markup',
  render: (args: Record<string, unknown>) => (
    <div
      style={{
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'center',
        height: '360px',
        width: '100%',
        background: 'var(--color-background)',
      }}
    >
      <kai-lightbox
        open={args.open as boolean}
        default-open={args.defaultOpen as boolean}
        disabled={args.disabled as boolean}
        label={args.label as string}
        show-close={args.showClose as boolean}
        close-on-content-click={args.closeOnContentClick as boolean}
      >
        <button
          type="button"
          style={{
            display: 'inline-flex',
            'align-items': 'center',
            gap: '0.5rem',
            height: '2.25rem',
            padding: '0 0.875rem',
            'border-radius': '0.5rem',
            border: '1px solid var(--color-border)',
            cursor: 'zoom-in',
            'font-size': '0.875rem',
            'font-weight': '500',
            background: 'var(--color-card)',
            color: 'var(--color-foreground)',
          }}
        >
          Zoom the photo
        </button>
        <img
          slot="content"
          src={IMAGE_URL}
          alt="A snow-capped mountain above the clouds at dusk"
          style={{ display: 'block', 'object-fit': 'contain' }}
        />
      </kai-lightbox>
    </div>
  ),
  parameters: src(`<!-- The trigger is YOUR markup in the default slot, the media is slot="content". -->
<kai-lightbox id="photo-modal" label="A mountain at dusk">
  <button type="button">Zoom the photo</button>
  <img slot="content" src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&fit=crop"
       alt="A snow-capped mountain above the clouds at dusk" />
</kai-lightbox>

<!-- Both options below are ON when you leave them off the tag, so each of these two
     spells out the OPT-OUT. show-close="false" removes the close (X) button from the
     modal's top-right corner — what you want when the trigger or a host control
     already dismisses it. close-on-content-click="false" keeps the modal open when the
     picture itself is clicked, for content where a click means something else; a click
     on a link or a button inside the content never dismisses it either way. The rest of
     the surface: open is settable and reflects, default-open seeds, disabled takes away
     show() only (never the trigger). -->
<kai-lightbox id="quiet-modal" label="A mountain at dusk" show-close="false" close-on-content-click="false">
  <button type="button">Zoom the photo</button>
  <img slot="content" src="https://…/mountain.jpg" alt="A mountain at dusk" />
</kai-lightbox>

<script type="module">
  import '@kitn.ai/ui/web-components'; // registers the custom elements

  const lightbox = document.getElementById('photo-modal');

  // Open it yourself, without a trigger in the default slot (then no button is
  // rendered at all). show()/hide()/toggle() come from the shared disclosure layer.
  lightbox.show();

  lightbox.addEventListener('kai-open-change', (e) => console.log(e.detail.open));
</script>`),
};
