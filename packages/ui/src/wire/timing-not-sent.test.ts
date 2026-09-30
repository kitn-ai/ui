// `timing` on a reasoning or tool part is DISPLAY metadata for the activity line. It is a field on
// existing variants, not a new variant, so `lint:silent-drops` cannot see it, which is why this
// file exists: the encoders build each provider block field by field, and this pins that no
// path spreads a part through. Two claims, checked over BOTH encoders:
//   1. a thread with timing encodes to the same BYTES as the same thread without it;
//   2. no `timing`/`startedAt`/`endedAt` appears anywhere in what is sent.
// Claim 1 is also the "saved threads from before timing" guarantee: a thread that never had
// timing is one of the two inputs.
import { describe, expect, it } from 'vitest';
import { toAnthropicMessages, toOpenAIMessages } from './encode';
import type { ChatMessage } from '../web-components/chat/chat-types';

const thinking = { type: 'thinking', thinking: 'hm', signature: 'SIG' };
const TIMING = { startedAt: 1_700_000_000_000, endedAt: 1_700_000_006_000 };

function thread(timed: boolean): ChatMessage[] {
  const t = (extra = {}) => (timed ? { timing: TIMING, ...extra } : extra);
  return [
    { id: 'u', role: 'user', parts: [{ type: 'text', text: 'weather?' }] },
    {
      id: 'a',
      role: 'assistant',
      parts: [
        { type: 'reasoning', text: 'hm', index: 0, signature: 'SIG', raw: { source: 'anthropic.content_block', payload: thinking }, ...t() },
        { type: 'tool', tool: { type: 'get_weather', state: 'output-available', toolCallId: 'c1', input: { city: 'Paris' }, output: { c: 18 }, ...t() } },
        { type: 'text', text: 'It is 18C.' },
      ],
    },
  ];
}

describe('timing never reaches a provider request', () => {
  it.each([
    ['anthropic', (m: ChatMessage[]) => toAnthropicMessages(m)],
    ['openai', (m: ChatMessage[]) => toOpenAIMessages(m, { reasoning: 'include' })],
    ['openai (reasoning omitted)', (m: ChatMessage[]) => toOpenAIMessages(m)],
  ] as const)('%s: timed and untimed threads encode to identical bytes', (_name, encode) => {
    const timed = JSON.stringify(encode(thread(true)));
    const plain = JSON.stringify(encode(thread(false)));
    expect(timed).toBe(plain);
    expect(timed).not.toMatch(/timing|startedAt|endedAt/);
    // Not vacuous: the thread does encode to something with the tool round in it.
    expect(timed).toMatch(/get_weather/);
  });
});
