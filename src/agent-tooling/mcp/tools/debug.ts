import { z } from 'zod';
import type { Tool } from './types';

/**
 * debug — diagnose common AI/UI (kai-*) integration failures.
 *
 * Given a `symptom` (prose) and/or a `snippet` (code), returns the likely
 * cause + fix for the classic `kai-*` failure modes so a harness can
 * self-correct without a human in the loop.
 *
 * Rule set sourced from:
 *  - docs-site/src/content/docs/guides/for-ai-agents.mdx §"What agents most commonly get wrong"
 *  - context7.json `rules` array (5 contract rules)
 */

interface Rule {
  id: string;
  test: (text: string) => boolean;
  title: string;
  cause: string;
  fix: string;
}

const RULES: Rule[] = [
  {
    // Rule 1 — array/object data set as an HTML attribute
    // Source: for-ai-agents.mdx §1; context7.json rule 2
    id: 'array-as-attribute',
    test: (t) =>
      /\b(messages|models|context|suggestions|slashCommands)\s*=\s*["']/.test(t),
    title: 'Array/object prop set as an HTML attribute (silent failure)',
    cause:
      'An HTML attribute is always a string. Passing `messages`, `models`, `context`, ' +
      '`suggestions`, or `slashCommands` as an HTML attribute silently fails — ' +
      'the element receives a stringified value it cannot parse.',
    fix:
      'Set the property in JavaScript, not as an HTML attribute. ' +
      'Only scalar props (`placeholder`, `loading`, `theme`) work as attributes.\n\n' +
      '```js\n' +
      "// ✅ Works — set messages in JavaScript as a property\n" +
      "const chat = document.querySelector('kai-chat');\n" +
      "chat.messages = [{ id: '1', role: 'assistant', content: 'Hello!' }];\n" +
      '```\n\n' +
      '```html\n' +
      '<!-- ❌ Fails — messages cannot be an HTML attribute -->\n' +
      '<kai-chat messages="[...]"></kai-chat>\n' +
      '```',
  },
  {
    // Rule 2 — in-place mutation → no re-render
    // Source: for-ai-agents.mdx §3; context7.json rule 4
    id: 'in-place-mutation',
    test: (t) =>
      /don'?t\s+update|doesn'?t\s+re.?render|no\s+re.?render|\.push\(|\bpush(?:es|ing)?\s+(?:to|into|onto)\b|mutate|in.place/.test(t),
    title: 'In-place mutation does not trigger a re-render',
    cause:
      'Mutating an existing message object or array in place (e.g. `chat.messages.push(…)` ' +
      'or `chat.messages[i].content = …`) does not trigger a re-render. ' +
      'The element only reacts when it detects a new array/object reference.',
    fix:
      'Assign a NEW array (and a new object) on every change — never mutate in place.\n\n' +
      '```js\n' +
      '// ✅ Triggers re-render — new array + new object reference\n' +
      'chat.messages = [\n' +
      '  ...chat.messages,\n' +
      "  { id: crypto.randomUUID(), role: 'user', content: userText },\n" +
      '];\n\n' +
      '// ✅ During streaming — replace with a new array + new object on every chunk\n' +
      'chat.messages = chat.messages.map((m) =>\n' +
      '  m.id === assistantId ? { ...m, content: accumulated } : m\n' +
      ');\n\n' +
      '// ❌ Does NOT trigger re-render\n' +
      'chat.messages.push(newMsg);\n' +
      'chat.messages[i].content = accumulated;\n' +
      '```',
  },
  {
    // Rule 3 — listening for events on a parent / wrong element
    // Source: for-ai-agents.mdx §2; context7.json rule 3
    id: 'event-bubbling',
    test: (t) =>
      /event.*not\s+fir|not\s+fir.*event|listen.*document|document.*listen|listen.*parent|parent.*listen|event.*bubbl/i.test(
        t,
      ),
    title: 'Listening for events on the wrong element (events are non-bubbling)',
    cause:
      '`kai-*` events are non-bubbling CustomEvents. Adding a listener to `document`, ' +
      '`window`, or a parent container will never fire because the event does not bubble up.',
    fix:
      'Listen directly on the `kai-*` element. ' +
      'The submit event is `kai-submit` with `event.detail.value`.\n\n' +
      '```js\n' +
      "const chat = document.querySelector('kai-chat');\n\n" +
      "// ✅ Listen directly on the element\n" +
      "chat.addEventListener('kai-submit', (e) => {\n" +
      '  console.log(e.detail.value); // the text the user typed\n' +
      '});\n\n' +
      "// ❌ Never fires — kai-submit does not bubble\n" +
      "document.addEventListener('kai-submit', handler);\n" +
      '```\n\n' +
      'Common events: `kai-submit`, `kai-feedback`, `kai-model-change`, `kai-new-chat`, `kai-select`.',
  },
  {
    // Rule 4 — wrong element prefix kitn-
    // Source: context7.json rule 1
    id: 'wrong-prefix',
    test: (t) => /\bkitn-/.test(t),
    title: 'Wrong element prefix `kitn-` (should be `kai-`)',
    cause:
      'The custom element prefix is `kai-` (e.g. `<kai-chat>`, `<kai-artifact>`). ' +
      '`kitn-chat` is only a bundle filename — it is not a registered element name. ' +
      'Using `<kitn-chat>` results in an unknown element that renders nothing.',
    fix:
      'Replace the `kitn-` prefix with `kai-` everywhere.\n\n' +
      '```html\n' +
      '<!-- ✅ Correct element prefix -->\n' +
      '<kai-chat></kai-chat>\n' +
      '<kai-artifact></kai-artifact>\n\n' +
      '<!-- ❌ Wrong — kitn-chat is a bundle filename, not an element -->\n' +
      '<kitn-chat></kitn-chat>\n' +
      '```',
  },
  {
    // Rule 5 — SSR / server component / document is not defined
    // Source: for-ai-agents.mdx (client-only import); context7.json rule 2 (property rule requires DOM)
    id: 'ssr-server-component',
    test: (t) => {
      // Core SSR signals — always trigger
      if (/\bssr\b|server\s+component|document\s+is\s+not\s+defined|window\s+is\s+not\s+defined|next\.?js.*server|server.*next\.?js/.test(t)) return true;
      // "hydration" only triggers when a web-component / kai context is also present
      if (/hydration/.test(t) && /kai|web.?component|custom.?element|<[a-z]+-/.test(t)) return true;
      return false;
    },
    title: 'SSR / server-side rendering — element requires the browser DOM',
    cause:
      '`kai-*` elements are client-side web components. They require `document` and ' +
      '`customElements` to register and render. Importing them in a server component ' +
      '(Next.js App Router server component, Nuxt SSR, etc.) throws ' +
      '"document is not defined" or silently produces no output.',
    fix:
      'Register the element on the client only. ' +
      'Use your framework\'s "client-only" / island / dynamic-import pattern.\n\n' +
      '```js\n' +
      "// ✅ Plain HTML / vanilla — import in a <script type=\"module\">\n" +
      "import '@kitn.ai/ui/elements';\n\n" +
      '// ✅ Next.js App Router — mark the component with "use client"\n' +
      "'use client';\n" +
      "import '@kitn.ai/ui/elements';\n\n" +
      '// ✅ Next.js — dynamic import with ssr: false\n' +
      "import dynamic from 'next/dynamic';\n" +
      "const KaiChat = dynamic(() => import('@kitn.ai/ui/elements').then(() => 'kai-chat'), { ssr: false });\n\n" +
      '// ✅ React wrapper (already client-safe)\n' +
      "import { Chat } from '@kitn.ai/ui/react';\n" +
      '```',
  },
];

function buildText(matched: Rule[]): string {
  if (matched.length === 0) {
    return (
      'No known failure pattern matched. Suggested next steps:\n\n' +
      '1. Use the `component_reference` tool to look up the real API for the element ' +
      '(prop names, event names, attribute vs. property distinction).\n' +
      '2. Check the **Streaming recipe** in `llms-full.txt` ' +
      '(`node_modules/@kitn.ai/ui/llms-full.txt` or https://ui.kitn.ai/llms-full.txt) ' +
      'for correct streaming wiring.\n' +
      '3. Paste `https://ui.kitn.ai/llms.txt` into your prompt for a compact orientation.'
    );
  }

  const sections = matched.map((rule, i) => {
    const n = i + 1;
    return `## ${n}. ${rule.title}\n\n**Cause:** ${rule.cause}\n\n**Fix:** ${rule.fix}`;
  });

  const header =
    matched.length === 1
      ? '1 likely cause found:\n\n'
      : `${matched.length} likely causes found:\n\n`;

  return header + sections.join('\n\n---\n\n');
}

export const debug: Tool = {
  name: 'debug',
  description:
    'Diagnose common AI/UI (kai-*) integration issues. ' +
    'Provide a `symptom` (prose description) and/or a `snippet` (code) ' +
    'and receive the likely cause + fix for classic kai-* failure modes.',
  inputSchema: z.object({
    symptom: z.string().optional(),
    snippet: z.string().optional(),
  }),
  handler: async (args) => {
    const combined = `${(args.symptom as string | undefined) ?? ''} ${(args.snippet as string | undefined) ?? ''}`;
    const matched = RULES.filter((rule) => rule.test(combined));

    return {
      content: [{ type: 'text', text: buildText(matched) }],
    };
  },
};
