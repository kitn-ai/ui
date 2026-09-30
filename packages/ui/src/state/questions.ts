// The thread half of `kai_ask`: reading the open question out of a thread, settling it with the
// user's answers, and deriving the display rows. Pure folds over `ChatMessage[]`: no I/O, no Solid,
// and every one is TOTAL over a corrupt thread (a saved thread can hold a null message, a message
// with no `parts`, a tool part with no `tool`), because these run on data the host loaded.
//
// The protocol: the host leaves the call OPEN, the panel gathers the answers, and
// `answerQuestions` patches the tool part to `output-available` with the `AskResult` as its output.
// That IS the wire's tool result, so the encoders need nothing new and nothing is sent twice.
//
// Every mutation returns a NEW array, a new message object and a new part object (the reactivity
// rule: the array reference notifies, the item identity makes it visible), and leaves every
// untouched message the same object.

import type { ChatMessage, MessagePart } from '../web-components/chat/chat-types';
import type { ToolPart } from '../components/tool/tool-types';
import type { Answer, AskResult, Question, QuestionSet } from '../primitives/questions';
import { ASK_TOOL_NAME, isAskResult, isOneClick } from '../primitives/questions';
import { questionsFromToolCall } from '../schemas/ask';
import { fingerprint } from './parts';

export { isOneClick };

const MAX_ECHO = 40;
const APPROVAL_TOOL_MAX = 200;

const echo = (s: string): string => JSON.stringify(s.length > MAX_ECHO ? `${s.slice(0, MAX_ECHO)}...` : s);
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

type ToolMessagePart = Extract<MessagePart, { type: 'tool' }>;

/** The tool of a part if it is a `kai_ask` call with a usable id, else undefined. Total. */
function askToolOf(part: unknown): ToolPart | undefined {
  if (!isRecord(part) || part.type !== 'tool' || !isRecord(part.tool)) return undefined;
  const tool = part.tool as unknown as Partial<ToolPart>;
  if (tool.type !== ASK_TOOL_NAME) return undefined;
  if (typeof tool.toolCallId !== 'string' || tool.toolCallId === '') return undefined;
  return tool as ToolPart;
}

const partsOf = (message: unknown): unknown[] | undefined => {
  const parts = (message as { parts?: unknown } | null | undefined)?.parts;
  return Array.isArray(parts) ? parts : undefined;
};

/** Open = the call has fully arrived and nothing has answered it. `input-streaming` is still being
 *  written, and a settled call (`output` or `errorText`) is somebody's answer already. */
const isOpen = (tool: ToolPart): boolean =>
  tool.state === 'input-available' && tool.output === undefined && tool.errorText === undefined;

/**
 * The open, valid `kai_ask` of the thread, or `undefined`.
 *
 * "Open" means the LAST message is an assistant message holding a fully-arrived `kai_ask` that
 * nothing has answered. A user message after it means the question was abandoned (the host should
 * have called {@link settlePendingQuestions}), so it is not pending and the panel does not
 * reappear. A call whose input fails validation is not pending either: the host answers it with the
 * `{ error }` from `questionsFromToolCall`. The first open call wins when a message holds several.
 * Derived from the thread alone, so a page reload re-opens the same panel.
 */
export function pendingQuestions(messages: ChatMessage[]): QuestionSet | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  const last = messages[messages.length - 1] as { role?: unknown } | null | undefined;
  if (!last || last.role !== 'assistant') return undefined;
  const parts = partsOf(last);
  if (!parts) return undefined;
  for (const part of parts) {
    const tool = askToolOf(part);
    if (!tool || !isOpen(tool)) continue;
    const set = questionsFromToolCall(ASK_TOOL_NAME, tool.input, { id: tool.toolCallId as string });
    if (set && 'questions' in set) return set;
  }
  return undefined;
}

/** Patch every tool part `pick` names, returning the same array when none matched. */
function patchAskParts(messages: ChatMessage[], pick: (tool: ToolPart) => Record<string, unknown> | undefined): ChatMessage[] {
  let changed = false;
  const next = messages.map((message) => {
    const parts = partsOf(message);
    if (!parts) return message;
    let partsChanged = false;
    const nextParts = parts.map((part) => {
      const tool = askToolOf(part);
      if (!tool) return part;
      const patch = pick(tool);
      if (!patch) return part;
      partsChanged = true;
      return { ...(part as ToolMessagePart), tool: { ...tool, ...patch } };
    });
    if (!partsChanged) return message;
    changed = true;
    return { ...message, parts: nextParts as MessagePart[] };
  });
  return changed ? next : messages;
}

/**
 * Settle the call with the user's result: the tool part goes to `output-available`, `output` is the
 * {@link AskResult}, and the next request carries it as the call's one tool result.
 *
 * - IDEMPOTENT for the same result: a double submit (the request failed and they pressed Submit
 *   again) returns the input array unchanged, so the answers are never applied twice.
 * - A DIFFERENT result on an already-settled call is REFUSED: the input is returned unchanged and it
 *   warns once. A retry must not rewrite history the model may already have read.
 * - Also returned unchanged, with a warning: an unknown `toolCallId`, a call still streaming its
 *   arguments, and a `result` that is not an `AskResult`.
 */
