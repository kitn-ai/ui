import { afterEach, describe, expect, it } from 'vitest';
import fixture from './token-values.fixture.json';
import { mount, resolveTokens, settle } from './token-probe';

// Interaction of two branches: removing the `theme` attribute resets the prop to its
// default ('auto'), and the element must then follow the inherited root scheme again.
const F = fixture as unknown as { light: Record<string, string>; dark: Record<string, string> };
const html = document.documentElement;
const live: Element[] = [];
const bg = (el: Element) => resolveTokens(el).resolved['--color-background'];

afterEach(() => {
  live.splice(0).forEach((e) => e.remove());
  html.style.removeProperty('--kai-color-scheme');
});

for (const tag of ['kai-button', 'kai-thread', 'kai-prompt-input']) {
  describe(`${tag}: removing theme returns to auto and follows the root`, () => {
    it('theme="dark" on a light root, then removeAttribute', async () => {
      const el = await mount(tag, { theme: 'dark' });
      live.push(el);
      expect(bg(el)).toBe(F.dark['--color-background']);
      el.removeAttribute('theme');
      await settle();
      expect((el as unknown as { theme?: string }).theme).toBe('auto');
      expect(bg(el)).toBe(F.light['--color-background']);
      html.style.setProperty('--kai-color-scheme', 'dark');
      await settle();
      expect(bg(el)).toBe(F.dark['--color-background']);
      html.style.setProperty('--kai-color-scheme', 'light');
      await settle();
      expect(bg(el)).toBe(F.light['--color-background']);
    });
    it('theme="light" on a dark root, then removeAttribute', async () => {
      html.style.setProperty('--kai-color-scheme', 'dark');
      const el = await mount(tag, { theme: 'light' });
      live.push(el);
      expect(bg(el)).toBe(F.light['--color-background']);
      el.removeAttribute('theme');
      await settle();
      expect(bg(el)).toBe(F.dark['--color-background']);
    });
  });
}
