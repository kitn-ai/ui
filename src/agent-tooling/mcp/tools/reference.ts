import { z } from 'zod';
import type { Tool } from './types';

/**
 * component_reference — look up AI/UI web components, their props, events, and
 * usage. Stub for Task 1; the real handler lands in Task 2.
 */
export const reference: Tool = {
  name: 'component_reference',
  description:
    'Look up AI/UI (kai-*) web components: their tags, props, events, and usage examples.',
  inputSchema: z.object({}),
  handler: async () => ({ content: [{ type: 'text', text: 'not yet implemented' }] }),
};
