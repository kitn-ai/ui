import { describe, expect, it, afterEach } from 'vitest';
import '../../src/web-components/thread/thread';
import '../../src/web-components/message/message';
import '../../src/web-components/markdown/markdown';

/**
 * Stick-to-bottom over an app-rendered thread, in real Chromium.
 *
 * jsdom has no layout, so it cannot say whether the last row of a composed
 * `<kai-thread>` stays in view as it grows. The rows are the app's own light-DOM
 * `<kai-message>` children; the text they stream lives in `<kai-markdown>` shadow roots.
 * None of that is a mutation of the scroller's shadow subtree, so the pin has to come from
 * SIZE. Every claim below is asserted on the viewport's real scroll geometry.
 */
afterEach(() => document.body.replaceChildren());

const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
const frames = async (n = 3) => { for (let i = 0; i < n; i++) await frame(); };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const LINES = (n: number, tag = 'line') => Array.from({ length: n }, (_, i) => `${tag} ${i}`).join('\n\n');

async function mountThread(count = 6) {
  const box = document.createElement('div');
  box.style.cssText = 'height:300px;width:520px;display:block';
  box.innerHTML = `<kai-thread>${Array.from({ length: count }, (_, i) =>
    `<kai-message role="${i % 2 ? 'assistant' : 'user'}"><kai-markdown content="message ${i}\n\nsecond line ${i}\n\nthird line ${i}"></kai-markdown></kai-message>`).join('')}</kai-thread>`; // test-authored markup, not model output
  document.body.append(box);
  const thread = box.firstElementChild as HTMLElement & { scrollToBottom(b?: ScrollBehavior): void };
  await customElements.whenDefined('kai-thread');
  await wait(150);
  const vp = thread.shadowRoot!.querySelector('[role="log"]') as HTMLElement;
  const gap = () => vp.scrollHeight - vp.scrollTop - vp.clientHeight;
  const buttonVisible = () => {
    const b = thread.shadowRoot!.querySelector('button[aria-label="Scroll to bottom"]') as HTMLElement | null;
    return !!b && b.getAttribute('aria-hidden') !== 'true' && getComputedStyle(b).opacity === '1';
  };
  const add = (text: string, role = 'assistant') => {
    const m = document.createElement('kai-message');
    (m as unknown as { role: string }).role = role;
    m.innerHTML = `<kai-markdown content=""></kai-markdown>`;
    (m.firstElementChild as unknown as { content: string }).content = text;
    thread.append(m);
    return m;
  };
  const md = (m: Element) => m.querySelector('kai-markdown') as unknown as { content: string };
  return { box, thread, vp, gap, buttonVisible, add, md, rows: () => [...thread.children] as HTMLElement[] };
}

