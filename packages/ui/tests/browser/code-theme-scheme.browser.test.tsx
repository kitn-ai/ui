// Real-Chromium proof for the two things jsdom stubs: the code theme follows the REAL inherited
// `--kai-color-scheme` cascade (an `html.dark` toggle switches a default block live, an explicit
// `code-theme` does not move), and a bare `<kai-action action="copy">` ends up with an accessible
// name. Screenshots land in VITE_KAI_SHOT_DIR when set.
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';
import '../../src/web-components/markdown/markdown';
import '../../src/web-components/message/message';
import '../../src/web-components/activity/activity';

const tick = (ms = 400) => new Promise((r) => setTimeout(r, ms));
afterEach(() => { document.body.innerHTML = ''; document.documentElement.classList.remove('dark'); });

const FENCE = '```ts\nconst answer: number = 42;\nfunction greet(name: string) { return `hi ${name}`; }\n```';
const shot = async (name: string) => {
  const dir = (import.meta as unknown as { env: Record<string, string> }).env.VITE_KAI_SHOT_DIR;
  if (dir) await page.screenshot({ path: `${dir}/${name}.png` });
};

async function block(attrs = '') {
  const host = document.createElement('div');
  host.style.cssText = 'padding:16px;background:var(--kai-background, canvas)';
  host.innerHTML = `<kai-markdown ${attrs}></kai-markdown>`;
  document.body.append(host);
  const md = host.firstElementChild as HTMLElement & { content: string };
  md.content = FENCE;
  await tick(900);
  return md;
}
// The code block renders inside a nested facade/shadow, so look through the shadow tree.
const deepPre = (root: ParentNode): HTMLElement | null => {
  const direct = root.querySelector('pre[class*="shiki"], .shiki');
  if (direct) return direct as HTMLElement;
  for (const el of root.querySelectorAll('*')) {
    const sr = (el as HTMLElement).shadowRoot;
    if (sr) { const f = deepPre(sr); if (f) return f; }
  }
  return null;
};
const bg = (md: HTMLElement) => getComputedStyle(deepPre(md.shadowRoot!)!).backgroundColor;
const lum = (rgb: string) => { const n = rgb.match(/\d+/g)!.map(Number); return (n[0] + n[1] + n[2]) / 3; };

describe('code theme follows the scheme (real Chromium)', () => {
  it('light page: a light block; html.dark toggle: a dark block, live', async () => {
    const md = await block();
    expect(lum(bg(md))).toBeGreaterThan(200);
    await shot('markdown-light');
    document.documentElement.classList.add('dark');
    await tick(900);
    expect(lum(bg(md))).toBeLessThan(80);
    await shot('markdown-dark');
  });

  it('an explicit code-theme does not move on toggle', async () => {
    const md = await block('code-theme="github-light"');
    document.documentElement.classList.add('dark');
    await tick(900);
    expect(lum(bg(md))).toBeGreaterThan(200);
    await shot('markdown-explicit-light-in-dark');
  });
});

describe('a bare <kai-action action="copy">', () => {
  it('has the accessible name "Copy" in real Chromium', async () => {
    const host = document.createElement('div');
    host.innerHTML = '<kai-message><kai-markdown content="hi"></kai-markdown><kai-action action="copy"></kai-action></kai-message>';
    document.body.append(host);
    const msg = host.firstElementChild as HTMLElement & { role: string };
    msg.role = 'assistant';
    await tick(500);
    const btn = msg.shadowRoot!.querySelector('button')!;
    expect(btn.getAttribute('aria-label')).toBe('Copy');
    await expect.element(page.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});

describe('activity Arguments / Result code blocks', () => {
  it('follow the scheme too', async () => {
    const host = document.createElement('div');
    host.style.cssText = 'padding:16px;background:var(--kai-background, canvas)';
    host.innerHTML = '<kai-activity></kai-activity>';
    document.body.append(host);
    const el = host.firstElementChild as HTMLElement & { steps: unknown[]; defaultOpen: boolean };
    el.defaultOpen = true;
    el.steps = [{ id: 's', kind: 'tool', status: 'done', toolName: 'search', toolKind: 'search', input: { query: 'kai', limit: 3 }, output: { hits: ['a', 'b'] } }];
    await tick(600);
    // Two disclosures: the summary line, then the step inside it.
    for (let i = 0; i < 2; i++) {
      const closed = [...el.shadowRoot!.querySelectorAll('button[aria-expanded="false"]')] as HTMLElement[];
      closed[0]?.click();
      await tick(400);
    }
    await tick(1000);
    const b = () => getComputedStyle(deepPre(el.shadowRoot!)!).backgroundColor;
    expect(lum(b())).toBeGreaterThan(200);
    await shot('activity-light');
    document.documentElement.classList.add('dark');
    await tick(900);
    expect(lum(b())).toBeLessThan(80);
    await shot('activity-dark');
  });
});
