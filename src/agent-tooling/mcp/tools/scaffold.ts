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
  /** one-line human description of the layout */
  note: string;
}

function placementStyle(placement: string): PlacementStyle {
  switch (placement) {
    case 'full-page':
      return {
        style: 'height: 100dvh; width: 100%; display: flex; flex-direction: column;',
        note: 'fills the viewport (100dvh)',
      };
    case 'inline':
      return {
        style: 'width: 100%; max-width: 720px; height: 540px; margin: 0 auto;',
        note: 'in-flow block (sized, not fixed)',
      };
    case 'side':
    case 'docked-widget':
    default:
      return {
        style:
          'position: fixed; bottom: 1.5rem; right: 1.5rem; width: 380px; height: 600px; max-height: calc(100dvh - 3rem); z-index: 1000;',
        note: 'fixed, docked bottom-right widget',
      };
  }
}

// ── front-end rendering ───────────────────────────────────────────────────────

/** The kai-* tags for the archetype, in order, as opening/closing markup. */
function componentTags(archetype: Archetype): string {
  // kai-chat is the interactive root; companion components sit alongside it.
  return archetype.components
    .map((tag) =>
      tag === 'kai-chat'
        ? `  <${tag} id="chat"></${tag}>`
        : `  <${tag}></${tag}>`,
    )
    .join('\n');
}

const HTML_WIRING = `  <script type="module">
    import '@kitn.ai/ui/elements';
    import '@kitn.ai/ui/theme.css';

    const chat = document.getElementById('chat');

    chat.addEventListener('kai-submit', async (e) => {
      const value = e.detail.value.trim();
      if (!value) return;

      // messages is a JS PROPERTY (objects can't be HTML attributes)
      const history = [...chat.messages, { id: crypto.randomUUID(), role: 'user', content: value }];
      const assistantId = crypto.randomUUID();
      chat.messages = [...history, { id: assistantId, role: 'assistant', content: '' }];
      chat.loading = true;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map((m) => ({ role: m.role, content: m.content })) }),
      });

      // Read the OpenAI-format SSE and stream it into the assistant message.
      // This loop is the Streaming recipe — copy its exact body if you need keep-alive handling.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', answer = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\\n');
        buffer = lines.pop();
        for (const line of lines) {
          const s = line.trim();
          if (!s.startsWith('data:')) continue;
          const payload = s.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const delta = JSON.parse(payload).choices?.[0]?.delta?.content;
            if (!delta) continue;
            answer += delta;
            chat.messages = chat.messages.map((m) => (m.id === assistantId ? { ...m, content: answer } : m));
          } catch { /* skip keep-alive lines */ }
        }
      }
      chat.loading = false;
    });
  </script>`;

function renderHtml(archetype: Archetype, p: PlacementStyle, emptyHint: string): string {
  return [
    `<!-- ${archetype.title} — ${p.note} -->`,
    `<div style="${p.style}">`,
    componentTags(archetype),
    `</div>`,
    ``,
    HTML_WIRING,
    ``,
    `  <!-- empty-state hint: ${emptyHint} -->`,
  ].join('\n');
}

/** JSX usage for react/next: messages bound as a prop, onKai-submit handler. */
function renderJsx(archetype: Archetype, p: PlacementStyle, emptyHint: string): string {
  const companions = archetype.components
    .filter((t) => t !== 'kai-chat')
    .map((t) => `      <${t} />`)
    .join('\n');

  return [
    `import { useRef, useState } from 'react';`,
    `import '@kitn.ai/ui/elements';`,
    `import '@kitn.ai/ui/theme.css';`,
    ``,
    `// ${archetype.title} — ${p.note}. empty-state hint: ${emptyHint}`,
    `export default function Chat() {`,
    `  const ref = useRef(null);`,
    `  const [messages, setMessages] = useState([]);`,
    ``,
    `  async function onSubmit(e) {`,
    `    const value = e.detail.value.trim();`,
    `    if (!value) return;`,
    `    const history = [...messages, { id: crypto.randomUUID(), role: 'user', content: value }];`,
    `    const assistantId = crypto.randomUUID();`,
    `    setMessages([...history, { id: assistantId, role: 'assistant', content: '' }]);`,
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
    `          setMessages((ms) => ms.map((m) => (m.id === assistantId ? { ...m, content: answer } : m)));`,
    `        } catch { /* skip keep-alives */ }`,
    `      }`,
    `    }`,
    `  }`,
    ``,
    `  // messages is set in JavaScript as a property; React forwards it via the ref-bound element.`,
    `  return (`,
    `    <div style={{ ${jsxStyle(p.style)} }}>`,
    `      <kai-chat ref={ref} messages={messages} onKai-submit={onSubmit}></kai-chat>`,
    companions,
    `    </div>`,
    `  );`,
    `}`,
  ]
    .filter((l) => l !== '')
    .join('\n');
}

