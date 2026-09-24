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
 * `Source`, `Partial<ToolPart>` and `ReasoningOpts` are WEAK types — not one
 * required field between them — and TypeScript only excess-property-checks
 * OBJECT LITERALS. Hand a mutator a VARIABLE and that check never runs, so any
 * bag sharing a single optional key name flows straight in. `addSource(source:
 * Source)` therefore accepted an `AttachmentData` and a `CardEnvelope`, and
 * `addFile(a) { inner.addSource(a); }` compiled clean at exit 0 while writing a
 * file payload into a `source` part. Nine such pairs existed across these three
 * bags and not one of them was a type error; `./stream-types.test.ts` pins all
 * nine, and fails with nine "Unused '@ts-expect-error'" if this guard is lifted.
 *
 * Tightening the PAYLOAD types is not available. A citation with no url and no
 * title is a rendered, tested state (`citationTitle` in components/message/message.tsx
 * falls through title -> url -> a generic word, and message.stories.tsx ships
 * "a citation with no url at all"), and a patch/opts bag is optional by
 * definition. So the exclusivity lives on the PARAMETER instead, which leaves
 * every published data type — and every artifact generated from them — alone.
 *
 * The forbidden key set is DERIVED from the `MessagePart` union, the same
 * derivation `verify:scaffold` and `lint:silent-drops` read, so a seventh
 * variant re-fires this on its own rather than quietly widening the hole.
 *
 * THE BOUNDARY — three things this deliberately does NOT cover. Each is a
 * decision with a reason, not an unfinished edge; they are collected here so
 * the whole boundary reads in one place instead of being met one at a time.
 *
 * 1. A KEY NO SIBLING BAG OWNS still passes. `Unmixed` is a denylist over the
 *    sibling vocabulary, not an exact type, so a consumer's own superset of a
 *    citation — `{ url, title, relevance }` — keeps compiling. Full exactness
 *    would catch marginally more and push real callers toward a cast, and a
 *    cast to `Source` from an attachment is the original bug. A guard people
 *    route around is worse than a narrower guard they keep.
 *
 * 2. `addCard` / `addFile` ARE NOT WRAPPED. Both take STRONG types —
 *    `CardEnvelope` requires type+id+data, `AttachmentData` requires id+type —
 *    so ordinary assignability already does what `Unmixed` exists to do for a
 *    weak bag. Measured, not assumed: wrapping `addCard` buys ZERO (no sibling
 *    bag is assignable to `CardEnvelope`, because nothing else carries `data`).
 *    Wrapping `addFile` buys exactly one pair — `addFile(c)` with
 *    `c: CardEnvelope<'file', unknown>` — and costs two ordinary consumer
 *    shapes, since the derived denylist owns `state` and `index`:
 *
 *        { id, type: 'file', filename, state: 'uploading' }  // upload progress
 *        { id, type: 'file', filename, index: 3 }            // display position
 *
 *    That one pair needs a hand-written generic narrowing with no other
 *    purpose; an ordinarily-inferred `CardEnvelope` is ALREADY rejected.
 *    Rejecting likely code to block contrived code is the wrong trade — the
 *    same trade point 1 refused. Both facts this rests on are pinned in
 *    ./stream-types.test.ts, so it re-opens if either stops holding.
 *
 * 3. A HAND-BUILT PART BYPASSES ALL OF IT. `parts.push({ type: 'source',
 *    source: attachmentVariable })` compiles, because these mutators are not
 *    in the path. Closing it means intersecting the guard into `MessagePart`
 *    itself — and `docs/web-components.md` and `llms-full.txt` inline that
 *    union's fully-expanded structural text, so dozens of consumer-facing
 *    prop-table rows would grow `type?: undefined; state?: undefined;
 *    data?: undefined`. That cost lands on every consumer reading the docs
 *    while the benefit reaches only someone who has already stepped around
 *    the provided API. The mutators are the supported path; they are guarded.
 *    This is where the supported path ends, not a gap in it.
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
