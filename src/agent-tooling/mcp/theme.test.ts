import { describe, it, expect } from 'vitest';
import { theme } from './tools/theme';

/**
 * Tests for the `theme` MCP tool.
 * The handler returns { content: [{ type: 'text', text }] }; we read
 * out.content[0].text — matching the MCP CallToolResult contract and
 * the sibling scaffold.test.ts / reference.test.ts pattern.
 */
describe('theme', () => {
  it('emits kai- token overrides for a brand color', async () => {
    const out = await theme.handler({ brand: '#7c3aed' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/--kai-/);
    expect(text).toMatch(/:root|data-theme/);
  });

  it('emits a :root block containing --kai-color-primary with the brand color', async () => {
    const out = await theme.handler({ brand: '#7c3aed' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Real token names from theme.css — must appear verbatim
    expect(text).toContain('--kai-color-primary');
    expect(text).toContain('--kai-color-primary-foreground');
    expect(text).toContain('--kai-color-ring');
    // :root block present
    expect(text).toContain(':root');
    // The brand color value appears
    expect(text).toMatch(/#7c3aed|7c3aed/i);
  });

  it('mode:both also emits a .dark block', async () => {
    const out = await theme.handler({ brand: '#7c3aed', mode: 'both' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain(':root');
    expect(text).toContain('.dark');
    // Dark block has --kai-color-primary too
    expect(text).toMatch(/\.dark\s*\{[^}]*--kai-color-primary/s);
  });

  it('mode:dark emits a .dark block (no :root override)', async () => {
    const out = await theme.handler({ brand: '#06b6d4', mode: 'dark' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('.dark');
    expect(text).toContain('--kai-color-primary');
  });

  it('description-only call still yields a valid --kai- token block', async () => {
    const out = await theme.handler({ description: 'a professional blue SaaS product' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/--kai-/);
    expect(text).toContain('--kai-color-primary');
    expect(text).toContain(':root');
  });

  it('no input defaults gracefully and still produces a token block', async () => {
    const out = await theme.handler({});
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toMatch(/--kai-/);
    expect(text).toContain('--kai-color-primary');
  });

  it('includes an apply note and link to the theme editor', async () => {
    const out = await theme.handler({ brand: '#e11d48' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    // Apply instructions present
    expect(text).toMatch(/paste|stylesheet|apply|global/i);
    // Theme editor link present
    expect(text).toMatch(/theme.*editor|editor.*theme|\/theme\/editor/i);
  });

  it('foreground is white (#ffffff) for a dark brand and black (#000000) for a light brand', async () => {
    // #7c3aed is dark (low luminance) → white foreground
    const darkOut = await theme.handler({ brand: '#7c3aed' });
    const darkText = (darkOut.content as { type: string; text: string }[])[0].text;
    expect(darkText).toMatch(/--kai-color-primary-foreground:\s*#(?:fff(?:fff)?|ffffff)/i);

    // #fde68a is very light (high luminance) → black foreground
    const lightOut = await theme.handler({ brand: '#fde68a' });
    const lightText = (lightOut.content as { type: string; text: string }[])[0].text;
    expect(lightText).toMatch(/--kai-color-primary-foreground:\s*#(?:000(?:000)?|000000)/i);
  });

  it('accent tokens are also emitted (--kai-color-accent / --kai-color-accent-foreground)', async () => {
    const out = await theme.handler({ brand: '#10b981' });
    const text = (out.content as { type: string; text: string }[])[0].text;
    expect(text).toContain('--kai-color-accent');
    expect(text).toContain('--kai-color-accent-foreground');
  });
});
