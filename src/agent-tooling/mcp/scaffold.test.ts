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

  it('react scaffold page component is named App, not Chat (no import/export collision)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Page component must be App — not Chat — to avoid shadowing the imported Chat wrapper
    expect(text).toContain('export default function App(');
    expect(text).not.toMatch(/function Chat\(/);
  });

  it('next scaffold page component is named App, not Chat (no import/export collision)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('export default function App(');
    expect(text).not.toMatch(/function Chat\(/);
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

  // ── Field-test fixes (Bucket A) ──────────────────────────────────────────

  // Issue 3 — `side` must be a full-height docked panel, distinct from the bubble.
  it("placement 'side' emits a full-height docked side panel (100dvh), not the bottom-right bubble", async () => {
    const side = (
      await scaffold.handler({
        useCase: 'drop-in-chat',
        integration: 'openrouter',
        placement: 'side',
        framework: 'html',
      })
    ).content as { type: string; text: string }[];
    const sideText = side[0].text;

    // full-height, docked to the trailing edge
    expect(sideText).toMatch(/height:\s*100dvh/);
    expect(sideText).toMatch(/inset-inline-end:\s*0/);
    // NOT the floating bottom-right bubble
    expect(sideText).not.toMatch(/bottom:\s*1\.5rem/);
    // chat fills its container
    expect(sideText).toMatch(/<kai-chat/);
  });

  it("'side' and 'docked-widget' produce DISTINCT layouts", async () => {
    const read = async (placement: string) =>
      (
        (
          await scaffold.handler({
            useCase: 'support-widget',
            integration: 'openrouter',
            placement,
            framework: 'html',
          })
        ).content as { type: string; text: string }[]
      )[0].text;

    const side = await read('side');
    const docked = await read('docked-widget');

    // distinct output
    expect(side).not.toEqual(docked);
    // side = full-height, edge-docked
    expect(side).toMatch(/height:\s*100dvh/);
    expect(side).toMatch(/inset-inline-end:\s*0/);
    expect(side).not.toMatch(/bottom:\s*1\.5rem/);
    // docked-widget = bottom-right floating bubble (sized box, not 100dvh height)
    expect(docked).toMatch(/position:\s*fixed/);
    expect(docked).toMatch(/bottom:\s*1\.5rem/);
    expect(docked).toMatch(/inset-inline-end:\s*1\.5rem/);
    expect(docked).not.toMatch(/height:\s*100dvh/);
  });

  // Issue 6 — wire suggestions (with a default when omitted).
  it('passes through caller suggestions + emits suggestionMode (react)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
      suggestions: ["What's new?", 'Ask for help?'],
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("What's new?");
    expect(text).toContain('Ask for help?');
    expect(text).toContain('suggestions={suggestions}');
    expect(text).toContain('suggestionMode="submit"');
  });

  it('emits default suggestions when none are passed', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // the default pair so the feature always shows
    expect(text).toContain("What's new?");
    expect(text).toContain('How can you help?');
    expect(text).toMatch(/suggestionMode="submit"|suggestionMode='submit'/);
  });

  it('emits suggestions across every front-end framework', async () => {
    for (const framework of ['html', 'react', 'next', 'vue', 'svelte'] as const) {
      const out = await scaffold.handler({
        useCase: 'drop-in-chat',
        integration: 'openrouter',
        placement: 'full-page',
        framework,
        suggestions: ['Unique-Suggestion-Token'],
      });
      const text = (out.content as { type: string; text: string }[])[0].text;
      expect(text, `${framework}: suggestion not emitted`).toContain('Unique-Suggestion-Token');
      expect(text, `${framework}: suggestionMode not emitted`).toMatch(/suggestion-?mode/i);
    }
  });

  // Issue 1 / Issue 4 — react/next MUST register elements before the wrappers.
  it("react output imports '@kitn.ai/ui/elements' BEFORE '@kitn.ai/ui/react'", async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    const elementsIdx = text.indexOf("import '@kitn.ai/ui/elements'");
    const reactIdx = text.indexOf("from '@kitn.ai/ui/react'");
    expect(elementsIdx).toBeGreaterThanOrEqual(0);
    expect(reactIdx).toBeGreaterThanOrEqual(0);
    expect(elementsIdx).toBeLessThan(reactIdx);
  });

  it("next output imports '@kitn.ai/ui/elements' BEFORE '@kitn.ai/ui/react'", async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    const elementsIdx = text.indexOf("import '@kitn.ai/ui/elements'");
    const reactIdx = text.indexOf("from '@kitn.ai/ui/react'");
    expect(elementsIdx).toBeGreaterThanOrEqual(0);
    expect(elementsIdx).toBeLessThan(reactIdx);
  });

  // Issue 4 — mock integration streams client-side with zero config.
  it("integration 'mock' streams client-side (no /api fetch) and renders a Chat", async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'mock',
      placement: 'side',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // renders a kai-chat surface (React wrapper)
    expect(text).toMatch(/<Chat\b|<kai-chat/);
    // no backend call
    expect(text).not.toContain("fetch('/api");
    // a canned reply is streamed client-side
    expect(text).toMatch(/local preview|no backend or API key needed/i);
    // backend block says no backend/key needed
    expect(text).toMatch(/No backend or API key needed/i);
  });

  it("integration 'mock' (html) streams a canned reply without fetch", async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'mock',
      placement: 'full-page',
      framework: 'html',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/<kai-chat/);
    expect(text).not.toContain("fetch('/api");
    // token-by-token loop present
    expect(text).toMatch(/setTimeout/);
  });

  // Issue 4 — honest backend note when react has no matching server route.
  it('react + a no-react-template integration warns that a Vite SPA has no /api route', async () => {
    // pydantic-ai only ships a fastapi template; asking for react (Vite) must warn.
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'pydantic-ai',
      placement: 'inline',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // mentions the Vite SPA / no /api limitation and the escape hatches
    expect(text).toMatch(/Vite SPA|no \/api/i);
    expect(text).toMatch(/mock|express|next/i);
  });
});