export function answerQuestions(messages: ChatMessage[], toolCallId: string, result: AskResult): ChatMessage[] {
  if (!Array.isArray(messages)) return messages;
  const id = typeof toolCallId === 'string' ? toolCallId : '';
  if (!isAskResult(result)) {
    console.warn(`answerQuestions: the result for call ${echo(id)} is not an AskResult ({ status: "answered" | "dismissed", answers: [] }); nothing was changed.`);
    return messages;
  }
  let found: ToolPart | undefined;
  for (const message of messages) {
    for (const part of partsOf(message) ?? []) {
      const tool = askToolOf(part);
      if (tool && tool.toolCallId === id) found = tool;
    }
  }
  if (!found) {
    console.warn(`answerQuestions: no ${ASK_TOOL_NAME} call ${echo(id)} in the thread; nothing was changed.`);
    return messages;
  }
  if (found.output !== undefined || found.errorText !== undefined) {
    if (found.errorText === undefined && fingerprint(found.output) === fingerprint(result)) return messages;
    console.warn(`answerQuestions: call ${echo(id)} was already settled with a different result; it is not rewritten.`);
    return messages;
  }
  if (found.state !== 'input-available') {
    console.warn(`answerQuestions: call ${echo(id)} has not finished arriving (state "${String(found.state)}"); nothing was changed.`);
    return messages;
  }
  return patchAskParts(messages, (tool) =>
    tool.toolCallId === id ? { state: 'output-available', output: result as unknown as Record<string, unknown> } : undefined,
  );
}

/**
 * Settle every open `kai_ask` as `{ status: 'dismissed' }`, for the moment the user sends a normal
 * message while questions are waiting. Without it the call would dangle, the encoder would drop it
 * (a call with no result is not sendable), and the model would forget it asked.
 *
 * `answers` are the PARTIAL answers to keep; they go on the call the panel was showing
 * ({@link pendingQuestions}), and any other open call is dismissed with none. Returns the same array
 * when nothing was open, so it is safe to call unconditionally before appending the user message.
 */
export function settlePendingQuestions(messages: ChatMessage[], answers: Answer[] = []): ChatMessage[] {
  if (!Array.isArray(messages)) return messages;
  const shown = pendingQuestions(messages)?.id;
  return patchAskParts(messages, (tool) => {
    if (!isOpen(tool)) return undefined;
    const kept = tool.toolCallId === shown && Array.isArray(answers) ? answers : [];
    const output: AskResult = { status: 'dismissed', answers: kept };
    return { state: 'output-available', output: output as unknown as Record<string, unknown> };
  });
}

/**
 * A `confirm` question for a tool call the APP wants approved before it runs. The kit only asks:
 * what to do with the answer is the app's decision. `opts` override the header and the text.
 * The tool name is the model's, so it is clamped (with a visible ellipsis) in the default text.
 */
export function approvalQuestion(tool: ToolPart, opts: { header?: string; question?: string } = {}): Question {
  const name = typeof tool?.type === 'string' ? tool.type : 'this tool';
  const shown = name.length > APPROVAL_TOOL_MAX ? `${name.slice(0, APPROVAL_TOOL_MAX)}…` : name;
  return {
    id: typeof tool?.toolCallId === 'string' && tool.toolCallId !== '' ? tool.toolCallId : 'approval',
    header: opts.header ?? 'Approve',
    question: opts.question ?? `Run ${shown}?`,
    kind: 'confirm',
    options: [{ label: 'Approve' }, { label: 'Deny' }],
    required: true,
  };
}

export type ThreadRow =
  | { kind: 'message'; key: string; message: ChatMessage }
  | { kind: 'answers'; key: string; toolCallId: string; result: AskResult };

/**
 * The rows a thread DISPLAYS. One `message` row per message (keyed by `message.id`), plus an
 * `answers` row right after the assistant message holding an answered `kai_ask`, or a dismissed one
 * with at least one answer (keyed `answers:<toolCallId>`, so it is stable across re-derivation).
 * Pending and dismissed-empty calls add nothing. The answers row is display only: the data stays
 * the one tool result on the tool part, so the wire never sees a second user turn.
 *
 * Total: a null message, a missing `parts` or a malformed output is skipped, never thrown on.
 */
export function threadRows(messages: ChatMessage[]): ThreadRow[] {
  if (!Array.isArray(messages)) return [];
  const rows: ThreadRow[] = [];
  const keys = new Map<string, number>();
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (!isRecord(message)) continue;
    rows.push({ kind: 'message', key: typeof message.id === 'string' ? message.id : `#${i}`, message });
    if (message.role !== 'assistant') continue;
    for (const part of partsOf(message) ?? []) {
      const tool = askToolOf(part);
      if (!tool || tool.state !== 'output-available' || !isAskResult(tool.output)) continue;
      const result = tool.output;
      if (result.status === 'dismissed' && result.answers.length === 0) continue;
      const base = `answers:${tool.toolCallId}`;
      const seen = keys.get(base) ?? 0;
      keys.set(base, seen + 1);
      rows.push({ kind: 'answers', key: seen === 0 ? base : `${base}#${seen}`, toolCallId: tool.toolCallId as string, result });
    }
  }
  return rows;
}
