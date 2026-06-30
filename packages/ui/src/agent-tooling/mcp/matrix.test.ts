import { describe, it, expect } from 'vitest';
import { integrations } from '../registry';
import { scaffold } from './tools/scaffold';

/**
 * Matrix coverage for the `scaffold` tool. Where the sibling scaffold.test.ts
 * asserts a handful of hand-picked combos in depth, this walks the full
 * integration registry and a framework × placement spread to prove the
 * scaffolder never throws and always emits a wired chat surface.
 *
 * Reads out.content[0].text with the CallToolResult cast used across the
 * sibling tests. The "a kai-chat is wired" assertion is /<Chat\b|<kai-chat/:
 * the html/vue/svelte branches emit the raw <kai-chat> tag, while the
 * react/next branches render it through the @kitn.ai/ui/react <Chat> wrapper —
 * both are the same web component, so either satisfies the contract.
 */

const text = (out: Awaited<ReturnType<typeof scaffold.handler>>) =>
  (out.content as { type: string; text: string }[])[0].text;

// A wired kai-chat: the raw tag, or the React wrapper that mounts it.
const KAI_CHAT = /<Chat\b|<kai-chat/;

// Each integration's signature — the endpoint, import, or name that proves the
// generated route is the right one (not a generic stub). mock has no backend, so
// its signature is the local-preview marker emitted instead of a route.
const SIGNATURE: Record<string, RegExp> = {
  openrouter: /openrouter\.ai\/api\/v1\/chat\/completions/,
  'vercel-ai-sdk': /ai-sdk|streamText|@ai-sdk|toDataStream/i,
  langgraph: /langgraph|langchain/i,
  cloudflare: /cloudflare|CF_ACCOUNT_ID/i,
  ollama: /11434|ollama/i,
  mastra: /mastra/i,
  pi: /\bpi\b/i,
  'pydantic-ai': /pydantic|fastapi/i,
  mock: /No backend or API key needed|stream locally/i,
};

describe('scaffold — integration matrix', () => {
  it('scaffolds a drop-in chat for every integration without throwing', async () => {
    for (const i of integrations) {
      // mock is a front-end-only preview; the rest get their language's server framework.
      const framework = i.id === 'mock' ? 'react' : i.language === 'python' ? 'fastapi' : 'next';
      const out = await scaffold.handler({
        useCase: 'drop-in-chat',
        integration: i.id,
        placement: 'side',
        framework,
      });
      const t = text(out);

      // a kai-chat surface is wired (raw tag or React wrapper)
      expect(t, `${i.id}: no kai-chat wiring`).toMatch(KAI_CHAT);
      // the generated app imports from the real package
      expect(t, `${i.id}: missing @kitn.ai/ui import`).toContain('@kitn.ai/ui');
      // the integration's own signature is present (right route, not a stub)
      expect(t, `${i.id}: missing signature`).toMatch(SIGNATURE[i.id]);
      // non-trivial output
      expect(t.length, `${i.id}: output too short`).toBeGreaterThan(100);
    }
  });

  it('mock scaffolds a kai element with no backend fetch (zero-config preview)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'mock',
      placement: 'side',
      framework: 'react',
    });
    const t = text(out);
    expect(t).toMatch(KAI_CHAT);
    // no backend call — the reply streams client-side
    expect(t).not.toContain("fetch('/api");
    expect(t).toMatch(/No backend or API key needed|stream locally/i);
  });
});

describe('scaffold — framework × placement spread (openrouter)', () => {
  const frameworks = ['next', 'react', 'html'] as const;
  const placements = ['full-page', 'side', 'docked-widget'] as const;

  for (const framework of frameworks) {
    for (const placement of placements) {
      it(`${framework} × ${placement} emits a wired kai-chat + the openrouter endpoint`, async () => {
        const out = await scaffold.handler({
          useCase: 'drop-in-chat',
          integration: 'openrouter',
          placement,
          framework,
        });
        const t = text(out);
        expect(t).toMatch(KAI_CHAT);
        expect(t).toMatch(SIGNATURE.openrouter);
        expect(t.length).toBeGreaterThan(100);
      });
    }
  }

  it('html framework emits the raw <kai-chat> tag (no React wrapper)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'html',
    });
    const t = text(out);
    expect(t).toMatch(/<kai-chat/);
  });
});
