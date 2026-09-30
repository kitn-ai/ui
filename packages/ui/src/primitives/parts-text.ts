import type { MessagePart } from '../web-components/chat/chat-types';

/**
 * Joins every text part with a paragraph break. Use where a plain string is genuinely needed
 * (copy-to-clipboard, TTS, a length check). Do NOT use it for rendering.
 *
 * A paragraph break and not '': text parts are only ever separate when something else sat
 * between them (a reasoning block, a tool run, a card), and gluing them gave "IntroConclusion".
 *
 * LIVES HERE, below `state/`, because `primitives/message-feedback.ts` needs it and
 * the value edge `primitives -> state` is a cycle (state imports primitives). The
 * alternative was waiving it in lint:layer-direction; a three-line pure function over
 * a data shape moving down to the data-shape layer is cheaper than a waiver that
 * outlives its reason. Re-exported from `state/messages` so the `@kitn.ai/ui/state`
 * surface is unchanged.
 */
export function partsToText(parts: MessagePart[]): string {
  return parts.filter((p) => p.type === 'text').map((p) => p.text).join('\n\n');
}
