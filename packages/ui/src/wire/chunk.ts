// The provider-neutral chunk surface. Everything the adapter needs out of one
// streaming chunk, and nothing else. A WireFormat maps a decoded provider frame
// onto these; nothing below this line knows a provider exists.
import type { RawOrigin, ToolPart } from '../components/tool/tool-types';
import type { MessagePart, MessageSource } from '../web-components/chat/chat-types';
import type { ReasoningOpts } from '../state/parts';

/** One fragment of a tool call. */
export interface ModelToolCallDelta {
  // The ONLY thing correlating fragments, and its namespace is FORMAT-DEFINED:
  // `openaiChatFormat` uses the position in `delta.tool_calls`,
  // `anthropicMessagesFormat` the content-block index. Both are correct and both are
  // stable within one stream, but they are not the same number, so a third-party
  // format picks one and stays consistent with itself.
  /** Correlates fragments within one stream. Its numbering is defined by the format. */
  index: number;
  id?: string;
  /** Usually whole on the first fragment; a few providers split it. */
  name?: string;
  /** A FRAGMENT of the JSON arguments string, not valid JSON on its own. */
  arguments?: string;
  /** A result the PROVIDER executed (Anthropic web_search_tool_result, an OpenAI
   *  built-in). Completes the panel with no host work. */
  output?: Record<string, unknown>;
  /** A provider-executed tool that failed. */
  outputError?: string;
}

/** Field names are deliberately provider-neutral. OpenAI says prompt/completion,
 *  Anthropic says input/output; input/output is the one that reads correctly for
 *  both. */
export interface ModelUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  /** Non-zero proves the model reasoned even when no reasoning text streamed. */
  reasoningTokens?: number;
  cachedInputTokens?: number;
  costUsd?: number;
}

export interface ModelStreamChunk {
  text?: string;
  // REPORT, NEVER INFER, and read from the RESPONSE rather than the request: that is
  // what makes it work when the app builds its own fetch and the kit never sees what
  // was asked for. Providers resolve aliases (ask for `gpt-4o`, get
  // `gpt-4o-2024-08-06`), and through a gateway the value is the gateway's own id.
  // NOT guaranteed: a proxy can strip or rewrite it and a custom endpoint may omit
  // it, so a consumer renders it as ABSENT when it is absent. Filling the gap with the
  // requested id would lie in exactly the requested-vs-served mismatch this catches.
  /** The model id the RESPONSE stated, verbatim. Absent when the provider omits it. */
  model?: string;
  // `''` is MEANINGFUL, not a no-op: a redacted block has no readable text but still
  // carries a payload that must round-trip, and a format uses an empty delta to OPEN a
  // reasoning part at the right position in the stream so block order survives into
  // `parts`.
  /** Reasoning delta. An empty string opens a reasoning part at this position. */
  reasoning?: string;
  /** The provider's BLOCK index. Keeps parallel reasoning blocks distinct.
   *  Omitted means block 0, the single-block case every provider degrades to. */
  reasoningIndex?: number;
  // Valid on a chunk with NO reasoning text at all, which is the whole point:
  // Anthropic returns 400 if a `thinking` block is modified, reordered or
  // RECONSTRUCTED, so an encoder has to echo the original block rather than rebuild
  // one from `text` plus `signature`.
  /** The untranslated provider payload for this reasoning block, echoed back on encode. */
  reasoningRaw?: RawOrigin;
  /** Informational. `reasoningRaw` is the round-trip channel, not this. */
  reasoningSignature?: string;
  toolCalls?: ModelToolCallDelta[];
  /** Citations the model produced. A run of consecutive `source` parts renders
   *  as one citation row (`part="citations"`), outside the message bubble. */
  sources?: MessageSource[];
  /** Provider VERBATIM: 'stop' | 'tool_calls' | 'end_turn' | 'max_tokens' | ...
   *  Normalizing in place would destroy information consumers branch on. */
  finishReason?: string | null;
  usage?: ModelUsage;
  /** An in-band provider error (the HTTP response was already 200). */
  error?: { code?: string | number; message: string };
}

/** One vocabulary across formats, for code that has to BRANCH. `finishReason`
 *  stays beside it, verbatim, for code that has to REPORT. */
export type StopReason = 'stop' | 'length' | 'tool-calls' | 'content-filter' | 'error' | 'other';

const STOP_REASONS: Record<string, StopReason> = {
  // OpenAI chat completions
  stop: 'stop',
  length: 'length',
  tool_calls: 'tool-calls',
  function_call: 'tool-calls',
  content_filter: 'content-filter',
  error: 'error',
  // Anthropic Messages
  end_turn: 'stop',
  stop_sequence: 'stop',
  max_tokens: 'length',
  tool_use: 'tool-calls',
  refusal: 'content-filter',
  pause_turn: 'other',
};

/** Unknown reasons degrade to 'other' rather than throwing: providers add stop
 *  reasons without warning and a new one must not take a turn down. */
export function normalizeStopReason(
  finishReason: string | null | undefined,
): StopReason | undefined {
  if (!finishReason) return undefined;
  return STOP_REASONS[finishReason] ?? 'other';
}

