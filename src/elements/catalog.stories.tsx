import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { onMount, type JSX } from 'solid-js';
import './register'; // side effect: registers the custom elements
import {
  attachments,
  conversations,
  context,
  cotSteps,
  models,
  assistantMessage,
  userMessage,
  entityTriggers,
  sources,
} from '../stories/examples/sample-data';

/**
 * Examples / Catalog — the `examples/composable/index.html` showcase, ported into
 * Storybook as source-visible web-component stories. Every kai-* element rendered
 * with minimal sample data, grouped by category, so a developer can answer
 * "what exists?" without leaving Storybook — and read the exact markup via the
 * "Show code" panel on each story.
 *
 * Convention (matches the per-element stories): the kai-* tags are custom DOM
 * elements declared as JSX intrinsics elsewhere with only the standard
 * attributes; element-specific attributes and object/array PROPERTIES are set
 * imperatively through a `ref` (see `wire`/`attrs`/`props`), so this file stays
 * type-safe without re-declaring the tags.
 */

type AnyEl = HTMLElement & Record<string, unknown>;

/** Set JS properties (objects/arrays) on an element. */
const props = (el: HTMLElement, p: Record<string, unknown>) => {
  for (const k in p) (el as AnyEl)[k] = p[k];
};
/** Set string/boolean attributes on an element. */
const attrs = (el: HTMLElement, a: Record<string, string | boolean>) => {
  for (const k in a) {
    const v = a[k];
    if (v === false) el.removeAttribute(k);
    else el.setAttribute(k, v === true ? '' : v);
  }
};

// The kai-* tags are declared as JSX intrinsics by the per-element story files
// (global `declare module 'solid-js'` augmentations). We only ever pass `style`
// and `ref` here, so no local re-declaration is needed.

// ── helpers ────────────────────────────────────────────────────────────────

/** A bordered tile that frames one component with a caption. */
function Spec(props: { tag: string; note?: string; children: JSX.Element; tall?: boolean }) {
  return (
    <div
      style={{
        border: '1px solid var(--color-border, #e4e4e7)',
        'border-radius': '12px',
        overflow: 'hidden',
        background: 'var(--color-background, #fff)',
        display: 'flex',
        'flex-direction': 'column',
      }}
    >
      <div
        style={{
          padding: '8px 12px',
          'border-bottom': '1px solid var(--color-border, #e4e4e7)',
          'font-size': '12px',
          display: 'flex',
          gap: '8px',
          'align-items': 'baseline',
          'flex-wrap': 'wrap',
        }}
      >
        <code style={{ 'font-weight': '600', color: 'var(--color-foreground, #18181b)' }}>{props.tag}</code>
        {props.note ? (
          <span style={{ color: 'var(--color-muted-foreground, #71717a)' }}>{props.note}</span>
        ) : null}
      </div>
      <div style={{ padding: '14px', 'min-height': props.tall ? '320px' : 'auto' }}>{props.children}</div>
    </div>
  );
}

/** Responsive grid of Spec tiles. */
function Grid(props: { children: JSX.Element }) {
  return (
    <div
      style={{
        display: 'grid',
        'grid-template-columns': 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
        'max-width': '1100px',
      }}
    >
      {props.children}
    </div>
  );
}