describe('composed kai-thread: stick-to-bottom in real Chromium', () => {
  it('the viewport really overflows (the premise of every test below)', async () => {
    const t = await mountThread(12);
    expect(t.vp.scrollHeight).toBeGreaterThan(t.vp.clientHeight + 100);
    expect(getComputedStyle(t.vp).overflowY).toBe('auto');
  });

  it('stays pinned while the last message streams 40 lines over 20 frames', async () => {
    const t = await mountThread(12);
    t.thread.scrollToBottom('instant');
    await frames();
    expect(t.gap()).toBeLessThan(2);
    const last = t.add('start');
    await frames();
    let text = 'start';
    for (let f = 0; f < 20; f++) {
      text += '\n\n' + LINES(2, `f${f}`);
      t.md(last).content = text;
      await frame();
      // Asserted every frame the update lands, not once at the end: a pin that trails by a
      // frame is the shimmy this is here to rule out.
      await frame();
      expect(t.gap(), `frame ${f}`).toBeLessThanOrEqual(2);
    }
    expect(t.vp.scrollHeight).toBeGreaterThan(t.vp.clientHeight * 2);
  });

  it('pins when whole messages are appended', async () => {
    const t = await mountThread(12);
    t.thread.scrollToBottom('instant');
    await frames();
    for (let i = 0; i < 5; i++) {
      t.add(LINES(3, `new ${i}`));
      await frames();
      expect(t.gap(), `append ${i}`).toBeLessThanOrEqual(2);
    }
  });

  it('does NOT yank a user who scrolled up, and offers the scroll button', async () => {
    const t = await mountThread(12);
    t.thread.scrollToBottom('instant');
    await frames();
    t.vp.scrollTop = 40;
    await wait(300); // the button fades in over 150ms
    expect(t.buttonVisible()).toBe(true);
    const last = t.add('start');
    let text = 'start';
    for (let f = 0; f < 10; f++) {
      text += '\n\n' + LINES(2, `g${f}`);
      t.md(last).content = text;
      await frames();
    }
    t.add(LINES(4, 'appended'));
    await wait(300);
    expect(t.vp.scrollTop).toBe(40);
    expect(t.buttonVisible()).toBe(true);
    // The button takes them back, and the pin resumes after it.
    (t.thread.shadowRoot!.querySelector('button[aria-label="Scroll to bottom"]') as HTMLButtonElement).click();
    await wait(900);
    expect(t.gap()).toBeLessThanOrEqual(2);
    expect(t.buttonVisible()).toBe(false);
    t.md(last).content = text + '\n\n' + LINES(3, 'after');
    await frames();
    expect(t.gap()).toBeLessThanOrEqual(2);
  });

  it('stays pinned when children are removed and reordered', async () => {
    const t = await mountThread(12);
    t.thread.scrollToBottom('instant');
    await frames();
    t.add(LINES(6, 'tail'));
    await frames();
    expect(t.gap()).toBeLessThanOrEqual(2);
    // Remove the tall last message: the browser clamps scrollTop, the pin must follow.
    t.rows().at(-1)!.remove();
    await frames();
    expect(t.gap()).toBeLessThanOrEqual(2);
    // Reorder: move the first message to the end.
    const first = t.rows()[0];
    t.thread.append(first);
    await frames();
    expect(t.rows().at(-1)).toBe(first);
    expect(t.gap()).toBeLessThanOrEqual(2);
    // And a row from the middle removed.
    t.rows()[3].remove();
    await frames();
    expect(t.gap()).toBeLessThanOrEqual(2);
    // Growth after all that still pins.
    t.md(t.rows().at(-1)!).content = LINES(8, 'grown');
    await frames();
    expect(t.gap()).toBeLessThanOrEqual(2);
  });

  it('streams at ~30 updates/sec without layout thrash: at most one scroll write per frame, no long frames', async () => {
    const t = await mountThread(12);
    t.thread.scrollToBottom('instant');
    await frames();
    const last = t.add('s');
    await frames();
    let scrollWrites = 0;
    const orig = t.vp.scrollTo.bind(t.vp);
    t.vp.scrollTo = ((...a: unknown[]) => { scrollWrites++; return (orig as (...x: unknown[]) => void)(...a); }) as never;

    const stamps: number[] = [];
    let running = true;
    const tick = (ts: number) => { stamps.push(ts); if (running) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);

    let text = 's';
    const UPDATES = 90; // 3 seconds at 30/sec
    for (let i = 0; i < UPDATES; i++) {
      text += ` word${i}` + (i % 6 === 5 ? '\n\n' : '');
      t.md(last).content = text;
      await wait(33);
      expect(t.gap(), `update ${i}`).toBeLessThanOrEqual(2);
    }
    running = false;
    await frame();
    const frameCount = stamps.length - 1;
    const deltas = stamps.slice(1).map((s, i) => s - stamps[i]).sort((a, b) => a - b);
    const worst = deltas.at(-1)!;
    const p95 = deltas[Math.floor(deltas.length * 0.95)];
    // Scroll writes are bounded by frames, not by the sum of the two observers' triggers.
    expect(scrollWrites).toBeLessThanOrEqual(frameCount);
    // Headless timing is noisy; these are the "it did not thrash" bounds, not a benchmark.
    expect(p95).toBeLessThan(50);
    expect(worst).toBeLessThan(250);
    console.info(`[stick-to-bottom] ${UPDATES} updates, ${frameCount} frames, ${scrollWrites} scroll writes, p95 frame ${p95.toFixed(1)}ms, worst ${worst.toFixed(1)}ms`);
  });
});
