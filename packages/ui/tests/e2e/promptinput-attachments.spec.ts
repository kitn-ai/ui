import { test, expect, type Page } from '@playwright/test';

/**
 * Attachment regions inside the prompt input's card, on the REAL `<kai-prompt-input>` in
 * Chromium: content slotted into `above` / `below` grows into the card over a hairline,
 * follows height changes while attached, snaps under reduced motion, does not animate on
 * first paint, and the card's focus ring covers the whole card when focus is inside the
 * attached content. jsdom has no layout, so none of this can be measured there.
 */
const story = (id: string) => `/iframe.html?id=${id}&viewMode=story`;
const DEFAULT = 'test-fixtures-prompt-input--default';

/** The card's height, and every attachment region's height, from inside the shadow root. */
const measure = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector('kai-prompt-input') as HTMLElement;
    const root = host.shadowRoot!;
    const card = root.querySelector('[data-prompt-input]') as HTMLElement;
    const h = (side: string) =>
      (root.querySelector(`[data-attachment-region="${side}"]`) as HTMLElement).getBoundingClientRect().height;
    return {
      card: card.getBoundingClientRect().height,
      above: h('above'),
      below: h('below'),
      parts: [...root.querySelectorAll('[part]')].map((e) => e.getAttribute('part')).filter((p) => /attachment|divider/.test(p ?? '')),
    };
  });

/** Append a slotted child of a given height to the element. */
const attach = (page: Page, slot: 'above' | 'below', height: number) =>
  page.evaluate(
    ([s, hgt]) => {
      const host = document.querySelector('kai-prompt-input') as HTMLElement;
      const el = document.createElement('div');
      el.slot = s as string;
      el.id = `slotted-${s}`;
      el.style.height = `${hgt}px`;
      el.innerHTML = `<button type="button" id="btn-${s}" style="height:100%">${s} control</button>`;
      host.appendChild(el);
    },
    [slot, height] as const,
  );

/** Card heights on each animation frame for `ms`, from the page's own clock. */
const sample = (page: Page, ms: number) =>
  page.evaluate(
    (dur) =>
      new Promise<number[]>((resolve) => {
        const card = (document.querySelector('kai-prompt-input') as HTMLElement).shadowRoot!.querySelector('[data-prompt-input]') as HTMLElement;
        const out: number[] = [];
        const t0 = performance.now();
        const tick = () => {
          out.push(Math.round(card.getBoundingClientRect().height * 10) / 10);
          if (performance.now() - t0 < dur) requestAnimationFrame(tick);
          else resolve(out);
        };
        tick();
      }),
    ms,
  );

test.beforeEach(async ({ page }) => {
  await page.goto(story(DEFAULT));
  await expect(page.locator('kai-prompt-input')).toBeVisible();
  await page.waitForFunction(() => !!document.querySelector('kai-prompt-input')?.shadowRoot?.querySelector('[data-prompt-input]'));
  await page.waitForTimeout(400);
});

test('nothing attached: no region takes height, no divider or attachment part exists', async ({ page }) => {
  const m = await measure(page);
  expect(m.above).toBe(0);
  expect(m.below).toBe(0);
  expect(m.parts).toEqual([]);
});

test('attaching grows the card from its plain height to plain + the content, over a hairline', async ({ page }) => {
  const plain = (await measure(page)).card;
  await attach(page, 'above', 60);
  const frames = await sample(page, 500);
  const settled = await measure(page);
  // Grew in, monotonically, never overshooting the final height.
  expect(frames[0], 'starts near the plain height, not the final one').toBeLessThan(settled.card - 10);
  expect(new Set(frames).size, 'passed through intermediate heights').toBeGreaterThan(3);
  for (let i = 1; i < frames.length; i++) expect(frames[i]).toBeGreaterThanOrEqual(frames[i - 1] - 0.5);
  expect(Math.max(...frames)).toBeLessThanOrEqual(settled.card + 0.5);
  // The card grew by the content (60px) plus the space around the hairline, and by nothing else.
  const grew = settled.card - plain;
  expect(grew).toBeGreaterThan(60);
  expect(grew).toBeLessThan(60 + 40);
  expect(settled.parts.sort()).toEqual(['attachment-above', 'divider-above']);
});

