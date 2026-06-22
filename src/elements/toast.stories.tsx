import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kai-toast-region>
import { toast, configureToasts } from '../primitives/toast-store';

// `toast()` is imperative — there's no element to place. The singleton region
// mounts itself on document.body the first time a toast is raised. These stories
// are trigger buttons; raise a toast and watch it slide in top-center.

// `light-dark()` resolves against the wrapper's `color-scheme`, which we mirror to
// the Storybook theme below — so these trigger buttons stay readable in dark mode
// (a hardcoded light fill was invisible on the dark canvas).
const BTN =
  'padding:8px 14px;border-radius:8px;border:1px solid light-dark(#d4d4d8,#3a3a3a);' +
  'background:light-dark(#fafafa,#26262b);color:light-dark(#18181b,#fafafa);' +
  'cursor:pointer;margin:0 8px 10px 0;font:inherit;font-size:14px';

function ToastDemo() {
  return (
    <div style={{ padding: '28px', 'font-family': 'system-ui, sans-serif' }}>
      <p style={{ margin: '0 0 18px', color: 'light-dark(#666,#a1a1aa)', 'max-width': '46ch' }}>
        Click to raise a toast. It slides in top-center and auto-dismisses (~5s; the Undo
        one stays up to 7s). The region mounts itself on the first call.
      </p>
      <button style={BTN} onClick={() => toast('Saved your changes')}>Neutral</button>
      <button style={BTN} onClick={() => toast.success('Copied to clipboard')}>Success (check)</button>
      <button
        style={BTN}
        onClick={() =>
          toast('Conversation dismissed', {
            action: { label: 'Undo', onAction: () => { toast.success('Restored'); } },
          })
        }
      >
        With Undo action
      </button>
      <button
        style={BTN}
        onClick={() => {
          toast('First');
          toast.success('Second');
          toast('Sticky — close me', { duration: 0 });
        }}
      >
        Stack three (last is sticky)
      </button>
    </div>
  );
}

const meta = {
  title: 'Components/Toast',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A transient-notification primitive. The PRIMARY API is imperative: `import { toast } from \'@kitn.ai/ui/elements\'` then `toast.success(\'Copied to clipboard\')`. A singleton `<kai-toast-region>` auto-mounts on `document.body` (a real `kai-*` element, so it is viewport-positioned yet keeps the kit\'s shadow styles). Supports a `success` variant, an optional `action` (e.g. Undo), `duration: 0` for sticky, stacking, pause-on-hover, and `prefers-reduced-motion`. Also re-exported from the package root `@kitn.ai/ui`.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Raise toasts imperatively. */
export const Default: Story = {
  name: 'Imperative toast()',
  render: () => <ToastDemo />,
};

// Opt the singleton into the collapsed pile, then raise a burst so it stacks.
function CollapsedStackDemo() {
  onMount(() => {
    configureToasts({ stack: 'collapsed', position: 'top-right' });
  });
  return (
    <div style={{ padding: '28px', 'font-family': 'system-ui, sans-serif' }}>
      <p style={{ margin: '0 0 18px', color: 'light-dark(#666,#a1a1aa)', 'max-width': '52ch' }}>
        Collapsed stacking piles the toasts as layered cards in the corner — only the
        newest is fully shown; the rest peek behind it, scaled down. Hover (or focus) the
        pile and it fans out into the full column; move away and it collapses again. Raise
        a few and try it. <code>prefers-reduced-motion</code> falls back to the plain column.
      </p>
      <button
        style={BTN}
        onClick={() => {
          toast('Connecting…', { duration: 0 });
          toast('Syncing files', { duration: 0 });
          toast.success('Backup complete', { duration: 0 });
          toast('All set', { duration: 0 });
        }}
      >
        Raise four (sticky)
      </button>
      <button style={BTN} onClick={() => toast.clear()}>Clear</button>
    </div>
  );
}

/** Collapsed (Sonner-style) pile that expands on hover/focus. */
export const CollapsedStack: Story = {
  name: 'Collapsed stack (hover to expand)',
  render: () => <CollapsedStackDemo />,
};
