import { z } from 'zod';
import type { Tool } from './types';
import { Placement, Framework } from '../../types';
import type { Integration, Archetype } from '../../types';
import {
  getArchetype,
  getIntegration,
  listArchetypes,
  listIntegrations,
} from '../../registry';

/**
 * scaffold — the keystone tool. Composes a working chat surface from four axes:
 *
 *   useCase (archetype) × integration × placement × framework
 *
 * and emits three labeled blocks an AI consumer can paste straight in:
 *   (1) Front-end  — the archetype's kai-* components, rendered for the chosen
 *                    framework and sized for the placement, wired with the
 *                    `messages` property + `kai-submit` per the Streaming recipe.
 *   (2) Backend    — the integration's route template for the framework (with a
 *                    language-aware fallback when there's no exact match).
 *   (3) Run note   — how to run it + the env vars to set.
 *
 * The handler is called directly in tests (bypassing MCP's zod validation), so it
 * validates `useCase` + `integration` against the registry itself and returns
 * graceful, self-correcting error text when either is unknown.
 */

const text = (s: string) => ({
  content: [{ type: 'text' as const, text: s }],
});

// ── placement sizing ──────────────────────────────────────────────────────────

interface PlacementStyle {
  /** container style for an HTML/web-components wrapper */
  style: string;
  /** the chat element's own style — it must FILL the container */
  chatFill: string;
  /** one-line human description of the layout */
  note: string;
  /** optional extra comment lines describing an alternative layout form */
  altNote?: string;
}

// The chat element must fill its container. In a `display: flex; flex-direction:
// column` shell it's a flex child (`flex: 1; min-height: 0`); in a plain block
// container it fills via `height: 100%`.
const FLEX_FILL = 'flex: 1; min-height: 0;';
const BLOCK_FILL = 'height: 100%; width: 100%;';

function placementStyle(placement: string): PlacementStyle {
  switch (placement) {
    case 'full-page':
      return {
        style: 'height: 100dvh; width: 100%; display: flex; flex-direction: column;',
        chatFill: FLEX_FILL,
        note: 'fills the viewport (100dvh)',
      };
    case 'inline':
      return {
        style: 'width: 100%; max-width: 720px; height: 540px; margin: 0 auto; display: flex; flex-direction: column;',
        chatFill: FLEX_FILL,
        note: 'in-flow block (sized by parent, not fixed)',
      };
    case 'side':
      // A full-height side panel docked to the trailing (right) edge — overlays
      // content. messages/loading/suggestions are real kai-chat props.
      return {
        style:
          'position: fixed; top: 0; inset-inline-end: 0; height: 100dvh; width: 380px; ' +
          'border-inline-start: 1px solid var(--kai-color-border); display: flex; flex-direction: column; z-index: 1000;',
        chatFill: FLEX_FILL,
        note: 'full-height side panel, docked to the trailing edge (100dvh)',
        altNote:
          'In-flow alternative (push content instead of overlay): drop `position`/`z-index` and ' +
          'make this a `flex: 0 0 380px` column inside a `display: flex` row at `height: 100dvh`.',
      };
    case 'docked-widget':
      // The bottom-right floating bubble — rounded, elevated, fixed size.
      return {
        style:
          'position: fixed; bottom: 1.5rem; inset-inline-end: 1.5rem; width: 380px; height: 600px; ' +
          'max-height: calc(100dvh - 3rem); border-radius: 16px; overflow: hidden; ' +
          'box-shadow: 0 12px 32px var(--kai-shadow-color, rgba(0,0,0,0.18)); display: flex; flex-direction: column; z-index: 1000;',
        chatFill: FLEX_FILL,
        note: 'fixed, floating bottom-right widget',
      };
    default:
      // Unknown placement falls back to full-page (full height) rather than the bubble,
      // so a future Placement enum member doesn't silently render as a widget.
      return {
        style: 'height: 100dvh; width: 100%; display: flex; flex-direction: column;',
        chatFill: FLEX_FILL,
        note: 'fills the viewport (100dvh)',
      };
  }
}

// ── suggestions + mock streaming ───────────────────────────────────────────────

/** Default starter prompts so the suggestions feature always shows. */
const DEFAULT_SUGGESTIONS = ["What's new?", 'How can you help?'];

/** A canned assistant reply the mock integration streams back token-by-token. */
const MOCK_REPLY =
  "Hi! I'm a local preview — no backend or API key needed. Swap `integration` for a real provider (openrouter, ollama, …) and I'll talk to a real model.";

