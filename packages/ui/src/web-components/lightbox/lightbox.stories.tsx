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
        component: 'Enlarges the markup wrapped around it, centered over a dimmed page.',
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
        'Close the modal on a click inside `slot="content"`. A click on a link or a button inside the content is let through.',
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

/**
 * The args->attributes plumbing, shared by both trigger shapes: the only thing
 * that differs between the two stories is what goes in the default slot. One
 * slots the consumer's own `<button>` (the element must leave the control to it);
 * the other slots a plain thumbnail with nothing focusable in it (the element must
 * supply the control itself). Both are a11y-checked by the storybook run, which is
 * what pins the difference: only the second shape is unreachable without a
 * wrapper that IS the button.
 */
const renderWith = (trigger: JSX.Element) => (args: Record<string, unknown>) => (
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
      {trigger}
      <img
        slot="content"
        src={IMAGE_URL}
        alt="A snow-capped mountain above the clouds at dusk"
        style={{ display: 'block', 'object-fit': 'contain' }}
      />
    </kai-lightbox>
  </div>
);

/** The element used the plain-HTML way: your own button as the trigger, the
 *  image you already have as the content. */
export const ZoomYourOwnMarkup: StoryObj = {
  name: 'Zoom Your Own Markup',
  render: renderWith(
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
    </button>,
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

/** The other trigger shape: a thumbnail you already have, with nothing focusable
 *  inside it. The element supplies the button role, the tab stop and the ARIA,
 *  and Enter or Space opens the modal. */
export const ZoomAThumbnail: StoryObj = {
  name: 'Zoom a Thumbnail',
  render: renderWith(
    <img
      src={IMAGE_URL}
      alt="A snow-capped mountain above the clouds at dusk"
      width={224}
      height={144}
      style={{
        display: 'block',
        width: '14rem',
        height: '9rem',
        'object-fit': 'cover',
        'border-radius': '0.5rem',
        cursor: 'zoom-in',
      }}
    />,
  ),
  parameters: src(`<!-- Nothing focusable inside: the element makes the trigger a real button,
     so a keyboard reaches it. Enter and Space both open the modal. -->
<kai-lightbox label="A mountain at dusk">
  <img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&fit=crop"
       alt="A snow-capped mountain above the clouds at dusk" width="224" height="144" />
  <img slot="content" src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&fit=crop"
       alt="A snow-capped mountain above the clouds at dusk" />
</kai-lightbox>`),
};

/**
 * The keyboard reach, which no pointer user ever sees: the modal owns Escape for the
 * whole page while it is open, so an Escape whose target is anywhere else still closes
 * it, and closing returns focus to the element that opened it instead of dropping the
 * reader on document.body. Press "Return focus to the opener" to move focus back to the page
 * button with the modal still open, then press Escape: the close arrives and focus
 * lands where the reader left it. That state comes up on its own whenever whatever
 * opened the modal takes focus back to its own trigger.
 */
export const EscapeFromAnywhere: StoryObj = {
  name: 'Escape From Anywhere',
  render: () => {
    let lightbox: (HTMLElement & { show(): void; hide(): void }) | undefined;
    let opener: HTMLButtonElement | undefined;
    const button: JSX.CSSProperties = {
      display: 'inline-flex',
      'align-items': 'center',
      height: '2.25rem',
      padding: '0 0.875rem',
      'border-radius': '0.5rem',
      border: '1px solid var(--color-border)',
      cursor: 'pointer',
      'font-size': '0.875rem',
      'font-weight': '500',
      background: 'var(--color-card)',
      color: 'var(--color-foreground)',
    };
    const onOpenChange = (event: Event) => {
      const { open } = (event as CustomEvent<{ open: boolean }>).detail;
      const status = document.getElementById('lightbox-status');
      if (status) {
        status.textContent = open
          ? 'Open: focus moves into the panel.'
          : 'Closed: Escape arrived with focus outside the panel, and focus came back to the opener.';
      }
    };
    return (
      <div style={{ display: 'grid', gap: '0.75rem', 'justify-items': 'start' }}>
        <div style={{ display: 'flex', 'align-items': 'center', gap: '0.5rem' }}>
          <button
            type="button"
            ref={(el: HTMLButtonElement) => { opener = el; }}
            style={button}
            onClick={() => lightbox?.show()}
          >
            Zoom the photo
          </button>
          <button
            type="button"
            style={button}
            onClick={() => opener?.focus()}
          >
            Return focus to the opener
          </button>
        </div>
        <p id="lightbox-status" style={{ margin: '0', color: 'var(--color-muted-foreground)', 'font-size': '0.875rem' }}>
          Open the modal, then press Escape, from the panel or from the page.
        </p>
        <kai-lightbox
          ref={(el: HTMLElement) => { lightbox = el as HTMLElement & { show(): void; hide(): void }; }}
          {...{ label: 'A mountain at dusk' }}
          on:kai-open-change={onOpenChange}
        >
          <img
            slot="content"
            src={IMAGE_URL}
            alt="A snow-capped mountain above the clouds at dusk"
            style={{ display: 'block', 'object-fit': 'contain' }}
          />
        </kai-lightbox>
      </div>
    );
  },
  parameters: src(`<button id="zoom-photo">Zoom the photo</button>

<kai-lightbox id="photo-modal" label="A mountain at dusk">
  <img slot="content" src="https://…/mountain.jpg" alt="A mountain at dusk" />
</kai-lightbox>

<script type="module">
  import '@kitn.ai/ui/web-components';

  const lightbox = document.getElementById('photo-modal');
  const opener = document.getElementById('zoom-photo');
  opener.addEventListener('click', () => lightbox.show());
  // Escape, the backdrop, the X and hide() all arrive here, wherever focus is: the
  // modal owns Escape for the page while it is open, and closing hands focus back to
  // the opener.
  lightbox.addEventListener('kai-open-change', (event) => console.log(event.detail.open));
</script>`),
};
