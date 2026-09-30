// Real-Chromium proof that the DEFAULT code theme reads the scheme from the block's own CONNECTED
// position: html/body/scoped containers, an inline --kai-color-scheme, the host's `theme`, both
// OS preferences, and live toggles. Dark blocks paint a dark <pre>; light ones a light <pre>.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cdp } from 'vitest/browser';
import '../../src/web-components/markdown/markdown';
import '../../src/web-components/message/message';

const tick = (ms = 900) => new Promise((r) => setTimeout(r, ms));
const FENCE = '```ts\nconst answer: number = 42;\n```';

// Poll, do not sleep: the first block in a run waits on a cold lazy Shiki chunk.
const expectKind = (el: HTMLElement, want: 'light' | 'dark') =>
  vi.waitFor(() => expect(kind(el)).toBe(want), { timeout: 10_000, interval: 100 });

const os = (v: 'light' | 'dark') =>
  cdp().send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: v }] });

afterEach(async () => {
  document.body.innerHTML = '';
  document.body.className = '';
  document.documentElement.className = '';
  document.documentElement.removeAttribute('style');
  await os('light');
});

const deepPre = (root: ParentNode): HTMLElement | null => {
  const direct = root.querySelector('.shiki');
  if (direct) return direct as HTMLElement;
  for (const el of root.querySelectorAll('*')) {
    const sr = (el as HTMLElement).shadowRoot;
    if (sr) { const f = deepPre(sr); if (f) return f; }
  }
  return null;
};
const lum = (rgb: string) => { const n = rgb.match(/\d+/g)!.map(Number); return (n[0] + n[1] + n[2]) / 3; };
const kind = (el: HTMLElement) => {
  const pre = deepPre(el.shadowRoot!);
  if (!pre) return 'none';
  return lum(getComputedStyle(pre).backgroundColor) > 128 ? 'light' : 'dark';
};

async function md(opts: { attrs?: string; wrap?: (inner: HTMLElement) => HTMLElement } = {}) {
  const el = document.createElement('kai-markdown') as HTMLElement & { content: string };
  if (opts.attrs) for (const a of opts.attrs.split(' ')) { const [k, v] = a.split('='); el.setAttribute(k, v.replace(/"/g, '')); }
  el.content = FENCE;
  document.body.append(opts.wrap ? opts.wrap(el) : el);
  await tick();
  return el;
}

describe('default code theme, real cascade', () => {
  it('OS light + html.dark BEFORE render -> dark', async () => {
    document.documentElement.classList.add('dark');
    await expectKind(await md(), 'dark');
  });
  it('OS dark + html.light BEFORE render -> light', async () => {
    await os('dark');
    document.documentElement.classList.add('light');
    await expectKind(await md(), 'light');
  });
  it('OS dark, nothing set -> dark', async () => {
    await os('dark');
    await expectKind(await md(), 'dark');
  });
  it('body.dark before render -> dark', async () => {
    document.body.classList.add('dark');
    await expectKind(await md(), 'dark');
  });
  it('--kai-color-scheme: dark on html before render -> dark', async () => {
    document.documentElement.style.setProperty('--kai-color-scheme', 'dark');
    await expectKind(await md(), 'dark');
  });
  it('a <div class="dark"> ancestor -> dark; adding .dark to it later switches', async () => {
    const box = document.createElement('div');
    const el = await md({ wrap: (inner) => { box.append(inner); return box; } });
    await expectKind(el, 'light' as 'light' | 'dark');
    box.classList.add('dark');
    await tick();
    await expectKind(el, 'dark' as 'light' | 'dark');
    const box2 = document.createElement('div');
    box2.className = 'dark';
    await expectKind(await md({ wrap: (inner) => { box2.append(inner); return box2; } }), 'dark');
  });
  it('theme="dark" on the element, html light -> dark', async () => {
    await expectKind(await md({ attrs: 'theme=dark' }), 'dark');
  });
  it('theme="light" on the element, html.dark -> light', async () => {
    document.documentElement.classList.add('dark');
    await expectKind(await md({ attrs: 'theme=light' }), 'light');
  });
  it('kai-message theme=light under html.dark -> light; theme=dark on a light page -> dark', async () => {
    for (const [theme, want, dark] of [['light', 'light', true], ['dark', 'dark', false]] as const) {
      document.body.innerHTML = '';
      document.documentElement.classList.toggle('dark', dark);
      const m = document.createElement('kai-message') as HTMLElement & { message: unknown };
      m.setAttribute('theme', theme);
      m.message = { id: 'm', role: 'assistant', parts: [{ type: 'text', text: FENCE }] };
      document.body.append(m);
      await tick(1200);
      await expectKind(m, want as 'light' | 'dark');
    }
  });
  it('toggle html.dark after render switches live', async () => {
    const el = await md();
    await expectKind(el, 'light' as 'light' | 'dark');
    document.documentElement.classList.add('dark');
    await tick();
    await expectKind(el, 'dark' as 'light' | 'dark');
  });
  it('an explicit code-theme wins over html.dark and does not move', async () => {
    document.documentElement.classList.add('dark');
    const el = await md({ attrs: 'code-theme=github-light' });
    await expectKind(el, 'light' as 'light' | 'dark');
    document.documentElement.classList.remove('dark');
    await tick();
    await expectKind(el, 'light' as 'light' | 'dark');
  });
});