/** Render a string[] as a JS array literal (JSON-quoted — keeps apostrophes readable). */
function jsArray(items: string[]): string {
  return '[' + items.map((s) => JSON.stringify(s)).join(', ') + ']';
}

/**
 * The shared client-side mock stream body, parameterised by how each framework
 * commits a messages update. Two operations keep the contract correct:
 *   - `commitInitial(expr)` appends the user + empty-assistant pair.
 *   - `commitMap(mapBody)` replaces messages with `prev.map((m) => mapBody)` —
 *     each framework supplies how `prev` resolves (the React functional updater,
 *     or the live local variable for html/vue/svelte) so the streamed content is
 *     applied to the LATEST array, never a stale snapshot.
 * Each commit produces a NEW array (and a new object for the streamed message)
 * so kai-chat re-renders per chunk.
 *
 * Indented with `pad` so it drops cleanly into each framework's onSubmit.
 */
function mockStreamBody(opts: {
  pad: string;
  /** read the current messages array (for building `history`) */
  read: string;
  /** commit the initial user + empty-assistant pair */
  commitInitial: (expr: string) => string;
  /** commit a `prev.map(...)` update; `mapBody` is the body of `.map((m) => …)` */
  commitMap: (mapBody: string) => string;
  /** set loading true/false */
  setLoading: (v: 'true' | 'false') => string;
  /**
   * Emit `as const` on role literals so they narrow to 'user'|'assistant' under
   * strict TS. Set to true for TypeScript frameworks (react/next); false for
   * plain-JS contexts (html) where `as const` is invalid syntax.
   */
  strictRoles?: boolean;
}): string {
  const { pad, read, commitInitial, commitMap, setLoading, strictRoles = false } = opts;
  const asConst = strictRoles ? ' as const' : '';
  const mapBody = `(m.id === assistantId ? { ...m, content: answer } : m)`;
  return [
    `${pad}const value = e.detail.value.trim();`,
    `${pad}if (!value) return;`,
    `${pad}const history = [...${read}, { id: crypto.randomUUID(), role: 'user'${asConst}, content: value }];`,
    `${pad}const assistantId = crypto.randomUUID();`,
    `${pad}${commitInitial(`[...history, { id: assistantId, role: 'assistant'${asConst}, content: '' }]`)}`,
    `${pad}${setLoading('true')}`,
    `${pad}// No backend: stream a canned reply client-side, one token at a time.`,
    `${pad}const reply = ${JSON.stringify(MOCK_REPLY)};`,
    `${pad}const tokens = reply.split(/(\\s+)/);`,
    `${pad}let answer = '';`,
    `${pad}for (const tok of tokens) {`,
    `${pad}  await new Promise((r) => setTimeout(r, 24));`,
    `${pad}  answer += tok;`,
    `${pad}  // new array + object reference per chunk so kai-chat re-renders`,
    `${pad}  ${commitMap(mapBody)}`,
    `${pad}}`,
    `${pad}${setLoading('false')}`,
  ].join('\n');
}

// ── front-end rendering ───────────────────────────────────────────────────────

interface RenderCtx {
  p: PlacementStyle;
  emptyHint: string;
  suggestions: string[];
  /** mock = stream the reply client-side (no fetch, no backend, no key) */
  isMock: boolean;
}

/** The kai-* tags for the archetype, in order, as opening/closing markup. */
function componentTags(archetype: Archetype, chatFill: string): string {
  // kai-chat is the interactive root; companion components sit alongside it.
  // It FILLS its container — see chatFill (flex child / block).
  const hasCompanions = archetype.components.some((t) => t !== 'kai-chat');
  return [
    ...archetype.components.map((tag) =>
      tag === 'kai-chat'
        ? `  <${tag} id="chat" suggestion-mode="submit" style="${chatFill}"></${tag}>`
        : `  <${tag}></${tag}>`,
    ),
    ...(hasCompanions ? [`  <!-- wire data props — see the component_reference MCP tool -->`] : []),
  ].join('\n');
}

