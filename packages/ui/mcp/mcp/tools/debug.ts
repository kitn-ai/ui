import { z } from 'zod';
import type { Tool } from './types';
import { matchRules, type Rule } from './debug-rules';

/**
 * debug — diagnose common AI/UI (kai-*) integration failures.
 *
 * Given a `symptom` (prose) and/or a `snippet` (code), returns the likely
 * cause + fix for the classic `kai-*` failure modes so a harness can
 * self-correct without a human in the loop.
 *
 * Rule set sourced from:
 *  - apps/docs/src/content/docs/guides/for-ai-agents.mdx §"What agents most commonly get wrong"
 *  - context7.json `rules` array (5 contract rules)
 */

function buildText(matched: Rule[]): string {
  if (matched.length === 0) {
    return (
      'No known failure pattern matched. Suggested next steps:\n\n' +
      '1. Use the `component_reference` tool to look up the real API for the element ' +
      '(prop names, event names, attribute vs. property distinction).\n' +
      '2. If the problem is in host code rather than an element — streaming, ' +
      '`createAssistantStream`, `createMockResponder`, the SSE readers, the encoders — ' +
      'call `component_reference` with `{ name: "programmatic" }` for the full ' +
      '`@kitn.ai/ui/state` + `@kitn.ai/ui/wire` API, and `{ name: "composed-thread" }` ' +
      'for a complete hand-composed surface to compare wiring against.\n' +
      '3. Check the **Streaming recipe** and the **Programmatic layer** sections in ' +
      '`llms-full.txt` (`node_modules/@kitn.ai/ui/llms-full.txt` or ' +
      'https://ui.kitn.ai/llms-full.txt) for correct streaming wiring.\n' +
      '4. Paste `https://ui.kitn.ai/llms.txt` into your prompt for a compact orientation.'
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
    const matched = matchRules(combined);

    return {
      content: [{ type: 'text', text: buildText(matched) }],
    };
  },
};
