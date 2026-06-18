import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount } from 'solid-js';
import './register'; // side effect: registers <kai-chat>, <kai-conversations>, <kai-prompt-input>
import type { AttachmentData } from '../components/attachments';
import { argTypesFor, specDescription } from '../stories/docs/element-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement>;
      'kai-action': JSX.HTMLAttributes<HTMLElement> & { icon?: string; tooltip?: string };
      'kai-slash-command': JSX.HTMLAttributes<HTMLElement> & { command?: string; description?: string; category?: string };
    }
  }
}

const sampleSuggestions: string[] = [
  'Summarize this thread',
  'Draft a reply',
  'Explain like I am five',
];

function imgData(fill: string, glyph: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="12" fill="${fill}"/><text x="48" y="60" font-size="42" text-anchor="middle" fill="white">${glyph}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const sampleAttachments: AttachmentData[] = [
  { id: 'a1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: imgData('#7c3aed', '◆') },
  { id: 'a2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
];

interface PromptInputEl extends HTMLElement {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
  search?: boolean;
  voice?: boolean;
  attachments?: AttachmentData[];
}

/** Live demo of the actual `<kai-prompt-input>` custom element (Shadow DOM and all). */
function PromptInputElement(props: { search?: boolean; voice?: boolean; attachments?: AttachmentData[]; args?: Record<string, unknown> }) {
  let el: PromptInputEl | undefined;
  onMount(() => {
    if (!el) return;
    // Default fixed data
    el.placeholder = 'Ask anything...';
    el.suggestions = sampleSuggestions;
    if (props.search) el.setAttribute('search', '');
    if (props.voice) el.setAttribute('voice', '');
    if (props.attachments) el.attachments = props.attachments;
    // Scalar args from Controls
    const args = props.args;
    if (args) {
      const scalarNames = [
        'value', 'placeholder', 'disabled', 'loading', 'suggestionMode',
        'slashCompact', 'search', 'voice',
      ];
      for (const name of scalarNames) {
        if (name in args) (el as unknown as Record<string, unknown>)[name] = args[name];
      }
    }
    el.addEventListener('kai-search', () => console.log('search clicked'));
    el.addEventListener('kai-voice', () => console.log('voice clicked'));
  });
  return (
    <kai-prompt-input
      ref={(e) => (el = e as PromptInputEl)}
      style={{ display: 'block', width: '100%', padding: '16px' }}
    />
  );
}

const HTML_SNIPPET = `<!-- Works in any framework or plain HTML -->
<kai-prompt-input id="input" style="display:block; width:100%;"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/elements';   // registers the custom elements

  const input = document.getElementById('input');
  input.placeholder = 'Ask anything...';
  input.suggestions = ['Summarize this thread', 'Draft a reply'];
  // input.loading = true;   // shows the busy state while a response streams
  // input.disabled = true;  // blocks typing and submit

  // events are CustomEvents on the element (they do not bubble)
  input.addEventListener('kai-submit', (e) => console.log('send:', e.detail.value));
  input.addEventListener('kai-value-change', (e) => console.log('typing:', e.detail.value));
  input.addEventListener('kai-suggestion-click', (e) => console.log('picked:', e.detail.value));
</script>`;

const SOLID_SNIPPET = `import '@kitn.ai/ui/elements'; // registers the custom elements
import { onMount } from 'solid-js';

function Composer() {
  let el: HTMLElement & {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    suggestions?: string[];
  };
  onMount(() => {
    el.placeholder = 'Ask anything...';
    el.suggestions = ['Summarize this thread', 'Draft a reply'];
  });
  return (
    <kai-prompt-input
      ref={el}
      style={{ display: 'block', width: '100%' }}
      on:kai-submit={(e) => console.log('send:', e.detail.value)}
      on:kai-value-change={(e) => console.log('typing:', e.detail.value)}
      on:kai-suggestion-click={(e) => console.log('picked:', e.detail.value)}
    />
  );
}`;

const meta = {
  title: 'Components/PromptInput',
  tags: ['autodocs'],
  argTypes: argTypesFor('kai-prompt-input'),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-prompt-input', [
          '`<kai-prompt-input>` is the framework-agnostic **web component** version of the chat composer — an auto-resizing textarea with a send button and optional suggestion chips, isolated in **Shadow DOM** so the host page\'s CSS can\'t leak in and the kit\'s styles can\'t leak out. SolidJS is bundled in, so the host needs nothing.',
          '**When to use:** adding a message composer to a non-Solid app (React, Vue, Svelte, plain HTML), or anywhere you want zero style conflicts. If you *are* in SolidJS and want fine-grained control, compose the `PromptInput` primitives instead.',
          '**How to use:** register once with `import \'@kitn.ai/ui/elements\'`, configure it with JS **properties** (`placeholder`, `value`, `disabled`, `loading`, `suggestions`, `attachments`) and flag attributes (`search`, `voice` to show the Globe/Mic toolbar buttons), and listen for **CustomEvents** (`kai-submit`, `kai-value-change`, `kai-suggestion-click`, `kai-search`, `kai-voice`) directly on the element. Leave `value` unset to let the element manage its own input state; seed `attachments` to pre-populate staged files. **Custom toolbar buttons:** place `<kai-action id icon tooltip>` elements as children — they are invisible data carriers (Shadow DOM hides them) that the element reads and renders as extra ghost icon buttons in the left toolbar. Each click fires a `kai-toolbar-action` CustomEvent with `detail.action` equal to the action id (the same `<kai-action>` descriptor element that `<kai-message>` uses — composition symmetry).',
          '**Slash commands (declarative):** place `<kai-slash-command command="id" description="…">Label</kai-slash-command>` elements as children — invisible data carriers merged with the `slashCommands` JS property. Typing `/` opens the palette with the combined list; selecting an item fires `kai-slash-select` with `detail.command`. Prop items appear first; declarative children are appended.',
          '**Placement:** pinned to the bottom of a chat surface, full width. Set `loading` while a response streams to show the busy state, and `disabled` to block input entirely.',
          'See the **Code** tab below for the HTML usage; the *SolidJS* story shows the same element inside a Solid component.',
        ]),
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

/** The element used the plain-HTML / any-framework way. */
export const Default: Story = {
  args: {
    placeholder: 'Send a message...',
    disabled: false,
    loading: false,
    suggestionMode: 'submit',
    slashCompact: false,
    search: false,
    voice: false,
  },
  render: (args: Record<string, unknown>) => <PromptInputElement args={args} />,
  parameters: { docs: { source: { code: HTML_SNIPPET, language: 'html' } } },
};

/** The same element used inside a SolidJS component (properties via `ref`, events via `on:`). */
export const InSolidJS: Story = {
  name: 'In SolidJS',
  render: () => <PromptInputElement />,
  parameters: { docs: { source: { code: SOLID_SNIPPET, language: 'tsx' } } },
};

const TOOLBAR_SNIPPET = `<!-- show the Search (Globe) + Voice (Mic) toolbar buttons -->
<kai-prompt-input id="input" search voice></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/elements';
  const input = document.getElementById('input');
  input.addEventListener('kai-search', () => console.log('search clicked'));
  input.addEventListener('kai-voice', () => console.log('voice clicked'));
</script>`;

/** With the **microphone** (and search) toolbar buttons enabled via the `voice`
 *  and `search` flags. Clicking them fires `kai-voice` / `kai-search` CustomEvents. */
export const WithVoiceAndSearch: Story = {
  name: 'With Voice & Search',
  render: () => <PromptInputElement search voice />,
  parameters: { docs: { source: { code: TOOLBAR_SNIPPET, language: 'html' } } },
};

const ATTACHMENTS_SNIPPET = `<!-- seed staged attachments without an upload -->
<kai-prompt-input id="input" voice></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/elements';
  const input = document.getElementById('input');
  input.attachments = [
    { id: 'a1', type: 'file', filename: 'architecture.png',
      mediaType: 'image/png', url: 'data:image/svg+xml;utf8,...' },
    { id: 'a2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  ];
</script>`;

/** Pre-populated with a couple of **attachments** (an image + a file) via the
 *  `attachments` property, with the mic shown too. The paperclip still adds
 *  more, and each chip can be removed. */
export const WithAttachments: Story = {
  name: 'With Attachments',
  render: () => <PromptInputElement voice attachments={sampleAttachments} />,
  parameters: { docs: { source: { code: ATTACHMENTS_SNIPPET, language: 'html' } } },
};

const CUSTOM_TOOLBAR_SNIPPET = `<kai-prompt-input id="input" voice></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/elements';

  const input = document.getElementById('input');

  // Inject <kai-action> children as toolbar buttons (declarative composition).
  ['attach', 'translate', 'bookmark'].forEach((id, i) => {
    const el = document.createElement('kai-action');
    el.id = id;
    el.setAttribute('icon', ['paperclip', 'flag', 'bookmark'][i]);
    el.setAttribute('tooltip', ['Attach', 'Translate', 'Bookmark'][i]);
    input.appendChild(el);
  });

  input.addEventListener('kai-toolbar-action', (e) => {
    console.log('toolbar action:', e.detail.action);
  });
  input.addEventListener('kai-submit', (e) => console.log('submit:', e.detail.value));
</script>`;

const SLASH_COMMAND_SNIPPET = `<kai-prompt-input id="input" style="display:block; width:100%;"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/elements';

  const input = document.getElementById('input');

  // Inject <kai-slash-command> children — invisible data carriers read via
  // querySelectorAll + MutationObserver, merged with any slashCommands property.
  [
    { command: 'summarize', description: 'Summarize the thread' },
    { command: 'translate', description: 'Translate to English' },
    { command: 'explain',   description: "Explain like I'm five" },
  ].forEach(({ command, description }) => {
    const el = document.createElement('kai-slash-command');
    el.setAttribute('command', command);
    el.setAttribute('description', description);
    el.textContent = command; // becomes the label
    input.appendChild(el);
  });

  input.addEventListener('kai-slash-select', (e) => {
    console.log('slash selected:', e.detail.command);
  });
</script>`;

/** Composition: place **`<kai-action>`** children inside `<kai-prompt-input>` to add
 *  custom ghost icon buttons in the toolbar. Each click fires a `kai-toolbar-action` event
 *  with `detail.action` equal to the action id — the same `<kai-action>` descriptor
 *  element that `<kai-message>` uses for its action bar (composition symmetry). */
export const WithCustomToolbarActions: Story = {
  name: 'Custom Toolbar Actions (kai-action)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.setAttribute('placeholder', 'Ask anything...');
      el.addEventListener('kai-toolbar-action', (e: Event) => {
        console.log('toolbar action:', (e as CustomEvent<{ action: string }>).detail.action);
      });
    });
    return (
      <div style={{ padding: '16px', width: '100%' }}>
        <kai-prompt-input
          ref={(e: HTMLElement) => (el = e)}
          style={{ display: 'block', width: '100%' }}
        >
          {/* <kai-action> children are invisible data carriers — Shadow DOM hides them.
              The element reads them via querySelectorAll + MutationObserver and renders
              a ghost icon button per entry in the left toolbar. Clicking fires kai-action. */}
          <kai-action id="attach" icon="paperclip" tooltip="Attach" />
          <kai-action id="translate" icon="flag" tooltip="Translate" />
          <kai-action id="bookmark" icon="bookmark" tooltip="Bookmark" />
        </kai-prompt-input>
        <p style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>
          Open the browser console to see <code>kai-action</code> events when you click the extra toolbar buttons.
        </p>
      </div>
    );
  },
  parameters: { docs: { source: { code: CUSTOM_TOOLBAR_SNIPPET, language: 'html' } } },
};