/** The HTML <script> wiring — mock streams client-side; everything else fetches /api/chat. */
function htmlWiring(ctx: RenderCtx): string {
  const head = [
    `  <script type="module">`,
    `    import '@kitn.ai/ui/elements';  // registers <kai-*> — required, must come first`,
    `    import '@kitn.ai/ui/theme.tokens.css';  // compiled token defaults; use theme.css only for Tailwind-source apps`,
    ``,
    `    const chat = document.getElementById('chat');`,
    `    // suggestions is a JS PROPERTY (arrays can't be HTML attributes)`,
    `    chat.suggestions = ${jsArray(ctx.suggestions)};`,
    `    chat.suggestionMode = 'submit';`,
    ``,
  ];

  if (ctx.isMock) {
    const body = mockStreamBody({
      pad: '      ',
      read: 'chat.messages',
      commitInitial: (expr) => `chat.messages = ${expr};`,
      // chat.messages is live (no React snapshot) — map over it directly
      commitMap: (mapBody) => `chat.messages = chat.messages.map((m) => ${mapBody});`,
      setLoading: (v) => `chat.loading = ${v};`,
    });
    return [
      ...head,
      `    // No backend: stream a canned reply client-side (no fetch, no API key).`,
      `    chat.addEventListener('kai-submit', async (e) => {`,
      body,
      `    });`,
      `  </script>`,
    ].join('\n');
  }

  return [
    ...head,
    `    chat.addEventListener('kai-submit', async (e) => {`,
    `      const value = e.detail.value.trim();`,
    `      if (!value) return;`,
    ``,
    `      // messages is a JS PROPERTY (objects can't be HTML attributes)`,
    `      const history = [...chat.messages, { id: crypto.randomUUID(), role: 'user', content: value }];`,
    `      const assistantId = crypto.randomUUID();`,
    `      chat.messages = [...history, { id: assistantId, role: 'assistant', content: '' }];`,
    `      chat.loading = true;`,
    ``,
    `      const res = await fetch('/api/chat', {`,
    `        method: 'POST',`,
    `        headers: { 'Content-Type': 'application/json' },`,
    `        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),`,
    `      });`,
    ``,
    `      // Read the OpenAI-format SSE and stream it into the assistant message.`,
    `      // This loop is the Streaming recipe — copy its exact body if you need keep-alive handling.`,
    `      const reader = res.body.getReader();`,
    `      const decoder = new TextDecoder();`,
    `      let buffer = '', answer = '';`,
    `      while (true) {`,
    `        const { value: chunk, done } = await reader.read();`,
    `        if (done) break;`,
    `        buffer += decoder.decode(chunk, { stream: true });`,
    `        const lines = buffer.split('\\n');`,
    `        buffer = lines.pop();`,
    `        for (const line of lines) {`,
    `          const s = line.trim();`,
    `          if (!s.startsWith('data:')) continue;`,
    `          const payload = s.slice(5).trim();`,
    `          if (payload === '[DONE]') continue;`,
    `          try {`,
    `            const delta = JSON.parse(payload).choices?.[0]?.delta?.content;`,
    `            if (!delta) continue;`,
    `            answer += delta;`,
    `            chat.messages = chat.messages.map((m) => (m.id === assistantId ? { ...m, content: answer } : m));`,
    `          } catch { /* skip keep-alive lines */ }`,
    `        }`,
    `      }`,
    `      chat.loading = false;`,
    `    });`,
    `  </script>`,
  ].join('\n');
}

function renderHtml(archetype: Archetype, ctx: RenderCtx): string {
  const { p, emptyHint } = ctx;
  return [
    `<!-- ${archetype.title} — ${p.note} -->`,
    ...(p.altNote ? [`<!-- ${p.altNote} -->`] : []),
    `<div style="${p.style}">`,
    componentTags(archetype, p.chatFill),
    `</div>`,
    ``,
    htmlWiring(ctx),
    ``,
    `  <!-- empty-state hint: ${emptyHint} -->`,
  ].join('\n');
}

