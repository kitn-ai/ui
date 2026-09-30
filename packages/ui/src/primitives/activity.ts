// Activity: the data half of `kai-activity`. A run of reasoning and tool parts becomes a list of
// steps and ONE quiet summary line ("Thought for 6s · Searched the web · Used read_file 2 times").
// No Solid, no DOM, so a server can build the same line a browser will.
//
// EVERYTHING HERE IS MODEL OUTPUT. A tool name, an argument, a result and reasoning text all arrive
// from the model. This module only ever puts them in a STRING or a step field; it never builds
// markup, so the escaping is the renderer's job and the renderer receives plain data. A tool name
// that is `<img onerror=...>` is a label containing those characters, and nothing else.
//
// Parts from a thread saved BEFORE `timing` existed have none: every function tolerates that and
// simply omits the duration, so nothing about an old thread breaks or changes.

import type { MessagePart } from '../web-components/chat/chat-types';
import type { ToolPart } from '../components/tool/tool-types';
import { classifyTool, type ToolKind } from './tool-classify';
import { isPlanTool } from './plan';

export interface ActivityStep {
  id: string;
  kind: 'reasoning' | 'tool';
  /** `interrupted`: the tool never settled and nothing is streaming any more, so it will not. */
  status: 'running' | 'done' | 'error' | 'interrupted';
  /** Overrides the derived label. */
  label?: string;
  toolName?: string;
  /** From `classifyTool`, or the part's own `kind`. */
  toolKind?: ToolKind;
  /** Reasoning text, for the renderer to show through the kit's safe markdown. */
  text?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  /** Epoch ms, from the part's `timing`. */
  startedAt?: number;
  endedAt?: number;
}

const PLAN_STEP_LABEL = 'Updated the plan';

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A timing only if it is one: a number `startedAt`, and an `endedAt` that is a number or absent. */
function readTiming(v: unknown): { startedAt: number; endedAt?: number } | undefined {
  if (!isObject(v)) return undefined;
  const t = v as { startedAt?: unknown; endedAt?: unknown };
  if (typeof t.startedAt !== 'number') return undefined;
  return { startedAt: t.startedAt, ...(typeof t.endedAt === 'number' ? { endedAt: t.endedAt } : {}) };
}

const isSettled = (t: Partial<ToolPart>): boolean => t.state === 'output-available' || t.state === 'output-error';

/**
 * Reasoning and tool parts as steps, in order; every other part is skipped (the caller splits runs
 * at text). Total: a part missing any optional field still yields a step.
 *
 * `status`: an errored tool is `error`. While `streaming`, a tool that has not settled is
 * `running`, and so is a reasoning block that has not ended (its `timing.endedAt` is unset; with no
 * timing at all, the LAST part of the turn). Not streaming, nothing is running, so a tool that
 * never settled is `interrupted`: reporting it `done` would claim work that has no result
 * (`abort()` flips such tools to `output-error`; this covers the thread that was never aborted).
 */
export function activityStepsFromParts(parts: MessagePart[], opts: { streaming?: boolean } = {}): ActivityStep[] {
  const streaming = opts.streaming === true;
  const steps: ActivityStep[] = [];
  // TOTAL over corrupt input. A saved thread can hold anything (a null part, a tool part with no
  // `tool`, a timing that is a string), so every read below is checked, and an entry that is not a
  // part is SKIPPED. Skipping is the honest answer here: there is no step to show, and throwing
  // would take the whole thread's rendering down with one bad row.
  if (!Array.isArray(parts)) return steps;
  parts.forEach((raw, i) => {
    if (!isObject(raw)) return;
    const part = raw as Record<string, unknown>;
    if (part.type === 'reasoning') {
      const timing = readTiming(part.timing);
      const open = timing ? timing.endedAt === undefined : i === parts.length - 1;
      steps.push({
        id: `reasoning-${i}`,
        kind: 'reasoning',
        status: streaming && open ? 'running' : 'done',
        ...(typeof part.label === 'string' && part.label ? { label: part.label } : {}),
        ...(typeof part.text === 'string' ? { text: part.text } : {}),
        ...(timing ? { startedAt: timing.startedAt, endedAt: timing.endedAt } : {}),
      });
    } else if (part.type === 'tool' && isObject(part.tool)) {
      const t = part.tool as Partial<ToolPart>;
      const name = typeof t.type === 'string' ? t.type : '';
      const timing = readTiming(t.timing);
      steps.push({
        id: typeof t.toolCallId === 'string' ? t.toolCallId : `tool-${i}`,
        kind: 'tool',
        status: t.state === 'output-error' ? 'error' : isSettled(t) ? 'done' : streaming ? 'running' : 'interrupted',
        ...(isPlanTool(name) ? { label: PLAN_STEP_LABEL } : {}),
        toolName: name,
        toolKind: t.kind ?? classifyTool(name),
        ...(isObject(t.input) ? { input: t.input } : {}),
        ...(isObject(t.output) ? { output: t.output } : {}),
        ...(typeof t.errorText === 'string' ? { errorText: t.errorText } : {}),
        ...(timing ? { startedAt: timing.startedAt, endedAt: timing.endedAt } : {}),
      });
    }
  });
  return steps;
}

