import { describe, it, expect } from 'vitest';
import { integrations, archetypes, getIntegration, getArchetype, listIntegrations, listArchetypes } from './registry';
import { IntegrationSchema, ArchetypeSchema } from './types';

// --- Integrations ---

it('has the launch integrations', () => {
  const ids = integrations.map((i) => i.id);
  for (const id of ['openrouter', 'vercel-ai-sdk', 'langgraph', 'cloudflare', 'ollama', 'mastra', 'pi', 'pydantic-ai', 'mock'])
    expect(ids).toContain(id);
});

it('has exactly 9 integrations (8 real + mock)', () => {
  expect(integrations).toHaveLength(9);
});

it('includes the zero-config mock integration', () => {
  const m = getIntegration('mock');
  expect(m).toBeDefined();
  expect(m?.category).toBe('mock');
  expect(m?.envVars).toEqual([]);
  // mock ships no backend route — the front-end streams locally
  expect(Object.keys(m!.routeTemplates).length).toBe(0);
});

it('every integration validates against IntegrationSchema', () => {
  for (const i of integrations) {
    expect(IntegrationSchema.safeParse(i).success).toBe(true);
  }
});

it('every real (non-mock) integration ships at least one route template', () => {
  for (const i of integrations.filter((i) => i.id !== 'mock')) {
    expect(Object.keys(i.routeTemplates).length, `${i.id}: no route template`).toBeGreaterThan(0);
  }
});

it('getIntegration looks up by id', () => {
  expect(getIntegration('ollama')?.language).toBe('ts');
});

it('getIntegration returns undefined for unknown id', () => {
  expect(getIntegration('not-a-real-id')).toBeUndefined();
});

it('listIntegrations returns all integrations', () => {
  expect(listIntegrations()).toEqual(integrations);
});

// --- Archetypes ---

it('archetypes array is non-empty', () => {
  expect(archetypes.length).toBeGreaterThan(0);
});

it('every archetype validates against ArchetypeSchema', () => {
  for (const a of archetypes) {
    const result = ArchetypeSchema.safeParse(a);
    expect(result.success).toBe(true);
  }
});

it('getArchetype looks up by id', () => {
  expect(getArchetype('drop-in-chat')?.title).toBe('Drop-in chat');
});

it('getArchetype returns undefined for unknown id', () => {
  expect(getArchetype('not-a-real-archetype')).toBeUndefined();
});

it('listArchetypes returns all archetypes', () => {
  expect(listArchetypes()).toEqual(archetypes);
});