/** Convert a kebab-case custom-element tag to its PascalCase React wrapper name. */
function toPascalCase(tag: string): string {
  // e.g. "kai-chat" → "Chat", "kai-sources" → "Sources"
  return tag
    .replace(/^kai-/, '')
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** JSX usage for react/next: uses the official @kitn.ai/ui/react wrappers. */
function renderJsx(archetype: Archetype, ctx: RenderCtx, framework: string): string {
  const { p, emptyHint, suggestions, isMock } = ctx;
  // Collect all PascalCase wrapper names for this archetype's components.
  const wrapperNames = archetype.components.map(toPascalCase);
  const importList = wrapperNames.join(', ');

  const companionTags = archetype.components.filter((t) => t !== 'kai-chat');
  const companions = [
    ...(companionTags.length > 0 ? [`      {/* wire data props — see the component_reference MCP tool */}`] : []),
    ...companionTags.map((t) => `      <${toPascalCase(t)} />`),
  ].join('\n');

  // SCAF-4: Inline ChatMessage type for strict-TS consumers; avoids implicit-any on useState/handler.
  const chatMessageType = `type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };`;

  // onSubmit body: mock streams a canned reply client-side; otherwise fetch /api/chat.
  const onSubmitBody = isMock
    ? mockStreamBody({
        pad: '    ',
        read: 'messages',
        commitInitial: (expr) => `setMessages(${expr});`,
        // functional updater so each token maps over the LATEST array, not the snapshot
        commitMap: (mapBody) => `setMessages((prev) => prev.map((m) => ${mapBody}));`,
        setLoading: (v) => `setLoading(${v});`,
        strictRoles: true,
      })
    : [
        `    const value = e.detail.value.trim();`,
        `    if (!value) return;`,
        `    const history: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user' as const, content: value }];`,
        `    const assistantId = crypto.randomUUID();`,
        `    setMessages([...history, { id: assistantId, role: 'assistant' as const, content: '' }]);`,
        `    setLoading(true);`,
        `    const res = await fetch('/api/chat', {`,
        `      method: 'POST',`,
        `      headers: { 'Content-Type': 'application/json' },`,
        `      body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),`,
        `    });`,
        `    // Stream the OpenAI-format SSE into the assistant message — see the Streaming recipe.`,
        `    const reader = res.body!.getReader();`,
        `    const decoder = new TextDecoder();`,
        `    let buffer = '', answer = '';`,
        `    while (true) {`,
        `      const { value: chunk, done } = await reader.read();`,
        `      if (done) break;`,
        `      buffer += decoder.decode(chunk, { stream: true });`,
        `      const lines = buffer.split('\\n');`,
        `      buffer = lines.pop()!;`,
        `      for (const line of lines) {`,
        `        const s = line.trim();`,
        `        if (!s.startsWith('data:')) continue;`,
        `        const payload = s.slice(5).trim();`,
        `        if (payload === '[DONE]') continue;`,
        `        try {`,
        `          const delta = JSON.parse(payload).choices?.[0]?.delta?.content;`,
        `          if (!delta) continue;`,
        `          answer += delta;`,
        `          setMessages((ms) => ms.map((m) => (m.id === assistantId ? { ...m, content: answer } : m)));`,
        `        } catch { /* skip keep-alives */ }`,
        `      }`,
        `    }`,
        `    setLoading(false);`,
      ].join('\n');

  // SCAF-2: Next.js App Router requires 'use client' for components that use hooks/interactivity.
  const useClientDirective = framework === 'next' ? [`'use client';`, ``] : [];

  // SCAF-6: For Next.js ONLY — use next/dynamic with { ssr: false } so the elements
  // bundle (which calls delegateEvents(events, doc = window.document) at module-eval)
  // never runs on the server during prerender → avoids "window is not defined" crash.
  // Plain `react` (Vite) has no SSR and keeps the top-level imports unchanged.
  if (framework === 'next') {
    // Build dynamic() calls for every wrapper in the archetype.
    const dynamicImports = wrapperNames.map(
      (name) =>
        `const ${name} = dynamic(() => import('@kitn.ai/ui/react').then((m) => m.${name}), { ssr: false });`,
    );

    // SCAF-2: Next.js transpilePackages note.
    const nextConfigNote = [
      `// Next.js note: if you get "unknown module type" or TS errors inside @kitn.ai/ui,`,
      `// add transpilePackages: ['@kitn.ai/ui'] to next.config.ts (needed until the`,
      `// package ships prebuilt JS on its "." and "./react" exports).`,
      ``,
    ];

    return [
      // 'use client' must be the very first line for Next.js App Router.
      ...useClientDirective,
      `import { useState } from 'react';`,
      `import dynamic from 'next/dynamic';`,
      `import '@kitn.ai/ui/theme.tokens.css';  // compiled token defaults; use theme.css only for Tailwind-source apps`,
      `// kai-* bundle Solid's client runtime → load client-only so SSR/prerender doesn't crash`,
      ...dynamicImports,
      ``,
      ...nextConfigNote,
      `// ${archetype.title} — ${p.note}. empty-state hint: ${emptyHint}`,
      ...(p.altNote ? [`// ${p.altNote}`] : []),
      chatMessageType,
      ``,
      `export default function App() {`,
      `  const [messages, setMessages] = useState<ChatMessage[]>([]);`,
      `  const [loading, setLoading] = useState(false);`,
      `  const suggestions = ${jsArray(suggestions)};`,
      ``,
      `  async function onSubmit(e: CustomEvent<{ value: string }>) {`,
      onSubmitBody,
      `  }`,
      ``,
      `  return (`,
      `    <div style={{ ${jsxStyle(p.style)} }}>`,
      `      <Chat`,
      `        messages={messages}`,
      `        loading={loading}`,
      `        suggestions={suggestions}`,
      `        suggestionMode="submit"`,
      `        onSubmit={onSubmit}`,
      `        style={{ ${jsxStyle(p.chatFill)} }}`,
      `      />`,
      companions,
      `    </div>`,
      `  );`,
      `}`,
    ]
      .filter((l) => l !== '')
      .join('\n');
  }

  // SCAF-2: Next.js transpilePackages note (needed until @kitn.ai/ui ships prebuilt JS on "." + "./react").
  const nextConfigNote: string[] = [];

  return [
    // SCAF-2: 'use client' must be the very first line for Next.js App Router.
    ...useClientDirective,
    // (1) REQUIRED: registers <kai-*> — the react wrappers do NOT auto-register.
    // Must come BEFORE importing the wrappers, or <kai-chat> renders empty.
    `import '@kitn.ai/ui/elements';  // registers <kai-*> — required, must come first`,
    `import { useState } from 'react';`,
    `import { ${importList} } from '@kitn.ai/ui/react';`,
    `import '@kitn.ai/ui/theme.tokens.css';  // compiled token defaults; use theme.css only for Tailwind-source apps`,
    ``,
    ...nextConfigNote,
    `// ${archetype.title} — ${p.note}. empty-state hint: ${emptyHint}`,
    ...(p.altNote ? [`// ${p.altNote}`] : []),
    chatMessageType,
    ``,
    `export default function App() {`,
    `  const [messages, setMessages] = useState<ChatMessage[]>([]);`,
    `  const [loading, setLoading] = useState(false);`,
    `  const suggestions = ${jsArray(suggestions)};`,
    ``,
    `  async function onSubmit(e: CustomEvent<{ value: string }>) {`,
    onSubmitBody,
    `  }`,
    ``,
    `  return (`,
    `    <div style={{ ${jsxStyle(p.style)} }}>`,
    `      <Chat`,
    `        messages={messages}`,
    `        loading={loading}`,
    `        suggestions={suggestions}`,
    `        suggestionMode="submit"`,
    `        onSubmit={onSubmit}`,
    `        style={{ ${jsxStyle(p.chatFill)} }}`,
    `      />`,
    companions,
    `    </div>`,
    `  );`,
    `}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Vue: bind messages/suggestions as properties, listen for kai-submit with @. */
function renderVue(archetype: Archetype, ctx: RenderCtx): string {
  const { p, emptyHint, suggestions, isMock } = ctx;
  const companionTags = archetype.components.filter((t) => t !== 'kai-chat');
  const companions = [
    ...(companionTags.length > 0 ? [`    <!-- wire data props — see the component_reference MCP tool -->`] : []),
    ...companionTags.map((t) => `    <${t} />`),
  ].join('\n');

  const onSubmitBody = isMock
    ? mockStreamBody({
        pad: '    ',
        read: 'messages.value',
        commitInitial: (expr) => `messages.value = ${expr};`,
        // messages.value is live — map over it directly
        commitMap: (mapBody) => `messages.value = messages.value.map((m) => ${mapBody});`,
        setLoading: (v) => `loading.value = ${v};`,
      })
    : [
        `    const value = e.detail.value.trim();`,
        `    if (!value) return;`,
        `    const history = [...messages.value, { id: crypto.randomUUID(), role: 'user', content: value }];`,
        `    const assistantId = crypto.randomUUID();`,
        `    messages.value = [...history, { id: assistantId, role: 'assistant', content: '' }];`,
        `    loading.value = true;`,
        `    // POST { messages } to /api/chat, then stream the OpenAI-format SSE into the`,
        `    // assistant message (reassign messages.value per chunk) — see the Streaming recipe.`,
      ].join('\n');

  return [
    `<!-- vue — ${archetype.title} — ${p.note}. empty-state hint: ${emptyHint} -->`,
    ...(p.altNote ? [`<!-- ${p.altNote} -->`] : []),
    `<!-- SCAF-3: vite.config.ts — tell Vue that kai-* are custom elements (not Vue components).`,
    `     Without this, Vue warns "Unknown custom element" and .prop bindings may misbehave.`,
    `     import vue from '@vitejs/plugin-vue';`,
    `     export default { plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('kai-') } } })] }; -->`,
    `<script setup>`,
    `import '@kitn.ai/ui/elements';  // registers <kai-*> — required, must come first`,
    `import '@kitn.ai/ui/theme.tokens.css';  // compiled token defaults; use theme.css only for Tailwind-source apps`,
    `import { ref } from 'vue';`,
    ``,
    `const messages = ref([]);`,
    `const loading = ref(false);`,
    `const suggestions = ${jsArray(suggestions)};`,
    ``,
    `async function onSubmit(e) {`,
    onSubmitBody,
    `}`,
    `</script>`,
    ``,
    `<template>`,
    `  <div style="${p.style}">`,
    `    <kai-chat`,
    `      :messages="messages"`,
    `      :loading="loading"`,
    `      :suggestions="suggestions"`,
    `      suggestion-mode="submit"`,
    `      style="${p.chatFill}"`,
    `      @kai-submit="onSubmit"`,
    `    ></kai-chat>`,
    companions,
    `  </div>`,
    `</template>`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Svelte: use bind:this to set array/object properties reactively; on:kai-submit for the event. */
function renderSvelte(archetype: Archetype, ctx: RenderCtx): string {
  const { p, emptyHint, suggestions, isMock } = ctx;
  const companionTags = archetype.components.filter((t) => t !== 'kai-chat');
  const companionLines = [
    ...(companionTags.length > 0 ? [`  <!-- wire data props — see the component_reference MCP tool -->`] : []),
    ...companionTags.map((t) => `  <${t}></${t}>`),
  ].join('\n');

  const onSubmitBody = isMock
    ? mockStreamBody({
        pad: '    ',
        read: 'messages',
        commitInitial: (expr) => `messages = ${expr};`,
        // `messages` is a live local — reassign to map over the latest array
        commitMap: (mapBody) => `messages = messages.map((m) => ${mapBody});`,
        setLoading: (v) => `loading = ${v};`,
      })
    : [
        `    const value = e.detail.value.trim();`,
        `    if (!value) return;`,
        `    const history = [...messages, { id: crypto.randomUUID(), role: 'user', content: value }];`,
        `    const assistantId = crypto.randomUUID();`,
        `    messages = [...history, { id: assistantId, role: 'assistant', content: '' }];`,
        `    loading = true;`,
        `    const res = await fetch('/api/chat', {`,
        `      method: 'POST',`,
        `      headers: { 'Content-Type': 'application/json' },`,
        `      body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),`,
        `    });`,
        `    // Stream the OpenAI-format SSE into the assistant message — see the Streaming recipe.`,
        `    const reader = res.body.getReader();`,
        `    const decoder = new TextDecoder();`,
        `    let buffer = '', answer = '';`,
        `    while (true) {`,
        `      const { value: chunk, done } = await reader.read();`,
        `      if (done) break;`,
        `      buffer += decoder.decode(chunk, { stream: true });`,
        `      const lines = buffer.split('\\n');`,
        `      buffer = lines.pop();`,
        `      for (const line of lines) {`,
        `        const s = line.trim();`,
        `        if (!s.startsWith('data:')) continue;`,
        `        const payload = s.slice(5).trim();`,
        `        if (payload === '[DONE]') continue;`,
        `        try {`,
        `          const delta = JSON.parse(payload).choices?.[0]?.delta?.content;`,
        `          if (!delta) continue;`,
        `          answer += delta;`,
        `          messages = messages.map((m) => (m.id === assistantId ? { ...m, content: answer } : m));`,
        `        } catch { /* skip keep-alives */ }`,
        `      }`,
        `    }`,
        `    loading = false;`,
      ].join('\n');

  return [
    `<!-- svelte — ${archetype.title} — ${p.note}. empty-state hint: ${emptyHint} -->`,
    ...(p.altNote ? [`<!-- ${p.altNote} -->`] : []),
    `<!-- SCAF-5: This uses Svelte-4 syntax ($:, on:event). Works in Svelte 5 via legacy mode;`,
    `     runes-mode users should adapt to $state/$effect and onkai-submit event handlers. -->`,
    `<script>`,
    `  import '@kitn.ai/ui/elements';  // registers <kai-*> — required, must come first`,
    `  import '@kitn.ai/ui/theme.tokens.css';  // compiled token defaults; use theme.css only for Tailwind-source apps`,
    `  let chatEl;`,
    `  let messages = [];`,
    `  let loading = false;`,
    `  const suggestions = ${jsArray(suggestions)};`,
    `  // suggestions/messages are JS PROPERTIES (arrays/objects can't be attributes)`,
    `  $: if (chatEl) { chatEl.messages = messages; chatEl.loading = loading; chatEl.suggestions = suggestions; }`,
    ``,
    `  async function onSubmit(e) {`,
    onSubmitBody,
    `  }`,
    `</script>`,
    ``,
    `<div style="${p.style}">`,
    `  <kai-chat bind:this={chatEl} suggestion-mode="submit" style="${p.chatFill}" on:kai-submit={onSubmit}></kai-chat>`,
    companionLines,
    `</div>`,
  ]
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === '' && i === arr.length - 1))
    .join('\n');
}

/** Translate an inline CSS string into JSX style-object entries. */
function jsxStyle(style: string): string {
  return style
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const [prop, ...rest] = d.split(':');
      const camel = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return `${camel}: '${rest.join(':').trim()}'`;
    })
    .join(', ');
}

