import { z } from 'zod';

export const Category = z.enum(['provider', 'gateway', 'framework', 'harness', 'mock']);
export const Language = z.enum(['ts', 'python']);
export const StreamFormat = z.enum(['openai-sse', 'ai-sdk', 'native']);
export const Framework = z.enum(['html', 'react', 'next', 'vue', 'svelte', 'fastapi', 'express', 'worker']);
export const Placement = z.enum(['side', 'full-page', 'docked-widget', 'inline']);

export const IntegrationSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: Category,
  language: Language,
  streamFormat: StreamFormat,
  envVars: z.array(z.string()).default([]),
  routeTemplates: z.record(z.string(), z.string()), // keyed by Framework value → code string
  streamMapping: z.string(),                        // prose: how the stream maps to messages
  runNote: z.string(),
  docsSlug: z.string(),
});
export type Integration = z.infer<typeof IntegrationSchema>;

export const ArchetypeSchema = z.object({
  id: z.string(),
  title: z.string(),
  components: z.array(z.string()),     // kai-* tags, e.g. ['kai-chat', 'kai-sources']
  defaultPlacement: Placement,
  docsSlug: z.string(),
});
export type Archetype = z.infer<typeof ArchetypeSchema>;