/**
 * The subset of the kit's `AssistantStream` the adapter drives. Declared
 * STRUCTURALLY so the adapter has no runtime dependency on a stream
 * implementation and can be tested against a recorder. The kit's real
 * `AssistantStream` satisfies it as-is: same method names, same arities, and its
 * `AssistantStream` returns are assignable to `unknown`.
 *
 * `addSource` is optional so a hand-rolled three-method sink still compiles.
 */
export interface AssistantStreamSink {
  appendText(delta: string): unknown;
  appendReasoning(delta: string, opts?: ReasoningOpts): unknown;
  /** Create-or-merge. There is no separate "announce" call: handing a patch for
   *  an unknown `toolCallId` creates the ToolPart, and every later patch merges. */
  upsertTool(toolCallId: string, patch: Partial<ToolPart>): unknown;
  addSource?(source: MessageSource): unknown;
}

/** One tool call reassembled out of the stream's fragments. */
export interface ModelToolCall {
  /** The delta index that correlated this call's fragments. */
  index: number;
  /** Provider call id (synthesised as `call_<index>` if the provider omits it). */
  id: string;
  name: string;
  /** The RAW accumulated argument fragments. Echo THIS back on the next turn,
   *  not a re-stringified parse. */
  argumentsText: string;
  /** Parsed arguments: present only when `argumentsText` was a valid JSON object. */
  input?: Record<string, unknown>;
  /** Present only for a call the PROVIDER executed. */
  output?: Record<string, unknown>;
  /** True when the provider ran the tool and returned its result in-stream. The
   *  host must NOT execute these. */
  providerExecuted?: boolean;
  /** Why this call is unusable (malformed or truncated args, missing name). */
  error?: string;
}

/** Everything one assistant turn produced. */
export interface ModelTurn {
  /** The turn as ORDERED MESSAGE PARTS, built with the kit's own part builders,
   *  so it is exactly what the sink was driven with. Covers this turn only. */
  parts: MessagePart[];
  /** Flat concatenation of the text deltas. The provider wire format is a flat
   *  string, so this is kept for encoders. Not the content model. */
  text: string;
  /** Flat concatenation of the reasoning deltas, for the same reason. */
  reasoning: string;
  toolCalls: ModelToolCall[];
  sources: MessageSource[];
  /** The provider's own word for why it stopped. Never normalized. */
  finishReason: string | null;
  /** The same fact in one vocabulary. Branch on this. */
  stopReason?: StopReason;
  error?: { code?: string | number; message: string };
  usage?: ModelUsage;
  /** How many chunks carried a NON-EMPTY reasoning delta. Zero with a non-zero
   *  `usage.reasoningTokens` means the provider hid the thinking text. */
  reasoningChunks: number;
  chunks: number;
}

export interface ConsumeOptions {
  /** Label for the reasoning disclosure. Defaults to 'Thinking'. */
  reasoningLabel?: string;
  // Supply one only to tie a read to an id you already hold. Two reads into the SAME
  // sink must not share a value: the id is what keeps a second round's block 0 from
  // merging into the first round's reasoning part.
  /** Correlates diagnostics and namespaces reasoning parts for this read; assigned when absent. */
  streamId?: string;
  // THE KIT REPORTS WHAT THE APP DECLARES AND GROUPS NOTHING ON ITS OWN. A chat app
  // running a tool loop, or fanning out to sub-agents, makes several model calls that
  // belong to one turn; the kit sees one Response at a time and has no way to know
  // which ones those are, so it does not guess:
  //
  //   readOpenAIStream(res, sink, { traceId: 'turn-42', label: 'planner' })
  //
  // Absent when not supplied: the key is not present on the events at all rather than
  // present and undefined. Nothing in the parse branches on it and it never reaches a
  // provider.
  /** The app's own grouping of several reads into one logical turn. Diagnostic only. */
  traceId?: string;
  // Not to be confused with `reasoningLabel`, which is UI copy for the reasoning
  // disclosure; this one is never rendered to an end user.
  /** The app's name for THIS read inside its trace (`'planner'`, `'retry-2'`). Never rendered. */
  label?: string;
  // Deliberately no per-fragment callback: `ToolPart.rawInput` is written on every
  // fragment, so the streaming text is already on the part. This is the hook a host's
  // tool loop waits on.
  /** Fires once per tool call, the moment its arguments parse cleanly. */
  onToolCallReady?: (call: ModelToolCall) => void;
}

/** Per-stream state for one format. */
export interface WireFormatReader {
  // Returns an ARRAY because the mapping is not one-to-one: an Anthropic `message_start`
  // yields usage, a `content_block_start` for `tool_use` yields an id-plus-name delta,
  // a `ping` yields nothing. MUST NOT throw on an unrecognized frame: return `[]`,
  // because providers add event types without warning.
  /** Maps one decoded frame onto zero or more neutral chunks. */
  push(frame: unknown): ModelStreamChunk[];
}

/** A pluggable wire format. Values, not a flag, so a third party can add one
 *  without a PR to this repo. */
export interface WireFormat {
  readonly id: string;
  /** Called once per stream so a format can hold per-stream state. Two calls
   *  must share NOTHING. */
  open(): WireFormatReader;
}
