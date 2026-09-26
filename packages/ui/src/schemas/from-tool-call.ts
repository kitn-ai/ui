// lint-comment-references: long-block -- the tool-loop example and the two design calls are one contract, and the example is the only place the inverse direction is shown
// The inverse of `cardTools()`: a model's tool call back into a renderable card. This is the
// one line a developer adds to their tool loop:
//
//   const card = cardFromToolCall(call.name, call.input ?? {}, { id: call.id });
//   if (card) { stream.addCard(card); applyToolOutput(stream, call.id, { status: 'awaiting_user' }); continue; }
//   applyToolOutput(stream, call.id, await runTool(call.name, call.input ?? {}));
//
// RUNTIME-FREE, DELIBERATELY: one type import that erases, no DOM, no Solid, no validator and no
// schema data, because a backend route imports this inside a tool loop.
//
// TWO DESIGN CALLS. (1) The TOOL NAME carries the card type (`kai_confirm` -> `'confirm'`) and
// the provider's `tool_call_id` becomes `CardEnvelope.id` unchanged, because that id is already
// unique per call and already the key `upsertCardPart` matches on, so a revised card replaces the
// old one in place instead of rendering twice. (2) `kai_` decides "card tool", NOT "renderable":
// this module never validates and must not grow one, so an unknown type still produces an
// envelope the dispatcher renders as a fallback, and malformed `data` produces one too, because
// null would misroute the call to `runTool` while throwing would kill the sibling calls in the
// batch. The envelope keeps the bad data attributable to its call, so the app can hand the
// diagnostic back to the model and the retry upserts over the broken card.
//
// `isCardTool` and `cardFromToolCall` derive from ONE decision function, so they cannot drift.


import type { CardEnvelope } from '../primitives/card-contract';

/**
 * The tool-name prefix that marks a card tool.
 *
 * Prefixed so a developer's own `confirm` tool cannot collide with ours, and
 * exported as a value so `cardTools()` names its tools from here instead of
 * restating the literal. A prefix written in two places is a prefix that can drift.
 */
export const KAI_TOOL_PREFIX = 'kai_';

/**
 * The card type a tool name denotes, or `null` if the name is not a card tool.
 *
 * The single decision both public predicates below are derived from. The remainder
 * after the prefix is used verbatim: card types may contain hyphens
 * (`kai_pricing-table` -> `pricing-table`), and both providers accept
 * `[a-zA-Z0-9_-]` in a tool name, so there is nothing to translate. Matching is
 * case-sensitive, because tool names are.
 */
export function cardTypeFromToolName(name: string): string | null {
  if (!name.startsWith(KAI_TOOL_PREFIX)) return null;
  const type = name.slice(KAI_TOOL_PREFIX.length);
  return type.length > 0 ? type : null;
}

/** The tool name for a card type. The exact inverse of {@link cardTypeFromToolName}. */
export function toolNameForCardType(type: string): string {
  return `${KAI_TOOL_PREFIX}${type}`;
}

/**
 * Is this tool call a card, rather than one of the app's own tools?
 *
 * True for any `kai_`-prefixed name with a non-empty remainder. It does NOT claim
 * the type is registered or the data is valid; see the module header for why those
 * are the dispatcher's questions.
 */
export function isCardTool(name: string): boolean {
  return cardTypeFromToolName(name) !== null;
}

/**
 * Turn a model's tool call into a `CardEnvelope`, or `null` if it is not a card tool.
 *
 * @param name  the tool name the model called, e.g. `kai_confirm`
 * @param input the tool arguments, used verbatim as `CardEnvelope.data`
 * @param opts.id the provider's `tool_call_id`, used verbatim as `CardEnvelope.id`
 *
 * `data` is the input as given: the tool's input schema IS the card-data schema that
 * `cardTools()` handed the model, so the mapping is identity and nothing is peeled,
 * renamed or defaulted. In particular no `title` is set. `CardEnvelope.title` is
 * chrome the host owns and no card-data schema offers the model one (`confirm`
 * deliberately calls its in-body heading `heading` and says so in its description),
 * so a caller who wants a title writes `{ ...card, title }`.
 *
 * Never throws.
 */
export function cardFromToolCall(
  name: string,
  input: unknown,
  opts: { id: string },
): CardEnvelope | null {
  const type = cardTypeFromToolName(name);
  if (type === null) return null;
  // `undefined` is the only value here that cannot have come off the wire (a model
  // calling a tool with no arguments), so it is the only one normalised. `null` is
  // real JSON and is passed through for the validator to complain about.
  return { type, id: opts.id, data: input === undefined ? {} : input };
}