function renderFrontend(
  framework: string,
  archetype: Archetype,
  placement: string,
  emptyHint: string,
  suggestions: string[],
  isMock: boolean,
): string {
  const ctx: RenderCtx = { p: placementStyle(placement), emptyHint, suggestions, isMock };
  switch (framework) {
    case 'react':
    case 'next':
      return renderJsx(archetype, ctx, framework);
    case 'vue':
      return renderVue(archetype, ctx);
    case 'svelte':
      return renderSvelte(archetype, ctx);
    case 'html':
    default:
      // html, and any backend-only framework (fastapi/express/worker) gets the
      // framework-agnostic web-components surface.
      return renderHtml(archetype, ctx);
  }
}

// ── backend route selection (with language-aware fallback) ─────────────────────

interface RouteChoice {
  framework: string;
  template: string;
  runtime: string;
  exact: boolean;
}

const RUNTIME_LABEL: Record<string, string> = {
  next: 'Next.js route handler (Node/Edge)',
  express: 'Express handler (Node)',
  worker: 'Cloudflare Worker',
  fastapi: 'FastAPI (Python)',
  html: 'browser-direct (no server route)',
};

/** Prefer the language's canonical server framework when there's no exact match. */
function preferredKeyFor(integration: Integration): string[] {
  return integration.language === 'python'
    ? ['fastapi']
    : ['next', 'express', 'worker'];
}

