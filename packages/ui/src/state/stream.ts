// src/state/stream.ts
import type { ChatMessage, MessagePart, Source } from '../web-components/chat/chat-types';
import type { ToolPart } from '../components/tool/tool-types';
import type { CardEnvelope } from '../primitives/card-contract';
import type { AttachmentData } from '../primitives/attachment-types';
import { appendReasoningPart, appendTextPart, upsertCardPart, upsertToolPart, type ReasoningOpts } from './parts';

/** The one universal contract: a functional-updater setter (React setState shape). */
export type SetMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => void;

/* --------------------------------------------------------------------------
 * Bag exclusivity: why the mutators below do not just take their payload type.
 *
 * `Source`, `Partial<ToolPart>` and `ReasoningOpts` are WEAK types, and TypeScript only
 * excess-property-checks OBJECT LITERALS: hand a mutator a VARIABLE and any bag sharing one
 * optional key name flows in. `addSource(source: Source)` accepted an `AttachmentData`, and nine
 * such pairs existed without one type error; ./stream-types.test.ts pins all nine.
 *
 * Tightening the PAYLOAD types is not available: a citation with no url and no title is a
 * rendered, tested state, and a patch/opts bag is optional by definition. So the exclusivity
 * lives on the PARAMETER, leaving every published data type alone. The forbidden key set is
 * DERIVED from the `MessagePart` union, so a seventh variant re-fires this on its own.
 * THE BOUNDARY, all three deliberate: (1) a key no sibling bag owns still passes, because an exact
 * type would push callers toward the cast that caused the bug; (2) `addCard`/`addFile` stay
 * unwrapped -- nothing else is assignable to `CardEnvelope`, and wrapping `addFile` would reject
 * two ordinary shapes to block one contrived one; (3) a hand-built `parts.push({...})` bypasses it
 * all, and closing that would put a `type?: undefined` row in every consumer-facing prop table.
 * ------------------------------------------------------------------------ */

/** Every OBJECT payload a `MessagePart` variant carries. `type`/`raw` are the
 *  variant's own bookkeeping, not payload; the primitive payloads (`text`,
 *  `label`, `index`, ...) drop out at `Extract<..., object>`. */
type PartPayload = Extract<
  MessagePart extends infer P ? (P extends object ? P[Exclude<keyof P, 'type' | 'raw'>] : never) : never,
  object
>;

/** Every bag one of these mutators takes: the part payloads plus the options
 *  bags that are not payloads themselves. */
type MutatorBag = PartPayload | ReasoningOpts;

/** `keyof` over a union member-by-member. The bare `keyof (A | B)` is the
 *  INTERSECTION of their keys, which is the opposite of what this needs. */
type KeysOf<T> = T extends unknown ? keyof T : never;

/** `Shape`, but any key that belongs exclusively to a SIBLING bag is a compile
 *  error. Keys `Shape` never heard of are untouched, so a consumer's own
 *  superset of a citation still passes; only the mix-ups fail. That is a
 *  denylist, not an exact type, on purpose; see `state/stream-types.test.ts`. */
type Unmixed<Shape> = Shape & { [K in Exclude<KeysOf<MutatorBag>, keyof Shape>]?: never };

function newId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'kai-' + Math.random().toString(36).slice(2);
}

/** A fluent builder for one in-flight assistant message. Owns no state. */
export interface AssistantStream {
  readonly id: string;
  appendText(delta: string): AssistantStream;
  appendReasoning(delta: string, opts?: Unmixed<ReasoningOpts>): AssistantStream;
  upsertTool(toolCallId: string, patch: Unmixed<Partial<ToolPart>>): AssistantStream;
  // A model that revises a card mid-turn re-sends the whole envelope, so a second call
  // with a known id revises that card in place rather than rendering a second copy of
  // it. See `upsertCardPart`.
  /** Adds a card, or replaces the existing one with the same `envelope.id`. */
  addCard(envelope: CardEnvelope): AssistantStream;
  addSource(source: Unmixed<Source>): AssistantStream;
  /* Unwrapped on purpose; these two take STRONG types, so ordinary assignability
   * already holds. The measurements are in state/stream-types.test.ts. */
  addFile(attachment: AttachmentData): AssistantStream;
  done(): void;
  // WHERE THE REASON LANDS, in order, and why each rule exists. (1) every tool part
  // that has NOT produced a result flips to `output-error` with `errorText: reason`, so
  // no panel spins forever; a part already carrying its own non-empty `errorText` is
  // left alone and still counts ("search index offline" answers what went wrong where
  // the generic "Connection lost." is only the outer symptom). (2) only if no part could
  // carry it, the reason is APPENDED as its own text part. Never both.
  // Rule 2 was missing once and it cost a TEXT-ONLY turn: `abort` stamped tool panels
  // only, so the reason was discarded and an EMPTY assistant bubble rendered while the
  // consumer believed the failure had been reported. It appends a NEW part rather than
  // merging, because gluing "Connection lost." onto a half-finished sentence reads as the
  // model saying it. The reason is TRIMMED, and an empty one appends nothing: the kit
  // will not invent copy the consumer did not write. Rule 1 still runs with
  // `errorText: undefined`, since an `Error` may carry `''`. Settled is settled: after
  // `done()` or a first `abort()` this is a no-op like every other mutator. The reason is
  // consumer-facing markdown, so pass a sentence a visitor can read, not a stack trace.
  /** Settles the turn as FAILED and puts `reason` where the reader can find it. */
  abort(reason?: string): void;
}

