import type { Integration, Archetype } from './types';
import openrouter from './integrations/openrouter';
import vercelAiSdk from './integrations/vercel-ai-sdk';
import langgraph from './integrations/langgraph';
import cloudflare from './integrations/cloudflare';
import ollama from './integrations/ollama';
import mastra from './integrations/mastra';
import pi from './integrations/pi';
import { archetypes as _archetypes } from './archetypes';

export const integrations: Integration[] = [
  openrouter,
  vercelAiSdk,
  langgraph,
  cloudflare,
  ollama,
  mastra,
  pi,
];

export const archetypes: Archetype[] = _archetypes;

export function getIntegration(id: string): Integration | undefined {
  return integrations.find((i) => i.id === id);
}

export function getArchetype(id: string): Archetype | undefined {
  return archetypes.find((a) => a.id === id);
}

export function listIntegrations(): Integration[] {
  return integrations;
}

export function listArchetypes(): Archetype[] {
  return archetypes;
}