test('detaching collapses the card back to the plain height and removes the parts', async ({ page }) => {
  const plain = (await measure(page)).card;
  await attach(page, 'above', 60);
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('slotted-above')!.remove());
  const frames = await sample(page, 500);
  expect(new Set(frames).size, 'passed through intermediate heights').toBeGreaterThan(3);
  await page.waitForTimeout(200);
  const after = await measure(page);
  expect(Math.abs(after.card - plain)).toBeLessThan(0.5);
  expect(after.parts).toEqual([]);
});

test('content that grows while attached animates to the new height instead of clipping', async ({ page }) => {
  await attach(page, 'above', 40);
  await page.waitForTimeout(500);
  const before = (await measure(page)).card;
  await page.evaluate(() => { (document.getElementById('slotted-above') as HTMLElement).style.height = '140px'; });
  const frames = await sample(page, 500);
  const after = (await measure(page)).card;
  expect(after - before, 'grew by the 100px the content did').toBeGreaterThan(90);
  expect(new Set(frames).size, 'animated, not snapped').toBeGreaterThan(3);
  // Nothing clipped: the region is as tall as its content.
  const clipped = await page.evaluate(() => {
    const r = (document.querySelector('kai-prompt-input') as HTMLElement).shadowRoot!.querySelector('[data-attachment-region="above"]') as HTMLElement;
    return r.scrollHeight - r.clientHeight;
  });
  expect(clipped).toBeLessThanOrEqual(1);
});

test('below mirrors above: it grows in under the input row', async ({ page }) => {
  const plain = (await measure(page)).card;
  await attach(page, 'below', 44);
  await page.waitForTimeout(500);
  const m = await measure(page);
  expect(m.card - plain).toBeGreaterThan(44);
  expect(m.parts.sort()).toEqual(['attachment-below', 'divider-below']);
  const order = await page.evaluate(() => {
    const root = (document.querySelector('kai-prompt-input') as HTMLElement).shadowRoot!;
    const y = (sel: string) => (root.querySelector(sel) as HTMLElement).getBoundingClientRect().top;
    return { input: y('[data-composer-body]'), divider: y('[part~="divider-below"]'), content: y('[part~="attachment-below"]') };
  });
  expect(order.input).toBeLessThan(order.divider);
  expect(order.divider).toBeLessThan(order.content);
});

test.describe('reduced motion', () => {
  test('attaching snaps to the final height on the next frames', async ({ page }) => {
    // Emulated before the element mounts: the preference is read once, at mount.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(story(DEFAULT));
    await page.waitForFunction(() => !!document.querySelector('kai-prompt-input')?.shadowRoot?.querySelector('[data-prompt-input]'));
    await page.waitForTimeout(400);
    await attach(page, 'above', 60);
    const frames = await sample(page, 300);
    // At most one intermediate height (the frame the DOM changed in): it does not slide.
    const distinct = [...new Set(frames)];
    expect(distinct.length).toBeLessThanOrEqual(2);
    expect(frames.at(-1)).toBeGreaterThan(frames[0] - 0.5);
    const duration = await page.evaluate(() => getComputedStyle((document.querySelector('kai-prompt-input') as HTMLElement).shadowRoot!.querySelector('[data-attachment-region="above"]') as HTMLElement).transitionDuration);
    expect(duration).toBe('0s');
  });
});