function chooseRoute(integration: Integration, framework: string): RouteChoice | undefined {
  const templates = integration.routeTemplates;

  // 1. exact match
  if (templates[framework]) {
    return { framework, template: templates[framework], runtime: RUNTIME_LABEL[framework] ?? framework, exact: true };
  }

  // 2. language-canonical fallback (python → fastapi; ts → next/express/worker)
  for (const key of preferredKeyFor(integration)) {
    if (templates[key]) {
      return { framework: key, template: templates[key], runtime: RUNTIME_LABEL[key] ?? key, exact: false };
    }
  }

  // 3. anything usable that isn't a pure front-end snippet
  for (const [key, template] of Object.entries(templates)) {
    if (key === 'html') continue;
    return { framework: key, template, runtime: RUNTIME_LABEL[key] ?? key, exact: false };
  }

  return undefined;
}

// ── compose ───────────────────────────────────────────────────────────────────

function compose(
  archetype: Archetype,
  integration: Integration,
  placement: string,
  framework: string,
  suggestions: string[],
  audience?: string,
): string {
  const audienceHint = audience
    ? `tuned for ${audience} — keep the empty state and tone audience-appropriate`
    : 'add an empty-state prompt that fits your product';

  const isMock = integration.id === 'mock';
  const frontend = renderFrontend(framework, archetype, placement, audienceHint, suggestions, isMock);
  const route = isMock ? undefined : chooseRoute(integration, framework);

  const header = [
    `# AI/UI scaffold — ${archetype.title} × ${integration.title}`,
    `combo: ${archetype.id} × ${integration.id} × ${placement} × ${framework}`,
    `stream: ${integration.streamMapping}`,
  ].join('\n');

  const block1 = [
    `=== (1) FRONT-END (${framework}, ${placementStyle(placement).note}) ===`,
    ``,
    frontend,
  ].join('\n');

  const block2Parts: string[] = [`=== (2) BACKEND ROUTE ===`, ``];
  if (isMock) {
    // The mock integration has no backend — the front-end streams locally.
    block2Parts.push(
      `# No backend or API key needed — replies stream locally for preview (see the`,
      `# front-end onSubmit above). Swap \`integration\` for a real provider (openrouter,`,
      `# ollama, vercel-ai-sdk, …) when ready, and this block becomes its route handler.`,
    );
  } else if (route) {
    if (!route.exact) {
      block2Parts.push(
        `# Note: ${integration.title} has no template for "${framework}". Emitting its native`,
        `# ${route.runtime} route instead (matches the integration's ${integration.language} language).`,
      );
      // Honest warning: a Next.js/server route will NOT run inside a Vite SPA.
      if (framework === 'react') {
        block2Parts.push(
          `#`,
          `# WARNING: this is a Next.js route handler — it will NOT run in a Vite SPA`,
          `# (a Vite \`react\` app has no /api routes). To make the front-end above work, either:`,
          `#   • use Next.js (framework: "next"), or`,
          `#   • add a Vite dev-server middleware/proxy to a server, or`,
          `#   • run a separate server (framework: "express" | "worker"), or`,
          `#   • use integration: "mock" for a zero-config local stream (no backend, no key).`,
        );
      }
      block2Parts.push(``);
    } else {
      block2Parts.push(`# Runtime: ${route.runtime}`, ``);
    }
    block2Parts.push(route.template);
  } else {
    block2Parts.push(
      `# ${integration.title} ships no usable backend route template. See its docs`,
      `# (${integration.docsSlug}) — wire the route by hand following the streamMapping above.`,
    );
  }
  const block2 = block2Parts.join('\n');

  const envLines = integration.envVars.length
    ? integration.envVars.map((v) => `  - ${v}`).join('\n')
    : '  (none)';
  const block3 = [
    `=== (3) RUN NOTE ===`,
    ``,
    integration.runNote,
    ``,
    `Env vars to set:`,
    envLines,
  ].join('\n');

  return [header, block1, block2, block3].join('\n\n');
}

