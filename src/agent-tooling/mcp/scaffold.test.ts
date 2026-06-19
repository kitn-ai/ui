import { describe, it, expect } from 'vitest';
import { scaffold } from './tools/scaffold';

/**
 * scaffold composes a working chat surface from four axes:
 *   useCase (archetype) × integration × placement × framework.
 *
 * The handler returns the MCP tool shape ({ content: [{ type, text }] }); these
 * tests read out.content[0].text — matching the real CallToolResult contract and
 * the sibling reference.test.ts. The assertion regexes are the brief's verbatim.
 */
describe('scaffold', () => {
  it('drop-in chat + openrouter (next) → element + route + stream note', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // React branch now uses the @kitn.ai/ui/react wrapper (<Chat />) — no raw kai-chat tag.
    expect(text).toMatch(/<Chat\b|<kai-chat/);
    expect(text).toMatch(/openrouter\.ai\/api\/v1\/chat\/completions/);
    expect(text).toMatch(/Streaming recipe/);
  });

  it('pydantic-ai emits a Python (FastAPI) route', async () => {
    const out = await scaffold.handler({
      useCase: 'support-widget',
      integration: 'pydantic-ai',
      placement: 'docked-widget',
      framework: 'fastapi',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/from fastapi|uvicorn|run_stream/);
  });

  it('rejects an unknown integration with the valid list', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'nope',
      placement: 'side',
      framework: 'html',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/unknown integration|valid integrations/i);
  });

  // ── added coverage ───────────────────────────────────────────────────────

  it('rejects an unknown useCase with the valid archetype list', async () => {
    const out = await scaffold.handler({
      useCase: 'nope',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/unknown use ?case|valid use ?cases|valid archetypes/i);
    // names a real archetype id so the harness can self-correct
    expect(text).toMatch(/drop-in-chat/);
  });

  it('docked-widget placement produces a fixed, sized container', async () => {
    const out = await scaffold.handler({
      useCase: 'support-widget',
      integration: 'openrouter',
      placement: 'docked-widget',
      framework: 'html',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/<kai-chat/);
    // a docked widget is a fixed, sized box (not the full-page `height: 100dvh`)
    expect(text).toMatch(/position:\s*fixed/);
    expect(text).toMatch(/width:\s*\d/);
    expect(text).toMatch(/height:\s*\d/);
    expect(text).not.toMatch(/height:\s*100dvh/);
  });

  it('falls back to a usable route when the framework has no exact template', async () => {
    // pydantic-ai only ships a fastapi template; asking for `next` (ts) should
    // still emit its python fastapi route rather than failing.
    const out = await scaffold.handler({
      useCase: 'support-widget',
      integration: 'pydantic-ai',
      placement: 'inline',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/from fastapi|uvicorn|run_stream/);
  });

  // ── Bug-fix regression tests ─────────────────────────────────────────────

  it('react scaffold uses the @kitn.ai/ui/react wrapper and correct onSubmit prop', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must import from the official React wrapper package
    expect(text).toContain('@kitn.ai/ui/react');
    // Must wire the event via the wrapper's onSubmit prop
    expect(text).toContain('onSubmit');
    // Must NOT use the invalid JSX hyphenated event attribute
    expect(text).not.toContain('onKai-submit');
  });

  it('next scaffold uses the @kitn.ai/ui/react wrapper and correct onSubmit prop', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('@kitn.ai/ui/react');
    expect(text).toContain('onSubmit');
    expect(text).not.toContain('onKai-submit');
  });

  it('svelte scaffold uses correct on:kai-submit syntax and bind:this property pattern', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'docked-widget',
      framework: 'svelte',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must use the correct Svelte custom-event listener syntax
    expect(text).toContain('on:kai-submit');
    // Must use bind:this to get the element reference (the correct Svelte pattern)
    expect(text).toContain('bind:this');
    // Must NOT use the malformed bind: .messages attribute pattern
    expect(text).not.toContain('bind: .messages');
  });
});
