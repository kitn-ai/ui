import { describe, it, expect } from 'vitest';
import { debug } from './tools/debug';

/**
 * debug — diagnoses classic AI/UI integration failures and returns
 * the likely cause + fix.  The handler returns the MCP CallToolResult shape;
 * tests read out.content[0].text (same pattern as reference.test.ts).
 */
describe('debug', () => {
  // ── Rule 1: array/object set as HTML attribute ──────────────────────────
  it('array-as-attribute → JS property fix', async () => {
    const out = await debug.handler({
      snippet: '<kai-chat messages="[...]"></kai-chat>',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/set .*messages.* in JavaScript|property, not an attribute/i);
  });

  // ── Rule 2: in-place mutation / no re-render ────────────────────────────
  it('no re-render → new reference fix', async () => {
    const out = await debug.handler({
      symptom: "messages don't update when I push",
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/new array|new reference/i);
  });

  // ── Rule 4: wrong element prefix kitn- ─────────────────────────────────
  it('kitn- prefix in snippet → kai- prefix fix', async () => {
    const out = await debug.handler({
      snippet: '<kitn-chat></kitn-chat>',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/kai-|correct prefix/i);
    // must flag the kitn- prefix is wrong
    expect(text).toMatch(/kitn-.*only.*bundle|prefix.*kai-|element prefix.*kai-/i);
  });

  // ── Rule 3: event not firing / listener on wrong element ────────────────
  it('event not firing → listen directly on element', async () => {
    const out = await debug.handler({
      symptom: 'kai-submit event is not firing when I listen on document',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/directly on the element|non-bubbling/i);
  });

  // ── Rule 5: SSR / server component ─────────────────────────────────────
  it('SSR symptom → client-only registration fix', async () => {
    const out = await debug.handler({
      symptom: 'document is not defined when using kai-chat in a Next.js server component',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/client.only|client-side|dynamic.import|import.*elements/i);
  });

  // ── Fallback: no rule matches ───────────────────────────────────────────
  it('unrelated symptom → fallback mentioning component_reference', async () => {
    const out = await debug.handler({
      symptom: 'the background color of my button looks wrong in dark mode',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/component_reference/i);
  });

  // ── False-positive guards ────────────────────────────────────────────────
  it('"pushing a button" does NOT trigger the in-place-mutation rule', async () => {
    const out = await debug.handler({
      symptom: 'pushing a button does nothing visible',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must NOT match mutation rule (no "new array" / "new reference" fix)
    expect(text).not.toMatch(/In-place mutation|new array|new reference/i);
  });

  it('generic React hydration question does NOT trigger the SSR rule', async () => {
    const out = await debug.handler({
      symptom: 'React hydration mismatch error in my app',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must NOT match SSR rule (no web-component/kai context)
    expect(text).not.toMatch(/SSR.*server-side|client.only.*registration/i);
  });

  it('"hydration" with a kai-chat context DOES trigger the SSR rule', async () => {
    const out = await debug.handler({
      symptom: 'hydration error when using kai-chat in Next.js',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/client.only|client-side|dynamic.import/i);
  });

  // Confirm existing test still passes after push\b tightening
  it('"messages don\'t update when I push" still triggers mutation rule', async () => {
    const out = await debug.handler({
      symptom: "messages don't update when I push",
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/new array|new reference/i);
  });

  // ── Rule 6: custom elements not registered / renders nothing ───────────────
  it('React wrapper renders nothing / empty → elements-not-registered fix', async () => {
    const out = await debug.handler({
      symptom:
        'Using the React wrapper, the kai-chat element renders nothing / appears empty. ' +
        'How do I register the custom elements?',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/@kitn\.ai\/ui\/elements/);
  });

  it('"renders nothing" + "not registered" → elements-not-registered fix', async () => {
    const out = await debug.handler({
      symptom: 'kai-chat renders nothing — customElements.get returns undefined, element not registered',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/Custom elements not registered|elements-not-registered|@kitn\.ai\/ui\/elements/i);
  });

  it('generic "empty" symptom without render context does NOT fire Rule 6', async () => {
    const out = await debug.handler({
      symptom: 'the data array is empty after fetch',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).not.toMatch(/Custom elements not registered/i);
  });

  // ── Rule 7: tsc errors inside node_modules/@kitn.ai/ui/src ─────────────────
  it('tsc TS2786 Show error in @kitn.ai/ui → tsc-source-pull paths/stub fix', async () => {
    const out = await debug.handler({
      symptom:
        'node_modules/@kitn.ai/ui/src/ui/Chat.tsx error TS2786: Show cannot be used as a JSX component',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/paths|kitn-elements\.d\.ts|skipLibCheck/i);
  });

  // ── Rule 8: fetch('/api/chat') 404 in Vite SPA ────────────────────────────
  it("fetch('/api/chat') 404 in Vite app → vite-api-404 mock/express/next fix", async () => {
    const out = await debug.handler({
      symptom: "fetch('/api/chat') returns 404 in my Vite app",
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/mock|Next\.?js|express|proxy/i);
  });

  // ── Rule 9: bundle footprint / reduce bundle size ─────────────────────────
  it('bundle size symptom → explains three load modes (register-all, per-element, autoloader)', async () => {
    const out = await debug.handler({
      symptom: 'How do I reduce bundle size? How much does @kitn.ai/ui add?',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // must explain register-all (default)
    expect(text).toMatch(/@kitn\.ai\/ui\/elements/);
    // must explain per-element imports with an example
    expect(text).toMatch(/@kitn\.ai\/ui\/elements\/chat/);
    // must explain the autoloader
    expect(text).toMatch(/@kitn\.ai\/ui\/autoloader/);
  });

  it('tree-shaking symptom → bundle-footprint rule fires', async () => {
    const out = await debug.handler({
      symptom: 'How do I tree-shake @kitn.ai/ui to only import the elements I need?',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/per.?element|elements\/chat/i);
  });

  it('CDN / no-build autoloader symptom → bundle-footprint rule fires', async () => {
    const out = await debug.handler({
      symptom: 'I have a no-build CDN page. Can I avoid downloading all elements up front?',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/autoloader/i);
  });

  it('bundle-footprint rule mentions SSR constraint for per-element + autoloader', async () => {
    const out = await debug.handler({
      symptom: 'reduce bundle size footprint for @kitn.ai/ui',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // SSR safety note must appear
    expect(text).toMatch(/SSR|client.only/i);
    // register-all is flagged as the SSR-safe default
    expect(text).toMatch(/register.all|elements['"].*registers/i);
  });

  it('generic bundle question without kai context does NOT fire bundle-footprint rule', async () => {
    const out = await debug.handler({
      symptom: 'My webpack bundle is too large after adding lodash',
    });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Must NOT match the bundle-footprint fix (no kai-* context)
    expect(text).not.toMatch(/per.?element import|@kitn\.ai\/ui\/elements\/chat|autoloader/i);
  });
});
