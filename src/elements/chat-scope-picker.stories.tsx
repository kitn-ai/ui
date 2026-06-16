import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kc-scope-picker': JSX.HTMLAttributes<HTMLElement> & {
        'current-label'?: string;
      };
    }
  }
}

/** Render `<kc-scope-picker>` with author/tag options set as properties. */
function ScopePickerElement(props: { authors: string[]; tags: string[] }) {
  let el: (HTMLElement & { availableAuthors?: string[]; availableTags?: string[] }) | undefined;
  onMount(() => {
    if (!el) return;
    el.availableAuthors = props.authors;
    el.availableTags = props.tags;
    el.addEventListener('kc-scope-change', (e) => {
      const ev = e as CustomEvent<{ filters: unknown }>;
      console.log('kc-scope-change', ev.detail.filters ?? 'all');
    });
  });
  return (
    <kc-scope-picker ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kc-scope-picker id="scope"></kc-scope-picker>

<script type="module">
  import '@kitn.ai/chat/elements';   // registers the custom elements

  const scope = document.getElementById('scope');
  scope.availableAuthors = ['Rob', 'Alex'];
  scope.availableTags = ['design', 'api'];
  // undefined filters means "All Content"
  scope.addEventListener('kc-scope-change', (e) => console.log(e.detail.filters ?? 'all'));
</script>`;

const meta = {
  title: 'Components/ScopePicker',
  tags: ['autodocs'],
  argTypes: argTypesFor('kc-scope-picker'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kc-scope-picker', [
          '`<kc-scope-picker>` is the framework-agnostic **web component** for scoping a chat by author or tag — a dropdown that emits the chosen filters — isolated in **Shadow DOM**.',
          '**When to use:** letting users narrow a conversation/search to a subset of content. In SolidJS, use the `ChatScopePicker` primitive.',
          '**Placement:** in the chat header or above the conversation list, beside the search input; it is a compact `inline-block` dropdown trigger that pairs naturally with `<kc-model-switcher>` or other header controls.',
          "**How to use:** register once with `import '@kitn.ai/chat/elements'`, set the `availableAuthors` / `availableTags` **properties** (and optionally `current-label`), and listen for the `kc-scope-change` **CustomEvent** (`undefined` filters = \"All Content\").",
          'See the **Code** tab for HTML usage.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** Authors and tags available as scope filters. */
export const Default: Story = {
  render: () => <ScopePickerElement authors={['Rob', 'Alex']} tags={['design', 'api']} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};