test('content attached before the first frame does not slide in on load', async ({ page }) => {
  const result = await page.evaluate(
    () =>
      new Promise<{ heights: number[]; final: number }>((resolve) => {
        const host = document.createElement('kai-prompt-input') as HTMLElement;
        const slotted = document.createElement('div');
        slotted.slot = 'above';
        slotted.style.height = '60px';
        slotted.textContent = 'Plan';
        host.appendChild(slotted);
        document.body.appendChild(host);
        const heights: number[] = [];
        let n = 0;
        const tick = () => {
          const card = host.shadowRoot?.querySelector('[data-prompt-input]') as HTMLElement | null;
          if (card) heights.push(Math.round(card.getBoundingClientRect().height * 10) / 10);
          if (++n < 30) requestAnimationFrame(tick);
          else resolve({ heights, final: heights.at(-1) ?? 0 });
        };
        requestAnimationFrame(tick);
      }),
  );
  // Once the card exists its height is already its final height on every frame we saw.
  const seen = result.heights.filter((h) => h > 0);
  expect(seen.length).toBeGreaterThan(5);
  const settled = seen.slice(3);
  expect(Math.max(...settled) - Math.min(...settled)).toBeLessThan(1);
  expect(seen.slice(0, 3).every((h) => Math.abs(h - result.final) < 25 || h < result.final)).toBe(true);
});

test('focus inside the attached content rings the whole card', async ({ page }) => {
  await attach(page, 'above', 48);
  await attach(page, 'below', 40);
  await page.waitForTimeout(500);
  const ringOf = () =>
    page.evaluate(() => {
      const root = (document.querySelector('kai-prompt-input') as HTMLElement).shadowRoot!;
      const card = root.querySelector('[data-prompt-input]') as HTMLElement;
      const cs = getComputedStyle(card);
      const r = card.getBoundingClientRect();
      const inside = (sel: string) => {
        const e = document.querySelector(sel) as HTMLElement;
        const b = e.getBoundingClientRect();
        return b.top >= r.top && b.bottom <= r.bottom && b.left >= r.left && b.right <= r.right;
      };
      return {
        shadow: cs.boxShadow,
        card: { top: r.top, bottom: r.bottom, left: r.left, right: r.right },
        aboveInside: inside('#btn-above'),
        belowInside: inside('#btn-below'),
        within: card.matches(':focus-within'),
      };
    });
  const idle = await ringOf();
  expect(idle.within).toBe(false);
  await page.focus('#btn-above');
  const onAbove = await ringOf();
  expect(onAbove.within).toBe(true);
  expect(onAbove.aboveInside, 'the focused control is inside the card box the ring is drawn around').toBe(true);
  // The ring is drawn on the card, not on a region: the card's own shadow gained a 2px ring.
  expect(onAbove.shadow).not.toBe(idle.shadow);
  expect(onAbove.shadow).toMatch(/0px 0px 0px 2px/);
  await page.focus('#btn-below');
  const onBelow = await ringOf();
  expect(onBelow.within).toBe(true);
  expect(onBelow.belowInside).toBe(true);
  expect(onBelow.shadow).toBe(onAbove.shadow);
  // Same card box while focus moves: the ring geometry does not depend on where focus is.
  expect(onBelow.card).toEqual(onAbove.card);
});

test('keyboard order reads top to bottom: above, the input, then below', async ({ page }) => {
  await attach(page, 'above', 40);
  await attach(page, 'below', 40);
  await page.waitForTimeout(500);
  await page.focus('#btn-above');
  const seen: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    seen.push(
      await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (a?.id) return a.id;
        const inner = a?.shadowRoot?.activeElement as HTMLElement | null;
        return inner ? (inner.getAttribute('contenteditable') !== null ? 'editor' : inner.getAttribute('aria-label') ?? inner.tagName) : (a?.tagName ?? '');
      }),
    );
  }
  const iEditor = seen.indexOf('editor');
  const iBelow = seen.indexOf('btn-below');
  expect(iEditor, `tab order ${seen.join(' > ')}`).toBeGreaterThanOrEqual(0);
  expect(iBelow, `tab order ${seen.join(' > ')}`).toBeGreaterThan(iEditor);
});

test('a plain input and one with content attached and removed are the same height', async ({ page }) => {
  const plain = (await measure(page)).card;
  await attach(page, 'above', 60);
  await attach(page, 'below', 40);
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.getElementById('slotted-above')!.remove(); document.getElementById('slotted-below')!.remove(); });
  await page.waitForTimeout(600);
  const m = await measure(page);
  expect(Math.abs(m.card - plain)).toBeLessThan(0.5);
  expect(m.above).toBe(0);
  expect(m.below).toBe(0);
});
