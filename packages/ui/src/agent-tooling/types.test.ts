import { describe, it, expect } from 'vitest';
import { IntegrationSchema, ArchetypeSchema } from './types';

describe('IntegrationSchema', () => {
  it('validates a minimal integration entry', () => {
    const ok = IntegrationSchema.safeParse({
      id: 'openrouter',
      title: 'OpenRouter',
      category: 'gateway',
      language: 'ts',
      streamFormat: 'openai-sse',
      envVars: ['OPENROUTER_API_KEY'],
      routeTemplates: { next: 'export async function POST() {}' },
      streamMapping: 'OpenAI SSE — pipe upstream.body straight through.',
      runNote: 'Set OPENROUTER_API_KEY.',
      docsSlug: 'integrations/connect-any-model',
    });
    expect(ok.success).toBe(true);
  });

  it('defaults envVars to empty array when omitted', () => {
    const result = IntegrationSchema.safeParse({
      id: 'groq',
      title: 'Groq',
      category: 'provider',
      language: 'ts',
      streamFormat: 'ai-sdk',
      routeTemplates: {},
      streamMapping: 'AI SDK stream.',
      runNote: 'Set GROQ_API_KEY.',
      docsSlug: 'integrations/groq',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.envVars).toEqual([]);
    }
  });

  it('rejects an unknown category', () => {
    const result = IntegrationSchema.safeParse({
      id: 'x',
      title: 'X',
      category: 'unknown-category',
      language: 'ts',
      streamFormat: 'native',
      routeTemplates: {},
      streamMapping: 'mapping',
      runNote: 'note',
      docsSlug: 'slug',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown language', () => {
    const result = IntegrationSchema.safeParse({
      id: 'x',
      title: 'X',
      category: 'provider',
      language: 'ruby',
      streamFormat: 'native',
      routeTemplates: {},
      streamMapping: 'mapping',
      runNote: 'note',
      docsSlug: 'slug',
    });
    expect(result.success).toBe(false);
  });
});

describe('ArchetypeSchema', () => {
  it('validates a minimal archetype entry', () => {
    const result = ArchetypeSchema.safeParse({
      id: 'customer-support',
      title: 'Customer Support Bot',
      components: ['kai-chat', 'kai-sources'],
      defaultPlacement: 'docked-widget',
      docsSlug: 'archetypes/customer-support',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown placement', () => {
    const result = ArchetypeSchema.safeParse({
      id: 'x',
      title: 'X',
      components: ['kai-chat'],
      defaultPlacement: 'floating',
      docsSlug: 'slug',
    });
    expect(result.success).toBe(false);
  });
});