/** Start an assistant message and drive it through `set`. New refs on every mutation. */
export function createAssistantStream(
  set: SetMessages,
  init: Partial<ChatMessage> = {},
): AssistantStream {
  const id = init.id ?? newId();
  let settled = false;

  set((prev) => [...prev, { id, role: 'assistant', parts: [], ...init }]);

  const mutate = (fn: (parts: MessagePart[]) => MessagePart[]) => {
    if (settled) return;
    set((prev) => {
      const i = prev.findIndex((m) => m.id === id);
      if (i < 0) return prev;
      const next = fn(prev[i].parts);
      if (next === prev[i].parts) return prev;
      return [...prev.slice(0, i), { ...prev[i], parts: next }, ...prev.slice(i + 1)];
    });
  };

  const stream: AssistantStream = {
    id,
    appendText(delta) { mutate((p) => appendTextPart(p, delta)); return stream; },
    appendReasoning(delta, opts) { mutate((p) => appendReasoningPart(p, delta, opts)); return stream; },
    upsertTool(toolCallId, patch) { mutate((p) => upsertToolPart(p, toolCallId, patch)); return stream; },
    // Upsert, not append: keyed on envelope.id so a revised card replaces itself.
    addCard(envelope) { mutate((p) => upsertCardPart(p, envelope)); return stream; },
    addSource(source) { mutate((p) => [...p, { type: 'source', source }]); return stream; },
    addFile(attachment) { mutate((p) => [...p, { type: 'file', attachment }]); return stream; },
    done() { settled = true; },
    abort(reason) {
      // Whitespace-only is the same nothing as empty. `err.message` on a thrown
      // Error is free to be either, and appending it would render an INVISIBLE
      // text part -- a blank bubble that also claims to have said something.
      const text = reason?.trim() || undefined;
      mutate((p) => {
        let carried = false;
        const next = p.map((part) => {
          if (part.type !== 'tool' || part.tool.state === 'output-available') return part;
          // Already showing its own, more specific failure: keep it, and count
          // it as carrying. See the note above `abort`.
          if (part.tool.state === 'output-error' && part.tool.errorText?.trim()) {
            carried = true;
            return part;
          }
          carried = true;
          return { ...part, tool: { ...part.tool, state: 'output-error' as const, errorText: text } };
        });
        // The reason has to land SOMEWHERE. See the note above `abort`.
        if (carried || !text) return next;
        return [...next, { type: 'text', text }];
      });
      settled = true;
    },
  };
  return stream;
}

/** Wrap a stream so `onSettle` fires on done/abort (used to toggle a `loading` flag).
 *  Preserves the fluent chain by returning the wrapper from every mutator. */
export function onStreamSettled(inner: AssistantStream, onSettle: () => void): AssistantStream {
  const wrapper: AssistantStream = {
    id: inner.id,
    appendText(delta) { inner.appendText(delta); return wrapper; },
    appendReasoning(delta, opts) { inner.appendReasoning(delta, opts); return wrapper; },
    upsertTool(toolCallId, patch) { inner.upsertTool(toolCallId, patch); return wrapper; },
    addCard(envelope) { inner.addCard(envelope); return wrapper; },
    addSource(source) { inner.addSource(source); return wrapper; },
    addFile(attachment) { inner.addFile(attachment); return wrapper; },
    done() { inner.done(); onSettle(); },
    abort(reason) { inner.abort(reason); onSettle(); },
  };
  return wrapper;
}
