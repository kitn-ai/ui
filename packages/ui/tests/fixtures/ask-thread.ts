// One thread with a pending `kai_ask`, and the answers a user would give it. Shared by the ask
// tests (schema, state, wire) so a change to the shape moves all three at once.
import type { ChatMessage } from '../../src/web-components/chat/chat-types';
import type { AskResult } from '../../src/primitives/questions';

export const ask = {
  questions: [
    { header: 'Tone', question: 'How formal?', kind: 'choice', options: [{ label: 'Casual' }, { label: 'Formal' }] },
  ],
};

export const thread = (): ChatMessage[] => [
  { id: 'u', role: 'user', parts: [{ type: 'text', text: 'draft it' }] },
  {
    id: 'a',
    role: 'assistant',
    parts: [
      { type: 'text', text: 'One question.' },
      { type: 'tool', tool: { type: 'kai_ask', state: 'input-available', toolCallId: 'call_1', input: ask } },
    ],
  },
];

export const result: AskResult = {
  status: 'answered',
  answers: [{ questionId: 'q0', header: 'Tone', question: 'How formal?', kind: 'choice', selected: ['Casual'] }],
};
