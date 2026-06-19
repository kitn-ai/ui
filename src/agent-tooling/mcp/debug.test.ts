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
});
