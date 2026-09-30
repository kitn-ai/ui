// The agent's plan: the data half of `kai_plan`. No Solid, no DOM, no provider SDK, so a
// backend route can import it beside `planTool` (`@kitn.ai/ui/schemas`) inside a tool loop.
//
// `kai_plan` is a card-free tool: its input is the WHOLE plan every time, and the latest call
// replaces the previous one. It is display, not a question, so the host answers it at once:
//
//   if (isPlanTool(call.name)) {
//     const plan = validatePlan(call.input);
//     applyToolOutput(stream, call.id, plan.ok ? { ok: true } : { ok: false, error: plan.error });
//     continue;
//   }
//
// THE MODEL'S INPUT IS UNTRUSTED. `validatePlan` never throws and never repairs: a malformed call
// returns an error object the host hands BACK to the model (so it retries with a corrected list),
// and the items it returns are rebuilt field by field, so an unknown key, a `__proto__` entry or a
// 50k-char label rides no further than the text it is. Labels reach the DOM only as text.

import type { ChatMessage } from '../web-components/chat/chat-types';
import type { ToolPart } from '../components/tool/tool-types';
import type { JsonSchema } from './card-validate';
import { validateAgainstSchema } from './card-validate';
import { PLAN_TOOL_NAME } from './plan-tool-name';
import planSchemaDoc from './question-schemas/plan.schema.json';

export type PlanItemStatus = 'pending' | 'in_progress' | 'completed';

export interface PlanItem {
  id: string;
  label: string;
  status: PlanItemStatus;
}

// Spelled once, in a module with nothing under it, because `schemas/from-tool-call` must refuse it
// as a card and that file is deliberately free of the validator and the schema data this one carries.
export { PLAN_TOOL_NAME };

/** Is this tool call the plan tool? Exact and case-sensitive, like tool names are. */
export function isPlanTool(name: string): boolean {
  return name === PLAN_TOOL_NAME;
}

/** The `kai_plan` input schema, as authored (`question-schemas/plan.schema.json`). */
export const planSchema = planSchemaDoc as unknown as JsonSchema & Readonly<Record<string, unknown>>;

export type PlanValidation =
  | { ok: true; items: PlanItem[] }
  | {
      ok: false;
      /** One sentence, written to be read by the MODEL: what was wrong and that the whole list must be re-sent. */
      error: string;
      /** Each failed constraint, at most {@link MAX_ISSUES}; `error` says how many more there were. */
      issues: string[];
    };

const MAX_ISSUES = 10;
const MAX_ECHO = 40;

/** A bounded, throw-free description of a value for an error message. Never stringifies an object
 *  (a cycle or a BigInt would throw) and never echoes more than {@link MAX_ECHO} characters. */
function show(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v.length > MAX_ECHO ? `${v.slice(0, MAX_ECHO)}...` : v);
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'an array';
  if (typeof v === 'object') return 'an object';
  return typeof v === 'number' || typeof v === 'boolean' ? String(v) : typeof v;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate a `kai_plan` input. Total: it never throws, whatever it is handed.
 *
 * Schema-driven (`plan.schema.json` through the kit's own validator) plus the two rules a schema
 * cannot say here: ids are unique, and a label is not whitespace. Unknown properties are ignored,
 * as in JSON Schema, but never copied into the result.
 */
export function validatePlan(input: unknown): PlanValidation {
  const issues: string[] = [];
  try {
    const result = validateAgainstSchema(planSchema, input);
    for (const issue of result.issues) issues.push(issue.message);
  } catch (e) {
    // The validator is total on JSON, so this is a value JSON cannot carry (a getter that throws).
    issues.push(`(root): could not be read (${e instanceof Error ? e.message.slice(0, MAX_ECHO) : 'unreadable'})`);
  }

  if (issues.length === 0 && isRecord(input) && Array.isArray(input.items)) {
    const seen = new Set<string>();
    input.items.forEach((raw, i) => {
      const item = raw as Record<string, unknown>;
      if (typeof item.label === 'string' && item.label.trim() === '') issues.push(`(root).items[${i}].label: is blank`);
      if (typeof item.id === 'string') {
        if (seen.has(item.id)) issues.push(`(root).items[${i}].id: ${show(item.id)} is used twice`);
        seen.add(item.id);
      }
    });
  }

  if (issues.length > 0) {
    const shown = issues.slice(0, MAX_ISSUES);
    const more = issues.length - shown.length;
    return {
      ok: false,
      error:
        `kai_plan input is invalid: ${shown.join('; ')}${more > 0 ? `; and ${more} more` : ''}. ` +
        'Send the complete plan again as { items: [{ id, label, status }] } with status one of pending, in_progress, completed.',
      issues: shown,
    };
  }

  const items = ((input as { items: Record<string, unknown>[] }).items).map((raw) => ({
    id: raw.id as string,
    label: raw.label as string,
    status: raw.status as PlanItemStatus,
  }));
  return { ok: true, items };
}

/**
 * The latest plan in a thread: the items of the LAST `kai_plan` call that arrived whole and valid,
 * or `undefined` when there is none.
 *
 * Skipped, deliberately: a call still streaming its arguments (`input-streaming`, so a half-written
 * list never flashes), a call the host answered with `output-error`, and a call whose input fails
 * {@link validatePlan}. The loud half of an invalid call lives at the host, which answers it with
 * the error object; this function only reports what is worth DISPLAYING, and an earlier valid plan
 * stays on screen until a valid one replaces it. An empty `items` is a valid plan (it clears it).
 */
export function planFromMessages(messages: ChatMessage[]): PlanItem[] | undefined {
  // TOTAL over corrupt input: a saved thread can hold a null message, a message with no `parts`, a
  // tool part with no `tool`. Each such entry is skipped (it cannot be a plan call), never thrown on.
  if (!Array.isArray(messages)) return undefined;
  for (let m = messages.length - 1; m >= 0; m--) {
    const parts = (messages[m] as { parts?: unknown } | null | undefined)?.parts;
    if (!Array.isArray(parts)) continue;
    for (let p = parts.length - 1; p >= 0; p--) {
      const part = parts[p] as { type?: unknown; tool?: unknown } | null | undefined;
      if (part?.type !== 'tool' || !isRecord(part.tool)) continue;
      const tool = part.tool as Partial<ToolPart>;
      if (typeof tool.type !== 'string' || !isPlanTool(tool.type)) continue;
      if (tool.state === 'input-streaming' || tool.state === 'output-error') continue;
      const plan = validatePlan(tool.input);
      if (plan.ok) return plan.items;
    }
  }
  return undefined;
}
