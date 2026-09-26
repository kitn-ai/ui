import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { fn } from 'storybook/test';
import { onMount, onCleanup } from 'solid-js';
import '../register/register'; // side effect: registers <kai-chat>, <kai-conversations>, <kai-prompt-input>
import { attachKaiActions } from '../../stories/docs/story-actions';
import type { AttachmentData } from '../../components/attachments/attachments';
import type { TriggerDef } from '../../components/composer/composer';
import type { ComposerDoc } from '../../primitives/composer-model';
import { argTypesFor, specDescription } from '../../stories/docs/web-component-controls';

// The web components are custom DOM elements, so declare the tags for JSX.
declare module 'solid-js' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'kai-prompt-input': JSX.HTMLAttributes<HTMLElement> & { theme?: string; placeholder?: string; loading?: boolean; disabled?: boolean; voice?: boolean; 'web-search'?: boolean; attach?: boolean; submit?: string; 'suggestion-mode'?: string };
      'kai-action': JSX.HTMLAttributes<HTMLElement> & { icon?: string; tooltip?: string };
    }
  }
}

// `kai-action` is a descriptor element (created via `document.createElement`
// below and read by `<kai-prompt-input>` via DOM traversal, not a registered
// kai-* custom element), so it is not in the generated `KaiElementSolidProps`
// tag map (web-component-types.d.ts). The kit's own generated augmentation targets
// `solid-js/jsx-runtime`, which is what this project's tsc actually resolves
// `JSX.IntrinsicElements` from once any declaration exists there -- so a
// tag declared only on bare `solid-js` (the block above) stops being
// consulted. This block gives `kai-action` the same treatment locally, reusing
// the generated `KaiElementSolidProps<HTMLElement>` (merges into the same
// ambient `solid-js/jsx-runtime` augmentation the generator declares -- both
// are module-file augmentations of the same target) rather than hand-rolling
// its props shape a second time.
declare module 'solid-js/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'kai-action': KaiElementSolidProps<HTMLElement> & { icon?: string; tooltip?: string };
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
  value?: string | ComposerDoc;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  suggestions?: string[];
  webSearch?: boolean;
  voice?: boolean;
  attachments?: AttachmentData[];
  triggers?: TriggerDef[];
}