/** `1.2s`, `6s`, `1m 5s`, `340ms`. Empty for a value that is not a duration (NaN, negative,
 *  infinite), so a bad clock shows nothing rather than "NaNs". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '';
  const rounded = Math.round(ms);
  if (rounded < 1000) return `${rounded}ms`;
  if (ms < 10_000) {
    const tenths = Math.round(ms / 100) / 10;
    if (tenths < 10) return `${tenths}s`;
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const r = seconds % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

export interface ActivityLabel {
  /** The settled phrase for a run of `n` steps of this kind (`name` is the tool name, when known). */
  done: (n: number, name?: string) => string;
  /** The present-participle phrase for the step running now. Always ends in an ellipsis. */
  live: (name?: string) => string;
}

const times = (base: string, n: number): string => (n > 1 ? `${base} ${n} times` : base);
const isWebTool = (name?: string): boolean => name !== undefined && /web/i.test(name);

const usedTool: ActivityLabel = {
  done: (n, name) => (isPlanTool(name ?? '') ? times('Updated the plan', n) : times(name ? `Used ${name}` : 'Used a tool', n)),
  live: (name) => (isPlanTool(name ?? '') ? 'Updating the plan…' : name ? `Using ${name}…` : 'Working…'),
};

/**
 * Every phrase the activity line can say, in one table so the MCP reference can quote it and a
 * wording change is one deliberate edit (`activity.test.ts` pins the whole table).
 */
export const ACTIVITY_LABELS: Record<ToolKind | 'reasoning', ActivityLabel> = {
  reasoning: { done: () => 'Thought', live: () => 'Thinking…' },
  search: {
    done: (n, name) => times(isWebTool(name) ? 'Searched the web' : 'Searched', n),
    live: (name) => (isWebTool(name) ? 'Searching the web…' : 'Searching…'),
  },
  fetch: { done: (n) => (n > 1 ? `Read ${n} pages` : 'Read a page'), live: () => 'Reading…' },
  'file-read': { done: (n) => (n > 1 ? `Read ${n} files` : 'Read a file'), live: () => 'Reading…' },
  'file-change': { done: (n) => (n > 1 ? `Edited ${n} files` : 'Edited a file'), live: () => 'Editing…' },
  command: { done: (n) => (n > 1 ? `Ran ${n} commands` : 'Ran a command'), live: () => 'Running…' },
  image: { done: (n) => (n > 1 ? `Generated ${n} images` : 'Generated an image'), live: () => 'Generating an image…' },
  mcp: usedTool,
  generic: usedTool,
};

/** The line for tool calls that never got a result. Worded as what happened, not as work done. */
export function interruptedLabel(n: number, name?: string): string {
  return `${times(name ? `Called ${name}` : 'Called a tool', n)}, no result`;
}

const labelKey = (s: ActivityStep): ToolKind | 'reasoning' => (s.kind === 'reasoning' ? 'reasoning' : s.toolKind ?? 'generic');

/** Consecutive steps collapse when they say the same thing: the same kind, and for the kinds that
 *  name the tool ("Used read_file") the same tool, so two different tools never merge into a count. */
const groupKey = (s: ActivityStep): string => {
  if (s.status === 'interrupted') return `interrupted:${s.toolName ?? ''}`;
  const kind = labelKey(s);
  return kind === 'generic' || kind === 'mcp' ? `${kind}:${s.toolName ?? ''}` : kind;
};

/**
 * The one line for a run of steps.
 *
 * Interrupted tools are never counted as work: each group reads "Called <tool>, no result".
 * Settled: each group of consecutive like steps becomes its phrase, joined with " · ";
 * reasoning gains " for Ns" when every block in the group is timed and over (a still-open block
 * would make the total a lie, so the duration is omitted instead). Streaming with a step running:
 * just that step's live phrase. Streaming with nothing running (between rounds) reads as settled.
 */
export function summarizeActivity(steps: ActivityStep[], opts: { streaming?: boolean } = {}): string {
  if (steps.length === 0) return '';
  if (opts.streaming) {
    const live = [...steps].reverse().find((s) => s.status === 'running');
    if (live) return ACTIVITY_LABELS[labelKey(live)].live(live.toolName);
  }
  const phrases: string[] = [];
  let i = 0;
  while (i < steps.length) {
    const key = groupKey(steps[i]);
    let j = i;
    while (j < steps.length && groupKey(steps[j]) === key) j++;
    const group = steps.slice(i, j);
    const first = group[0];
    let phrase = first.status === 'interrupted'
      ? interruptedLabel(group.length, first.toolName || undefined)
      : ACTIVITY_LABELS[labelKey(first)].done(group.length, first.toolName);
    if (first.kind === 'reasoning') {
      const timed = group.every((s) => s.startedAt !== undefined && s.endedAt !== undefined);
      if (timed) {
        const total = group.reduce((sum, s) => sum + ((s.endedAt as number) - (s.startedAt as number)), 0);
        const text = formatDuration(total);
        if (text) phrase += ` for ${text}`;
      }
    }
    phrases.push(phrase);
    i = j;
  }
  return phrases.join(' · ');
}
