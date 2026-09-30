import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, type JSX } from 'solid-js';
import './dialog';

// Labs: the centered modal. A consumer discovers this surface here, so the stories
// show the two ways to drive it and the keyboard behaviour each one has: the element
// owns Escape and the backdrop and reports both through `kai-open-change`, and a
// consumer who binds `open` hears the same event and mirrors it into their own state.

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // Identical to the declaration the showcase stories already carry: TS requires
      // every declaration of one tag to agree, so the scalar props are passed as
      // attributes through the spread below rather than typed a second time here.
      'kai-dialog': JSX.HTMLAttributes<HTMLElement> & { open?: boolean };
    }
  }
}

const meta: Meta = {
  title: 'Labs/Foundations/Dialog',
};
export default meta;

// Hand-written HTML for the "Show code" panel (real consumer markup, not JSX).
const src = (code: string) => ({ docs: { source: { language: 'html', code } } });

const trigger = {
  display: 'inline-flex',
  'align-items': 'center',
  height: '2.25rem',
  padding: '0 0.875rem',
  'border-radius': '0.5rem',
  border: 'none',
  cursor: 'pointer',
  'font-size': '0.875rem',
  'font-weight': '500',
  background: 'var(--color-primary)',
  color: 'var(--color-primary-foreground)',
};

export const Modal: StoryObj = {
  render: () => {
    // The element owns its open state: `show()` opens it, and Escape, the backdrop and
    // the Cancel button all arrive as `kai-open-change`. The panel is a real form, so
    // "focus went in, Tab cycles inside, Escape returns focus to the button" is
    // observable rather than described.
    let dialog: (HTMLElement & { show(): void; hide(): void }) | undefined;
    const [name, setName] = createSignal('');
    const [created, setCreated] = createSignal('');
    const onOpenChange = (event: Event) => {
      if (!(event as CustomEvent<{ open: boolean }>).detail.open) setName('');
    };
    return (
      <div style={{ display: 'grid', gap: '0.75rem', 'justify-items': 'start' }}>
        <button type="button" id="new-project" style={trigger} onClick={() => dialog?.show()}>
          New project
        </button>
        <p style={{ margin: '0', color: 'var(--color-muted-foreground)', 'font-size': '0.875rem' }}>
          {created() ? `Created: ${created()}` : 'Press Escape or the backdrop from the open dialog.'}
        </p>
        <kai-dialog
          ref={(el: HTMLElement) => { dialog = el as HTMLElement & { show(): void; hide(): void }; }}
          {...{ label: 'New project' }}
          on:kai-open-change={onOpenChange}
        >
          <span slot="header">New project</span>
          <label style={{ display: 'grid', gap: '0.375rem' }}>
            Project name
            <input
              value={name()}
              onInput={(event) => setName((event.currentTarget as HTMLInputElement).value)}
              placeholder="e.g. Release notes"
            />
          </label>
          <div slot="footer" style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              style={{ ...trigger, background: 'var(--color-card)', color: 'var(--color-foreground)' }}
              onClick={() => dialog?.hide()}
            >
              Cancel
            </button>
            <button
              type="button"
              style={trigger}
              onClick={() => {
                setCreated(name());
                dialog?.hide();
              }}
            >
              Create project
            </button>
          </div>
        </kai-dialog>
      </div>
    );
  },
  parameters: src(`<button id="new-project">New project</button>

<kai-dialog id="project-dialog" label="New project">
  <span slot="header">New project</span>
  <label>Project name <input id="project-name" /></label>
  <div slot="footer">
    <button id="project-cancel">Cancel</button>
    <button id="project-create">Create project</button>
  </div>
</kai-dialog>

<script type="module">
  import '@kitn.ai/ui/web-components';

  const dialog = document.getElementById('project-dialog');
  document.getElementById('new-project').addEventListener('click', () => dialog.show());
  document.getElementById('project-cancel').addEventListener('click', () => dialog.hide());
  // Escape, the backdrop, Cancel and hide() all arrive here, whichever one closed it.
  dialog.addEventListener('kai-open-change', (event) => console.log(event.detail));
</script>`),
};

export const ConsumerOwnedOpen: StoryObj = {
  render: () => {
    // The other way to drive it: the consumer owns the boolean and binds `open`. The
    // element still reports the intent to close through `kai-open-change`, and this
    // listener is what honours it - the element does not reach into the consumer's
    // state, and Escape still arrives when focus is sitting on the trigger outside
    // the panel (open this, Tab out of the panel, and press Escape: the modal closes
    // and focus stays where the reader left it).
    const [open, setOpen] = createSignal(false);
    const onOpenChange = (event: Event) => {
      setOpen((event as CustomEvent<{ open: boolean }>).detail.open);
    };
    return (
      <div style={{ display: 'grid', gap: '0.75rem', 'justify-items': 'start' }}>
        <button type="button" id="bind-open" style={trigger} onClick={() => setOpen(true)}>
          Open by binding open
        </button>
        <p style={{ margin: '0', color: 'var(--color-muted-foreground)', 'font-size': '0.875rem' }}>
          Bound `open`: {String(open())}
        </p>
        <kai-dialog
          open={open()}
          {...{ label: 'Bound open dialog' }}
          on:kai-open-change={onOpenChange}
        >
          <p>This dialog's open state lives in the story, not in the element.</p>
        </kai-dialog>
      </div>
    );
  },
  parameters: src(`<kai-dialog id="bound" open>Bound open</kai-dialog>

<script type="module">
  import '@kitn.ai/ui/web-components';

  const dialog = document.getElementById('bound');
  // The consumer owns the state, so the element asks rather than closes: set your own
  // boolean from the event and write it back to the open prop.
  dialog.addEventListener('kai-open-change', (event) => {
    dialog.open = event.detail.open;
  });
</script>`),
};
