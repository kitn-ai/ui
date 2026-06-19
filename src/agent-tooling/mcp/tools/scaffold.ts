import { z } from 'zod';
import type { Tool } from './types';

/**
 * scaffold — generate wiring for an AI/UI archetype against a given integration
 * (route templates, env vars, stream mapping). Stub for Task 1; real handler in Task 3.
 */
export const scaffold: Tool = {
  name: 'scaffold',
  description:
    'Scaffold an AI/UI archetype wired to a backend integration (routes, env vars, stream mapping).',
  inputSchema: z.object({}),
  handler: async () => ({ content: [{ type: 'text', text: 'not yet implemented' }] }),
};
