import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal, onMount, Show, For } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-popover': JSX.HTMLAttributes<HTMLElement> & { placement?: string; gutter?: number | string; open?: boolean };
    }
  }
}

const HTML_SNIPPET = `<kc-popover placement="bottom-start">
  <button slot="trigger">GPT-5.5 ▾</button>
  <div>
    <button>GPT-5.5 — Flagship model</button>
    <button>Legacy models ▾</button>
  </div>
</kc-popover>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements
  document.querySelector('kc-popover')
    .addEventListener('kc-open-change', (e) => console.log('open:', e.detail.open));
</script>`;

const meta = {
  title: 'Components/Popover',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-popover'),
  parameters: {
    layout: 'centered',
    docs: {
      description: specDescription('kc-popover', [
        '`<kc-popover>` is the framework-agnostic **web component** for a button-and-popover card — a trigger that toggles a floating panel of arbitrary content, isolated in **Shadow DOM**. In SolidJS, use the `Popover` primitive.',
        '**When to use:** a "button + card" affordance — a header model menu, a settings popover, an account dropdown with mixed controls. For a flat list of commands, use a menu instead.',
        '**How to use:** slot the control as `slot="trigger"` and the panel as the default slot. Clicking the trigger toggles; Escape or an outside click closes (clicks inside do not). It fires `kc-open-change` with `{ open }` and accepts an `open` property for controlled use.',
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

const rowStyle = { display: 'flex', 'align-items': 'center', gap: '8px', width: '100%', padding: '6px 8px', 'border-radius': '6px', border: 'none', background: 'transparent', cursor: 'pointer', 'text-align': 'left' as const, font: 'inherit', color: 'var(--color-foreground)' };
const LEGACY = ['GPT-4o', 'GPT-4.1', 'GPT-4o mini'];

/** A ChatGPT-style model menu — a flagship row and an expandable group, slotted
 *  as the popover panel. The trigger and content are your light-DOM markup. */
export const ModelMenu: Story = {
  render: () => {
    let el: HTMLElement | undefined;
    const [legacyOpen, setLegacyOpen] = createSignal(false);
    onMount(() => el?.addEventListener('kc-open-change', (e) => console.log('kc-open-change', (e as CustomEvent<{ open: boolean }>).detail.open)));
    return (
      <kc-popover ref={(e) => (el = e as HTMLElement)} placement="bottom-start">
        <button slot="trigger" style={{ padding: '6px 12px', 'border-radius': '8px', border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-foreground)', cursor: 'pointer', font: 'inherit' }}>
          GPT-5.5 ▾
        </button>
        <div style={{ width: '15rem' }}>
          <button type="button" style={rowStyle}>
            <span style={{ 'font-weight': 600 }}>GPT-5.5</span>
            <span style={{ 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>Flagship</span>
          </button>
          <button type="button" style={rowStyle} aria-expanded={legacyOpen()} onClick={() => setLegacyOpen(!legacyOpen())}>
            Legacy models {legacyOpen() ? '▴' : '▾'}
          </button>
          <Show when={legacyOpen()}>
            <For each={LEGACY}>{(m) => <button type="button" style={{ ...rowStyle, 'padding-left': '28px' }}>{m}</button>}</For>
          </Show>
        </div>
      </kc-popover>
    );
  },
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
