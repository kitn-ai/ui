import { z } from 'zod';
import type { Tool } from './types';

/**
 * debug — diagnose common AI/UI integration problems (stream not rendering,
 * components not registering, etc.). Stub for Task 1; real handler in Task 5.
 */
export const debug: Tool = {
  name: 'debug',
  description: 'Diagnose common AI/UI integration issues (streaming, registration, theming).',
  inputSchema: z.object({}),
  handler: async () => ({ content: [{ type: 'text', text: 'not yet implemented' }] }),
};