/** Vue/Svelte share a minimal pattern: bind messages as a property, listen for kai-submit. */
function renderVueSvelte(
  framework: string,
  archetype: Archetype,
  p: PlacementStyle,
  emptyHint: string,
): string {
  const bind = framework === 'svelte' ? 'bind: .messages' : ':messages';
  const listen = framework === 'svelte' ? 'on:kai-submit' : '@kai-submit';
  const companions = archetype.components
    .filter((t) => t !== 'kai-chat')
    .map((t) => `    <${t} />`)
    .join('\n');

  return [
    `<!-- ${framework} — ${archetype.title} — ${p.note}. empty-state hint: ${emptyHint} -->`,
    `<!-- import '@kitn.ai/ui/elements' and '@kitn.ai/ui/theme.css' once at app entry. -->`,
    `<div style="${p.style}">`,
    `  <kai-chat ${bind}="messages" ${listen}="onSubmit"></kai-chat>`,
    companions,
    `</div>`,
    ``,
    `<!--`,
    `  onSubmit(e): append { role:'user', content:e.detail.value } to messages,`,
    `  push an empty { role:'assistant', content:'' }, POST { messages } to /api/chat,`,
    `  then stream the OpenAI-format SSE into the assistant message — see the Streaming recipe.`,
    `  messages is a property (objects can't be attributes); reassign it to re-render.`,
    `-->`,
  ].join('\n');
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
): string {
  const p = placementStyle(placement);
  switch (framework) {
    case 'react':
    case 'next':
      return renderJsx(archetype, p, emptyHint);
    case 'vue':
    case 'svelte':
      return renderVueSvelte(framework, archetype, p, emptyHint);
    case 'html':
    default:
      // html, and any backend-only framework (fastapi/express/worker) gets the
      // framework-agnostic web-components surface.
      return renderHtml(archetype, p, emptyHint);
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

function compose(archetype: Archetype, integration: Integration, placement: string, framework: string, audience?: string): string {
  const audienceHint = audience
    ? `tuned for ${audience} — keep the empty state and tone audience-appropriate`
    : 'add an empty-state prompt that fits your product';

  const frontend = renderFrontend(framework, archetype, placement, audienceHint);
  const route = chooseRoute(integration, framework);

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
  if (route) {
    if (!route.exact) {
      block2Parts.push(
        `# Note: ${integration.title} has no template for "${framework}". Emitting its native`,
        `# ${route.runtime} route instead (matches the integration's ${integration.language} language).`,
        ``,
      );
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
    'Emits a copy-pasteable front-end (kai-* components wired with messages + kai-submit), the backend route for the chosen ' +
    'framework, and a run note with env vars.',
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

    // Validate against the registry BEFORE composing — graceful, self-correcting text.
    const archetype = getArchetype(useCase);
    if (!archetype) return text(rejectUseCase(useCase));

    const integration = getIntegration(integrationId);
    if (!integration) return text(rejectIntegration(integrationId));

    // Fall back to the archetype's default placement only if none was provided.
    const effectivePlacement = placement || archetype.defaultPlacement;

    return text(compose(archetype, integration, effectivePlacement, framework, audience));
  },
};