const meta = {
  title: 'Examples/Catalog',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          '# Component catalog',
          'Every `kai-*` web component rendered with minimal sample data, grouped by category — the in-Storybook port of `examples/composable/index.html`. Use it to answer **"what exists?"**, then open each story\'s **Show code** panel to read the exact composition markup.',
          'Data goes **in via properties** (set with `el.someProp = …` — see each snippet), interactions come **out via events** (`el.addEventListener("kai-submit", …)`). Register everything once with `import "@kitn.ai/ui/elements"`.',
          'Next: see **Examples / Composed chat shell** to watch these leaves assemble into a real chat, and **Examples / Choosing components** for the mental model of which tier to reach for.',
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

// ── 01 · Batteries-included ──────────────────────────────────────────────────

const DROPIN_SNIPPET = `<!-- The drop-in layer: whole surfaces in a single tag -->
<kai-conversations style="display:block;height:320px"></kai-conversations>
<kai-prompt-input placeholder="Ask anything…  (try / or @)"></kai-prompt-input>

<script type="module">
  import '@kitn.ai/ui/elements';

  const list = document.querySelector('kai-conversations');
  list.conversations = [
    { id: 'c1', title: 'Web component architecture', scope: { type: 'document' },
      messageCount: 12, lastMessageAt: '…', updatedAt: '…' },
  ];
  list.activeId = 'c1';
  list.addEventListener('kai-conversation-select', (e) => (list.activeId = e.detail.id));

  const input = document.querySelector('kai-prompt-input');
  // entity-pill triggers: / inserts a skill, @ inserts an agent/plugin
  input.triggers = [
    { char: '/', kind: 'skill', items: [
      { id: 'summarize', label: 'Summarize', description: 'Summarize the thread', promptText: 'Summarize the thread.' },
    ]},
    { char: '@', kind: 'agent', items: [
      { id: 'code-reviewer', label: 'Code Reviewer', group: 'Agents', description: 'Reviews diffs for bugs' },
    ]},
  ];
  input.addEventListener('kai-submit', (e) => console.log('submit', e.detail.value));
</script>`;

export const BatteriesIncluded: Story = {
  name: '01 · Batteries-included',
  render: () => {
    let list!: HTMLElement;
    let input!: HTMLElement;
    onMount(() => {
      props(list, { conversations, activeId: 'c1' });
      list.addEventListener('kai-conversation-select', (e) => ((list as AnyEl).activeId = (e as CustomEvent).detail.id));
      props(input, { triggers: entityTriggers });
      attrs(input, { placeholder: 'Ask anything…  (try / or @)' });
    });
    return (
      <Grid>
        <Spec tag="kai-conversations" note="sidebar list with grouping & selection" tall>
          <div style={{ height: '300px', border: '1px solid var(--color-border,#e4e4e7)', 'border-radius': '8px', overflow: 'hidden' }}>
            <kai-conversations ref={(e) => (list = e)} style={{ display: 'block', height: '100%' }} />
          </div>
        </Spec>
        <Spec tag="kai-prompt-input" note='entity pills — type "/" or "@"'>
          <kai-prompt-input ref={(e) => (input = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: DROPIN_SNIPPET, language: 'html' } } },
};

// ── 02 · Messages ────────────────────────────────────────────────────────────

const MESSAGES_SNIPPET = `<!-- Compose your own message list from the parts a turn is made of -->
<kai-message id="assistant"></kai-message>
<kai-message id="user"></kai-message>
<kai-markdown id="md"></kai-markdown>
<kai-reasoning id="reason" label="Reasoning" streaming></kai-reasoning>
<kai-chain-of-thought id="cot"></kai-chain-of-thought>
<kai-code-block id="code" language="ts"></kai-code-block>
<kai-tool id="tool" open></kai-tool>

<script type="module">
  import '@kitn.ai/ui/elements';

  document.getElementById('assistant').message = {
    id: 'm-a', role: 'assistant',
    content: "Here's the plan…\\n\`\`\`js\\nconst kit = useKitn();\\n\`\`\`",
    reasoning: { text: 'The user wants X…', label: 'Reasoning' },
    tools: [{ type: 'search', state: 'output-available', input: { query: 'kitn' }, output: { hits: 3 } }],
    actions: ['copy', 'like', 'dislike', 'regenerate'],
  };
  document.getElementById('user').message = { id: 'm-u', role: 'user', content: 'How do I compose these?' };
  document.getElementById('md').content = '### Markdown\\nRenders **bold**, \`code\`, lists.';
  document.getElementById('reason').text = 'First I parse, then plan, then verify.';
  document.getElementById('code').code = 'export const add = (a, b) => a + b;';
  document.getElementById('cot').steps = [{ label: 'Understand' }, { label: 'Design' }, { label: 'Build' }];
  document.getElementById('tool').tool = {
    type: 'database_query', state: 'output-available',
    input: { table: 'users', limit: 10 }, output: { rows: 10, ms: 42 },
  };
</script>`;

export const Messages: Story = {
  name: '02 · Messages',
  render: () => {
    let msgA!: HTMLElement, msgU!: HTMLElement, md!: HTMLElement, reason!: HTMLElement;
    let cot!: HTMLElement, code!: HTMLElement, tool!: HTMLElement;
    onMount(() => {
      props(msgA, { message: assistantMessage });
      props(msgU, { message: userMessage });
      props(md, { content: '### Markdown\nRenders **bold**, _italic_, `code`, and lists:\n- one\n- two\n\n> and blockquotes.' });
      props(reason, { text: 'First I parse the request, then I plan the steps, then I execute and verify.' });
      attrs(reason, { label: 'Reasoning', streaming: true });
      props(cot, { steps: cotSteps });
      props(code, { code: 'export function add(a: number, b: number): number {\n  return a + b;\n}' });
      attrs(code, { language: 'ts' });
      props(tool, { tool: { type: 'database_query', state: 'output-available', input: { table: 'users', limit: 10 }, output: { rows: 10, ms: 42 } } });
      attrs(tool, { open: true });
    });
    return (
      <Grid>
        <Spec tag="kai-message" note='role="assistant" — reasoning + tool + attachment + actions'>
          <kai-message ref={(e) => (msgA = e)} />
        </Spec>
        <Spec tag="kai-message" note='role="user"'>
          <kai-message ref={(e) => (msgU = e)} />
        </Spec>
        <Spec tag="kai-markdown" note="token-themed markdown + fenced code">
          <kai-markdown ref={(e) => (md = e)} />
        </Spec>
        <Spec tag="kai-reasoning" note="collapsible thinking; auto-opens while streaming">
          <kai-reasoning ref={(e) => (reason = e)} />
        </Spec>
        <Spec tag="kai-chain-of-thought" note="step-by-step reasoning with connectors">
          <kai-chain-of-thought ref={(e) => (cot = e)} />
        </Spec>
        <Spec tag="kai-code-block" note='language="ts" — highlighted, copyable'>
          <kai-code-block ref={(e) => (code = e)} />
        </Spec>
        <Spec tag="kai-tool" note="open — input, output, state badge">
          <kai-tool ref={(e) => (tool = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: MESSAGES_SNIPPET, language: 'html' } } },
};

// ── 03 · Attachments & media ─────────────────────────────────────────────────

const MEDIA_SNIPPET = `<!-- One element, presentation chosen by attribute -->
<kai-attachments id="inline" variant="inline" hover-card></kai-attachments>
<kai-attachments id="grid" variant="grid" removable></kai-attachments>
<kai-image id="img" alt="demo" style="width:96px"></kai-image>
<kai-source href="https://kitn.dev" headline="kitn — the kit"
  description="Composable chat UI." show-favicon></kai-source>
<kai-sources id="srcs"></kai-sources>

<script type="module">
  import '@kitn.ai/ui/elements';
  const items = [
    { id: '1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: '…' },
    { id: '2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  ];
  document.getElementById('inline').items = items;
  const grid = document.getElementById('grid');
  grid.items = items;
  grid.addEventListener('kai-remove', (e) => (grid.items = grid.items.filter((x) => x.id !== e.detail.id)));
  document.getElementById('img').base64 = '…'; // pair with media-type
  document.getElementById('srcs').sources = [
    { href: 'https://kitn.dev', title: 'kitn', description: '…', showFavicon: true },
  ];
</script>`;

export const AttachmentsAndMedia: Story = {
  name: '03 · Attachments & media',
  render: () => {
    let inline!: HTMLElement, grid!: HTMLElement, img!: HTMLElement, src!: HTMLElement, srcs!: HTMLElement;
    onMount(() => {
      props(inline, { items: attachments });
      attrs(inline, { variant: 'inline', 'hover-card': true });
      props(grid, { items: attachments });
      attrs(grid, { variant: 'grid', removable: true });
      grid.addEventListener('kai-remove', (e) => {
        const id = (e as CustomEvent).detail.id;
        (grid as AnyEl).items = (attachments as { id: string }[]).filter((x) => x.id !== id);
      });
      props(img, {
        base64: btoa(unescape(encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="16" fill="#7c3aed"/><text x="48" y="62" font-size="44" text-anchor="middle" fill="white">★</text></svg>'))),
      });
      attrs(img, { alt: 'demo', 'media-type': 'image/svg+xml' });
      attrs(src, { href: 'https://kitn.dev', headline: 'kitn — the kit', description: 'Composable SolidJS + web-component chat UI.', 'show-favicon': true });
      props(srcs, { sources });
    });
    return (
      <Grid>
        <Spec tag="kai-attachments" note='variant="inline" hover-card'>
          <kai-attachments ref={(e) => (inline = e)} />
        </Spec>
        <Spec tag="kai-attachments" note='variant="grid" removable'>
          <kai-attachments ref={(e) => (grid = e)} />
        </Spec>
        <Spec tag="kai-image" note="base64 / byte-array image with skeleton">
          <kai-image ref={(e) => (img = e)} style={{ width: '96px' }} />
        </Spec>
        <Spec tag="kai-source" note="show-favicon — citation with hover preview">
          <kai-source ref={(e) => (src = e)} />
        </Spec>
        <Spec tag="kai-sources" note="wrapped row of citations">
          <kai-sources ref={(e) => (srcs = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: MEDIA_SNIPPET, language: 'html' } } },
};

// ── 04 · Composer ────────────────────────────────────────────────────────────

const COMPOSER_SNIPPET = `<!-- Input affordances you can place anywhere -->
<kai-suggestions id="suggs"></kai-suggestions>
<kai-file-upload></kai-file-upload>
<kai-voice-input id="voice"></kai-voice-input>
<kai-thinking-bar text="Thinking…" stoppable></kai-thinking-bar>

<script type="module">
  import '@kitn.ai/ui/elements';
  const suggs = document.getElementById('suggs');
  suggs.suggestions = ['Explain the architecture', 'Show me a code example'];
  suggs.addEventListener('kai-select', (e) => console.log('select', e.detail.value));

  const voice = document.getElementById('voice');
  voice.transcribe = async () => 'transcribed text'; // your STT here
  voice.addEventListener('kai-transcription', (e) => console.log(e.detail.text));
</script>`;

export const Composer: Story = {
  name: '04 · Composer',
  render: () => {
    let suggs!: HTMLElement, voice!: HTMLElement, think!: HTMLElement;
    onMount(() => {
      props(suggs, { suggestions: ['Explain the architecture', 'Show me a code example', "What's deferred?"] });
      props(voice, { transcribe: async () => { await new Promise((r) => setTimeout(r, 400)); return 'transcribed text'; } });
      attrs(think, { text: 'Thinking…', stoppable: true });
    });
    return (
      <Grid>
        <Spec tag="kai-suggestions" note="suggestion chips; click fires select">
          <kai-suggestions ref={(e) => (suggs = e)} />
        </Spec>
        <Spec tag="kai-file-upload" note="click / drag-drop dropzone">
          <kai-file-upload />
        </Spec>
        <Spec tag="kai-voice-input · kai-thinking-bar" note="mic capture + shimmering thinking bar">
          <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
            <kai-voice-input ref={(e) => (voice = e)} />
            <kai-thinking-bar ref={(e) => (think = e)} style={{ flex: '1' }} />
          </div>
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: COMPOSER_SNIPPET, language: 'html' } } },
};

// ── 05 · Header & meta ───────────────────────────────────────────────────────

const META_SNIPPET = `<!-- The small pieces around a conversation -->
<kai-model-switcher id="models"></kai-model-switcher>
<kai-context id="ctx"></kai-context>
<kai-scope-picker id="scope"></kai-scope-picker>
<kai-checkpoint label="Checkpoint" tooltip="Restore"></kai-checkpoint>
<kai-skills id="skills"></kai-skills>
<kai-feedback-bar bar-title="Was this helpful?"></kai-feedback-bar>

<script type="module">
  import '@kitn.ai/ui/elements';
  const ms = document.getElementById('models');
  ms.models = [{ id: 'opus', name: 'Claude Opus', provider: 'Anthropic' }];
  ms.currentModel = 'opus';
  ms.addEventListener('kai-model-change', (e) => (ms.currentModel = e.detail.modelId));

  document.getElementById('ctx').context = { usedTokens: 48200, maxTokens: 200000 };
  const scope = document.getElementById('scope');
  scope.availableAuthors = ['Rob', 'Alex'];
  scope.availableTags = ['design', 'api'];
  document.getElementById('skills').skills = [{ id: 's1', name: 'web-search' }];
</script>`;

export const HeaderAndMeta: Story = {
  name: '05 · Header & meta',
  render: () => {
    let ms!: HTMLElement, ctx!: HTMLElement, scope!: HTMLElement, cp!: HTMLElement, skills!: HTMLElement, fb!: HTMLElement;
    onMount(() => {
      props(ms, { models, currentModel: 'opus' });
      ms.addEventListener('kai-model-change', (e) => ((ms as AnyEl).currentModel = (e as CustomEvent).detail.modelId));
      props(ctx, { context });
      props(scope, { availableAuthors: ['Rob', 'Alex'], availableTags: ['design', 'api'] });
      attrs(cp, { label: 'Checkpoint', tooltip: 'Restore' });
      props(skills, { skills: [{ id: 's1', name: 'web-search' }, { id: 's2', name: 'code' }] });
      attrs(fb, { 'bar-title': 'Was this helpful?' });
    });
    return (
      <Grid>
        <Spec tag="kai-model-switcher" note="model dropdown; emits modelchange">
          <kai-model-switcher ref={(e) => (ms = e)} />
        </Spec>
        <Spec tag="kai-context" note="token-usage meter with breakdown">
          <kai-context ref={(e) => (ctx = e)} />
        </Spec>
        <Spec tag="kai-scope-picker" note="scope a chat by author or tag">
          <kai-scope-picker ref={(e) => (scope = e)} />
        </Spec>
        <Spec tag="kai-checkpoint · kai-skills" note="bookmark button + active-skill badges">
          <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
            <kai-checkpoint ref={(e) => (cp = e)} />
            <kai-skills ref={(e) => (skills = e)} />
          </div>
        </Spec>
        <Spec tag="kai-feedback-bar" note="inline thumbs up/down banner">
          <kai-feedback-bar ref={(e) => (fb = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: META_SNIPPET, language: 'html' } } },
};

// ── 06 · Status & motion ─────────────────────────────────────────────────────

const STATUS_SNIPPET = `<!-- Loaders, streaming text, and empty states -->
<kai-loader variant="circular"></kai-loader>
<kai-loader variant="dots"></kai-loader>
<kai-text-shimmer text="Generating response…"></kai-text-shimmer>
<kai-response-stream id="stream" speed="30"></kai-response-stream>
<kai-empty empty-title="No conversations yet" description="Start chatting to see them here.">
  <span slot="media">✦</span>
</kai-empty>

<script type="module">
  import '@kitn.ai/ui/elements';
  const stream = document.getElementById('stream');
  stream.text = 'This text reveals with a typewriter animation, character by character.';
  stream.addEventListener('kai-complete', () => console.log('done'));
</script>`;

export const StatusAndMotion: Story = {
  name: '06 · Status & motion',
  render: () => {
    let l1!: HTMLElement, l2!: HTMLElement, l3!: HTMLElement, l4!: HTMLElement, l5!: HTMLElement;
    let shimmer!: HTMLElement, stream!: HTMLElement, empty!: HTMLElement;
    onMount(() => {
      attrs(l1, { variant: 'circular' });
      attrs(l2, { variant: 'dots' });
      attrs(l3, { variant: 'wave' });
      attrs(l4, { variant: 'bars' });
      attrs(l5, { variant: 'pulse-dot' });
      attrs(shimmer, { text: 'Generating response…' });
      attrs(stream, { speed: '30' });
      props(stream, { text: "This text reveals with a typewriter animation, streamed character by character — exactly how you'd render a live assistant reply." });
      attrs(empty, { 'empty-title': 'No conversations yet', description: 'Start chatting to see them here.' });
    });
    return (
      <Grid>
        <Spec tag="kai-loader" note="twelve loader styles">
          <div style={{ display: 'flex', gap: '24px', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
            <kai-loader ref={(e) => (l1 = e)} />
            <kai-loader ref={(e) => (l2 = e)} />
            <kai-loader ref={(e) => (l3 = e)} />
            <kai-loader ref={(e) => (l4 = e)} />
            <kai-loader ref={(e) => (l5 = e)} />
          </div>
        </Spec>
        <Spec tag="kai-text-shimmer" note="animated shimmering text">
          <kai-text-shimmer ref={(e) => (shimmer = e)} />
        </Spec>
        <Spec tag="kai-response-stream" note='mode="typewriter" — emits complete'>
          <kai-response-stream ref={(e) => (stream = e)} />
        </Spec>
        <Spec tag="kai-empty" note="empty-state layout — media & default slots">
          <kai-empty ref={(e) => (empty = e)}>
            <span slot="media">✦</span>
          </kai-empty>
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: STATUS_SNIPPET, language: 'html' } } },
};