/** Composition: place **`<kai-slash-command>`** children inside `<kai-prompt-input>`
 *  to declare slash commands without setting the `slashCommands` JS property.
 *  Type `/` in the input to open the palette. Each `<kai-slash-command>` child maps:
 *  `command` attr → id, textContent → label, `description` attr → description.
 *  Selection fires `kai-slash-select` with `detail.command`.
 *  Prop (`slashCommands`) and declarative children are merged — prop items first. */
export const DeclarativeSlashCommands: Story = {
  name: 'Declarative Slash Commands (kai-slash-command)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.setAttribute('placeholder', 'Type / to open the command palette…');
      el.addEventListener('kai-slash-select', (e: Event) => {
        console.log('slash selected:', (e as CustomEvent<{ command: unknown }>).detail.command);
      });
    });
    return (
      <div style={{ padding: '16px', width: '100%' }}>
        <kai-prompt-input
          ref={(e: HTMLElement) => (el = e)}
          style={{ display: 'block', width: '100%' }}
        >
          {/* <kai-slash-command> children are invisible data carriers — Shadow DOM hides them.
              The element reads them via querySelectorAll + MutationObserver.
              command attr → id, textContent → label, description attr → description. */}
          <kai-slash-command command="summarize" description="Summarize the thread">summarize</kai-slash-command>
          <kai-slash-command command="translate" description="Translate to English">translate</kai-slash-command>
          <kai-slash-command command="explain" description="Explain like I'm five">explain</kai-slash-command>
        </kai-prompt-input>
        <p style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>
          Type <code>/</code> in the input to open the command palette. Open the browser
          console to see <code>kai-slash-select</code> events on selection.
        </p>
      </div>
    );
  },
  parameters: { docs: { source: { code: SLASH_COMMAND_SNIPPET, language: 'html' } } },
};

