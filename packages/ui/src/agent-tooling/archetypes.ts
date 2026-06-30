import type { Archetype } from './types';

export const archetypes: Archetype[] = [
  {
    id: 'drop-in-chat',
    title: 'Drop-in chat',
    components: ['kai-chat'],
    defaultPlacement: 'full-page',
    docsSlug: 'examples/drop-in-chat',
  },
  {
    id: 'support-widget',
    title: 'Support widget',
    components: ['kai-chat'],
    defaultPlacement: 'docked-widget',
    docsSlug: 'examples/support-widget',
  },
  {
    id: 'knowledge-base',
    title: 'Knowledge base / RAG',
    components: ['kai-chat', 'kai-sources'],
    defaultPlacement: 'full-page',
    docsSlug: 'examples/knowledge-base',
  },
  {
    id: 'agentic',
    title: 'Agentic assistant',
    components: ['kai-chat', 'kai-tool', 'kai-reasoning'],
    defaultPlacement: 'side',
    docsSlug: 'examples/agentic-assistant',
  },
  {
    id: 'workspace',
    title: 'Agentic workspace',
    components: ['kai-chat', 'kai-artifact', 'kai-resizable'],
    defaultPlacement: 'side',
    docsSlug: 'examples/workspace',
  },
  {
    id: 'voice',
    title: 'Voice assistant',
    components: ['kai-chat', 'kai-voice-input'],
    defaultPlacement: 'full-page',
    docsSlug: 'examples/voice-assistant',
  },
];