// ── error text ────────────────────────────────────────────────────────────────

function rejectIntegration(id: string): string {
  const valid = listIntegrations()
    .map((i) => `${i.id} (${i.title})`)
    .join(', ');
  return [
    `Unknown integration: "${id}".`,
    ``,
    `Valid integrations: ${valid}.`,
    `Pick one of those ids and call scaffold again.`,
  ].join('\n');
}

function rejectUseCase(id: string): string {
  const valid = listArchetypes()
    .map((a) => `${a.id} (${a.title})`)
    .join(', ');
  return [
    `Unknown useCase: "${id}".`,
    ``,
    `Valid useCases (archetypes): ${valid}.`,
    `Pick one of those ids and call scaffold again.`,
  ].join('\n');
}

// ── tool ──────────────────────────────────────────────────────────────────────

export const scaffold: Tool = {
  name: 'scaffold',
  description:
    'Scaffold a working AI/UI chat surface from four axes: useCase (archetype) × integration × placement × framework. ' +
    'Emits a copy-pasteable front-end (kai-* components wired with messages + kai-submit + starter suggestions), the backend ' +
    'route for the chosen framework, and a run note with env vars. Use integration: "mock" for a zero-config local preview.',
  inputSchema: z.object({
    // useCase + integration are dynamic catalog ids — kept as strings and
    // validated against the registry in the handler (the handler is called
    // directly in tests, bypassing this schema). Use component_reference / the
    // catalogs to discover valid ids.
    useCase: z
      .string()
      .describe(
        'Archetype id, e.g. "drop-in-chat", "support-widget", "knowledge-base", "agentic", "workspace", "voice".',
      ),
    integration: z
      .string()
      .describe(
        'Backend integration id, e.g. "openrouter", "vercel-ai-sdk", "langgraph", "cloudflare", "ollama", "mastra", "pi", "pydantic-ai".',
      ),
    placement: Placement.describe(
      'Where the surface lives: full-page | side | docked-widget | inline.',
    ),
    framework: Framework.describe(
      'Target front-end/back-end framework: html | react | next | vue | svelte | fastapi | express | worker.',
    ),
    suggestions: z
      .array(z.string())
      .optional()
      .describe(
        'Optional starter prompts shown above the input when the thread is empty (real kai-chat prop). ' +
          'Defaults to a generic pair if omitted so the feature always shows.',
      ),
    audience: z
      .string()
      .optional()
      .describe('Optional audience hint (tweaks the empty-state comment only).'),
  }),
  handler: async (args) => {
    const useCase = String(args.useCase ?? '');
    const integrationId = String(args.integration ?? '');
    const placement = String(args.placement ?? '');
    const framework = String(args.framework ?? 'html');
    const audience = args.audience ? String(args.audience) : undefined;
    // Default the suggestions so the feature always shows; honour a passed array.
    const suggestions =
      Array.isArray(args.suggestions) && args.suggestions.length > 0
        ? args.suggestions.map(String)
        : DEFAULT_SUGGESTIONS;

    // Validate against the registry BEFORE composing — graceful, self-correcting text.
    const archetype = getArchetype(useCase);
    if (!archetype) return text(rejectUseCase(useCase));

    const integration = getIntegration(integrationId);
    if (!integration) return text(rejectIntegration(integrationId));

    // Fall back to the archetype's default placement only if none was provided.
    const effectivePlacement = placement || archetype.defaultPlacement;

    return text(compose(archetype, integration, effectivePlacement, framework, suggestions, audience));
  },
};
