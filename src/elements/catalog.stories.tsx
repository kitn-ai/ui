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
  slashCommands,
  sources,
} from '../stories/examples/sample-data';

/**
 * Examples / Catalog — the `examples/composable/index.html` showcase, ported into
 * Storybook as source-visible web-component stories. Every kc-* element rendered
 * with minimal sample data, grouped by category, so a developer can answer
 * "what exists?" without leaving Storybook — and read the exact markup via the
 * "Show code" panel on each story.
 *
 * Convention (matches the per-element stories): the kc-* tags are custom DOM
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

// The kc-* tags are declared as JSX intrinsics by the per-element story files
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
          'Every `kc-*` web component rendered with minimal sample data, grouped by category — the in-Storybook port of `examples/composable/index.html`. Use it to answer **"what exists?"**, then open each story\'s **Show code** panel to read the exact composition markup.',
          'Data goes **in via properties** (set with `el.someProp = …` — see each snippet), interactions come **out via events** (`el.addEventListener("submit", …)`). Register everything once with `import "@kitn.ai/chat/elements"`.',
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
<kc-conversations style="display:block;height:320px"></kc-conversations>
<kc-prompt-input placeholder="Ask anything…  (try typing /)"></kc-prompt-input>

<script type="module">
  import '@kitn.ai/chat/elements';

  const list = document.querySelector('kc-conversations');
  list.conversations = [
    { id: 'c1', title: 'Web component architecture', scope: { type: 'document' },
      messageCount: 12, lastMessageAt: '…', updatedAt: '…' },
  ];
  list.activeId = 'c1';
  list.addEventListener('conversationselect', (e) => (list.activeId = e.detail.id));

  const input = document.querySelector('kc-prompt-input');
  input.slashCommands = [
    { id: 'summarize', label: '/summarize', description: 'Summarize', category: 'Actions' },
  ];
  input.addEventListener('submit', (e) => console.log('submit', e.detail.value));
</script>`;

export const BatteriesIncluded: Story = {
  name: '01 · Batteries-included',
  render: () => {
    let list!: HTMLElement;
    let input!: HTMLElement;
    onMount(() => {
      props(list, { conversations, activeId: 'c1' });
      list.addEventListener('conversationselect', (e) => ((list as AnyEl).activeId = (e as CustomEvent).detail.id));
      props(input, { slashCommands });
      attrs(input, { placeholder: 'Ask anything…  (try typing /)' });
    });
    return (
      <Grid>
        <Spec tag="kc-conversations" note="sidebar list with grouping & selection" tall>
          <div style={{ height: '300px', border: '1px solid var(--color-border,#e4e4e7)', 'border-radius': '8px', overflow: 'hidden' }}>
            <kc-conversations ref={(e) => (list = e)} style={{ display: 'block', height: '100%' }} />
          </div>
        </Spec>
        <Spec tag="kc-prompt-input" note='slash commands — type "/"'>
          <kc-prompt-input ref={(e) => (input = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: DROPIN_SNIPPET, language: 'html' } } },
};

// ── 02 · Messages ────────────────────────────────────────────────────────────

const MESSAGES_SNIPPET = `<!-- Compose your own message list from the parts a turn is made of -->
<kc-message id="assistant"></kc-message>
<kc-message id="user"></kc-message>
<kc-markdown id="md"></kc-markdown>
<kc-reasoning id="reason" label="Reasoning" streaming></kc-reasoning>
<kc-chain-of-thought id="cot"></kc-chain-of-thought>
<kc-code-block id="code" language="ts"></kc-code-block>
<kc-tool id="tool" open></kc-tool>

<script type="module">
  import '@kitn.ai/chat/elements';

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
        <Spec tag="kc-message" note='role="assistant" — reasoning + tool + attachment + actions'>
          <kc-message ref={(e) => (msgA = e)} />
        </Spec>
        <Spec tag="kc-message" note='role="user"'>
          <kc-message ref={(e) => (msgU = e)} />
        </Spec>
        <Spec tag="kc-markdown" note="token-themed markdown + fenced code">
          <kc-markdown ref={(e) => (md = e)} />
        </Spec>
        <Spec tag="kc-reasoning" note="collapsible thinking; auto-opens while streaming">
          <kc-reasoning ref={(e) => (reason = e)} />
        </Spec>
        <Spec tag="kc-chain-of-thought" note="step-by-step reasoning with connectors">
          <kc-chain-of-thought ref={(e) => (cot = e)} />
        </Spec>
        <Spec tag="kc-code-block" note='language="ts" — highlighted, copyable'>
          <kc-code-block ref={(e) => (code = e)} />
        </Spec>
        <Spec tag="kc-tool" note="open — input, output, state badge">
          <kc-tool ref={(e) => (tool = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: MESSAGES_SNIPPET, language: 'html' } } },
};

// ── 03 · Attachments & media ─────────────────────────────────────────────────

const MEDIA_SNIPPET = `<!-- One element, presentation chosen by attribute -->
<kc-attachments id="inline" variant="inline" hover-card></kc-attachments>
<kc-attachments id="grid" variant="grid" removable></kc-attachments>
<kc-image id="img" alt="demo" style="width:96px"></kc-image>
<kc-source href="https://kitn.dev" headline="kitn — the kit"
  description="Composable chat UI." show-favicon></kc-source>
<kc-sources id="srcs"></kc-sources>

<script type="module">
  import '@kitn.ai/chat/elements';
  const items = [
    { id: '1', type: 'file', filename: 'architecture.png', mediaType: 'image/png', url: '…' },
    { id: '2', type: 'file', filename: 'spec.pdf', mediaType: 'application/pdf' },
  ];
  document.getElementById('inline').items = items;
  const grid = document.getElementById('grid');
  grid.items = items;
  grid.addEventListener('remove', (e) => (grid.items = grid.items.filter((x) => x.id !== e.detail.id)));
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
      grid.addEventListener('remove', (e) => {
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
        <Spec tag="kc-attachments" note='variant="inline" hover-card'>
          <kc-attachments ref={(e) => (inline = e)} />
        </Spec>
        <Spec tag="kc-attachments" note='variant="grid" removable'>
          <kc-attachments ref={(e) => (grid = e)} />
        </Spec>
        <Spec tag="kc-image" note="base64 / byte-array image with skeleton">
          <kc-image ref={(e) => (img = e)} style={{ width: '96px' }} />
        </Spec>
        <Spec tag="kc-source" note="show-favicon — citation with hover preview">
          <kc-source ref={(e) => (src = e)} />
        </Spec>
        <Spec tag="kc-sources" note="wrapped row of citations">
          <kc-sources ref={(e) => (srcs = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: MEDIA_SNIPPET, language: 'html' } } },
};

// ── 04 · Composer ────────────────────────────────────────────────────────────

const COMPOSER_SNIPPET = `<!-- Input affordances you can place anywhere -->
<kc-suggestions id="suggs"></kc-suggestions>
<kc-file-upload></kc-file-upload>
<kc-voice-input id="voice"></kc-voice-input>
<kc-thinking-bar text="Thinking…" stoppable></kc-thinking-bar>

<script type="module">
  import '@kitn.ai/chat/elements';
  const suggs = document.getElementById('suggs');
  suggs.suggestions = ['Explain the architecture', 'Show me a code example'];
  suggs.addEventListener('select', (e) => console.log('select', e.detail.value));

  const voice = document.getElementById('voice');
  voice.transcribe = async () => 'transcribed text'; // your STT here
  voice.addEventListener('transcription', (e) => console.log(e.detail.text));
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
        <Spec tag="kc-suggestions" note="suggestion chips; click fires select">
          <kc-suggestions ref={(e) => (suggs = e)} />
        </Spec>
        <Spec tag="kc-file-upload" note="click / drag-drop dropzone">
          <kc-file-upload />
        </Spec>
        <Spec tag="kc-voice-input · kc-thinking-bar" note="mic capture + shimmering thinking bar">
          <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
            <kc-voice-input ref={(e) => (voice = e)} />
            <kc-thinking-bar ref={(e) => (think = e)} style={{ flex: '1' }} />
          </div>
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: COMPOSER_SNIPPET, language: 'html' } } },
};

// ── 05 · Header & meta ───────────────────────────────────────────────────────

const META_SNIPPET = `<!-- The small pieces around a conversation -->
<kc-model-switcher id="models"></kc-model-switcher>
<kc-context id="ctx"></kc-context>
<kc-scope-picker id="scope"></kc-scope-picker>
<kc-checkpoint label="Checkpoint" tooltip="Restore"></kc-checkpoint>
<kc-skills id="skills"></kc-skills>
<kc-feedback-bar bar-title="Was this helpful?"></kc-feedback-bar>

<script type="module">
  import '@kitn.ai/chat/elements';
  const ms = document.getElementById('models');
  ms.models = [{ id: 'opus', name: 'Claude Opus', provider: 'Anthropic' }];
  ms.currentModel = 'opus';
  ms.addEventListener('modelchange', (e) => (ms.currentModel = e.detail.modelId));

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
      ms.addEventListener('modelchange', (e) => ((ms as AnyEl).currentModel = (e as CustomEvent).detail.modelId));
      props(ctx, { context });
      props(scope, { availableAuthors: ['Rob', 'Alex'], availableTags: ['design', 'api'] });
      attrs(cp, { label: 'Checkpoint', tooltip: 'Restore' });
      props(skills, { skills: [{ id: 's1', name: 'web-search' }, { id: 's2', name: 'code' }] });
      attrs(fb, { 'bar-title': 'Was this helpful?' });
    });
    return (
      <Grid>
        <Spec tag="kc-model-switcher" note="model dropdown; emits modelchange">
          <kc-model-switcher ref={(e) => (ms = e)} />
        </Spec>
        <Spec tag="kc-context" note="token-usage meter with breakdown">
          <kc-context ref={(e) => (ctx = e)} />
        </Spec>
        <Spec tag="kc-scope-picker" note="scope a chat by author or tag">
          <kc-scope-picker ref={(e) => (scope = e)} />
        </Spec>
        <Spec tag="kc-checkpoint · kc-skills" note="bookmark button + active-skill badges">
          <div style={{ display: 'flex', gap: '8px', 'align-items': 'center' }}>
            <kc-checkpoint ref={(e) => (cp = e)} />
            <kc-skills ref={(e) => (skills = e)} />
          </div>
        </Spec>
        <Spec tag="kc-feedback-bar" note="inline thumbs up/down banner">
          <kc-feedback-bar ref={(e) => (fb = e)} />
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: META_SNIPPET, language: 'html' } } },
};

// ── 06 · Status & motion ─────────────────────────────────────────────────────

const STATUS_SNIPPET = `<!-- Loaders, streaming text, and empty states -->
<kc-loader variant="circular"></kc-loader>
<kc-loader variant="dots"></kc-loader>
<kc-text-shimmer text="Generating response…"></kc-text-shimmer>
<kc-response-stream id="stream" speed="30"></kc-response-stream>
<kc-empty empty-title="No conversations yet" description="Start chatting to see them here.">
  <span slot="media">✦</span>
</kc-empty>

<script type="module">
  import '@kitn.ai/chat/elements';
  const stream = document.getElementById('stream');
  stream.text = 'This text reveals with a typewriter animation, character by character.';
  stream.addEventListener('complete', () => console.log('done'));
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
        <Spec tag="kc-loader" note="twelve loader styles">
          <div style={{ display: 'flex', gap: '24px', 'align-items': 'center', 'flex-wrap': 'wrap' }}>
            <kc-loader ref={(e) => (l1 = e)} />
            <kc-loader ref={(e) => (l2 = e)} />
            <kc-loader ref={(e) => (l3 = e)} />
            <kc-loader ref={(e) => (l4 = e)} />
            <kc-loader ref={(e) => (l5 = e)} />
          </div>
        </Spec>
        <Spec tag="kc-text-shimmer" note="animated shimmering text">
          <kc-text-shimmer ref={(e) => (shimmer = e)} />
        </Spec>
        <Spec tag="kc-response-stream" note='mode="typewriter" — emits complete'>
          <kc-response-stream ref={(e) => (stream = e)} />
        </Spec>
        <Spec tag="kc-empty" note="empty-state layout — media & default slots">
          <kc-empty ref={(e) => (empty = e)}>
            <span slot="media">✦</span>
          </kc-empty>
        </Spec>
      </Grid>
    );
  },
  parameters: { docs: { source: { code: STATUS_SNIPPET, language: 'html' } } },
};
