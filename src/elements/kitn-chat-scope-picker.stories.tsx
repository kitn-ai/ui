import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers the custom elements

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kitn-chat-scope-picker': JSX.HTMLAttributes<HTMLElement> & {
        'current-label'?: string;
      };
    }
  }
}

/** Render `<kitn-chat-scope-picker>` with author/tag options set as properties. */
function ScopePickerElement(props: { authors: string[]; tags: string[] }) {
  let el: (HTMLElement & { availableAuthors?: string[]; availableTags?: string[] }) | undefined;
  onMount(() => {
    if (!el) return;
    el.availableAuthors = props.authors;
    el.availableTags = props.tags;
    el.addEventListener('scopechange', (e) => {
      const ev = e as CustomEvent<{ filters: unknown }>;
      console.log('scopechange', ev.detail.filters ?? 'all');
    });
  });
  return (
    <kitn-chat-scope-picker ref={(e) => (el = e as HTMLElement)} style={{ display: 'inline-block', padding: '40px' }} />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kitn-chat-scope-picker id="scope"></kitn-chat-scope-picker>

<script type="module">
  import '@kitnai/chat/elements';   // registers the custom elements

  const scope = document.getElementById('scope');
  scope.availableAuthors = ['Rob', 'Alex'];
  scope.availableTags = ['design', 'api'];
  // undefined filters means "All Content"
  scope.addEventListener('scopechange', (e) => console.log(e.detail.filters ?? 'all'));
</script>`;

const meta = {
  title: 'Web Components/kitn-chat-scope-picker',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          '`<kitn-chat-scope-picker>` is the framework-agnostic **web component** for scoping a chat by author or tag — a dropdown that emits the chosen filters — isolated in **Shadow DOM**.',
          '**When to use:** letting users narrow a conversation/search to a subset of content. In SolidJS, use the `ChatScopePicker` primitive.',
          "**How to use:** register once with `import '@kitnai/chat/elements'`, set the `availableAuthors` / `availableTags` **properties** (and optionally `current-label`), and listen for the `scopechange` **CustomEvent** (`undefined` filters = \"All Content\").",
          'See the **Code** tab for HTML usage.',
        ].join('\n\n'),
      },
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