/** Live demo of the actual `<kai-prompt-input>` custom element (Shadow DOM and all). */
function PromptInputElement(props: { webSearch?: boolean; voice?: boolean; attachments?: AttachmentData[]; args?: Record<string, unknown> }) {
  let el: PromptInputEl | undefined;
  onMount(() => {
    if (!el) return;
    // Default fixed data
    el.placeholder = 'Ask anything...';
    el.suggestions = sampleSuggestions;
    if (props.webSearch) el.setAttribute('web-search', '');
    if (props.voice) el.setAttribute('voice', '');
    if (props.attachments) el.attachments = props.attachments;
    // Scalar args from Controls
    const args = props.args;
    if (args) {
      const scalarNames = [
        'value', 'placeholder', 'disabled', 'loading', 'suggestionMode',
        'webSearch', 'voice',
      ];
      for (const name of scalarNames) {
        if (name in args) (el as unknown as Record<string, unknown>)[name] = args[name];
      }
    }
    // Log every declared CustomEvent (kai-submit, kai-value-change, kai-web-search,
    // kai-voice, kai-suggestion-click, …) to the Actions panel.
    onCleanup(attachKaiActions(el));
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
  import '@kitn.ai/ui/web-components';   // registers the custom elements

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

const SOLID_SNIPPET = `import '@kitn.ai/ui/web-components'; // registers the custom elements
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
  title: 'Test Fixtures/Prompt Input',
  tags: ['autodocs'],
  argTypes: {
    ...argTypesFor('kai-prompt-input'),
    // Descriptions are the `kai-prompt-input` events in
    // src/web-components/web-component-meta.json (the DOM contract these stories drive).
    onAttachmentsChange: {
      action: 'attachments-change',
      description: 'The staged attachments changed: a file was added (via the paperclip) or removed (per-chip ×).',
      table: { category: 'Events' },
    },
    onStop: {
      action: 'stop',
      description: 'The Stop button was clicked while `stoppable` and `loading` are both true.',
      table: { category: 'Events' },
    },
    onSubmit: {
      action: 'submit',
      description: 'The user submitted the prompt (Enter or send button).',
      table: { category: 'Events' },
    },
    onSuggestionClick: {
      action: 'suggestion-click',
      description: 'A suggestion was clicked while `suggestion-mode="fill"`.',
      table: { category: 'Events' },
    },
    onToolbarAction: {
      action: 'toolbar-action',
      description: 'A custom `<kai-action>` toolbar button was clicked; `detail.action` is the clicked element `id`.',
      table: { category: 'Events' },
    },
    onValueChange: {
      action: 'value-change',
      description: 'The input changed (fires on every edit); carries the flattened `value` plus the structured `doc` and `entities`.',
      table: { category: 'Events' },
    },
    onVoice: {
      action: 'voice',
      description: 'The Voice (Mic) toolbar button was clicked.',
      table: { category: 'Events' },
    },
    onWebSearch: {
      action: 'web-search',
      description: 'The web-search (Globe) toolbar button was clicked.',
      table: { category: 'Events' },
    },
  },
  args: {
    onAttachmentsChange: fn(),
    onStop: fn(),
    onSubmit: fn(),
    onSuggestionClick: fn(),
    onToolbarAction: fn(),
    onValueChange: fn(),
    onVoice: fn(),
    onWebSearch: fn(),
  },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: specDescription('kai-prompt-input', [
        'The prompt row: a rich text editor with its send button and toolbar.',
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
    webSearch: false,
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
<kai-prompt-input id="input" web-search voice></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/web-components';
  const input = document.getElementById('input');
  input.addEventListener('kai-web-search', () => console.log('web search clicked'));
  input.addEventListener('kai-voice', () => console.log('voice clicked'));
</script>`;

/** With the **microphone** (and web-search) toolbar buttons enabled via the `voice`
 *  and `webSearch` flags. Clicking them fires `kai-voice` / `kai-web-search` CustomEvents. */
export const WithVoiceAndSearch: Story = {
  name: 'With Voice & Search',
  render: () => <PromptInputElement webSearch voice />,
  parameters: { docs: { source: { code: TOOLBAR_SNIPPET, language: 'html' } } },
};

const ATTACHMENTS_SNIPPET = `<!-- seed staged attachments without an upload -->
<kai-prompt-input id="input" voice></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/web-components';
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
  import '@kitn.ai/ui/web-components';

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

/** Composition: place action element children inside the prompt input element to add
 *  custom ghost icon buttons in the toolbar. Each click fires a `kai-toolbar-action`
 *  event with `detail.action` equal to the action id; the same action element the
 *  message element uses for its action bar (composition symmetry). */
export const WithCustomToolbarActions: Story = {
  name: 'Custom Toolbar Actions (kai-action)',
  render: () => {
    let el: HTMLElement | undefined;
    onMount(() => {
      if (!el) return;
      el.setAttribute('placeholder', 'Ask anything...');
      // Log every declared event, incl. kai-toolbar-action from the <kai-action> children.
      onCleanup(attachKaiActions(el));
    });
    return (
      <div style={{ padding: '16px', width: '100%' }}>
        <kai-prompt-input
          ref={(e: HTMLElement) => (el = e)}
          style={{ display: 'block', width: '100%' }}
        >
          {/* <kai-action> children are invisible data carriers; Shadow DOM hides them.
              The element reads them via querySelectorAll + MutationObserver and renders
              a ghost icon button per entry in the left toolbar. Clicking fires kai-action. */}
          <kai-action id="attach" icon="paperclip" tooltip="Attach" />
          <kai-action id="translate" icon="flag" tooltip="Translate" />
          <kai-action id="bookmark" icon="bookmark" tooltip="Bookmark" />
        </kai-prompt-input>
        <p style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>
          Watch the Actions panel for <code>kai-toolbar-action</code> events when you click the extra toolbar buttons.
        </p>
      </div>
    );
  },
  parameters: { docs: { source: { code: CUSTOM_TOOLBAR_SNIPPET, language: 'html' } } },
};

// Inline data-URI icons (no asset deps). Red disc = a "record" skill; the agent
// items go iconless to show both styles.
const recordIcon =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><circle cx='16' cy='16' r='11' fill='%23e11d48'/></svg>";
// Simple colored app-tile icons (Codex-style) so plugins are visually distinct.
const tile = (hex: string) =>
  `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect width='32' height='32' rx='7' fill='%23${hex}'/></svg>`;

// There is NO cap on items; the menu shows as many as you provide (and scrolls).
// This set is intentionally large to demonstrate that.
const ENTITY_TRIGGERS: TriggerDef[] = [
  {
    // `/` → skills (instructions you invoke).
    char: '/',
    kind: 'skill',
    items: [
      { id: 'summarize', label: 'Summarize', description: 'Summarize the thread', promptText: 'Summarize the thread.' },
      { id: 'explain', label: 'Explain', description: "Explain like I'm five", promptText: 'Explain this simply.' },
      { id: 'translate', label: 'Translate', description: 'Translate to English', promptText: 'Translate to English.' },
      { id: 'rewrite', label: 'Rewrite', description: 'Rewrite for clarity', promptText: 'Rewrite this for clarity.' },
      { id: 'brainstorm', label: 'Brainstorm', description: 'Generate ideas', promptText: 'Brainstorm ideas.' },
      { id: 'fix-grammar', label: 'Fix grammar', description: 'Correct spelling & grammar', promptText: 'Fix the grammar.' },
    ],
  },
  {
    // `@` → a sectioned menu (Codex-style): Plugins (installed tools/capabilities)
    // and Agents (subagents). Per-item `kind` overrides the trigger default, so
    // both live under one `@` menu with section headers + descriptions.
    char: '@',
    kind: 'agent',
    items: [
      { id: 'record-replay', label: 'Record & Replay', kind: 'plugin', group: 'Plugins', icon: recordIcon,
        description: "Record what I'm doing on my Mac and turn it into a Skill",
        promptText: 'Use the Record & Replay tool.',
        data: { plugin: 'record-replay', tool: 'record_and_replay' } },
      { id: 'documents', label: 'Documents', kind: 'plugin', group: 'Plugins', icon: tile('2563eb'),
        description: 'Create and edit document artifacts', data: { plugin: 'documents' } },
      { id: 'pdf', label: 'PDF', kind: 'plugin', group: 'Plugins', icon: tile('dc2626'),
        description: 'Read, create, and verify PDF files', data: { plugin: 'pdf' } },
      { id: 'spreadsheets', label: 'Spreadsheets', kind: 'plugin', group: 'Plugins', icon: tile('16a34a'),
        description: 'Create and edit spreadsheet files', data: { plugin: 'spreadsheets' } },
      { id: 'presentations', label: 'Presentations', kind: 'plugin', group: 'Plugins', icon: tile('ea580c'),
        description: 'Create and edit presentations', data: { plugin: 'presentations' } },
      { id: 'code-reviewer', label: 'Code Reviewer', group: 'Agents',
        description: 'Reviews diffs for bugs', promptText: 'Hand this to the Code Reviewer agent.' },
      { id: 'researcher', label: 'Researcher', group: 'Agents', description: 'Deep multi-source research' },
      { id: 'planner', label: 'Planner', group: 'Agents', description: 'Breaks work into a step-by-step plan' },
    ],
  },
];

const ENTITY_PILLS_SNIPPET = `<!-- set triggers to the entities you support; / and @ open the picker -->
<kai-prompt-input id="input" placeholder="Type / for a skill or @ for an agent…"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/web-components';

  const input = document.getElementById('input');
  input.triggers = [
    { char: '/', kind: 'skill', items: [{ id: 'record-replay', label: 'Record-Replay' }] },
    { char: '@', kind: 'agent', items: [{ id: 'code-reviewer', label: 'Code-Reviewer' }] },
  ];

  // kai-submit carries the structured doc + entities alongside the flattened value.
  input.addEventListener('kai-submit', (e) => console.log(e.detail.value, e.detail.doc, e.detail.entities));
</script>`;

/** Rich entity pills inside the real prompt input: `/` inserts a **skill**; `@`
 *  inserts an **agent** (plugins are the grouping/provenance, carried in `data`).
 *  Each pill is atomic; `kai-submit`/`kai-value-change` carry the structured
 *  `doc` + `entities` alongside the flattened `value`. */
export const WithEntityPills: Story = {
  name: 'Entity Pills (/ skills, @ agents)',
  render: () => {
    let el: PromptInputEl | undefined;
    onMount(() => {
      if (!el) return;
      el.placeholder = 'Type / for a skill or @ for an agent…';
      el.triggers = ENTITY_TRIGGERS;
      // Log every declared event (kai-submit carries the structured doc + entities).
      onCleanup(attachKaiActions(el));
    });
    return (
      <div style={{ padding: '16px', width: '100%' }}>
        <kai-prompt-input ref={(e: HTMLElement) => (el = e as PromptInputEl)} style={{ display: 'block', width: '100%' }} />
        <p style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>
          Type <code>/</code> to insert a skill or <code>@</code> to insert an agent. Backspace deletes a
          whole pill. Watch the Actions panel for <code>kai-submit</code> with the structured <code>doc</code> + <code>entities</code>.
        </p>
      </div>
    );
  },
  parameters: { docs: { source: { code: ENTITY_PILLS_SNIPPET, language: 'html' } } },
};

const PREFILLED_SNIPPET = `<!-- seed pills programmatically: value takes a ComposerDoc, not a string -->
<kai-prompt-input id="input"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/web-components';

  const input = document.getElementById('input');
  input.value = [
    { type: 'text', text: 'Review ' },
    { type: 'entity', entity: { kind: 'skill', id: 'summarize', label: 'Summarize', promptText: 'Summarize the thread.' } },
    { type: 'text', text: ' then hand to ' },
    { type: 'entity', entity: { kind: 'agent', id: 'code-reviewer', label: 'Code Reviewer' } },
    { type: 'text', text: '.' },
  ];
</script>`;

/** Programmatic pre-population: set `value` to a **ComposerDoc** (not a string) to
 *  seed pills (skills/agents/plugins) that the user can then edit. `kai-submit`
 *  still emits the flattened `value` string plus the structured `doc` + `entities`. */
export const Prefilled: Story = {
  name: 'Prefilled (pills)',
  render: () => {
    let el: PromptInputEl | undefined;
    onMount(() => {
      if (!el) return;
      el.triggers = ENTITY_TRIGGERS;
      el.value = [
        { type: 'text', text: 'Review ' },
        { type: 'entity', entity: { kind: 'skill', id: 'summarize', label: 'Summarize', promptText: 'Summarize the thread.' } },
        { type: 'text', text: ' then hand to ' },
        { type: 'entity', entity: { kind: 'agent', id: 'code-reviewer', label: 'Code Reviewer' } },
        { type: 'text', text: ' using ' },
        { type: 'entity', entity: { kind: 'plugin', id: 'record-replay', label: 'Record & Replay', icon: recordIcon, data: { plugin: 'record-replay' } } },
        { type: 'text', text: '.' },
      ];
      // Log every declared event (kai-submit carries the structured doc + entities).
      onCleanup(attachKaiActions(el));
    });
    return (
      <div style={{ padding: '16px', width: '100%' }}>
        <kai-prompt-input ref={(e: HTMLElement) => (el = e as PromptInputEl)} style={{ display: 'block', width: '100%' }} />
        <p style={{ 'margin-top': '8px', 'font-size': '12px', color: 'var(--color-muted-foreground)' }}>
          Seeded via <code>value</code> as a <code>ComposerDoc</code>, the pills render on mount and stay editable.
        </p>
      </div>
    );
  },
  parameters: { docs: { source: { code: PREFILLED_SNIPPET, language: 'html' } } },
};

