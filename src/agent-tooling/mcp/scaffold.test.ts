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

  it('next scaffold uses the @kitn.ai/ui/react wrapper (via dynamic) and correct onSubmit prop', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // @kitn.ai/ui/react appears inside the dynamic() call, not as a top-level import
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

      if (framework === 'react' || framework === 'next') {
        // React wrappers receive camelCase props
        expect(text, `${framework}: suggestionMode prop not emitted`).toContain('suggestionMode');
      } else {
        // html / svelte / vue — must use the kebab attribute the custom element observes
        expect(text, `${framework}: kebab suggestion-mode not emitted`).toContain('suggestion-mode');
        // Guard: camelCase static attribute would be inert on a CE (DOM ignores case)
        expect(text, `${framework}: dead camelCase suggestionMode= attribute present`).not.toMatch(
          /suggestionMode=/,
        );
      }
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

  // SCAF-6: next uses next/dynamic { ssr: false } — no top-level @kitn.ai/ui/elements or
  // @kitn.ai/ui/react import (they'd run on the server and crash with "window is not defined").
  it('next scaffold uses next/dynamic with ssr:false and has NO top-level elements/react import (SCAF-6)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must use next/dynamic
    expect(text).toContain("import dynamic from 'next/dynamic'");
    // Must set ssr: false
    expect(text).toContain('ssr: false');
    // @kitn.ai/ui/react must appear only inside dynamic() — not as a standalone top-level import
    expect(text).not.toMatch(/^import\s+\{[^}]*\}\s+from\s+'@kitn\.ai\/ui\/react'/m);
    // No top-level @kitn.ai/ui/elements (the dynamic import of /react self-registers on client)
    expect(text).not.toMatch(/^import\s+'@kitn\.ai\/ui\/elements'/m);
  });

  // SCAF-6 (contrast): plain react (Vite) STILL uses top-level imports — unchanged.
  it('react (Vite) scaffold still has top-level import { Chat } from @kitn.ai/ui/react (unchanged by SCAF-6)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must have a top-level named import from @kitn.ai/ui/react
    expect(text).toMatch(/^import\s+\{[^}]*\}\s+from\s+'@kitn\.ai\/ui\/react'/m);
    // Must NOT use next/dynamic (no SSR concern in Vite)
    expect(text).not.toContain("import dynamic from 'next/dynamic'");
  });

  // SCAF-7: react and next mock onSubmit must emit role: 'user' as const / role: 'assistant' as const
  // so the literal doesn't widen to `string` under strict TS.
  it('react mock scaffold emits role as const for strict-TS message literals (SCAF-7)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'mock',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("role: 'user' as const");
    expect(text).toContain("role: 'assistant' as const");
  });

  it('next mock scaffold emits role as const for strict-TS message literals (SCAF-7)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'mock',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain("role: 'user' as const");
    expect(text).toContain("role: 'assistant' as const");
  });

  // SCAF-7: html mock output must NOT emit `as const` (TS syntax invalid in plain JS)
  it('html mock scaffold does NOT emit as const on role literals (plain JS, SCAF-7)', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'mock',
      placement: 'full-page',
      framework: 'html',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).not.toContain('as const');
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

  // ── Round-1 field-test fix regressions ──────────────────────────────────

  // SCAF-1: All frameworks must emit theme.tokens.css, never bare theme.css (LIB-1 / ENOENT)
  it('emits theme.tokens.css (not bare theme.css) across all front-end frameworks', async () => {
    for (const framework of ['html', 'react', 'next', 'vue', 'svelte'] as const) {
      const out = await scaffold.handler({
        useCase: 'drop-in-chat',
        integration: 'openrouter',
        placement: 'full-page',
        framework,
      });
      const text = (out.content as { type: string; text: string }[])[0].text;
      // Must reference the compiled tokens file
      expect(text, `${framework}: missing theme.tokens.css`).toContain('@kitn.ai/ui/theme.tokens.css');
      // Must NOT import bare theme.css (it @imports tw-animate-css which is a devDep → ENOENT)
      expect(text, `${framework}: emitted bare theme.css`).not.toMatch(
        /import ['"]@kitn\.ai\/ui\/theme\.css['"]/,
      );
    }
  });

  // SCAF-2: Next.js App Router requires 'use client'; plain react (Vite) must NOT have it.
  it("next scaffold starts with 'use client'", async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'next',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // 'use client' must be the FIRST line of the emitted front-end code (immediately after the section header)
    const frontendStart = text.indexOf('=== (1) FRONT-END');
    const afterHeader = text.slice(frontendStart).replace(/^=== \(1\) FRONT-END[^\n]*\n\n/, '');
    expect(afterHeader.trimStart().startsWith("'use client'")).toBe(true);
  });

  it("react (Vite) scaffold does NOT include 'use client'", async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'react',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).not.toContain("'use client'");
  });

  // SCAF-3: Vue scaffold must mention isCustomElement so Vue consumers aren't stuck.
  it('vue scaffold mentions isCustomElement for kai-* custom elements', async () => {
    const out = await scaffold.handler({
      useCase: 'drop-in-chat',
      integration: 'openrouter',
      placement: 'full-page',
      framework: 'vue',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('isCustomElement');
    expect(text).toContain("tag.startsWith('kai-')");
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
