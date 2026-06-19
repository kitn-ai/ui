import { z } from 'zod';
import type { Tool } from './types';

/**
 * theme — produce or adjust AI/UI theme tokens (colors, fonts, shadow, tracking).
 * Stub for Task 1; the real handler lands in Task 4.
 */
export const theme: Tool = {
  name: 'theme',
  description: 'Generate or adjust AI/UI theme tokens (colors, fonts, shadow, tracking).',
  inputSchema: z.object({}),
  handler: async () => ({ content: [{ type: 'text', text: 'not yet implemented' }] }),
};
