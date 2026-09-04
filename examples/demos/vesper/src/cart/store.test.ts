import { describe, it, expect } from 'vitest';
import { createRoot, flush } from 'solid-js';
import { createCart, lineKey, FREE_SHIPPING } from './store';
import { catalog, pieceBySlug } from '../data/catalog';

// Derived from the catalog, not hardcoded copy: names and colorways are
// written to match their photographs and change when a photograph does. A
// test that hardcodes them fails on a copy edit and says nothing useful.
const coat = pieceBySlug('the-coat')!;          // the one piece with 4 colorways
const knit = pieceBySlug('the-slip')!;
const scarf = catalog.reduce((a, b) => (a.price <= b.price ? a : b)); // cheapest
const [CW1, CW2] = [coat.colorways[0]!.name, coat.colorways[1]!.name];
const KNIT_CW = knit.colorways[0]!.name;
const SCARF_CW = scarf.colorways[0]!.name;

/**
 * Every case runs inside a root so the memos have an owner to dispose.
 *
 * `act` exists because Solid 2 DEFERS store writes: reading `items` on the
 * line after a mutation still sees the old value, and only `flush()` settles
 * it. Rendering flushes on its own, so this is a test-only concern -- but a
 * test that forgets it fails in a way that looks like a broken store.
 */
const withCart = (fn: (c: ReturnType<typeof createCart>) => void) =>
  createRoot((dispose) => {
    fn(createCart());
    dispose();
  });

const act = (fn: () => void) => {
  fn();
  flush();
};

describe('cart', () => {
  it('starts empty', () =>
    withCart((c) => {
      expect(c.items.length).toBe(0);
      expect(c.count()).toBe(0);
      expect(c.subtotal()).toBe(0);
    }));

  it('adds a line', () =>
    withCart((c) => {
      act(() => c.add(coat, CW1, 'M'));
      expect(c.items.length).toBe(1);
      expect(c.count()).toBe(1);
      expect(c.subtotal()).toBe(coat.price);
      expect(c.items[0]!.key).toBe(lineKey(coat.id, CW1, 'M'));
    }));

  it('increments rather than duplicating an identical configuration', () =>
    withCart((c) => {
      act(() => c.add(coat, CW1, 'M'));
      act(() => c.add(coat, CW1, 'M', 2));
      expect(c.items.length).toBe(1);
      expect(c.count()).toBe(3);
      expect(c.subtotal()).toBe(coat.price * 3);
    }));

  it('keeps different colorways and sizes apart', () =>
    withCart((c) => {
      act(() => c.add(coat, CW1, 'M'));
      act(() => c.add(coat, CW2, 'M'));
      act(() => c.add(coat, CW1, 'L'));
      expect(c.items.length).toBe(3);
      expect(c.count()).toBe(3);
    }));

  it('changes quantity and removes at zero', () =>
    withCart((c) => {
      act(() => c.add(knit, KNIT_CW, 'S'));
      const key = c.items[0]!.key;
      act(() => c.setQty(key, 4));
      expect(c.count()).toBe(4);
      act(() => c.setQty(key, 0));
      expect(c.items.length).toBe(0);
      expect(c.subtotal()).toBe(0);
    }));

  it('removes one line without touching the others', () =>
    withCart((c) => {
      act(() => c.add(coat, CW1, 'M'));
      act(() => c.add(knit, KNIT_CW, 'S'));
      act(() => c.remove(c.items[0]!.key));
      expect(c.items.length).toBe(1);
      expect(c.items[0]!.pieceId).toBe(knit.id);
    }));

  it('reports the free-shipping remainder, and zero once past it', () =>
    withCart((c) => {
      act(() => c.add(scarf, SCARF_CW, scarf.sizes[0]!));
      expect(c.shippingRemainder()).toBe(FREE_SHIPPING - scarf.price);
      act(() => c.add(coat, CW1, 'M'));
      expect(c.subtotal()).toBeGreaterThan(FREE_SHIPPING);
      expect(c.shippingRemainder()).toBe(0);
    }));

  it('clears', () =>
    withCart((c) => {
      act(() => c.add(coat, CW1, 'M'));
      act(() => c.clear());
      expect(c.items.length).toBe(0);
    }));

  it('round-trips through a snapshot', () =>
    createRoot((dispose) => {
      const a = createCart();
      act(() => a.add(coat, CW2, 'L', 2));
      act(() => a.add(knit, KNIT_CW, 'S'));
      const snapshot = a.serialize();

      const b = createCart();
      act(() => b.hydrateFromStorage(snapshot));
      expect(b.count()).toBe(3);
      expect(b.subtotal()).toBe(a.subtotal());
      expect(b.items[0]!.colorway).toBe(CW2);
      expect(b.items[0]!.key).toBe(lineKey(coat.id, CW2, 'L'));
      dispose();
    }));

  it('survives a snapshot that is missing, stale or references a dropped piece', () =>
    withCart((c) => {
      act(() => c.hydrateFromStorage(null));
      expect(c.items.length).toBe(0);
      // A snapshot written by a future version must not be guessed at.
      act(() => c.hydrateFromStorage({ v: 2, lines: [] } as never));
      expect(c.items.length).toBe(0);
      c.hydrateFromStorage({
        v: 1,
        lines: [
          { pieceId: 'gone', colorway: CW1, size: 'M', qty: 1 },
          { pieceId: coat.id, colorway: CW1, size: 'M', qty: 1 },
        ],
      });
      expect(c.items.length).toBe(1);
      expect(c.items[0]!.pieceId).toBe(coat.id);
    }));

  it('prices every piece in the catalog', () =>
    withCart((c) => {
      act(() => {
        for (const p of catalog) c.add(p, p.colorways[0]!.name, p.sizes[0]!);
      });
      expect(c.subtotal()).toBe(catalog.reduce((n, p) => n + p.price, 0));
    }));
});
