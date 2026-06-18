import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-switch': JSX.HTMLAttributes<HTMLElement> & { checked?: boolean | string; disabled?: boolean | string; label?: string };
    }
  }
}

const HTML_SNIPPET = `<kai-switch checked label="Temporary chat"></kai-switch>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements
  document.querySelector('kai-switch')
    .addEventListener('kai-change', (e) => console.log('checked:', e.detail.checked));
</script>`;

const meta = {
  title: 'Components/Switch',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-switch'),
  parameters: {
    layout: 'centered',
    docs: {
      description: specDescription('kai-switch', [
        '`<kai-switch>` is the framework-agnostic **web component** toggle — a `role="switch"` control isolated in **Shadow DOM**. In SolidJS, use the `Switch` primitive.',
        '**When to use:** an immediate on/off setting (e.g. "Temporary chat") in a header menu, settings row, or preference panel.',
        '**How to use:** set the initial state with the `checked` attribute and read changes from the `kai-change` **CustomEvent** (payload `{ checked }`). The element self-manages its state.',
        'See the **Code** tab for HTML usage.',
      ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** A self-managing toggle; logs each change. */
export const Default: Story = {
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => el?.addEventListener('kai-change', (e) => console.log('kai-change', (e as CustomEvent<{ checked: boolean }>).detail.checked)));
    return <kai-switch ref={(e) => (el = e as HTMLElement)} label="Temporary chat" style={{ display: 'inline-block', padding: '40px' }} />;
  },
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** Starts on via the bare `checked` attribute. */
export const On: Story = {
  render: () => <kai-switch checked label="Notifications" style={{ display: 'inline-block', padding: '40px' }} />,
};
